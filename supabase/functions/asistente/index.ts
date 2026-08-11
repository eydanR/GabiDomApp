/* ============================================================================
   Función de borde: asistente de datos de GabiDom (Claude)

   La app llama a esta función desde el navegador con la sesión de quien
   entró (Authorization: Bearer <token>). Aquí, y solo aquí, vive la llave
   de Claude — nunca en index.html ni en gabidom-movil.html.

   El asistente NO recibe un volcado de datos: tiene herramientas para
   consultar ventas, inventario, clientes/escuelas y folios por revisar, y
   las usa con la MISMA sesión de quien pregunta. Eso significa que ve
   exactamente lo que esa persona ya puede ver dentro de la app (las reglas
   de acceso de supabase/esquema.sql se siguen aplicando) — no hay una vía
   paralela que le dé más.

   Desplegar:
     supabase functions deploy asistente
     supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   (SUPABASE_URL y SUPABASE_ANON_KEY ya existen solas dentro de la función.)
   ========================================================================= */

import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODELO = "claude-opus-5";
const MAX_VUELTAS = 6;
const LIMITE_MENSAJE = 2000;
const LIMITE_HISTORIAL = 16;

const SISTEMA = `Eres el asistente de datos de GabiDom.inc, una tienda de uniformes escolares.
Respondes en español, de forma breve y directa, a quien esté trabajando ese día — sea la
dueña o una empleada. Antes de dar cualquier cifra (ventas, existencias, pendientes de
cobro), consulta las herramientas: nunca inventes números ni supongas datos que no
consultaste. Si una herramienta no devuelve lo que hace falta, dilo con claridad en vez de
adivinar. Los montos son en pesos mexicanos. Si la pregunta no tiene que ver con la
operación de GabiDom (ventas, inventario, clientes, escuelas), dilo y ofrece ayudar con eso.`;

const HERRAMIENTAS = [
  {
    name: "consultar_ventas",
    description:
      "Busca ventas registradas (folio, fecha, cliente, escuela, monto, forma de pago, estatus). " +
      "Úsala para cualquier pregunta sobre ventas, cobros pendientes o ingresos.",
    input_schema: {
      type: "object",
      properties: {
        estatus: { type: "string", enum: ["Pendiente", "Pagado y entregado"], description: "Filtra por estatus de la venta." },
        desde: { type: "string", description: "Fecha mínima, formato AAAA-MM-DD." },
        hasta: { type: "string", description: "Fecha máxima, formato AAAA-MM-DD." },
        cliente: { type: "string", description: "Coincidencia parcial del nombre del cliente." },
        escuela: { type: "string", description: "Coincidencia parcial de la escuela." },
        forma_pago: { type: "string", description: "Efectivo, QR, Transferencia, Tarjeta bienestar o Mixto." },
        limite: { type: "integer", description: "Máximo de filas a devolver (por defecto 30, máximo 100)." },
      },
    },
  },
  {
    name: "consultar_inventario",
    description:
      "Busca existencias de prendas, insumos (cierres) o artículos con código de barras (etiquetas). " +
      "Úsala para preguntas de stock, tallas disponibles o qué está por agotarse.",
    input_schema: {
      type: "object",
      properties: {
        tabla: { type: "string", enum: ["prendas", "insumos", "etiquetas"], description: "Qué catálogo consultar." },
        busca: { type: "string", description: "Coincidencia parcial: variante en prendas, color en insumos, descripción en etiquetas." },
        solo_bajos: { type: "boolean", description: "Si es true, solo devuelve lo que ya llegó o está por debajo de su mínimo (no aplica a etiquetas)." },
        limite: { type: "integer", description: "Máximo de filas a devolver (por defecto 30, máximo 100)." },
      },
      required: ["tabla"],
    },
  },
  {
    name: "consultar_clientes_escuelas",
    description: "Busca en el catálogo de clientes particulares o en el catálogo de escuelas (con su nivel y turno).",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["clientes", "escuelas"], description: "Qué catálogo consultar." },
        busca: { type: "string", description: "Coincidencia parcial del nombre." },
        limite: { type: "integer", description: "Máximo de filas a devolver (por defecto 30, máximo 100)." },
      },
      required: ["tipo"],
    },
  },
  {
    name: "consultar_folios_por_revisar",
    description: "Lista los folios que quedaron con datos incompletos y siguen pendientes de revisión.",
    input_schema: {
      type: "object",
      properties: {
        limite: { type: "integer", description: "Máximo de filas a devolver (por defecto 30, máximo 100)." },
      },
    },
  },
];

