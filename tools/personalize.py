#!/usr/bin/env python3
"""Personalize the «фітнес-клуб» template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Reads the template next to this script (index.html, css/, js/, fonts/, img/ without
photos, robots.txt) and writes a filled copy into <outdir>. Known values replace the
placeholder tokens and lose the .ph marking; unknown channels are removed (elements
carrying data-ch="..."); unknown facts stay as marked placeholders. Standard library only.
"""
import html, json, os, re, shutil, sys, urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY = ["index.html", "robots.txt", "css", "js", "fonts", "img"]
SKIP_DIRS = {"photos"}
MOBILE_CODES = {"39", "50", "63", "66", "67", "68", "73", "91", "92", "93", "94", "95", "96", "97", "98", "99"}

LATIN2CYR = str.maketrans({"a": "а", "c": "с", "e": "е", "i": "і", "o": "о", "p": "р", "x": "х", "y": "у",
                           "A": "А", "B": "В", "C": "С", "E": "Е", "H": "Н", "I": "І", "K": "К", "M": "М",
                           "O": "О", "P": "Р", "T": "Т", "X": "Х"})


def clean_name(name):
    """Fix stray Latin look-alike letters inside a Cyrillic name; keep Latin names as they are."""
    name = name.strip()
    words = []
    for w in name.split(" "):
        # only mixed words (Cyrillic with stray Latin look-alikes) are fixed; «Energy» stays Latin
        if re.search("[а-яіїєґА-ЯІЇЄҐ]", w) and re.search("[A-Za-z]", w):
            w = w.translate(LATIN2CYR)
        words.append(w)
    name = " ".join(words)
    return name[0].upper() + name[1:]


def esc(v):
    return html.escape(v, quote=True)


def remove_elements(s, attr_re):
    """Remove every element whose start tag matches attr_re (balanced on the same tag name),
    together with the indentation before it."""
    while True:
        m = re.search(r"<([a-zA-Z0-9]+)\b[^>]*" + attr_re + r"[^>]*>", s)
        if not m:
            return s
        tag, start, pos, depth = m.group(1), m.start(), m.end(), 1
        tok = re.compile(r"<(/?)" + tag + r"\b[^>]*?(/?)>")
        while depth:
            t = tok.search(s, pos)
            if not t:
                raise ValueError("unbalanced <%s>" % tag)
            depth += -1 if t.group(1) else (0 if t.group(2) else 1)
            pos = t.end()
        ls = s.rfind("\n", 0, start)
        if ls != -1 and s[ls + 1:start].strip() == "":
            start = ls
        s = s[:start] + s[pos:]


def fill(s, token, value):
    """Replace <span class="ph">TOKEN</span> (and bare TOKEN) with value, html-escaped."""
    v = esc(value)
    s = s.replace('<span class="ph">%s</span>' % token, v)
    return s.replace(token, v)


def must_replace(s, old, new):
    if old not in s:
        raise ValueError("template text not found: " + old[:70])
    return s.replace(old, new)


def to_h(t):
    hh, mm = t.split(":")
    v = int(hh) + int(mm) / 60
    return int(v) if v == int(v) else round(v, 2)


def join_or(parts):
    return parts[0] if len(parts) == 1 else ", ".join(parts[:-1]) + " чи " + parts[-1]


def build_jsonld(lead, name, old):
    city = lead.get("city") or "Івано-Франківськ"
    d = {
        "@context": "https://schema.org",
        "@type": "ExerciseGym",
        "name": name,
        "description": "Фітнес-клуб %s %s: тренажерний зал, функціональні та групові тренування, персональний тренер." % (
            "в" if (lead.get("city_loc") or city)[:1] in "АЕЄИІЇОУЮЯ" else "у", lead.get("city_loc") or city),
        "image": old["image"],
        "address": {"@type": "PostalAddress", "addressLocality": city, "addressCountry": "UA"},
    }
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
        d["openingHoursSpecification"] = [
            {"@type": "OpeningHoursSpecification", "dayOfWeek": names[int(k)], "opens": hours[k][0],
             "closes": "23:59" if hours[k][1] == "24:00" else hours[k][1]}
            for k in ["1", "2", "3", "4", "5", "6", "0"] if hours.get(k)]
    if lead.get("maps_query"):
        d["hasMap"] = "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(lead["maps_query"])
    d["priceRange"] = old["priceRange"]
    d["hasOfferCatalog"] = old["hasOfferCatalog"]
    return d


