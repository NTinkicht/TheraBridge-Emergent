"""Emergent workspace shim (ADR-0005). Not part of the TheraBridge application.

The read-only Emergent supervisor always launches `uvicorn server:app` on :8001. This ASGI app starts the
real NestJS/Fastify API (scripts/workspace/start-api.sh) and forwards every request to it unchanged.
Outside Emergent (Docker Compose, CI, local) NestJS binds :8001 directly and this file is not used.
"""
import os
import signal
import subprocess
from pathlib import Path

import httpx
from dotenv import dotenv_values

REPO = Path(__file__).resolve().parent.parent
API_PORT = dotenv_values(REPO / "apps/api/.env")["PORT"]
UPSTREAM = f"http://127.0.0.1:{API_PORT}"
STATE = REPO / ".workspace"
PIDFILE = STATE / "api.pgid"
HOP_BY_HOP = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers",
              "transfer-encoding", "upgrade", "host", "content-length"}

_proc = None
_client = None


def _kill_stale():
    if PIDFILE.exists():
        try:
            os.killpg(int(PIDFILE.read_text()), signal.SIGTERM)
        except (ProcessLookupError, ValueError, PermissionError):
            pass
        PIDFILE.unlink(missing_ok=True)


async def _startup():
    global _proc, _client
    STATE.mkdir(exist_ok=True)
    _kill_stale()
    log = open(STATE / "api.log", "ab")
    _proc = subprocess.Popen(["bash", str(REPO / "scripts/workspace/start-api.sh")], cwd=REPO,
                             stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    PIDFILE.write_text(str(_proc.pid))
    _client = httpx.AsyncClient(base_url=UPSTREAM, timeout=60.0)


async def _shutdown():
    if _client:
        await _client.aclose()
    _kill_stale()


async def _send_json(send, status, body):
    await send({"type": "http.response.start", "status": status,
                "headers": [(b"content-type", b"application/json")]})
    await send({"type": "http.response.body", "body": body})


async def app(scope, receive, send):
    if scope["type"] == "lifespan":
        while True:
            msg = await receive()
            if msg["type"] == "lifespan.startup":
                await _startup()
                await send({"type": "lifespan.startup.complete"})
            elif msg["type"] == "lifespan.shutdown":
                await _shutdown()
                await send({"type": "lifespan.shutdown.complete"})
                return
    if scope["type"] != "http":
        return

    body, more = b"", True
    while more:
        msg = await receive()
        body += msg.get("body", b"")
        more = msg.get("more_body", False)

    incoming = [(k.decode("latin-1"), v.decode("latin-1")) for k, v in scope["headers"]]
    names = {k.lower() for k, _ in incoming}
    headers = [(k, v) for k, v in incoming if k.lower() not in HOP_BY_HOP]
    host = next((v for k, v in incoming if k.lower() == "host"), "")
    if "x-forwarded-host" not in names:
        headers.append(("x-forwarded-host", host))
    if "x-forwarded-proto" not in names:
        headers.append(("x-forwarded-proto", scope.get("scheme", "http")))
    if "x-forwarded-for" not in names and scope.get("client"):
        headers.append(("x-forwarded-for", scope["client"][0]))

    path = scope.get("raw_path") or scope["path"].encode()
    url = path.decode("latin-1") + (("?" + scope["query_string"].decode("latin-1")) if scope["query_string"] else "")
    try:
        resp = await _client.send(_client.build_request(scope["method"], url, headers=headers, content=body), stream=True)
    except httpx.TransportError:
        await _send_json(send, 503, b'{"statusCode":503,"error":"Service Unavailable","message":"TheraBridge API (NestJS) is starting or not reachable"}')
        return
    try:
        out_headers = [(k, v) for k, v in resp.headers.raw if k.decode("latin-1").lower() not in HOP_BY_HOP]
        await send({"type": "http.response.start", "status": resp.status_code, "headers": out_headers})
        async for chunk in resp.aiter_raw():
            await send({"type": "http.response.body", "body": chunk, "more_body": True})
        await send({"type": "http.response.body", "body": b""})
    finally:
        await resp.aclose()
