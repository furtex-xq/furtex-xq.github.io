#!/usr/bin/env python3
"""Personalize the salon-krasy template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

<lead.json> is one lead object (or a list; then --slug <slug> picks one).
Writes a complete personalized copy of the site into <outdir>; the template
working tree is never modified. Standard library only.
"""
import html
import json
import os
import re
import shutil
import sys
import urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
HAIR_PHOTO = ("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/"
              "3b1b9c051c275ba5bfc8c4196f65dd9081080c23/img/photos/hair.jpg")
PHOTO_BASE = ("https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/"
              "89839cfc5e3788c991d68c3b6dc7c739670cbf4a/img/photos/")
COPY = ["index.html", "robots.txt", "css", "js", "fonts", "img/favicon.svg"]
DAYS_LD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def esc(s):
    return html.escape(s, quote=True)


class Doc:
    def __init__(self, text):
        self.t = text

    def sub(self, old, new, count=None):
        n = self.t.count(old)
        if n == 0:
            raise SystemExit("template fragment not found: " + old[:90])
        if count is not None and n != count:
            raise SystemExit("expected %d occurrences, found %d: %s" % (count, n, old[:90]))
        self.t = self.t.replace(old, new)

    def resub(self, pattern, new, flags=re.S, count=None):
        t, n = re.subn(pattern, new, self.t, flags=flags)
        if n == 0:
            raise SystemExit("template pattern not found: " + pattern[:90])
        if count is not None and n != count:
            raise SystemExit("expected %d matches, found %d: %s" % (count, n, pattern[:90]))
        self.t = t


def ph(tok):
    return '<span class="ph">%s</span>' % tok


def ig_handle(lead):
    h = lead.get("instagram_handle")
    if not h and lead.get("instagram"):
        path = urllib.parse.urlparse(lead["instagram"]).path.strip("/")
        h = path.split("/")[0] if path else None
    return h


