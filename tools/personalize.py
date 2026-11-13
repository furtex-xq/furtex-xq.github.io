#!/usr/bin/env python3
"""Personalize the avtoshkola template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Standard library only. Reads the template next to this script, writes a full
personalized copy into <outdir>. Unknown data stays as marked placeholders;
unknown contact channels are removed cleanly.
"""
import html
import json
import os
import re
import shutil
import sys
import urllib.parse

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY_FILES = ["index.html", "robots.txt", "css/style.css", "js/main.js", "img/favicon.svg"]
COPY_DIRS = ["fonts"]
DAYS_UA = {1: "Понеділок", 2: "Вівторок", 3: "Середа", 4: "Четвер", 5: "П'ятниця", 6: "Субота", 0: "Неділя"}
DAYS_SCHEMA = {1: "Mo", 2: "Tu", 3: "We", 4: "Th", 5: "Fr", 6: "Sa", 0: "Su"}
MOBILE_CODES = {"39", "50", "63", "66", "67", "68", "73", "91", "92", "93", "94", "95", "96", "97", "98", "99"}


def esc(s):
    return html.escape(s, quote=True)


def ph(token):
    return re.compile(r'<(span|b) class="ph">' + re.escape(token) + r"</\1>")


def replace_token(t, token, value):
    """Unwrap marked placeholder and replace any bare occurrences (attributes, title)."""
    v = esc(value)
    t = ph(token).sub(lambda m: v, t)
    return t.replace(token, v)


def drop_lines(t, attr):
    """Remove every line that carries the given marker attribute."""
    return "\n".join(l for l in t.split("\n") if attr not in l)


def to_hours(v):
    h, m = v.split(":")
    return int(h) + int(m) / 60


