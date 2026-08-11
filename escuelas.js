/* ============================================================================
   Catálogo de escuelas.

   Los nombres salen de las 117 ventas del Excel y de las etiquetas de los PDF,
   así que son los que GabiDom usa de verdad, con sus abreviaturas y turnos.

   El NIVEL está por confirmar en casi todas: en los datos originales no venía,
   y clasificar una escuela por suposición sería peor que dejarlo en blanco.
   La única con respaldo es CENDI, que por definición es preescolar.

   Se puede corregir aquí, o desde la app en Clientes y escuelas: el nivel que
   se guarde en la base gana sobre lo que diga este archivo.

   n = nombre corto (como se captura)   nombre = nombre completo
   nivel = Kinder | Primaria | Secundaria | ''   turno = Matutino | Vespertino | ''
   ========================================================================= */
window.GABIDOM_ESCUELAS = [
  { n: 'CENDI',       nombre: 'CENDI',                       nivel: 'Kinder',     turno: '' },

  { n: '205 MAT',     nombre: 'Escuela 205 · matutino',      nivel: '', turno: 'Matutino' },
  { n: '205 VESP',    nombre: 'Escuela 205 · vespertino',    nivel: '', turno: 'Vespertino' },
  { n: '206',         nombre: 'Escuela 206',                 nivel: '', turno: '' },
  { n: '207',         nombre: 'Escuela 207',                 nivel: '', turno: '' },
  { n: '309 MAT',     nombre: 'Escuela 309 · matutino',      nivel: '', turno: 'Matutino' },
  { n: '309 VESP',    nombre: 'Escuela 309 · vespertino',    nivel: '', turno: 'Vespertino' },
  { n: '327',         nombre: 'Escuela 327',                 nivel: '', turno: '' },

  { n: 'LINAJE MAT',  nombre: 'Linaje · matutino',           nivel: '', turno: 'Matutino' },
  { n: 'LINAJE VESP', nombre: 'Linaje · vespertino',         nivel: '', turno: 'Vespertino' },
  { n: 'JFM',         nombre: 'Julio Franco · matutino',     nivel: '', turno: 'Matutino' },
  { n: 'JFV',         nombre: 'Julio Franco · vespertino',   nivel: '', turno: 'Vespertino' },
  { n: 'CARMEN MAT',  nombre: 'Carmen · matutino',           nivel: '', turno: 'Matutino' },
  { n: 'CARMEN VESP', nombre: 'Carmen · vespertino',         nivel: '', turno: 'Vespertino' },
  { n: 'REYES VESP',  nombre: 'Reyes · vespertino',          nivel: '', turno: 'Vespertino' },
  { n: 'RENE VESP',   nombre: 'René · vespertino',           nivel: '', turno: 'Vespertino' },
  { n: 'TLAHUAC',     nombre: 'Tláhuac',                     nivel: '', turno: '' },
  { n: 'TLACAELEL',   nombre: 'Tlacaélel',                   nivel: '', turno: '' },
  { n: 'TEPEYO',      nombre: 'Tepeyo',                      nivel: '', turno: '' },
  { n: 'VILLA',       nombre: 'Villa',                       nivel: '', turno: '' },
  { n: 'YAXCHE',      nombre: 'Yaxché',                      nivel: '', turno: '' },
  { n: 'POLITECNICO', nombre: 'Politécnico',                 nivel: '', turno: '' },
  { n: 'UIN',         nombre: 'UIN',                         nivel: '', turno: '' },
  { n: 'FEDERICO',    nombre: 'Federico',                    nivel: '', turno: '' },
  { n: 'DIURNA',      nombre: 'Diurna',                      nivel: '', turno: '' }
];
