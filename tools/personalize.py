#!/usr/bin/env python3
"""Персоналізація шаблону «Бутик одягу» під конкретний лід.

    python3 tools/personalize.py <lead.json> <outdir>

Тільки стандартна бібліотека. Шаблонний робочий каталог не змінюється.
"""
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

# ---------------------------------------------------------------- варіанти ніші
# Невелике підлаштування формулювань під тип магазину (SEO, обкладинка).
VARIANTS = {
    "boutique": {
        "niche": "Бутик одягу",
        "tail": "одяг, примірка, стиліст",
        "desc": "пальта, трикотаж, костюми, сукні й аксесуари невеликими партіями. Примірка без поспіху, допомога стиліста, підгонка по фігурі",
    },
    "kids": {
        "h1k": ".9",
        "niche": "Магазин дитячого одягу",
        "tail": "дитячий одяг",
        "desc": "одяг для малюків і школярів на щодень і на свята. Допоможемо підібрати розмір на виріст і зібрати комплект",
        "h1": ("Речі, з яких", "не хочеться", "виростати"),
        "lead": "Одяг для малюків і школярів — на щодень, на свята й на прогулянки. Підкажемо розмір на виріст і допоможемо зібрати комплект.",
    },
    "lingerie": {
        "h1k": ".8",
        "niche": "Магазин білизни",
        "tail": "білизна, домашній одяг",
        "desc": "білизна та домашній одяг. Допоможемо підібрати розмір і модель у затишній примірювальній",
        "h1": ("Речі, які", "відчуваєш", "шкірою"),
        "lead": "Білизна й домашній одяг з приємних тканин. Підберемо розмір і модель у затишній примірювальній — без поспіху.",
    },
    "bridal": {
        "h1k": ".72",
        "niche": "Весільний салон",
        "tail": "весільні сукні, примірка",
        "desc": "весільні та вечірні сукні, примірка за записом, підгонка по фігурі",
        "h1": ("Сукня, яку", "пам’ятають", "роками"),
        "lead": "Весільні та вечірні сукні, примірка за записом і підгонка по фігурі. Допоможемо знайти силует, у якому вам буде легко весь день.",
    },
    "men": {
        "niche": "Магазин чоловічого одягу",
        "tail": "чоловічий одяг",
        "desc": "костюми, сорочки, трикотаж і верхній одяг. Підбір розміру й підгонка по фігурі",
        "lead": "Костюми, сорочки, трикотаж і верхній одяг. Підберемо розмір, підженемо довжину — і ви вийдете в готовому образі.",
    },
    "vyshyvanka": {
        "niche": "Магазин вишиванок",
        "tail": "вишиванки, одяг з вишивкою",
        "desc": "вишиванки, сорочки й сукні з вишивкою на щодень і на свята. Допоможемо підібрати розмір і орнамент",
        "lead": "Вишиванки, сорочки й сукні з вишивкою — на щодень і на свята. Допоможемо підібрати розмір і орнамент.",
    },
    "workwear": {
        "h1k": ".86",
        "niche": "Магазин спецодягу",
        "tail": "спецодяг, робоче взуття",
        "desc": "робочий одяг і взуття для бригад і приватних замовників. Підберемо розміри й комплект під вашу роботу",
        "h1": ("Одяг, який", "витримує", "роботу"),
        "lead": "Робочий одяг і взуття для бригад і приватних замовників. Підберемо розміри й комплект під вашу роботу.",
    },
    "shoes": {
        "niche": "Магазин взуття",
        "tail": "взуття, сумки, аксесуари",
        "desc": "взуття, сумки й аксесуари на кожен сезон. Допоможемо з розміром і підберемо пару до образу",
        "h1": ("Пари, які", "носять", "роками"),
        "lead": "Взуття, сумки й аксесуари на кожен сезон. Допоможемо з розміром і підберемо пару до вашого образу.",
        "type": "ShoeStore",
    },
    "store": {
        "niche": "Магазин одягу",
        "tail": "одяг, примірка",
        "desc": "одяг і аксесуари, примірка без поспіху й допомога з розміром",
    },
}
LEAD_VARIANT = {
    "mixkids": "kids", "bembi": "kids", "odiah-dlia-ditei": "kids", "baby-top-top": "kids",
    "ditky-if": "kids", "hurtivnia-anheliatka": "kids",
    "kaurova": "lingerie", "manilace": "lingerie",
    "tiamo-sposa": "bridal",
    "fashion": "men",
    "ukrainska-vyshyvanka": "vyshyvanka", "ornament": "vyshyvanka",
    "spetsodiah": "workwear", "kamufliazh": "workwear",
    "schatz": "shoes",
    "dans-dyzain": "store", "letout-outlet": "store", "ciao-cacao": "store",
}

