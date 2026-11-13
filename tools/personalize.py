#!/usr/bin/env python3
"""Персоналізація шаблону «Квіти» під конкретного ліда.

usage: python3 tools/personalize.py <lead.json> <outdir>

Бере index.html / css / js / fonts шаблону, підставляє відомі дані ліда
(назва, місто, адреса, телефон, Instagram, графік…), прибирає кнопки
невідомих каналів і пише готову копію сайту в <outdir>. Лише стандартна бібліотека.
"""
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
REPO_RAW = "https://raw.githack.com/furtex-xq/furtex-xq.github.io/beta/{slug}/index.html"
TEMPLATE_CITY_ENC = quote("Івано-Франківськ")
DAY_SCHEMA = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
ALWAYS_UNKNOWN = ("viber", "telegram", "whatsapp")


def esc(v):
    return html.escape(v, quote=True)


def block(s, name, repl):
    """Замінює <!--name-->...<!--/name--> (усі входження) на repl."""
    pat = re.compile(r"<!--%s-->(.*?)<!--/%s-->" % (re.escape(name), re.escape(name)), re.S)
    return pat.sub(lambda m: repl if not callable(repl) else repl(m.group(1)), s)


def channel_blocks(s, known):
    # <!--ch:X-->…<!--/ch:X--> — залишаємо вміст лише для відомих каналів
    def ch(m):
        return m.group(2) if known.get(m.group(1)) else ""
    s = re.sub(r"[ \t]*<!--ch:(\w+)-->(.*?)<!--/ch:\1-->(?:[ \t]*\n(?=[ \t]*\n))?", ch, s, flags=re.S)
    # <!--alt:X …--> — показуємо, коли X невідомий
    def alt(m):
        content = m.group(2).strip()
        if known.get(m.group(1)):
            return ""
        if "instagram.com/username" in content and not known.get("instagram"):
            return ""
        return content
    s = re.sub(r"<!--alt:(\w+) (.*?)-->", alt, s, flags=re.S)
    # <!--if:X …--> — показуємо, коли X відомий
    s = re.sub(r"<!--if:(\w+) (.*?)-->", lambda m: m.group(2).strip() if known.get(m.group(1)) else "", s, flags=re.S)
    # прибрати порожні рядки, що лишилися від видалених блоків
    s = re.sub(r"\n[ \t]+\n", "\n", s)
    return s


def build_jsonld(lead, url, image):
    d = {
        "@context": "https://schema.org",
        "@type": "Florist",
        "name": lead["name"],
        "description": "Квітковий магазин і доставка квітів у %s: авторські букети, композиції, весільна флористика." % (lead.get("city_loc") or lead.get("city") or ""),
        "image": image,
        "url": url,
    }
    if lead.get("phone"):
        d["telephone"] = "+" + lead["phone_e164"] if lead.get("phone_e164") else lead["phone"]
    if lead.get("email"):
        d["email"] = lead["email"]
    addr = {"@type": "PostalAddress", "addressCountry": "UA"}
    if lead.get("address"):
        addr["streetAddress"] = lead["address"]
    if lead.get("city"):
        addr["addressLocality"] = lead["city"]
        d["areaServed"] = lead["city"]
    d["address"] = addr
    hours = lead.get("hours")
    if hours:
        spec = []
        for i in range(7):
            h = hours.get(str(i))
            if h:
                spec.append({"@type": "OpeningHoursSpecification", "dayOfWeek": "https://schema.org/" + ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i], "opens": h[0], "closes": h[1]})
        if spec:
            d["openingHoursSpecification"] = spec
    same = [u for u in (lead.get("instagram"), lead.get("facebook")) if u]
    if same:
        d["sameAs"] = same
    txt = json.dumps(d, ensure_ascii=False, indent=2).replace("</", "<\\/")
    return '<script type="application/ld+json">\n' + txt + "\n</script>"


