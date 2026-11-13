#!/usr/bin/env python3
"""Персоналізація шаблону «Поліграфія» під конкретного ліда.

usage: python3 tools/personalize.py <lead.json> <outdir>
       (якщо в JSON список лідів — кожен пишеться в <outdir>/<slug>/)

Підставляє відомі дані (назва, місто, адреса, телефон, email, Instagram,
Facebook, графік), прибирає кнопки невідомих каналів (Viber/Telegram/WhatsApp —
завжди) і пише готову копію сайту в <outdir>. Лише стандартна бібліотека.
"""
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
PAGE_URL = "https://raw.githack.com/furtex-xq/furtex-xq.github.io/beta/{slug}/index.html"
TEMPLATE_CITY_ENC = quote("Івано-Франківськ")
DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
ALWAYS_UNKNOWN = ("viber", "telegram", "whatsapp")


def esc(v):
    return html.escape(v, quote=True)


def block(s, name, repl):
    """Замінює <!--name-->...<!--/name--> на repl."""
    pat = re.compile(r"<!--%s-->(.*?)<!--/%s-->" % (re.escape(name), re.escape(name)), re.S)
    assert pat.search(s), "block not found: " + name
    return pat.sub(lambda m: repl, s)


def channel_blocks(s, known):
    # <!--ch:X-->…<!--/ch:X--> — лишаємо вміст лише для відомих каналів (разом із рядком)
    def ch(m):
        return m.group(2) if known.get(m.group(1)) else ""
    s = re.sub(r"<!--ch:(\w+)-->(.*?)<!--/ch:\1-->", ch, s, flags=re.S)
    # <!--alt:X …--> — показуємо, коли X невідомий
    s = re.sub(r"<!--alt:(\w+) (.*?)-->", lambda m: "" if known.get(m.group(1)) else m.group(2).strip(), s, flags=re.S)
    # рядки, що лишилися порожніми
    s = re.sub(r"\n[ \t]+(?=\n)", "", s)
    return s


def build_jsonld(lead, url, image):
    city = lead.get("city")
    d = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": lead["name"],
        "description": "Поліграфія та друк у %s: візитки, флаєри, буклети, наклейки, банери, плакати, друк документів." % (lead.get("city_loc") or city or ""),
        "image": image,
        "url": url,
    }
    if lead.get("phone_e164"):
        d["telephone"] = "+" + lead["phone_e164"]
    if lead.get("email"):
        d["email"] = lead["email"]
    addr = {"@type": "PostalAddress", "addressCountry": "UA"}
    if lead.get("address"):
        addr["streetAddress"] = lead["address"]
    if city:
        addr["addressLocality"] = city
        d["areaServed"] = city
    d["address"] = addr
    hours = lead.get("hours")
    if hours:
        spec = []
        for i in range(7):
            h = hours.get(str(i))
            if h:
                spec.append({"@type": "OpeningHoursSpecification", "dayOfWeek": "https://schema.org/" + DAYS_EN[i], "opens": h[0], "closes": h[1]})
        if spec:
            d["openingHoursSpecification"] = spec
    same = [u for u in (lead.get("instagram"), lead.get("facebook")) if u]
    if same:
        d["sameAs"] = same
    txt = json.dumps(d, ensure_ascii=False, indent=2).replace("</", "<\\/")
    return '<script type="application/ld+json">\n' + txt + "\n</script>"


def build_config(lead, known):
    hours = lead.get("hours")
    cfg = {
        "hours": {str(i): (hours.get(str(i)) or None) for i in range(7)} if hours else None,
        "showHoursTable": True,
        "prices": None,
        "telegram": "",
        "viber": "",
        "email": ("mailto:" + lead["email"]) if known["email"] else "",
        "sms": ("sms:+" + lead["phone_e164"]) if known["phone"] else "",
        "instagramDm": ("https://ig.me/m/" + lead["instagram_handle"]) if lead.get("instagram_handle") else (lead.get("instagram") or ""),
        "brand": lead["name"],
    }
    return "/*CONFIG-START*/\n  var CONFIG = " + json.dumps(cfg, ensure_ascii=False) + ";\n  /*CONFIG-END*/"


