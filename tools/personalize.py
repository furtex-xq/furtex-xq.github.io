#!/usr/bin/env python3
"""Personalize the tatu (tattoo salon) template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir> [--slug <slug>]

<lead.json> is one lead object, or a list of leads (then --slug picks one;
a one-element list needs no --slug). Writes a complete personalized copy of
the site into <outdir>; the template working tree is never modified.
Standard library only.
"""
import html
import json
import os
import re
import shutil
import sys
import urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY = ["index.html", "robots.txt", "css", "js", "fonts", "img/favicon.svg"]
DAYS_LD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
DAYS_UA = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
MOBILE = {"39", "50", "63", "66", "67", "68", "73", "77", "89", "91", "92", "93", "94", "95", "96", "97", "98", "99"}
CITY_Q = urllib.parse.quote("Івано-Франківськ")


def esc(s):
    return html.escape(s, quote=True)


def ph(tok):
    return '<span class="ph">%s</span>' % tok


class Doc:
    def __init__(self, text):
        self.t = text

    def sub(self, old, new, count=None):
        n = self.t.count(old)
        if n == 0:
            raise SystemExit("template fragment not found: " + old[:100])
        if count is not None and n != count:
            raise SystemExit("expected %d occurrences, found %d: %s" % (count, n, old[:100]))
        self.t = self.t.replace(old, new)

    def resub(self, pattern, new, count=None, flags=re.S):
        t, n = re.subn(pattern, new, self.t, flags=flags)
        if n == 0:
            raise SystemExit("template pattern not found: " + pattern[:100])
        if count is not None and n != count:
            raise SystemExit("expected %d matches, found %d: %s" % (count, n, pattern[:100]))
        self.t = t


def ig_handle(lead):
    h = lead.get("instagram_handle")
    if not h and lead.get("instagram"):
        path = urllib.parse.urlparse(lead["instagram"]).path.strip("/")
        h = path.split("/")[0] if path else None
    return h.lstrip("@") if h else None


def is_mobile(e164):
    return bool(e164) and e164.startswith("380") and len(e164) == 12 and e164[3:5] in MOBILE


def hours_summary(hours):
    """{"0".."6": [o,c] | None} -> 'Пн–Пт 11:00–20:00, Сб 12:00–18:00, Нд вихідний'"""
    order = [1, 2, 3, 4, 5, 6, 0]
    groups = []
    for d in order:
        h = hours.get(str(d))
        key = tuple(h) if h else None
        if groups and groups[-1][1] == key:
            groups[-1][0].append(d)
        else:
            groups.append(([d], key))
    parts = []
    for days, key in groups:
        label = DAYS_UA[days[0]] if len(days) == 1 else "%s–%s" % (DAYS_UA[days[0]], DAYS_UA[days[-1]])
        parts.append("%s %s" % (label, "%s–%s" % key if key else "вихідний"))
    return ", ".join(parts)


def build_jsonld(lead, hero):
    d = {
        "@context": "https://schema.org",
        "@type": "TattooParlor",
        "name": lead["name"],
        "description": "Тату-салон у %s: індивідуальні ескізи, флеш, лайн, графіка, реалізм, мінімалізм, cover-up і корекція." % lead["city_loc"],
        "image": hero,
    }
    if lead.get("phone"):
        d["telephone"] = lead["phone"]
    if lead.get("email"):
        d["email"] = lead["email"]
    addr = {"@type": "PostalAddress"}
    if lead.get("address"):
        addr["streetAddress"] = lead["address"]
    addr["addressLocality"] = lead["city"]
    addr["addressCountry"] = "UA"
    d["address"] = addr
    if lead.get("hours"):
        spec = []
        for i in range(7):
            h = lead["hours"].get(str(i))
            if h:
                spec.append({"@type": "OpeningHoursSpecification", "dayOfWeek": DAYS_LD[i], "opens": h[0], "closes": h[1]})
        if spec:
            d["openingHoursSpecification"] = spec
    same = [u for u in (lead.get("instagram"), lead.get("facebook")) if u]
    if same:
        d["sameAs"] = same
    return json.dumps(d, ensure_ascii=False, indent=2).replace("</", "<\\/")


def drop_ct(d, ch):
    d.resub(r'\n\s*<li data-ch="%s">.*?</li>' % ch, "", count=1)