MOBILE_CODES = {"39", "50", "63", "66", "67", "68", "73", "91", "92", "93", "94", "95", "96", "97", "98", "99"}
DAY_FULL = {1: "Понеділок", 2: "Вівторок", 3: "Середа", 4: "Четвер", 5: "П’ятниця", 6: "Субота", 0: "Неділя"}
COPY_FILES = ["index.html", "robots.txt", "css", "js", "fonts", "img/favicon.svg"]


def esc(s):
    return html.escape(s, quote=True)


def ig_handle(lead):
    h = lead.get("instagram_handle")
    if not h and lead.get("instagram"):
        m = re.search(r"instagram\.com/([A-Za-z0-9._]+)", lead["instagram"])
        h = m.group(1) if m else None
    return h


def ig_url(lead):
    h = ig_handle(lead)
    if h:
        return "https://www.instagram.com/%s/" % h
    return lead.get("instagram")


def drop_lines(s, ch):
    """Видаляє всі однорядкові елементи з data-ch="<ch>"."""
    return re.sub(r'^[^\n]*data-ch="%s"[^\n]*\n' % re.escape(ch), "", s, flags=re.M)


def hours_rows(hours):
    order = [1, 2, 3, 4, 5, 6, 0]
    val = lambda d: tuple(hours.get(str(d))) if hours.get(str(d)) else None
    groups = []
    for d in order:
        v = val(d)
        if groups and groups[-1][1] == v:
            groups[-1][0].append(d)
        else:
            groups.append(([d], v))
    rows = []
    for days, v in groups:
        label = DAY_FULL[days[0]] if len(days) == 1 else "%s — %s" % (DAY_FULL[days[0]], DAY_FULL[days[-1]].lower())
        dd = ",".join(str(d) for d in days)
        if v:
            rows.append('            <tr data-days="%s" data-open="%s" data-close="%s"><th scope="row">%s</th><td>%s — %s</td></tr>' % (dd, v[0], v[1], label, v[0], v[1]))
        else:
            rows.append('            <tr data-days="%s" data-open="" data-close=""><th scope="row">%s</th><td>вихідний</td></tr>' % (dd, label))
    return "\n".join(rows)


def hours_summary(hours):
    short = {1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 0: "Нд"}
    parts, cur = [], None
    for d in [1, 2, 3, 4, 5, 6, 0]:
        v = tuple(hours[str(d)]) if hours.get(str(d)) else None
        if cur and cur[2] == v:
            cur[1] = d
        else:
            cur = [d, d, v]
            parts.append(cur)
    out = []
    for a, b, v in parts:
        days = short[a] if a == b else "%s–%s" % (short[a], short[b])
        out.append("%s %s" % (days, "%s–%s" % v if v else "вихідний"))
    return ", ".join(out)


