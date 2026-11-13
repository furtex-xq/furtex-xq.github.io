#!/usr/bin/env python3
"""Personalize the barbershop template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Fills known lead data (name, city, address, phone, email, socials, hours, map),
removes channels the lead does not have (Viber/Telegram/WhatsApp always; email,
Instagram, Facebook, phone when unknown) and leaves every unknown value as a
marked placeholder. Standard library only. The template working tree is never
modified.
"""
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY_EXCLUDE = {".git", ".github", "tools", "node_modules", "README.md"}
DAYS = [("1", "Понеділок"), ("2", "Вівторок"), ("3", "Середа"), ("4", "Четвер"),
        ("5", "П'ятниця"), ("6", "Субота"), ("0", "Неділя")]
CITY_SENTINEL_Q = quote("Івано-Франківськ")
ALL_CHANNELS = ("tel", "viber", "telegram", "whatsapp", "instagram", "facebook", "email", "route")


def load_lead(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):  # allow a list file with exactly one lead
        if len(data) != 1:
            sys.exit("lead file holds a list; pass one lead object")
        data = data[0]
    return data


def esc(v):
    return html.escape(v, quote=True)


def known_channels(lead):
    ch = {"route"}
    if lead.get("phone") and lead.get("phone_e164"):
        ch.add("tel")
    if lead.get("email"):
        ch.add("email")
    if lead.get("instagram"):
        ch.add("instagram")
    if lead.get("facebook"):
        ch.add("facebook")
    return ch


def remove_channel(s, ch):
    """Remove every element (a / label) marked data-ch="<ch>" together with its line indent."""
    s = re.sub(r'[ \t]*<a\b[^>]*\bdata-ch="%s"[^>]*>.*?</a>[ \t]*\n?' % ch, "", s, flags=re.S)
    s = re.sub(r'[ \t]*<label\b[^>]*\bdata-ch="%s"[^>]*>.*?</label>[ \t]*\n?' % ch, "", s, flags=re.S)
    return s


def city_fix(text, lead, wrapped):
    """[МІСТО] after в/у → locative, otherwise nominative. wrapped=True handles <span class="ph">."""
    city, loc = lead.get("city"), lead.get("city_loc") or lead.get("city")
    if not city:
        return text
    enc = esc if wrapped else (lambda v: v)
    tok = r'(?:<span class="ph">)?\[МІСТО\](?:</span>)?' if wrapped else r"\[МІСТО\]"
    vowel = loc[:1].upper() in "АЕЄИІЇОУЮЯ"

    def prep(m):
        p = m.group(1)
        word = ("в" if vowel else "у")
        word = word.upper() if p[0].isupper() else word
        return word + p[1:] + enc(loc)

    text = re.sub(r"(?<![\w])([ВвУу]\s+)" + tok, prep, text)
    return re.sub(tok, lambda m: enc(city), text)


def token_values(lead):
    v = {}
    if lead.get("name"):
        v["[НАЗВА]"] = lead["name"].strip()
    if lead.get("address"):
        v["[АДРЕСА]"] = lead["address"].strip()
    if lead.get("phone"):
        v["[ТЕЛЕФОН]"] = lead["phone"].strip()
    if lead.get("email"):
        v["[EMAIL]"] = lead["email"].strip()
    if lead.get("instagram_handle") or lead.get("instagram"):
        h = lead.get("instagram_handle") or lead["instagram"].rstrip("/").rsplit("/", 1)[-1]
        v["[ІНСТАГРАМ]"] = "@" + h.lstrip("@")
    if lead.get("hours_text"):
        v["[ГОДИНИ]"] = lead["hours_text"].strip()
    return v


def fill_tokens(text, values, lead, wrapped):
    text = city_fix(text, lead, wrapped)
    for tok, val in values.items():
        if wrapped:
            text = text.replace('<span class="ph">%s</span>' % tok, esc(val))
            text = text.replace(tok, esc(val))
        else:
            text = text.replace(tok, val)
    return text


