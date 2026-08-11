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

   n = nombre corto (como se captura)   nombre = nombre completo
   nivel = Kinder | Primaria | Secundaria | ''   turno = Matutino | Vespertino | ''
   ========================================================================= */
window.GABIDOM_ESCUELAS = [
  /* --- Kinder (lista 2026 de conjuntos, hoja de KINDER) --- */
  { n: 'CENDI',       nombre: 'CENDI',                        nivel: 'Kinder',     turno: '' },
  { n: 'REYES MAT',   nombre: 'Reyes Heroles · matutino',     nivel: 'Kinder',     turno: 'Matutino' },
  { n: 'REYES VESP',  nombre: 'Reyes Heroles · vespertino',   nivel: 'Kinder',     turno: 'Vespertino' },
  { n: 'TEPEYO',      nombre: 'Tepeyo',                       nivel: 'Kinder',     turno: '' },
  { n: 'VILLA',       nombre: 'Villa Cto. AME',               nivel: 'Kinder',     turno: '' },

  /* --- Primaria (hojas de PRIMARIA) --- */
  { n: 'CARMEN MAT',  nombre: 'Carmen · matutino',            nivel: 'Primaria',   turno: 'Matutino' },
  { n: 'CARMEN VESP', nombre: 'Carmen · vespertino',          nivel: 'Primaria',   turno: 'Vespertino' },
  { n: 'JFM',         nombre: 'Julio Franco · matutino',      nivel: 'Primaria',   turno: 'Matutino' },
  { n: 'JFV',         nombre: 'Julio Franco · vespertino',    nivel: 'Primaria',   turno: 'Vespertino' },
  { n: 'LINAJE MAT',  nombre: 'Linaje · matutino',            nivel: 'Primaria',   turno: 'Matutino' },
  { n: 'LINAJE VESP', nombre: 'Linaje · vespertino',          nivel: 'Primaria',   turno: 'Vespertino' },
  { n: 'RENE MAT',    nombre: 'René · matutino',              nivel: 'Primaria',   turno: 'Matutino' },
  { n: 'RENE VESP',   nombre: 'René · vespertino',            nivel: 'Primaria',   turno: 'Vespertino' },
  { n: 'TLACAELEL',   nombre: 'Tlacaélel',                    nivel: 'Primaria',   turno: '' },

  /* --- Secundaria (hojas de SECUNDARIA: las diurnas 205, 309 y 327) --- */
  { n: '205 MAT',     nombre: 'Diurna 205 · matutino',        nivel: 'Secundaria', turno: 'Matutino' },
  { n: '205 VESP',    nombre: 'Diurna 205 · vespertino',      nivel: 'Secundaria', turno: 'Vespertino' },
  { n: '309 MAT',     nombre: 'Diurna 309 · matutino',        nivel: 'Secundaria', turno: 'Matutino' },
  { n: '309 VESP',    nombre: 'Diurna 309 · vespertino',      nivel: 'Secundaria', turno: 'Vespertino' },
  { n: '327',         nombre: 'Diurna 327',                   nivel: 'Secundaria', turno: '' },
  { n: 'DIURNA',      nombre: 'Diurna (sin número)',          nivel: 'Secundaria', turno: '' },
  { n: 'TECNICA',     nombre: 'Técnica',                      nivel: 'Secundaria', turno: '' },

  /* --- Sin nivel: la lista 2026 de conjuntos no las menciona --- */
  { n: '206',         nombre: 'Escuela 206',                  nivel: '', turno: '' },
  { n: '207',         nombre: 'Escuela 207',                  nivel: '', turno: '' },
  { n: 'TLAHUAC',     nombre: 'Tláhuac',                      nivel: '', turno: '' },
  { n: 'YAXCHE',      nombre: 'Yaxché',                       nivel: '', turno: '' },
  { n: 'POLITECNICO', nombre: 'Politécnico',                  nivel: '', turno: '' },
  { n: 'UIN',         nombre: 'UIN',                          nivel: '', turno: '' },
  { n: 'FEDERICO',    nombre: 'Federico',                     nivel: '', turno: '' }
];
