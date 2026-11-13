#!/usr/bin/env python3
"""Personalize the advokat template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Standard library only. Reads the template next to this script and writes a
complete personalized copy into <outdir> (the template tree is not touched).

- Individual lawyers ("Кравець Олена Мирославівна", "Данилів Т.Д.") are shown
  as "Адвокат <ПІБ>" (header uses the short form "Адвокат Кравець О. М.").
- Unknown facts stay as marked placeholders; unknown contact channels are
  removed cleanly (elements carry data-ch="..." markers in the template).
- The booking form sends by SMS (mobile numbers only) and/or email; with
  neither it turns into a "call us" card.
"""
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY = ["index.html", "robots.txt", "css", "js", "fonts", "img/favicon.svg"]
DAY_ORDER = ["1", "2", "3", "4", "5", "6", "0"]
DAY_UA = {"1": "Понеділок", "2": "Вівторок", "3": "Середа", "4": "Четвер", "5": "П'ятниця", "6": "Субота", "0": "Неділя"}
DAY_SHORT = {"1": "Пн", "2": "Вт", "3": "Ср", "4": "Чт", "5": "Пт", "6": "Сб", "0": "Нд"}
DAY_SCHEMA = {"1": "Mo", "2": "Tu", "3": "We", "4": "Th", "5": "Fr", "6": "Sa", "0": "Su"}
OSM_DAYS = {"Mo": "Пн", "Tu": "Вт", "We": "Ср", "Th": "Чт", "Fr": "Пт", "Sa": "Сб", "Su": "Нд", "PH": "свята"}
MOBILE = {"39", "50", "63", "66", "67", "68", "73", "77", "91", "92", "93", "94", "95", "96", "97", "98", "99"}
ALLOWED_LEFT = {"[ЦІНА]", "[ІМ'Я]", "[РІК]", "[ФОП]", "[ГОДИНИ]"}
PATRONYMIC = re.compile(r"(ович|евич|йович|івна|ївна|ічна|овна)$")


def esc(v):
    return html.escape(v, quote=True)


def sub1(s, old, new):
    if old not in s:
        raise SystemExit("template marker not found: %r" % old[:90])
    return s.replace(old, new)


def remove_el(s, ch, tags=("a", "p", "label")):
    for tag in tags:
        s = re.sub(r'[ \t]*<%s\b[^>]*\bdata-ch="%s"[^>]*>.*?</%s>[ \t]*\n?' % (tag, re.escape(ch), tag), "", s, flags=re.S)
    return s


def norm_time(t):
    h, m = t.split(":")
    return "%02d:%s" % (int(h), m)


def person_names(name):
    """Return (full, short) display names if the lead is an individual, else None."""
    n = re.sub(r"\s+", " ", name.strip())
    m = re.fullmatch(r"([А-ЯІЇЄҐ][а-яіїєґ'’\-]+)\s+([А-ЯІЇЄҐ])\.\s*([А-ЯІЇЄҐ])\.?", n)
    if m:
        full = "%s %s. %s." % m.groups()
        return full, full
    parts = n.split(" ")
    if len(parts) == 3 and all(re.fullmatch(r"[А-ЯІЇЄҐ][а-яіїєґ'’\-]+", p) for p in parts) and PATRONYMIC.search(parts[2]):
        return n, "%s %s. %s." % (parts[0], parts[1][0], parts[2][0])
    return None


def schema_hours(hours):
    out, i = [], 0
    while i < 7:
        h = hours.get(DAY_ORDER[i])
        if not h:
            i += 1
            continue
        j = i
        while j + 1 < 7 and hours.get(DAY_ORDER[j + 1]) and [norm_time(x) for x in hours[DAY_ORDER[j + 1]]] == [norm_time(x) for x in h]:
            j += 1
        span = DAY_SCHEMA[DAY_ORDER[i]] if i == j else DAY_SCHEMA[DAY_ORDER[i]] + "-" + DAY_SCHEMA[DAY_ORDER[j]]
        out.append("%s %s-%s" % (span, norm_time(h[0]), norm_time(h[1])))
        i = j + 1
    return out


def ua_hours_text(t):
    """hours_text may be raw OSM ("Mo-Fr 09:00-13:00, 14:00-18:00"): make it Ukrainian."""
    if not re.search(r"\b(Mo|Tu|We|Th|Fr|Sa|Su)\b", t):
        return t
    t = re.sub(r"\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b", lambda m: OSM_DAYS[m.group(1)], t)
    t = re.sub(r"\b(\d):(\d\d)", r"0\1:\2", t)
    t = re.sub(r"(?<=[А-Яа-яі\d])\s*-\s*(?=[А-Яа-я\d])", "–", t)
    t = re.sub(r"\b(off|closed)\b", "вихідний", t)
    return t.replace(";", ",")


