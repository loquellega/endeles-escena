#!/usr/bin/env python3
"""
Endeles Escena — el bosque de Endeles para teatro, como programa de escritorio.

Cada persona que se pone el casco EEG es un bosque distinto. Este programa:
  · recibe OSC directo (puerto 9205): los datos del casco que manda Alquimia EEG OSC (/eeg/…)
    y los cues de Pixera, Isadora o QLab (/endeles/go, /endeles/cue 3…)
  · sirve el bosque (web/escena.html) en http://127.0.0.1:9207 y le pasa el OSC por un socket local (9208)
  · abre el bosque a pantalla completa en el monitor que elijas

Uso:
  EndelesEscena                     pantalla completa en el monitor principal
  EndelesEscena --pantalla 2        en el segundo monitor
  EndelesEscena --ventana           en una ventana (para preparar cámaras y cues)
  EndelesEscena --sin-ventana       solo el servidor: para el recurso HTML de Pixera o un navegador
  EndelesEscena --limpia            sin interfaz (H la muestra)

En Alquimia EEG OSC agrega el destino 127.0.0.1:9205 (Salida OSC). Los cues se mandan al mismo puerto.

Diseño, investigación y desarrollo: Héctor Cruz Juárez — https://hectorcruz.com.mx
Colección Alchemy of Meaning (Alquimia del Significado). · GPL-3.0-or-later
"""
import argparse
import asyncio
import http.server
import json
import sys
import threading
import time
from functools import partial
from pathlib import Path

VERSION = "0.3"
CONGELADO = getattr(sys, "frozen", False)


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def carpeta_programa() -> Path:
    """Junto al .exe (o al script): ahí puede ir un montaje.json propio."""
    return Path(sys.executable).parent if CONGELADO else Path(__file__).parent


def carpeta_web() -> Path:
    return Path(getattr(sys, "_MEIPASS", Path(__file__).parent)) / "web"


def carpeta_datos() -> Path:
    """Donde la ventana guarda su memoria (cámaras, cues y firmas del navegador interno)."""
    import os
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA", Path.home()))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    d = base / "EndelesEscena"
    d.mkdir(parents=True, exist_ok=True)
    return d


def es_evento(addr):
    return addr.endswith(("/blink", "/wink")) or addr == "/eeg/marca" or addr.startswith("/endeles/")


# ---------------------------------------------------------------------------
# OSC → bosque: el mismo formato que el relevo de Alquimia EEG OSC ({seq, t, d, ev})
# ---------------------------------------------------------------------------
class Relevo:
    def __init__(self, hz=30):
        self.hz = hz
        self.clientes = set()
        self.estado = {}
        self.d = {}
        self.ev = []
        self.seq = 0
        self.t0 = time.monotonic()
        self.recibidos = 0
        self.ultimo = 0.0

    def osc(self, addr, *args):
        self.recibidos += 1
        self.ultimo = time.monotonic()
        if addr == "/eeg/frame" and args:
            self.seq = int(args[0])
        if addr.endswith("/raw"):
            return
        if es_evento(addr):
            self.ev.append([addr, list(args)])
            if addr.startswith("/endeles/"):
                log("cue", addr, *args)
                self.enviar()            # los cues no esperan al siguiente cuadro
        else:
            self.d[addr] = args[0] if len(args) == 1 else list(args)

    def enviar(self):
        if not self.d and not self.ev:
            return
        msg = {"seq": self.seq, "t": round(time.monotonic() - self.t0, 4), "d": self.d, "ev": self.ev}
        self.estado.update(self.d)
        self.d, self.ev = {}, []
        if self.clientes:
            import websockets
            websockets.broadcast(self.clientes, json.dumps(msg, ensure_ascii=False))

    async def bucle(self):
        while True:
            self.enviar()
            await asyncio.sleep(1.0 / self.hz)

    async def cliente(self, ws):
        self.clientes.add(ws)
        log("bosque conectado")
        try:
            await ws.send(json.dumps({"seq": self.seq, "t": 0, "d": self.estado, "ev": [], "completo": True}))
            await ws.wait_closed()
        finally:
            self.clientes.discard(ws)


async def servidores(args, relevo, listo):
    import websockets
    from pythonosc.dispatcher import Dispatcher
    from pythonosc.osc_server import AsyncIOOSCUDPServer
    disp = Dispatcher()
    disp.set_default_handler(relevo.osc)
    host = "0.0.0.0" if args.red else "127.0.0.1"
    try:
        srv = AsyncIOOSCUDPServer(("0.0.0.0", args.osc), disp, asyncio.get_running_loop())
        await srv.create_serve_endpoint()
        await websockets.serve(relevo.cliente, host, args.ws)
    except OSError as e:
        log(f"No pude abrir los puertos (OSC {args.osc}, socket {args.ws}): {e}. ¿Hay otro Endeles Escena abierto?")
        listo.set()
        raise SystemExit(1)
    log(f"Escuchando OSC en el puerto {args.osc} (/eeg/… del casco y /endeles/… de los cues)")
    asyncio.create_task(relevo.bucle())
    listo.set()

    async def estado():
        avisado = None
        while True:
            vivo = time.monotonic() - relevo.ultimo < 2
            if vivo != avisado:
                log("recibiendo OSC" if vivo else f"sin OSC: en Alquimia EEG OSC agrega el destino 127.0.0.1:{args.osc}")
                avisado = vivo
            await asyncio.sleep(1)
    asyncio.create_task(estado())
    await asyncio.Event().wait()


