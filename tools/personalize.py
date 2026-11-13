#!/usr/bin/env python3
"""Персоналізація шаблону «Ремонт і будівництво» під конкретний лід.

usage: python3 tools/personalize.py <lead.json> <outdir>

Лише стандартна бібліотека. Канали зв'язку, форма і графік задаються в js/config.js
(шаблон data-driven), тож тут: заповнити токени в HTML, прибрати рядки невідомих каналів
і записати новий config.js. Невідомі факти ([ЦІНА], [ІМ'Я], [РІК], [ФОП] …) лишаються заглушками.
"""
import html
import json
import os
import re
import shutil
import sys
import urllib.parse

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY = ["index.html", "robots.txt", "css", "js", "fonts", "img/favicon.svg"]
UA_MOBILE = {"39", "50", "63", "66", "67", "68", "73", "77", "91", "92", "93", "94", "95", "96", "97", "98", "99"}
TEMPLATE_MAP_Q = "%D0%86%D0%B2%D0%B0%D0%BD%D0%BE-%D0%A4%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA"


def fail(msg):
    raise SystemExit("personalize: " + msg)


def sub1(s, old, new):
    if old not in s:
        fail("fragment not found: " + old[:80])
    return s.replace(old, new)


def find_el(s, marker, start=0):
    """(begin, end) елемента, чий відкривальний тег містить marker (балансування за назвою тегу)."""
    i = s.find(marker, start)
    if i < 0:
        return None
    b = i if s[i] == "<" else s.rfind("<", 0, i)
    tag = re.match(r"<([a-zA-Z0-9]+)", s[b:]).group(1)
    depth = 0
    for t in re.finditer(r"<(/?)%s\b[^>]*>" % tag, s[b:]):
        depth += -1 if t.group(1) else 1
        if depth == 0:
            return b, b + t.end()
    fail("unbalanced element for " + marker)


def remove_all(s, marker):
    n = 0
    while True:
        r = find_el(s, marker)
        if not r:
            return s, n
        b, e = r
        lb = s.rfind("\n", 0, b)
        if lb >= 0 and s[lb + 1:b].strip() == "":
            b = lb
        s = s[:b] + s[e:]
        n += 1


def esc(v):
    return html.escape(v, quote=True)


def fill(s, token, value):
    v = esc(value)
    return s.replace('<span class="ph">%s</span>' % token, v).replace(token, v)


def city_fill(s, lead):
    """[МІСТО]: після «в/у» (також з &nbsp;) — місцевий відмінок, інакше називний."""
    city = lead.get("city")
    loc = lead.get("city_loc") or city
    if not city:
        return s
    tok = r'(?:<span class="ph">\[МІСТО\]</span>|\[МІСТО\])'
    vowel = loc[:1].lower() in "аеєиіїоуюя"

    def prep(m):
        # милозвучність: «в Івано-Франківську», «у Калуші»
        p = ("в" if vowel else "у") if m.group(1).islower() else ("В" if vowel else "У")
        return p + m.group(2) + esc(loc)
    s = re.sub(r"\b([вуВУ])(\s+|&nbsp;)" + tok, prep, s)
    return re.sub(tok, esc(city), s)