def personalize_jsonld(block, lead, values):
    data = json.loads(block)

    def walk(o):
        if isinstance(o, dict):
            return {k: walk(x) for k, x in o.items()}
        if isinstance(o, list):
            return [walk(x) for x in o]
        if isinstance(o, str):
            return fill_tokens(o, values, lead, wrapped=False)
        return o

    data = walk(data)
    if not lead.get("phone"):
        data.pop("telephone", None)
    if not lead.get("email"):
        data.pop("email", None)
    same = [u for u in (lead.get("instagram"), lead.get("facebook")) if u]
    if same:
        data["sameAs"] = same
    else:
        data.pop("sameAs", None)
    if lead.get("hours"):
        spec = []
        for key, _ in DAYS:
            span = lead["hours"].get(key)
            if span:
                spec.append({"@type": "OpeningHoursSpecification",
                             "dayOfWeek": "https://schema.org/" + ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][int(key)],
                             "opens": span[0], "closes": span[1]})
        data.pop("openingHours", None)
        data["openingHoursSpecification"] = spec
    elif lead.get("hours_text"):
        data.pop("openingHours", None)  # free text is not valid schema.org syntax
    if lead.get("maps_query"):
        data["hasMap"] = "https://www.google.com/maps/search/?api=1&query=" + quote(lead["maps_query"])
    out = json.dumps(data, ensure_ascii=False, indent=2)
    return out.replace("</", "<\\/")


def hours_rows(hours):
    rows = []
    for key, label in DAYS:
        span = hours.get(key)
        if span:
            rows.append('          <tr data-day="%s" data-open="%s" data-close="%s"><th>%s</th><td>%s – %s</td></tr>'
                        % (key, span[0], span[1], esc(label), span[0], span[1]))
        else:
            rows.append('          <tr data-day="%s" data-open="" data-close=""><th>%s</th><td>Вихідний</td></tr>'
                        % (key, esc(label)))
    return "\n".join(rows)