class Pagina(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # un montaje.json junto al programa manda sobre el que viene dentro
        if self.path.split("?")[0] == "/montaje.json":
            propio = carpeta_programa() / "montaje.json"
            if propio.exists():
                cuerpo = propio.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(cuerpo)))
                self.end_headers()
                self.wfile.write(cuerpo)
                return
        return super().do_GET()

    def send_error(self, code, *a, **k):
        if code == 404 and self.path.split("?")[0] in ("/favicon.ico", "/montaje.json"):
            self.send_response(204)      # sin ícono ni montaje propio: no es un error
            self.end_headers()
            return
        return super().send_error(code, *a, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


def servidor_web(args):
    host = "0.0.0.0" if args.red else "127.0.0.1"
    try:
        srv = http.server.ThreadingHTTPServer((host, args.web), partial(Pagina, directory=str(carpeta_web())))
    except OSError as e:
        sys.exit(f"No pude abrir el puerto web {args.web}: {e}")
    threading.Thread(target=srv.serve_forever, daemon=True).start()


def main():
    ap = argparse.ArgumentParser(description="Endeles Escena: el bosque para teatro que escucha al casco EEG")
    ap.add_argument("--osc", type=int, default=9205, help="puerto OSC de entrada: casco y cues (9205)")
    ap.add_argument("--web", type=int, default=9207, help="puerto de la página (9207)")
    ap.add_argument("--ws", type=int, default=9208, help="puerto del socket interno hacia el bosque (9208)")
    ap.add_argument("--pantalla", type=int, default=1, help="monitor donde se abre (1, 2, 3…)")
    ap.add_argument("--ventana", action="store_true", help="en una ventana, no a pantalla completa")
    ap.add_argument("--sin-ventana", action="store_true", help="solo el servidor (Pixera o un navegador)")
    ap.add_argument("--limpia", action="store_true", help="arranca sin interfaz (H la muestra)")
    ap.add_argument("--sin-sonido", action="store_true", help="arranca en silencio")
    ap.add_argument("--simular", action="store_true", help="datos de casco simulados dentro del bosque")
    ap.add_argument("--red", action="store_true", help="aceptar páginas de otras computadoras de la red local")
    ap.add_argument("--calibracion", type=float, default=45, help="segundos para medir la firma de cada persona (45)")
    ap.add_argument("--prueba", type=float, default=0, help=argparse.SUPPRESS)
    args = ap.parse_args()

    log(f"Endeles Escena v{VERSION} · Ctrl+C o cerrar la ventana para salir.")
    if not (carpeta_web() / "escena.html").exists():
        sys.exit("Falta web/escena.html: constrúyelo con  python construir.py --endeles RUTA_A_ENDELES")
    servidor_web(args)
    relevo = Relevo()
    listo = threading.Event()

    def hilo():
        try:
            asyncio.run(servidores(args, relevo, listo))
        except SystemExit:
            pass
    threading.Thread(target=hilo, daemon=True).start()
    listo.wait(10)

    q = [("auto", "1"), ("puente", f"127.0.0.1:{args.ws}"), ("calibracion", str(int(args.calibracion)))]
    if args.limpia:
        q.append(("ui", "0"))
    if args.sin_sonido:
        q.append(("sonido", "0"))
    if args.simular:
        q.append(("sim", "1"))
    url = f"http://127.0.0.1:{args.web}/escena.html?" + "&".join(f"{k}={v}" for k, v in q)
    log("Bosque en", url)

    if args.prueba:
        time.sleep(args.prueba)
        return
    if args.sin_ventana:
        log("Sin ventana: abre esa dirección en Pixera (recurso HTML) o en un navegador.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            log("Detenido.")
        return

    import webview
    pantallas = webview.screens or []
    pantalla = pantallas[min(max(args.pantalla, 1), len(pantallas)) - 1] if pantallas else None
    if pantallas:
        log(f"Pantallas: {len(pantallas)}; abro en la {args.pantalla}")
    webview.create_window("Endeles Escena", url, fullscreen=not args.ventana, screen=pantalla,
                          width=1280, height=720, background_color="#000000")
    webview.start(private_mode=False, storage_path=str(carpeta_datos() / "navegador"))
    log("Ventana cerrada.")


if __name__ == "__main__":
    main()
