"""Ansaro Panel: приватная панель Telegram с API для Claude.

Веб-интерфейс закрыт паролем (PANEL_PASSWORD).
API закрыт ключом (PANEL_API_KEY), заголовок: Authorization: Bearer <ключ>.
"""
import asyncio
import hmac
import html
import os
import secrets
import time
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Form, Header, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from starlette.middleware.sessions import SessionMiddleware
from telethon import TelegramClient
from telethon.errors import (
    PhoneCodeExpiredError,
    PhoneCodeInvalidError,
    PasswordHashInvalidError,
    SessionPasswordNeededError,
)
from telethon.sessions import StringSession
from telethon.tl.types import Channel, Chat, User

# ---------------------------------------------------------------- настройки
PANEL_PASSWORD = os.environ.get("PANEL_PASSWORD", "")
PANEL_API_KEY = os.environ.get("PANEL_API_KEY", "")
SESSION_SECRET = os.environ.get("SESSION_SECRET") or secrets.token_urlsafe(32)
TG_API_ID = int(os.environ.get("TG_API_ID", "0") or 0)
TG_API_HASH = os.environ.get("TG_API_HASH", "")
TG_SESSION = os.environ.get("TG_SESSION", "")
READONLY = os.environ.get("PANEL_READONLY", "") == "1"
HTTPS_ONLY = os.environ.get("PANEL_HTTPS_ONLY", "1") == "1"

if len(PANEL_PASSWORD) < 10 or len(PANEL_API_KEY) < 24:
    raise SystemExit(
        "Задайте PANEL_PASSWORD (от 10 символов) и PANEL_API_KEY (от 24 символов)."
    )

# ---------------------------------------------------------------- состояние
tg: TelegramClient | None = None
tg_lock = asyncio.Lock()
login_state: dict = {}          # phone, phone_code_hash, need_password
new_session_string: str = ""    # показывается один раз после входа
sent_log: deque = deque(maxlen=200)
failed_logins: dict[str, list[float]] = {}


def tg_configured() -> bool:
    return bool(TG_API_ID and TG_API_HASH)


async def tg_authorized() -> bool:
    return tg is not None and tg.is_connected() and await tg.is_user_authorized()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global tg
    if tg_configured():
        tg = TelegramClient(
            StringSession(TG_SESSION), TG_API_ID, TG_API_HASH,
            device_model="Ansaro Panel", app_version="1.0",
        )
        try:
            await tg.connect()
            if await tg.is_user_authorized():
                await tg.get_dialogs(limit=200)  # прогрев кэша собеседников
        except Exception as e:  # панель должна открыться даже без Telegram
            print("Telegram connect error:", e)
    yield
    if tg is not None:
        await tg.disconnect()


