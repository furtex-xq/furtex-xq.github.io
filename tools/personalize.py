#!/usr/bin/env python3
"""Personalize the «спорттовари / велосипеди / прокат» template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Reads the template next to this script (index.html, robots.txt, css/, js/, fonts/, img/ without
photos) and writes a filled copy into <outdir>. Known values replace the placeholder tokens and
lose the .ph marking; unknown channels are removed (elements carrying data-ch="..."); unknown
facts stay as marked placeholders. The page emphasis (bike shop / sports store / bike rental) is
picked from the lead's category and name. Standard library only.
"""
import html, json, os, re, shutil, sys, urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY = ["index.html", "robots.txt", "css", "js", "fonts", "img"]
SKIP_DIRS = {"photos"}
MOBILE = {"39", "50", "63", "66", "67", "68", "73", "77", "91", "92", "93", "94", "95", "96", "97", "98", "99"}

LATIN2CYR = str.maketrans({"a": "а", "c": "с", "e": "е", "i": "і", "o": "о", "p": "р", "x": "х", "y": "у",
                           "A": "А", "B": "В", "C": "С", "E": "Е", "H": "Н", "I": "І", "K": "К", "M": "М",
                           "O": "О", "P": "Р", "T": "Т", "X": "Х"})

# ---- emphasis variants: hero texts, <title>, meta description, schema type
VARIANTS = {
    "velo": {
        "kick": 'Веломагазин і майстерня у <span class="ph">[МІСТО]</span>',
        "h1": "Під ваш зріст <em>і ваш маршрут</em>",
        "lede": '<span class="ph">[НАЗВА]</span> — велосипеди, запчастини, аксесуари й майстерня в одному місці. Підберемо раму за зростом, дамо проїхатися перед покупкою і налаштуємо все під вас.',
        "cta": ("#finder", "i-ruler", "Підібрати розмір рами"),
        "title": "[НАЗВА] — веломагазин і ремонт велосипедів, [МІСТО]",
        "desc": "[НАЗВА]: велосипеди, запчастини, аксесуари й веломайстерня у [МІСТО]. Підбір рами за зростом, тест-райд, сервіс.",
        "type": "BikeStore",
    },
    "rent": {
        "kick": 'Прокат велосипедів у <span class="ph">[МІСТО]</span>',
        "h1": "Сідайте <em>й рушайте</em>",
        "lede": '<span class="ph">[НАЗВА]</span> — прокат міських, гірських і дитячих велосипедів погодинно й на добу. Виставимо сідло під ваш зріст, накачаємо колеса — і можна їхати.',
        "cta": ("#finder", "i-clock", "Порахувати прокат"),
        "title": "[НАЗВА] — прокат велосипедів, [МІСТО]",
        "desc": "[НАЗВА]: прокат велосипедів у [МІСТО] — міські, гірські, дитячі, погодинно й на добу. Бронювання телефоном.",
        "type": "BikeStore",
    },
    "sport": {
        "kick": 'Спортивний магазин у <span class="ph">[МІСТО]</span>',
        "h1": "Екіпірування <em>під ваш спорт</em>",
        "lede": '<span class="ph">[НАЗВА]</span> — спорттовари, взуття й одяг для тренувань, м\'ячі, туристичне спорядження та велосипеди. Підкажемо з розміром і привеземо під замовлення те, чого немає в залі.',
        "cta": ("#catalog", "i-arrow", "Переглянути каталог"),
        "title": "[НАЗВА] — спортивний магазин, спорттовари, [МІСТО]",
        "desc": "[НАЗВА]: спорттовари, одяг і взуття для тренувань, м'ячі, туристичне спорядження й велосипеди у [МІСТО].",
        "type": "SportingGoodsStore",
    },
}


def clean_name(name):
    """Fix stray Latin look-alike letters inside a Cyrillic name; keep Latin names as they are."""
    name = name.strip()
    if re.search("[а-яіїєґА-ЯІЇЄҐ]", name):
        name = "".join(ch.translate(LATIN2CYR) if re.match("[A-Za-z]", ch) else ch for ch in name)
        name = name[0].upper() + name[1:]
    return name


