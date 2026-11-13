#!/usr/bin/env python3
"""Personalize the dytiachyi-tsentr template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Fills known data (name, city, address, phone, email, socials, hours, map),
removes channels the lead does not have (Viber/WhatsApp/Telegram are never
known), keeps unknowns ([ЦІНА], [ІМ'Я], [РІК], [ФОП], [ГОДИНИ]...) as marked
placeholders. Standard library only. Never touches the template working tree.
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
# Known street-name fixes for OSM data that came in a foreign spelling.
ADDRESS_FIX = {"ulica Wołczyniecka": "Вовчинецька вулиця"}

ICON = lambda i: f'<svg class="ic"><use href="#i-{i}"/></svg>'


def esc(s):
    return html.escape(s, quote=True)


def typo_name(name):
    """Straight double quotes -> «ёлочки» for display."""
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
    """{"1": ["09:00","19:00"], ...} -> ["Mo-Sa 09:00-19:00"] grouping consecutive equal days."""
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
    res = []
    for r in out:
        d = r[0][0] if len(r) == 1 else f"{r[0][0]}-{r[-1][0]}"
        res.append(f"{d} {r[0][1]}")
    return res


def main():
    lead_path, outdir = sys.argv[1], sys.argv[2]
    L = json.load(open(lead_path, encoding="utf-8"))
    name = typo_name(L["name"])
    city, city_loc = L.get("city"), L.get("city_loc") or L.get("city")
    address = L.get("address")
    if address in ADDRESS_FIX:
        address = ADDRESS_FIX[address]
    maps_query = L.get("maps_query") or ""
    for bad, good in ADDRESS_FIX.items():
        maps_query = maps_query.replace(bad, good)
    phone, e164 = L.get("phone"), L.get("phone_e164")
    email, ig, ig_h, fb = L.get("email"), L.get("instagram"), L.get("instagram_handle"), L.get("facebook")
    hours, hours_text = L.get("hours"), L.get("hours_text")
    if not phone or not e164:
        phone = e164 = None
    if ig and not ig_h:
        ig_h = ig.rstrip("/").rsplit("/", 1)[-1]

    # ---- copy site files ----
    if os.path.exists(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    for item in ["index.html", "robots.txt", "css", "js", "fonts", "img"]:
        src = os.path.join(ROOT, item)
        dst = os.path.join(outdir, item)
        if os.path.isdir(src):
            shutil.copytree(src, dst, ignore=shutil.ignore_patterns("photos", "*.zip", "node_modules"))
        else:
            shutil.copy2(src, dst)

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # ---- JSON-LD: rebuild via json ----
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    ld["name"] = name
    ld["description"] = f"Дитячий розвивальний центр у {city_loc}: заняття в малих групах для дітей від 1 до 10 років." if city_loc else ld["description"]
    if phone: ld["telephone"] = phone
    else: ld.pop("telephone", None)
    if email: ld["email"] = email
    else: ld.pop("email", None)
    ld.pop("foundingDate", None)          # unknown -> not presented as fact
    ld.pop("priceRange", None)
    if address: ld["address"]["streetAddress"] = address
    if city: ld["address"]["addressLocality"] = city; ld["areaServed"] = city
    if hours: ld["openingHours"] = schema_hours(hours)
    else: ld.pop("openingHours", None)
    same = [u for u in (ig, fb) if u]
    if same: ld["sameAs"] = same
    else: ld.pop("sameAs", None)
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/")
    s = s[:m.start(2)] + "\n" + ld_txt + "\n" + s[m.end(2):]

    # ---- channel-dependent blocks (regenerated) ----
    # nav phone
    nav_phone = (f'      <a class="nav-phone" href="tel:+{e164}">{ICON("phone")}<span>{esc(phone)}</span></a>\n' if phone else "")
    s = sub1(r'      <a class="nav-phone"[^\n]*\n', nav_phone, s)

    # hero CTA second button
    if phone:
        second = f'<a class="btn btn-ghost" href="tel:+{e164}">{ICON("phone")}Зателефонувати</a>'
    elif ig:
        second = f'<a class="btn btn-ghost" href="{esc(ig)}" target="_blank" rel="noopener">{ICON("insta")}Написати в Instagram</a>'
    elif fb:
        second = f'<a class="btn btn-ghost" href="{esc(fb)}" target="_blank" rel="noopener">{ICON("fb")}Написати у Facebook</a>'
    else:
        second = f'<a class="btn btn-ghost" href="#rozklad">{ICON("clock")}Подивитися розклад</a>'
    s = sub1(r'<a class="btn btn-ghost" href="tel:\+380000000000">.*?</a>', second, s)

    # big phone in contacts
    big = (f'        <a class="big-phone" href="tel:+{e164}">{esc(phone)}</a>\n' if phone else "")
    s = sub1(r'        <a class="big-phone"[^\n]*\n', big, s)

    # social buttons
    sb = []
    if phone: sb.append(f'<a class="sb" href="tel:+{e164}">{ICON("phone")}Дзвінок</a>')
    if ig: sb.append(f'<a class="sb" href="{esc(ig)}" target="_blank" rel="noopener">{ICON("insta")}@{esc(ig_h)}</a>')
    if fb: sb.append(f'<a class="sb" href="{esc(fb)}" target="_blank" rel="noopener">{ICON("fb")}Facebook</a>')
    if email: sb.append(f'<a class="sb" href="mailto:{esc(email)}">{ICON("mail")}{esc(email)}</a>')
    socials = ('<div class="socials" data-block="socials">\n          ' + "\n          ".join(sb) + "\n        </div>") if sb else ""
    s = sub1(r'<div class="socials" data-block="socials">.*?</div>', socials, s)

    # FAQ lead line
    if phone: faq = f'Не знайшли відповіді — <a href="tel:+{e164}">зателефонуйте нам</a>.'
    elif ig: faq = f'Не знайшли відповіді — <a href="{esc(ig)}" target="_blank" rel="noopener">напишіть нам в Instagram</a>.'
    elif fb: faq = f'Не знайшли відповіді — <a href="{esc(fb)}" target="_blank" rel="noopener">напишіть нам у Facebook</a>.'
    elif email: faq = f'Не знайшли відповіді — <a href="mailto:{esc(email)}">напишіть нам листа</a>.'
    else: faq = 'Не знайшли відповіді — <a href="#zapys">залиште заявку</a>, і ми відповімо.'
    s = sub1(r'Не знайшли відповіді — <a href="https://t\.me/username"[^>]*>напишіть нам у Telegram</a>\.', faq, s)

    # form channels (max 3, in priority order)
    chans = []
    if email: chans.append(("email", "mail", "Email"))
    if phone: chans.append(("sms", "chat", "SMS"))
    if ig: chans.append(("instagram", "insta", "Instagram"))
    if fb: chans.append(("facebook", "fb", "Facebook"))
    chans = chans[:3]
    if len(chans) > 1:
        labels = "\n".join(
            f'            <label><input type="radio" name="channel" value="{v}"{" checked" if i == 0 else ""}><span>{ICON(ic)}{t}</span></label>'
            for i, (v, ic, t) in enumerate(chans))
        fs = f'<fieldset class="channel">\n            <legend>Куди надіслати заявку</legend>\n{labels}\n          </fieldset>'
    elif chans:
        fs = f'<input type="hidden" name="channel" value="{chans[0][0]}">'
    else:
        fs = ""
    s = sub1(r'<fieldset class="channel">.*?</fieldset>', fs, s)
    if not chans:  # nothing to send to (does not happen in current leads): make the card a call-to-action
        s = sub1(r'<form id="book-form".*?</form>', '<p class="form-lead">Онлайн-запис скоро запрацює. Поки що завітайте до нас особисто.</p>', s)

    # footer contact column
    fc = []
    if phone: fc.append(f'<p><a href="tel:+{e164}">{esc(phone)}</a></p>')
    if email: fc.append(f'<p><a href="mailto:{esc(email)}">{esc(email)}</a></p>')
    if ig: fc.append(f'<p><a href="{esc(ig)}" target="_blank" rel="noopener">@{esc(ig_h)}</a></p>')
    if fb: fc.append(f'<p><a href="{esc(fb)}" target="_blank" rel="noopener">Facebook</a></p>')
    foot = ("<div>\n      <h3>Зв’язок</h3>\n      " + "\n      ".join(fc) + "\n    </div>") if fc else ""
    s = sub1(r'<div>\s*<h3>Зв’язок</h3>.*?</div>', foot, s)

    # mobile action bar
    route = f"https://www.google.com/maps/dir/?api=1&amp;destination={quote(maps_query)}"
    items = []
    if phone: items.append(f'<a href="tel:+{e164}">{ICON("phone")}Подзвонити</a>')
    elif ig: items.append(f'<a href="{esc(ig)}" target="_blank" rel="noopener">{ICON("insta")}Написати</a>')
    elif fb: items.append(f'<a href="{esc(fb)}" target="_blank" rel="noopener">{ICON("fb")}Написати</a>')
    items.append(f'<a class="ab-main" href="#zapys">{ICON("cal")}Записатися</a>')
    items.append(f'<a href="{route}" target="_blank" rel="noopener">{ICON("route")}Маршрут</a>')
    cls = "action-bar" + ("" if len(items) == 3 else " ab-2")
    bar = f'<nav class="{cls}" data-block="action-bar" aria-label="Швидкі дії">\n  ' + "\n  ".join(items) + "\n</nav>"
    s = sub1(r'<nav class="action-bar" data-block="action-bar".*?</nav>', bar, s)

    # map + route links
    s = s.replace(f"q={CITY_ENC}&amp;output=embed", f"q={quote(maps_query)}&amp;output=embed")
    s = s.replace(f"destination={CITY_ENC}", f"destination={quote(maps_query)}")

    # ---- hours ----
    if hours:
        rows = []
        for key, label, _ in DAYS:
            v = hours.get(key)
            if v:
                rows.append(f'              <tr data-days="{key}"><th scope="row">{label}</th><td data-open="{v[0]}" data-close="{v[1]}">{v[0]}–{v[1]}</td></tr>')
            else:
                rows.append(f'              <tr data-days="{key}"><th scope="row">{label}</th><td>вихідний</td></tr>')
        s = sub1(r'(<tbody>\n).*?(\s*</tbody>)', "<tbody>\n" + "\n".join(rows) + "\n            </tbody>", s)
        status_txt = esc(hours_text) if hours_text else "Графік роботи"
        s = s.replace('<span class="status-text"><span class="ph">[ГОДИНИ]</span></span>', f'<span class="status-text">{status_txt}</span>')
    else:
        # no machine-readable hours: no live status, no fake table
        s = sub1(r'\s*<p class="status" id="open-status".*?</p>', "", s)
        txt = esc(hours_text) if hours_text else '<span class="ph">[ГОДИНИ]</span>'
        s = sub1(r'<table>.*?</table>', f'<p class="hours-text">{txt}</p>', s)
    if hours_text:
        s = s.replace('<span class="ph">[ГОДИНИ]</span>', esc(hours_text))

    # ---- text tokens ----
    def fill(token, value):
        nonlocal s
        if value is None:
            return
        v = esc(value)
        s = s.replace(f'<span class="ph">[{token}]</span>', v)
        s = s.replace(f'<strong class="ph">[{token}]</strong>', f"<strong>{v}</strong>")
        s = s.replace(f"[{token}]", v)

    if city_loc:
        s = re.sub(r'(\b[уУвВ] )(?:<span class="ph">)?\[МІСТО\](?:</span>)?', lambda m: m.group(1) + esc(city_loc), s)
    fill("МІСТО", city)
    fill("НАЗВА", name)
    fill("АДРЕСА", address)
    fill("ТЕЛЕФОН", phone)
    fill("EMAIL", email)
    fill("ІНСТАГРАМ", f"@{ig_h}" if ig else None)

    # long names: compact header logo
    if len(name) > 18:
        s = s.replace("<body>", '<body class="name-long">', 1)

    open(os.path.join(outdir, "index.html"), "w", encoding="utf-8").write(s)

    # ---- JS contacts ----
    jp = os.path.join(outdir, "js", "main.js")
    js = open(jp, encoding="utf-8").read()
    contact = {}
    if email: contact["email"] = email
    if phone: contact["sms"] = "+" + e164
    if ig: contact["instagram"] = ig
    if fb: contact["facebook"] = fb
    body = ",\n".join(f"    {k}: {json.dumps(v, ensure_ascii=False)}" for k, v in contact.items())
    js = sub1(r"var CONTACT = \{.*?\};", "var CONTACT = {\n" + body + "\n  };", js)
    js = js.replace("/* [НАЗВА] —", "/* " + name.replace("*/", "") + " —", 1)
    open(jp, "w", encoding="utf-8").write(js)

    # ---- README ----
    filled = [f"назва ({name})"]
    if city: filled.append(f"місто ({city})")
    if address: filled.append(f"адреса ({address})")
    if phone: filled.append(f"телефон ({phone})")
    if email: filled.append(f"email ({email})")
    if ig: filled.append(f"Instagram (@{ig_h})")
    if fb: filled.append("Facebook")
    if hours or hours_text: filled.append(f"години роботи ({hours_text or 'з OSM'})")
    filled.append(f"мапа й маршрут ({maps_query})")
    remaining = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z' ]+\]", s)))
    readme = f"""# {name} — демо-сайт

Шаблон: «Дитячий розвивальний центр» (`dytiachyi-tsentr`, гілка `template/dytiachyi-tsentr`).

## Заповнено з OpenStreetMap
{chr(10).join('- ' + f for f in filled)}

Viber, Telegram і WhatsApp невідомі, тому ці кнопки прибрано. Форма надсилає заявку через доступні канали: email, SMS, Instagram чи Facebook.

## Що ще треба заповнити (позначено жовтим пунктиром)
{chr(10).join('- `' + t + '`' for t in remaining)}
- 3 приклади відгуків (`ph-card`) — замінити на реальні
- прайс, розклад занять і напрями — звірити з реальними
- фото — замінити на фото центру (зараз ілюстративні з Unsplash)
"""
    open(os.path.join(outdir, "README.md"), "w", encoding="utf-8").write(readme)


if __name__ == "__main__":
    main()