def personalize(lead, out):
    name = lead["name"]
    city = lead.get("city")
    city_loc = lead.get("city_loc") or city
    known = {
        "phone": bool(lead.get("phone") and lead.get("phone_e164")),
        "email": bool(lead.get("email")),
        "instagram": bool(lead.get("instagram")),
        "facebook": bool(lead.get("facebook")),
    }
    for k in ALWAYS_UNKNOWN:
        known[k] = False

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    page_url = PAGE_URL.format(slug=lead["slug"])
    image = re.search(r'<meta property="og:image" content="([^"]+)"', s).group(1)

    # 1. JSON-LD цілком із даних ліда
    s = block(s, "jsonld", build_jsonld(lead, page_url, image))

    # 2. кнопки каналів
    s = channel_blocks(s, known)

    # 3. канали відправки заявки
    chans = []
    if known["phone"]:
        chans.append(("sms", "SMS"))
    if lead.get("instagram"):
        chans.append(("instagram", "Instagram"))
    if known["email"]:
        chans.append(("email", "Пошта"))
    if len(chans) > 1:
        chips = "".join('\n            <label class="chip"><input type="radio" name="channel" value="%s"%s><span>%s</span></label>' % (v, " checked" if i == 0 else "", t) for i, (v, t) in enumerate(chans))
        fs = '<fieldset class="field">\n          <legend>Куди надіслати заявку</legend>\n          <div class="chips">' + chips + "\n          </div>\n        </fieldset>"
    elif chans:
        fs = '<input type="hidden" name="channel" value="%s">' % chans[0][0]
    else:
        fs = '<input type="hidden" name="channel" value="none">'
    s = block(s, "channels", fs)
    via_names = {"sms": "SMS", "instagram": "Instagram Direct", "email": "пошті"}
    if chans:
        names = [via_names[v] for v, _ in chans]
        via = names[0] if len(names) == 1 else ", ".join(names[:-1]) + " або " + names[-1]
        sub = "Заповніть — повідомлення відкриється в %s. Макет можна надіслати у відповідь." % via
    else:
        sub = "Заповніть — ми підготуємо текст заявки."
    s = re.sub(r'<p class="order-sub">.*?</p>', '<p class="order-sub">%s</p>' % esc(sub), s, count=1, flags=re.S)

    # 4. повідомлення про успіх
    parts = []
    if known["phone"]:
        parts.append('подзвоніть нам <a href="tel:+%s">%s</a>' % (lead["phone_e164"], esc(lead["phone"])))
    if lead.get("instagram"):
        parts.append('напишіть <a href="%s" target="_blank" rel="noopener">в Instagram</a>' % esc(lead["instagram"]))
    if known["email"]:
        parts.append('напишіть на <a href="mailto:%s">%s</a>' % (esc(lead["email"]), esc(lead["email"])))
    tail = (" Якщо повідомлення не відкрилося, " + " або ".join(parts) + ".") if parts else ""
    if lead.get("instagram") and not known["phone"] and not known["email"]:
        tail += " Текст заявки скопійовано — вставте його в Direct."
    s = block(s, "success", "<p><b>Заявку підготовлено.</b>%s</p>" % tail)

    # 5. посилання
    s = s.replace('<link rel="canonical" href="https://example.com/">', '<link rel="canonical" href="%s">' % esc(page_url))
    s = s.replace('content="https://example.com/"', 'content="%s"' % esc(page_url))
    if known["phone"]:
        s = s.replace("tel:+380000000000", "tel:+" + lead["phone_e164"])
    if known["email"]:
        s = s.replace("mailto:hello@example.com", "mailto:" + esc(lead["email"]))
    if lead.get("instagram"):
        s = s.replace("https://www.instagram.com/username/", esc(lead["instagram"]))
    if lead.get("facebook"):
        s = s.replace("https://www.facebook.com/username", esc(lead["facebook"]))
    mq = lead.get("maps_query") or ", ".join(x for x in (lead.get("address"), city) if x)
    if mq:
        s = s.replace(TEMPLATE_CITY_ENC, quote(mq))

    # 6. текстові токени
    def tok(token, value):
        nonlocal s
        if value:
            s = s.replace(token, esc(value))
    if city:
        # «у/в [МІСТО]» → місцевий відмінок
        vowel = city_loc[:1].upper() in "АЕЄИІЇОУЮЯ"

        def loc(m):
            prep = m.group(1)
            if vowel and prep in "уУ":
                prep = "в" if prep == "у" else "В"
            return prep + m.group(2) + esc(city_loc)
        s = re.sub(r'\b([вуВУ])(\s+(?:<span class="ph">)?)\[МІСТО\]', loc, s)
    tok("[МІСТО]", city)
    tok("[НАЗВА]", name)
    tok("[АДРЕСА]", lead.get("address"))
    if known["phone"]:
        tok("[ТЕЛЕФОН]", lead["phone"])
    tok("[EMAIL]", lead.get("email"))
    tok("[ІНСТАГРАМ]", ("@" + lead["instagram_handle"]) if lead.get("instagram_handle") else None)
    tok("[ГОДИНИ]", lead.get("hours_text"))

    # 7. зняти позначку плейсхолдера там, де токен уже замінено
    def unph(m):
        return m.group(1) if "[" not in m.group(1) else m.group(0)
    s = re.sub(r'<span class="ph">([^<]*)</span>', unph, s)

    # 8. JS: графік, канали, назва
    js = open(os.path.join(ROOT, "js/main.js"), encoding="utf-8").read()
    js = re.sub(r"/\*CONFIG-START\*/.*?/\*CONFIG-END\*/", lambda m: build_config(lead, known), js, flags=re.S)

    # 9. запис
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(os.path.join(out, "js"))
    os.makedirs(os.path.join(out, "img"))
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(s)
    open(os.path.join(out, "js/main.js"), "w", encoding="utf-8").write(js)
    shutil.copytree(os.path.join(ROOT, "css"), os.path.join(out, "css"))
    shutil.copytree(os.path.join(ROOT, "fonts"), os.path.join(out, "fonts"))
    shutil.copy(os.path.join(ROOT, "img/favicon.svg"), os.path.join(out, "img/favicon.svg"))
    shutil.copy(os.path.join(ROOT, "robots.txt"), os.path.join(out, "robots.txt"))

    left = sorted(set(re.findall(r"\[[^\]\s<>\"]{2,20}\]", s)))
    filled = ["назва", "місто"]
    for key, label in (("address", "адреса"), ("phone", "телефон"), ("email", "email"), ("instagram", "Instagram"), ("facebook", "Facebook")):
        if lead.get(key):
            filled.append(label)
    if lead.get("hours"):
        filled.append("графік роботи (таблиця по днях і живий статус «відчинено/зачинено»)")
    elif lead.get("hours_text"):
        filled.append("графік роботи (текстом, без живого статусу)")
    readme = [
        "# %s — демо-сайт поліграфії" % name,
        "",
        "Шаблон: `polihrafiia` (поліграфія / друк): калькулятор друку з розкладкою на аркуші SRA3, прайс-лист, заявка на друк.",
        "",
        "Демо: %s" % page_url,
        "",
        "## Заповнено з OpenStreetMap",
        "",
    ]
    readme += ["- " + f for f in filled]
    if mq:
        readme.append("- карта Google і «Маршрут» за запитом «%s»" % mq)
    readme += ["", "## Ще треба заповнити (позначені пунктиром на сайті)", ""]
    readme += ["- `%s`" % t for t in left] or ["- нічого"]
    readme += [
        "- ціни для калькулятора — `CONFIG.prices` у `js/main.js`",
        "- приклади відгуків (картки «Приклад відгуку») — замінити на реальні",
        "- фото — зараз стокові з Unsplash, бажано фото цеху та продукції",
        "",
        "Viber / Telegram / WhatsApp у джерелі не вказані — кнопки прибрано. Форма надсилає заявку через: %s." % (", ".join(t for _, t in chans) if chans else "—"),
        "",
    ]
    open(os.path.join(out, "README.md"), "w", encoding="utf-8").write("\n".join(readme))
    return left


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    data = json.load(open(sys.argv[1], encoding="utf-8"))
    if isinstance(data, list):
        for lead in data:
            left = personalize(lead, os.path.join(sys.argv[2], lead["slug"]))
            print(lead["slug"], "left:", " ".join(left))
    else:
        left = personalize(data, sys.argv[2])
        print(data["slug"], "left:", " ".join(left))


if __name__ == "__main__":
    main()
