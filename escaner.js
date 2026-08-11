/* ============================================================================
   Lector de códigos de barras EAN-13 con la cámara.

   Sin librerías ni CDN, para que la app siga siendo un solo archivo.

   Dos caminos:
     1. BarcodeDetector, el lector que ya trae el navegador (Chrome en Android).
        Es el más rápido y el más tolerante al pulso de la mano.
     2. Si no existe —el caso de iPhone—, se decodifica aquí mismo: se lee la
        franja de píxeles del centro de la imagen, la línea de la mira, se
        mide el grosor de cada barra y se traduce a dígitos.
   ========================================================================= */
'use strict';

const Escaner = (() => {

  /* ---------------------------------------------------------- tablas EAN -- */
  /* Cada dígito son 7 módulos. En la mitad izquierda se codifica con el juego
     L o el G, y qué juego se usa en cada posición revela el primer dígito.  */
  const L = ['0001101','0011001','0010011','0111101','0100011',
             '0110001','0101111','0111011','0110111','0001011'];
  const G = ['0100111','0110011','0011011','0100001','0011101',
             '0111001','0000101','0010001','0001001','0010111'];
  const PARIDAD = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG',
                   'LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];

  /** El último dígito confirma que la lectura fue correcta. */
  function digitoOk(codigo) {
    if (!/^\d{13}$/.test(codigo)) return false;
    let suma = 0;
    for (let i = 0; i < 12; i++) suma += Number(codigo[i]) * (i % 2 ? 3 : 1);
    return (10 - suma % 10) % 10 === Number(codigo[12]);
  }

  /* ------------------------------------------------- decodificar una fila -- */
  /** Promedia cada píxel con sus vecinos: quita la mota suelta del sensor
      sin llegar a borrar el borde entre una barra y la siguiente. */
  function suavizar(fila) {
    const out = new Uint8ClampedArray(fila.length);
    out[0] = fila[0];
    out[fila.length - 1] = fila[fila.length - 1];
    for (let i = 1; i < fila.length - 1; i++) {
      out[i] = (fila[i - 1] + fila[i] * 2 + fila[i + 1]) / 4;
    }
    return out;
  }

  /** Pasa la fila de píxeles a blanco y negro con el umbral a media luz. */
  function binarizar(fila) {
    let min = 255, max = 0;
    for (let i = 0; i < fila.length; i++) {
      if (fila[i] < min) min = fila[i];
      if (fila[i] > max) max = fila[i];
    }
    if (max - min < 40) return null;          // franja plana: no hay código
    const umbral = (min + max) / 2;
    const bits = new Uint8Array(fila.length);
    for (let i = 0; i < fila.length; i++) bits[i] = fila[i] < umbral ? 1 : 0;
    return bits;
  }

  /** Longitud de cada racha de negro/blanco, con dónde empieza cada una. */
  function rachas(bits) {
    const out = [];
    let inicio = 0;
    for (let i = 1; i <= bits.length; i++) {
      if (i === bits.length || bits[i] !== bits[i - 1]) {
        out.push({ valor: bits[i - 1], largo: i - inicio, inicio });
        inicio = i;
      }
    }
    return out;
  }

  /** Convierte '0001101' en los anchos de sus rachas: [3,2,1,1]. */
  function anchosDe(patron) {
    const out = [];
    let n = 1;
    for (let i = 1; i < patron.length; i++) {
      if (patron[i] === patron[i - 1]) n++;
      else { out.push(n); n = 1; }
    }
    out.push(n);
    return out;
  }
  // Cada dígito son cuatro rachas que suman siete módulos. Comparar anchos
  // —en vez de muestrear a pasos fijos— evita que el error de escala se vaya
  // acumulando dígito a dígito y desalinee el final del código.
  const ANCHOS_L = L.map(anchosDe);
  const ANCHOS_G = G.map(anchosDe);

  /** Qué tan lejos está un grupo de 4 rachas del patrón de un dígito. */
  function distancia(rachas4, patron, modulo) {
    let d = 0;
    for (let i = 0; i < 4; i++) {
      const dif = rachas4[i] / modulo - patron[i];
      d += dif * dif;
    }
    return d;
  }

  /** Elige el dígito cuyo patrón de anchos se parece más a estas 4 rachas. */
  function digitoPorAnchos(rachas4, ladoDerecho) {
    const total = rachas4[0] + rachas4[1] + rachas4[2] + rachas4[3];
    if (total <= 0) return null;
    const modulo = total / 7;             // cada dígito ocupa siempre 7 módulos
    let mejor = null;
    const tablas = ladoDerecho ? [ANCHOS_L] : [ANCHOS_L, ANCHOS_G];
    tablas.forEach((tabla, t) => {
      tabla.forEach((patron, d) => {
        const dist = distancia(rachas4, patron, modulo);
        if (!mejor || dist < mejor.dist) {
          mejor = { d, dist, juego: (ladoDerecho ? 'R' : (t === 0 ? 'L' : 'G')) };
        }
      });
    });
    // una distancia grande significa que eso no era un dígito
    return (mejor && mejor.dist < 1.2) ? mejor : null;
  }

  /** Intenta leer un EAN-13 completo a partir de la guarda inicial. */
  function leerDesde(rs, iGuarda) {
    // rs[iGuarda..iGuarda+2] es la guarda 101; los dígitos vienen enseguida
    let i = iGuarda + 3;
    const izquierda = [];
    let paridad = '';

    for (let n = 0; n < 6; n++) {
      if (i + 3 >= rs.length) return null;
      const cuatro = [rs[i].largo, rs[i + 1].largo, rs[i + 2].largo, rs[i + 3].largo];
      const dig = digitoPorAnchos(cuatro, false);
      if (!dig) return null;
      izquierda.push(dig.d);
      paridad += dig.juego;
      i += 4;
    }
    const primero = PARIDAD.indexOf(paridad);
    if (primero < 0) return null;

    i += 5;                                  // guarda central 01010
    const derecha = [];
    for (let n = 0; n < 6; n++) {
      if (i + 3 >= rs.length) return null;
      const cuatro = [rs[i].largo, rs[i + 1].largo, rs[i + 2].largo, rs[i + 3].largo];
      const dig = digitoPorAnchos(cuatro, true);
      if (!dig) return null;
      derecha.push(dig.d);
      i += 4;
    }
    const codigo = String(primero) + izquierda.join('') + derecha.join('');
    return digitoOk(codigo) ? codigo : null;
  }

  /** Busca un EAN-13 en una fila de luminancia. */
  function decodificarFila(fila) {
    const bits = binarizar(suavizar(fila));
    if (!bits) return null;
    const rs = rachas(bits);

    // Una guarda inicial son tres rachas parejas: barra, espacio, barra.
    for (let i = 0; i < rs.length - 2; i++) {
      if (rs[i].valor !== 1) continue;
      const a = rs[i].largo, b = rs[i + 1].largo, c = rs[i + 2].largo;
      if (a < 1 || b < 1 || c < 1) continue;
      const prom = (a + b + c) / 3;
      if (Math.abs(a - prom) > prom * 0.6) continue;
      if (Math.abs(b - prom) > prom * 0.6) continue;
      if (Math.abs(c - prom) > prom * 0.6) continue;
      // un código entero mide 95 módulos: no cabe si ya no queda espacio
      if (rs[i].inicio + 95 * prom > bits.length + prom * 2) continue;

      const codigo = leerDesde(rs, i);
      if (codigo) return codigo;
    }
    return null;
  }

  /** Lee la franja central de un frame: varias filas, y gana la que se repita. */
  function decodificarImagen(datos, ancho, alto, filas) {
    const cuantas = filas || 15;
    const votos = {};
    for (let n = 0; n < cuantas; n++) {
      // se recorre la banda del centro, que es donde apunta la mira
      const y = Math.floor(alto * (0.5 + (n - cuantas / 2) * 0.02));
      if (y < 0 || y >= alto) continue;
      const fila = new Uint8ClampedArray(ancho);
      for (let x = 0; x < ancho; x++) {
        const p = (y * ancho + x) * 4;
        // luminancia: el verde pesa más porque así ve el ojo
        fila[x] = (datos[p] * 0.299 + datos[p + 1] * 0.587 + datos[p + 2] * 0.114);
      }
      let codigo = decodificarFila(fila);
      if (!codigo) {                     // el código puede venir al revés
        codigo = decodificarFila(fila.slice().reverse());
      }
      if (codigo) {
        votos[codigo] = (votos[codigo] || 0) + 1;
        if (votos[codigo] >= 2) return codigo;   // dos filas de acuerdo: seguro
      }
    }
    const ganador = Object.keys(votos)[0];
    return ganador || null;
  }

  function hayLectorDelNavegador() {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window;
  }

  return { digitoOk, decodificarFila, decodificarImagen, hayLectorDelNavegador };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Escaner;
