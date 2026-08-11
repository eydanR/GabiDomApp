#!/usr/bin/env python3
"""Genera gabidom-movil.html: un archivo unico y autonomo para abrir en el celular.

Incrusta config.js, data.js y nube.js dentro de index.html y agrega las meta
etiquetas que permiten "Agregar a pantalla de inicio", de modo que el archivo
funcione sin servidor y sin archivos vecinos.

Ojo: si config.js ya trae la conexion a Supabase, queda dentro del archivo.
Comparte ese archivo solo con tu gente.

Uso: python3 build-movil.py
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).parent
ENTRADA = RAIZ / "index.html"
SCRIPTS = ["config.js", "etiquetas.js", "escuelas.js", "escaner.js", "data.js",
           "nube.js"]
SALIDA = RAIZ / "gabidom-movil.html"

META_MOVIL = """  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="GabiDom">
"""


def main() -> int:
    if not ENTRADA.exists():
        print("Falta index.html", file=sys.stderr)
        return 1

    html = ENTRADA.read_text(encoding="utf-8")

    for nombre in SCRIPTS:
        archivo = RAIZ / nombre
        if not archivo.exists():
            print(f"Falta {nombre}", file=sys.stderr)
            return 1
        codigo = archivo.read_text(encoding="utf-8")

        etiqueta = f'<script src="{nombre}"></script>'
        if etiqueta not in html:
            print(f"No se encontro la etiqueta de {nombre} en index.html", file=sys.stderr)
            return 1

        # </script> dentro del codigo cerraria el bloque antes de tiempo.
        if "</script" in codigo.lower():
            print(f"{nombre} contiene una etiqueta de cierre de script", file=sys.stderr)
            return 1

        html = html.replace(etiqueta, "<script>\n" + codigo.rstrip() + "\n  </script>")
    html = re.sub(r'(  <meta name="theme-color"[^>]*>\n)', r"\1" + META_MOVIL, html, count=1)

    SALIDA.write_text(html, encoding="utf-8")
    kb = SALIDA.stat().st_size / 1024
    print(f"{SALIDA.name} generado ({kb:.0f} KB, un solo archivo)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
