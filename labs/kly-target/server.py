#!/usr/bin/env python3
"""
KLY-Target – absichtlich verwundbares TRAININGSZIEL für Kali Level Up.

* Nur auf dem eigenen Gerät betreiben. Standard-Bindung: 127.0.0.1.
* Im Docker-Container bindet es intern an 0.0.0.0; der Startbefehl veröffentlicht
  die Ports ausschließlich auf 127.0.0.1 des Hosts.
* Alle Daten sind synthetisch. Flags werden aus deinem persönlichen Lab-Token
  berechnet (KLY_TOKEN) – dieselbe Formel nutzt die App zum Prüfen.

Start:   KLY_TOKEN=KLY-XXXXXX python3 server.py r1
Räume:   r1 (HTTP-Grundlagen), r2 (Ports & Dienste), r3 (Challenge Dev-Leck)
Stopp:   Strg+C  (bzw. docker stop kly-r1)
Nur Python-Standardbibliothek – läuft auch in Termux.
"""
import base64
import hashlib
import http.server
import os
import re
import socketserver
import sys
import threading
import time

TOKEN = os.environ.get("KLY_TOKEN", "").strip()
BIND = os.environ.get("KLY_BIND", "127.0.0.1")
IN_DOCKER = os.environ.get("KLY_DOCKER") == "1"


def flag(room, name):
    return "KLY{" + hashlib.sha256(f"{TOKEN}:{room}:{name}".encode()).hexdigest()[:16] + "}"


def secret(room, name, n=10):
    return hashlib.sha256(f"{TOKEN}:{room}:{name}".encode()).hexdigest()[:n]


def log(room, msg):
    print(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + f" kly-{room} {msg}", flush=True)


