#!/usr/bin/env python3
"""Personalize the fastfud (pizza / burgers) template for one lead.

Usage: python3 tools/personalize.py <lead.json> <outdir>

<lead.json> holds one lead object (or a list: the first lead is used).
Standard library only. The template working tree is never modified; a complete
site copy is written into <outdir>.

Emphasis: a name with піц/pizz/пєц/піч/pec → pizza focus (hero photo, H1, menu
and builder open on pizza); бургер/burger → burger focus; otherwise mixed.
"""
import html
import json
import os
import re
import shutil
import sys
import urllib.parse

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY = ["index.html", "css", "js", "fonts", "img/favicon.svg", "robots.txt"]
CITY_ENC = "%D0%86%D0%B2%D0%B0%D0%BD%D0%BE-%D0%A4%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA"
DAY_NAMES = {1: "Понеділок", 2: "Вівторок", 3: "Середа", 4: "Четвер", 5: "П’ятниця", 6: "Субота", 0: "Неділя"}
SCHEMA_DAYS = {0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday"}
PIZZA_WORDS = ("піц", "pizz", "pizza", "пєц", "піч", "pec", "пец")
BURGER_WORDS = ("бургер", "burger")
# Ukrainian mobile operator codes (SMS makes sense only for these)
MOBILE = ("39", "50", "63", "66", "67", "68", "73", "77", "91", "92", "93", "94", "95", "96", "97", "98", "99")


def esc(s):
    return html.escape(s, quote=True)


def must(s, old, new, count=1):
    n = s.count(old)
    if n != count:
        raise SystemExit("template changed: expected %d× %r, found %d" % (count, old[:90], n))
    return s.replace(old, new)


def sub1(pattern, repl, s, flags=re.S, min_count=1):
    out, n = re.subn(pattern, repl, s, flags=flags)
    if n < min_count:
        raise SystemExit("template changed: pattern not found %r" % pattern[:90])
    return out


def remove_ch(s, ch):
    """Remove every <a>/<li> carrying data-ch="<ch>" (with its line when alone)."""
    for tag in ("a", "li"):
        s = re.sub(r'[ \t]*<%s(?: [^>]*)? data-ch="%s"[^>]*>.*?</%s>\n?' % (tag, re.escape(ch), tag), "", s, flags=re.S)
    return s


def ig_handle(lead):
    if lead.get("instagram_handle"):
        return lead["instagram_handle"].lstrip("@").strip("/")
    url = lead.get("instagram")
    if not url:
        return None
    path = urllib.parse.urlparse(url).path.strip("/")
    return path.split("/")[0] if path else None


def focus_of(name):
    n = name.lower()
    if any(w in n for w in PIZZA_WORDS):
        return "pizza"
    if any(w in n for w in BURGER_WORDS):
        return "burger"
    return "mix"


def build(lead, outdir):
    name = lead["name"].strip()
    N = esc(name)
    city = lead.get("city") or "Івано-Франківськ"
    city_loc = lead.get("city_loc") or city
    address = lead.get("address")
    phone, e164 = lead.get("phone"), lead.get("phone_e164")
    if not (phone and e164):
        phone = e164 = None
    mobile = bool(e164 and e164.startswith("380") and e164[3:5] in MOBILE)
    email, ig, fb = lead.get("email"), lead.get("instagram"), lead.get("facebook")
    handle = ig_handle(lead) if ig else None
    hours, hours_text = lead.get("hours"), lead.get("hours_text")
    focus = focus_of(name)
    in_city = ("в " if city_loc[:1].upper() in "АЕЄИІЇОУЮЯ" else "у ") + city_loc

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    sha = re.search(r"furtex-xq\.github\.io/([0-9a-f]{40})/img/photos/hero\.jpg", s).group(1)
    photo = "https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/%s/img/photos/" % sha

    # ---------------- focus: pizza / burger / mix ----------------
    s = must(s, '<body data-focus="mix">', '<body data-focus="%s">' % focus)
    if focus == "pizza":
        dish = "піца та бургери"
        s = must(s, '<span class="script">Гаряче й соковите</span>', '<span class="script">Просто з печі</span>')
        s = must(s, '<span class="hero__line">бургери та піца</span>', '<span class="hero__line">піца та бургери</span>')
        s = sub1(r'<p class="hero__lead" data-hero-lead>.*?</p>',
                 '<p class="hero__lead" data-hero-lead>Тісто вистоюємо добу, піцу витягаємо з печі за хвилину до пакування. '
                 'Заберіть самі або чекайте кур’єра — привеземо з хрусткою скоринкою.</p>', s)
        s = must(s, 'photos/hero.jpg" width="1800" height="1495" alt="Соковитий бургер із салатом і томатом — фірмова страва [НАЗВА]"',
                 'photos/pizza1.jpg" width="1100" height="1329" alt="Гаряча піца з печі, нарізана скибками — [НАЗВА]"')
        s = s.replace(photo + "hero.jpg", photo + "heropizza.jpg")  # og:image keeps the wide shot
        s = must(s, "<b>Гаряче<br>з&nbsp;грилю</b>", "<b>Гаряча<br>з&nbsp;печі</b>")
        s = must(s, "<small>бургер</small>", "<small>піца</small>")
        s = must(s, '<button type="button" role="radio" aria-checked="true" data-mode-btn="burger">Бургер</button>\n    <button type="button" role="radio" aria-checked="false" data-mode-btn="pizza">Піца</button>',
                 '<button type="button" role="radio" aria-checked="true" data-mode-btn="pizza">Піца</button>\n    <button type="button" role="radio" aria-checked="false" data-mode-btn="burger">Бургер</button>')
        s = must(s, '<span class="script">Свій бургер</span> чи своя піца — шар за шаром',
                 '<span class="script">Своя піца</span> чи свій бургер — шар за шаром')
        s = must(s, 'data-mode="burger"', 'data-mode="pizza"')
        desc_dish = "піца з печі, бургери, картопля фрі та крильця"
    else:
        dish = "бургери та піца" if focus == "burger" else "піца та бургери"
        desc_dish = ("соковиті бургери, піца, картопля фрі та крильця" if focus == "burger"
                     else "піца, бургери, картопля фрі та крильця")
        if focus == "mix":
            s = must(s, '<span class="hero__line">бургери та піца</span>', '<span class="hero__line">піца та бургери</span>')

    # ---------------- <head> ----------------
    title = "%s — %s %s: доставка і самовивіз" % (N, dish, esc(in_city))
    s = sub1(r"<title>.*?</title>", "<title>%s</title>" % title, s)
    desc = "%s — %s %s. Доставка додому й на роботу, самовивіз%s." % (
        name, desc_dish, in_city, (", " + address) if address else "")
    if hours_text:
        desc += " Графік: %s." % hours_text
    s = sub1(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % esc(desc), s)
    s = sub1(r'<meta property="og:title" content="[^"]*">',
             '<meta property="og:title" content="%s — %s %s">' % (N, dish, esc(in_city)), s)

    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    ld["name"] = name
    ld["description"] = "%s %s. Доставка і самовивіз." % (desc_dish[0].upper() + desc_dish[1:], in_city)
    if focus == "pizza":
        ld["image"] = photo + "heropizza.jpg"
        ld["servesCuisine"] = ["Піца", "Бургери", "Фастфуд"]
    ld["address"]["addressLocality"] = city
    if address:
        ld["address"]["streetAddress"] = address
    else:
        ld["address"].pop("streetAddress", None)
    for k in ("telephone", "email", "openingHours", "sameAs", "priceRange"):
        ld.pop(k, None)
    if phone:
        ld["telephone"] = "+" + e164
    if email:
        ld["email"] = email
    if hours:
        ld["openingHoursSpecification"] = [
            {"@type": "OpeningHoursSpecification", "dayOfWeek": SCHEMA_DAYS[d], "opens": hours[str(d)][0], "closes": hours[str(d)][1]}
            for d in (1, 2, 3, 4, 5, 6, 0) if hours.get(str(d))]
    if lead.get("maps_query"):
        ld["hasMap"] = "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(lead["maps_query"])
    same = [u for u in (ig, fb) if u]
    if same:
        ld["sameAs"] = same
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/")
    s = s[:m.start(2)] + "\n" + ld_txt + "\n" + s[m.end(2):]

    # ---------------- channels ----------------
    for ch in ("viber", "tg", "wa"):
        s = remove_ch(s, ch)
    if not ig:
        s = remove_ch(s, "ig")
    if not fb:
        s = remove_ch(s, "fb")
    if not email:
        s = remove_ch(s, "mail")

    if phone:
        s = s.replace("tel:+380000000000", "tel:+" + e164)
    else:
        ig_btn = ('<a class="btn btn--ghost" href="%s" target="_blank" rel="noopener"><svg><use href="#i-insta"/></svg>Написати в Instagram</a>'
                  % esc(ig)) if ig else ""
        s = sub1(r'<a class="btn btn--ghost" data-ch="tel"[^>]*>.*?</a>', ig_btn, s)          # hero
        s = sub1(r'\s*<a class="btn btn--red" data-ch="tel"[^>]*>.*?</a>', "", s)             # form done state
        if ig:
            s = sub1(r'<a data-ch="tel" href="tel:\+380000000000"><svg><use href="#i-phone"/></svg>Подзвонити</a>',
                     '<a href="%s" target="_blank" rel="noopener"><svg><use href="#i-insta"/></svg>Instagram</a>' % esc(ig), s)
        elif email:
            s = sub1(r'<a data-ch="tel" href="tel:\+380000000000"><svg><use href="#i-phone"/></svg>Подзвонити</a>',
                     '<a href="mailto:%s"><svg><use href="#i-mail"/></svg>Написати</a>' % esc(email), s)
        else:
            s = sub1(r'\s*<a data-ch="tel" href="tel:\+380000000000"><svg><use href="#i-phone"/></svg>Подзвонити</a>', "", s)
            s = must(s, '<nav class="bar" aria-label="Швидкі дії">',
                     '<nav class="bar" aria-label="Швидкі дії" style="grid-template-columns:1.25fr 1fr">')
        s = remove_ch(s, "tel")
        alt = "в Instagram" if ig else ("листом" if email else "через форму")
        s = must(s, "Повне меню й акції дня підкажемо телефоном.", "Повне меню й акції дня підкажемо %s." % alt)
        s = must(s, "Подзвоніть нам або залиште заявку на сайті", "Напишіть нам %s або залиште заявку на сайті" % alt
                 if alt != "через форму" else "Залиште заявку на сайті")
        s = must(s, "Смажимо й печемо тільки після вашого дзвінка.", "Смажимо й печемо тільки після вашого замовлення.")
        s = must(s, "краще зателефонувати заздалегідь", "краще написати заздалегідь")
        s = must(s, '<span class="script">Заходьте</span> або дзвоніть', '<span class="script">Заходьте</span> або пишіть')
    s = s.replace(' data-ch="tel"', "")
    for ch in ("ig", "fb", "mail", "addr"):
        s = s.replace(' data-ch="%s"' % ch, "")
    if ig:
        s = s.replace("https://www.instagram.com/username/", esc(ig))
    if fb:
        s = s.replace("https://www.facebook.com/username", esc(fb))

    # ---------------- order form channels ----------------
    opts = []
    if phone and mobile:
        opts.append(("sms", "i-sms", "SMS", "SMS"))
    if ig and handle:
        opts.append(("ig", "i-insta", "Instagram Direct", "Instagram Direct"))
    if email:
        opts.append(("mail", "i-mail", "Email", "пошту"))
    attrs = []
    if phone and mobile:
        attrs.append('data-sms="sms:+%s"' % e164)
    if ig and handle:
        attrs.append('data-ig="https://ig.me/m/%s"' % esc(urllib.parse.quote(handle)))
    if email:
        attrs.append('data-mail="mailto:%s"' % esc(email))
    if phone:
        attrs.append('data-tel="tel:+%s"' % e164)
    s = must(s, 'data-tg="https://t.me/username" data-viber="viber://chat?number=%2B380000000000" data-sms="sms:+380000000000" data-mail="mailto:hello@example.com" data-tel="tel:+' + (e164 or "380000000000") + '"',
             " ".join(attrs) or 'data-call="1"')
    labels = "\n".join(
        '            <label><input type="radio" name="via" value="%s"%s><span><svg><use href="#%s"/></svg>%s</span></label>'
        % (v, " checked" if i == 0 else "", icon, lab) for i, (v, icon, lab, _) in enumerate(opts))
    s = sub1(r'<div class="via__opts">.*?</div>', '<div class="via__opts">\n%s\n          </div>' % labels, s)
    if len(opts) <= 1:
        s = must(s, '<fieldset class="f f--full via" data-via>', '<fieldset class="f f--full via" data-via hidden>')
    if not opts:
        s = must(s, "Заповніть форму — вона підготує повідомлення з усіма деталями, вам лишиться лише надіслати його.",
                 "Замовлення приймаємо телефоном. Заповніть форму, щоб нічого не забути, — і продиктуйте його нам%s." % (
                     " за номером " + esc(phone) if phone else ""))
        s = must(s, '<span data-submit-label>Надіслати замовлення</span>', '<span data-submit-label>Підготувати замовлення</span>')
        s = must(s, "Натискаючи, ви відкриваєте обраний застосунок із готовим текстом замовлення.",
                 "Після цього лишиться подзвонити — текст замовлення буде перед очима.")
    elif len(opts) == 1:
        s = must(s, "Натискаючи, ви відкриваєте обраний застосунок із готовим текстом замовлення.",
                 "Натискаючи, ви відкриваєте %s із готовим текстом замовлення." % opts[0][3])

    # ---------------- maps ----------------
    q = urllib.parse.quote(lead.get("maps_query") or ("%s, %s" % (address or "", city)).strip(", "))
    s = must(s, "https://www.google.com/maps?q=%s&amp;output=embed" % CITY_ENC,
             "https://www.google.com/maps?q=%s&amp;output=embed" % q)
    s = must(s, "https://www.google.com/maps?q=%s" % CITY_ENC,
             "https://www.google.com/maps/dir/?api=1&amp;destination=%s" % q, count=2)

    # ---------------- hours ----------------
    s = re.sub(r"\s*<!-- Edit hours here.*?-->", "", s, flags=re.S)
    if hours:
        rows = []
        for d in (1, 2, 3, 4, 5, 6, 0):
            v = hours.get(str(d))
            if v:
                rows.append('          <li data-dow="%d" data-open="%s" data-close="%s"><span>%s</span><b>%s – %s</b></li>'
                            % (d, v[0], v[1], DAY_NAMES[d], v[0], v[1]))
            else:
                rows.append('          <li data-dow="%d"><span>%s</span><b>вихідний</b></li>' % (d, DAY_NAMES[d]))
        s = sub1(r'(<ul class="hours__list" data-hours>\n).*?(\s*</ul>)', lambda mm: mm.group(1) + "\n".join(rows) + mm.group(2), s)
        if hours_text:
            s = must(s, '<p class="hours__sum"><span class="ph">[ГОДИНИ]</span></p>', '<p class="hours__sum">%s</p>' % esc(hours_text))
        else:
            s = sub1(r'\s*<p class="hours__sum">.*?</p>', "", s)
    else:
        s = sub1(r'\s*<li data-status-wrap>.*?</li>', "", s)
        s = sub1(r'<span class="status" data-status><i></i><span data-status-text>…</span></span>', "", s)
        s = sub1(r'\s*<p class="hours__sum">.*?</p>', "", s)
        txt = esc(hours_text) if hours_text else '<span class="ph">[ГОДИНИ]</span>'
        s = sub1(r'<ul class="hours__list" data-hours>.*?</ul>', '<p class="hours__text">%s</p>' % txt, s)

    # ---------------- remaining known tokens ----------------
    vowel_city = city_loc[:1].upper() in "АЕЄИІЇОУЮЯ"

    def loc(mm):
        prep = mm.group(2)
        if vowel_city:  # «в Івано-Франківську», not «у Івано-…»
            prep = "В" if prep in "УВ" else "в"
        return mm.group(1) + prep + mm.group(3) + esc(city_loc)
    s = re.sub(r'([ >])(у|в|У|В)( |&nbsp;)(?:<span class="ph">)?\[МІСТО\](?:</span>)?', loc, s)
    known = {"[НАЗВА]": N, "[МІСТО]": esc(city)}
    if address:
        known["[АДРЕСА]"] = esc(address)
    if phone:
        known["[ТЕЛЕФОН]"] = esc(phone)
    if email:
        known["[EMAIL]"] = esc(email)
    if handle:
        known["[ІНСТАГРАМ]"] = "@" + esc(handle)
    for tok, val in known.items():
        s = s.replace('<span class="ph">%s</span>' % tok, val)
        s = s.replace(tok, val)

    # ---------------- sanity ----------------
    for bad in ("380000000000", "example.com", "/username", "t.me/", "viber://", "wa.me", "__SHA__"):
        if bad in s:
            raise SystemExit("sentinel left in output: %s" % bad)
    allowed = {"[ЦІНА]", "[ІМ'Я]", "[РІК]", "[ФОП]", "[ГОДИНИ]", "[АДРЕСА]", "[ТЕЛЕФОН]", "[EMAIL]", "[ІНСТАГРАМ]"}
    left = set(re.findall(r"\[[А-ЯІЇЄҐA-Z' ]+\]", s)) - allowed
    if left:
        raise SystemExit("unexpected tokens left: %s" % left)
    json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S).group(1))

    # ---------------- write ----------------
    os.makedirs(outdir, exist_ok=True)
    for rel in COPY:
        src, dst = os.path.join(ROOT, rel), os.path.join(outdir, rel)
        if os.path.isdir(src):
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
    with open(os.path.join(outdir, "index.html"), "w", encoding="utf-8") as f:
        f.write(s)

    filled = ["назва", "місто"] + [lab for cond, lab in (
        (address, "адреса"), (phone, "телефон"), (email, "email"), (ig, "Instagram"), (fb, "Facebook"),
        (hours, "години роботи (з живим статусом «відчинено/зачинено»)"),
        (not hours and hours_text, "години роботи (текстом)"), (lead.get("maps_query"), "карта й маршрут")) if cond]
    remain = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z' ]+\]", s)))
    focus_ua = {"pizza": "піца (герой, меню й конструктор відкриваються на піці)",
                "burger": "бургери", "mix": "змішаний (піца та бургери)"}[focus]
    readme = """# {name} — демо-сайт

Шаблон: **fastfud** (піца / бургери / фастфуд) від Ansaro. Акцент: {focus}.

Заповнено з OpenStreetMap: {filled}.
Viber, Telegram і WhatsApp прибрано (невідомі). Форма замовлення {how}.

Ще треба заповнити (позначені бурштиновим підкресленням): {remain}.
Відгуки — приклади (картки з позначкою «Приклад відгуку»), замініть на реальні. Меню, умови доставки й фото — типові, уточніть у закладу.
""".format(name=name, focus=focus_ua, filled=", ".join(filled),
           how=("надсилає заявку через: " + ", ".join(o[2] for o in opts)) if opts else "готує текст, а далі клієнт дзвонить (немає мобільного/Instagram/email)",
           remain=", ".join(remain) or "нічого")
    with open(os.path.join(outdir, "README.md"), "w", encoding="utf-8") as f:
        f.write(readme)


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    data = json.load(open(sys.argv[1], encoding="utf-8"))
    lead = data[0] if isinstance(data, list) else data
    build(lead, sys.argv[2])
    print("ok", lead.get("slug"), "->", sys.argv[2])


if __name__ == "__main__":
    main()
