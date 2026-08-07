-- ============================================================================
-- GabiDom.inc — esquema de la base compartida
--
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Crea las tablas, las reglas de acceso por rol y el perfil de cada persona.
--
-- Roles:
--   dueno    → todo: reportes de dinero, borrar, empleados, asistencia
--   empleado → registrar ventas y consultar/ajustar inventario (lo acordado)
-- ============================================================================

-- ---------------------------------------------------------------- perfiles --
-- Une cada cuenta de acceso con su nombre y su rol.
create table if not exists public.perfiles (
  id       uuid primary key references auth.users(id) on delete cascade,
  usuario  text not null unique,          -- se usa para armar el correo de acceso
  nombre   text not null,
  rol      text not null default 'empleado' check (rol in ('dueno','empleado')),
  activo   boolean not null default true,
  creado   timestamptz not null default now()
);

-- ¿La persona conectada es dueña? Se usa en las reglas de acceso.
-- security definer: puede leer perfiles sin caer en la recursión de sus propias reglas.
create or replace function public.es_dueno()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select rol = 'dueno' from public.perfiles where id = auth.uid() and activo),
    false
  );
$$;

-- Lista para la pantalla de acceso: SOLO usuario y nombre.
-- No expone correos, ni roles, ni nada de la operación.
create or replace view public.perfiles_login
with (security_invoker = off) as
  select usuario, nombre from public.perfiles where activo;

-- ------------------------------------------------------------------ tablas --
create table if not exists public.ventas (
  id            uuid primary key default gen_random_uuid(),
  folio         text,
  mes           text,
  fecha         date,
  cliente       text,
  monto_total   numeric,
  no_tarjeta    text,
  monto_tarjeta numeric,
  efectivo      numeric,
  restante      numeric,
  forma_pago    text,
  estatus       text not null default 'Pendiente',
  obs           text,
  registro_de   text,                     -- nombre de quien la capturó
  actualizado   timestamptz not null default now()
);

create table if not exists public.prendas (
  id           uuid primary key default gen_random_uuid(),
  categoria    text not null,
  variante     text not null,
  talla        text not null,
  cantidad     integer not null default 0,
  stock_minimo integer not null default 10,
  actualizado  timestamptz not null default now()
);

create table if not exists public.insumos (
  id           uuid primary key default gen_random_uuid(),
  insumo       text not null default 'Cierre',
  color        text not null,
  talla        text,
  medida       text,
  cantidad     integer not null default 0,
  stock_minimo integer not null default 10,
  actualizado  timestamptz not null default now()
);

create table if not exists public.folios_revisar (
  id     uuid primary key default gen_random_uuid(),
  folio  text,
  mes    text,
  fecha  text,
  notas  text
);

create table if not exists public.clientes (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo   text not null default 'Escuela',
  tel    text,
  email  text,
  dir    text,
  notas  text
);

create table if not exists public.empleados (
  id      uuid primary key default gen_random_uuid(),
  nombre  text not null,
  puesto  text,
  tel     text,
  turno   text,
  salario numeric default 0,
  fecha   date,
  notas   text
);

create table if not exists public.asistencia (
  id       uuid primary key default gen_random_uuid(),
  semana   date not null,
  clave    text not null,                 -- empleado|dia|turno
  hora     text,
  unique (semana, clave)
);

-- Deja constancia de cada movimiento de inventario: quién, cuándo y cuánto.
create table if not exists public.movimientos (
  id          uuid primary key default gen_random_uuid(),
  tabla       text not null check (tabla in ('prendas','insumos')),
  fila        uuid not null,
  descripcion text,
  antes       integer,
  despues     integer,
  hecho_por   text,
  momento     timestamptz not null default now()
);

-- --------------------------------------------------- reglas de acceso (RLS) --
-- Sin estas reglas, cualquiera con el enlace podría leer y escribir todo.
alter table public.perfiles       enable row level security;
alter table public.ventas         enable row level security;
alter table public.prendas        enable row level security;
alter table public.insumos        enable row level security;
alter table public.folios_revisar enable row level security;
alter table public.clientes       enable row level security;
alter table public.empleados      enable row level security;
alter table public.asistencia     enable row level security;
alter table public.movimientos    enable row level security;

