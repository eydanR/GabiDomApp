/* ============================================================================
   Conexión con la base compartida (Supabase)

   Llena estos dos datos y la app empieza a guardar en la nube: los cambios
   que haga cualquier persona aparecen en todos los dispositivos.

   Dónde encontrarlos:
     Supabase → tu proyecto → Settings → API
       SUPABASE_URL       = "Project URL"
       SUPABASE_ANON_KEY  = "anon public"

   La llave "anon public" está pensada para ir en la app; lo que de verdad
   protege los datos son las reglas de acceso de supabase/esquema.sql.
   NUNCA pongas aquí la llave "service_role": esa se salta todas las reglas.

   Mientras esto quede vacío, la app funciona igual pero guarda solo en el
   dispositivo donde se usa.
   ========================================================================= */
window.GABIDOM_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Dominio con el que se arman los correos de acceso a partir del usuario.
  // Si en Supabase creaste "gabriela@gabidom.mx", deja "gabidom.mx".
  DOMINIO_ACCESO: 'gabidom.mx'
};