function json(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function limiteDe(entrada: Record<string, unknown>): number {
  const n = parseInt(String(entrada?.limite ?? "30"), 10);
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.min(n, 100);
}

// deno-lint-ignore no-explicit-any
async function ejecutarHerramienta(db: any, nombre: string, entrada: Record<string, unknown>) {
  const limite = limiteDe(entrada);
  switch (nombre) {
    case "consultar_ventas": {
      let q = db
        .from("ventas")
        .select("folio,fecha,cliente,escuela,monto_total,restante,forma_pago,estatus,registro_de")
        .order("fecha", { ascending: false })
        .limit(limite);
      if (entrada.estatus) q = q.eq("estatus", entrada.estatus);
      if (entrada.desde) q = q.gte("fecha", entrada.desde);
      if (entrada.hasta) q = q.lte("fecha", entrada.hasta);
      if (entrada.cliente) q = q.ilike("cliente", `%${entrada.cliente}%`);
      if (entrada.escuela) q = q.ilike("escuela", `%${entrada.escuela}%`);
      if (entrada.forma_pago) q = q.eq("forma_pago", entrada.forma_pago);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
    case "consultar_inventario": {
      const tabla = String(entrada.tabla || "");
      if (!["prendas", "insumos", "etiquetas"].includes(tabla)) throw new Error("tabla inválida");
      const columnas =
        tabla === "prendas" ? "categoria,variante,talla,cantidad,stock_minimo"
        : tabla === "insumos" ? "insumo,color,talla,medida,cantidad,stock_minimo"
        : "descripcion,talla,sku,precio,tipo,cantidad";
      const soloBajos = Boolean(entrada.solo_bajos) && tabla !== "etiquetas";
      let q = db.from(tabla).select(columnas).limit(soloBajos ? 500 : limite);
      if (entrada.busca) {
        const campo = tabla === "prendas" ? "variante" : tabla === "insumos" ? "color" : "descripcion";
        q = q.ilike(campo, `%${entrada.busca}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      // deno-lint-ignore no-explicit-any
      let filas: any[] = data || [];
      if (soloBajos) filas = filas.filter((f) => Number(f.cantidad) <= Number(f.stock_minimo));
      return filas.slice(0, limite);
    }
    case "consultar_clientes_escuelas": {
      if (entrada.tipo === "escuelas") {
        let q = db.from("escuelas").select("clave,nombre,nivel,turno").limit(limite);
        if (entrada.busca) q = q.ilike("nombre", `%${entrada.busca}%`);
        const { data, error } = await q;
        if (error) throw error;
        return data;
      }
      let q = db.from("clientes").select("nombre,tipo,tel,email,dir,notas").limit(limite);
      if (entrada.busca) q = q.ilike("nombre", `%${entrada.busca}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
    case "consultar_folios_por_revisar": {
      const { data, error } = await db.from("folios_revisar").select("folio,mes,fecha,notas").limit(limite);
      if (error) throw error;
      return data;
    }
    default:
      throw new Error("Herramienta desconocida: " + nombre);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  // deno-lint-ignore no-explicit-any
  let cuerpo: any;
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }

  const mensaje = String(cuerpo?.mensaje || "").trim().slice(0, LIMITE_MENSAJE);
  if (!mensaje) return json({ error: "Falta el mensaje" }, 400);

  const historialCrudo = Array.isArray(cuerpo?.historial) ? cuerpo.historial : [];

  const auth = req.headers.get("Authorization") || "";
  if (!auth) return json({ error: "Sin sesión" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Falta configurar Supabase en la función" }, 500);
  if (!anthropicKey) return json({ error: "Falta configurar ANTHROPIC_API_KEY en la función" }, 500);

  // Cliente con la sesión de quien pregunta: las mismas reglas de acceso
  // de esquema.sql deciden qué puede ver, exactamente como en el resto de la app.
  const db = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });

  const { data: quien, error: errQuien } = await db.auth.getUser();
  if (errQuien || !quien?.user) return json({ error: "Sesión inválida o vencida" }, 401);

  const mensajes: Anthropic.MessageParam[] = [];
  for (const turno of historialCrudo.slice(-LIMITE_HISTORIAL)) {
    const rol = turno?.rol;
    const texto = String(turno?.texto || "").slice(0, LIMITE_MENSAJE);
    if ((rol !== "user" && rol !== "assistant") || !texto) continue;
    mensajes.push({ role: rol, content: texto });
  }
  mensajes.push({ role: "user", content: mensaje });

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  try {
    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const respuesta = await anthropic.messages.create({
        model: MODELO,
        max_tokens: 4096,
        system: SISTEMA + "\n\nHoy es " + new Date().toISOString().slice(0, 10) + ".",
        tools: HERRAMIENTAS,
        output_config: { effort: "medium" },
        messages: mensajes,
      });

      if (respuesta.stop_reason === "refusal") {
        return json({ respuesta: "No puedo responder eso. ¿Puedes reformular la pregunta?" });
      }

      const usosHerramienta = respuesta.content.filter((b) => b.type === "tool_use");

      if (respuesta.stop_reason !== "tool_use" || usosHerramienta.length === 0) {
        const texto = respuesta.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text)
          .join("\n")
          .trim();
        return json({ respuesta: texto || "No tengo una respuesta para eso." });
      }

      mensajes.push({ role: "assistant", content: respuesta.content });

      const resultados = [];
      for (const uso of usosHerramienta) {
        let contenido: string;
        try {
          const datos = await ejecutarHerramienta(db, uso.name, (uso.input || {}) as Record<string, unknown>);
          contenido = JSON.stringify(datos);
        } catch (e) {
          contenido = JSON.stringify({ error: String((e as Error)?.message || e) });
        }
        resultados.push({ type: "tool_result" as const, tool_use_id: uso.id, content: contenido });
      }
      mensajes.push({ role: "user", content: resultados });
    }

    return json({ error: "El asistente tardó demasiado en encontrar la respuesta. Intenta preguntar algo más puntual." }, 504);
  } catch (e) {
    console.error(e);
    return json({ error: "El asistente no pudo responder. Intenta de nuevo en un momento." }, 502);
  }
});
