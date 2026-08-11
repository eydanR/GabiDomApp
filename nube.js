/* ============================================================================
   Capa de nube: acceso de usuarios y sincronización con Supabase.

   Usa la API REST directamente con fetch, sin librerías ni CDN, para que la
   app siga funcionando como un solo archivo y sin depender de internet para
   cargar código.

   Todo lo de aquí puede fallar sin romper la app: si no hay conexión o no
   está configurada, la app trabaja contra el dispositivo y deja los cambios
   pendientes en la cola para subirlos después.
   ========================================================================= */
'use strict';

const Nube = (() => {
  const SESION_KEY = 'gabidom_sesion';
  const COLA_KEY = 'gabidom_cola';
  const CONFIG_KEY = 'gabidom_conexion';

  /* La conexión puede venir de config.js (viene dentro del archivo) o haberse
     escrito desde la propia app y quedar guardada en el dispositivo. Gana la
     guardada, porque es la que alguien puso a propósito en ese teléfono. */
  let conexionGuardada = null;
  try { conexionGuardada = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); } catch (e) { conexionGuardada = null; }

  const cfg = () => Object.assign({}, window.GABIDOM_CONFIG || {}, conexionGuardada || {});

  function guardarConexion(datos) {
    const limpia = {
      SUPABASE_URL: String(datos.SUPABASE_URL || '').trim().replace(/\/+$/, ''),
      SUPABASE_ANON_KEY: String(datos.SUPABASE_ANON_KEY || '').trim(),
      DOMINIO_ACCESO: String(datos.DOMINIO_ACCESO || 'gabidom.mx').trim().replace(/^@/, '')
    };
    conexionGuardada = limpia;
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(limpia)); } catch (e) { /* sin almacenamiento */ }
    return limpia;
  }
  function olvidarConexion() {
    conexionGuardada = null;
    try { localStorage.removeItem(CONFIG_KEY); } catch (e) { /* sin almacenamiento */ }
  }
  /** Comprueba que los datos sirvan antes de guardarlos. */
  async function probarConexion(datos) {
    const url = String(datos.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const key = String(datos.SUPABASE_ANON_KEY || '').trim();
    if (!/^https?:\/\/.+/.test(url)) throw new Error('La dirección debe empezar con https:// y ser el "Project URL" de Supabase');
    if (!key) throw new Error('Falta la llave pública (anon public)');
    const r = await fetch(url + '/rest/v1/perfiles_login?select=usuario,nombre', {
      headers: { apikey: key, 'Content-Type': 'application/json' }
    });
    if (r.status === 401 || r.status === 403) throw new Error('La llave no es válida para ese proyecto');
    if (r.status === 404) throw new Error('El proyecto responde, pero le faltan las tablas: corre supabase/esquema.sql');
    if (!r.ok) throw new Error('El proyecto respondió con un error ' + r.status);
    const personas = await r.json();
    if (!Array.isArray(personas) || !personas.length) {
      throw new Error('Conecta bien, pero no hay personas dadas de alta todavía (paso 3 y 4 de la guía)');
    }
    return personas;
  }

  /** Las tablas de la nube y cómo se llaman sus columnas en la app. */
  const TABLAS = {
    ventas: {
      campos: {
        id: 'id', folio: 'folio', mes: 'mes', fecha: 'fecha', cliente: 'cliente',
        montoTotal: 'monto_total', noTarjeta: 'no_tarjeta', montoTarjeta: 'monto_tarjeta',
        efectivo: 'efectivo', restante: 'restante', formaPago: 'forma_pago',
        estatus: 'estatus', obs: 'obs', registroDe: 'registro_de', foto: 'foto',
        articulos: 'articulos', descontada: 'descontada'
      },
      json: ['articulos'],
      numericos: ['montoTotal', 'montoTarjeta', 'efectivo', 'restante'],
      fechas: ['fecha']
    },
    prendas: {
      campos: {
        id: 'id', categoria: 'categoria', variante: 'variante', talla: 'talla',
        cantidad: 'cantidad', stockMinimo: 'stock_minimo'
      },
      numericos: ['cantidad', 'stockMinimo'], fechas: []
    },
    insumos: {
      campos: {
        id: 'id', insumo: 'insumo', color: 'color', talla: 'talla', medida: 'medida',
        cantidad: 'cantidad', stockMinimo: 'stock_minimo'
      },
      numericos: ['cantidad', 'stockMinimo'], fechas: []
    },
    revisar: {
      remota: 'folios_revisar',
      campos: { id: 'id', folio: 'folio', mes: 'mes', fecha: 'fecha', notas: 'notas' },
      numericos: [], fechas: []
    },
    clientes: {
      campos: { id: 'id', nombre: 'nombre', tipo: 'tipo', tel: 'tel', email: 'email', dir: 'dir', notas: 'notas' },
      numericos: [], fechas: []
    },
    empleados: {
      campos: { id: 'id', nombre: 'nombre', puesto: 'puesto', tel: 'tel', turno: 'turno', salario: 'salario', fecha: 'fecha', notas: 'notas' },
      numericos: ['salario'], fechas: ['fecha']
    },
    etiquetas: {
      campos: { id: 'id', codigo: 'codigo', descripcion: 'descripcion', talla: 'talla',
                sku: 'sku', precio: 'precio', tipo: 'tipo', cantidad: 'cantidad' },
      numericos: ['precio', 'cantidad'], fechas: []
    }
  };

  const nombreRemoto = t => TABLAS[t].remota || t;

  /* ------------------------------------------------------- configuración -- */
  function configurada() {
    const c = cfg();
    return Boolean(c.SUPABASE_URL && c.SUPABASE_ANON_KEY);
  }
  function base() { return String(cfg().SUPABASE_URL || '').replace(/\/+$/, ''); }
  function correoDe(usuario) {
    return String(usuario).trim().toLowerCase() + '@' + (cfg().DOMINIO_ACCESO || 'gabidom.mx');
  }

  /* ------------------------------------------------------------- sesión --- */
  let sesion = null;
  try { sesion = JSON.parse(localStorage.getItem(SESION_KEY) || 'null'); } catch (e) { sesion = null; }

  function sesionActual() { return sesion; }
  function guardarSesion(s) {
    sesion = s;
    try {
      if (s) localStorage.setItem(SESION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESION_KEY);
    } catch (e) { /* sin almacenamiento: la sesión dura lo que la pestaña */ }
  }

  async function pedir(ruta, opciones = {}, conToken = true) {
    if (!configurada()) throw new Error('La base compartida no está configurada');
    const cabeceras = Object.assign({
      apikey: cfg().SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }, opciones.headers || {});
    if (conToken && sesion && sesion.token) cabeceras.Authorization = 'Bearer ' + sesion.token;

    const r = await fetch(base() + ruta, Object.assign({}, opciones, { headers: cabeceras }));
    if (r.status === 401 && conToken && sesion && sesion.refresh) {
      if (await refrescar()) return pedir(ruta, opciones, conToken);
    }
    const texto = await r.text();
    if (!r.ok) {
      let detalle = '';
      try { detalle = JSON.parse(texto).message || ''; } catch (e) { /* respuesta sin cuerpo */ }
      const err = new Error(detalle || ('Error ' + r.status));
      err.status = r.status;
      throw err;
    }
    /* Una escritura con Prefer: return=minimal contesta 201 sin cuerpo. Intentar
       leerla como JSON fallaba y dejaba el cambio marcado como pendiente para
       siempre, aunque el dato ya estuviera guardado. */
    if (!texto) return null;
    try { return JSON.parse(texto); } catch (e) { return null; }
  }

  /** Nombres para la pantalla de acceso. La vista solo expone usuario y nombre. */
  async function listaAcceso() {
    return pedir('/rest/v1/perfiles_login?select=usuario,nombre&order=nombre', {}, false);
  }

  async function entrar(usuario, pin) {
    const datos = await pedir('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: correoDe(usuario), password: pin })
    }, false);

    guardarSesion({ token: datos.access_token, refresh: datos.refresh_token, usuario });

    /* El perfil se pide POR USUARIO, nunca "el primero que salga": la dueña ve
       todos los perfiles (así lo permite su regla de acceso), así que un
       limit=1 sin filtro le devolvía el de cualquier otra persona y entraba
       con el nombre y los permisos equivocados. */
    const perfiles = await pedir('/rest/v1/perfiles?select=usuario,nombre,rol'
      + '&usuario=eq.' + encodeURIComponent(usuario) + '&limit=1');
    const perfil = (perfiles || []).find(p =>
      String(p.usuario || '').trim().toLowerCase() === String(usuario).trim().toLowerCase());

    if (!perfil) {
      // Existe la cuenta pero nadie le puso nombre ni rol: mejor decirlo que
      // dejar entrar con una identidad inventada.
      guardarSesion(null);
      throw new Error('Tu cuenta entró bien, pero no tiene perfil en la base. '
        + 'Falta correr el PASO 2 de supabase/esquema.sql para "' + usuario + '".');
    }
    guardarSesion({
      token: datos.access_token, refresh: datos.refresh_token,
      usuario: perfil.usuario, nombre: perfil.nombre, rol: perfil.rol
    });
    return sesion;
  }

  /** Vuelve a leer del servidor el nombre y el rol de quien tiene la sesión.
      Así un rol cambiado en la base —o alterado en el dispositivo— no manda. */
  async function refrescarPerfil() {
    if (!sesion || !sesion.usuario) return null;
    const perfiles = await pedir('/rest/v1/perfiles?select=usuario,nombre,rol'
      + '&usuario=eq.' + encodeURIComponent(sesion.usuario) + '&limit=1');
    const perfil = (perfiles || []).find(p =>
      String(p.usuario || '').trim().toLowerCase() === String(sesion.usuario).trim().toLowerCase());
    if (!perfil) return null;
    guardarSesion(Object.assign({}, sesion, {
      nombre: perfil.nombre, rol: perfil.rol, usuario: perfil.usuario
    }));
    return perfil;
  }

  async function refrescar() {
    if (!sesion || !sesion.refresh) return false;
    try {
      const datos = await pedir('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: JSON.stringify({ refresh_token: sesion.refresh })
      }, false);
      guardarSesion(Object.assign({}, sesion, { token: datos.access_token, refresh: datos.refresh_token }));
      return true;
    } catch (e) {
      guardarSesion(null);
      return false;
    }
  }
  function salir() { guardarSesion(null); }

  /* ------------------------------------------------- traducción de filas -- */
  function aRemoto(tabla, fila) {
    const def = TABLAS[tabla];
    const json = def.json || [];
    const out = {};
    Object.entries(def.campos).forEach(([local, remoto]) => {
      let v = fila[local];
      if (json.includes(local)) { out[remoto] = Array.isArray(v) ? v : []; return; }
      if (def.numericos.includes(local)) v = (v === '' || v === null || v === undefined) ? null : Number(v);
      if (def.fechas.includes(local)) v = v ? v : null;
      if (v === undefined) v = null;
      out[remoto] = v;
    });
    return out;
  }
  function aLocal(tabla, fila) {
    const def = TABLAS[tabla];
    const json = def.json || [];
    const out = {};
    Object.entries(def.campos).forEach(([local, remoto]) => {
      let v = fila[remoto];
      if (json.includes(local)) { out[local] = Array.isArray(v) ? v : []; return; }
      if (def.numericos.includes(local)) v = (v === null || v === undefined) ? '' : Number(v);
      if (v === null || v === undefined) v = '';
      out[local] = v;
    });
    return out;
  }

  /* ------------------------------------------------------------ lectura --- */
  /** Trae una tabla completa, paginando: Supabase entrega 1000 filas por llamada. */
  async function traerTabla(tabla) {
    const cols = Object.values(TABLAS[tabla].campos).join(',');
    const filas = [];
    const paso = 1000;
    for (let desde = 0; ; desde += paso) {
      const lote = await pedir('/rest/v1/' + nombreRemoto(tabla) + '?select=' + cols, {
        headers: { Range: desde + '-' + (desde + paso - 1) }
      });
      if (!lote || !lote.length) break;
      lote.forEach(f => filas.push(aLocal(tabla, f)));
      if (lote.length < paso) break;
    }
    return filas;
  }

  async function traerTodo() {
    const datos = {};
    for (const tabla of Object.keys(TABLAS)) datos[tabla] = await traerTabla(tabla);
    datos.asistencia = await traerAsistencia();
    return datos;
  }

  async function traerAsistencia() {
    const filas = await pedir('/rest/v1/asistencia?select=semana,clave,hora');
    const out = {};
    (filas || []).forEach(f => {
      if (!out[f.semana]) out[f.semana] = {};
      out[f.semana][f.clave] = f.hora || '';
    });
    return out;
  }

  /* ------------------------------------------------------------ escritura -- */
  async function subirFila(tabla, fila) {
    return pedir('/rest/v1/' + nombreRemoto(tabla), {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(aRemoto(tabla, fila))
    });
  }
  async function subirLote(tabla, filas) {
    const paso = 400;
    for (let i = 0; i < filas.length; i += paso) {
      await pedir('/rest/v1/' + nombreRemoto(tabla), {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(filas.slice(i, i + paso).map(f => aRemoto(tabla, f)))
      });
    }
  }
  async function borrarFila(tabla, id) {
    return pedir('/rest/v1/' + nombreRemoto(tabla) + '?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE', headers: { Prefer: 'return=minimal' }
    });
  }
  async function guardarAsistencia(semana, clave, hora) {
    return pedir('/rest/v1/asistencia', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ semana, clave, hora })
    });
  }
  async function anotarMovimiento(mov) {
    return pedir('/rest/v1/movimientos', {
      method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(mov)
    });
  }
  async function contarFilas(tabla) {
    if (!configurada()) return 0;
    const r = await fetch(base() + '/rest/v1/' + nombreRemoto(tabla) + '?select=id', {
      headers: {
        apikey: cfg().SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + (sesion ? sesion.token : ''),
        Prefer: 'count=exact', Range: '0-0'
      }
    });
    const rango = r.headers.get('content-range') || '';
    return Number((rango.split('/')[1] || '0')) || 0;
  }

  /* -------------------------------------------------------------- fotos --- */
  const BUCKET = 'ventas';

  /** Sube la foto de una venta. Devuelve la ruta con la que se vuelve a pedir. */
  async function subirFoto(idVenta, blob, extension) {
    if (!configurada() || !sesion) throw new Error('Sin base compartida');
    const ruta = idVenta + '/' + Date.now() + '.' + (extension || 'jpg');
    const r = await fetch(base() + '/storage/v1/object/' + BUCKET + '/' + ruta, {
      method: 'POST',
      headers: {
        apikey: cfg().SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + sesion.token,
        'Content-Type': blob.type || 'image/jpeg',
        'x-upsert': 'true'
      },
      body: blob
    });
    if (!r.ok) {
      let detalle = '';
      try { detalle = (await r.json()).message || ''; } catch (e) { /* sin cuerpo */ }
      if (r.status === 404) throw new Error('Falta crear el espacio de fotos: corre el PASO 3 de supabase/esquema.sql');
      throw new Error(detalle || ('No se pudo subir la foto (error ' + r.status + ')'));
    }
    return ruta;
  }

  /** El bucket es privado, así que para verla se pide un enlace temporal. */
  async function urlFoto(ruta, segundos) {
    if (!ruta || !configurada() || !sesion) return null;
    const datos = await pedir('/storage/v1/object/sign/' + BUCKET + '/' + ruta, {
      method: 'POST', body: JSON.stringify({ expiresIn: segundos || 3600 })
    });
    if (!datos || !datos.signedURL) return null;
    return base() + '/storage/v1' + datos.signedURL.replace(/^\/storage\/v1/, '');
  }

  async function borrarFoto(ruta) {
    if (!ruta || !configurada() || !sesion) return;
    await fetch(base() + '/storage/v1/object/' + BUCKET + '/' + ruta, {
      method: 'DELETE',
      headers: { apikey: cfg().SUPABASE_ANON_KEY, Authorization: 'Bearer ' + sesion.token }
    });
  }

  /* ---------------------------------------------------- cola de pendientes -- */
  /* Si el teléfono pierde señal a media captura, el cambio no se pierde:
     queda anotado aquí y se reintenta al recuperar conexión.              */
  function cola() {
    try { return JSON.parse(localStorage.getItem(COLA_KEY) || '[]'); } catch (e) { return []; }
  }
  function guardarCola(c) {
    try { localStorage.setItem(COLA_KEY, JSON.stringify(c.slice(-500))); } catch (e) { /* sin espacio */ }
  }
  function encolar(op) {
    const c = cola();
    // Una fila que cambia dos veces solo necesita subirse una: gana la última.
    const i = c.findIndex(x => x.tipo === op.tipo && x.tabla === op.tabla && x.clave === op.clave);
    if (i >= 0) c[i] = op; else c.push(op);
    guardarCola(c);
  }
  function pendientes() { return cola().length; }

  async function vaciarCola() {
    if (!configurada() || !sesion) return { subidas: 0, pendientes: pendientes() };
    let subidas = 0;
    let c = cola();
    while (c.length) {
      const op = c[0];
      try {
        if (op.tipo === 'fila') await subirFila(op.tabla, op.datos);
        else if (op.tipo === 'borrar') await borrarFila(op.tabla, op.clave);
        else if (op.tipo === 'asistencia') await guardarAsistencia(op.datos.semana, op.datos.clave, op.datos.hora);
        else if (op.tipo === 'movimiento') await anotarMovimiento(op.datos);
        c = cola();
        c.shift();
        guardarCola(c);
        subidas++;
      } catch (e) {
        // Un rechazo por permisos nunca se va a resolver reintentando: se descarta
        // para que no bloquee al resto de la cola.
        if (e.status === 401 || e.status === 403) {
          c = cola(); c.shift(); guardarCola(c);
          continue;
        }
        break;
      }
      c = cola();
    }
    return { subidas, pendientes: pendientes() };
  }

  return {
    configurada, guardarConexion, olvidarConexion, probarConexion, cfg,
    sesionActual, listaAcceso, entrar, salir, refrescar, refrescarPerfil,
    traerTodo, traerTabla, traerAsistencia,
    subirFila, subirLote, borrarFila, guardarAsistencia, anotarMovimiento, contarFilas,
    subirFoto, urlFoto, borrarFoto,
    encolar, vaciarCola, pendientes, TABLAS
  };
})();