-- Cada quien ve su propio perfil; la dueña ve todos.
drop policy if exists perfiles_leer on public.perfiles;
create policy perfiles_leer on public.perfiles
  for select to authenticated using (id = auth.uid() or public.es_dueno());

drop policy if exists perfiles_dueno on public.perfiles;
create policy perfiles_dueno on public.perfiles
  for all to authenticated using (public.es_dueno()) with check (public.es_dueno());

-- Ventas: cualquiera que entró puede ver y registrar; solo la dueña puede borrar.
drop policy if exists ventas_leer on public.ventas;
create policy ventas_leer on public.ventas for select to authenticated using (true);

drop policy if exists ventas_crear on public.ventas;
create policy ventas_crear on public.ventas for insert to authenticated with check (true);

drop policy if exists ventas_editar on public.ventas;
create policy ventas_editar on public.ventas for update to authenticated using (true) with check (true);

drop policy if exists ventas_borrar on public.ventas;
create policy ventas_borrar on public.ventas for delete to authenticated using (public.es_dueno());

-- Inventario: ver y ajustar cantidades sí; borrar productos solo la dueña.
do $$
declare t text;
begin
  foreach t in array array['prendas','insumos'] loop
    execute format('drop policy if exists %I_leer on public.%I', t, t);
    execute format('create policy %I_leer on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists %I_editar on public.%I', t, t);
    execute format('create policy %I_editar on public.%I for update to authenticated using (true) with check (true)', t, t);
    execute format('drop policy if exists %I_crear on public.%I', t, t);
    execute format('create policy %I_crear on public.%I for insert to authenticated with check (public.es_dueno())', t, t);
    execute format('drop policy if exists %I_borrar on public.%I', t, t);
    execute format('create policy %I_borrar on public.%I for delete to authenticated using (public.es_dueno())', t, t);
  end loop;
end $$;