def personalize(lead, out):
    V = dict(VARIANTS["boutique"])
    V.update(VARIANTS[LEAD_VARIANT.get(lead["slug"], "boutique")])
    name, city, city_loc = lead["name"], lead["city"], lead.get("city_loc") or lead["city"]
    phone, email, addr = lead.get("phone"), lead.get("email"), lead.get("address")
    ig, fb = ig_url(lead), lead.get("facebook")
    handle = ig_handle(lead)
    hours, htext = lead.get("hours"), lead.get("hours_text")
    if hours and not htext:
        htext = hours_summary(hours)
    e164 = lead.get("phone_e164")
    mobile = bool(phone and e164 and e164.startswith("380") and e164[3:5] in MOBILE_CODES)

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # ---- 1. ніша / формулювання
    s = s.replace("| одяг, примірка, стиліст</title>", "| %s</title>" % V["tail"])
    s = s.replace("Бутик <span class=\"ph\">[НАЗВА]</span>", "<span class=\"ph\">[НАЗВА]</span>")
    s = s.replace("Бутик [НАЗВА] на карті", "[НАЗВА] на карті")
    s = s.replace("Бутик одягу", V["niche"])
    if V.get("h1"):
        a, b, c = V["h1"]
        s = s.replace('<span class="ln"><span>Речі, які</span></span>', '<span class="ln"><span>%s</span></span>' % a)
        s = s.replace('<span class="ln ln--in"><span>носять</span></span>', '<span class="ln ln--in"><span>%s</span></span>' % b)
        s = s.replace('<span class="ln"><span><em>роками</em></span></span>', '<span class="ln"><span><em>%s</em></span></span>' % c)
        if V.get("h1k"):
            s = s.replace('<span class="cover__big">', '<span class="cover__big" style="--h1k:%s">' % V["h1k"], 1)
    if V.get("lead"):
        s = re.sub(r'(<p class="cover__lead">)[^<]*(</p>)', lambda m: m.group(1) + V["lead"] + m.group(2), s)

    # meta description — збираємо заново з відомих даних
    tail = []
    if addr:
        tail.append(addr)
    if phone:
        tail.append(phone)
    desc = "%s %s у %s: %s." % (V["niche"], name, city_loc, V["desc"])
    if tail:
        desc += " " + ", ".join(tail) + "."
    s = re.sub(r'<meta name="description" content="[^"]*">', lambda m: '<meta name="description" content="%s">' % esc(desc), s)
    if V.get("lead"):
        s = re.sub(r'<meta property="og:description" content="[^"]*">', lambda m: '<meta property="og:description" content="%s">' % esc(V["lead"]), s)

    # ---- 2. JSON-LD
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    nd = {"@context": "https://schema.org", "@type": V.get("type", "ClothingStore"), "name": name,
          "description": "%s у %s: %s." % (V["niche"], city_loc, V["desc"]), "image": ld["image"]}
    if phone:
        nd["telephone"] = "+" + e164
    if email:
        nd["email"] = email
    adr = {"@type": "PostalAddress"}
    if addr:
        adr["streetAddress"] = addr
    adr.update({"addressLocality": city, "addressCountry": "UA"})
    nd["address"] = adr
    if hours and lead.get("hours_osm"):
        nd["openingHours"] = [p.strip() for p in lead["hours_osm"].split(";") if p.strip()]
    same = [u for u in (ig, fb) if u]
    if same:
        nd["sameAs"] = same
    ldtxt = "\n" + json.dumps(nd, ensure_ascii=False, indent=2).replace("</", "<\\/") + "\n"
    s = s[:m.start(2)] + ldtxt + s[m.end(2):]

    # ---- 3. канали зв'язку
    for ch in ("viber", "tg", "wa"):
        s = drop_lines(s, ch)
    if not email:
        s = drop_lines(s, "mail")
    if not ig:
        s = drop_lines(s, "ig")
    if not fb:
        s = drop_lines(s, "fb")
    if not phone:
        alt = None
        if ig:
            alt = (ig, "i-instagram", "Написати в Instagram", "Instagram")
        elif fb:
            alt = (fb, "i-facebook", "Написати у Facebook", "Facebook")

        def cta(_m):
            if not alt:
                return ""
            return '        <a class="btn btn--line" href="%s" target="_blank" rel="noopener"><svg class="ic"><use href="#%s"/></svg>%s</a>\n' % (esc(alt[0]), alt[1], alt[2])

        def dock(_m):
            if not alt:
                return ""
            return '  <a href="%s" target="_blank" rel="noopener"><svg class="ic"><use href="#%s"/></svg>%s</a>\n' % (esc(alt[0]), alt[1], alt[3])
        s = re.sub(r'^[^\n]*data-alt="cta"[^\n]*\n', cta, s, flags=re.M)
        s = re.sub(r'^[^\n]*data-alt="dock"[^\n]*\n', dock, s, flags=re.M)
        s = drop_lines(s, "tel")

    # футер: колонка «Зв’язок» з того, що є
    foot = []
    if phone:
        foot.append('        <p><a href="tel:+%s">%s</a></p>' % (e164, esc(phone)))
    if email:
        foot.append('        <p><a href="mailto:%s">%s</a></p>' % (esc(email), esc(email)))
    if ig:
        foot.append('        <p><a href="%s" target="_blank" rel="noopener">Instagram%s</a></p>' % (esc(ig), (" @" + esc(handle)) if handle else ""))
    if fb:
        foot.append('        <p><a href="%s" target="_blank" rel="noopener">Facebook</a></p>' % esc(fb))
    s = re.sub(r'(<p class="foot__lbl">Зв’язок</p>\n)(.*?)(\n      </div>)',
               lambda m: m.group(1) + "\n".join(foot) + m.group(3), s, count=1, flags=re.S)

    # варіанти відправки форми
    opts = []
    if mobile:
        opts.append(("sms", "sms:+" + e164, "SMS"))
    if ig:
        opts.append(("ig", ig, "Instagram"))
    if fb:
        opts.append(("fb", fb, "Facebook"))
    new = "".join('\n          <label><input type="radio" name="via" value="%s" data-url="%s"><span>%s</span></label>' % (v, esc(u), t) for v, u, t in opts)
    s = s.replace("<legend>Куди надіслати заявку</legend>", "<legend>Куди надіслати заявку</legend>" + new, 1)
    s = s.replace(' checked><span>', '><span>')
    s = re.sub(r'(<input type="radio" name="via" value="[a-z]+" data-url="[^"]*")>', r'\1 checked>', s, count=1)

    # ---- 4. години роботи
    hm = re.search(r"<!--hours-->(.*?)<!--/hours-->", s, re.S)
    if hours:
        block = hm.group(1)
        block = re.sub(r"(<tbody>\n).*?(\n\s*</tbody>)", lambda m: m.group(1) + hours_rows(hours) + m.group(2), block, flags=re.S)
        s = s[:hm.start()] + block + s[hm.end():]
    else:
        txt = esc(htext) if htext else '<span class="ph">[ГОДИНИ]</span>'
        block = ('\n        <div class="hours__top">\n          <h3>Години роботи</h3>\n        </div>\n'
                 '        <p class="hours__txt">%s</p>\n      ' % txt)
        s = s[:hm.start()] + block + s[hm.end():]

    # ---- 5. карта і маршрут
    q = quote(lead.get("maps_query") or city, safe="")
    s = re.sub(r'https://www\.google\.com/maps\?q=[^&"]*&amp;output=embed', "https://www.google.com/maps?q=%s&amp;output=embed" % q, s)
    s = re.sub(r'https://www\.google\.com/maps/dir/\?api=1&amp;destination=[^"]*', "https://www.google.com/maps/dir/?api=1&amp;destination=%s" % q, s)

    # ---- 6. посилання
    if phone:
        s = s.replace("tel:+380000000000", "tel:+" + e164)
    if email:
        s = s.replace("mailto:hello@example.com", "mailto:" + esc(email))
    if ig:
        s = s.replace("https://www.instagram.com/username/", esc(ig))
    if fb:
        s = s.replace("https://www.facebook.com/username", esc(fb))

    # ---- 7. токени
    known = {"НАЗВА": name, "МІСТО": city}
    if addr:
        known["АДРЕСА"] = addr
    if phone:
        known["ТЕЛЕФОН"] = phone
    if email:
        known["EMAIL"] = email
    if ig:
        known["ІНСТАГРАМ"] = ("@" + handle) if handle else "Instagram"
    if htext:
        known["ГОДИНИ"] = htext
    for t in known:
        s = s.replace('<span class="ph">[%s]</span>' % t, "[%s]" % t)
    s = re.sub(r"(\b[вуВУ] )\[МІСТО\]", lambda m: m.group(1) + esc(city_loc), s)
    for t, v in known.items():
        s = s.replace("[%s]" % t, esc(v))

    # ---- 8. запис
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    for f in COPY_FILES:
        src, dst = os.path.join(ROOT, f), os.path.join(out, f)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        elif f != "index.html":
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(s)

    left = sorted(set(re.findall(r"\[([A-ZА-ЯІЇЄҐ'’]+)\]", s)))
    filled = [k for k, v in (("назва", name), ("місто", city), ("адреса", addr), ("телефон", phone), ("email", email),
                             ("Instagram", ig), ("Facebook", fb), ("години роботи", htext or hours)) if v]
    readme = ["# %s — демо-сайт" % name, "",
              "Шаблон: `butik-odyagu` (бутик одягу, стиль модного журналу), варіант: %s." % V["niche"].lower(), "",
              "Заповнено з OpenStreetMap: %s." % ", ".join(filled), "",
              "Viber, Telegram і WhatsApp прибрано, бо вони невідомі. Форма надсилає заявку через: %s." %
              (", ".join(t for _, _, t in opts) or "—"), "",
              "Ще треба заповнити (плейсхолдери на сайті позначені бурштиновим підкресленням):", ""]
    readme += ["- `[%s]`" % t for t in left]
    readme += ["- приклади відгуків (картки «Приклад відгуку — замініть на реальний»)",
               "- фото: демо-фото з Unsplash, бажано замінити на фото бутика", ""]
    open(os.path.join(out, "README.md"), "w", encoding="utf-8").write("\n".join(readme))
    return left


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: personalize.py <lead.json> <outdir>")
    lead = json.load(open(sys.argv[1], encoding="utf-8"))
    left = personalize(lead, sys.argv[2])
    print(lead["slug"], "ok; left:", " ".join(left))