def main():
    lead_path, out = sys.argv[1], sys.argv[2]
    lead = json.load(open(lead_path, encoding="utf-8"))
    g = lambda k: (lead.get(k) or None)
    name, city, city_loc = g("name"), g("city"), g("city_loc") or g("city")
    address, phone, e164 = g("address"), g("phone"), g("phone_e164")
    email, ig, ig_handle, fb = g("email"), g("instagram"), g("instagram_handle"), g("facebook")
    hours, hours_text, mq = g("hours"), g("hours_text"), g("maps_query")
    if ig and not ig_handle:
        ig_handle = ig.rstrip("/").split("/")[-1]
    if not (phone and e164):
        phone = e164 = None

    os.makedirs(out, exist_ok=True)
    for f in COPY_FILES:
        os.makedirs(os.path.dirname(os.path.join(out, f)) or out, exist_ok=True)
        shutil.copy2(os.path.join(ROOT, f), os.path.join(out, f))
    for d in COPY_DIRS:
        shutil.copytree(os.path.join(ROOT, d), os.path.join(out, d), dirs_exist_ok=True)

    t = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    have = {"phone": bool(phone), "email": bool(email), "instagram": bool(ig), "facebook": bool(fb),
            "viber": False, "telegram": False, "whatsapp": False}

    # ---- JSON-LD: rebuild from data so it is always valid ----
    ld = {
        "@context": "https://schema.org", "@type": "DrivingSchool",
        "name": name or "[НАЗВА]",
        "description": "Автошкола " + ("у " + city_loc if city else "") + ": навчання водінню категорій A, B, C, підготовка до іспиту в ТСЦ МВС.",
    }
    old_ld = re.search(r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>', t, re.S)
    ld["image"] = json.loads(old_ld.group(1))["image"]
    if phone:
        ld["telephone"] = "+" + e164
    if email:
        ld["email"] = email
    ld["foundingDate"] = "[РІК]"
    ld["priceRange"] = "від [ЦІНА] грн"
    if hours:
        spec = []
        for d in (1, 2, 3, 4, 5, 6, 0):
            v = hours.get(str(d))
            if v:
                spec.append(f"{DAYS_SCHEMA[d]} {v[0]}-{v[1]}")
        ld["openingHours"] = spec
    adr = {"@type": "PostalAddress"}
    if address:
        adr["streetAddress"] = address
    if city:
        adr["addressLocality"] = city
    adr["addressCountry"] = "UA"
    ld["address"] = adr
    if city:
        ld["areaServed"] = city
    same = [u for u in (ig, fb) if u]
    if same:
        ld["sameAs"] = same
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/")
    t = t[:old_ld.start(1)] + ld_txt + t[old_ld.end(1):]

    # ---- city grammar: after в/у use locative ----
    if city:
        def loc(m):
            prep = m.group(1)
            if city_loc[:1] in "ВвФф":
                prep = "у" if prep.islower() else "У"
            return prep + " " + esc(city_loc)
        t = re.sub(r'(?<![А-Яа-яІіЇїЄєҐґ])([вуВУ]) (?:<span class="ph">\[МІСТО\]</span>|\[МІСТО\])', loc, t)
        t = replace_token(t, "[МІСТО]", city)
        t = t.replace("| Курси водіння Івано-Франківськ", "| Курси водіння " + esc(city))

    if name:
        t = replace_token(t, "[НАЗВА]", name)
    if address:
        t = replace_token(t, "[АДРЕСА]", address)
    if ig:
        t = replace_token(t, "[ІНСТАГРАМ]", "@" + ig_handle)
        t = t.replace("https://www.instagram.com/username/", esc(ig))
    if fb:
        t = t.replace("https://www.facebook.com/username", esc(fb))
    if email:
        t = replace_token(t, "[EMAIL]", email)
        t = t.replace("mailto:hello@example.com", "mailto:" + esc(email))

    # ---- phone ----
    if phone:
        t = replace_token(t, "[ТЕЛЕФОН]", phone)
        t = t.replace("tel:+380000000000", "tel:+" + e164)
    else:
        t = t.replace(", [ТЕЛЕФОН].", ".")
        if ig:  # calling CTAs switch to Instagram
            ig_btn_hero = f'        <a class="btn btn--ghost btn--lg" href="{esc(ig)}" target="_blank" rel="noopener"><svg class="ic"><use href="#i-ig"/></svg>Написати в Instagram</a>'
            ig_btn_bar = f'  <a href="{esc(ig)}" target="_blank" rel="noopener"><svg class="ic"><use href="#i-ig"/></svg>Instagram</a>'
            t = re.sub(r'^ *<a class="btn btn--ghost btn--lg" data-ch="phone".*$', ig_btn_hero, t, flags=re.M)
            t = re.sub(r'^  <a data-ch="phone" href="tel:.*Дзвінок</a>$', ig_btn_bar, t, flags=re.M)

    # ---- remove unknown channels (whole marked lines) ----
    for ch, ok in have.items():
        if not ok:
            t = drop_lines(t, f'data-ch="{ch}"')

    # ---- form send options ----
    chips = []
    if ig:
        chips.append('          <label class="chip" data-ch="instagram"><input type="radio" name="via" value="instagram"><span>Instagram</span></label>')
    if phone and e164.startswith("380") and e164[3:5] in MOBILE_CODES:
        chips.append('          <label class="chip" data-ch="sms"><input type="radio" name="via" value="sms"><span>SMS</span></label>')
    m = re.search(r'(<div class="chips chips--send">)(.*?)(\n        </div>)', t, re.S)
    existing = [l for l in m.group(2).split("\n") if l.strip()]
    lines = existing + chips
    lines = [l.replace(" checked>", ">") for l in lines]
    if lines:
        lines[0] = lines[0].replace('name="via" value=', 'name="via" checked value=', 1)
    t = t[:m.start(2)] + "".join("\n" + l for l in lines) + t[m.end(2):]
    fs = re.search(r'      <fieldset class="field" data-send>.*?</fieldset>\n', t, re.S)
    if not lines:
        t = t[:fs.start()] + t[fs.end():]
    elif len(lines) == 1:
        t = t.replace('<fieldset class="field" data-send>', '<fieldset class="field" data-send hidden>')
    vals = [re.search(r'value="(\w+)"', l).group(1) for l in lines]
    if not vals:
        fine = "Після натискання текст заявки скопіюється" + (", а ми покажемо номер, за яким можна записатися." if phone else ".")
    elif vals == ["instagram"]:
        fine = "Натискаючи кнопку, ви скопіюєте текст заявки й відкриєте Instagram, щоб надіслати його нам."
    elif vals == ["sms"]:
        fine = "Натискаючи кнопку, ви відкриєте SMS із готовим текстом заявки."
    elif vals == ["email"]:
        fine = "Натискаючи кнопку, ви відкриєте пошту з готовим текстом заявки."
    else:
        fine = "Натискаючи кнопку, ви відкриєте вибраний спосіб зв'язку з готовим текстом заявки."
    t = re.sub(r'(<p class="book__fine" id="book-fine">).*?(</p>)', lambda mm: mm.group(1) + fine + mm.group(2), t)
    t = re.sub(r'data-phone="[^"]*"', 'data-phone="' + ("+" + e164 if phone else "") + '"' + (' data-phone-text="' + esc(phone) + '"' if phone else ""), t)
    t = re.sub(r'data-tg="[^"]*"', 'data-tg=""', t)
    t = re.sub(r'data-mail="[^"]*"', 'data-mail="' + esc(email or "") + '"', t)
    t = re.sub(r'data-ig="[^"]*"', 'data-ig="' + esc(ig_handle or "") + '"', t)

    # FAQ lead text: only real channels
    ways = []
    if phone:
        ways.append("зателефонуйте нам")
    if ig:
        ways.append("напишіть в Instagram")
    elif email:
        ways.append("напишіть на пошту")
    faq = "Не знайшли відповіді? " + (" або ".join(ways).capitalize() + " — відповімо в робочий час." if ways else "Запитайте на консультації — відповімо на все.")
    t = re.sub(r'(<p class="sec__lead" data-faq-lead>).*?(</p>)', lambda mm: mm.group(1) + faq + mm.group(2), t)

    # ---- map + route ----
    q = mq or ((address + ", " if address else "") + (city or "")) or None
    if q:
        enc = urllib.parse.quote(q, safe="")
        old = "https://www.google.com/maps?q=%D0%86%D0%B2%D0%B0%D0%BD%D0%BE-%D0%A4%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA"
        t = t.replace(old + "&amp;output=embed", "https://www.google.com/maps?q=" + enc + "&amp;output=embed")
        t = t.replace(old, "https://www.google.com/maps/dir/?api=1&amp;destination=" + enc)

    # ---- hours ----
    if hours:
        cfg = {}
        rows = []
        for d in (1, 2, 3, 4, 5, 6, 0):
            v = hours.get(str(d))
            cfg[str(d)] = [round(to_hours(v[0]), 4), round(to_hours(v[1]), 4)] if v else None
            cell = f"{v[0]}–{v[1]}" if v else "вихідний"
            rows.append(f'            <tr data-day="{d}"><th scope="row">{DAYS_UA[d]}</th><td>{cell}</td></tr>')
        t = re.sub(r"data-hours='[^']*'", "data-hours='" + json.dumps(cfg, separators=(",", ":")) + "'", t)
        t = re.sub(r"(<tbody>\n).*?(\n          </tbody>)", lambda mm: mm.group(1) + "\n".join(rows) + mm.group(2), t, flags=re.S)
        t = re.sub(r'\n *<p class="hours__sum">.*?</p>', "", t)  # table already says it all
    else:
        # no reliable schedule: no live status, no table with sample hours
        t = t.replace(' data-live', '')
        t = re.sub(r" data-hours='[^']*'", "", t)
        t = re.sub(r'\n *<p class="hours__status">.*?</p>', "", t)
        t = re.sub(r'\n *<table class="hours__table".*?</table>', "", t, flags=re.S)
        if hours_text:
            t = replace_token(t, "[ГОДИНИ]", hours_text)
        t = t.replace('<p class="hours__sum">', '<p class="hours__sum"><span class="hours__label">Графік роботи</span>')

    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(t)

    # ---- README ----
    left = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z'’]+\]", t)))
    filled = [k for k, v in (("назва", name), ("місто", city), ("адреса", address), ("телефон", phone), ("email", email),
                              ("Instagram", ig), ("Facebook", fb), ("графік роботи", hours or hours_text), ("точка на мапі", mq)) if v]
    readme = f"""# {name or 'Автошкола'} — демо-сайт

Шаблон: **avtoshkola** (автошкола, гілка `template/avtoshkola`).

З OpenStreetMap заповнено: {', '.join(filled) or 'нічого'}.
Невідомі канали зв'язку (Viber, Telegram, WhatsApp{'' if email else ', email'}{'' if ig else ', Instagram'}{'' if fb else ', Facebook'}{'' if phone else ', телефон'}) прибрано з сайту.

Залишилось заповнити (позначено жовтим пунктиром на сторінці):
""" + "\n".join(f"- `{x}`" for x in left) + """
- відгуки-приклади (картки «Приклад відгуку — замініть на реальний»)
- фото (зараз — Unsplash) — замінити на фото школи, авто й інструкторів
"""
    open(os.path.join(out, "README.md"), "w", encoding="utf-8").write(readme)


if __name__ == "__main__":
    main()
