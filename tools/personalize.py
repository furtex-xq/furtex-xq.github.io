#!/usr/bin/env python3
"""Personalize the klinika template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Standard library only. Reads the template next to this script and writes a
complete personalized copy into <outdir> (the template tree is not touched).
Unknown facts stay as marked placeholders; unknown contact channels are
removed cleanly (elements carry data-ch="..." markers in the template).
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
DAY_SCHEMA = {"1": "Mo", "2": "Tu", "3": "We", "4": "Th", "5": "Fr", "6": "Sa", "0": "Su"}
ALLOWED_LEFT = {"[ЦІНА]", "[ІМ'Я]", "[РІК]", "[ФОП]"}


def esc(v):
    return html.escape(v, quote=True)


def norm_time(t):
    h, m = t.split(":")
    return "%02d:%s" % (int(h), m)


def remove_el(s, ch, tags=("a", "p", "label", "fieldset")):
    """Remove every element (a/p/label/...) carrying data-ch="<ch>", with its line indent."""
    for tag in tags:
        s = re.sub(r'[ \t]*<%s\b[^>]*\bdata-ch="%s"[^>]*>.*?</%s>[ \t]*\n?' % (tag, re.escape(ch), tag), "", s, flags=re.S)
    return s


def sub1(s, old, new, count=None):
    if old not in s:
        raise SystemExit("template marker not found: %r" % old[:80])
    return s.replace(old, new) if count is None else s.replace(old, new, count)


def schema_hours(hours):
    out, i = [], 0
    days = DAY_ORDER
    while i < len(days):
        h = hours.get(days[i])
        if not h:
            i += 1
            continue
        j = i
        while j + 1 < len(days) and hours.get(days[j + 1]) and [norm_time(x) for x in hours[days[j + 1]]] == [norm_time(x) for x in h]:
            j += 1
        span = DAY_SCHEMA[days[i]] if i == j else DAY_SCHEMA[days[i]] + "-" + DAY_SCHEMA[days[j]]
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
    js = open(os.path.join(ROOT, "js", "main.js"), encoding="utf-8").read()

    # ---------- JSON-LD (edit as data, re-serialize) ----------
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    if name:
        ld["name"] = name
    if city:
        ld["description"] = ld["description"].replace("у [МІСТО]", ("в " if city_loc[:1].upper() in "АЕЄИІЇОУЮЯ" else "у ") + city_loc).replace("[МІСТО]", city)
        ld["address"]["addressLocality"] = city
    if address:
        ld["address"]["streetAddress"] = address
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
        s = remove_el(s, ch)
    if not ig:
        s = remove_el(s, "instagram")
    if not fb:
        s = remove_el(s, "facebook")
    if not email:
        s = remove_el(s, "email")

    hero_call = '<a class="btn btn-ghost btn-lg" data-ch="phone" href="tel:+380000000000"><svg aria-hidden="true"><use href="#i-phone"/></svg>Зателефонувати</a>'
    bar_call = '<a data-ch="phone-bar" href="tel:+380000000000"><svg aria-hidden="true"><use href="#i-phone"/></svg>Подзвонити</a>'
    ticket_link = '<a class="ticket-link" data-ch="phone-alt" href="tel:+380000000000">Уточнити вільний час'
    if phone:
        s = s.replace("tel:+380000000000", "tel:+" + e164)
    else:
        if ig:
            s = sub1(s, hero_call, '<a class="btn btn-ghost btn-lg" href="%s" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-ig"/></svg>Написати в Instagram</a>' % esc(ig))
            s = sub1(s, bar_call, '<a href="%s" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-ig"/></svg>Instagram</a>' % esc(ig))
        else:
            s = sub1(s, hero_call + "\n", "")
            s = sub1(s, bar_call + "\n", "")
            s = sub1(s, '<nav class="actionbar"', '<nav class="actionbar ab-2"')
        s = sub1(s, ticket_link, '<a class="ticket-link" href="#booking">Записатися онлайн')
        s = remove_el(s, "phone")
        s = sub1(s, " Тел. [ТЕЛЕФОН].", "")

    # contact buttons grid: drop it if only the call button would remain (big phone is above it)
    cm = re.search(r'([ \t]*<div class="channels">\n)(.*?)([ \t]*</div>\n)', s, re.S)
    items = re.findall(r'<a class="ch[^"]*"[^>]*data-ch="([a-z]+)"', cm.group(2))
    if not items or (items == ["phone"]):
        s = s[:cm.start()] + s[cm.end():]
    else:
        s = s[:cm.start()] + cm.group(1).replace('class="channels"', 'class="channels n%d"' % len(items)) + cm.group(2) + cm.group(3) + s[cm.end():]

    # ---------- booking form channels ----------
    vias = (["sms"] if phone else []) + (["email"] if email else [])
    if phone:
        s = re.sub(r'(<legend>Надіслати через</legend>\n)', lambda mm: mm.group(1) + '        <label data-ch="sms"><input type="radio" name="via" value="sms"><span><svg aria-hidden="true"><use href="#i-viber"/></svg>SMS</span></label>\n', s, count=1)
    fs = re.search(r'<fieldset class="field via">.*?</fieldset>', s, re.S)
    block = fs.group(0).replace(" checked>", ">")
    if vias:
        block = block.replace('value="%s">' % vias[0], 'value="%s" checked>' % vias[0], 1)
        if len(vias) == 1:
            block = block.replace('<fieldset class="field via">', '<fieldset class="field via" hidden>', 1)
        s = s[:fs.start()] + block + s[fs.end():]
    else:
        s = s[:fs.start()] + s[fs.end():]
    sub_txt = {
        ("sms",): "Заповніть форму — відкриється SMS із готовою заявкою, вам залишиться лише надіслати її.",
        ("email",): "Заповніть форму — відкриється лист із готовою заявкою, вам залишиться лише надіслати його.",
        ("sms", "email"): "Заповніть форму — заявка відкриється в SMS або листі, вам залишиться лише надіслати її.",
        (): "Заповніть форму — ми підготуємо текст заявки й скопіюємо його, щоб ви могли надіслати його нам.",
    }[tuple(vias)]
    s = re.sub(r'(<p class="form-sub" data-form-sub>).*?(</p>)', lambda mm: mm.group(1) + sub_txt + mm.group(2), s, flags=re.S)
    if not vias:
        s = re.sub(r'(<p data-done-text>).*?(</p>)', lambda mm: mm.group(1) + "Текст заявки скопійовано в буфер обміну — надішліть його нам зручним способом, і адміністратор підтвердить час прийому." + mm.group(2), s, flags=re.S)
    contact_js = "  var CONTACT = {\n    telegram: '',\n    viber: '',\n    email: %s,\n    sms: %s\n  };" % (
        json.dumps("mailto:" + email) if email else "''",
        json.dumps("sms:+" + e164) if phone else "''")
    js = re.sub(r"  var CONTACT = \{.*?\};", lambda mm: contact_js, js, count=1, flags=re.S)

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
        s = re.sub(r'[ \t]*<!-- Графік.*?-->\n[ \t]*<ul class="hours-list">.*?</ul>',
                   lambda mm: '        <ul class="hours-list">\n' + "\n".join(lis) + "\n        </ul>", s, count=1, flags=re.S)
    else:
        # no structured hours: hide the live status everywhere (it would show fake defaults)
        s = re.sub(r'[ \t]*<!-- Графік.*?-->\n[ \t]*<ul class="hours-list">.*?</ul>\n', "", s, count=1, flags=re.S)
        s = re.sub(r'[ \t]*<p class="status-pill[^"]*" data-status>.*?</p>\n', "", s, flags=re.S)
        s = re.sub(r'[ \t]*<aside class="ticket".*?</aside>\n', "", s, count=1, flags=re.S)
    if hours_text or hours:
        txt = hours_text or "; ".join(schema_hours(hours))
        s = s.replace('<span class="ph">[ГОДИНИ]</span>', esc(txt))

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
        s = re.sub(r'центр (?:<span class="ph">)?\[НАЗВА\](?:</span>)?', "центр " + esc(quoted), s)
    if city:
        vowel = city_loc[:1].upper() in "АЕЄИІЇОУЮЯ"
        def prep(mm):
            p = mm.group(1)
            if vowel:  # милозвучність: «в Івано-Франківську»
                p = ("В" if p.isupper() else "в")
            return p + " " + esc(city_loc)
        s = re.sub(r'(?<![\wА-яІіЇїЄєҐґ\'])([вуВУ]) (?:<span class="ph">)?\[МІСТО\](?:</span>)?', prep, s)
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
    open(os.path.join(outdir, "js", "main.js"), "w", encoding="utf-8").write(js)

    left = sorted(set(re.findall(r"\[[A-ZА-ЯІЇЄҐ'’ ]{2,}\]", s)))
    filled = [lbl for lbl, v in [("назва", name), ("місто", city), ("адреса", address), ("телефон", phone), ("email", email),
                                 ("Instagram", ig), ("Facebook", fb), ("графік роботи", hours or hours_text)] if v]
    readme = ["# %s — демо-сайт медичного центру" % (name or "Медичний центр"), "",
              "Шаблон: **klinika** (медичний центр / клініка).", "",
              "Заповнено з OpenStreetMap: " + (", ".join(filled) if filled else "нічого") + ".", "",
              "Залишилося заповнити (позначені жовтим пунктиром на сторінці):", ""]
    hints = {"[ЦІНА]": "ціни послуг (табло лікарів, прайс, головний екран)", "[ІМ'Я]": "імена лікарів і авторів відгуків",
             "[РІК]": "рік заснування (блок «Про центр»)", "[ФОП]": "ФОП / ТОВ і ЄДРПОУ у футері",
             "[ГОДИНИ]": "графік роботи", "[АДРЕСА]": "адреса", "[ТЕЛЕФОН]": "телефон", "[EMAIL]": "email"}
    for t in left:
        readme.append("- `%s` — %s" % (t, hints.get(t, "")))
    readme += ["- три відгуки з міткою «Приклад відгуку» — замінити на реальні", "- фото (зараз стокові з Unsplash) — замінити на фото клініки",
               "- перелік лікарів і послуг у табло та прайсі — звірити з реальним"]
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
