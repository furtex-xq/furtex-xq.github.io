#!/usr/bin/env python3
"""Personalize the auto-parts template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Writes a complete copy of the site with the lead's known data filled in.
Unknown values stay as visible [TOKEN] placeholders. Standard library only.
"""
import html
import json
import os
import re
import shutil
import sys
import urllib.parse

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY = ["robots.txt", "css", "js", "fonts", "img/favicon.svg"]
DAY_NAMES = {1: "Понеділок", 2: "Вівторок", 3: "Середа", 4: "Четвер", 5: "П'ятниця", 6: "Субота", 0: "Неділя"}
DAY_OSM = {1: "Mo", 2: "Tu", 3: "We", 4: "Th", 5: "Fr", 6: "Sa", 0: "Su"}
ORDER = [1, 2, 3, 4, 5, 6, 0]
PH = '<span class="ph">{}</span>'


def esc(s):
    return html.escape(s, quote=False).replace('"', "&quot;")


def clean_lead(lead):
    L = {k: (v.strip() if isinstance(v, str) else v) for k, v in lead.items()}
    for k, v in list(L.items()):
        if v == "":
            L[k] = None
    if L.get("name"):
        L["name"] = re.sub(r"\s*,\s*(?=\S)", ", ", L["name"])
    # A Ukrainian number is 380 + 9 digits; anything else is treated as unknown
    digits = re.sub(r"\D", "", L.get("phone_e164") or "")
    L["phone_ok"] = bool(L.get("phone")) and len(digits) == 12 and digits.startswith("380")
    L["phone_e164"] = digits
    if L.get("instagram") and not L.get("instagram_handle"):
        m = re.search(r"instagram\.com/([^/?#]+)", L["instagram"])
        L["instagram_handle"] = m.group(1) if m else None
    hours = L.get("hours")
    if isinstance(hours, dict):
        L["hours"] = {int(k): v for k, v in hours.items()}
    return L


def drop_lines(s, needles):
    out = []
    for line in s.split("\n"):
        if any(n in line for n in needles):
            continue
        out.append(line)
    return "\n".join(out)


def must_replace(s, old, new, count=None):
    if old not in s:
        raise SystemExit("template changed, marker not found: " + old[:70])
    return s.replace(old, new) if count is None else s.replace(old, new, count)


def osm_hours(hours):
    """{"1": ["09:00","18:00"], ...} -> ["Mo-Fr 09:00-18:00", "Sa 09:00-15:00"]"""
    specs, i = [], 0
    while i < len(ORDER):
        d = ORDER[i]
        t = hours.get(d)
        if not t:
            i += 1
            continue
        j = i
        while j + 1 < len(ORDER) and hours.get(ORDER[j + 1]) == t:
            j += 1
        days = DAY_OSM[d] if i == j else DAY_OSM[d] + "-" + DAY_OSM[ORDER[j]]
        specs.append("{} {}-{}".format(days, t[0], t[1]))
        i = j + 1
    return specs


