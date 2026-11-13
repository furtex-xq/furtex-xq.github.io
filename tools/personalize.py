#!/usr/bin/env python3
"""Personalize the toys & gifts template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Writes a complete copy of the site into <outdir> with the lead's known data
filled in. Unknown values stay as marked [TOKEN] placeholders. Standard library only.
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
CITY_DEFAULT_Q = urllib.parse.quote("Івано-Франківськ")
ICON_MSG = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>'


def esc(s):
    return html.escape(s, quote=True)


def must(s, old, new, count=0):
    if old not in s:
        raise SystemExit("template changed, marker not found: " + old[:80])
    return s.replace(old, new) if not count else s.replace(old, new, count)


def drop_lines(s, needles):
    return "\n".join(l for l in s.split("\n") if not any(n in l for n in needles))


def clean_lead(lead):
    L = {k: (v.strip() if isinstance(v, str) else v) for k, v in lead.items()}
    for k, v in list(L.items()):
        if v == "":
            L[k] = None
    n = L["name"]
    if n and n[0].islower():
        n = n[0].upper() + n[1:]
    L["name"] = n
    digits = re.sub(r"\D", "", L.get("phone_e164") or "")
    L["phone_ok"] = bool(L.get("phone")) and len(digits) == 12 and digits.startswith("380")
    L["phone_e164"] = digits
    if L.get("instagram") and not L.get("instagram_handle"):
        m = re.search(r"instagram\.com/([^/?#]+)", L["instagram"])
        L["instagram_handle"] = m.group(1) if m else None
    if isinstance(L.get("hours"), dict):
        L["hours"] = {int(k): v for k, v in L["hours"].items()}
    return L


def osm_hours(hours):
    specs, i = [], 0
    while i < len(ORDER):
        d, t = ORDER[i], hours.get(ORDER[i])
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
    name, city = L["name"], L.get("city")
    city_loc = L.get("city_loc") or city
    phone_ok, email = L["phone_ok"], L.get("email")
    insta, fb, handle = L.get("instagram"), L.get("facebook"), L.get("instagram_handle")
    hours, hours_text = L.get("hours"), L.get("hours_text")
    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # ---------- JSON-LD from known data only ----------
    ld = {"@context": "https://schema.org", "@type": "ToyStore", "name": name,
          "description": "Магазин іграшок і подарунків{}: конструктори, м'які та розвивальні іграшки, настільні ігри, подарункові бокси, святкове пакування.".format(
              " у " + city_loc if city_loc else "")}
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

    # ---------- channels: no lead has Viber / Telegram / WhatsApp ----------
    s = drop_lines(s, ['data-ch="viber"', 'data-ch="telegram"', 'data-ch="whatsapp"'])
    if insta:
        s = must(s, 'href="https://www.instagram.com/username/"', 'href="{}"'.format(esc(insta)))
    else:
        s = drop_lines(s, ['data-ch="instagram"'])
        s = must(s, "Напишіть, що сподобалось на сайті чи в Instagram, —", "Напишіть, що сподобалось на сайті, —")
    if fb:
        s = must(s, 'href="https://www.facebook.com/username"', 'href="{}"'.format(esc(fb)))
        if "/groups/" in fb:
            s = must(s, "<small>Facebook</small>Сторінка магазину", "<small>Facebook</small>Група магазину")
    else:
        s = drop_lines(s, ['data-ch="facebook"'])
    if email:
        s = must(s, "mailto:hello@example.com", "mailto:" + esc(email))
    else:
        s = drop_lines(s, ['data-ch="email"'])

    # ---------- phone ----------
    if phone_ok:
        s = s.replace("tel:+380000000000", "tel:+" + L["phone_e164"])
    else:
        s = drop_lines(s, ['data-ch="tel"'])
        if insta:
            href, long_t, short_t, attrs = esc(insta), "Написати в Instagram", "Instagram", ' target="_blank" rel="noopener"'
        else:
            href, long_t, short_t, attrs = "#order", "Залишити заявку", "Заявка", ""

        def swap(mm):
            inner = re.sub(r"<svg.*?</svg>", ICON_MSG, mm.group(2), count=1, flags=re.S)
            inner = inner.replace("Зателефонувати", long_t).replace("Дзвінок", short_t)
            return '<a {}href="{}"{} data-cta-call>{}</a>'.format(mm.group(1), href, attrs, inner)
        s, n = re.subn(r'<a ((?:class="[^"]*" )?)href="tel:\+380000000000" data-cta-call>(.*?)</a>', swap, s, flags=re.S)
        if n != 3:
            raise SystemExit("template changed: expected 3 call CTAs, got %d" % n)
        s = must(s, "Через форму, телефоном або в повідомленні:", "Через форму або в повідомленні:")
        s = must(s, "Не знайшли відповіді — напишіть або зателефонуйте, відповімо.", "Не знайшли відповіді — напишіть нам, відповімо.")

    # ---------- maps ----------
    q = L.get("maps_query") or ", ".join(x for x in (L.get("address"), city) if x)
    if q:
        qe = urllib.parse.quote(q)
        s = must(s, "maps?q={}&amp;output=embed".format(CITY_DEFAULT_Q), "maps?q={}&amp;output=embed".format(qe))
        s = must(s, "destination=" + CITY_DEFAULT_Q, "destination=" + qe)

    # ---------- hours ----------
    note_old = 'Коротко: <span class="ph">[ГОДИНИ]</span>. Час — київський.'
    if hours:
        rows = []
        for d in ORDER:
            t = hours.get(d)
            if t:
                rows.append('            <tr data-day="{}"><th scope="row">{}</th><td data-open="{}" data-close="{}">{} – {}</td></tr>'.format(d, DAY_NAMES[d], t[0], t[1], t[0], t[1]))
            else:
                rows.append('            <tr data-day="{}"><th scope="row">{}</th><td>вихідний</td></tr>'.format(d, DAY_NAMES[d]))
        s, n = re.subn(r'(<table class="hours__t" data-hours>\n).*?(\n\s*</table>)', lambda mm: mm.group(1) + "\n".join(rows) + mm.group(2), s, count=1, flags=re.S)
        if not n:
            raise SystemExit("template changed: hours table")
        s = must(s, note_old, "Час — київський." if not hours_text else esc(hours_text) + ". Час — київський.")
    else:
        # no live status, no default table presented as fact
        s = re.sub(r'\s*<span class="status[^"]*" data-status hidden><i></i><span data-status-text>[^<]*</span></span>', "", s)
        s = re.sub(r'\s*<table class="hours__t" data-hours>.*?</table>', "", s, count=1, flags=re.S)
        s = must(s, '<p class="hours__note">' + note_old + "</p>",
                 '<p class="hours__text">{}</p>'.format(esc(hours_text) if hours_text else PH.format("[ГОДИНИ]")))
    if hours_text:
        s = s.replace(PH.format("[ГОДИНИ]"), esc(hours_text))

    # ---------- tokens ----------
    known = {"[НАЗВА]": name, "[АДРЕСА]": L.get("address"), "[ТЕЛЕФОН]": L["phone"] if phone_ok else None,
             "[EMAIL]": email, "[ІНСТАГРАМ]": "@" + handle if insta and handle else None}
    if city:
        s = re.sub(r'(?<![\w])([уУвВ]\s+)(?:<span class="ph">)?\[МІСТО\](?:</span>)?', lambda mm: mm.group(1) + esc(city_loc), s)
        known["[МІСТО]"] = city
    for tok, val in known.items():
        if val:
            s = s.replace(PH.format(tok), esc(val)).replace(tok, esc(val))
    if len(name) > 14:
        s = s.replace('class="logo"', 'class="logo logo--long"').replace('class="logo logo--foot"', 'class="logo logo--foot logo--long"')
    if not hours and not hours_text:
        pass  # [ГОДИНИ] stays marked

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

    left = sorted(set(re.findall(r"\[[A-ZА-ЯІЇЄҐ'’]+\]", s)))
    filled = [lab for lab, ok in (("назва", True), ("місто", city), ("адреса", L.get("address")), ("телефон", phone_ok),
                                  ("email", email), ("Instagram", insta), ("Facebook", fb),
                                  ("графік роботи", hours or hours_text), ("точка на карті", q)) if ok]
    hints = {"[ЦІНА]": "ціни «від … грн» у каталозі й у прайсі пакування",
             "[ІМ'Я]": "імена авторів відгуків (самі відгуки — приклади з міткою, замінити на реальні)",
             "[РІК]": "рік відкриття магазину («Про магазин»)", "[ФОП]": "ФОП / ЄДРПОУ у футері",
             "[ГОДИНИ]": "графік роботи", "[АДРЕСА]": "адреса", "[EMAIL]": "email", "[ТЕЛЕФОН]": "телефон",
             "[МІСТО]": "місто", "[ІНСТАГРАМ]": "Instagram"}
    readme = ["# {} — демо-сайт".format(name), "",
              "Шаблон: «Магазин іграшок і подарунків» (`ihrashky-podarunky`).", "",
              "Заповнено з OpenStreetMap: " + ", ".join(filled) + ".", ""]
    if L.get("phone") and not phone_ok:
        readme += ["Телефон з OpenStreetMap (`{}`) має неправильний формат — на сайт не підставлено.".format(L["phone"]), ""]
    if hours_text and not hours:
        readme += ["Графік показано текстом; статус «відчинено/зачинено» вимкнено, доки немає точних годин.", ""]
    readme += ["Що лишилось заповнити (позначено бурштиновим підкресленням на сторінці):", ""]
    readme += ["- `{}` — {}".format(t, hints.get(t, "")) for t in left]
    readme += ["- Фото — стокові (Unsplash); краще замінити на фото вітрини, полиць і пакування магазину.",
               "- Асортимент у каталозі й ідеї в підборі подарунка — типові, звірити з реальними.", ""]
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