def focus_of(lead):
    if (lead.get("category") or "") == "rent":
        return "rent"
    hay = " ".join(str(lead.get(k) or "") for k in ("name", "instagram", "instagram_handle", "facebook")).lower()
    if re.search(r"вело|ровер|bike|bicycl|cycl|velo", hay):
        return "velo"
    return "sport"


def esc(v):
    return html.escape(v, quote=True)


def element_span(s, attr_re, start=0):
    """(start, end, inner_start, inner_end) of the first element whose start tag matches attr_re."""
    m = re.compile(r"<([a-zA-Z0-9]+)\b[^>]*" + attr_re + r"[^>]*>").search(s, start)
    if not m:
        return None
    tag, pos, depth = m.group(1), m.end(), 1
    tok = re.compile(r"<(/?)" + tag + r"\b[^>]*?(/?)>")
    while depth:
        t = tok.search(s, pos)
        if not t:
            raise ValueError("unbalanced <%s>" % tag)
        depth += -1 if t.group(1) else (0 if t.group(2) else 1)
        last = t
        pos = t.end()
    return m.start(), pos, m.end(), last.start()


def remove_elements(s, attr_re):
    """Remove every element whose start tag matches attr_re, with its leading indentation."""
    while True:
        sp = element_span(s, attr_re)
        if not sp:
            return s
        start, end = sp[0], sp[1]
        ls = s.rfind("\n", 0, start)
        if ls != -1 and s[ls + 1:start].strip() == "":
            start = ls
        s = s[:start] + s[end:]


def set_inner(s, attr_re, inner):
    sp = element_span(s, attr_re)
    assert sp, attr_re
    return s[:sp[2]] + inner + s[sp[3]:]


def fill(s, token, value):
    """Replace <span class="ph">TOKEN</span> (and bare TOKEN) with value, html-escaped."""
    v = esc(value)
    s = s.replace('<span class="ph">%s</span>' % token, v)
    return s.replace(token, v)


def to_h(t):
    hh, mm = t.split(":")
    v = int(hh) + int(mm) / 60
    return int(v) if v == int(v) else round(v, 2)


def build_jsonld(lead, name, focus, old):
    city = lead.get("city") or "Івано-Франківськ"
    v = VARIANTS[focus]
    d = {
        "@context": "https://schema.org",
        "@type": v["type"],
        "name": name,
        "description": re.sub(r"^\[НАЗВА\]: ", "", v["desc"]).replace("у [МІСТО]", "у " + (lead.get("city_loc") or city)),
        "image": old["image"],
        "address": {"@type": "PostalAddress", "addressLocality": city, "addressCountry": "UA"},
    }
    d["description"] = d["description"][0].upper() + d["description"][1:]
    if lead.get("address"):
        d["address"]["streetAddress"] = lead["address"]
    if lead.get("phone"):
        d["telephone"] = lead["phone"]
    if lead.get("email"):
        d["email"] = lead["email"]
    same = [u for u in (lead.get("instagram"), lead.get("facebook")) if u]
    if same:
        d["sameAs"] = same
    hours = lead.get("hours")
    if hours:
        names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        spec = []
        for k in ["1", "2", "3", "4", "5", "6", "0"]:
            h = hours.get(k)
            if h:
                spec.append({"@type": "OpeningHoursSpecification", "dayOfWeek": names[int(k)],
                             "opens": h[0], "closes": "23:59" if h[1] in ("24:00", "00:00") else h[1]})
        d["openingHoursSpecification"] = spec
    if lead.get("maps_query"):
        d["hasMap"] = "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(lead["maps_query"])
    d["hasOfferCatalog"] = old["hasOfferCatalog"]
    return d


