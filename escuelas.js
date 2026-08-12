/* ============================================================================
   Catálogo de escuelas.

   Los nombres cortos (n) salen de las 117 ventas del Excel y de las etiquetas:
   son los que GabiDom usa de verdad, con sus abreviaturas y turnos. No se
   cambian, porque las ventas ya registradas apuntan a ellos.

   El NIVEL sale de la lista 2026 de conjuntos, que viene separada en KINDER,
   PRIMARIA y SECUNDARIA: eso es lo que dice la propia papelería de GabiDom,
   no una suposición nuestra. Las que esa lista no menciona quedan en blanco
   a propósito, para que se noten y se clasifiquen a mano.

   Se puede corregir aquí, o desde la app en Clientes y escuelas: el nivel que
   se guarde en la base gana sobre lo que diga este archivo.

   busca = con qué texto aparecen sus conjuntos en el catálogo de etiquetas.
   No coincide con la clave: la venta se captura "JFM" pero el conjunto se
   llama "CONJUNTO GALA MUJER JULIO MAT", y las secundarias diurnas comparten
   conjunto ("DIURNA 205 309 327"). Sin este puente, filtrar las prendas de
   una escuela devolvería vacío en la mitad de los casos. Una lista vacía
   significa que esa escuela todavía no tiene conjuntos en el catálogo.

   n = nombre corto (como se captura)   nombre = nombre completo
   nivel = Kinder | Primaria | Secundaria | ''   turno = Matutino | Vespertino | ''
   ========================================================================= */
window.GABIDOM_ESCUELAS = [
  /* --- Kinder (lista 2026 de conjuntos, hoja de KINDER) --- */
  { n: 'CENDI',       nombre: 'CENDI',                        nivel: 'Kinder',     turno: '', busca: ['CENDI'] },
  { n: 'REYES MAT',   nombre: 'Reyes Heroles · matutino',     nivel: 'Kinder',     turno: 'Matutino', busca: ['REYES HEROLES MAT'] },
  { n: 'REYES VESP',  nombre: 'Reyes Heroles · vespertino',   nivel: 'Kinder',     turno: 'Vespertino', busca: ['REYES HEROLES VESP'] },
  { n: 'TEPEYO',      nombre: 'Tepeyo',                       nivel: 'Kinder',     turno: '', busca: ['TEPEYO'] },
  { n: 'VILLA',       nombre: 'Villa Cto. AME',               nivel: 'Kinder',     turno: '', busca: ['VILLA'] },

  /* --- Primaria (hojas de PRIMARIA) --- */
  { n: 'CARMEN MAT',  nombre: 'Carmen · matutino',            nivel: 'Primaria',   turno: 'Matutino', busca: ['CARMEN MAT'] },
  { n: 'CARMEN VESP', nombre: 'Carmen · vespertino',          nivel: 'Primaria',   turno: 'Vespertino', busca: ['CARMEN VESP'] },
  { n: 'JFM',         nombre: 'Julio Franco · matutino',      nivel: 'Primaria',   turno: 'Matutino', busca: ['JULIO MAT'] },
  { n: 'JFV',         nombre: 'Julio Franco · vespertino',    nivel: 'Primaria',   turno: 'Vespertino', busca: ['JULIO VESP'] },
  { n: 'LINAJE MAT',  nombre: 'Linaje · matutino',            nivel: 'Primaria',   turno: 'Matutino', busca: ['LINAJE MAT'] },
  { n: 'LINAJE VESP', nombre: 'Linaje · vespertino',          nivel: 'Primaria',   turno: 'Vespertino', busca: ['LINAJE VESP'] },
  { n: 'RENE MAT',    nombre: 'René · matutino',              nivel: 'Primaria',   turno: 'Matutino', busca: ['RENE'] },
  { n: 'RENE VESP',   nombre: 'René · vespertino',            nivel: 'Primaria',   turno: 'Vespertino', busca: ['RENE'] },
  { n: 'TLACAELEL',   nombre: 'Tlacaélel',                    nivel: 'Primaria',   turno: '', busca: ['TLACAELEL'] },

  /* --- Secundaria (hojas de SECUNDARIA: las diurnas 205, 309 y 327) --- */
  { n: '205 MAT',     nombre: 'Diurna 205 · matutino',        nivel: 'Secundaria', turno: 'Matutino', busca: ['DIURNA 205'] },
  { n: '205 VESP',    nombre: 'Diurna 205 · vespertino',      nivel: 'Secundaria', turno: 'Vespertino', busca: ['DIURNA 205'] },
  { n: '309 MAT',     nombre: 'Diurna 309 · matutino',        nivel: 'Secundaria', turno: 'Matutino', busca: ['DIURNA 309', '309 327'] },
  { n: '309 VESP',    nombre: 'Diurna 309 · vespertino',      nivel: 'Secundaria', turno: 'Vespertino', busca: ['DIURNA 309', '309 327'] },
  { n: '327',         nombre: 'Diurna 327',                   nivel: 'Secundaria', turno: '', busca: ['DIURNA 327', '309 327'] },
  { n: 'DIURNA',      nombre: 'Diurna (sin número)',          nivel: 'Secundaria', turno: '', busca: ['DIURNA'] },
  { n: 'TECNICA',     nombre: 'Técnica',                      nivel: 'Secundaria', turno: '', busca: ['TECNICA'] },

  /* --- Sin nivel: la lista 2026 de conjuntos no las menciona --- */
  { n: '206',         nombre: 'Escuela 206',                  nivel: '', turno: '', busca: [] },
  { n: '207',         nombre: 'Escuela 207',                  nivel: '', turno: '', busca: [] },
  { n: 'TLAHUAC',     nombre: 'Tláhuac',                      nivel: '', turno: '', busca: [] },
  { n: 'YAXCHE',      nombre: 'Yaxché',                       nivel: '', turno: '', busca: [] },
  { n: 'POLITECNICO', nombre: 'Politécnico',                  nivel: '', turno: '', busca: [] },
  { n: 'UIN',         nombre: 'UIN',                          nivel: '', turno: '', busca: [] },
  { n: 'FEDERICO',    nombre: 'Federico',                     nivel: '', turno: '', busca: [] }
];