def personalize(lead, outdir):
    name, city, loc = lead["name"], lead["city"], lead["city_loc"]
    phone, e164 = lead.get("phone"), lead.get("phone_e164")
    if phone and not e164:
        e164 = re.sub(r"\D", "", phone)
    email, ig, fb = lead.get("email"), lead.get("instagram"), lead.get("facebook")
    hours, hours_text, address = lead.get("hours"), lead.get("hours_text"), lead.get("address")
    handle = ig_handle(lead)
    N = esc(name)

    d = Doc(open(os.path.join(ROOT, "index.html"), encoding="utf-8").read())
    hero = re.search(r'<meta property="og:image" content="([^"]+)">', d.t).group(1)

    # ---- head ----
    d.sub("<title>Тату-салон [НАЗВА] — тату на замовлення, флеш, cover-up | [МІСТО]</title>",
          "<title>Тату-салон %s — тату на замовлення, флеш, cover-up | %s</title>" % (N, esc(city)))
    d.resub(r'<meta name="description" content="[^"]*">',
            '<meta name="description" content="Тату-салон %s у %s: індивідуальні ескізи, готовий флеш, лайн, графіка, реалізм і мінімалізм, перекриття старих тату. Одноразові голки, сертифіковані фарби. Запис онлайн.">' % (N, esc(loc)), count=1)
    d.sub('<meta property="og:title" content="Тату-салон [НАЗВА] — [МІСТО]">',
          '<meta property="og:title" content="Тату-салон %s — %s">' % (N, esc(city)))
    ogd = "Тату за індивідуальним ескізом і з флеш-листа: лайн, графіка, реалізм, мінімалізм."
    ogd += (" Запис онлайн або за телефоном %s." % esc(phone)) if phone else " Запис онлайн."
    d.resub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="%s">' % ogd, count=1)
    d.resub(r'(<script type="application/ld\+json">\n).*?(\n</script>)',
            lambda m: m.group(1) + build_jsonld(lead, hero) + m.group(2), count=1)

    # ---- name ----
    d.sub(ph("[НАЗВА]"), N)
    d.sub("[НАЗВА]", N)  # aria-label, data-biz

    # ---- city: «у [МІСТО]» -> locative, «, [МІСТО]» -> nominative ----
    d.sub("у " + ph("[МІСТО]"), "у " + esc(loc))
    d.sub(", " + ph("[МІСТО]"), ", " + esc(city))

    # ---- address ----
    if address:
        d.sub(ph("[АДРЕСА]"), esc(address))

    # ---- maps ----
    q = urllib.parse.quote(lead.get("maps_query") or ("%s, %s" % (address, city) if address else city))
    d.sub("https://www.google.com/maps?q=%s&amp;output=embed" % CITY_Q, "https://www.google.com/maps?q=%s&amp;output=embed" % q, count=1)
    d.sub("https://www.google.com/maps/dir/?api=1&amp;destination=%s" % CITY_Q,
          "https://www.google.com/maps/dir/?api=1&amp;destination=%s" % q, count=2)

    # ---- hours ----
    if hours:
        data = {str(i): hours.get(str(i)) for i in [1, 2, 3, 4, 5, 6, 0]}
        d.resub(r"data-hours='[^']*'", "data-hours='%s'" % esc(json.dumps(data, separators=(",", ":"))), count=1)
        d.sub('<table class="hours ph-box" id="hours"', '<table class="hours" id="hours"')
        d.sub(ph("[ГОДИНИ]"), esc(hours_text or hours_summary(hours)))
    else:
        d.resub(r'\n\s*<p class="status" id="status" hidden></p>', "", count=1)
        d.resub(r'<table class="hours ph-box" id="hours".*?</table>', "", count=1)
        if hours_text:
            d.sub(ph("[ГОДИНИ]"), esc(hours_text))

    # ---- contacts list: messengers unknown for every lead ----
    for ch in ("viber", "telegram", "whatsapp"):
        drop_ct(d, ch)

    if phone:
        d.sub("tel:+380000000000", "tel:+" + e164)
        d.sub(ph("[ТЕЛЕФОН]"), esc(phone))
    else:
        drop_ct(d, "tel")
        d.resub(r'\n\s*<a class="hdr__tel".*?</a>', "", count=1)
        alt = (ig, "Instagram") if ig else (fb, "Facebook") if fb else None
        dock_call = re.search(r'\n  <a href="tel:\+380000000000" data-ch="tel">.*?</a>', d.t, re.S).group(0)
        if alt:
            icon = ('<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>'
                    if ig else '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>')
            d.sub(dock_call, '\n  <a href="%s" target="_blank" rel="noopener">%s%s</a>' % (esc(alt[0]), icon, alt[1]))
        else:
            d.sub(dock_call, "")
            d.sub('<nav class="dock" aria-label="Швидкі дії">',
                  '<nav class="dock" aria-label="Швидкі дії" style="grid-template-columns:1.3fr 1fr">')
        d.resub(r'\n\s*<div class="form-call" id="form-call" hidden>.*?</div>', "", count=1)

    if email:
        d.sub("mailto:hello@example.com", "mailto:" + esc(email))
        d.sub(ph("[EMAIL]"), esc(email))
    else:
        drop_ct(d, "email")

    if ig:
        d.sub("https://www.instagram.com/username/", esc(ig))
        d.sub("@" + ph("[ІНСТАГРАМ]"), esc("@" + handle) if handle else "профіль студії")
    else:
        drop_ct(d, "instagram")
    if fb:
        d.sub("https://www.facebook.com/username", esc(fb))
    else:
        drop_ct(d, "facebook")

    if "<li data-ch=" not in d.t:
        d.resub(r'\n\s*<ul class="ct" id="ct">\s*</ul>', "", count=1)

    # ---- booking form channels ----
    chans = []
    if phone and is_mobile(e164):
        chans.append(("sms", "SMS", "sms:+" + e164))
    if ig and handle:
        chans.append(("instagram", "Instagram", "https://ig.me/m/" + handle))
    if email:
        chans.append(("email", "Email", "mailto:" + email))
    radios = "\n            ".join(
        '<label class="rchip"><input type="radio" name="via" value="%s" data-href="%s"%s><span>%s</span></label>'
        % (k, esc(u), " checked" if i == 0 else "", lbl) for i, (k, lbl, u) in enumerate(chans))
    d.resub(r'(<legend>Куди надіслати заявку</legend>\s*<div class="chips">\s*).*?(\s*</div>\s*</fieldset>)',
            lambda m: m.group(1) + radios + m.group(2), count=1)
    notes = {
        "sms": "Натискаючи кнопку, ви відкриєте SMS із готовим текстом заявки — лишиться лише надіслати.",
        "instagram": "Натискаючи кнопку, ви скопіюєте текст заявки й відкриєте наш Instagram Direct — вставте текст і надішліть.",
        "email": "Натискаючи кнопку, ви відкриєте пошту з готовим текстом заявки — лишиться лише надіслати.",
    }
    if len(chans) == 1:
        d.sub('<fieldset class="field field--full via" id="via">', '<fieldset class="field field--full via" id="via" hidden>')
        d.resub(r'<p class="form__note" id="form-note">.*?</p>', '<p class="form__note" id="form-note">%s</p>' % notes[chans[0][0]], count=1)
    elif chans:
        d.resub(r'<p class="form__note" id="form-note">.*?</p>',
                '<p class="form__note" id="form-note">Натискаючи кнопку, ви отримаєте готовий текст заявки у вибраному каналі — лишиться лише надіслати.</p>', count=1)
    d.sub("і заявка відкриється у зручному месенджері з готовим текстом.",
          "і заявка відкриється з готовим текстом." if chans else "")
    if not chans:
        # nothing to send to (landline only / no written channel): no form, just «call us»
        d.sub('<form class="form" id="form" data-biz', '<form class="form" id="form" hidden data-biz')
        d.resub(r'\n\s*<p class="formcard__sub">.*?</p>', "", count=1)
        if phone:
            d.sub('<div class="form-call" id="form-call" hidden>', '<div class="form-call" id="form-call">')
            d.sub('<h3 class="h3">Заявка на тату</h3>\n      ', "")
        else:
            alt = (ig, "Instagram") if ig else (fb, "Facebook") if fb else None
            if alt:
                d.sub('<h3 class="h3">Заявка на тату</h3>',
                      '<h3 class="h3">Запис на тату</h3>\n      <p class="formcard__sub">Напишіть нам в %s: ідею, бажане місце й розмір — відповімо з вільними датами.</p>\n      <a class="btn btn--red btn--full" href="%s" target="_blank" rel="noopener">Написати в %s</a>' % (alt[1], esc(alt[0]), alt[1]))
            else:
                d.sub('<h3 class="h3">Заявка на тату</h3>',
                      '<h3 class="h3">Запис на тату</h3>\n      <p class="formcard__sub">Завітайте до нас — покажемо флеш-лист, обговоримо ідею й підберемо дату сеансу.</p>\n      <a class="btn btn--red btn--full" href="https://www.google.com/maps/dir/?api=1&amp;destination=%s" target="_blank" rel="noopener">Прокласти маршрут</a>' % q)

    # FAQ «not found the answer?» line
    if phone and chans:
        faq = "Не знайшли відповіді? Напишіть нам або зателефонуйте — підкажемо."
    elif phone:
        faq = "Не знайшли відповіді? Зателефонуйте нам — підкажемо."
    else:
        faq = "Не знайшли відповіді? Напишіть нам — підкажемо."
    d.resub(r'<p class="sec-head__sub" id="faq-more">.*?</p>', '<p class="sec-head__sub" id="faq-more">%s</p>' % faq, count=1)

    # ---- sanity ----
    for bad in ("380000000000", "example.com", "/username", "t.me/", "viber://", "wa.me/"):
        if bad in d.t:
            raise SystemExit("leftover sentinel %r for %s" % (bad, lead.get("slug")))
    try:
        json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', d.t, re.S).group(1))
    except ValueError as e:
        raise SystemExit("invalid JSON-LD: %s" % e)

    # ---- write ----
    if os.path.exists(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    for item in COPY:
        src, dst = os.path.join(ROOT, item), os.path.join(outdir, item)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
    with open(os.path.join(outdir, "index.html"), "w", encoding="utf-8") as f:
        f.write(d.t)

    left = sorted(set(re.findall(r"\[[A-ZА-ЯІЇЄҐ'’ ]+\]", d.t)))
    filled = ["назва", "місто"]
    for label, v in (("адреса", address), ("телефон", phone), ("email", email), ("Instagram", ig), ("Facebook", fb)):
        if v:
            filled.append(label)
    if hours:
        filled.append("графік роботи (і статус «відчинено/зачинено»)")
    elif hours_text:
        filled.append("графік роботи (текстом)")
    filled.append("карта й маршрут")
    removed = ["Viber", "Telegram", "WhatsApp"] + [x for x, v in (("телефон", phone), ("email", email), ("Instagram", ig), ("Facebook", fb)) if not v]
    readme = ["# %s — демо-сайт" % name, "",
              "Шаблон: **tatu** (тату-салон; Ruslan Display + Anonymous Pro, флеш-лист із фільтром стилів і калькулятор місце/розмір).", "",
              "Заповнено з OpenStreetMap (%s): %s." % (lead.get("osm") or "OSM", ", ".join(filled)), "",
              "Видалено кнопки й варіанти зв'язку, яких немає в даних: %s." % ", ".join(removed), "",
              "Заявка з форми надсилається через: %s." % (", ".join(l for _, l, _ in chans) if chans else "— (форму замінено на «Зателефонуйте нам»)"), "",
              "## Залишилось заповнити", ""]
    readme += ["- `%s`" % t for t in left]
    readme += ["- реальні відгуки (картки з позначкою «Приклад відгуку»)",
               "- фото робіт і майстрів студії замість стокових, власний флеш-лист",
               "- ціни (також числа в `PRICE` у `js/main.js` для калькулятора)"]
    if not hours and not hours_text:
        readme.append("- графік роботи (таблицю й статус «відчинено» приховано, доки його немає)")
    with open(os.path.join(outdir, "README.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(readme) + "\n")
    return left


def main():
    args = sys.argv[1:]
    slug = None
    if "--slug" in args:
        i = args.index("--slug")
        slug = args[i + 1]
        del args[i:i + 2]
    if len(args) != 2:
        print(__doc__)
        sys.exit(2)
    data = json.load(open(args[0], encoding="utf-8"))
    if isinstance(data, list):
        if slug is None:
            if len(data) != 1:
                raise SystemExit("lead file is a list: pass --slug <slug>")
            data = data[0]
        else:
            data = next(l for l in data if l["slug"] == slug)
    left = personalize(data, args[1])
    print("ok", data["slug"], "->", args[1], "| remaining:", " ".join(left))


if __name__ == "__main__":
    main()
