#!/usr/bin/env python3
"""Personalize the restaurant template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

<lead.json> may hold one lead object or a list (then --slug <slug> picks one; without it
the first lead is used). Writes a complete, self-contained copy of the site into <outdir>.
Standard library only. The template working tree is never modified."""
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SITE_FILES = ["index.html", "robots.txt", "img/favicon.svg"]
SITE_DIRS = ["css", "js", "fonts"]
BETA_URL = "https://raw.githack.com/furtex-xq/furtex-xq.github.io/beta/{slug}/index.html"
TEMPLATE_URL = "https://raw.githack.com/furtex-xq/furtex-xq.github.io/template/restoran/index.html"
ALLOWED_LEFT = {"[ЦІНА]", "[ІМ'Я]", "[РІК]", "[ФОП]", "[ГОДИНИ]", "[АДРЕСА]"}

ICON_IG = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>'
ICON_FB = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z"/></svg>'

DAY_CODES = {"Mo": "Пн", "Tu": "Вт", "We": "Ср", "Th": "Чт", "Fr": "Пт", "Sa": "Сб", "Su": "Нд"}


def esc(s):
    return html.escape(s, quote=True)


def remove_el(doc, ch):
    """Remove every element carrying data-ch="<ch>" (with its content and own line)."""
    pat = re.compile(r'<(\w+)\b[^>]*\bdata-ch="%s"[^>]*>' % re.escape(ch))
    while True:
        m = pat.search(doc)
        if not m:
            return doc
        tag = m.group(1)
        end = doc.index("</%s>" % tag, m.end()) + len(tag) + 3
        start = m.start()
        ls = doc.rfind("\n", 0, start) + 1
        if doc[ls:start].strip() == "" and doc[end:end + 1] == "\n":
            start, end = ls, end + 1
        doc = doc[:start] + doc[end:]


def norm_hours_text(t):
    if not t:
        return None
    t = t.strip()
    if re.fullmatch(r"(Mo-Su|Su-Sa)\s+\d\d:\d\d-\d\d:\d\d", t):
        t = "Щодня " + t.split()[1]
    t = re.sub(r"\b(Mo|Tu|We|Th|Fr|Sa|Su)\b", lambda m: DAY_CODES[m.group(1)], t)
    t = re.sub(r"(\d\d:\d\d)-(\d\d:\d\d)", r"\1–\2", t)
    t = re.sub(r"([А-Яа-яІі]{2})-([А-Яа-яІі]{2})", r"\1–\2", t)
    t = t.replace(";", ",")
    return t


def ig_handle(lead):
    h = lead.get("instagram_handle")
    if not h and lead.get("instagram"):
        m = re.search(r"instagram\.com/([^/?#]+)", lead["instagram"])
        h = m.group(1) if m else None
    return h


def loc_prep(word):
    return "в" if word[:1].lower() in "аеєиіїоуюя" else "у"


