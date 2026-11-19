# Endeles Escena

**v0.3** · El bosque de [Endeles](https://github.com/loquellega/endeles) para teatro. Escucha al casco EEG a través de [Alquimia EEG OSC](https://github.com/loquellega/alquimia-eeg-osc), y **cada persona que se pone el casco es un bosque distinto**.

## Español

### Qué es

Un bosque gris de tinta, niebla y grano HP5. Al ponerse el casco, la persona le imprime su forma y su color:

- **Firma:** «nueva persona» mide 45 s de señal válida. El promedio y la variación de cada banda deciden la semilla del bosque, qué tan abierto es, el relieve, el agua, cuántos animales lo habitan y cuántas hojas tiene. Mientras mide, el bosque sigue gris; al fijar la firma, el color de la persona entra en las hojas (tonos fríos a amarillos: violetas, azules, verdes, amarillos). El cambio de bosque ocurre tras una cortina a negro.
- **Clima vivo:** las bandas y métricas mueven la niebla, el viento, la bruma, las esporas, la luz, la viñeta y el contraste. La atención aviva el color, el estrés hace que los animales callen y cada parpadeo es un destello y un trino. Si la señal deja de ser válida, el clima vuelve solo al reposo.
- **Diez cámaras y cues:** cada cue lleva a una cámara con corte, recorrido (la cámara viaja esquivando troncos) o fundido a negro, con duración, curva, altura del vuelo y clima opcional. GO con la barra espaciadora o por OSC.

### Cómo se usa

1. Descarga el ejecutable de la última versión (Windows `.exe`, Mac `.zip`) y ábrelo en la computadora del show. Se abre a pantalla completa.
2. En **Alquimia EEG OSC** → Ajustes → Salida OSC, agrega el destino **`127.0.0.1:9205`** (además de los que ya uses para Isadora o TouchDesigner).
3. Manda los cues desde Pixera, Isadora o QLab por OSC al **puerto 9205** de esa computadora.
4. Cuando alguien se ponga el casco: cue `/endeles/persona/nueva` (o el botón «nueva persona»). A los 45 s su bosque queda fijo.

| Opción | Qué hace |
|---|---|
| `--pantalla 2` | abre en el segundo monitor |
| `--ventana` | en una ventana, para preparar cámaras y cues |
| `--limpia` | sin interfaz (H la muestra) |
| `--sin-ventana` | solo el servidor: abre `http://127.0.0.1:9207/escena.html?auto=1&puente=127.0.0.1:9208` como recurso HTML en Pixera o en un navegador |
| `--simular` | datos de casco simulados, para ensayar sin el casco |
| `--sin-sonido` | arranca en silencio |
| `--calibracion 30` | segundos para medir la firma (45) |
| `--osc 9205` · `--web 9207` · `--ws 9208` | puertos |
| `--red` | acepta páginas de otras computadoras de la red local |

### Cues por OSC (puerto 9205)

| Dirección | Argumentos | Qué hace |
|---|---|---|
| `/endeles/go` | — | ejecuta el siguiente cue |
| `/endeles/cue` | `i n` | salta y ejecuta el cue n |
| `/endeles/cam` | `i n` | corte directo a la cámara n (1–10) |
| `/endeles/back` | — | regresa al cue anterior |
| `/endeles/persona/nueva` | — | empieza a medir a una persona nueva (el bosque vuelve a gris) |
| `/endeles/persona/fijar` | — | fija la firma con lo medido hasta ahora |
| `/endeles/clima` | `i 1–6` | clima base (calma, niebla, lluvia, nieve, noche, espectral) |
| `/endeles/clima/congelar` | `i 0/1` | congela o libera el clima vivo |
| `/endeles/fade` | `f valor, f segundos` | fundido a negro (1) o desde negro (0) |
| `/endeles/ui` | `i 0/1` | oculta o muestra la interfaz |
| `/endeles/libre` | — | suelta la cámara para caminar |

### Teclas

Espacio o G = GO · B = atrás · `[` `]` = elegir el siguiente cue · 1–0 = corte a cámara · Shift+1–0 = guardar la vista en esa cámara · WASD camina libre · Q/Z sube y baja · H oculta la interfaz.

### Montaje

Cámaras, cues y mapeo se guardan solos en la memoria del programa. Desde el panel «escena» se exportan como `montaje.json`. Si pones un `montaje.json` junto al ejecutable, se usa cuando la memoria está vacía (por ejemplo, en otra computadora).

### Para desarrollar

El bosque vive en el repositorio de Endeles; aquí está el módulo de escena (`escena.js`) y el programa (`endeles_escena.py`).

```
git clone https://github.com/loquellega/endeles     # rama con los enganches de escena
git clone https://github.com/loquellega/endeles-escena
cd endeles-escena
pip install -r requirements.txt
python construir.py --endeles ../endeles            # genera web/escena.html
python endeles_escena.py --ventana --simular
```

GitHub Actions compila los ejecutables de Windows y Mac en cada cambio a `main` y los adjunta a cada versión publicada. El contrato entre las piezas (OSC, formato de sesión, montaje) está en el proyecto *Artefactos prototipos*: «Endeles Escena: contrato OSC + JSON».

## English

Endeles Escena is the Endeles forest for theatre, as a desktop app. It listens to an EEG headset through Alquimia EEG OSC: each person wearing it gets their own forest (a 45 s signature sets its seed, openness, relief, water, wildlife, leaves and color) and their live EEG modulates the weather. Ten cameras and a cue list with GO. Send headset data and cues over OSC to port 9205; the app opens the forest full screen (`--pantalla 2` for another monitor, `--sin-ventana` to serve it to Pixera's HTML resource at `http://127.0.0.1:9207/escena.html?auto=1&puente=127.0.0.1:9208`).

## Licencia / License

GPL-3.0-or-later. Usa three.js (MIT), pywebview (BSD), python-osc (Unlicense) y websockets (BSD).

## Créditos / Credits

Diseño, investigación y desarrollo: Héctor Cruz Juárez — https://hectorcruz.com.mx
Colección Alchemy of Meaning (Alquimia del Significado).
