#!/usr/bin/env python3
"""Personalize the yuveliry (jewellery store & workshop) template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Standard library only. Reads the template next to this script and writes a
complete personalized copy into <outdir> (the template tree is not touched).
Known facts replace the bracket tokens and lose the placeholder marking;
unknown contact channels are removed cleanly (elements carry data-ch="...");
everything else unknown stays as a marked placeholder.
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
DAY_UA = {"1": "Понеділок", "2": "Вівторок", "3": "Середа", "4": "Четвер", "5": "П’ятниця", "6": "Субота", "0": "Неділя"}
DAY_SCHEMA = {"1": "Mo", "2": "Tu", "3": "We", "4": "Th", "5": "Fr", "6": "Sa", "0": "Su"}
ALLOWED_LEFT = {"[ЦІНА]", "[ІМ'Я]", "[РІК]", "[ФОП]", "[ГОДИНИ]"}


def esc(v):
    return html.escape(v, quote=True)


def norm_time(t):
    h, m = t.split(":")
    return "%02d:%s" % (int(h), m)


def remove_el(s, ch, tags=("a", "label")):
    """Remove every <a>/<label> carrying data-ch="<ch>", including its line indent and newline."""
    for tag in tags:
        s = re.sub(r'[ \t]*<%s\b[^>]*\bdata-ch="%s"[^>]*>.*?</%s>[ \t]*\n?' % (tag, re.escape(ch), tag), "", s, flags=re.S)
    return s


def sub1(s, old, new):
    if old not in s:
        raise SystemExit("template marker not found: %r" % old[:90])
    return s.replace(old, new)


def schema_hours(hours):
    out, i = [], 0
    while i < len(DAY_ORDER):
        h = hours.get(DAY_ORDER[i])
        if not h:
            i += 1
            continue
        j = i
        while j + 1 < len(DAY_ORDER) and hours.get(DAY_ORDER[j + 1]) and \
                [norm_time(x) for x in hours[DAY_ORDER[j + 1]]] == [norm_time(x) for x in h]:
            j += 1
        span = DAY_SCHEMA[DAY_ORDER[i]] if i == j else DAY_SCHEMA[DAY_ORDER[i]] + "-" + DAY_SCHEMA[DAY_ORDER[j]]
        out.append("%s %s-%s" % (span, norm_time(h[0]), norm_time(h[1])))
        i = j + 1
    return out


def personalize(lead, outdir):
    name = (lead.get("name") or "").strip() or None
    city = lead.get("city") or None
    city_loc = lead.get("city_loc") or city
    address = lead.get("address") or None
    phone = lead.get("phone") or None
    e164 = (lead.get("phone_e164") or "").lstrip("+") or None
    if phone and not e164:
        e164 = re.sub(r"\D", "", phone)
    if e164 and not phone:
        phone = "+" + e164
    email = lead.get("email") or None
    ig = lead.get("instagram") or None
    ig_handle = (lead.get("instagram_handle") or "").lstrip("@") or None
    if ig and not ig_handle:
        ig_handle = ig.rstrip("/").split("?")[0].split("/")[-1] or None
    if ig_handle and not ig:
        ig = "https://www.instagram.com/%s/" % ig_handle
    fb = lead.get("facebook") or None
    hours = lead.get("hours") or None
    if hours and not any(hours.get(k) for k in DAY_ORDER):
        hours = None
    hours_text = lead.get("hours_text") or None
    maps_query = lead.get("maps_query") or ", ".join(x for x in [address, city] if x) or "Івано-Франківськ"

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    js = open(os.path.join(ROOT, "js", "main.js"), encoding="utf-8").read()

    # ---------- JSON-LD: edit as data, re-serialize ----------
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    if name:
        ld["name"] = name
    if city:
        loc = ("в " if city_loc[:1].upper() in "АЕЄИІЇОУЮЯ" else "у ") + city_loc
        ld["description"] = ld["description"].replace("у [МІСТО]", loc).replace("[МІСТО]", city)
        ld["address"]["addressLocality"] = city
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

    # ---------- contact channels ----------
    for ch in ("viber", "telegram", "whatsapp"):
        s = remove_el(s, ch)
    if not ig:
        s = remove_el(s, "instagram")
    if not fb:
        s = remove_el(s, "facebook")
    if not email:
        s = remove_el(s, "email")

    hero_call = '<a class="btn btn-line" data-ch="phone" href="tel:+380000000000"><svg aria-hidden="true"><use href="#i-phone"/></svg>Зателефонувати</a>'
    bar_call = '<a data-ch="phone-bar" href="tel:+380000000000"><svg aria-hidden="true"><use href="#i-phone"/></svg>Подзвонити</a>'
    if phone:
        s = s.replace("tel:+380000000000", "tel:+" + e164)
    else:
        if ig:
            s = sub1(s, hero_call, '<a class="btn btn-line" href="%s" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-ig"/></svg>Написати в Instagram</a>' % esc(ig))
            s = sub1(s, bar_call, '<a href="%s" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-ig"/></svg>Instagram</a>' % esc(ig))
        else:
            s = sub1(s, "        " + hero_call + "\n", "")
            s = sub1(s, "  " + bar_call + "\n", "")
            s = sub1(s, '<nav class="actionbar"', '<nav class="actionbar ab-2"')
            # the Записатися button is now the bar's first child: keep it highlighted
            s = sub1(s, '<nav class="actionbar ab-2" aria-label="Швидкі дії">\n  <a href="#zapys">',
                     '<nav class="actionbar ab-2" aria-label="Швидкі дії">\n  <a class="ab-main" href="#zapys">')
        s = remove_el(s, "phone")
        s = sub1(s, ", тел. [ТЕЛЕФОН].", ".")

    # contact buttons grid: size class by count, drop it when empty
    cm = re.search(r'([ \t]*<div class="channels" data-channels>\n)(.*?)([ \t]*</div>\n)', s, re.S)
    n = len(re.findall(r'<a class="ch"', cm.group(2)))
    if n == 0:
        s = s[:cm.start()] + s[cm.end():]
    else:
        s = s[:cm.start()] + cm.group(1).replace('class="channels"', 'class="channels n%d"' % n) + cm.group(2) + cm.group(3) + s[cm.end():]

    # ---------- form channels ----------
    if not phone:
        s = remove_el(s, "sms")
    vias = (["sms"] if phone else []) + (["instagram"] if ig else []) + (["email"] if email else [])
    fs = re.search(r'[ \t]*<fieldset class="field via" data-via>.*?</fieldset>\n', s, re.S)
    block = fs.group(0).replace(" checked>", ">")
    if vias:
        block = block.replace('value="%s">' % vias[0], 'value="%s" checked>' % vias[0], 1)
        if len(vias) == 1:
            block = block.replace('<fieldset class="field via" data-via>', '<fieldset class="field via" data-via hidden>', 1)
        s = s[:fs.start()] + block + s[fs.end():]
    else:
        s = s[:fs.start()] + s[fs.end():]
    sub_txt = {
        ("sms",): "Заповніть форму — відкриється SMS із готовою заявкою, вам залишиться лише надіслати її.",
        ("instagram",): "Заповніть форму — ми скопіюємо текст заявки й відкриємо Instagram Direct, вам залишиться вставити й надіслати.",
        ("email",): "Заповніть форму — відкриється лист із готовою заявкою, вам залишиться лише надіслати його.",
        (): "Заповніть форму — ми підготуємо й скопіюємо текст заявки, щоб ви могли надіслати його нам.",
    }.get(tuple(vias), "Заповніть форму й оберіть, куди надіслати, — відкриється повідомлення з готовим текстом.")
    s = re.sub(r'(<p class="form-sub" data-form-sub>).*?(</p>)', lambda mm: mm.group(1) + sub_txt + mm.group(2), s, flags=re.S)
    contact_js = ("  var CONTACT = {\n    sms: %s,\n    viber: '',\n    whatsapp: '',\n    telegram: '',\n    instagram: %s,\n    email: %s\n  };" % (
        json.dumps("+" + e164) if phone else "''",
        json.dumps(ig_handle) if ig_handle else "''",
        json.dumps(email) if email else "''"))
    js = re.sub(r"  var CONTACT = \{.*?\};", lambda mm: contact_js, js, count=1, flags=re.S)
    if name:
        js = js.replace("var BIZ = '[НАЗВА]';", "var BIZ = %s;" % json.dumps(name, ensure_ascii=False))

    # ---------- hours ----------
    if hours:
        lis = []
        for d in DAY_ORDER:
            h = hours.get(d)
            if h:
                a, b = norm_time(h[0]), norm_time(h[1])
                lis.append('          <li data-day="%s" data-hours="%s-%s"><span>%s</span><span>%s–%s</span></li>' % (d, a, b, DAY_UA[d], a, b))
            else:
                lis.append('          <li data-day="%s" data-hours=""><span>%s</span><span>вихідний</span></li>' % (d, DAY_UA[d]))
        s = re.sub(r'[ \t]*<!-- Графік.*?-->\n[ \t]*<ul class="hours-list" data-hours-list>.*?</ul>',
                   lambda mm: '        <ul class="hours-list" data-hours-list>\n' + "\n".join(lis) + "\n        </ul>", s, count=1, flags=re.S)
    else:
        # no structured hours: drop the table and the live status (they would show template defaults as fact)
        s = re.sub(r'[ \t]*<!-- Графік.*?-->\n[ \t]*<ul class="hours-list" data-hours-list>.*?</ul>\n', "", s, count=1, flags=re.S)
        s = re.sub(r'[ \t]*<p class="status" data-status hidden>.*?</p>\n', "", s, count=1, flags=re.S)
    if hours_text or hours:
        s = sub1(s, '<span class="ph">[ГОДИНИ]</span>', esc(hours_text or "; ".join(schema_hours(hours))))

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
    if city:
        vowel = city_loc[:1].upper() in "АЕЄИІЇОУЮЯ"

        def prep(mm):
            p = mm.group(1)
            if vowel:  # милозвучність: «в Івано-Франківську»
                p = "В" if p.isupper() else "в"
            return p + " " + esc(city_loc)
        s = re.sub(r"(?<![\wА-яІіЇїЄєҐґ'’])([вуВУ]) (?:<span class=\"ph\">)?\[МІСТО\](?:</span>)?", prep, s)
    vals = {"[НАЗВА]": name, "[МІСТО]": city, "[АДРЕСА]": address, "[ТЕЛЕФОН]": phone, "[EMAIL]": email,
            "[ІНСТАГРАМ]": ("@" + ig_handle) if ig_handle else None}
    for tok, v in vals.items():
        if v:
            s = s.replace('<span class="ph">%s</span>' % tok, esc(v)).replace(tok, esc(v))
    if not address:
        # keep the visible placeholder but don't leave "[АДРЕСА]" in the meta description
        s = s.replace(" Адреса: [АДРЕСА], тел.", " Тел.").replace(" Адреса: [АДРЕСА].", "")

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
    if not phone and not ig:
        with open(os.path.join(outdir, "css", "style.css"), "a", encoding="utf-8") as f:
            f.write("\n.actionbar a.ab-main{background:var(--gold);color:var(--ink)}.actionbar a.ab-main svg{color:var(--ink)}.actionbar.ab-2 a:nth-child(2){background:none;color:var(--ivory)}.actionbar.ab-2 a:nth-child(2) svg{color:var(--gold-hi)}\n")

    left = sorted(set(re.findall(r"\[[A-ZА-ЯІЇЄҐ'’ ]{2,}\]", s + js)))
    bad = [t for t in left if t not in ALLOWED_LEFT and t not in ("[АДРЕСА]", "[ТЕЛЕФОН]", "[EMAIL]", "[МІСТО]", "[НАЗВА]")]
    if bad:
        raise SystemExit("unexpected tokens left: %s" % bad)
    filled = [lbl for lbl, v in [("назва", name), ("місто", city), ("адреса", address), ("телефон", phone), ("email", email),
                                 ("Instagram", ig), ("Facebook", fb), ("графік роботи", hours or hours_text)] if v]
    hints = {"[ЦІНА]": "ціни у вітрині та прайсі майстерні («від … грн»)", "[ІМ'Я]": "ім’я майстра й авторів відгуків",
             "[РІК]": "рік заснування (бейдж на головному екрані, підпис фото майстра)", "[ФОП]": "ФОП / ЄДРПОУ у футері",
             "[ГОДИНИ]": "графік роботи (контакти)", "[АДРЕСА]": "адреса", "[ТЕЛЕФОН]": "телефон", "[EMAIL]": "email",
             "[МІСТО]": "місто", "[НАЗВА]": "назва"}
    readme = ["# %s — демо-сайт ювелірного магазину й майстерні" % (name or "Ювелірний магазин"), "",
              "Шаблон: **yuveliry** (ювелірний магазин / майстерня).", "",
              "Заповнено з OpenStreetMap: " + (", ".join(filled) if filled else "нічого") + ".", "",
              "Залишилося заповнити (позначено жовтим пунктиром на сторінці):", ""]
    for t in left:
        readme.append("- `%s` — %s" % (t, hints.get(t, "")))
    readme += ["- три відгуки з міткою «Приклад відгуку» — замінити на реальні",
               "- фото (зараз стокові з Unsplash) — замінити на фото виробів і майстерні",
               "- категорії вітрини й перелік послуг майстерні — звірити з реальними"]
    if not hours:
        readme.append("- точний графік по днях — тоді повернеться статус «зараз відчинено / зачинено»")
    open(os.path.join(outdir, "README.md"), "w", encoding="utf-8").write("\n".join(readme) + "\n")
    return left


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    lead = json.load(open(sys.argv[1], encoding="utf-8"))
    left = personalize(lead, sys.argv[2])
    print("ok", lead.get("slug"), "left:", " ".join(left))


if __name__ == "__main__":
    main()