def personalize_html(s, lead):
    values = token_values(lead)
    chans = known_channels(lead)

    # 1. JSON-LD (handled as data so it stays valid JSON)
    m = re.search(r'(<script type="application/ld\+json">\s*)(.*?)(\s*</script>)', s, flags=re.S)
    s = s[:m.start(2)] + personalize_jsonld(m.group(2), lead, values) + s[m.end(2):]

    # 2. Unknown channels → remove buttons/options. Viber/Telegram/WhatsApp are never known.
    for ch in ALL_CHANNELS:
        if ch not in chans:
            s = remove_channel(s, ch)
    if "tel" not in chans:
        s = s.replace(" Тел. [ТЕЛЕФОН].", "")

    # 3. Form channels: email (if known) + SMS (if phone known)
    s = re.sub(r'\s+data-(telegram|viber)="[^"]*"', "", s)
    if lead.get("email"):
        s = s.replace('data-email="mailto:hello@example.com"', 'data-email="mailto:%s"' % esc(lead["email"].strip()))
    else:
        s = re.sub(r'\s+data-email="[^"]*"', "", s)
    form_ch = []
    if "tel" in chans:
        s = s.replace("<form class=\"form\" id=\"form\" novalidate",
                      '<form class="form" id="form" novalidate data-sms="sms:+%s"' % lead["phone_e164"], 1)
        sms = '          <label data-ch="sms"><input type="radio" name="channel" value="sms"><span>SMS</span></label>\n'
        s = s.replace("          <legend>Надіслати через</legend>\n", "          <legend>Надіслати через</legend>\n" + sms, 1)
        form_ch.append("sms")
    if lead.get("email"):
        form_ch.append("email")
    if form_ch:
        # first remaining option is the default
        s = s.replace(' checked>', '>')
        s = s.replace('value="%s">' % form_ch[0], 'value="%s" checked>' % form_ch[0], 1)
        if len(form_ch) == 1:  # single channel: no choice to show
            s = s.replace('<fieldset class="channels" id="channels">', '<fieldset class="channels" id="channels" hidden>')
        label = {"sms": "Надіслати SMS із заявкою", "email": "Надіслати заявку на пошту"}
        if len(form_ch) == 1:
            s = s.replace(">Надіслати заявку</button>", ">%s</button>" % label[form_ch[0]])
    else:
        # nothing can deliver the form → drop the form, keep the heading + contacts
        s = re.sub(r'\s*<p class="booking__note">.*?</p>', "", s, flags=re.S)
        s = re.sub(r'\s*<form class="form".*?</form>', "", s, flags=re.S)
        s = s.replace("<h2>Записатися на стрижку</h2>",
                      "<h2>Записатися на стрижку</h2>\n      <p class=\"booking__note\">Напишіть нам — підберемо зручний час і майстра.</p>")

    # 4. No phone → CTAs that called switch to Instagram / the form
    if "tel" not in chans:
        bar = re.search(r'<nav class="actionbar".*?</nav>', s, flags=re.S)
        if bar and lead.get("instagram"):
            ig = ('<a href="%s" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/>'
                  '<circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/></svg>Instagram</a>\n  ' % esc(lead["instagram"]))
            s = s.replace('<nav class="actionbar" aria-label="Швидкі дії">\n  ',
                          '<nav class="actionbar" aria-label="Швидкі дії">\n  ' + ig, 1)
            s = s.replace('<div class="hero__cta">\n        <a class="btn btn--brass" href="#booking">Записатися онлайн</a>',
                          '<div class="hero__cta">\n        <a class="btn btn--brass" href="#booking">Записатися онлайн</a>\n'
                          '        <a class="btn btn--ghost" href="%s" target="_blank" rel="noopener">Написати в Instagram</a>' % esc(lead["instagram"]), 1)
        elif bar:
            s = s.replace('<nav class="actionbar" aria-label', '<nav class="actionbar actionbar--two" aria-label', 1)

    # 5. Hours
    hours = lead.get("hours")
    if hours:
        s = re.sub(r'(<table class="hours__table" id="hours">\n).*?(\n\s*</table>)',
                   lambda m: m.group(1) + hours_rows(hours) + m.group(2), s, flags=re.S)
        if not lead.get("hours_text"):
            s = re.sub(r'\s*<p class="hours__sum">.*?</p>', "", s, flags=re.S)
    else:
        # no reliable schedule → no fake table, no live status
        s = re.sub(r'\s*<!-- Графік для статусу.*?</table>', "", s, flags=re.S)
        s = re.sub(r'\s*<p class="status[^"]*" data-status>.*?</p>', "", s, flags=re.S)
    s = re.sub(r'\s*<!-- Графік для статусу[^>]*-->', "", s)

    # 6. Map + route
    if lead.get("maps_query"):
        q = quote(lead["maps_query"])
        s = s.replace("https://www.google.com/maps?q=%s&amp;output=embed" % CITY_SENTINEL_Q,
                      "https://www.google.com/maps?q=%s&amp;output=embed" % q)
        s = s.replace("https://www.google.com/maps/dir/?api=1&amp;destination=%s" % CITY_SENTINEL_Q,
                      "https://www.google.com/maps/dir/?api=1&amp;destination=%s" % q)

    # 7. Links with known values
    if "tel" in chans:
        s = s.replace("tel:+380000000000", "tel:+" + lead["phone_e164"])
    if lead.get("email"):
        s = s.replace("mailto:hello@example.com", "mailto:" + esc(lead["email"].strip()))
    if lead.get("instagram"):
        s = s.replace("https://www.instagram.com/username/", esc(lead["instagram"]))
    if lead.get("facebook"):
        s = s.replace("https://www.facebook.com/username", esc(lead["facebook"]))

    # 8. Visible tokens / attributes / title / meta (unwrap ph spans for known values)
    # name already says "барбершоп" → avoid «Барбершоп Барбершоп …»
    if lead.get("name") and re.search(r"барбершоп|barbershop", lead["name"], re.I):
        s = s.replace('Барбершоп <span class="ph">[НАЗВА]</span>', '<span class="ph">[НАЗВА]</span>')
        s = s.replace("Барбершоп [НАЗВА]", "[НАЗВА]")
    head_end = s.index("</head>")
    # JSON-LD already done; protect it from HTML escaping
    ld = re.search(r'<script type="application/ld\+json">.*?</script>', s, flags=re.S)
    before, ldtxt, after = s[:ld.start()], ld.group(0), s[ld.end():]
    s = fill_tokens(before, values, lead, True) + ldtxt + fill_tokens(after, values, lead, True)
    del head_end

    # "Фото: Unsplash" stays; mark hidden status-free layout
    return s


