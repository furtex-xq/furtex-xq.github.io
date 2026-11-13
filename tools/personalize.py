#!/usr/bin/env python3
"""Personalize the stomatolohiia template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Standard library only. Reads the template next to this script and writes a
complete personalized copy into <outdir> (the template tree is not touched).
Unknown facts stay as marked placeholders; unknown contact channels are
removed cleanly (every channel element carries data-ch="..." in the template).
Booking form: SMS only for mobile numbers, plus Instagram Direct / email when
known; a landline-only lead gets a "book by phone" card instead of the form.
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
DAY_SHORT = {"1": "Пн", "2": "Вт", "3": "Ср", "4": "Чт", "5": "Пт", "6": "Сб", "0": "Нд"}
DAY_SCHEMA = {"1": "Mo", "2": "Tu", "3": "We", "4": "Th", "5": "Fr", "6": "Sa", "0": "Su"}
MOBILE_CODES = {"39", "50", "63", "66", "67", "68", "73", "77", "91", "92", "93", "94", "95", "96", "97", "98", "99"}
ALLOWED_LEFT = {"[ЦІНА]", "[ІМ'Я]", "[РІК]", "[ФОП]"}
VOWELS = "АЕЄИІЇОУЮЯ"


def esc(v):
    return html.escape(v, quote=True)


def norm_time(t):
    h, m = t.split(":")
    return "%02d:%s" % (int(h), m)


def sub1(s, old, new):
    if old not in s:
        raise SystemExit("template marker not found: %r" % old[:90])
    return s.replace(old, new)


def remove_el(s, ch, tags=("a", "p", "label")):
    """Remove every element (a/p/label) carrying data-ch="<ch>", with its line indent."""
    for tag in tags:
        s = re.sub(r'[ \t]*<%s\b[^>]*\bdata-ch="%s"[^>]*>.*?</%s>[ \t]*\n?' % (tag, re.escape(ch), tag), "", s, flags=re.S)
    return s


def fmt_phone(e164):
    d = e164
    if len(d) == 12 and d.startswith("380"):
        return "+380 %s %s %s %s" % (d[3:5], d[5:8], d[8:10], d[10:12])
    return "+" + d


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


def ua_hours_summary(hours):
    parts, i = [], 0
    while i < len(DAY_ORDER):
        h = hours.get(DAY_ORDER[i])
        j = i
        key = tuple(norm_time(x) for x in h) if h else None
        while j + 1 < len(DAY_ORDER):
            n = hours.get(DAY_ORDER[j + 1])
            if (tuple(norm_time(x) for x in n) if n else None) != key:
                break
            j += 1
        span = DAY_SHORT[DAY_ORDER[i]] if i == j else DAY_SHORT[DAY_ORDER[i]] + "–" + DAY_SHORT[DAY_ORDER[j]]
        parts.append("%s %s" % (span, "%s–%s" % key if key else "вихідний"))
        i = j + 1
    return ", ".join(parts)


def clean_hours_text(t):
    """OSM-ish free text ('Mo-Fr "згідно запису"') -> readable Ukrainian."""
    for k, v in {"Mo": "Пн", "Tu": "Вт", "We": "Ср", "Th": "Чт", "Fr": "Пт", "Sa": "Сб", "Su": "Нд"}.items():
        t = re.sub(r"\b%s\b" % k, v, t)
    t = re.sub(r"(Пн|Вт|Ср|Чт|Пт|Сб|Нд)-(Пн|Вт|Ср|Чт|Пт|Сб|Нд)", r"\1–\2", t)
    t = t.replace('"', "").replace("згідно запису", "за попереднім записом")
    return re.sub(r"\s+", " ", t).strip()


def personalize(lead, outdir):
    name = (lead.get("name") or "").strip() or None
    city = lead.get("city") or None
    city_loc = lead.get("city_loc") or city
    address = lead.get("address") or None
    phone = lead.get("phone") or None
    e164 = re.sub(r"\D", "", lead.get("phone_e164") or "") or (re.sub(r"\D", "", phone) if phone else None)
    if e164 and len(e164) == 13 and e164.startswith("3800"):  # «+3800501706777» — зайвий 0 після коду країни
        e164 = "380" + e164[4:]
        phone = fmt_phone(e164)
    if e164 and not phone:
        phone = fmt_phone(e164)
    mobile = bool(e164 and len(e164) == 12 and e164.startswith("380") and e164[3:5] in MOBILE_CODES)
    email = lead.get("email") or None
    ig = lead.get("instagram") or None
    ig_handle = (lead.get("instagram_handle") or (ig.rstrip("/").split("/")[-1] if ig else "") or "").lstrip("@") or None
    fb = lead.get("facebook") or None
    hours = lead.get("hours") or None
    if hours and not any(hours.get(k) for k in DAY_ORDER):
        hours = None
    hours_text = lead.get("hours_text") or None
    if hours:
        hours_text = hours_text or ua_hours_summary(hours)
    elif hours_text:
        hours_text = clean_hours_text(hours_text)
    maps_query = lead.get("maps_query") or ", ".join(x for x in [address, city] if x) or "Івано-Франківськ"
    is_dental_name = bool(name and re.search(r"стоматолог", name, re.I))

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    js = open(os.path.join(ROOT, "js", "main.js"), encoding="utf-8").read()

    # ---------- JSON-LD (edit as data, re-serialize) ----------
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    if name:
        ld["name"] = name
    if city:
        prep = "в" if city_loc[:1].upper() in VOWELS else "у"
        ld["description"] = ld["description"].replace("у [МІСТО]", prep + " " + city_loc).replace("[МІСТО]", city)
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

    # ---------- name-dependent phrasing ----------
    if name and is_dental_name:
        s = s.replace("[НАЗВА] — стоматологія [МІСТО]", "[НАЗВА], [МІСТО]")
        s = s.replace("Стоматологія [НАЗВА] у [МІСТО]", "[НАЗВА] у [МІСТО]")
    elif name:
        q = name if name.startswith("«") else "«%s»" % name
        s = s.replace("Стоматологія [НАЗВА] у [МІСТО]", "Стоматологія %s у [МІСТО]" % esc(q))

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

    if phone:
        s = s.replace("tel:+380000000000", "tel:+" + e164)
    else:
        hero_call = '<a class="btn btn-line btn-lg" data-ch="phone" href="tel:+380000000000"><svg class="i" aria-hidden="true"><use href="#i-phone"/></svg>Зателефонувати</a>'
        bar_call = '<a data-ch="phone" href="tel:+380000000000"><svg class="i" aria-hidden="true"><use href="#i-phone"/></svg>Подзвонити</a>'
        if ig:
            s = sub1(s, hero_call, '<a class="btn btn-line btn-lg" href="%s" target="_blank" rel="noopener"><svg class="i" aria-hidden="true"><use href="#i-ig"/></svg>Написати в Instagram</a>' % esc(ig))
            s = sub1(s, bar_call, '<a href="%s" target="_blank" rel="noopener"><svg class="i" aria-hidden="true"><use href="#i-ig"/></svg>Instagram</a>' % esc(ig))
        else:
            s = sub1(s, '<nav class="actionbar"', '<nav class="actionbar ab-2"')
        s = remove_el(s, "phone")
        s = s.replace(" Запис онлайн або за телефоном [ТЕЛЕФОН].", " Запис онлайн.")

    # contact buttons grid: drop it if nothing (or only the call button, the big number is above) remains
    cm = re.search(r'[ \t]*<div class="channels" data-channels>\n(.*?)[ \t]*</div>\n', s, re.S)
    items = re.findall(r'data-ch="([a-z]+)"', cm.group(1))
    if not items or items == ["phone"]:
        s = s[:cm.start()] + s[cm.end():]

    # ---------- booking form ----------
    vias = (["sms"] if mobile else []) + (["instagram"] if ig else []) + (["email"] if email else [])
    fs = re.search(r'[ \t]*<fieldset class="field via" data-via>.*?</fieldset>\n', s, re.S)
    if vias:
        block = fs.group(0).replace(" checked>", ">")
        block = block.replace('value="%s">' % vias[0], 'value="%s" checked>' % vias[0], 1)
        if len(vias) == 1:
            block = block.replace('data-via>', 'data-via hidden>', 1)
        s = s[:fs.start()] + block + s[fs.end():]
        names = {"sms": "SMS", "instagram": "Instagram Direct", "email": "лист"}
        if len(vias) == 1:
            sub_txt = {
                "sms": "Заповніть форму — відкриється SMS із готовою заявкою, вам залишиться лише надіслати її.",
                "email": "Заповніть форму — відкриється лист із готовою заявкою, вам залишиться лише надіслати його.",
                "instagram": "Заповніть форму — ми скопіюємо текст заявки й відкриємо Instagram Direct, вам залишиться вставити й надіслати.",
            }[vias[0]]
        else:
            sub_txt = "Заповніть форму й оберіть, куди надіслати: %s або %s — з готовим текстом заявки." % (
                ", ".join(names[v] for v in vias[:-1]), names[vias[-1]])
        s = re.sub(r'(<p class="form-sub" data-form-sub>).*?(</p>)', lambda mm: mm.group(1) + sub_txt + mm.group(2), s, count=1, flags=re.S)
    else:
        # no messenger/SMS/email channel: replace the form with a "book by phone" card
        fm = re.search(r'[ \t]*<form class="form".*?</form>\n[ \t]*<div class="done".*?</div>\n', s, re.S)
        if phone:
            card = ('        <div class="call-card">\n'
                    '          <a class="btn btn-lg btn-wide" href="tel:+%s"><svg class="i" aria-hidden="true"><use href="#i-phone"/></svg>%s</a>\n'
                    '          <p class="form-sub">Адміністратор підбере зручний час, підкаже, що взяти з собою, і відповість на запитання про ціни.</p>\n'
                    '        </div>\n') % (e164, esc(phone))
            s = s[:fm.start()] + card + s[fm.end():]
            s = sub1(s, "Залиште заявку — ми передзвонимо й узгодимо час", "Запишіться телефоном — підберемо зручний час")
            s = re.sub(r'(<p class="form-sub" data-form-sub>).*?(</p>)',
                       lambda mm: mm.group(1) + "Зателефонуйте нам у робочий час — запишемо на огляд або на лікування, а з гострим болем знайдемо час того ж дня." + mm.group(2),
                       s, count=1, flags=re.S)
        else:
            s = s[:fs.start()] + s[fs.end():]
            s = re.sub(r'(<p class="form-sub" data-form-sub>).*?(</p>)',
                       lambda mm: mm.group(1) + "Заповніть форму — ми підготуємо текст заявки й скопіюємо його, щоб ви могли надіслати його нам." + mm.group(2),
                       s, count=1, flags=re.S)
    contact_js = ("  var CONTACT = {\n    phone: %s,\n    sms: %s,\n    viber: false,\n    whatsapp: false,\n    telegram: '',\n"
                  "    instagram: %s,\n    email: %s\n  };") % (
        json.dumps(e164) if e164 else "''", "true" if mobile else "false",
        json.dumps(ig_handle) if ig and ig_handle else "''", json.dumps(email) if email else "''")
    js, n = re.subn(r"  var CONTACT = \{.*?\};", lambda mm: contact_js, js, count=1, flags=re.S)
    if n != 1:
        raise SystemExit("CONTACT block not found in js/main.js")
    if not mobile:  # SMS is impossible to a landline; never fall back to it
        js = js.replace("else if (via === 'sms' && p)", "else if (via === 'sms' && CONTACT.sms && p)")

    # ---------- hours ----------
    if hours:
        lis = []
        for d in DAY_ORDER:
            h = hours.get(d)
            if h:
                a, b = norm_time(h[0]), norm_time(h[1])
                lis.append('            <li data-day="%s" data-hours="%s-%s"><span>%s</span><span>%s–%s</span></li>' % (d, a, b, DAY_UA[d], a, b))
            else:
                lis.append('            <li data-day="%s" data-hours=""><span>%s</span><span>вихідний</span></li>' % (d, DAY_UA[d]))
        s, n = re.subn(r'[ \t]*<!-- Графік.*?-->\n[ \t]*<ul class="hours-list" data-hours-list>.*?</ul>',
                       lambda mm: '          <ul class="hours-list" data-hours-list>\n' + "\n".join(lis) + "\n          </ul>", s, count=1, flags=re.S)
    else:
        # no structured hours: drop the table; the live status stays hidden (JS shows it only with a table)
        s, n = re.subn(r'[ \t]*<!-- Графік.*?-->\n[ \t]*<ul class="hours-list" data-hours-list>.*?</ul>\n', "", s, count=1, flags=re.S)
        s = re.sub(r'[ \t]*<p class="status status-row" data-status hidden></p>\n', "", s)
    if n != 1:
        raise SystemExit("hours list not found")
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
    if city:
        vowel = city_loc[:1].upper() in VOWELS

        def prep(mm):
            p = mm.group(1)
            if vowel:  # милозвучність: «в Івано-Франківську»
                p = "В" if p.isupper() else "в"
            return p + " " + esc(city_loc)
        s = re.sub(r"(?<![\wА-яІіЇїЄєҐґ'’])([вуВУ]) (?:<span class=\"ph\">)?\[МІСТО\](?:</span>)?", prep, s)
    vals = {"[НАЗВА]": name, "[МІСТО]": city, "[АДРЕСА]": address, "[ТЕЛЕФОН]": phone, "[EMAIL]": email,
            "[ІНСТАГРАМ]": ("@" + ig_handle) if ig and ig_handle else None}
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
    readme = ["# %s — демо-сайт стоматології" % (name or "Стоматологія"), "",
              "Шаблон: **stomatolohiia** (стоматологія; фішка — «таймлайн посмішки»).", "",
              "Заповнено з OpenStreetMap: " + (", ".join(filled) if filled else "нічого") + ".", "",
              "Форма запису надсилає заявку через: " + (", ".join({"sms": "SMS", "instagram": "Instagram Direct", "email": "email"}[v] for v in vias)
                                                      if vias else ("— (стаціонарний номер: замість форми — запис телефоном)" if phone else "— (текст копіюється)")) + ".", "",
              "Залишилося заповнити (позначені жовтим пунктиром на сторінці):", ""]
    hints = {"[ЦІНА]": "ціни: головний екран, плани в таймлайні, прайс", "[ІМ'Я]": "ім'я головного лікаря й авторів відгуків",
             "[РІК]": "рік заснування (блок «Про нас»)", "[ФОП]": "ФОП / ТОВ і ЄДРПОУ у футері",
             "[ГОДИНИ]": "графік роботи", "[АДРЕСА]": "адреса", "[ТЕЛЕФОН]": "телефон", "[EMAIL]": "email"}
    for t in left:
        readme.append("- `%s` — %s" % (t, hints.get(t, "")))
    readme += ["- три відгуки з міткою «Приклад відгуку» — замінити на реальні",
               "- фото (зараз стокові з Unsplash) — замінити на фото лікаря й кабінету",
               "- кроки й тривалості в «таймлайні посмішки» та перелік послуг у прайсі — звірити з лікарем"]
    if not hours:
        readme.append("- точний графік по днях (тоді на сайті з'явиться статус «Зараз відчинено/зачинено»)")
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