-- Folios por revisar y clientes: operación normal para todos los que entraron.
do $$
declare t text;
begin
  foreach t in array array['folios_revisar','clientes'] loop
    execute format('drop policy if exists %I_todo on public.%I', t, t);
    execute format('create policy %I_todo on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

-- Empleados y asistencia: solo la dueña.
do $$
declare t text;
begin
  foreach t in array array['empleados','asistencia'] loop
    execute format('drop policy if exists %I_leer on public.%I', t, t);
    execute format('create policy %I_leer on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists %I_dueno on public.%I', t, t);
    execute format('create policy %I_dueno on public.%I for all to authenticated using (public.es_dueno()) with check (public.es_dueno())', t, t);
  end loop;
end $$;

-- Bitácora de inventario: todos anotan, nadie edita ni borra lo ya anotado.
drop policy if exists movimientos_leer on public.movimientos;
create policy movimientos_leer on public.movimientos for select to authenticated using (true);

drop policy if exists movimientos_crear on public.movimientos;
create policy movimientos_crear on public.movimientos for insert to authenticated with check (true);

-- La lista de nombres de la pantalla de acceso sí es pública (solo nombres).
grant select on public.perfiles_login to anon, authenticated;

-- ------------------------------------------------------------------ índices --
create index if not exists ventas_fecha_idx   on public.ventas (fecha);
create index if not exists ventas_estatus_idx on public.ventas (estatus);
create index if not exists prendas_cat_idx    on public.prendas (categoria);
create index if not exists prendas_busca_idx  on public.prendas (variante, talla);
create index if not exists insumos_busca_idx  on public.insumos (color, medida);

-- ============================================================================
-- PASO 2 — dar de alta a las personas
--
-- Primero créalas en Supabase → Authentication → Users → "Add user":
--   Email:    usuario@gabidom.mx   (inventa el usuario: gabriela, eydan, isabel…)
--   Password: su PIN, de 6 dígitos
--   Marca "Auto Confirm User"
--
-- El PIN va de 6 dígitos porque Supabase exige mínimo 6 caracteres, y porque
-- con 4 dígitos solo existen 10 mil combinaciones posibles.
--
-- Después corre esto para ponerles nombre y rol. Busca a cada quien por su
-- correo, así que NO hace falta copiar ningún UUID a mano.
-- Cambia los correos y los nombres por los tuyos, y borra las líneas que sobren.
-- ============================================================================

insert into public.perfiles (id, usuario, nombre, rol)
select id, split_part(email, '@', 1), datos.nombre, datos.rol
from auth.users
join (values
    -- correo                     nombre completo                    rol
    ('gabriela@gabidom.mx', 'Gabriela Domínguez Becerril', 'dueno'),
    ('eydan@gabidom.mx',    'Eydan Ramírez Domínguez',     'empleado'),
    ('isabel@gabidom.mx',   'María Isabel González Lemus', 'empleado')
  ) as datos(correo, nombre, rol) on auth.users.email = datos.correo
on conflict (id) do update
  set nombre = excluded.nombre, rol = excluded.rol, activo = true;

-- Comprueba que quedaron bien. Deben aparecer todas las personas con su rol;
-- si alguna falta, es que su correo aquí no coincide con el de Authentication.
select usuario, nombre, rol from public.perfiles order by rol, nombre;

-- ============================================================================
-- PASO 3 — fotos de las notas de venta
--
-- Corre esto una vez para que la app pueda guardar la foto o el comprobante
-- de cada venta. El bucket queda PRIVADO: las fotos solo se ven desde la app
-- por quien haya entrado con su PIN, nunca por alguien que adivine la
-- dirección del archivo.
-- ============================================================================

-- Columna donde la venta recuerda cuál es su foto.
alter table public.ventas add column if not exists foto text;

-- Bucket privado, con tope de 8 MB y solo imágenes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ventas', 'ventas', false, 8388608,
        array['image/jpeg','image/jpg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/webp'];

-- Quien entró puede ver y subir fotos; borrarlas queda para la dueña.
drop policy if exists ventas_fotos_ver on storage.objects;
create policy ventas_fotos_ver on storage.objects
  for select to authenticated using (bucket_id = 'ventas');

drop policy if exists ventas_fotos_subir on storage.objects;
create policy ventas_fotos_subir on storage.objects
  for insert to authenticated with check (bucket_id = 'ventas');

drop policy if exists ventas_fotos_reemplazar on storage.objects;
create policy ventas_fotos_reemplazar on storage.objects
  for update to authenticated using (bucket_id = 'ventas') with check (bucket_id = 'ventas');

drop policy if exists ventas_fotos_borrar on storage.objects;
create policy ventas_fotos_borrar on storage.objects
  for delete to authenticated using (bucket_id = 'ventas' and public.es_dueno());

-- ============================================================================
-- PASO 4 — reinicio de la numeración de notas (7 de agosto de 2026)
--
-- A partir de esta fecha las notas se numeran desde 0001. Los folios viejos
-- (A 665, 22467…) se conservan tal cual: esto solo cambia lo que la app
-- propone al registrar una venta nueva.
-- ============================================================================

create table if not exists public.ajustes (
  clave  text primary key,
  valor  text,
  nota   text,
  puesto timestamptz not null default now()
);

alter table public.ajustes enable row level security;

drop policy if exists ajustes_leer on public.ajustes;
create policy ajustes_leer on public.ajustes for select to authenticated using (true);

drop policy if exists ajustes_dueno on public.ajustes;
create policy ajustes_dueno on public.ajustes
  for all to authenticated using (public.es_dueno()) with check (public.es_dueno());

insert into public.ajustes (clave, valor, nota) values
  ('folio_reinicio_desde', '2026-08-07',
   'Desde esta fecha las notas se numeran desde 0001. Los folios anteriores se conservan.')
on conflict (clave) do nothing;
