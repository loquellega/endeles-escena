"""Construye web/escena.html: el bosque de Endeles con el módulo de escena (escena.js).

El bosque se toma del repositorio de Endeles (loquellega/endeles), así cualquier mejora del bosque llega aquí.
Uso:  python construir.py --endeles RUTA_A_ENDELES     (por defecto ../endeles o ./endeles)
"""
import argparse, os, shutil, sys
raiz = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('--endeles', default=next((p for p in (os.path.join(raiz, 'endeles'), os.path.join(raiz, '..', 'endeles')) if os.path.isdir(p)), None))
a = ap.parse_args()
if not a.endeles or not os.path.isfile(os.path.join(a.endeles, 'desarrollo', 'src.html')):
    sys.exit('No encuentro Endeles. Clónalo (git clone https://github.com/loquellega/endeles) y pasa --endeles RUTA.')
E = lambda *p: os.path.join(a.endeles, *p)
leer = lambda p: open(p, encoding='utf-8').read()
s = leer(E('desarrollo', 'src.html'))
if '/*ESCENA*/' not in s:
    sys.exit('Este Endeles no tiene los enganches de escena (/*ESCENA*/). Usa una versión que los tenga.')
datos = ''.join('<script>\n' + leer(E('fuente', f)) + '\n</script>\n' for f in ('iching-es.js', 'astro.js', 'planta.js'))
s = s.replace('<!--DATOS-->', datos.rstrip('\n'))
s = s.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
              '<script>window.ENDELES_ESCENA = 1;</script>\n<script src="lib/three.min.js"></script>')
s = s.replace('/*ESCENA*/', leer(os.path.join(raiz, 'escena.js')))
s = s.replace('<title>Endeles</title>', '<title>Endeles Escena</title>').replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
i = s.find('<canvas id="gl">')
cab = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n')
s = cab + s[:i] + '</head>\n<body>\n' + s[i:] + '\n</body>\n</html>\n'
web = os.path.join(raiz, 'web')
os.makedirs(os.path.join(web, 'lib'), exist_ok=True)
open(os.path.join(web, 'escena.html'), 'w', encoding='utf-8').write(s)
for f in ('three.min.js', 'three-LICENSE.txt'):
    if os.path.exists(E('lib', f)):
        shutil.copy(E('lib', f), os.path.join(web, 'lib', f))
print('web/escena.html listo:', len(s), 'bytes (Endeles en', os.path.abspath(a.endeles) + ')')
