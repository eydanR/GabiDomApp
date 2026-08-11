# GabiDomApp

Centro de operaciones de GabiDom.inc: ventas, inventario de uniformes y cierres,
clientes, empleados y reportes.

La app es un solo HTML sin dependencias: funciona abriéndola tal cual, y si la
conectas a una base compartida, todos ven y editan lo mismo desde cualquier
dispositivo.

## Cómo se usa

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La app. Ábrela con doble clic o publícala en un hosting. |
| `gabidom-movil.html` | La misma app en **un solo archivo**, para pasar al celular. |
| `config.js` | Donde pones la conexión a la base compartida. |
| `supabase/esquema.sql` | Se pega en Supabase para crear las tablas y los permisos. |
| `data.js` | Los datos que salieron del Excel original. |
| `etiquetas.js` | Catálogo de los 438 artículos con código de barras. |
| `escaner.js` | Lee los códigos de barras con la cámara. |
| `nube.js` | El código que sincroniza con la base compartida. |
| `supabase/functions/asistente/` | Función de Supabase del asistente (necesita el secreto `ANTHROPIC_API_KEY`). |
| `build-movil.py` | Regenera `gabidom-movil.html` cuando cambies la app. |

Sin conectar nada, la app guarda **solo en el dispositivo donde se usa**. Para
compartir los datos hay que hacer lo de abajo una vez.

## Conectar la base compartida (una sola vez)

### 1. Crear el proyecto

