#!/usr/bin/env python3
"""Personalize the tantsi (dance studio) template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Fills known data (name, city, address, phone, email, socials, hours, map),
removes every channel the lead does not have (elements marked data-ch="..."),
keeps unknowns ([ЦІНА], [ІМ'Я], [РІК], [ФОП], ...) as marked placeholders.
Standard library only. Never touches the template working tree.
"""
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
CITY_ENC = "%D0%86%D0%B2%D0%B0%D0%BD%D0%BE-%D0%A4%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA"
DAYS = [("1", "Понеділок", "Mo"), ("2", "Вівторок", "Tu"), ("3", "Середа", "We"), ("4", "Четвер", "Th"),
        ("5", "П’ятниця", "Fr"), ("6", "Субота", "Sa"), ("0", "Неділя", "Su")]
ALL_CH = ["tel", "sms", "viber", "telegram", "whatsapp", "instagram", "facebook", "email"]


def esc(s):
    return html.escape(s, quote=True)


def typo_name(name):
    n = name.strip()
    while n.count('"') >= 2:
        n = n.replace('"', "«", 1).replace('"', "»", 1)
    return n.replace('"', "")


def sub1(pattern, repl, s, flags=re.S):
    new, n = re.subn(pattern, lambda m: repl, s, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f"pattern not found: {pattern[:70]}")
    return new


def schema_hours(hours):
    out, run = [], []
    for key, _, code in DAYS:
        v = hours.get(key)
        val = f"{v[0]}-{v[1]}" if v else None
        if run and run[-1][1] == val:
            run.append((code, val))
            continue
        if run and run[0][1]:
            out.append(run)
        run = [(code, val)]
    if run and run[0][1]:
        out.append(run)
    return [(r[0][0] if len(r) == 1 else f"{r[0][0]}-{r[-1][0]}") + f" {r[0][1]}" for r in out]


