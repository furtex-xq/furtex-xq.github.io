#!/usr/bin/env python3
"""Персоналізація шаблону «Кульки й декор свят» під конкретного ліда.

usage: python3 tools/personalize.py <lead.json> <outdir>
       (якщо JSON — список лідів, кожен пишеться в <outdir>/<slug>/)

Підставляє відомі дані (назва, місто, адреса, телефон, email, Instagram,
Facebook, графік), прибирає кнопки невідомих каналів і пише готову копію
сайту в <outdir>. Лише стандартна бібліотека.
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
DAYS_SHORT = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]


def esc(v):
    return html.escape(v, quote=True)


def ig_handle(lead):
    if lead.get("instagram_handle"):
        return lead["instagram_handle"].lstrip("@")
    m = re.search(r"instagram\.com/([A-Za-z0-9_.]+)", lead.get("instagram") or "")
    return m.group(1) if m else None


def hours_summary(hours):
    """{"0":[..],..} → «Пн–Сб 10:00–19:00, Нд 11:00–18:00»"""
    order = [1, 2, 3, 4, 5, 6, 0]
    groups = []
    for d in order:
        h = hours.get(str(d))
        key = "%s–%s" % tuple(h) if h else "вихідний"
        if groups and groups[-1][2] == key:
            groups[-1][1] = d
        else:
            groups.append([d, d, key])
    parts = []
    for a, b, key in groups:
        days = DAYS_SHORT[a] if a == b else "%s–%s" % (DAYS_SHORT[a], DAYS_SHORT[b])
        parts.append("%s %s" % (days, key))
    return ", ".join(parts)


def build_jsonld(lead, url, image, hours_text):
    city = lead.get("city")
    d = {
        "@context": "https://schema.org",
        "@type": "Store",
        "name": lead["name"],
        "description": "Повітряні кульки з гелієм, фольговані цифри, фотозони та оформлення свят"
                       + (" у %s." % (lead.get("city_loc") or city) if city else "."),
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
    d["address"] = addr
    hours = lead.get("hours")
    if hours:
        d["openingHoursSpecification"] = [
            {"@type": "OpeningHoursSpecification", "dayOfWeek": "https://schema.org/" + DAYS_EN[i],
             "opens": hours[str(i)][0], "closes": hours[str(i)][1]}
            for i in range(7) if hours.get(str(i))
        ]
    same = [u for u in (lead.get("instagram"), lead.get("facebook")) if u]
    if same:
        d["sameAs"] = same
    txt = json.dumps(d, ensure_ascii=False, indent=2).replace("</", "<\\/")
    return '<script type="application/ld+json">\n' + txt + "\n</script>"


def channels(lead):
    out = []
    if lead.get("phone_e164"):
        out.append({"id": "sms", "label": "SMS", "url": "sms:+" + lead["phone_e164"]})
    if lead.get("instagram"):
        h = ig_handle(lead)
        out.append({"id": "instagram", "label": "Instagram Direct",
                    "url": ("https://ig.me/m/" + h) if h else lead["instagram"]})
    if lead.get("email"):
        out.append({"id": "email", "label": "Email", "url": "mailto:" + lead["email"]})
    return out


def personalize(lead, out):
    name = lead["name"]
    city = lead.get("city")
    city_loc = lead.get("city_loc") or city
    known = {
        "phone": bool(lead.get("phone") and lead.get("phone_e164")),
        "email": bool(lead.get("email")),
        "instagram": bool(lead.get("instagram")),
        "facebook": bool(lead.get("facebook")),
        "viber": False, "telegram": False, "whatsapp": False,
    }
    hours = lead.get("hours")
    hours_text = lead.get("hours_text") or (hours_summary(hours) if hours else None)
    page_url = PAGE_URL.format(slug=lead["slug"])

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    image = re.search(r'<meta property="og:image" content="([^"]+)"', s).group(1)

    # 1. JSON-LD цілком з даних ліда
    s = re.sub(r"<!--jsonld-->.*?<!--/jsonld-->", lambda m: build_jsonld(lead, page_url, image, hours_text), s, flags=re.S)

    # 2. канали: <!--ch:X-->…<!--/ch:X--> лишаються лише для відомих X
    s = re.sub(r"[ \t]*<!--ch:(\w+)-->(.*?)<!--/ch:\1-->(\n?)",
               lambda m: (m.group(2) + m.group(3)) if known.get(m.group(1)) else "", s, flags=re.S)

    # <!--alt:phone …--> — замінник для дзвінка (Instagram або заявка), коли телефону нема
    def alt(m):
        if known.get(m.group(1)):
            return ""
        content = m.group(2).strip()
        if "instagram.com/username" in content and not known["instagram"]:
            return ""
        return content
    s = re.sub(r"<!--alt:(\w+) (.*?)-->", alt, s, flags=re.S)

    if not known["phone"]:
        s = s.replace("Заходьте, телефонуйте, пишіть", "Заходьте або пишіть")

    # 3. примітка про приклад графіка — у персоналізованих копіях не потрібна
    s = re.sub(r"[ \t]*<!--demo-->.*?<!--/demo-->\n?", "", s, flags=re.S)

    # 4. посилання
    s = s.replace('<link rel="canonical" href="https://example.com/">\n', "")
    s = s.replace('content="https://example.com/"', 'content="%s"' % esc(page_url))
    if known["phone"]:
        s = s.replace("tel:+380000000000", "tel:+" + lead["phone_e164"])
    if known["email"]:
        s = s.replace("mailto:hello@example.com", "mailto:" + esc(lead["email"]))
    if known["instagram"]:
        s = s.replace("https://www.instagram.com/username/", esc(lead["instagram"]))
    if known["facebook"]:
        s = s.replace("https://www.facebook.com/username", esc(lead["facebook"]))
    mq = lead.get("maps_query") or ", ".join(x for x in (lead.get("address"), city) if x)
    if mq:
        s = s.replace(TEMPLATE_CITY_ENC, quote(mq))

    # 5. текстові токени
    def tok(token, value):
        nonlocal s
        if value:
            s = s.replace(token, esc(value))
    if city:
        s = re.sub(r'(\b[вуВУ](?:\s|&nbsp;)+(?:<span class="ph">)?)\[МІСТО\]', lambda m: m.group(1) + esc(city_loc), s)
    tok("[МІСТО]", city)
    tok("[НАЗВА]", name)
    tok("[АДРЕСА]", lead.get("address"))
    if known["phone"]:
        tok("[ТЕЛЕФОН]", lead["phone"])
    tok("[EMAIL]", lead.get("email"))
    h = ig_handle(lead) if known["instagram"] else None
    tok("[ІНСТАГРАМ]", ("@" + h) if h else ("Instagram" if known["instagram"] else None))
    tok("[ГОДИНИ]", hours_text)

    # 6. зняти позначку там, де токен уже замінено
    s = re.sub(r'<span class="ph">([^<\[]*)</span>', r"\1", s)

    # 7. JS: графік, канали, назва
    js = open(os.path.join(ROOT, "js/main.js"), encoding="utf-8").read()
    cfg = {
        "hours": {str(i): (hours.get(str(i)) or None) for i in range(7)} if hours else None,
        "demoHours": False,
        "channels": channels(lead),
        "brand": name,
    }
    js = re.sub(r"/\*CONFIG-START\*/.*?/\*CONFIG-END\*/",
                lambda m: "/*CONFIG-START*/\n  var CONFIG = " + json.dumps(cfg, ensure_ascii=False) + ";\n  /*CONFIG-END*/",
                js, flags=re.S)

    # 8. запис
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

    left = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z'’]{2,20}\]", s + js)))
    filled = ["назва", "місто"]
    for key, label in (("address", "адреса"), ("phone", "телефон"), ("email", "email"),
                       ("instagram", "Instagram"), ("facebook", "Facebook")):
        if lead.get(key):
            filled.append(label)
    if hours:
        filled.append("графік роботи (таблиця й живий статус «відчинено/зачинено» за київським часом)")
    elif hours_text:
        filled.append("графік роботи (текстом, без живого статусу)")
    via = ", ".join(c["label"] for c in cfg["channels"]) or "— (форма показує текст заявки)"
    readme = [
        "# %s — демо-сайт студії кульок і декору" % name,
        "",
        "Шаблон: `kulky-dekor` (повітряні кульки / декор свят): вибір події з готовими сетами, прайс, заявка.",
        "",
        "Демо: %s" % page_url,
        "",
        "## Заповнено з OpenStreetMap",
        "",
    ] + ["- " + f for f in filled] + (["- карта й «Маршрут» за запитом «%s»" % mq] if mq else []) + [
        "",
        "## Ще треба заповнити (позначені жовтим пунктиром)",
        "",
    ] + (["- `%s`" % t for t in left] or ["- нічого"]) + [
        "- приклади відгуків (картки «Приклад відгуку») — замінити на реальні",
        "- фото — зараз стокові з Unsplash; бажано реальні роботи студії",
        "",
        "Viber / Telegram / WhatsApp у джерелі не вказані — кнопки прибрано. Форма надсилає заявку через: %s." % via,
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
