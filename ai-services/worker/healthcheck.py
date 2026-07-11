"""Minimal HTTP health endpoint run alongside the Celery worker.

Render's free tier only sleeps/monitors HTTP "Web Services" — a bare Celery
process has no HTTP port to satisfy that. This tiny stdlib-only server makes
the worker eligible for Render's free plan without pulling in a web
framework. Harmless everywhere else (local Docker Compose just opens an
unused port).
"""
import os
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, *args):
        pass  # keep worker logs focused on Celery output


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