Entra a [supabase.com](https://supabase.com), crea una cuenta gratis y un
proyecto nuevo. Anota la contraseña de la base de datos que te pida.

### 2. Crear las tablas

En el menú del proyecto: **SQL Editor → New query**. Pega **todo** el contenido
de `supabase/esquema.sql` y dale **Run**. Eso crea las tablas y, sobre todo, las
reglas que impiden que alguien con el enlace lea o cambie lo que no le toca.

### 3. Dar de alta a las personas

Por cada quien vaya a entrar, en **Authentication → Users → Add user**:

- **Email**: `nombre@gabidom.mx` (inventa el usuario: `gabriela`, `eydan`, …)
- **Password**: su PIN, **de 6 dígitos**
- Marca **Auto Confirm User**

De vuelta en el SQL Editor, corre el bloque del final de `supabase/esquema.sql`
cambiando los correos y los nombres por los tuyos. Busca a cada quien por su
correo, así que **no hace falta copiar ningún UUID a mano**:

```sql
insert into public.perfiles (id, usuario, nombre, rol)
select id, split_part(email, '@', 1), datos.nombre, datos.rol
from auth.users
join (values
    ('gabriela@gabidom.mx', 'Gabriela Domínguez Becerril', 'dueno'),
    ('eydan@gabidom.mx',    'Eydan Ramírez Domínguez',     'empleado')
  ) as datos(correo, nombre, rol) on auth.users.email = datos.correo
on conflict (id) do update
  set nombre = excluded.nombre, rol = excluded.rol, activo = true;
```

El dominio después de la `@` debe ser el mismo en todos y coincidir con
`DOMINIO_ACCESO` en `config.js`: es el error más común.

El PIN va de 6 dígitos porque Supabase exige mínimo 6 caracteres, y porque con
4 dígitos solo existen 10 mil combinaciones posibles.

### 4. Apuntar la app a tu proyecto

En Supabase: **Settings → API**. Copia los dos valores a `config.js`:

```js
window.GABIDOM_CONFIG = {
  SUPABASE_URL: 'https://xxxxxxxx.supabase.co',   // "Project URL"
  SUPABASE_ANON_KEY: 'eyJhbGci...',               // "anon public"
  DOMINIO_ACCESO: 'gabidom.mx'
};
```

La llave `anon public` está hecha para vivir en la app; lo que de verdad protege
los datos son las reglas del paso 2. **Nunca pongas ahí la llave `service_role`**:
esa se salta todas las reglas.

### 5. Espacio para las fotos de las notas

Vuelve al **SQL Editor** y corre el **PASO 3** que viene al final de
`supabase/esquema.sql`. Crea el espacio donde se guardan las fotos de las notas.

Ese espacio queda **privado**: las fotos solo se ven desde la app por quien haya
entrado con su PIN, nunca por alguien que adivine la dirección del archivo.

Si Supabase no te deja crear ese espacio desde el SQL Editor (pasa en algunos
proyectos), **el resto del archivo se instala igual** y el propio SQL te dice
cómo crearlo a mano desde el menú **Storage**. No es un error tuyo.

Si te saltas este paso la app funciona, pero al guardar una venta con foto
avisará que falta crearlo.

### 6. Artículos con código de barras

En el **SQL Editor** corre también el **PASO 5** del final de
`supabase/esquema.sql`. Crea el catálogo de artículos etiquetados y las dos
columnas donde cada venta anota lo que se llevó el cliente.

### 7. Subir los datos que ya existen

Abre la app, entra como dueña y acepta cuando pregunte si quiere subir los datos.
También está el botón **Subir datos** arriba a la derecha. Es solo la primera vez.

### 8. Asistente con Claude (opcional)

La sección **Asistente** deja preguntar por ventas, inventario, clientes y
escuelas en lenguaje natural. Necesita publicar la función de `supabase/functions/asistente`
y darle una llave de Claude — sin eso, la app funciona igual, solo esa sección
no responde.

Con la [CLI de Supabase](https://supabase.com/docs/guides/cli) instalada y
conectada a tu proyecto:

```sh
supabase functions deploy asistente
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

La llave de Claude se consigue en [console.anthropic.com](https://console.anthropic.com).
Vive solo como secreto de la función — nunca dentro de la app ni del navegador.
El asistente consulta la base con la sesión de quien pregunta, así que cada
quien ve exactamente lo que ya puede ver dentro de la app (mismas reglas del
paso 2): no hay una vía paralela que le dé más acceso.

## Quién puede hacer qué

| | Dueña | Empleado |
|---|---|---|
| Registrar ventas | Sí | Sí |
| Consultar y ajustar inventario | Sí | Sí |
| Ver reportes de dinero e ingresos | Sí | No |
| Clientes, empleados, asistencia | Sí | No |
| Borrar registros | Sí | No |

Los permisos no son solo de pantalla: están también en las reglas de la base, así
que no se saltan aunque alguien manipule la app desde el navegador.

Cada ajuste de inventario queda anotado en la tabla `movimientos` con quién lo
hizo, cuándo, y de cuánto a cuánto.

## Foto de la nota

Al registrar una venta puedes adjuntar la nota o el comprobante, desde el
celular o la computadora:

- **Tomar foto** abre directo la cámara trasera del teléfono.
- **Elegir de la galería** acepta JPG, JPEG, PNG y WEBP.

La foto se reduce y recomprime **antes de subirse** (una de 1.7 MB queda en unos
600 KB) para no gastar los datos de quien está en el mostrador. En la tabla de
ventas cada nota con foto trae un botón para verla en grande.

Si en ese momento no hay señal, la venta se guarda igual y **la foto no se
pierde**: queda en el teléfono, se puede ver, y sube sola en cuanto vuelve la
conexión. Al borrar una venta se borra también su foto.

## Numeración de las notas

**A partir del 7 de agosto de 2026 las notas se numeran desde 0001.** La app
propone sola el siguiente número al abrir una venta nueva, contando únicamente
las emitidas desde esa fecha; lo puedes cambiar a mano si hace falta.

Si dos personas capturan a la vez y les toca el mismo número, al guardar la app
avisa y ofrece el siguiente libre, para no terminar con dos notas 0007.

Los folios anteriores (`A 665`, `22467`…) **se conservan tal cual**: el reinicio
solo afecta a las notas nuevas.

## Escanear artículos al vender

Al registrar una venta, **Escanear código de barras** abre la cámara con una
mira y una línea roja: se pone el código sobre la línea y el artículo se suma
solo, con su nombre, talla y precio. Escaneado todo, la app propone el total.

Un código que se queda frente a la cámara **se cuenta una sola vez**: para
sumar otra pieza igual, se aparta y se vuelve a acercar, o se usa el **+** de
la lista. Si la cámara no está disponible, **Escribir código** acepta los 13
dígitos a mano.

Las etiquetas son EAN-13 y salen de `ETIQUETAS_EXISTENCIAS_1.pdf` y
`ETIQUETAS_CONJUNTOS_2026.pdf`: **438 artículos**, 312 prendas (1,236 piezas)
y 126 conjuntos.

### Cuándo sale la mercancía del inventario

**Al marcar la venta como entregada**, no al capturarla: hasta ese momento la
mercancía sigue en la tienda. Si la venta se guarda ya entregada, se descuenta
en ese mismo momento.

Cada descuento queda anotado en `movimientos` con quién lo hizo, y una venta
**nunca descuenta dos veces**, aunque se le cambie el estatus de ida y vuelta.

## El Mostrador

Pensado para el celular con el cliente enfrente: se busca la prenda por nombre,
color o talla, se ve cuántas piezas hay de esa talla exacta y se ajusta con un
toque en **−** o **+**. Sirve igual para prendas y para cierres.

## Si no hay señal

Los cambios se guardan en el teléfono y se van subiendo solos en cuanto vuelve la
conexión. El botón de arriba a la derecha dice **Al día**, **N por subir** o
**Solo aquí**, y tocándolo se fuerza la sincronización.

## Ponerla en el celular

1. `python3 build-movil.py` genera `gabidom-movil.html`.
2. Pásalo al teléfono (correo, WhatsApp, Drive) y ábrelo con el navegador.
3. Menú del navegador → **Agregar a pantalla de inicio**.

Si `config.js` ya trae la conexión, queda **dentro** de ese archivo: compártelo
solo con tu gente.

## Detalles de los datos

Los datos vienen del Excel original y se conservan tal cual, sin corregirlos por
nuestra cuenta. La app marca lo que conviene revisar:

- **Montos**: ventas donde tarjeta + efectivo + restante no cuadra con el total
  (por ejemplo el folio A 694, que trae 195,300 de tarjeta contra un total de 570).
- **Incompleta**: folios que venían sin fecha ni monto.
- **Por revisar**: 169 folios de la plantilla original que quedaron vacíos.
- El **mínimo de stock** está en 10 para todo porque esa columna venía pendiente
  de llenar; conforme la ajustes, las alertas se vuelven confiables.