def personalize_js(s, lead):
    if not lead.get("hours"):
        s = s.replace("  updateStatus();\n  setInterval(updateStatus, 60000);",
                      "  if (rows.length) { updateStatus(); setInterval(updateStatus, 60000); }")
    return s


def readme(lead):
    filled = []
    for key, label in (("name", "назва"), ("address", "адреса"), ("city", "місто"), ("phone", "телефон"),
                       ("email", "email"), ("instagram", "Instagram"), ("facebook", "Facebook")):
        if lead.get(key):
            filled.append("- %s: %s" % (label, lead[key]))
    if lead.get("hours"):
        filled.append("- години роботи: %s (таблиця + статус «відчинено/зачинено»)" % (lead.get("hours_text") or lead.get("hours_osm") or ""))
    elif lead.get("hours_text"):
        filled.append("- години роботи (лише текстом): %s" % lead["hours_text"])
    if lead.get("maps_query"):
        filled.append("- карта й маршрут: %s" % lead["maps_query"])
    left = ["`[ЦІНА]` — ціни в прайсі та альбомі стрижок", "`[РІК]` — рік відкриття", "`[ФОП]` — ФОП / ЄДРПОУ у футері",
            "`[ІМ'Я]` і тексти 3 відгуків (картки «Приклад відгуку»)"]
    if not lead.get("hours") and not lead.get("hours_text"):
        left.append("`[ГОДИНИ]` — години роботи (і після цього можна повернути таблицю зі статусом)")
    for key, label in (("phone", "телефон"), ("email", "email"), ("instagram", "Instagram"), ("facebook", "Facebook")):
        if not lead.get(key):
            left.append("%s — невідомий, кнопку прибрано" % label)
    left.append("Viber / Telegram / WhatsApp — невідомі, кнопки прибрано")
    left.append("фото — зараз стокові з Unsplash; попросити фото залу, майстрів і робіт")
    return ("# %s — демо-сайт барбершопу\n\nШаблон: `barbershop` (#20). Демо: "
            "https://raw.githack.com/furtex-xq/furtex-xq.github.io/beta/%s/index.html\n\n"
            "## Заповнено з OpenStreetMap\n%s\n\n## Ще треба заповнити\n%s\n"
            % (lead.get("name"), lead.get("slug"), "\n".join(filled), "\n".join("- " + x for x in left)))


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    lead = load_lead(sys.argv[1])
    out = os.path.abspath(sys.argv[2])
    if out == ROOT or out.startswith(ROOT + os.sep):
        sys.exit("outdir must be outside the template working tree")
    os.makedirs(out, exist_ok=True)

    for name in os.listdir(ROOT):
        if name in COPY_EXCLUDE or name.endswith(".zip"):
            continue
        src, dst = os.path.join(ROOT, name), os.path.join(out, name)
        if os.path.isdir(src):
            if name == "img":
                shutil.copytree(src, dst, dirs_exist_ok=True, ignore=shutil.ignore_patterns("photos"))
            else:
                shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            shutil.copy2(src, dst)

    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
        page = personalize_html(f.read(), lead)
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as f:
        f.write(page)
    with open(os.path.join(ROOT, "js/main.js"), encoding="utf-8") as f:
        js = personalize_js(f.read(), lead)
    with open(os.path.join(out, "js/main.js"), "w", encoding="utf-8") as f:
        f.write(js)
    with open(os.path.join(out, "README.md"), "w", encoding="utf-8") as f:
        f.write(readme(lead))
    print("ok", lead.get("slug"), "->", out)


if __name__ == "__main__":
    main()