def personalize(lead, outdir):
    raw_name = (lead.get("name") or "").strip() or None
    city = lead.get("city") or None
    city_loc = lead.get("city_loc") or city
    address = lead.get("address") or None
    phone = lead.get("phone") or None
    e164 = (lead.get("phone_e164") or "").lstrip("+") or None
    if phone and not e164:
        e164 = re.sub(r"\D", "", phone)
    if e164 and not phone:
        phone = "+" + e164
    mobile = bool(e164 and e164.startswith("380") and len(e164) == 12 and e164[3:5] in MOBILE)
    email = lead.get("email") or None
    ig = lead.get("instagram") or None
    ig_handle = lead.get("instagram_handle") or (ig.rstrip("/").split("/")[-1] if ig else None)
    fb = lead.get("facebook") or None
    hours = lead.get("hours") or None
    if hours and not any(hours.get(k) for k in DAY_ORDER):
        hours = None
    hours_text = lead.get("hours_text") or None
    if hours_text:
        hours_text = ua_hours_text(hours_text)
    maps_query = lead.get("maps_query") or ", ".join(x for x in [address, city] if x) or "Івано-Франківськ"

    # ---------- name presentation ----------
    person = person_names(raw_name) if raw_name else None
    if person:
        name = "Адвокат " + person[0]
        short = "Адвокат " + person[1]
    elif raw_name:
        latin = not re.search(r"[А-Яа-яІіЇїЄєҐґ]", raw_name)
        name = raw_name if (latin or raw_name.startswith("«")) else "«%s»" % raw_name
        short = name
    else:
        name = short = None

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    js = open(os.path.join(ROOT, "js", "main.js"), encoding="utf-8").read()

    # ---------- JSON-LD (edit as data, re-serialize) ----------
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    if name:
        ld["name"] = name
    if person:
        ld["@type"] = ["LegalService", "Attorney"]
    if city:
        prep = "в" if city_loc[:1].upper() in "АЕЄИІЇОУЮЯ" else "у"
        ld["description"] = ld["description"].replace("у [МІСТО]", prep + " " + city_loc)
        ld["address"]["addressLocality"] = city
        ld["areaServed"] = city
    if address:
        ld["address"]["streetAddress"] = address
    else:
        ld["address"].pop("streetAddress", None)
    for key, val in (("telephone", phone), ("email", email)):
        if val:
            ld[key] = val
        else:
            ld.pop(key, None)
    ld.pop("priceRange", None)
    if hours:
        ld["openingHours"] = schema_hours(hours)
    else:
        ld.pop("openingHours", None)
    same = [u for u in (ig, fb) if u]
    if same:
        ld["sameAs"] = same
    else:
        ld.pop("sameAs", None)
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/")
    s = s[:m.start(2)] + "\n" + ld_txt + "\n" + s[m.end(2):]

    # ---------- head texts for individuals (avoid "Адвокат X — адвокат") ----------
    if person:
        s = sub1(s, "<title>[НАЗВА] — адвокат, юридична консультація у [МІСТО]</title>",
                 "<title>[НАЗВА] — юридична консультація у [МІСТО]</title>")
        s = sub1(s, 'content="[НАЗВА] — адвокат у [МІСТО]"', 'content="[НАЗВА] — юридична допомога у [МІСТО]"')

    # ---------- channels ----------
    for ch in ("viber", "telegram", "whatsapp"):
        s = remove_el(s, ch)
    if not ig:
        s = remove_el(s, "instagram")
    if not fb:
        s = remove_el(s, "facebook")
    if not email:
        s = remove_el(s, "email")
    if not mobile:
        s = remove_el(s, "sms")

    hero_call = '<a class="btn btn-ghost" data-ch="phone" href="tel:+380000000000"><svg aria-hidden="true"><use href="#i-phone"/></svg>Зателефонувати</a>'
    if phone:
        s = s.replace("tel:+380000000000", "tel:+" + e164)
    else:
        alt = None
        if email:
            alt = '<a class="btn btn-ghost" href="mailto:%s"><svg aria-hidden="true"><use href="#i-mail"/></svg>Написати листа</a>' % esc(email)
        elif ig:
            alt = '<a class="btn btn-ghost" href="%s" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-ig"/></svg>Написати в Instagram</a>' % esc(ig)
        s = sub1(s, hero_call, alt or "")
        s = remove_el(s, "phone")
        s = sub1(s, '<nav class="actionbar"', '<nav class="actionbar ab-2"')

    # contact buttons: drop the grid if only "Подзвонити" (duplicate of the big number) remains
    cm = re.search(r'([ \t]*<div class="channels" data-channels>\n)(.*?)([ \t]*</div>\n)', s, re.S)
    items = re.findall(r'data-ch="([a-z]+)"', cm.group(2))
    if not items or items == ["phone"]:
        s = s[:cm.start()] + s[cm.end():]

    # ---------- booking form ----------
    vias = (["sms"] if mobile else []) + (["email"] if email else [])
    fs = re.search(r'<fieldset class="field via" data-via>.*?</fieldset>', s, re.S)
    if vias:
        block = fs.group(0).replace(" checked>", ">")
        block = block.replace('value="%s">' % vias[0], 'value="%s" checked>' % vias[0], 1)
        if len(vias) == 1:
            block = block.replace('<fieldset class="field via" data-via>', '<fieldset class="field via" data-via hidden>', 1)
        s = s[:fs.start()] + block + s[fs.end():]
        sub_txt = {
            ("sms",): "Заповніть форму — відкриється SMS із готовим текстом заявки, вам залишиться лише надіслати його.",
            ("email",): "Заповніть форму — відкриється лист із готовим текстом заявки, вам залишиться лише надіслати його.",
            ("sms", "email"): "Заповніть форму — заявка відкриється в SMS або листі, вам залишиться лише надіслати її.",
        }[tuple(vias)]
        s = re.sub(r'(<p class="form-sub" data-form-sub>).*?(</p>)', lambda mm: mm.group(1) + sub_txt + mm.group(2), s, count=1, flags=re.S)
    elif phone:
        # landline only, no email: no way to deliver a written request -> "call us" card
        card = ('<div class="form call-only reveal" id="zapys">\n'
                '          <h3>Запис на консультацію</h3>\n'
                '          <p class="form-sub">Зателефонуйте — домовимося про зручний час і підкажемо, які документи взяти з собою.</p>\n'
                '          <a class="btn btn-primary btn-wide" href="tel:+%s"><svg aria-hidden="true"><use href="#i-phone"/></svg>%s</a>\n'
                '        </div>') % (e164, esc(phone))
        f = re.search(r'<form class="form reveal" id="zapys".*?</form>', s, re.S)
        s = s[:f.start()] + card + s[f.end():]
    else:
        s = s[:fs.start()] + s[fs.end():]
        s = re.sub(r'(<p class="form-sub" data-form-sub>).*?(</p>)', lambda mm: mm.group(1) + "Заповніть форму — текст заявки буде скопійовано, щоб ви могли надіслати його зручним способом." + mm.group(2), s, count=1, flags=re.S)
    contact_js = "  var CONTACT = {\n    telegram: '',\n    viber: '',\n    sms: %s,\n    email: %s\n  };" % (
        json.dumps("sms:+" + e164) if mobile else "''",
        json.dumps("mailto:" + email) if email else "''")
    js = re.sub(r"  var CONTACT = \{.*?\};", lambda mm: contact_js, js, count=1, flags=re.S)
    if name:
        js = js.replace("var BIZ_NAME = '[НАЗВА]';", "var BIZ_NAME = %s;" % json.dumps(name, ensure_ascii=False))

    # ---------- hours ----------
    status_re = r'[ \t]*<span class="status" data-status hidden></span>'
    if hours:
        lis = []
        for d in DAY_ORDER:
            h = hours.get(d)
            if h:
                a, b = norm_time(h[0]), norm_time(h[1])
                lis.append('              <li data-day="%s" data-hours="%s-%s"><span>%s</span><span>%s–%s</span></li>' % (d, a, b, DAY_UA[d], a, b))
            else:
                lis.append('              <li data-day="%s" data-hours=""><span>%s</span><span>вихідний</span></li>' % (d, DAY_UA[d]))
        s = re.sub(r'[ \t]*<!-- Графік.*?-->\n[ \t]*<ul class="hours-list" data-hours>.*?</ul>',
                   lambda mm: '            <ul class="hours-list" data-hours>\n' + "\n".join(lis) + "\n            </ul>", s, count=1, flags=re.S)
        if not hours_text:
            hours_text = ", ".join(schema_hours(hours))
        # the table already shows everything -> drop the duplicate summary line under it
        s = re.sub(r'[ \t]*<p class="hours-sum">.*?</p>\n', "", s, count=1)
    else:
        # no structured hours: hide the live status and the default table (they'd show fake data)
        s = re.sub(r'[ \t]*<!-- Графік.*?-->\n[ \t]*<ul class="hours-list" data-hours>.*?</ul>\n', "", s, count=1, flags=re.S)
        s = re.sub(status_re, "", s)
        s = s.replace('<p class="hours-sum">', '<p class="hours-sum hours-only">')
    if hours_text:
        s = s.replace('<span class="ph">[ГОДИНИ]</span>', esc(hours_text))

    # ---------- links ----------
    q = quote(maps_query, safe="")
    s = re.sub(r'https://www\.google\.com/maps\?q=[^"&]*&amp;output=embed', "https://www.google.com/maps?q=%s&amp;output=embed" % q, s)
    s = re.sub(r'https://www\.google\.com/maps/dir/\?api=1&amp;destination=[^"]*', "https://www.google.com/maps/dir/?api=1&amp;destination=%s" % q, s)
    if email:
        s = s.replace("mailto:hello@example.com", "mailto:" + esc(email))
    if ig:
        s = s.replace("https://www.instagram.com/username/", esc(ig))
    if fb:
        s = s.replace("https://www.facebook.com/username", esc(fb))

    # ---------- tokens ----------
    if short:
        s = sub1(s, '<span class="brand-name"><span class="ph">[НАЗВА]</span></span>', '<span class="brand-name">%s</span>' % esc(short))
        s = sub1(s, '<p>© <span data-year>2026</span> <span class="ph">[НАЗВА]</span></p>', '<p>© <span data-year>2026</span> %s</p>' % esc(short))
    if city:
        vowel = city_loc[:1].upper() in "АЕЄИІЇОУЮЯ"

        def prep(mm):
            p = mm.group(1)
            if vowel:
                p = "В" if p.isupper() else "в"
            return p + " " + esc(city_loc)
        s = re.sub(r"(?<![\wА-яІіЇїЄєҐґ'])([уУ]) (?:<span class=\"ph\">)?\[МІСТО\](?:</span>)?", prep, s)
    vals = {"[НАЗВА]": name, "[МІСТО]": city, "[АДРЕСА]": address, "[ТЕЛЕФОН]": phone, "[EMAIL]": email,
            "[ІНСТАГРАМ]": ("@" + ig_handle.lstrip("@")) if ig_handle else None}
    for tok, v in vals.items():
        if v:
            s = s.replace('<span class="ph">%s</span>' % tok, esc(v)).replace(tok, esc(v))
    if not address:
        # "[АДРЕСА], Місто" -> keep the placeholder (allowed to fill later)
        pass

    # ---------- write ----------
    if os.path.exists(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    for rel in COPY:
        src, dst = os.path.join(ROOT, rel), os.path.join(outdir, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
    open(os.path.join(outdir, "index.html"), "w", encoding="utf-8").write(s)
    open(os.path.join(outdir, "js", "main.js"), "w", encoding="utf-8").write(js)

    left = sorted(set(re.findall(r"\[[A-ZА-ЯІЇЄҐ'’ ]{2,}\]", s + js)))
    filled = [lbl for lbl, v in [("назва", raw_name), ("місто", city), ("адреса", address), ("телефон", phone), ("email", email),
                                 ("Instagram", ig), ("Facebook", fb), ("графік роботи", hours or hours_text)] if v]
    hints = {"[ЦІНА]": "ціни послуг (прайс, головний екран, FAQ)", "[ІМ'Я]": "імена авторів відгуків",
             "[РІК]": "рік початку практики (блок «Про практику»)", "[ФОП]": "ФОП / РНОКПП або назва юрособи й ЄДРПОУ у футері",
             "[ГОДИНИ]": "графік роботи (у записці на головному екрані та в контактах)", "[АДРЕСА]": "адреса"}
    readme = ["# %s — демо-сайт" % (name or "Адвокат"), "",
              "Шаблон: **advokat** (адвокат / юридичні послуги).", "",
              "Заповнено з OpenStreetMap: " + (", ".join(filled) if filled else "нічого") + ".", "",
              "Залишилося заповнити (позначені жовтим пунктиром на сторінці):", ""]
    for t in left:
        readme.append("- `%s` — %s" % (t, hints.get(t, "")))
    readme += ["- три відгуки з міткою «Приклад відгуку» — замінити на реальні",
               "- фото (зараз стокові з Unsplash) — замінити на фото адвоката й кабінету",
               "- напрями практики в навігаторі справи та прайсі — звірити з реальними"]
    open(os.path.join(outdir, "README.md"), "w", encoding="utf-8").write("\n".join(readme) + "\n")
    return left


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    lead = json.load(open(sys.argv[1], encoding="utf-8"))
    left = personalize(lead, sys.argv[2])
    bad = [t for t in left if t not in ALLOWED_LEFT]
    print("ok", lead.get("slug"), "left:", " ".join(left), ("UNEXPECTED: " + " ".join(bad)) if bad else "")


if __name__ == "__main__":
    main()