def personalize(lead, out):
    name = clean_name(lead["name"])
    city = lead.get("city") or "Івано-Франківськ"
    city_loc = lead.get("city_loc") or city
    phone, e164 = lead.get("phone"), lead.get("phone_e164")
    email, ig, ig_handle, fb = lead.get("email"), lead.get("instagram"), lead.get("instagram_handle"), lead.get("facebook")
    if ig and not ig_handle:
        ig_handle = ig.rstrip("/").rsplit("/", 1)[-1]
    has_tel = bool(phone and e164)
    is_mobile = has_tel and e164.startswith("380") and e164[3:5] in MOBILE_CODES

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

    # ---- JSON-LD: rebuild from known data
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    old = json.loads(m.group(2))
    ld_txt = json.dumps(build_jsonld(lead, name, old), ensure_ascii=False, indent=2).replace("</", "<\\/")
    s = s[:m.start(2)] + "\n" + ld_txt + "\n" + s[m.end(2):]

    # ---- form: «send via» options from what the lead really has
    opts = []
    if is_mobile:
        opts.append(("sms", "i-sms", "SMS"))
    if ig:
        opts.append(("ig", "i-insta", "Instagram"))
    if email:
        opts.append(("mail", "i-mail", "Email"))
    form_m = re.search(r'<form class="book".*?</form>', s, re.S)
    if opts:
        labels = "".join('\n          <label><input type="radio" name="via" value="%s"%s><span><svg><use href="#%s"/></svg>%s</span></label>'
                         % (v, " checked" if i == 0 else "", ic, t) for i, (v, ic, t) in enumerate(opts))
        legend = "Куди надіслати заявку" if len(opts) > 1 else "Заявку буде надіслано через"
        fs = re.search(r'<fieldset class="via">.*?</fieldset>', s, re.S)
        s = s[:fs.start()] + '<fieldset class="via">\n          <legend>%s</legend>%s\n        </fieldset>' % (legend, labels) + s[fs.end():]
        has_form = True
    elif has_tel:  # landline only: the form becomes a «call us» card
        card = ('<div class="book book--call" id="book">\n'
                '        <h3 id="book-title">Запис на пробне тренування</h3>\n'
                '        <p class="book__sub">Найшвидше — подзвонити адміністратору: підберемо зручний час пробного тренування і відповімо на питання про абонементи.</p>\n'
                '        <a class="btn btn--accent btn--wide" href="tel:+380000000000"><svg><use href="#i-phone"/></svg>[ТЕЛЕФОН]</a>\n'
                '      </div>')
        s = s[:form_m.start()] + card + s[form_m.end():]
        has_form = False
    else:
        s = s[:form_m.start()] + s[form_m.end():]
        s = s.replace('href="#book"', 'href="#contacts"')
        has_form = False

    # «Як почати», step 1: only the ways that really exist
    ways = (["через форму"] if has_form else []) + (["телефоном"] if has_tel else []) + (["в Instagram"] if ig else [])
    if ways:
        w = join_or(ways)
        s = must_replace(s, "<p>Через форму, телефоном чи в Instagram. Підбираємо",
                         "<p>%s. Підбираємо" % (w[0].upper() + w[1:]))
    if not has_form:
        s = s.replace("<h3>Залишаєте заявку</h3>", "<h3>Зв'язуєтеся з нами</h3>")

    # no phone: call buttons switch to Instagram
    if not has_tel and ig:
        s = must_replace(s, '<a data-ch="tel" href="tel:+380000000000"><svg><use href="#i-phone"/></svg>Дзвінок</a>',
                         '<a href="%s" target="_blank" rel="noopener"><svg><use href="#i-insta"/></svg>Instagram</a>' % esc(ig))

    gone = {"viber", "tg", "wa"}
    if not has_tel:
        gone.add("tel")
    if not email:
        gone.add("mail")
    if not ig:
        gone.add("ig")
    if not fb:
        gone.add("fb")
    for ch in sorted(gone):
        s = remove_elements(s, r'data-ch="%s"' % ch)
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
    vowel_start = city_loc[:1] in "АЕЄИІЇОУЮЯ"

    def prep(mm):
        p = mm.group(1)
        if vowel_start:  # «в Івано-Франківську», not «у Івано-Франківську»
            p = {"у": "в", "У": "В"}.get(p, p)
        return p + " " + esc(city_loc)
    s = re.sub(r'(?<![А-Яа-яІіЇїЄєҐґA-Za-z])([вуВУ]) (<span class="ph">)?\[МІСТО\](</span>)?', prep, s)
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
    if hours:
        # the generated day table says it all; drop the summary line
        s = must_replace(s, '\n          <p class="hours__text" data-hours-text><span class="ph">[ГОДИНИ]</span></p>', "")
    elif htext:
        s = fill(s, "[ГОДИНИ]", htext)
    if not has_tel:
        s = s.replace("Якщо застосунок не відкрився, зателефонуйте нам", "Якщо застосунок не відкрився, напишіть нам в Instagram" if ig else "Якщо застосунок не відкрився, напишіть нам")

    # ---- js
    js = open(os.path.join(ROOT, "js", "main.js"), encoding="utf-8").read()
    if hours:
        parts = []
        for k in ["1", "2", "3", "4", "5", "6", "0"]:
            h = hours.get(k)
            parts.append("%s: %s" % (k, "[%s, %s]" % (to_h(h[0]), to_h(h[1])) if h else "null"))
        js_hours = "{ " + ", ".join(parts) + " }"
    else:
        js_hours = "null"
    js, n = re.subn(r"var HOURS = \{[^}]*\};", "var HOURS = %s;" % js_hours, js, count=1)
    assert n == 1
    cfg = {
        'name: "[НАЗВА]"': "name: %s" % json.dumps(name, ensure_ascii=False),
        'phone: "+380000000000"': "phone: %s" % json.dumps("+" + e164 if is_mobile else ""),
        'viber: "viber://chat?number=%2B380000000000"': 'viber: ""',
        'telegram: "https://t.me/username"': 'telegram: ""',
        'whatsapp: "https://wa.me/380000000000"': 'whatsapp: ""',
        'instagram: "https://www.instagram.com/username/"': "instagram: %s" % json.dumps(ig or ""),
        'email: "hello@example.com"': "email: %s" % json.dumps(email or ""),
    }
    for a, b in cfg.items():
        js = must_replace(js, a, b)
    if not has_tel:
        js = js.replace("зателефонуйте нам — підберемо", "напишіть нам в Instagram — підберемо" if ig else "напишіть нам — підберемо")
        js = js.replace('"Зателефонуйте нам, і ми', '"Напишіть нам, і ми')
    open(os.path.join(out, "js", "main.js"), "w", encoding="utf-8").write(js)
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(s)

    # ---- README
    filled = ["назва", "місто"]
    if lead.get("address"): filled.append("адреса")
    if has_tel: filled.append("телефон" + ("" if is_mobile else " (стаціонарний — замість форми кнопка «Подзвонити»)"))
    if email: filled.append("email")
    if ig: filled.append("Instagram")
    if fb: filled.append("Facebook")
    if hours: filled.append("графік роботи (таблиця і статус «відчинено»)")
    elif htext: filled.append("графік роботи (текстом)")
    left = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z'’ ]+\]", s)))
    readme = ["# %s — демо-сайт" % name, "",
              "Шаблон: «Фітнес-клуб / спортзал» (`template/fitnes`).", "",
              "Заповнено з OpenStreetMap: " + ", ".join(filled) + ".",
              "Джерело: " + (lead.get("osm") or "—"), "",
              "Ще треба заповнити (позначені бурштиновим підкресленням): " + (", ".join("`%s`" % t for t in left) or "—") + ".",
              "Розклад групових (`CLASSES` у `js/main.js`) — приклад, узгодьте з клубом.",
              "Відгуки — приклади (`ph-card`), замініть на реальні. Фото — зі стоку Unsplash, бажано замінити на фото залу й тренерів.", ""]
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
