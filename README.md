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
| `nube.js` | El código que sincroniza con la base compartida. |
| `api/chat.js` | Endpoint del asistente (necesita `OPENAI_API_KEY` en el servidor). |
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

Copia el UUID que aparece en la lista y, de vuelta en el SQL Editor, corre una
línea por persona:

```sql
insert into public.perfiles (id, usuario, nombre, rol) values
  ('el-uuid-que-copiaste', 'gabriela', 'Gabriela Domínguez Becerril', 'dueno');

insert into public.perfiles (id, usuario, nombre, rol) values
  ('el-uuid-que-copiaste', 'eydan', 'Eydan Ramírez Domínguez', 'empleado');
```

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

### 5. Subir los datos que ya existen

Abre la app, entra como dueña y acepta cuando pregunte si quiere subir los datos.
También está el botón **Subir datos** arriba a la derecha. Es solo la primera vez.

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