class ThreadingHTTP(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class ThreadingTCP(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


def make_http(room, server_header, routes, auth=None):
    """routes: path -> (status, headers, body) oder callable(handler) -> (status, headers, body)"""

    class H(http.server.BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.0"

        def version_string(self):
            return server_header

        def log_message(self, fmt, *args):  # eigenes, gut lesbares Zugriffslog
            pass

        def _send(self, head_only):
            path = self.path.split("?", 1)[0]
            route = routes.get(path)
            if route is None and not path.endswith("/") and (path + "/") in routes:
                route = (301, {"Location": path + "/"}, "")
            if route is None:
                route = (404, {"Content-Type": "text/html; charset=utf-8"}, "<h1>404 Not Found</h1>\n")
            if callable(route):
                route = route(self)
            status, headers, body = route
            data = body.encode() if isinstance(body, str) else body
            self.send_response(status)
            headers = {"Content-Type": "text/html; charset=utf-8", **headers}
            for k, v in headers.items():
                self.send_header(k, v)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if not head_only:
                self.wfile.write(data)
            log(room, f'{self.client_address[0]} "{self.command} {self.path}" {status} ua="{self.headers.get("User-Agent", "-")}"')

        def do_GET(self):
            self._send(False)

        def do_HEAD(self):
            self._send(True)

        def do_POST(self):
            self._send(False)

    return H


def banner_handler(room, text):
    class B(socketserver.BaseRequestHandler):
        def handle(self):
            log(room, f"{self.client_address[0]} TCP-Verbindung (Banner gesendet)")
            try:
                self.request.sendall(text.encode())
            except OSError:
                pass

    return B


def listing(title, entries):
    items = "".join(f'<li><a href="{e}">{e}</a></li>' for e in entries)
    return f"<!DOCTYPE HTML>\n<html><head><title>Directory listing for {title}</title></head>\n<body><h1>Directory listing for {title}</h1><hr><ul>{items}</ul><hr></body></html>\n"


# ------------------------------------------------------------------ Räume
def room_r1():
    hdr = {"X-KLY-Flag": flag("r1", "header")}
    routes = {
        "/": (200, hdr, "<h1>Lab-Shop (Trainingsziel)</h1>\n<p>Willkommen. Alles hier ist synthetisch.</p>\n"),
        "/robots.txt": (200, {"Content-Type": "text/plain"}, "User-agent: *\nDisallow: /intern/\n"),
        "/intern/": (200, {}, listing("/intern/", ["notiz.txt"])),
        "/intern/notiz.txt": (200, {"Content-Type": "text/plain"}, f"Interne Notiz (synthetisch)\nflag={flag('r1', 'robots')}\n"),
        "/admin": (403, {}, "<h1>403 Forbidden</h1>\n"),
        "/alt": (301, {"Location": "/neu"}, ""),
        "/neu": (200, {"Content-Type": "text/plain"}, f"Neue Seite.\nflag={flag('r1', 'redirect')}\n"),
    }
    return [("http", 10080, make_http("r1", "KLY-httpd/1.4", routes))]


def room_r2():
    web1 = {"/": (200, {}, "<h1>Interner Statusdienst</h1>\n")}
    web2 = {"/": (200, {"Content-Type": "text/plain"}, f"Wartungsseite\nflag={flag('r2', 'web2')}\n")}
    banner = f"KLY-Banner 1.0 Trainingsdienst bereit\nflag={flag('r2', 'banner')}\n"
    return [
        ("http", 10180, make_http("r2", "KLY-httpd/2.0", web1)),
        ("tcp", 10122, banner_handler("r2", banner)),
        # Absichtlich irreführender Server-Header: Banner können lügen.
        ("http", 10188, make_http("r2", "Apache/2.4.58 (Ubuntu)", web2)),
    ]


def room_r3():
    user, pw = "wartung", secret("r3", "pass")

    def admin(h):
        a = h.headers.get("Authorization", "")
        if a.startswith("Basic "):
            try:
                u, _, p = base64.b64decode(a[6:]).decode().partition(":")
            except Exception:
                u, p = "", ""
            if u == user and p == pw:
                log("r3", f"AUTH OK user={u} src={h.client_address[0]}")
                return (200, {"Content-Type": "text/plain"}, f"Adminbereich (synthetisch)\nflag={flag('r3', 'admin')}\n")
            log("r3", f"AUTH FAIL user={u or '-'} src={h.client_address[0]}")
        return (401, {"WWW-Authenticate": 'Basic realm="Wartung"'}, "<h1>401 Unauthorized</h1>\n")

    routes = {
        "/": (200, {}, "<h1>Shop – Dev-Vorschau</h1>\n<p>Nur für interne Tests.</p>\n"),
        "/robots.txt": (200, {"Content-Type": "text/plain"}, "User-agent: *\nDisallow:\n"),
        "/backup/": (200, {}, listing("/backup/", ["config.bak"])),
        "/backup/config.bak": (200, {"Content-Type": "text/plain"},
                               f"# Konfigurationssicherung (SYNTHETISCH)\nadmin_user={user}\nadmin_pass={pw}\nflag={flag('r3', 'user')}\n"),
        "/admin": admin,
    }
    return [("http", 10280, make_http("r3", "SimpleHTTP/0.6 Python/3.12", routes))]


ROOMS = {"r1": room_r1, "r2": room_r2, "r3": room_r3}


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ROOMS:
        print(__doc__)
        sys.exit(2)
    if not re.fullmatch(r"KLY-[0-9A-F]{6}", TOKEN):
        print("FEHLER: KLY_TOKEN fehlt oder ist ungültig. Den Startbefehl aus der App kopieren (enthält deinen Token).")
        sys.exit(2)
    loopback = BIND in ("127.0.0.1", "localhost", "::1")
    if not loopback and not IN_DOCKER:
        print("FEHLER: Außerhalb von Docker nur an 127.0.0.1 binden. Abbruch (Scope-Schutz).")
        sys.exit(2)
    room = sys.argv[1]
    servers = []
    for kind, port, handler in ROOMS[room]():
        srv = (ThreadingHTTP if kind == "http" else ThreadingTCP)((BIND, port), handler)
        servers.append(srv)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        log(room, f"lauscht auf {BIND}:{port} ({kind})")
    log(room, "Trainingsziel bereit. Stopp mit Strg+C bzw. docker stop.")
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        log(room, "beendet")


if __name__ == "__main__":
    main()