def build(lead, outdir):
    L = clean_lead(lead)
    name, city, city_loc = L["name"], L.get("city"), L.get("city_loc") or L.get("city")
    phone_ok, email = L["phone_ok"], L.get("email")
    insta, fb = L.get("instagram"), L.get("facebook")
    hours, hours_text = L.get("hours"), L.get("hours_text")
    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # ---------- JSON-LD: rebuild from known data only ----------
    ld = {"@context": "https://schema.org", "@type": "AutoPartsStore", "name": name,
          "description": "Магазин автозапчастин у {}: підбір за VIN-кодом, оригінальні деталі та аналоги.".format(city_loc or "[МІСТО]")}
    m = re.search(r'"image": "([^"]+)"', s)
    if m:
        ld["image"] = m.group(1)
    if phone_ok:
        ld["telephone"] = "+" + L["phone_e164"]
    if email:
        ld["email"] = email
    addr = {"@type": "PostalAddress", "addressCountry": "UA"}
    if L.get("address"):
        addr["streetAddress"] = L["address"]
    if city:
        addr["addressLocality"] = city
    ld["address"] = addr
    if hours:
        ld["openingHours"] = osm_hours(hours)
    same = [u for u in (insta, fb) if u]
    if same:
        ld["sameAs"] = same
    ld_json = json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/")
    s = re.sub(r'<script type="application/ld\+json">.*?</script>',
               lambda _: '<script type="application/ld+json">\n' + ld_json + "\n</script>", s, count=1, flags=re.S)

    # ---------- channels that no lead has: Viber / Telegram / WhatsApp ----------
    s = drop_lines(s, ['href="viber://chat?number=%2B380000000000"', 'href="https://t.me/username"', 'href="https://wa.me/380000000000"',
                       'name="channel" value="telegram"', 'name="channel" value="viber"'])
    s = must_replace(s, '<div class="links">', '<div class="links links--auto">')

    # instagram / facebook / email buttons
    if insta:
        s = must_replace(s, 'href="https://www.instagram.com/username/"', 'href="{}"'.format(esc(insta)))
    else:
        s = drop_lines(s, ['href="https://www.instagram.com/username/"'])
    if fb:
        s = must_replace(s, 'href="https://www.facebook.com/username"', 'href="{}"'.format(esc(fb)))
    else:
        s = drop_lines(s, ['href="https://www.facebook.com/username"'])
    footer_line = re.search(r'\s*<p><a href="tel:\+380000000000">.*?</p>\n', s).group(0)
    parts = []
    if phone_ok:
        parts.append('<a href="tel:+{}">{}</a>'.format(L["phone_e164"], esc(L["phone"])))
    if email:
        parts.append('<a href="mailto:{0}">{0}</a>'.format(esc(email)))
    s = s.replace(footer_line, '\n      <p>{}</p>\n'.format(" · ".join(parts)) if parts else "\n")
    if email:
        s = s.replace("mailto:hello@example.com", "mailto:" + esc(email))
    else:
        s = drop_lines(s, ['href="mailto:hello@example.com"', 'name="channel" value="email"'])

    # ---------- finder send options ----------
    channels = []
    if phone_ok:
        channels.append(("sms", "SMS"))
    if email:
        channels.append(("email", "Email"))
    radios = re.search(r'(\s*<div class="radios radios--ch"[^>]*>)(.*?)(</div>)', s, re.S)
    if channels:
        inner = "".join('\n          <label><input type="radio" name="channel" value="{}"{}><span>{}</span></label>'.format(v, " checked" if i == 0 else "", lab)
                        for i, (v, lab) in enumerate(channels))
        s = s.replace(radios.group(0), radios.group(1) + inner + "\n        " + radios.group(3))
        names = " або ".join({"sms": "SMS", "email": "лист на пошту"}[c] for c, _ in channels)
        s = must_replace(s, "Відкриється месенджер з готовим текстом заявки — залишиться натиснути «Надіслати».",
                         "Відкриється {} з готовим текстом заявки — залишиться натиснути «Надіслати».".format(names))
        intro = {"sms": "SMS-повідомленням", "email": "листом на пошту"}
        s = must_replace(s, "Заявка йде прямо в месенджер магазину.",
                         "Заявка надходить магазину {}.".format(" або ".join(intro[c] for c, _ in channels)))
    else:
        s = s.replace(radios.group(0), "")
        s = drop_lines(s, ['id="ch-lbl"'])
        s = must_replace(s, "Відкриється месенджер з готовим текстом заявки — залишиться натиснути «Надіслати».",
                         "Текст заявки скопіюється — надішліть його нам у соцмережах.")
        s = must_replace(s, "Заявка йде прямо в месенджер магазину.", "Ви отримаєте готовий текст заявки.")
    s = must_replace(s, "Якщо месенджер не відкрився —", "Якщо застосунок не відкрився —")
    s = must_replace(s, "Скинув VIN у Telegram увечері", "Скинув VIN увечері")
    s = must_replace(s, "через форму, месенджер чи по телефону", "через форму чи по телефону" if phone_ok else "через форму")

    # callback form
    if channels:
        s = must_replace(s, 'data-callback data-channel="telegram"', 'data-callback data-channel="{}"'.format(channels[0][0]))
        s = must_replace(s, "Готово — відкриваємо Telegram з вашим запитом. Якщо не відкрився, зателефонуйте нам.",
                         "Готово — відкриваємо {} з вашим запитом.{}".format("SMS" if channels[0][0] == "sms" else "пошту",
                                                                           " Якщо не відкрилось, зателефонуйте нам." if phone_ok else ""))
    else:
        s = re.sub(r'\s*<form class="cb" data-callback.*?</form>', "", s, count=1, flags=re.S)

    # ---------- phone ----------
    if phone_ok:
        s = s.replace("tel:+380000000000", "tel:+" + L["phone_e164"])
    else:
        s = drop_lines(s, ['class="topbar__item topbar__tel"', 'class="bigtel"', 'data-channel="tel"'])
        s = must_replace(s, ", [ТЕЛЕФОН].\">", ".\">")
        alt = ("mailto:" + esc(email), "Написати") if email else ((esc(insta), "Instagram") if insta else ("#finder", "Заявка"))
        s = re.sub(r'<a href="tel:\+380000000000">(<svg.*?</svg>)Дзвінок</a>',
                   lambda m: '<a href="{}">{}{}</a>'.format(alt[0], '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>', alt[1]), s)
        s = s.replace("tel:+380000000000", "#contacts")

    # ---------- maps ----------
    q = L.get("maps_query") or ", ".join(x for x in (L.get("address"), city) if x)
    if q:
        qe = urllib.parse.quote(q)
        s = re.sub(r'src="https://www\.google\.com/maps\?q=[^"&]*&amp;output=embed"',
                   'src="https://www.google.com/maps?q={}&amp;output=embed"'.format(qe), s)
        s = re.sub(r'href="https://www\.google\.com/maps\?q=[^"]*"',
                   'href="https://www.google.com/maps/dir/?api=1&amp;destination={}"'.format(qe), s)

    # ---------- hours ----------
    if hours:
        rows = []
        for d in ORDER:
            t = hours.get(d)
            if t:
                rows.append('            <tr data-days="{}"><th scope="row">{}</th><td data-open="{}" data-close="{}">{} – {}</td></tr>'.format(d, DAY_NAMES[d], t[0], t[1], t[0], t[1]))
            else:
                rows.append('            <tr data-days="{}"><th scope="row">{}</th><td>вихідний</td></tr>'.format(d, DAY_NAMES[d]))
        s = re.sub(r'(<table class="hours__t" data-hours>\n).*?(\n\s*</table>)', lambda m: m.group(1) + "\n".join(rows) + m.group(2), s, count=1, flags=re.S)
        s = must_replace(s, 'Коротко: <span class="ph">[ГОДИНИ]</span>. Час — київський.', "Час — київський.")
    else:
        # no live status and no default table presented as fact
        s = re.sub(r'<span class="status" data-status>.*?</span></span>', "", s)
        s = re.sub(r'\s*<span class="status status--big" data-status>.*?</span></span>', "", s)
        s = re.sub(r'\s*<table class="hours__t" data-hours>.*?</table>', "", s, count=1, flags=re.S)
        s = must_replace(s, 'Коротко: <span class="ph">[ГОДИНИ]</span>. Час — київський.', '<span class="ph">[ГОДИНИ]</span>')
    if hours_text:
        s = s.replace(PH.format("[ГОДИНИ]"), esc(hours_text))

    # ---------- tokens ----------
    known = {"[НАЗВА]": name, "[АДРЕСА]": L.get("address"), "[ТЕЛЕФОН]": L["phone"] if phone_ok else None,
             "[EMAIL]": email, "[ІНСТАГРАМ]": ("@" + L["instagram_handle"]) if insta and L.get("instagram_handle") else None}
    if city:
        s = re.sub(r'(?<![\w])([уУвВ]\s+)(?:<span class="ph">)?\[МІСТО\](?:</span>)?', lambda m: m.group(1) + esc(city_loc), s)
        known["[МІСТО]"] = city
    for tok, val in known.items():
        if val:
            s = s.replace(PH.format(tok), esc(val)).replace(tok, esc(val))
    if len(name) > 16:
        s = s.replace('class="logo"', 'class="logo logo--long"').replace('class="logo logo--light"', 'class="logo logo--light logo--long"')

    s = re.sub(r'\s*<div class="links links--auto">\s*</div>', '', s)

    # ---------- write ----------
    if os.path.exists(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    for rel in COPY:
        src, dst = os.path.join(ROOT, rel), os.path.join(outdir, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        (shutil.copytree if os.path.isdir(src) else shutil.copy2)(src, dst)
    with open(os.path.join(outdir, "index.html"), "w", encoding="utf-8") as f:
        f.write(s)
    jsp = os.path.join(outdir, "js", "main.js")
    js = open(jsp, encoding="utf-8").read().replace("[НАЗВА]", name.replace("*/", ""))
    open(jsp, "w", encoding="utf-8").write(js)

    left = sorted(set(re.findall(r"\[[A-ZА-ЯІЇЄҐ'’]+\]", s)))
    filled = [lab for lab, ok in (("назва", True), ("місто", city), ("адреса", L.get("address")), ("телефон", phone_ok), ("email", email),
                                  ("Instagram", insta), ("Facebook", fb), ("графік роботи", hours or hours_text), ("точка на карті", q)) if ok]
    readme = ["# {} — демо-сайт".format(name), "",
              "Шаблон: «Магазин автозапчастин» (`avtozapchastyny`).", "",
              "Заповнено з OpenStreetMap: " + ", ".join(filled) + ".", ""]
    if L.get("phone") and not phone_ok:
        readme += ["Телефон з OpenStreetMap (`{}`) має неправильний формат — на сайт не підставлено.".format(L["phone"]), ""]
    readme += ["Що лишилось заповнити (позначено бурштиновим підкресленням на сторінці):", ""]
    hints = {"[ЦІНА]": "ціни «від … грн» у каталозі, на бирці першого екрана й у таблиці цін",
             "[ІМ'Я]": "імена авторів відгуків (і самі відгуки — зараз це приклади з міткою)",
             "[РІК]": "рік заснування магазину", "[ФОП]": "ФОП / ЄДРПОУ у футері",
             "[ГОДИНИ]": "графік роботи", "[АДРЕСА]": "адреса", "[EMAIL]": "email", "[ТЕЛЕФОН]": "телефон", "[МІСТО]": "місто"}
    readme += ["- `{}` — {}".format(t, hints.get(t, "")) for t in left]
    readme += ["- Фото — зараз стокові (Unsplash); краще замінити на фото магазину.", ""]
    open(os.path.join(outdir, "README.md"), "w", encoding="utf-8").write("\n".join(readme))
    return left


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    data = json.load(open(sys.argv[1], encoding="utf-8"))
    leads = data if isinstance(data, list) else [data]
    if len(leads) != 1:
        sys.exit("expected one lead object in " + sys.argv[1])
    left = build(leads[0], sys.argv[2])
    print("ok", sys.argv[2], "placeholders left:", " ".join(left))
