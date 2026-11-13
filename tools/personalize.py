#!/usr/bin/env python3
"""Personalize the optyka template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Standard library only. Reads the template next to this script and writes a
complete personalized copy into <outdir> (the template tree is not touched).
Unknown facts stay as marked placeholders; unknown contact channels are removed
cleanly (every channel element carries data-ch="..." in the template).
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
MOBILE_CODES = {"39", "50", "63", "66", "67", "68", "73", "77", "91", "92", "93", "94", "95", "96", "97", "98", "99"}
VOWELS = "АЕЄИІЇОУЮЯ"


def esc(v):
    return html.escape(v, quote=True)


def norm_time(t):
    h, m = t.split(":")
    return "%02d:%s" % (int(h), m)


def remove_ch(s, ch):
    """Remove every a/label/div/p element carrying data-ch="<ch>" (with its line)."""
    for tag in ("a", "label", "div", "p"):
        s = re.sub(r'[ \t]*<%s\b[^>]*\bdata-ch="%s"[^>]*>.*?</%s>[ \t]*\n?' % (tag, re.escape(ch), tag), "", s, flags=re.S)
    return s


def sub1(s, old, new):
    if old not in s:
        raise SystemExit("template marker not found: %r" % old[:80])
    return s.replace(old, new)


def spans(hours):
    """Group equal consecutive days: [(first, last, (open, close) or None)]."""
    out, i = [], 0
    while i < len(DAY_ORDER):
        h = hours.get(DAY_ORDER[i])
        key = tuple(norm_time(x) for x in h) if h else None
        j = i
        while j + 1 < len(DAY_ORDER):
            h2 = hours.get(DAY_ORDER[j + 1])
            if (tuple(norm_time(x) for x in h2) if h2 else None) != key:
                break
            j += 1
        out.append((DAY_ORDER[i], DAY_ORDER[j], key))
        i = j + 1
    return out


def schema_hours(hours):
    res = []
    for a, b, k in spans(hours):
        if k:
            d = DAY_SCHEMA[a] if a == b else DAY_SCHEMA[a] + "-" + DAY_SCHEMA[b]
            res.append("%s %s-%s" % (d, k[0], k[1]))
    return res


def text_hours(hours):
    res = []
    for a, b, k in spans(hours):
        d = DAY_SHORT[a] if a == b else DAY_SHORT[a] + "–" + DAY_SHORT[b]
        res.append("%s %s" % (d, ("%s–%s" % k) if k else "вихідний"))
    return ", ".join(res)


def personalize(lead, outdir):
    name = (lead.get("name") or "").strip() or None
    city = lead.get("city") or None
    city_loc = lead.get("city_loc") or city
    address = lead.get("address") or None
    phone = lead.get("phone") or None
    e164 = re.sub(r"\D", "", lead.get("phone_e164") or "") or None
    if phone and not e164:
        e164 = re.sub(r"\D", "", phone)
        if e164.startswith("0"):
            e164 = "38" + e164
    if e164 and not phone:
        phone = "+" + e164
    mobile = bool(e164 and e164.startswith("380") and e164[3:5] in MOBILE_CODES)
    email = lead.get("email") or None
    ig = lead.get("instagram") or None
    ig_handle = lead.get("instagram_handle") or None
    if ig and not ig_handle:
        ig_handle = ig.rstrip("/").split("/")[-1]
    fb = lead.get("facebook") or None
    hours = lead.get("hours") or None
    if hours and not any(hours.get(k) for k in DAY_ORDER):
        hours = None
    hours_text = lead.get("hours_text") or None
    maps_query = lead.get("maps_query") or ", ".join(x for x in [address, city] if x) or "Івано-Франківськ"

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # ---------- JSON-LD (edit as data, re-serialize) ----------
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    if name:
        ld["name"] = name
    if city:
        prep = "в " if city_loc[:1].upper() in VOWELS else "у "
        ld["description"] = ld["description"].replace("у [МІСТО]", prep + city_loc).replace("[МІСТО]", city)
        ld["address"]["addressLocality"] = city
    if address:
        ld["address"]["streetAddress"] = address
    else:
        ld["address"].pop("streetAddress", None)
    if phone:
        ld["telephone"] = phone
    else:
        ld.pop("telephone", None)
    if email:
        ld["email"] = email
    else:
        ld.pop("email", None)
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

    # ---------- channels ----------
    for ch in ("viber", "telegram", "whatsapp"):
        s = remove_ch(s, ch)
    if not ig:
        s = remove_ch(s, "instagram")
    if not fb:
        s = remove_ch(s, "facebook")
    if not email:
        s = remove_ch(s, "email")
    if not mobile:
        s = remove_ch(s, "sms")

    hero_call = '<a class="btn btn-line" data-ch="phone" data-cta="call" href="tel:+380000000000"><svg aria-hidden="true"><use href="#i-phone"/></svg>Зателефонувати</a>'
    bar_call = '<a data-ch="phone" data-cta="call" href="tel:+380000000000"><svg aria-hidden="true"><use href="#i-phone"/></svg>Подзвонити</a>'
    if phone:
        s = s.replace("+380000000000", "+" + e164)
    else:
        if ig:
            s = sub1(s, hero_call, '<a class="btn btn-line" href="%s" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-ig"/></svg>Написати в Instagram</a>' % esc(ig))
            s = sub1(s, bar_call, '<a href="%s" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-ig"/></svg>Instagram</a>' % esc(ig))
        else:
            s = sub1(s, '<nav class="actionbar"', '<nav class="actionbar ab-2"')
        s = remove_ch(s, "phone")

    # contact buttons: drop the grid if it would only repeat the big phone number
    cm = re.search(r'([ \t]*<div class="channels" data-channels>\n)(.*?)([ \t]*</div>\n)', s, re.S)
    items = re.findall(r'<a class="ch"[^>]*data-ch="([a-z]+)"', cm.group(2))
    if not items or items == ["phone"]:
        s = s[:cm.start()] + s[cm.end():]
    else:
        s = s[:cm.start()] + cm.group(1).replace('class="channels"', 'class="channels n%d"' % len(items)) + cm.group(2) + cm.group(3) + s[cm.end():]

    # ---------- booking form channels ----------
    fs = re.search(r'<fieldset class="field via" data-via>.*?</fieldset>', s, re.S)
    vias = re.findall(r'value="([a-z]+)"', fs.group(0))
    if vias:
        block = fs.group(0).replace(" checked>", ">")
        block = block.replace('value="%s" ' % vias[0], 'value="%s" checked ' % vias[0], 1)
        if 'checked' not in block:
            raise SystemExit("could not preselect form channel")
        if len(vias) == 1:
            block = block.replace('<fieldset class="field via" data-via>', '<fieldset class="field via" data-via hidden>', 1)
        s = s[:fs.start()] + block + s[fs.end():]
    else:
        s = s[:fs.start()] + s[fs.end():]
    names = {"sms": "SMS", "instagram": "Instagram Direct", "email": "email"}
    if vias == ["sms"]:
        sub_txt = "Заповніть форму — відкриється SMS із готовою заявкою, вам залишиться лише надіслати її. Ми підтвердимо час."
    elif vias == ["email"]:
        sub_txt = "Заповніть форму — відкриється лист із готовою заявкою, вам залишиться лише надіслати його. Ми підтвердимо час."
    elif vias == ["instagram"]:
        sub_txt = "Заповніть форму — ми скопіюємо текст заявки й відкриємо Instagram Direct: вставте його в чат і надішліть. Ми підтвердимо час."
    elif vias:
        sub_txt = "Заповніть форму й оберіть, куди надіслати заявку: " + ", ".join(names[v] for v in vias) + ". Текст буде готовий — залишиться лише надіслати. Ми підтвердимо час."
    elif phone:
        sub_txt = "Заповніть форму — ми скопіюємо текст заявки, щоб ви могли надіслати його нам. Або просто зателефонуйте: %s." % esc(phone).replace(" ", "\u00a0")
        s = re.sub(r'<p data-done-text>.*?</p>', lambda mm: '<p data-done-text data-keep>Найшвидше записатися — зателефонувати нам: <a href="tel:+%s">%s</a>. Текст заявки також скопійовано в буфер обміну.</p>' % (e164, esc(phone)), s, count=1, flags=re.S)
    else:
        sub_txt = "Заповніть форму — ми скопіюємо текст заявки, щоб ви могли надіслати його нам зручним способом."
    s = re.sub(r'(<p class="form-sub" data-form-sub>).*?(</p>)', lambda mm: mm.group(1) + sub_txt + mm.group(2), s, count=1, flags=re.S)

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
        # no structured hours: drop the table; JS then hides the live status (no fake defaults)
        s = re.sub(r'[ \t]*<!-- Графік.*?-->\n[ \t]*<ul class="hours-list" data-hours-list>.*?</ul>\n', "", s, count=1, flags=re.S)
        s = re.sub(r'[ \t]*<li><p class="status" data-status>.*?</p></li>\n', "", s, count=1, flags=re.S)
        s = re.sub(r'[ \t]*<p class="status" data-status>.*?</p>\n', "", s, flags=re.S)
    if hours or hours_text:
        txt = text_hours(hours) if hours else hours_text
        s = sub1(s, '<span class="ph">[ГОДИНИ]</span>', esc(txt))

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
    if name:
        quoted = name if name.startswith("«") else "«%s»" % name
        s = s.replace("Оптика [НАЗВА] у", "Оптика %s у" % esc(quoted))
    if city:
        vowel = city_loc[:1].upper() in VOWELS

        def prep(mm):
            p = mm.group(1)
            if vowel:  # милозвучність: «в Івано-Франківську»
                p = "В" if p.isupper() else "в"
            return p + " " + esc(city_loc)
        s = re.sub(r"(?<![\wА-яІіЇїЄєҐґ'])([вуВУ]) (?:<span class=\"ph\">)?\[МІСТО\](?:</span>)?", prep, s)
    vals = {"[НАЗВА]": name, "[МІСТО]": city, "[АДРЕСА]": address, "[ТЕЛЕФОН]": phone, "[EMAIL]": email,
            "[ІНСТАГРАМ]": ("@" + ig_handle.lstrip("@")) if ig_handle else None}
    for tok, v in vals.items():
        if v:
            s = s.replace('<span class="ph">%s</span>' % tok, esc(v)).replace(tok, esc(v))

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

    left = sorted(set(re.findall(r"\[[A-ZА-ЯІЇЄҐ'’ ]{2,}\]", s)))
    filled = [lbl for lbl, v in [("назва", name), ("місто", city), ("адреса", address), ("телефон", phone), ("email", email),
                                 ("Instagram", ig), ("Facebook", fb), ("графік роботи", hours or hours_text)] if v]
    readme = ["# %s — демо-сайт оптики" % (name or "Оптика"), "",
              "Шаблон: **optyka** (оптика / перевірка зору).", "",
              "Заповнено з OpenStreetMap: " + (", ".join(filled) if filled else "нічого") + ".", "",
              "Залишилося заповнити (на сторінці позначено жовтим пунктиром):", ""]
    hints = {"[ЦІНА]": "ціни в прайсі, на етикетці головного екрана й у блоці «Про нас»", "[ІМ'Я]": "ім'я фахівця та авторів відгуків",
             "[РІК]": "рік заснування (блок «Про нас»)", "[ФОП]": "ФОП / ТОВ і ЄДРПОУ у футері",
             "[ГОДИНИ]": "графік роботи", "[АДРЕСА]": "адреса", "[ТЕЛЕФОН]": "телефон", "[EMAIL]": "email",
             "[ІНСТАГРАМ]": "Instagram", "[НАЗВА]": "назва", "[МІСТО]": "місто"}
    for t in left:
        readme.append("- `%s` — %s" % (t, hints.get(t, "")))
    readme += ["- три відгуки з міткою «Приклад відгуку» — замінити на реальні",
               "- фото (зараз стокові з Unsplash) — замінити на фото оптики",
               "- перелік послуг і прайс — звірити з реальним (діти, контактні лінзи, ремонт)"]
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
