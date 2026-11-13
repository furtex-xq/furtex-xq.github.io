#!/usr/bin/env python3
"""Personalize the «nerukhomist» (real estate agency) template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

<lead.json> may hold one lead object or a list (then <outdir>/<slug>/ is written per lead).
Standard library only. The template working tree is never modified.
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
IF_ENC = quote("Івано-Франківськ")  # city encoded in the template's map/route links
DAY_NAMES = {1: "Понеділок", 2: "Вівторок", 3: "Середа", 4: "Четвер", 5: "П’ятниця", 6: "Субота", 0: "Неділя"}
SHORT = {1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 0: "Нд"}
ORDER = [1, 2, 3, 4, 5, 6, 0]


def esc(s):
    return html.escape(s, quote=True)


def hm(t):
    """'09:00' -> '9:00'"""
    return re.sub(r"^0(\d)", r"\1", t)


def hours_summary(hours):
    groups, cur = [], None
    for d in ORDER:
        v = tuple(hours.get(str(d)) or ()) or None
        if cur and cur[2] == v:
            cur[1] = d
        else:
            cur = [d, d, v]
            groups.append(cur)
    parts = []
    for a, b, v in groups:
        days = SHORT[a] if a == b else f"{SHORT[a]}–{SHORT[b]}"
        parts.append(f"{days} {hm(v[0])}–{hm(v[1])}" if v else f"{days} вихідний")
    if len(groups) == 1 and groups[0][2]:
        return f"Щодня {hm(groups[0][2][0])}–{hm(groups[0][2][1])}"
    return ", ".join(parts)


def drop_block(h, tag):
    """Remove <!--ch:tag-->…<!--/ch:tag--> (and the line if nothing else is on it)."""
    pat = re.compile(r"<!--ch:%s-->.*?<!--/ch:%s-->" % (tag, tag), re.S)
    h = re.sub(r"\n[ \t]*" + pat.pattern + r"[ \t]*(?=\n)", "", h, flags=re.S)
    return pat.sub("", h)


def keep_block(h, tag):
    return h.replace(f"<!--ch:{tag}-->", "").replace(f"<!--/ch:{tag}-->", "")


def set_token(h, token, value_html):
    h = h.replace(f'<span class="ph">{token}</span>', value_html)
    return h.replace(token, value_html)


def personalize(lead, out):
    g = lambda k: (lead.get(k) or None)
    name = g("name") or "[НАЗВА]"
    if name[0].islower():
        name = name[0].upper() + name[1:]
    city, city_loc = g("city"), g("city_loc") or g("city")
    phone, e164, email = g("phone"), g("phone_e164"), g("email")
    ig, ig_handle, fb = g("instagram"), g("instagram_handle"), g("facebook")
    hours, hours_text, hours_osm = g("hours"), g("hours_text"), g("hours_osm")
    address = g("address")
    maps_q = g("maps_query") or ", ".join(x for x in [address, city] if x) or "Івано-Франківськ"
    if not (phone and e164):
        phone = e164 = None

    # ---- copy site files ----
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    for rel in COPY:
        src, dst = os.path.join(ROOT, rel), os.path.join(out, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        (shutil.copytree if os.path.isdir(src) else shutil.copy2)(src, dst)

    h = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # ---- JSON-LD ----
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', h, re.S)
    ld = json.loads(m.group(2))
    ld["name"] = name
    for key, val in [("telephone", phone and "+" + e164), ("email", email)]:
        if val:
            ld[key] = val
        else:
            ld.pop(key, None)
    if address:
        ld["address"]["streetAddress"] = address
    if city:
        ld["address"]["addressLocality"] = city
        ld["areaServed"] = city
    if hours_osm or hours_text:
        ld["openingHours"] = hours_osm or hours_text
    else:
        ld.pop("openingHours", None)
    same = [u for u in (ig, fb) if u]
    if same:
        ld["sameAs"] = same
    else:
        ld.pop("sameAs", None)
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/")
    h = h[:m.start(2)] + "\n" + ld_txt + "\n" + h[m.end(2):]

    # ---- channels ----
    for tag in ("viber", "tg", "wa"):
        h = drop_block(h, tag)
    for tag, known in (("tel", phone), ("email", email), ("ig", ig), ("fb", fb)):
        h = keep_block(h, tag) if known else drop_block(h, tag)
    if phone:
        faq = f'<p class="faq__aside">Не знайшли відповіді? Зателефонуйте за номером <a href="tel:+{e164}">{esc(phone)}</a> — відповімо на всі запитання.</p>'
    else:
        faq = '<p class="faq__aside">Не знайшли відповіді? Залиште заявку у формі нижче — відповімо протягом робочого дня.</p>'
    h = re.sub(r"<!--ch:faq-->.*?<!--/ch:faq-->", faq, h, flags=re.S)

    opts = []
    if phone:
        opts.append(("sms", "SMS"))
    if email:
        opts.append(("mail", "Email"))
    if opts:
        inner = "".join(
            f'\n        <label><input type="radio" name="via" value="{v}"{" checked" if i == 0 else ""}><span>{t}</span></label>'
            for i, (v, t) in enumerate(opts))
        via = f'<fieldset class="via"><legend>Куди надіслати заявку</legend>{inner}\n      </fieldset>'
    else:
        via = ""
    h = re.sub(r'\n[ \t]*<fieldset class="via">.*?</fieldset>', ("\n      " + via) if via else "", h, flags=re.S)
    if not phone:
        h = h.replace('<nav class="bar"', '<nav class="bar bar--2"', 1)

    # ---- hours ----
    if hours:
        data = {str(d): hours.get(str(d)) for d in range(7)}
        h = re.sub(r"data-hours='[^']*'", "data-hours='" + esc(json.dumps(data, separators=(",", ":"))) + "'", h)
        lis = "".join(
            f'\n          <li data-d="{d}"><span>{DAY_NAMES[d]}</span><span>'
            + (f"{hm(hours[str(d)][0])} – {hm(hours[str(d)][1])}" if hours.get(str(d)) else "вихідний")
            + "</span></li>" for d in ORDER)
        h = re.sub(r'(<ul class="hours__list">).*?(\n\s*</ul>)', lambda mm: mm.group(1) + lis + mm.group(2), h, flags=re.S)
        h = keep_block(h, "live")
        summary = hours_text or hours_summary(hours)
    else:
        h = drop_block(h, "live")
        h = re.sub(r" data-hours='[^']*'", "", h)
        summary = hours_text
    if summary:
        h = set_token(h, "[ГОДИНИ]", esc(summary))

    # ---- maps / links ----
    q = quote(maps_q)
    h = h.replace(f"maps?q={IF_ENC}&amp;output=embed", f"maps?q={q}&amp;output=embed")
    h = h.replace(f"destination={IF_ENC}", f"destination={q}")
    if phone:
        h = h.replace("tel:+380000000000", f"tel:+{e164}")
    if email:
        h = h.replace("mailto:hello@example.com", "mailto:" + esc(email))
    if ig:
        h = h.replace("https://www.instagram.com/username/", esc(ig))
    if fb:
        h = h.replace("https://www.facebook.com/username", esc(fb))

    # ---- tokens (outside JSON-LD they are HTML-escaped) ----
    m = re.search(r'<script type="application/ld\+json">.*?</script>', h, re.S)
    head, ldpart, tail = h[:m.start()], m.group(0), h[m.end():]

    def tok(s):
        if city:
            s = re.sub(r'(\b[вуВУ](?:\s|&nbsp;)+)(?:<span class="ph">)?\[МІСТО\](?:</span>)?',
                       lambda mm: mm.group(1) + esc(city_loc), s)
            s = set_token(s, "[МІСТО]", esc(city))
        s = set_token(s, "[НАЗВА]", esc(name))
        if address:
            s = set_token(s, "[АДРЕСА]", esc(address))
        if phone:
            s = set_token(s, "[ТЕЛЕФОН]", esc(phone))
        if email:
            s = set_token(s, "[EMAIL]", esc(email))
        if ig:
            s = set_token(s, "[ІНСТАГРАМ]", esc("@" + (ig_handle or ig.rstrip("/").rsplit("/", 1)[-1]).lstrip("@")))
        return s

    h = tok(head) + ldpart + tok(tail)
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(h)

    # ---- JS ----
    jp = os.path.join(out, "js/main.js")
    j = open(jp, encoding="utf-8").read()
    js = lambda s: json.dumps(s, ensure_ascii=False)
    j = j.replace('var TG = "https://t.me/username";', 'var TG = "";')
    j = j.replace('var VIBER = "viber://chat?number=%2B380000000000";', 'var VIBER = "";')
    j = j.replace('var MAIL = "mailto:hello@example.com";', "var MAIL = %s;" % js("mailto:" + email if email else ""))
    j = j.replace('var SMS = "";', "var SMS = %s;" % js("sms:+" + e164 if phone else ""))
    j = j.replace('var FALLBACK = "";', "var FALLBACK = %s;" % js(fb or ig or ""))
    j = j.replace("[НАЗВА]", js(name)[1:-1])
    open(jp, "w", encoding="utf-8").write(j)

    # ---- README ----
    filled = [f"назва: {name}"]
    for label, v in [("місто", city), ("адреса", address), ("телефон", phone), ("email", email),
                     ("Instagram", ig), ("Facebook", fb), ("графік", hours_text or (hours and hours_summary(hours)))]:
        if v:
            filled.append(f"{label}: {v}")
    left = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z'’ ]+\]", re.sub(r"<[^>]+>", "", h))))
    readme = [f"# {name} — демо-сайт", "",
              "Шаблон: «Агенція нерухомості» (`template/nerukhomist`).", "",
              "## Заповнено з OpenStreetMap", ""] + [f"- {x}" for x in filled] + [
              "", "Карта й кнопка «Маршрут» ведуть на: " + maps_q, "",
              "## Що ще заповнити", ""] + [f"- `{t}`" for t in left] + [
              "- 6 карток об’єктів — приклади, замінити на реальні об’єкти агенції",
              "- 3 відгуки (картки «Приклад відгуку») — замінити на реальні",
              "- фото (Unsplash) — замінити на фото офісу й об’єктів", ""]
    if not hours:
        readme.insert(-1, "- графік роботи (живий статус «відчинено/зачинено» прихований, доки графік невідомий)")
    open(os.path.join(out, "README.md"), "w", encoding="utf-8").write("\n".join(readme))


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    data = json.load(open(sys.argv[1], encoding="utf-8"))
    if isinstance(data, list):
        for lead in data:
            personalize(lead, os.path.join(sys.argv[2], lead["slug"]))
            print("ok", lead["slug"])
    else:
        personalize(data, sys.argv[2])
        print("ok", data.get("slug"))


if __name__ == "__main__":
    main()
