#!/usr/bin/env python3
"""Genera gabidom-movil.html: un archivo unico y autonomo para abrir en el celular.

Incrusta data.js dentro de index.html y agrega las meta etiquetas que permiten
"Agregar a pantalla de inicio", de modo que el archivo funcione sin servidor,
sin internet y sin archivos vecinos.

Uso: python3 build-movil.py
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).parent
ENTRADA = RAIZ / "index.html"
DATOS = RAIZ / "data.js"
SALIDA = RAIZ / "gabidom-movil.html"

META_MOVIL = """  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="GabiDom">
"""


def main() -> int:
    for archivo in (ENTRADA, DATOS):
        if not archivo.exists():
            print(f"Falta {archivo.name}", file=sys.stderr)
            return 1

    html = ENTRADA.read_text(encoding="utf-8")
    datos = DATOS.read_text(encoding="utf-8")

    etiqueta = '<script src="data.js"></script>'
    if etiqueta not in html:
        print("No se encontro la etiqueta de data.js en index.html", file=sys.stderr)
        return 1

    # </script> dentro del JSON cerraria el bloque antes de tiempo.
    if "</script" in datos.lower():
        print("data.js contiene una etiqueta de cierre de script", file=sys.stderr)
        return 1

    html = html.replace(etiqueta, "<script>\n" + datos.rstrip() + "\n  </script>")
    html = re.sub(r'(  <meta name="theme-color"[^>]*>\n)', r"\1" + META_MOVIL, html, count=1)

    SALIDA.write_text(html, encoding="utf-8")
    kb = SALIDA.stat().st_size / 1024
    print(f"{SALIDA.name} generado ({kb:.0f} KB, un solo archivo)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
