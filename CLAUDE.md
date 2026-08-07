# Notas para Claude

## Publicación

**Toda actualización se sube a producción**, sin preguntar cada vez.
Instrucción de la persona dueña del proyecto (7 de agosto de 2026):

> cualquier actualizacion de ahora en adelante lo vas a subir a
> gabi-dom-app.vercel.app

Flujo: rama de trabajo → PR → merge a `main`. Vercel redespliega solo desde
`main` y sirve https://gabi-dom-app.vercel.app.

Después de mergear, arrancar la siguiente rama desde `main` ya actualizado:
`git fetch origin main && git checkout -B <rama> origin/main`.

## Cómo se prueba esto

El entorno de desarrollo **no alcanza supabase.co ni vercel.app** (los bloquea
la política de red), así que no se puede verificar contra el proyecto real.
Para no dar por bueno lo que no se probó:

- `supabase/esquema.sql` se valida contra un Postgres local, incluidas las
  reglas de acceso: se comprueba que un empleado no pueda borrar ni crear
  productos, y que sin sesión no se vea nada más que la lista de nombres.
- El flujo de la app se prueba contra un Supabase simulado (auth, REST y
  Storage) con Playwright, en las combinaciones dueña/empleado ×
  claro/oscuro × escritorio/móvil.

Los scripts de prueba viven en el scratchpad de la sesión, no en el repo.

## Al tocar la app

- `gabidom-movil.html` se regenera con `python3 build-movil.py` después de
  cambiar `index.html`, `config.js`, `data.js` o `nube.js`.
- `config.js` lleva la conexión real a Supabase: no vaciarlo ni sobrescribirlo.
- Los datos del Excel original se conservan tal cual, con sus inconsistencias.
  La app las marca para que se revisen; no se corrigen por nuestra cuenta.