app = FastAPI(title="Ansaro Panel", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(
    SessionMiddleware, secret_key=SESSION_SECRET, https_only=HTTPS_ONLY,
    same_site="strict", max_age=7 * 24 * 3600,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["X-Robots-Tag"] = "noindex, nofollow"
    resp.headers["Cache-Control"] = "no-store"
    return resp


# ---------------------------------------------------------------- помощники
def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() or (request.client.host if request.client else "?")


def too_many_attempts(ip: str) -> bool:
    now = time.time()
    tries = [t for t in failed_logins.get(ip, []) if now - t < 900]
    failed_logins[ip] = tries
    return len(tries) >= 5


def entity_kind(e) -> str:
    if isinstance(e, User):
        return "bot" if e.bot else "user"
    if isinstance(e, Chat):
        return "group"
    if isinstance(e, Channel):
        return "group" if e.megagroup else "channel"
    return "other"


def display_name(e) -> str:
    if e is None:
        return ""
    if isinstance(e, User):
        name = " ".join(x for x in [e.first_name, e.last_name] if x)
        return name or (e.username or str(e.id))
    return getattr(e, "title", "") or str(getattr(e, "id", ""))


def iso(dt) -> str | None:
    return dt.astimezone(timezone.utc).isoformat() if dt else None


def message_json(m) -> dict:
    media = None
    if m.media is not None:
        media = type(m.media).__name__.replace("MessageMedia", "").lower()
    return {
        "id": m.id,
        "date": iso(m.date),
        "out": bool(m.out),
        "sender_id": m.sender_id,
        "sender": display_name(m.sender) if m.sender else None,
        "text": m.message or "",
        "media": media,
        "reply_to": m.reply_to_msg_id,
    }


def dialog_json(d) -> dict:
    e = d.entity
    last = d.message
    return {
        "id": d.id,
        "name": display_name(e),
        "username": getattr(e, "username", None),
        "kind": entity_kind(e),
        "unread": d.unread_count,
        "unread_mentions": getattr(d, "unread_mentions_count", 0),
        "muted": bool(getattr(d.dialog.notify_settings, "mute_until", None)),
        "pinned": d.pinned,
        "archived": d.archived,
        "last": message_json(last) if last else None,
    }


async def need_tg() -> TelegramClient:
    if not tg_configured():
        raise HTTPException(503, "Telegram не настроен: нет TG_API_ID / TG_API_HASH")
    if not await tg_authorized():
        raise HTTPException(503, "Telegram не подключён: войдите в аккаунт на странице панели")
    return tg


async def resolve_peer(client: TelegramClient, peer: str):
    p = peer.strip()
    try:
        if p.lstrip("-").isdigit():
            try:
                return await client.get_entity(int(p))
            except ValueError:
                await client.get_dialogs(limit=None)  # пополнить кэш
                return await client.get_entity(int(p))
        return await client.get_entity(p)
    except (ValueError, TypeError):
        raise HTTPException(404, f"Чат не найден: {peer}")


# ---------------------------------------------------------------- API для Claude
def require_api_key(authorization: str = Header(""), x_api_key: str = Header("")):
    key = x_api_key or (authorization[7:] if authorization.lower().startswith("bearer ") else "")
    if not key or not hmac.compare_digest(key.encode(), PANEL_API_KEY.encode()):
        raise HTTPException(401, "Неверный API-ключ")


api = Depends(require_api_key)


@app.get("/api/status", dependencies=[api])
async def api_status():
    me = None
    if await tg_authorized():
        u = await tg.get_me()
        me = {"id": u.id, "name": display_name(u), "username": u.username}
    return {"telegram": {"configured": tg_configured(), "authorized": me is not None, "me": me},
            "readonly": READONLY, "time": iso(datetime.now(timezone.utc))}


@app.get("/api/dialogs", dependencies=[api])
async def api_dialogs(limit: int = 50, unread_only: bool = False, include_channels: bool = False,
                      archived: bool = False):
    client = await need_tg()
    limit = max(1, min(limit, 300))
    out = []
    async for d in client.iter_dialogs(limit=limit, archived=archived):
        j = dialog_json(d)
        if j["kind"] == "channel" and not include_channels:
            continue
        if unread_only and not (j["unread"] or j["unread_mentions"]):
            continue
        out.append(j)
    return {"dialogs": out}


@app.get("/api/unread", dependencies=[api])
async def api_unread(include_groups: bool = True):
    """Личные чаты с непрочитанными + группы, где есть упоминания или ответы мне."""
    client = await need_tg()
    out = []
    async for d in client.iter_dialogs(limit=300):
        j = dialog_json(d)
        if j["kind"] == "user" and j["unread"]:
            out.append(j)
        elif include_groups and j["kind"] == "group" and j["unread_mentions"]:
            out.append(j)
    return {"unread": out}


@app.get("/api/messages/{peer}", dependencies=[api])
async def api_messages(peer: str, limit: int = 30, before_id: int = 0, mark_read: bool = False):
    client = await need_tg()
    entity = await resolve_peer(client, peer)
    limit = max(1, min(limit, 200))
    msgs = [m async for m in client.iter_messages(entity, limit=limit, offset_id=before_id)]
    if mark_read and msgs and not READONLY:
        await client.send_read_acknowledge(entity, max_id=msgs[0].id)
    return {"peer": {"id": entity.id, "name": display_name(entity), "kind": entity_kind(entity),
                     "username": getattr(entity, "username", None)},
            "messages": [message_json(m) for m in reversed(msgs)]}


class SendBody(BaseModel):
    peer: str
    text: str = Field(min_length=1, max_length=4096)
    reply_to: int | None = None


@app.post("/api/send", dependencies=[api])
async def api_send(body: SendBody):
    if READONLY:
        raise HTTPException(403, "Панель в режиме только чтения (PANEL_READONLY=1)")
    client = await need_tg()
    entity = await resolve_peer(client, body.peer)
    async with tg_lock:
        m = await client.send_message(entity, body.text, reply_to=body.reply_to)
        await asyncio.sleep(1.0)  # не частить
    sent_log.appendleft({"time": iso(m.date), "to": display_name(entity), "peer": entity.id,
                         "text": body.text, "by": "Claude (API)"})
    return {"ok": True, "message": message_json(m)}


class ReadBody(BaseModel):
    peer: str


@app.post("/api/read", dependencies=[api])
async def api_read(body: ReadBody):
    if READONLY:
        raise HTTPException(403, "Только чтение")
    client = await need_tg()
    entity = await resolve_peer(client, body.peer)
    await client.send_read_acknowledge(entity)
    return {"ok": True}


@app.get("/api/sent_log", dependencies=[api])
async def api_sent_log():
    return {"sent": list(sent_log)}


@app.get("/healthz")
async def healthz():
    return {"ok": True}


# ---------------------------------------------------------------- веб-интерфейс
CSS = """
:root{--bg:#f6f4f1;--card:#fff;--ink:#1d1b19;--mute:#6f6a64;--line:#e4dfd8;--acc:#c2185b;--out:#fde7ef}
@media (prefers-color-scheme:dark){:root{--bg:#141312;--card:#1e1c1b;--ink:#ece8e3;--mute:#9a948d;--line:#33302d;--acc:#f06292;--out:#3a2430}}
*{box-sizing:border-box}body{margin:0;font:15px/1.45 system-ui,sans-serif;background:var(--bg);color:var(--ink)}
main{max-width:860px;margin:0 auto;padding:16px}a{color:var(--acc);text-decoration:none}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:12px 0}
h1{font-size:20px;margin:8px 0}h2{font-size:16px;margin:0 0 8px}.mute{color:var(--mute);font-size:13px}
input,textarea,button{font:inherit;padding:9px 11px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink)}
textarea{width:100%;min-height:70px}button{background:var(--acc);color:#fff;border:0;cursor:pointer}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.grow{flex:1}
.dlg{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid var(--line)}
.badge{background:var(--acc);color:#fff;border-radius:99px;padding:0 8px;font-size:12px}
.msg{padding:8px 10px;border-radius:10px;margin:6px 0;max-width:85%;white-space:pre-wrap;word-wrap:break-word;background:var(--bg)}
.msg.out{background:var(--out);margin-left:auto}.err{color:#d32f2f}
code{word-break:break-all;font-size:12px}
"""


def page(title: str, body: str) -> HTMLResponse:
    return HTMLResponse(
        f"<!doctype html><html lang=ru><head><meta charset=utf-8>"
        f"<meta name=viewport content='width=device-width,initial-scale=1'>"
        f"<meta name=robots content=noindex><title>{html.escape(title)}</title>"
        f"<style>{CSS}</style></head><body><main>{body}</main></body></html>"
    )


def logged_in(request: Request) -> bool:
    return request.session.get("auth") is True


def csrf(request: Request) -> str:
    tok = request.session.get("csrf")
    if not tok:
        tok = secrets.token_urlsafe(24)
        request.session["csrf"] = tok
    return tok


def check_csrf(request: Request, token: str):
    if not hmac.compare_digest(token or "", request.session.get("csrf", "")):
        raise HTTPException(400, "Устаревшая форма, обновите страницу")


def hidden(request: Request) -> str:
    return f"<input type=hidden name=csrf value='{csrf(request)}'>"


def esc(s) -> str:
    return html.escape(str(s or ""))


@app.get("/login")
async def login_page(request: Request, err: str = ""):
    e = "<p class=err>Неверный пароль или слишком много попыток.</p>" if err else ""
    return page("Вход", f"""<div class=card><h1>Ansaro Panel</h1>{e}
      <form method=post action=/login class=row>{hidden(request)}
      <input class=grow type=password name=password placeholder='Пароль' autofocus required>
      <button>Войти</button></form></div>""")


@app.post("/login")
async def login(request: Request, password: str = Form(...), csrf_: str = Form("", alias="csrf")):
    check_csrf(request, csrf_)
    ip = client_ip(request)
    if too_many_attempts(ip) or not hmac.compare_digest(password.encode(), PANEL_PASSWORD.encode()):
        failed_logins.setdefault(ip, []).append(time.time())
        await asyncio.sleep(1.5)
        return RedirectResponse("/login?err=1", 303)
    request.session.clear()
    request.session["auth"] = True
    return RedirectResponse("/", 303)


@app.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", 303)


def guard(request: Request):
    if not logged_in(request):
        raise HTTPException(307, headers={"Location": "/login"})


@app.exception_handler(HTTPException)
async def http_exc(request: Request, exc: HTTPException):
    if exc.status_code == 307:
        return RedirectResponse(exc.headers["Location"], 303)
    if request.url.path.startswith("/api/"):
        return JSONResponse({"error": exc.detail}, exc.status_code)
    return page("Ошибка", f"<div class=card><p class=err>{esc(exc.detail)}</p><a href=/>На главную</a></div>")


def tg_connect_block(request: Request) -> str:
    if not tg_configured():
        return ("<div class=card><h2>Telegram</h2><p>Не заданы TG_API_ID и TG_API_HASH в настройках "
                "хостинга. Их выдают на my.telegram.org → API development tools.</p></div>")
    if login_state.get("need_password"):
        form = f"""<form method=post action=/tg/password class=row>{hidden(request)}
          <input class=grow type=password name=password placeholder='Облачный пароль (2FA)' required>
          <button>Подтвердить</button></form>"""
    elif login_state.get("phone_code_hash"):
        form = f"""<p class=mute>Код пришёл в Telegram на {esc(login_state['phone'])}.</p>
          <form method=post action=/tg/code class=row>{hidden(request)}
          <input class=grow name=code placeholder='Код из Telegram' inputmode=numeric required>
          <button>Войти</button></form>"""
    else:
        form = f"""<form method=post action=/tg/phone class=row>{hidden(request)}
          <input class=grow name=phone placeholder='+7 900 000 00 00' required>
          <button>Получить код</button></form>"""
    return f"<div class=card><h2>Подключить Telegram</h2>{form}</div>"


@app.get("/", dependencies=[Depends(guard)])
async def home(request: Request):
    global new_session_string
    parts = ["<div class=row><h1 class=grow>Ansaro Panel</h1>"
             f"<form method=post action=/logout>{hidden(request)}<button>Выйти</button></form></div>"]
    if new_session_string:
        parts.append(f"""<div class=card><h2>Telegram подключён. Сохраните сессию</h2>
          <p>Скопируйте строку ниже в переменную <b>TG_SESSION</b> в настройках хостинга, иначе после
          перезапуска придётся входить заново. Строка показывается один раз, никому её не отправляйте.</p>
          <code>{esc(new_session_string)}</code></div>""")
        new_session_string = ""
    if await tg_authorized():
        me = await tg.get_me()
        parts.append(f"<div class=card><h2>Telegram: {esc(display_name(me))} "
                     f"{'@' + esc(me.username) if me.username else ''}</h2>")
        async for d in tg.iter_dialogs(limit=40):
            j = dialog_json(d)
            if j["kind"] == "channel":
                continue
            badge = f"<span class=badge>{j['unread']}</span>" if j["unread"] else ""
            last = esc((j["last"] or {}).get("text", ""))[:90]
            parts.append(f"<div class=dlg><div><a href='/chat/{j['id']}'>{esc(j['name'])}</a>"
                         f"<div class=mute>{last}</div></div><div>{badge}</div></div>")
        parts.append("</div>")
    else:
        parts.append(tg_connect_block(request))
    if sent_log:
        rows = "".join(f"<div class=dlg><div><b>{esc(s['to'])}</b><div>{esc(s['text'])}</div></div>"
                       f"<div class=mute>{esc(s['by'])}<br>{esc(s['time'][:16].replace('T', ' '))}</div></div>"
                       for s in list(sent_log)[:30])
        parts.append(f"<div class=card><h2>Отправлено через панель</h2>{rows}</div>")
    parts.append(f"<p class=mute>Режим: {'только чтение' if READONLY else 'чтение и ответы'}.</p>")
    return page("Ansaro Panel", "".join(parts))


@app.post("/tg/phone", dependencies=[Depends(guard)])
async def tg_phone(request: Request, phone: str = Form(...), csrf_: str = Form("", alias="csrf")):
    check_csrf(request, csrf_)
    if tg is None:
        raise HTTPException(503, "Telegram не настроен")
    if not tg.is_connected():
        await tg.connect()
    phone = "".join(c for c in phone if c.isdigit() or c == "+")
    sent = await tg.send_code_request(phone)
    login_state.clear()
    login_state.update(phone=phone, phone_code_hash=sent.phone_code_hash)
    return RedirectResponse("/", 303)


async def finish_login():
    global new_session_string
    login_state.clear()
    new_session_string = tg.session.save()
    await tg.get_dialogs(limit=200)


@app.post("/tg/code", dependencies=[Depends(guard)])
async def tg_code(request: Request, code: str = Form(...), csrf_: str = Form("", alias="csrf")):
    check_csrf(request, csrf_)
    try:
        await tg.sign_in(login_state.get("phone"), code.strip(),
                         phone_code_hash=login_state.get("phone_code_hash"))
    except SessionPasswordNeededError:
        login_state["need_password"] = True
        return RedirectResponse("/", 303)
    except (PhoneCodeInvalidError, PhoneCodeExpiredError):
        login_state.clear()
        raise HTTPException(400, "Код неверный или устарел. Запросите новый.")
    await finish_login()
    return RedirectResponse("/", 303)


@app.post("/tg/password", dependencies=[Depends(guard)])
async def tg_password(request: Request, password: str = Form(...), csrf_: str = Form("", alias="csrf")):
    check_csrf(request, csrf_)
    try:
        await tg.sign_in(password=password)
    except PasswordHashInvalidError:
        raise HTTPException(400, "Неверный облачный пароль")
    await finish_login()
    return RedirectResponse("/", 303)


@app.get("/chat/{peer}", dependencies=[Depends(guard)])
async def chat(request: Request, peer: str):
    client = await need_tg()
    entity = await resolve_peer(client, peer)
    msgs = [m async for m in client.iter_messages(entity, limit=50)]
    items = "".join(
        f"<div class='msg{' out' if m.out else ''}'>{esc(m.message) or '<i>[вложение]</i>'}"
        f"<div class=mute>{esc(iso(m.date)[:16].replace('T', ' '))} UTC</div></div>"
        for m in reversed(msgs))
    form = "" if READONLY else f"""<form method=post action='/chat/{esc(peer)}/send'>{hidden(request)}
        <textarea name=text required></textarea><p><button>Отправить</button></p></form>"""
    return page(display_name(entity), f"""<p><a href=/>← Назад</a></p>
      <div class=card><h2>{esc(display_name(entity))}</h2>{items}</div><div class=card>{form}</div>""")


@app.post("/chat/{peer}/send", dependencies=[Depends(guard)])
async def chat_send(request: Request, peer: str, text: str = Form(...), csrf_: str = Form("", alias="csrf")):
    check_csrf(request, csrf_)
    if READONLY:
        raise HTTPException(403, "Только чтение")
    client = await need_tg()
    entity = await resolve_peer(client, peer)
    m = await client.send_message(entity, text)
    sent_log.appendleft({"time": iso(m.date), "to": display_name(entity), "peer": entity.id,
                         "text": text, "by": "Давид (панель)"})
    return RedirectResponse(f"/chat/{peer}", 303)