def build(lead, outdir):
    name = (lead.get("name") or "").strip()
    city = lead.get("city")
    city_loc = lead.get("city_loc") or city
    address = lead.get("address")
    phone, e164 = lead.get("phone"), lead.get("phone_e164")
    email = lead.get("email")
    ig, fb = lead.get("instagram"), lead.get("facebook")
    handle = ig_handle(lead)
    hours = lead.get("hours")
    hours_text = lead.get("hours_text")
    hours_text = hours_text if hours else norm_hours_text(hours_text)
    has_phone = bool(phone and e164)
    social = ("Instagram", ig, ICON_IG) if ig else (("Facebook", fb, ICON_FB) if fb else None)

    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
        doc = f.read()

    # ---- JSON-LD -------------------------------------------------------
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', doc, re.S)
    ld = json.loads(m.group(2))
    ld["name"] = name or ld["name"]
    ld["menu"] = BETA_URL.format(slug=lead["slug"]) + "#menu"
    ld.pop("foundingDate", None)
    if has_phone:
        ld["telephone"] = phone
    else:
        ld.pop("telephone", None)
    if email:
        ld["email"] = email
    else:
        ld.pop("email", None)
    if hours and lead.get("hours_osm"):
        ld["openingHours"] = [p.strip() for p in lead["hours_osm"].split(";") if p.strip()]
    elif lead.get("hours_osm") and re.match(r"^[A-Z]", lead["hours_osm"]):
        ld["openingHours"] = [p.strip() for p in lead["hours_osm"].split(";") if p.strip()]
    else:
        ld.pop("openingHours", None)
    ld["address"]["streetAddress"] = address or ld["address"]["streetAddress"]
    ld["address"]["addressLocality"] = city or ld["address"]["addressLocality"]
    same = [u for u in (ig, fb) if u]
    if same:
        ld["sameAs"] = same
    else:
        ld.pop("sameAs", None)
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/")
    doc = doc[:m.start(2)] + "\n" + ld_txt + "\n" + doc[m.end(2):]

    # ---- channels --------------------------------------------------------
    for ch in ("tg", "viber", "wa"):
        doc = remove_el(doc, ch)
    if not has_phone:
        # quick-contact line in booking → social, mobile bar call → social
        if social:
            doc = re.sub(r'<p class="booking__call" data-ch="phone">.*?</p>',
                         '<p class="booking__call">Швидше — напишіть нам в <a href="%s" target="_blank" rel="noopener">%s</a></p>' % (esc(social[1]), social[0]),
                         doc, flags=re.S)
            doc = doc.replace('  <a class="mbar__main"',
                              '  <a href="%s" target="_blank" rel="noopener">%s%s</a>\n  <a class="mbar__main"' % (esc(social[1]), social[2], social[0]), 1)
            # form: a "copy & open" option for the social profile
            opt = ('        <label><input type="radio" name="via" value="social" data-mode="copy" data-href="%s" '
                   'data-hint="%s не підставляє текст автоматично — ми скопіюємо заявку, вам лишиться вставити її в повідомлення."><span>%s</span></label>\n'
                   % (esc(social[1]), social[0], social[0]))
            doc = doc.replace("      </fieldset>", opt + "      </fieldset>", 1)
        doc = remove_el(doc, "phone")
        doc = remove_el(doc, "sms")
        doc = doc.replace(" або за телефоном [ТЕЛЕФОН]", "")
    if not email:
        doc = remove_el(doc, "email")
    if not ig:
        doc = remove_el(doc, "ig")
    if not fb:
        doc = remove_el(doc, "fb")
    # first remaining channel is the default one
    doc = doc.replace(' checked><span>', '><span>')
    doc = re.sub(r'(<input type="radio" name="via"[^>]*?)>', r"\1 checked>", doc, count=1)
    if 'name="via"' not in doc:  # no way to send at all → hide channel picker
        doc = re.sub(r'\s*<fieldset class="via">.*?</fieldset>', "", doc, flags=re.S)

    # ---- hours -----------------------------------------------------------
    if hours:
        sched = {}
        for k in range(7):
            v = hours.get(str(k))
            sched[str(7 if k == 0 else k)] = "%s-%s" % (v[0], v[1]) if v else ""
        sched = {k: sched[k] for k in sorted(sched)}
        doc = re.sub(r"data-schedule='[^']*'", "data-schedule='%s'" % json.dumps(sched, separators=(",", ":")), doc)
        doc = doc.replace(" data-sample data-schedule=", " data-schedule=")
    else:
        doc = re.sub(r"data-schedule='[^']*'", "data-schedule='{}'", doc)
        doc = doc.replace('<span class="status__dot" aria-hidden="true"></span>', "")
        doc = re.sub(r'\s*<p class="hours__tz" data-live>.*?</p>', "", doc, flags=re.S)
        doc = re.sub(r'\s*<p class="status status--sm" data-status>.*?</span></span></p>', "", doc, flags=re.S)
    doc = doc.replace('<li><span>Щодня</span><span class="ph">[ГОДИНИ]</span></li>',
                      '<li><span>Графік</span><span><span class="ph">[ГОДИНИ]</span></span></li>')

    # ---- name / city grammar --------------------------------------------
    if re.match(r"(?i)ресторан\b", name):
        doc = doc.replace('Ресторан <span class="ph">[НАЗВА]</span>', '<span class="ph">[НАЗВА]</span>')
        doc = doc.replace("Ресторан [НАЗВА]", "[НАЗВА]")
    if city_loc:
        doc = doc.replace("ресторан [МІСТО]", "ресторан %s %s" % (loc_prep(city_loc), city_loc))
        doc = re.sub(r'(\b[вуВУ] )(<span class="ph">)?\[МІСТО\](</span>)?', lambda m: m.group(1) + esc(city_loc), doc)
    if len(name) > 14:
        doc = doc.replace('<a class="brand" href="#top"', '<a class="brand brand--long" href="#top"', 1)

    # ---- links -----------------------------------------------------------
    if has_phone:
        doc = doc.replace("tel:+380000000000", "tel:+" + e164).replace("sms:+380000000000", "sms:+" + e164)
    if email:
        doc = doc.replace("mailto:hello@example.com", "mailto:" + esc(email))
    if ig:
        doc = doc.replace("https://www.instagram.com/username/", esc(ig))
    if fb:
        doc = doc.replace("https://www.facebook.com/username", esc(fb))
    mq = lead.get("maps_query") or ", ".join(x for x in (address, city) if x)
    if mq:
        q = quote(mq, safe="")
        doc = re.sub(r"https://www\.google\.com/maps\?q=[^&\"]*&amp;output=embed",
                     "https://www.google.com/maps?q=%s&amp;output=embed" % q, doc)
        doc = re.sub(r"(https://www\.google\.com/maps/dir/\?api=1&amp;destination=)[^\"]*", r"\g<1>" + q, doc)
    doc = doc.replace(TEMPLATE_URL, BETA_URL.format(slug=lead["slug"]))

    # ---- tokens ----------------------------------------------------------
    values = {
        "[НАЗВА]": name or None,
        "[МІСТО]": city,
        "[АДРЕСА]": address,
        "[ТЕЛЕФОН]": phone if has_phone else None,
        "[EMAIL]": email,
        "[ІНСТАГРАМ]": ("@" + handle) if handle else ("Instagram" if ig else None),
        "[ГОДИНИ]": hours_text,
    }
    for tok, val in values.items():
        if not val:
            continue
        doc = doc.replace('<span class="ph">%s</span>' % tok, esc(val))
        doc = doc.replace(tok, esc(val))

    # ---- write -----------------------------------------------------------
    if os.path.exists(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    for d in SITE_DIRS:
        shutil.copytree(os.path.join(ROOT, d), os.path.join(outdir, d))
    for fpath in SITE_FILES:
        dst = os.path.join(outdir, fpath)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, fpath), dst)
    with open(os.path.join(outdir, "index.html"), "w", encoding="utf-8") as f:
        f.write(doc)

    left = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z']+\]", doc)))
    filled = [lbl for lbl, ok in (
        ("назва", name), ("місто", city), ("адреса", address), ("телефон", has_phone),
        ("email", email), ("Instagram", ig), ("Facebook", fb),
        ("години роботи (з живим статусом «відчинено»)" if hours else "години роботи (текстом)", hours or hours_text),
        ("карта і маршрут", mq)) if ok]
    readme = [
        "# %s — демо-сайт" % name, "",
        "Шаблон: `restoran` (ресторан). Демо: %s" % BETA_URL.format(slug=lead["slug"]), "",
        "Заповнено з OpenStreetMap: " + ", ".join(filled) + ".", "",
        "Залишилось заповнити (підсвічено пунктиром на сторінці):", "",
    ]
    hints = {"[ЦІНА]": "ціни в меню, середній чек, банкет на гостя", "[ІМ'Я]": "шеф і автори відгуків",
             "[РІК]": "рік відкриття", "[ФОП]": "ФОП / ЄДРПОУ у футері", "[ГОДИНИ]": "години роботи",
             "[АДРЕСА]": "адреса"}
    for t in left:
        readme.append("- `%s` — %s" % (t, hints.get(t, "")))
    readme += ["- 3 відгуки-приклади (картки «Приклад відгуку») — замінити на реальні",
               "- меню (страви й описи) та фото — типові для ресторану, замінити на реальні", ""]
    if not (lead.get("instagram") or lead.get("facebook") or has_phone or email):
        readme.append("Увага: немає жодного каналу зв'язку — форма бронювання не має куди надсилати заявку.\n")
    with open(os.path.join(outdir, "README.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(readme))
    return left


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    data = json.load(open(argv[1], encoding="utf-8"))
    if isinstance(data, list):
        slug = argv[argv.index("--slug") + 1] if "--slug" in argv else None
        data = next(l for l in data if slug is None or l.get("slug") == slug)
    left = build(data, argv[2])
    bad = [t for t in left if t not in ALLOWED_LEFT]
    print("ok", data.get("slug"), "left:", " ".join(left) or "-")
    if bad:
        print("WARNING unexpected tokens left:", bad)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
