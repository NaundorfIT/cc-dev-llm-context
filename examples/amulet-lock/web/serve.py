#!/usr/bin/env python3
"""Static server + API proxy for the amulet-lock example UI.

Serves the web/ directory and proxies LocalNet APIs on the same origin so the
browser needs no CORS setup:

  /proxy/json/...       -> participant JSON Ledger API   (default :2975, app-user)
  /proxy/validator/...  -> validator API                 (default :2903)
  /proxy/scan/...       -> scan / amulet registry API    (default :4000, Host: scan.localhost)
  /token                -> mints the LocalNet unsafe JWT for LEDGER_USER

Configuration via env vars: PORT, JSON_API, VALIDATOR_API, SCAN_API,
SCAN_HOST, LEDGER_USER, JWT_SECRET, JWT_AUDIENCE.
"""

import base64
import hashlib
import hmac
import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8800"))
JSON_API = os.environ.get("JSON_API", "http://localhost:2975")
VALIDATOR_API = os.environ.get("VALIDATOR_API", "http://localhost:2903")
SCAN_API = os.environ.get("SCAN_API", "http://localhost:4000")
SCAN_HOST = os.environ.get("SCAN_HOST", "scan.localhost")
LEDGER_USER = os.environ.get("LEDGER_USER", "app-user")
JWT_SECRET = os.environ.get("JWT_SECRET", "unsafe")
JWT_AUDIENCE = os.environ.get("JWT_AUDIENCE", "https://canton.network.global")

WEB_ROOT = os.path.dirname(os.path.abspath(__file__))

ROUTES = {
    "/proxy/json/": (JSON_API, None),
    "/proxy/validator/": (VALIDATOR_API, None),
    "/proxy/scan/": (SCAN_API, SCAN_HOST),
}


def mint_unsafe_jwt(subject: str) -> str:
    def b64(raw: bytes) -> str:
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = b64(json.dumps({"sub": subject, "aud": JWT_AUDIENCE}).encode())
    signature = b64(
        hmac.new(JWT_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    )
    return f"{header}.{payload}.{signature}"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_ROOT, **kwargs)

    def log_message(self, fmt, *args):
        pass  # keep the console quiet

    def _send_json(self, status: int, body: dict) -> None:
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _proxy(self) -> bool:
        for prefix, (upstream, host_header) in ROUTES.items():
            if self.path.startswith(prefix):
                target = upstream + "/" + self.path[len(prefix):]
                length = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(length) if length else None
                request = urllib.request.Request(target, data=body, method=self.command)
                for name in ("Authorization", "Content-Type", "Accept"):
                    if self.headers.get(name):
                        request.add_header(name, self.headers[name])
                if host_header:
                    request.add_header("Host", host_header)
                try:
                    with urllib.request.urlopen(request, timeout=120) as response:
                        payload = response.read()
                        self.send_response(response.status)
                        self.send_header(
                            "Content-Type",
                            response.headers.get("Content-Type", "application/json"),
                        )
                        self.send_header("Content-Length", str(len(payload)))
                        self.end_headers()
                        self.wfile.write(payload)
                except urllib.error.HTTPError as error:
                    payload = error.read()
                    self.send_response(error.code)
                    self.send_header(
                        "Content-Type", error.headers.get("Content-Type", "application/json")
                    )
                    self.send_header("Content-Length", str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                except OSError as error:
                    self._send_json(502, {"error": f"upstream unreachable: {error}"})
                return True
        return False

    def do_GET(self):
        if self.path == "/token":
            self._send_json(200, {"token": mint_unsafe_jwt(LEDGER_USER), "user": LEDGER_USER})
            return
        if self._proxy():
            return
        super().do_GET()

    def do_POST(self):
        if not self._proxy():
            self._send_json(404, {"error": "unknown path"})


if __name__ == "__main__":
    print(f"amulet-lock UI on http://localhost:{PORT}")
    print(f"  JSON API      -> {JSON_API}")
    print(f"  Validator API -> {VALIDATOR_API}")
    print(f"  Scan/Registry -> {SCAN_API} (Host: {SCAN_HOST})")
    print(f"  Ledger user   -> {LEDGER_USER}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