def build_config(lead, known):
    hours = lead.get("hours")
    cfg_hours = None
    if hours:
        cfg_hours = {str(i): (hours.get(str(i)) or None) for i in range(7)}
    cfg = {
        "hours": cfg_hours,
        "prepHours": 2,
        "slots": [[9, 12], [12, 15], [15, 18], [18, 21]],
        "telegram": "",
        "viber": "",
        "email": "mailto:" + lead["email"] if known.get("email") else "",
        "sms": "sms:+" + lead["phone_e164"] if known.get("phone") else "",
        "instagramDm": ("https://ig.me/m/" + lead["instagram_handle"]) if lead.get("instagram_handle") else (lead.get("instagram") or ""),
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
    page_url = REPO_RAW.format(slug=lead["slug"])
    m = re.search(r'<meta property="og:image" content="([^"]+)"', s)
    image = m.group(1)

    # 1. JSON-LD цілком з даних ліда
    s = block(s, "jsonld", build_jsonld(lead, page_url, image))

    # 2. канали зв'язку
    s = channel_blocks(s, known)

    # 3. канали відправки форми
    chans = []
    if known["phone"]:
        chans.append(("sms", "SMS"))
    if known["email"]:
        chans.append(("email", "Email"))
    if lead.get("instagram"):
        chans.append(("instagram", "Instagram"))
    if len(chans) > 1:
        chips = "".join('\n          <label class="chip"><input type="radio" name="channel" value="%s"%s><span>%s</span></label>' % (v, " checked" if i == 0 else "", t) for i, (v, t) in enumerate(chans))
        fs = '<fieldset class="field">\n        <legend class="label">Куди надіслати замовлення</legend>\n        <div class="chips chips-light">' + chips + "\n        </div>\n      </fieldset>"
    elif chans:
        fs = '<input type="hidden" name="channel" value="%s">' % chans[0][0]
    else:
        fs = '<input type="hidden" name="channel" value="none">'
    s = block(s, "channels", fs)
    via_names = {"sms": "SMS", "email": "лист", "instagram": "Instagram"}
    via = " або ".join(via_names[v] for v, _ in chans) or "повідомлення"
    s = block(s, "sendvia", via)

    # 4. повідомлення про успіх
    parts = []
    if known["phone"]:
        parts.append('подзвоніть нам <a href="tel:+%s">%s</a>' % (lead["phone_e164"], esc(lead["phone"])))
    if lead.get("instagram"):
        parts.append('напишіть <a href="%s" target="_blank" rel="noopener">в Instagram</a>' % esc(lead["instagram"]))
    if known["email"]:
        parts.append('напишіть на <a href="mailto:%s">%s</a>' % (esc(lead["email"]), esc(lead["email"])))
    tail = (" Якщо повідомлення не відкрилося, " + " або ".join(parts) + ".") if parts else ""
    s = block(s, "success", "<p><b>Замовлення підготовлено.</b>%s</p>" % tail)

    # 5. посилання
    s = s.replace('<link rel="canonical" href="https://example.com/">\n', "")
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
        # «в/у/по [МІСТО]» → місцевий відмінок
        s = re.sub(r'(\b(?:[вуВУ]|по|По)\s+(?:<span class="ph">)?)\[МІСТО\]', lambda m: m.group(1) + esc(city_loc), s)
    tok("[МІСТО]", city)
    tok("[НАЗВА]", name)
    tok("[АДРЕСА]", lead.get("address"))
    if known["phone"]:
        tok("[ТЕЛЕФОН]", lead["phone"])
    tok("[EMAIL]", lead.get("email"))
    tok("[ІНСТАГРАМ]", ("@" + lead["instagram_handle"]) if lead.get("instagram_handle") else None)
    hours_text = lead.get("hours_text")
    if hours_text:
        tok("[ГОДИНИ]", hours_text)

    # 7. зняти позначку плейсхолдера там, де токен уже замінено
    def unph(m):
        tag, inner = m.group(1), m.group(2)
        if "[" in inner:
            return m.group(0)
        return inner if tag == "span" else "<%s>%s</%s>" % (tag, inner, tag)
    s = re.sub(r'<(span|small) class="ph">([^<]*)</\1>', unph, s)

    # 8. JS: графік і канали
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
        filled.append("графік роботи (живий статус «відчинено/зачинено» і слоти доставки)")
    elif hours_text:
        filled.append("графік роботи (текстом)")
    readme = [
        "# %s — демо-сайт квіткового магазину" % name,
        "",
        "Шаблон: `kvity` (квітковий магазин / доставка квітів), конструктор букета й слоти доставки за київським часом.",
        "",
        "Демо: %s" % page_url,
        "",
        "## Заповнено з OpenStreetMap",
        "",
        "- " + "\n- ".join(filled),
        "- карта Google за запитом «%s»" % mq if mq else "",
        "",
        "## Ще треба заповнити (позначені пунктиром на сайті)",
        "",
    ]
    readme += ["- `%s`" % t for t in left] or ["- нічого"]
    readme += [
        "- приклади відгуків (картки з позначкою «Приклад відгуку») — замінити на реальні",
        "- фото — зараз стокові з Unsplash, бажано фото магазину й букетів",
        "",
        "Viber / Telegram / WhatsApp не вказані в джерелі — кнопки прибрано; форма надсилає замовлення через: %s." % (via if chans else "—"),
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
        # список лідів: <outdir>/<slug>/
        for lead in data:
            left = personalize(lead, os.path.join(sys.argv[2], lead["slug"]))
            print(lead["slug"], "left:", " ".join(left))
    else:
        left = personalize(data, sys.argv[2])
        print(data["slug"], "left:", " ".join(left))


if __name__ == "__main__":
    main()