def personalize(lead, out):
    name = clean_name(lead["name"])
    focus = focus_of(lead)
    var = VARIANTS[focus]
    city = lead.get("city") or "Івано-Франківськ"
    city_loc = lead.get("city_loc") or city
    phone, e164 = lead.get("phone"), lead.get("phone_e164")
    email, ig, ig_handle, fb = lead.get("email"), lead.get("instagram"), lead.get("instagram_handle"), lead.get("facebook")
    if ig and not ig_handle:
        ig_handle = ig.rstrip("/").rsplit("/", 1)[-1]
    has_tel = bool(phone and e164)
    mobile = has_tel and e164.startswith("380") and e164[3:5] in MOBILE

    # ---- copy files
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    for item in COPY:
        src = os.path.join(ROOT, item)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(out, item), ignore=lambda d, names: [n for n in names if n in SKIP_DIRS])
        elif os.path.exists(src):
            shutil.copy2(src, os.path.join(out, item))

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # ---- emphasis: body flag, hero texts, title/meta
    s = s.replace('<body data-focus="velo">', '<body data-focus="%s">' % focus)
    topic = {"rent": "Прокат", "sport": "Спорттовари"}.get(focus)
    if topic:
        s = s.replace('<option value="%s">' % topic, '<option value="%s" selected>' % topic, 1)
    s = set_inner(s, r'data-v="kick"', '<span class="blaze" aria-hidden="true"></span>' + var["kick"])
    s = set_inner(s, r'data-v="h1"', var["h1"])
    s = set_inner(s, r'data-v="lede"', var["lede"])
    href, icon, label = var["cta"]
    s = re.sub(r'<a class="btn btn--trail" href="#finder" data-v="cta">.*?</a>',
               '<a class="btn btn--trail" href="%s" data-v="cta"><svg><use href="#%s"/></svg>%s</a>' % (href, icon, label), s, count=1)
    old_title = "[НАЗВА] — велосипеди, спорттовари і прокат, [МІСТО]"
    assert s.count(old_title) == 2
    s = s.replace("<title>%s</title>" % old_title, "<title>%s</title>" % var["title"])
    s = s.replace('<meta property="og:title" content="%s">' % old_title, '<meta property="og:title" content="%s">' % var["title"])
    s = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % (var["desc"] + (" [АДРЕСА]" + (", [ТЕЛЕФОН]." if has_tel else ".") if lead.get("address") else (" [ТЕЛЕФОН]." if has_tel else ""))), s, count=1)

    # ---- JSON-LD: rebuild from known data (keep the template's pinned image and catalogue)
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    old = json.loads(m.group(2))
    ld_txt = json.dumps(build_jsonld(lead, name, focus, old), ensure_ascii=False, indent=2).replace("</", "<\\/")
    s = s[:m.start(2)] + "\n" + ld_txt + "\n" + s[m.end(2):]

    # ---- channels that are unknown for every lead or for this lead
    gone = {"viber", "tg", "wa"}
    if not has_tel:
        gone.add("tel")
    if not email:
        gone.add("mail")
    if not ig:
        gone.add("ig")
    if not fb:
        gone.add("fb")

    # no phone: call CTAs switch to Instagram / Facebook if there is one, otherwise they disappear
    alt = (ig, "i-insta", "Написати в Instagram", "Instagram") if ig else (fb, "i-fb", "Написати у Facebook", "Facebook") if fb else None
    if not has_tel and alt:
        s = s.replace('<a data-ch="tel" class="btn btn--line" href="tel:+380000000000"><svg><use href="#i-phone"/></svg>Зателефонувати</a>',
                      '<a class="btn btn--line" href="%s" target="_blank" rel="noopener"><svg><use href="#%s"/></svg>%s</a>' % (esc(alt[0]), alt[1], alt[2]))
        s = s.replace('<a data-ch="tel" href="tel:+380000000000"><svg><use href="#i-phone"/></svg>Дзвінок</a>',
                      '<a href="%s" target="_blank" rel="noopener"><svg><use href="#%s"/></svg>%s</a>' % (esc(alt[0]), alt[1], alt[3]))

    # form: rebuild the "send via" options from what the lead really has
    opts = []
    if mobile:
        opts.append(("sms", "i-sms", "SMS"))
    if ig:
        opts.append(("ig", "i-insta", "Instagram"))
    if email:
        opts.append(("mail", "i-mail", "Email"))
    fs = re.search(r'<fieldset class="via">.*?</fieldset>', s, re.S)
    fine_old = re.search(r'<p class="form__fine">.*?</p>', s, re.S)
    if opts:
        labels = "".join('\n          <label><input type="radio" name="via" value="%s"%s><span><svg><use href="#%s"/></svg>%s</span></label>'
                         % (v, " checked" if i == 0 else "", ic, t) for i, (v, ic, t) in enumerate(opts))
        legend = "Куди надіслати заявку" if len(opts) > 1 else "Заявку буде надіслано через"
        s = s[:fs.start()] + '<fieldset class="via">\n          <legend>%s</legend>%s\n        </fieldset>' % (legend, labels) + s[fs.end():]
        fine = "Відкриється %s із готовим текстом — залишиться натиснути «Надіслати». Текст також скопіюється в буфер обміну." % (
            "обраний застосунок" if len(opts) > 1 else {"sms": "SMS", "ig": "чат Instagram", "mail": "пошта"}[opts[0][0]])
        if opts == [("ig", "i-insta", "Instagram")]:
            fine = "Відкриється чат Instagram, а текст заявки скопіюється — вставте його в повідомлення."
        s = s.replace(fine_old.group(0), '<p class="form__fine">%s</p>' % fine)
    elif has_tel:  # landline only: the form turns into "call us"
        s = s[:fs.start()] + '<input type="hidden" name="via" value="call">\n        <p class="form__call">Найшвидше — телефоном: <a href="tel:+%s">%s</a>. Натисніть кнопку — текст заявки скопіюється, і відкриється дзвінок.</p>' % (e164, esc(phone)) + s[fs.end():]
        s = s.replace('<svg><use href="#i-arrow"/></svg>Надіслати заявку</button>', '<svg><use href="#i-phone"/></svg>Зателефонувати</button>')
        s = s.replace(fine_old.group(0), "")
    else:  # nothing to send to: drop the form, point CTAs at the contacts
        s = remove_elements(s, r'class="form reveal"')
        s = s.replace('href="#form"', 'href="#contacts"')
        s = s.replace('<div class="contacts__grid">', '<div class="contacts__grid contacts__grid--solo">')

    for ch in sorted(gone):
        s = remove_elements(s, r'data-ch="%s"' % ch)
    if not has_tel:  # promote the first remaining channel to the wide card
        s = re.sub(r'(<div class="channels">\s*<a[^>]*?) class="ch"', r'\1 class="ch ch--main"', s, count=1)
    s = re.sub(r'\n\s*<div class="channels">\s*</div>', "", s)
    s = re.sub(r'\sdata-ch="[a-z]+"', "", s)

    # ---- links
    if has_tel:
        s = s.replace("tel:+380000000000", "tel:+" + e164)
    if email:
        s = s.replace("mailto:hello@example.com", "mailto:" + esc(email))
    if ig:
        s = s.replace("https://www.instagram.com/username/", esc(ig))
    if fb:
        s = s.replace("https://www.facebook.com/username", esc(fb))
    q = lead.get("maps_query") or ("%s, %s" % (lead["address"], city) if lead.get("address") else city)
    qe = urllib.parse.quote(q)
    s = re.sub(r'https://www\.google\.com/maps\?q=[^"&]*&amp;output=embed', "https://www.google.com/maps?q=%s&amp;output=embed" % qe, s)
    s = re.sub(r'https://www\.google\.com/maps/dir/\?api=1&amp;destination=[^"]*', "https://www.google.com/maps/dir/?api=1&amp;destination=%s" % qe, s)

    # ---- tokens
    s = re.sub(r'(?<![А-Яа-яІіЇїЄєҐґA-Za-z])([вуВУ]) (?:<span class="ph">)?\[МІСТО\](?:</span>)?', lambda m: m.group(1) + " " + esc(city_loc), s)
    s = fill(s, "[МІСТО]", city)
    s = fill(s, "[НАЗВА]", name)
    if lead.get("address"):
        s = fill(s, "[АДРЕСА]", lead["address"])
    if has_tel:
        s = fill(s, "[ТЕЛЕФОН]", phone)
    if email:
        s = fill(s, "[EMAIL]", email)
    if ig:
        s = fill(s, "[ІНСТАГРАМ]", "@" + ig_handle)

    # ---- hours
    hours, htext = lead.get("hours"), lead.get("hours_text")
    if hours and all(hours.get(str(k)) == ["00:00", "24:00"] for k in range(7)):
        htext = "Цілодобово, без вихідних"
    if htext:
        s = fill(s, "[ГОДИНИ]", htext)
    js = open(os.path.join(ROOT, "js", "main.js"), encoding="utf-8").read()
    if hours:
        parts = []
        for k in ["1", "2", "3", "4", "5", "6", "0"]:
            h = hours.get(k)
            parts.append("%s: %s" % (k, "[%s, %s]" % (to_h(h[0]), to_h(h[1])) if h else "null"))
        js_hours = "{ " + ", ".join(parts) + " }"
    else:
        js_hours = "null"
    js = re.sub(r"var HOURS = \{[^}]*\};", "var HOURS = %s;" % js_hours, js, count=1)
    assert "var HOURS = %s;" % js_hours in js
    contact = {"tel": "+" + e164 if has_tel else "", "telegram": "", "viber": "", "whatsapp": "",
               "email": email or "", "sms": "+" + e164 if mobile else "", "instagram": ig_handle or ""}
    block = "var CONTACT = {\n" + ",\n".join("    %s: %s" % (k, json.dumps(v, ensure_ascii=False)) for k, v in contact.items()) + "\n  };"
    js, n = re.subn(r"var CONTACT = \{.*?\n  \};", lambda _: block, js, count=1, flags=re.S)
    assert n == 1
    open(os.path.join(out, "js", "main.js"), "w", encoding="utf-8").write(js)

    if "contacts__grid--solo" in s:
        css_p = os.path.join(out, "css", "style.css")
        with open(css_p, "a", encoding="utf-8") as f:
            f.write("\n@media (min-width: 960px) { .contacts__grid--solo { grid-template-columns: 1fr; max-width: 640px; } }\n")

    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(s)

    # ---- README
    filled = ["назва", "місто"]
    if lead.get("address"): filled.append("адреса (карта й маршрут)")
    if has_tel: filled.append("телефон")
    if email: filled.append("email")
    if ig: filled.append("Instagram")
    if fb: filled.append("Facebook")
    if hours: filled.append("графік роботи (таблиця і статус «відчинено»)")
    elif htext: filled.append("графік роботи (текстом)")
    left = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z'’ ]+\]", s)))
    focus_ua = {"velo": "веломагазин", "rent": "прокат велосипедів", "sport": "спортивний магазин"}[focus]
    readme = ["# %s — демо-сайт" % name, "",
              "Шаблон: «Спорттовари / велосипеди / прокат» (`template/sport-velo`), акцент: %s." % focus_ua, "",
              "Заповнено з OpenStreetMap: " + ", ".join(filled) + ".",
              "Джерело: " + (lead.get("osm") or "—"), "",
              "Ще треба заповнити (позначені бурштиновим підкресленням): " + (", ".join("`%s`" % t for t in left) or "—") + ".",
              "Тарифи прокату для калькулятора — у `js/main.js` (`RENT`).",
              "Відгуки — приклади (`ph-card`), замініть на реальні. Фото — зі стоку Unsplash, бажано замінити на фото магазину.", ""]
    open(os.path.join(out, "README.md"), "w", encoding="utf-8").write("\n".join(readme))
    return s


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    lead = json.load(open(sys.argv[1], encoding="utf-8"))
    if isinstance(lead, list):
        sys.exit("pass one lead object, not a list")
    personalize(lead, os.path.abspath(sys.argv[2]))


if __name__ == "__main__":
    main()