def main():
    lead_path, outdir = sys.argv[1], sys.argv[2]
    L = json.load(open(lead_path, encoding="utf-8"))
    name = typo_name(L["name"])
    city, city_loc = L.get("city"), L.get("city_loc") or L.get("city")
    address = L.get("address")
    maps_query = L.get("maps_query") or ", ".join(x for x in (address, city) if x) or "Івано-Франківськ"
    phone, e164 = L.get("phone"), L.get("phone_e164")
    if not phone or not e164:
        phone = e164 = None
    email, ig, ig_h, fb = L.get("email"), L.get("instagram"), L.get("instagram_handle"), L.get("facebook")
    if ig and not ig_h:
        ig_h = ig.rstrip("/").rsplit("/", 1)[-1]
    ig_h = (ig_h or "").lstrip("@") or None
    fb_page = fb.rstrip("/").rsplit("/", 1)[-1] if fb else None
    hours, hours_text = L.get("hours"), L.get("hours_text")
    if hours and not any(hours.get(k) for k, _, _ in DAYS):
        hours = None

    have = {"tel": bool(phone), "sms": bool(phone), "instagram": bool(ig), "facebook": bool(fb),
            "email": bool(email), "viber": False, "telegram": False, "whatsapp": False}

    # ---- copy site files ----
    if os.path.exists(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    for item in ["index.html", "robots.txt", "css", "js", "fonts", "img"]:
        src, dst = os.path.join(ROOT, item), os.path.join(outdir, item)
        if os.path.isdir(src):
            shutil.copytree(src, dst, ignore=shutil.ignore_patterns("photos", "*.zip", "node_modules"))
        else:
            shutil.copy2(src, dst)

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # ---- JSON-LD ----
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    ld["name"] = name
    if city_loc:
        ld["description"] = f"Танцювальна студія у {city_loc}: хіп-хоп, контемп, pole dance, латина та дитячі групи."
    if phone: ld["telephone"] = phone
    else: ld.pop("telephone", None)
    if email: ld["email"] = email
    else: ld.pop("email", None)
    ld.pop("foundingDate", None)
    ld.pop("priceRange", None)
    if address: ld["address"]["streetAddress"] = address
    else: ld["address"].pop("streetAddress", None)
    if city: ld["address"]["addressLocality"] = city; ld["areaServed"] = city
    if hours: ld["openingHours"] = schema_hours(hours)
    else: ld.pop("openingHours", None)
    same = [u for u in (ig, fb) if u]
    if same: ld["sameAs"] = same
    else: ld.pop("sameAs", None)
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/")
    s = s[:m.start(2)] + "\n" + ld_txt + "\n" + s[m.end(2):]

    # ---- channels: drop every line marked with an unknown channel ----
    for ch in ALL_CH:
        if not have[ch]:
            s, n = re.subn(rf'^[^\n]*data-ch="{ch}"[^\n]*\n', "", s, flags=re.M)
    assert "data-ch=\"viber\"" not in s and "data-ch=\"telegram\"" not in s and "data-ch=\"whatsapp\"" not in s

    # fill channel links
    if phone:
        s = s.replace("tel:+380000000000", f"tel:+{e164}")
    if email:
        s = s.replace("mailto:hello@example.com", f"mailto:{esc(email)}")
    if ig:
        s = s.replace("https://www.instagram.com/username/", esc(ig))
    if fb:
        s = s.replace("https://www.facebook.com/username", esc(fb))

    # the big phone number already sits above the channel buttons: no separate «Дзвінок» chip
    s = re.sub(r'^\s*<li data-ch="tel">[^\n]*\n', "", s, flags=re.M)
    s = re.sub(r'\s*<ul class="channels">\s*</ul>', "", s)

    # empty footer contact column -> remove
    s = re.sub(r'\s*<div>\s*<h3>Зв’язок</h3>\s*</div>', "", s)

    # form channel copy
    form_ch = [c for c in ("sms", "instagram", "facebook", "email") if have[c]]
    if form_ch == ["sms"]:
        lead_txt = "Заповніть форму: ми сформуємо SMS із заявкою, вам залишиться лише натиснути «Надіслати». Зв’яжемося, щоб підтвердити день і час."
    elif form_ch == ["email"]:
        lead_txt = "Заповніть форму: ми сформуємо лист із заявкою, вам залишиться лише надіслати його. Зв’яжемося, щоб підтвердити день і час."
    else:
        lead_txt = None
    if lead_txt:
        s = sub1(r'<p class="form-lead">.*?</p>', f'<p class="form-lead">{lead_txt}</p>', s)
    if not form_ch:  # nothing to send to: replace the form with a call to visit
        s = sub1(r'<form id="book-form".*?</form>', '<p class="form-lead">Онлайн-запис скоро запрацює. Поки що приходьте до нас у зал — підберемо групу на місці.</p>', s)
    if "data-ch=\"sms\"" in s:
        # make sure one radio is checked when Telegram (the default) was removed
        s = s.replace('value="sms">', 'value="sms" checked>', 1)

    # mobile bar with 2 items
    bar = re.search(r'<nav class="action-bar".*?</nav>', s, re.S).group(0)
    if bar.count("<a ") == 2:
        s = s.replace('<nav class="action-bar"', '<nav class="action-bar ab-2"', 1)

    # map + route
    q = quote(maps_query)
    s = s.replace(f"q={CITY_ENC}&amp;output=embed", f"q={q}&amp;output=embed")
    s = s.replace(f"destination={CITY_ENC}", f"destination={q}")

    # ---- hours ----
    if hours:
        rows = []
        for key, label, _ in DAYS:
            v = hours.get(key)
            if v:
                rows.append(f'            <tr data-day="{key}" data-open="{v[0]}" data-close="{v[1]}"><th scope="row">{label}</th><td>{v[0]}–{v[1]}</td></tr>')
            else:
                rows.append(f'            <tr data-day="{key}"><th scope="row">{label}</th><td>вихідний</td></tr>')
        s = sub1(r'(<tbody>\n).*?(\s*</tbody>)', "<tbody>\n" + "\n".join(rows) + "\n          </tbody>", s)
        if hours_text:
            s = s.replace('<p class="hours-sum"><span class="ph">[ГОДИНИ]</span></p>', f'<p class="hours-sum">{esc(hours_text)}</p>')
        else:
            s = s.replace('<p class="hours-sum"><span class="ph">[ГОДИНИ]</span></p>\n', "")
    else:
        # no machine-readable hours: no live status, no fake table
        s = sub1(r'\s*<p class="status" id="open-status".*?</p>', "", s)
        s = sub1(r'\s*<table class="hours-table".*?</table>', "", s)
        if hours_text:
            s = s.replace('<p class="hours-sum"><span class="ph">[ГОДИНИ]</span></p>', f'<p class="hours-sum hours-text">{esc(hours_text)}</p>')

    # ---- text tokens ----
    def fill(token, value):
        nonlocal s
        if value is None:
            return
        v = esc(value)
        s = s.replace(f'<span class="ph">[{token}]</span>', v)
        s = s.replace(f"[{token}]", v)

    if city_loc:
        s = re.sub(r'(\b[уУвВ] )(?:<span class="ph">)?\[МІСТО\](?:</span>)?', lambda mm: mm.group(1) + esc(city_loc), s)
    fill("МІСТО", city)
    fill("НАЗВА", name)
    fill("АДРЕСА", address)
    fill("ТЕЛЕФОН", phone)
    fill("EMAIL", email)
    fill("ІНСТАГРАМ", f"@{ig_h}" if ig else None)
    if not phone:  # noscript line mentions the phone
        s = re.sub(r'<noscript>.*?</noscript>\n', "", s, flags=re.S)

    if len(name) > 16:
        s = s.replace("<body>", '<body class="name-long">', 1)

    open(os.path.join(outdir, "index.html"), "w", encoding="utf-8").write(s)

    # ---- JS contacts ----
    jp = os.path.join(outdir, "js", "main.js")
    js = open(jp, encoding="utf-8").read()
    contact = {}
    if phone: contact["sms"] = "+" + e164
    if ig: contact["instagram"] = ig_h
    if fb: contact["facebook"] = fb_page
    if email: contact["email"] = email
    body = ",\n".join(f"    {k}: {json.dumps(v, ensure_ascii=False)}" for k, v in contact.items())
    js = sub1(r"var CONTACT = \{.*?\};", "var CONTACT = {\n" + body + "\n  };", js)
    js_name = name.replace("\\", "\\\\").replace("'", "\\'")
    js = js.replace("([НАЗВА])", f"({js_name})")
    js = js.replace("/* [НАЗВА] —", "/* " + name.replace("*/", "") + " —", 1)
    open(jp, "w", encoding="utf-8").write(js)

    # ---- README ----
    filled = [f"назва ({name})"]
    if city: filled.append(f"місто ({city})")
    if address: filled.append(f"адреса ({address})")
    if phone: filled.append(f"телефон ({phone})")
    if email: filled.append(f"email ({email})")
    if ig: filled.append(f"Instagram (@{ig_h})")
    if fb: filled.append(f"Facebook ({fb})")
    if hours or hours_text: filled.append(f"години роботи ({hours_text or 'з OSM'})")
    filled.append(f"мапа й маршрут ({maps_query})")
    remaining = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z' ]+\]", s)))
    sends = ", ".join({"sms": "SMS", "instagram": "Instagram Direct", "facebook": "Facebook Messenger", "email": "email"}[c] for c in form_ch) or "—"
    readme = f"""# {name} — демо-сайт

Шаблон: «Танцювальна студія» (`tantsi`, гілка `template/tantsi`).

## Заповнено з OpenStreetMap
{chr(10).join('- ' + f for f in filled)}

Viber, Telegram і WhatsApp невідомі, тому ці кнопки прибрано. Форма запису надсилає заявку через: {sends}.

## Що ще треба заповнити (позначено жовтим пунктиром)
{chr(10).join('- `' + t + '`' for t in remaining)}
- 3 приклади відгуків (`ph-card`) — замінити на реальні
- розклад занять (масив `SCHEDULE` у `js/main.js`), напрями й прайс — звірити з реальними
- фото — замінити на фото студії (зараз ілюстративні з Unsplash)
"""
    open(os.path.join(outdir, "README.md"), "w", encoding="utf-8").write(readme)


if __name__ == "__main__":
    main()