def main():
    if len(sys.argv) != 3:
        fail("usage: personalize.py <lead.json> <outdir>")
    lead = json.load(open(sys.argv[1], encoding="utf-8"))
    out = sys.argv[2]
    name = lead.get("name") or fail("lead has no name")
    phone, e164 = lead.get("phone"), lead.get("phone_e164")
    if not (phone and e164):
        phone = e164 = None
    email = lead.get("email")
    ig, ig_handle = lead.get("instagram"), lead.get("instagram_handle")
    if ig and not ig_handle:
        m = re.search(r"instagram\.com/([^/?#]+)", ig)
        ig_handle = m.group(1) if m else None
    fb = lead.get("facebook")
    hours, hours_text = lead.get("hours"), lead.get("hours_text")
    address = lead.get("address")
    mq = urllib.parse.quote(lead.get("maps_query") or ", ".join(x for x in [address, lead.get("city")] if x) or "Івано-Франківськ")
    mobile = bool(e164 and e164.startswith("380") and e164[3:5] in UA_MOBILE)

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # ---------- JSON-LD ----------
    m = re.search(r'(<script type="application/ld\+json">\s*)(.*?)(\s*</script>)', s, re.S)
    ld = json.loads(m.group(2))
    city = lead.get("city") or "[МІСТО]"
    ld["name"] = name
    ld["description"] = ld["description"].replace("[МІСТО]", city)
    ld["address"]["addressLocality"] = city
    ld["areaServed"] = city
    if address:
        ld["address"]["streetAddress"] = address
    for key, val in [("telephone", phone), ("email", email)]:
        if val:
            ld[key] = val
        else:
            ld.pop(key, None)
    if lead.get("hours_osm"):
        ld["openingHours"] = lead["hours_osm"]
    else:
        ld.pop("openingHours", None)
    ld["sameAs"] = [u for u in [ig, fb] if u]
    if not ld["sameAs"]:
        ld.pop("sameAs")
    ld.pop("foundingDate", None)
    s = s[:m.start(2)] + json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/") + s[m.end(2):]

    # ---------- meta description ----------
    s = sub1(s, " [ТЕЛЕФОН]\">", (" " + esc(phone) + "\">") if phone else "\">")

    # ---------- телефон ----------
    if phone:
        s = s.replace("tel:+380000000000", "tel:+" + e164)
        s = fill(s, "[ТЕЛЕФОН]", phone)
    else:
        s, n = remove_all(s, 'data-need="phone"')
        if n < 3:
            fail("phone elements not found")
        s, _ = remove_all(s, '<div class="form-call"')
        if ig:  # мобільна панель: замість дзвінка — Instagram
            mb = find_el(s, '<nav class="mbar"')
            block = s[mb[0]:mb[1]].replace(
                '<a class="mbar-main"',
                '<a href="%s" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/>'
                '<circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>Instagram</a>\n  <a class="mbar-main"' % esc(ig), 1)
            s = s[:mb[0]] + block + s[mb[1]:]

    # ---------- email / instagram ----------
    if email:
        s = s.replace("mailto:hello@example.com", "mailto:" + esc(email))
        s = fill(s, "[EMAIL]", email)
    else:
        s, _ = remove_all(s, 'data-need="email"')
    if ig:
        s = s.replace("https://www.instagram.com/username/", esc(ig))
        s = fill(s, "[ІНСТАГРАМ]", "@" + ig_handle)
    else:
        s, _ = remove_all(s, 'data-need="instagram"')

    # ---------- графік ----------
    if hours_text:
        s = fill(s, "[ГОДИНИ]", hours_text)

    # ---------- карта і маршрут ----------
    s = s.replace("maps?q=" + TEMPLATE_MAP_Q + "&amp;output=embed", "maps?q=" + mq + "&amp;output=embed")
    s = s.replace("destination=" + TEMPLATE_MAP_Q, "destination=" + mq)

    # ---------- текстові токени ----------
    s = fill(s, "[НАЗВА]", name)
    s = city_fill(s, lead)
    if address:
        s = fill(s, "[АДРЕСА]", address)

    # ---------- js/config.js ----------
    form = []
    if mobile:
        form.append("sms")
    if ig:
        form.append("instagram")
    if email:
        form.append("email")
    if not form and not phone:
        fail("lead has no channel at all")
    cfg = {
        "tel": "tel:+" + e164 if phone else "",
        "telDisplay": phone or "",
        "sms": "sms:+" + e164 if mobile else "",
        "links": {"instagram": ig or "", "facebook": fb or "", "email": "mailto:" + email if email else ""},
        "igDirect": "https://ig.me/m/" + ig_handle if ig else "",
        "form": form,
        "hours": hours,
        "liveStatus": bool(hours),
        "rates": {"cosmetic": 0, "capital": 0, "design": 0, "newbuild": 0},
    }
    js_cfg = ("/* Дані клієнта: %s (згенеровано tools/personalize.py). Опис полів — у шаблоні budivnytstvo. */\n"
              "window.SITE = %s;\n" % (name.replace("*/", ""), json.dumps(cfg, ensure_ascii=False, indent=2)))

    # ---------- перевірки ----------
    for bad in ["380000000000", "example.com", "/username", "t.me/", "wa.me/", "viber://"]:
        if bad in s or bad in js_cfg:
            fail("sentinel left: " + bad)
    allowed = {"[ЦІНА]", "[ІМ'Я]", "[РІК]", "[ФОП]", "[ГОДИНИ]", "[АДРЕСА]"}
    left = set(re.findall(r"\[[А-ЯІЇЄҐA-Z']+\]", s))
    if left - allowed:
        fail("unexpected tokens left: %s" % sorted(left - allowed))
    json.loads(re.search(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', s, re.S).group(1))

    # ---------- запис ----------
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    for item in COPY:
        src, dst = os.path.join(ROOT, item), os.path.join(out, item)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        (shutil.copytree if os.path.isdir(src) else shutil.copy2)(src, dst)
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(s)
    open(os.path.join(out, "js", "config.js"), "w", encoding="utf-8").write(js_cfg)

    filled = ["назва", "місто"] + [k for k, v in [("адреса", address), ("телефон", phone), ("email", email), ("Instagram", ig),
                                                 ("Facebook", fb), ("графік роботи", hours or hours_text)] if v]
    hints = {"[ЦІНА]": "ціни «від … грн» у прайсі і ставки калькулятора (`js/config.js` → `rates`)",
             "[ІМ'Я]": "імена авторів відгуків (і самі відгуки — зараз приклади)", "[РІК]": "рік заснування",
             "[ФОП]": "ФОП / ЄДРПОУ у футері", "[ГОДИНИ]": "графік роботи", "[АДРЕСА]": "адреса"}
    readme = ["# %s — демо-сайт" % name, "", "Персоналізована копія шаблону `budivnytstvo` (ремонт квартир і будівництво).", "",
              "**Заповнено з OpenStreetMap:** " + ", ".join(filled) + "."]
    if lead.get("osm"):
        readme += ["", "Джерело: " + lead["osm"]]
    readme += ["", "**Ще треба заповнити** (на сторінці підкреслено бурштиновим пунктиром):", ""]
    readme += ["- `%s` — %s" % (t, hints.get(t, "")) for t in sorted(left)]
    readme += ["- фото до/після і галерея — замінити на реальні об'єкти бригади", ""]
    open(os.path.join(out, "README.md"), "w", encoding="utf-8").write("\n".join(readme))
    print("ok", lead.get("slug"), "->", out, "| left:", " ".join(sorted(left)), "| form:", ",".join(form) or "call-card")


if __name__ == "__main__":
    main()