def build_jsonld(lead, hair):
    services = ("стрижки й фарбування волосся, манікюр і педикюр, брови й вії, догляд за обличчям і тілом"
                if hair else "косметологія, манікюр і педикюр, брови й вії, догляд за тілом")
    d = {
        "@context": "https://schema.org",
        "@type": "HairSalon" if hair else "BeautySalon",
        "name": lead["name"],
        "description": "Салон краси у %s: %s." % (lead["city_loc"], services),
        "image": PHOTO_BASE + "hero.jpg",
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
                spec.append({"@type": "OpeningHoursSpecification", "dayOfWeek": DAYS_LD[i],
                             "opens": h[0], "closes": h[1]})
        if spec:
            d["openingHoursSpecification"] = spec
    same = [u for u in (lead.get("instagram"), lead.get("facebook")) if u]
    if same:
        d["sameAs"] = same
    s = json.dumps(d, ensure_ascii=False, indent=2)
    return s.replace("</", "<\\/")


HAIR_PANEL = '''<div class="panel" role="tabpanel" id="p-hair" aria-labelledby="t-hair">
      <figure class="panel__pic"><img src="%s" width="1100" height="1650" decoding="async" alt="Майстриня укладає волосся клієнтці в світлому салоні"></figure>
      <div class="panel__body">
        <h3 class="h3">Волосся</h3>
        <p class="panel__intro">Стрижка під вашу структуру волосся й ритм життя, фарбування від одного тону до складних технік і догляд, після якого волосся слухняне без зусиль.</p>
        <ul class="price">
          <li><span class="price__n">Жіноча стрижка<small>60 хв</small></span><i></i><span class="price__v">від <span class="ph">[ЦІНА]</span> грн</span></li>
          <li><span class="price__n">Чоловіча стрижка<small>40 хв</small></span><i></i><span class="price__v">від <span class="ph">[ЦІНА]</span> грн</span></li>
          <li><span class="price__n">Фарбування в один тон<small>від 2 год</small></span><i></i><span class="price__v">від <span class="ph">[ЦІНА]</span> грн</span></li>
          <li><span class="price__n">Складне фарбування: балаяж, шатуш, airtouch<small>від 4 год</small></span><i></i><span class="price__v">від <span class="ph">[ЦІНА]</span> грн</span></li>
          <li><span class="price__n">Укладання<small>45 хв</small></span><i></i><span class="price__v">від <span class="ph">[ЦІНА]</span> грн</span></li>
          <li><span class="price__n">Відновлювальний догляд для волосся<small>60 хв</small></span><i></i><span class="price__v">від <span class="ph">[ЦІНА]</span> грн</span></li>
        </ul>
        <a class="btn btn--ink panel__btn" href="#zapys" data-cat="Волосся">Записатися на стрижку чи фарбування</a>
      </div>
    </div>

    ''' % HAIR_PHOTO


def apply_hair(d):
    d.sub('<p class="eyebrow reveal">Косметологія · манікюр · брови й вії · тіло</p>',
          '<p class="eyebrow reveal">Волосся · манікюр · брови й вії · догляд</p>')
    d.sub('<p class="hero__lead reveal">Чистка й догляд за шкірою, бездоганний манікюр, акуратні брови та вії — в одному салоні й без поспіху.',
          '<p class="hero__lead reveal">Стрижка й фарбування, бездоганний манікюр, акуратні брови та вії, догляд за шкірою — в одному салоні й без поспіху.')
    d.sub('<button class="tab" role="tab" id="t-face" aria-controls="p-face" aria-selected="true">Обличчя</button>',
          '<button class="tab" role="tab" id="t-hair" aria-controls="p-hair" aria-selected="true">Волосся</button>\n      '
          '<button class="tab" role="tab" id="t-face" aria-controls="p-face" aria-selected="false" tabindex="-1">Обличчя</button>')
    d.sub('<div class="panel" role="tabpanel" id="p-face" aria-labelledby="t-face">',
          HAIR_PANEL + '<div class="panel" role="tabpanel" id="p-face" aria-labelledby="t-face" hidden>')
    d.sub('face2.jpg" width="1100" height="1650" loading="lazy"', 'face2.jpg" width="1100" height="1650"')
    d.sub('<option>Обличчя</option>', '<option>Волосся</option>\n            <option>Обличчя</option>')
    d.sub('косметолога, майстрів манікюру та бровиста-лешмейкера.',
          'перукарів-колористів, косметолога, майстрів манікюру та бровиста-лешмейкера.')
    d.sub('<span class="team__r">косметолог</span>', '<span class="team__r">перукар-колорист</span>')


def select_tab(d, key):
    """Make tab `key` (face/nails/brows/body) the initially open one."""
    d.sub('id="t-face" aria-controls="p-face" aria-selected="true">',
          'id="t-face" aria-controls="p-face" aria-selected="false" tabindex="-1">')
    d.sub('id="t-%s" aria-controls="p-%s" aria-selected="false" tabindex="-1">' % (key, key),
          'id="t-%s" aria-controls="p-%s" aria-selected="true">' % (key, key))
    d.sub('id="p-face" aria-labelledby="t-face">', 'id="p-face" aria-labelledby="t-face" hidden>')
    d.sub('id="p-%s" aria-labelledby="t-%s" hidden>' % (key, key), 'id="p-%s" aria-labelledby="t-%s">' % (key, key))
    d.sub('face2.jpg" width="1100" height="1650" loading="lazy"', 'face2.jpg" width="1100" height="1650"')


def social_re(href_prefix):
    # one <a> in the .social grid whose href starts with href_prefix
    return r'\n\s*<a href="%s[^"]*"[^>]*aria-label="[^"]*">(?:(?!</a>).)*</a>' % re.escape(href_prefix)


def personalize(lead, outdir):
    name = lead["name"]
    city, loc = lead["city"], lead["city_loc"]
    phone, e164 = lead.get("phone"), lead.get("phone_e164")
    email, ig, fb = lead.get("email"), lead.get("instagram"), lead.get("facebook")
    hours, hours_text = lead.get("hours"), lead.get("hours_text")
    address = lead.get("address")
    hair = lead.get("category") == "hair"
    handle = ig_handle(lead)
    N = esc(name)

    d = Doc(open(os.path.join(ROOT, "index.html"), encoding="utf-8").read())

    if hair:
        apply_hair(d)
    else:
        low_n = name.lower()
        if lead.get("category") == "nails" or "nail" in low_n or "манікюр" in low_n:
            select_tab(d, "nails")
        elif "brow" in low_n or "lash" in low_n or "бров" in low_n:
            select_tab(d, "brows")

    # ---- head ----
    kind = "стрижки, фарбування, манікюр" if hair else "косметологія, манікюр, брови й вії"
    d.sub("<title>Салон краси [НАЗВА] — косметологія, манікюр, брови й вії | [МІСТО]</title>",
          "<title>%s — салон краси: %s | %s</title>" % (N, kind, esc(city)))
    desc_services = ("стрижки й фарбування волосся, манікюр і педикюр, ламінування брів і вій, догляд за обличчям і тілом"
                     if hair else "чистка й пілінг обличчя, манікюр і педикюр, ламінування брів і вій, догляд за тілом")
    d.resub(r'<meta name="description" content="[^"]*">',
            '<meta name="description" content="Салон краси %s у %s: %s. Стерильні інструменти, професійна косметика. Онлайн-запис.">'
            % (N, esc(loc), desc_services))
    d.sub('<meta property="og:title" content="Салон краси [НАЗВА] — [МІСТО]">',
          '<meta property="og:title" content="%s — салон краси, %s">' % (N, esc(city)))
    ogd = ("Косметологія, манікюр, брови й вії та догляд за тілом." if not hair
           else "Стрижки й фарбування, манікюр, брови й вії та догляд.")
    ogd += (" Запис онлайн або за телефоном %s." % esc(phone)) if phone else " Запис онлайн."
    d.resub(r'<meta property="og:description" content="[^"]*">',
            '<meta property="og:description" content="%s">' % ogd)
    d.resub(r'(<script type="application/ld\+json">\n).*?(\n</script>)',
            lambda m: m.group(1) + build_jsonld(lead, hair) + m.group(2), count=1)

    # ---- name ----
    d.sub('aria-label="[НАЗВА] — на початок сторінки"', 'aria-label="%s — на початок сторінки"' % N)
    low = name.lower()
    about_name = N if low.startswith(("салон", "перукарня", "студія")) else "Салон «%s»" % N
    d.sub("<p>Салон %s працює з" % ph("[НАЗВА]"), "<p>%s працює з" % about_name)
    d.sub(ph("[НАЗВА]"), N)

    # ---- city (each context explicitly) ----
    d.sub("у " + ph("[МІСТО]"), "у " + esc(loc))          # «Салон краси у …» (hero kicker, footer)
    d.sub(", " + ph("[МІСТО]"), ", " + esc(city))         # «адреса, місто»

    # ---- address ----
    if address:
        d.sub(ph("[АДРЕСА]") + ", " + esc(city), esc(address) + ", " + esc(city))
        d.sub(ph("[АДРЕСА]"), esc(address))

    # ---- maps ----
    q = urllib.parse.quote(lead.get("maps_query") or ("%s, %s" % (address, city) if address else city))
    city_q = urllib.parse.quote("Івано-Франківськ")
    d.sub("https://www.google.com/maps?q=%s&amp;output=embed" % city_q,
          "https://www.google.com/maps?q=%s&amp;output=embed" % q)
    d.sub("https://www.google.com/maps/dir/?api=1&amp;destination=%s" % city_q,
          "https://www.google.com/maps/dir/?api=1&amp;destination=%s" % q)

    # ---- hours ----
    if hours:
        data = {str(i): hours.get(str(i)) for i in [1, 2, 3, 4, 5, 6, 0]}
        d.resub(r"data-hours='[^']*'", "data-hours='%s'" % esc(json.dumps(data, separators=(",", ":"))), count=1)
    else:
        d.resub(r'\n\s*<p class="status" id="status"[^>]*>.*?</p>', "", count=1)
    if hours_text:
        d.sub(ph("[ГОДИНИ]"), esc(hours_text))

    # ---- messengers: Viber / Telegram / WhatsApp are unknown for every lead ----
    for pref in ("viber://", "https://t.me/", "https://wa.me/"):
        d.resub(social_re(pref), "", count=1)
    d.sub('data-tg="https://t.me/username" data-viber="viber://chat?number=%2B380000000000" data-mail="mailto:hello@example.com"',
          "FORMDATA")

    # FAQ «write to us» line
    bits = []
    if phone:
        bits.append('зателефонуйте за номером <a href="tel:+%s">%s</a>' % (e164, esc(phone)))
    if ig:
        bits.append('напишіть нам в <a href="%s" target="_blank" rel="noopener">Instagram</a>' % esc(ig))
    elif fb:
        bits.append('напишіть нам у <a href="%s" target="_blank" rel="noopener">Facebook</a>' % esc(fb))
    if email:
        bits.append('надішліть лист на <a href="mailto:%s">%s</a>' % (esc(email), esc(email)))
    faq = "Не знайшли відповіді? " + (" або ".join(bits) + "." if bits else "Залиште заявку нижче — ми передзвонимо.")
    faq = faq.replace("? з", "? З").replace("? н", "? Н")
    d.resub(r'<p class="sec-head__sub">Не знайшли відповіді\?.*?</p>',
            lambda m: '<p class="sec-head__sub">%s</p>' % faq, count=1)

    # ---- phone ----
    if phone:
        d.sub("tel:+380000000000", "tel:+" + e164)
        d.sub(ph("[ТЕЛЕФОН]"), esc(phone))
    else:
        d.resub(r'\n\s*<a class="hdr__tel".*?</a>', "", count=1)
        alt = (ig, "Написати в Instagram") if ig else (fb, "Написати у Facebook") if fb else None
        if alt:
            d.sub('<a class="btn btn--line" href="tel:+380000000000">Зателефонувати</a>',
                  '<a class="btn btn--line" href="%s" target="_blank" rel="noopener">%s</a>' % (esc(alt[0]), alt[1]))
        else:
            d.sub('\n        <a class="btn btn--line" href="tel:+380000000000">Зателефонувати</a>', "")
        d.resub(r'\n\s*<div><dt>Телефон</dt>.*?</div>', "", count=1)
        d.resub(social_re("tel:"), "", count=1)
        d.resub(r'\n\s*<p class="form-ok__call">.*?</p>', "", count=1)
        dock_call = re.search(r'\n  <a href="tel:\+380000000000">.*?</a>', d.t, re.S).group(0)
        if alt:
            icon = ('<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>Instagram'
                    if ig else
                    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>Facebook')
            d.sub(dock_call, '\n  <a href="%s" target="_blank" rel="noopener">%s</a>' % (esc(alt[0]), icon))
        else:
            d.sub(dock_call, "")
            d.sub('<nav class="dock" aria-label="Швидкі дії">',
                  '<nav class="dock" aria-label="Швидкі дії" style="grid-template-columns:1.3fr 1fr">')

    # ---- email ----
    if email:
        d.sub("mailto:hello@example.com", "mailto:" + esc(email))
        d.sub(ph("[EMAIL]"), esc(email))
    else:
        d.resub(r'\n\s*<div><dt>Email</dt>.*?</div>', "", count=1)
        d.resub(social_re("mailto:"), "", count=1)

    # ---- instagram / facebook ----
    if ig:
        d.sub("https://www.instagram.com/username/", esc(ig))
        label = "@" + handle if handle else "Instagram"
        d.sub('aria-label="Instagram [ІНСТАГРАМ]"', 'aria-label="Instagram %s"' % esc(label))
        d.sub(ph("[ІНСТАГРАМ]"), "<span>%s</span>" % esc(label))
    else:
        d.resub(social_re("https://www.instagram.com/"), "", count=1)
    if fb:
        d.sub("https://www.facebook.com/username", esc(fb))
    else:
        d.resub(social_re("https://www.facebook.com/"), "", count=1)

    # ---- booking form channels ----
    chans = []
    if phone:
        chans.append(("sms", "SMS", "sms:+" + e164))
    if email:
        chans.append(("mail", "Email", "mailto:" + email))
    if ig:
        chans.append(("ig", "Instagram", ig))
    if fb:
        chans.append(("fb", "Facebook", fb))
    attrs = " ".join('data-%s="%s"' % (k, esc(u)) for k, _, u in chans)
    d.sub("FORMDATA", attrs or 'data-none=""')
    radios = "\n            ".join(
        '<label class="chip-r"><input type="radio" name="via" value="%s"%s><span>%s</span></label>'
        % (k, " checked" if i == 0 else "", lbl) for i, (k, lbl, _) in enumerate(chans))
    d.resub(r'(<fieldset class="field field--full">\s*<legend>Куди надіслати заявку</legend>\s*<div class="chips">\s*).*?(\s*</div>\s*</fieldset>)',
            lambda m: m.group(1) + radios + m.group(2), count=1)
    if len(chans) <= 1:
        d.sub('<fieldset class="field field--full">\n          <legend>Куди надіслати заявку</legend>',
              '<fieldset class="field field--full" hidden>\n          <legend>Куди надіслати заявку</legend>')
    if not chans:
        # nothing to send to: hide the form, keep the map and contacts
        d.sub('<form class="form" id="form" novalidate', '<form class="form" id="form" hidden novalidate')
    note = {"sms": "Натискаючи кнопку, ви відкриєте SMS з готовим текстом заявки — лишиться лише надіслати.",
            "mail": "Натискаючи кнопку, ви відкриєте пошту з готовим текстом заявки — лишиться лише надіслати.",
            "ig": "Натискаючи кнопку, ви скопіюєте текст заявки й відкриєте наш Instagram — вставте його в повідомлення.",
            "fb": "Натискаючи кнопку, ви скопіюєте текст заявки й відкриєте нашу сторінку у Facebook — вставте його в повідомлення."}
    if len(chans) == 1:
        d.resub(r'<p class="form__note">.*?</p>', '<p class="form__note">%s</p>' % note[chans[0][0]], count=1)
    elif chans:
        d.resub(r'<p class="form__note">.*?</p>',
                '<p class="form__note">Натискаючи кнопку, ви отримаєте готовий текст заявки — лишиться лише надіслати його.</p>', count=1)
    d.sub("Ми підтвердимо запис у месенджері протягом робочого дня.", "Ми підтвердимо запис протягом робочого дня.")

    # ---- sanity ----
    for bad in ("380000000000", "example.com", "/username", "t.me/", "viber://", "wa.me/", "FORMDATA"):
        if bad in d.t:
            raise SystemExit("leftover sentinel %r for %s" % (bad, lead.get("slug")))

    # ---- write ----
    if os.path.exists(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    for item in COPY:
        src = os.path.join(ROOT, item)
        dst = os.path.join(outdir, item)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
    with open(os.path.join(outdir, "index.html"), "w", encoding="utf-8") as f:
        f.write(d.t)

    left = sorted(set(re.findall(r"\[[A-ZА-ЯІЇЄҐ'’ ]+\]", d.t)))
    filled = ["назва", "місто"]
    if address: filled.append("адреса")
    if phone: filled.append("телефон")
    if email: filled.append("email")
    if ig: filled.append("Instagram")
    if fb: filled.append("Facebook")
    if hours: filled.append("графік роботи (і статус «відчинено/зачинено»)")
    elif hours_text: filled.append("графік роботи (текстом)")
    filled.append("карта й маршрут")
    readme = ["# %s — демо-сайт" % name, "",
              "Шаблон: **salon-krasy** (салон краси, ар-деко; Poiret One + Didact Gothic)%s." % (", з вкладкою «Волосся»" if hair else ""), "",
              "Заповнено з OpenStreetMap (%s): %s." % (lead.get("osm") or "OSM", ", ".join(filled)), "",
              "Видалено кнопки й варіанти зв'язку, яких немає в даних (Viber, Telegram, WhatsApp%s)." % (
                  "".join(", " + x for x, v in (("телефон", phone), ("email", email), ("Instagram", ig), ("Facebook", fb)) if not v)), "",
              "## Залишилось заповнити", ""]
    readme += ["- `%s`" % t for t in left]
    readme += ["- реальні відгуки (картки з позначкою «Приклад відгуку»)",
               "- фото клієнта, зокрема пари «до / після»",
               "- ціни й перелік послуг під салон"]
    with open(os.path.join(outdir, "README.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(readme) + "\n")
    return left


def main():
    args = sys.argv[1:]
    slug = None
    if "--slug" in args:
        i = args.index("--slug"); slug = args[i + 1]; del args[i:i + 2]
    if len(args) != 2:
        print(__doc__); sys.exit(2)
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
