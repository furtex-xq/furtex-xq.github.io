#!/usr/bin/env python3
"""Персоналізація шаблону «Меблі на замовлення» під конкретний лід.

usage: python3 tools/personalize.py <lead.json> <outdir>

Лише стандартна бібліотека. Невідомі канали зв'язку прибираються,
невідомі факти ([ЦІНА], [ІМ'Я], [РІК], [ФОП] …) лишаються позначеними заглушками.
"""
import html
import json
import os
import re
import shutil
import sys
import urllib.parse

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY = ["index.html", "robots.txt", "css", "js", "fonts", "img/favicon.svg"]
DAYS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
UA_MOBILE = {"39", "50", "63", "66", "67", "68", "73", "77", "91", "92", "93", "94", "95", "96", "97", "98", "99"}


def fail(msg):
    raise SystemExit("personalize: " + msg)


def sub1(s, old, new, count=1):
    """Replace an exact fragment; fail loudly if the template changed."""
    if old not in s:
        fail("fragment not found: " + old[:80])
    return s.replace(old, new) if count == 0 else s.replace(old, new, count)


def find_el(s, marker, start=0):
    """Return (begin, end) of the element whose start tag contains `marker` (balanced by tag name)."""
    i = s.find(marker, start)
    if i < 0:
        return None
    b = i if s[i] == "<" else s.rfind("<", 0, i)
    m = re.match(r"<([a-zA-Z0-9]+)", s[b:])
    tag = m.group(1)
    depth, pos = 0, b
    pat = re.compile(r"<(/?)%s\b[^>]*>" % tag)
    for t in pat.finditer(s, b):
        if t.group(1):
            depth -= 1
        else:
            depth += 1
        if depth == 0:
            return b, t.end()
    fail("unbalanced element for " + marker)


def remove_el(s, marker, required=True, all_=False):
    found = False
    while True:
        r = find_el(s, marker)
        if not r:
            break
        b, e = r
        # також прибрати відступ і перенос рядка перед елементом
        lb = s.rfind("\n", 0, b)
        if lb >= 0 and s[lb + 1:b].strip() == "":
            b = lb
        s = s[:b] + s[e:]
        found = True
        if not all_:
            break
    if required and not found:
        fail("element not found: " + marker)
    return s


def replace_el(s, marker, new):
    r = find_el(s, marker)
    if not r:
        fail("element not found: " + marker)
    return s[:r[0]] + new + s[r[1]:]


def esc(v):
    return html.escape(v, quote=True)


def city_fill(s, lead):
    """[МІСТО]: після в/у — місцевий відмінок, інакше називний."""
    city, loc = lead.get("city"), lead.get("city_loc") or lead.get("city")
    if not city:
        return s
    tok = r'(?:<span class="ph">\[МІСТО\]</span>|\[МІСТО\])'
    s = re.sub(r"(\b[вуВУ]\s+)" + tok, lambda m: m.group(1) + esc(loc), s)
    return re.sub(tok, esc(city), s)


def fill(s, token, value):
    """Known value: replace token and drop the placeholder marking."""
    v = esc(value)
    s = s.replace('<span class="ph">%s</span>' % token, v)
    return s.replace(token, v)


def hours_rows(hours):
    """Group consecutive days (Mon..Sun) with identical hours."""
    order = [1, 2, 3, 4, 5, 6, 0]
    groups = []
    for d in order:
        v = hours.get(str(d))
        v = tuple(v) if v else None
        if groups and groups[-1][1] == v:
            groups[-1][0].append(d)
        else:
            groups.append([[d], v])
    rows = []
    for days, v in groups:
        label = DAYS[days[0]] if len(days) == 1 else DAYS[days[0]] + "–" + DAYS[days[-1]]
        if len(days) == 2:
            label = DAYS[days[0]] + ", " + DAYS[days[1]]
        val = "%s–%s" % v if v else "вихідний"
        rows.append('          <tr data-days="%s"><th>%s</th><td>%s</td></tr>' % (",".join(map(str, days)), label, val))
    return "\n".join(rows)


def main():
    if len(sys.argv) != 3:
        fail("usage: personalize.py <lead.json> <outdir>")
    lead = json.load(open(sys.argv[1], encoding="utf-8"))
    out = sys.argv[2]
    name = lead.get("name") or fail("lead has no name")
    phone, e164 = lead.get("phone"), lead.get("phone_e164")
    if not (phone and e164):
        phone = e164 = None
    email = lead.get("email")
    ig, ig_handle = lead.get("instagram"), lead.get("instagram_handle")
    if ig and not ig_handle:
        m = re.search(r"instagram\.com/([^/?#]+)", ig)
        ig_handle = m.group(1) if m else None
    fb = lead.get("facebook")
    hours, hours_text = lead.get("hours"), lead.get("hours_text")
    address = lead.get("address")
    mq = urllib.parse.quote(lead.get("maps_query") or ", ".join(x for x in [address, lead.get("city")] if x) or "Івано-Франківськ")
    mobile = bool(e164 and e164.startswith("380") and e164[3:5] in UA_MOBILE)

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # ---------- JSON-LD (parse → modify → dump) ----------
    m = re.search(r'(<script type="application/ld\+json">\s*)(.*?)(\s*</script>)', s, re.S)
    ld = json.loads(m.group(2))
    ld["name"] = name
    ld["description"] = ld["description"].replace("[МІСТО]", lead.get("city") or "[МІСТО]")
    ld["address"]["addressLocality"] = lead.get("city") or "[МІСТО]"
    ld["areaServed"] = lead.get("city") or "[МІСТО]"
    if address:
        ld["address"]["streetAddress"] = address
    if phone:
        ld["telephone"] = phone
    else:
        ld.pop("telephone", None)
    if email:
        ld["email"] = email
    else:
        ld.pop("email", None)
    if lead.get("hours_osm"):
        ld["openingHours"] = lead["hours_osm"]
    elif hours_text:
        ld["openingHours"] = hours_text
    else:
        ld.pop("openingHours", None)
    ld["sameAs"] = [u for u in [ig, fb] if u]
    if not ld["sameAs"]:
        ld.pop("sameAs")
    ld.pop("foundingDate", None)  # невідомо → не публікуємо заглушку в структурованих даних
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/")
    s = s[:m.start(2)] + ld_txt + s[m.end(2):]

    # ---------- <head> ----------
    if phone:
        s = s.replace(". [ТЕЛЕФОН]\">", ". " + esc(phone) + "\">")
    else:
        s = sub1(s, " [ТЕЛЕФОН]\">", "\">")

    # ---------- Канали, яких немає ні в кого: Viber / Telegram / WhatsApp ----------
    s = remove_el(s, '<a class="soc" href="viber://')
    s = remove_el(s, '<a class="soc" href="https://t.me/')
    s = remove_el(s, '<a class="soc" href="https://wa.me/')
    s = remove_el(s, '<label><input type="radio" name="via" value="tg"')
    s = remove_el(s, '<label><input type="radio" name="via" value="viber"')
    s = sub1(s, "Напишіть у Viber чи Telegram — відповімо в робочий час.",
             "Подзвоніть нам — відповімо в робочий час." if phone else
             ("Напишіть нам в Instagram — відповімо в робочий час." if ig else
              "Залиште заявку — відповімо в робочий час."))

    # ---------- Телефон ----------
    if phone:
        s = s.replace("tel:+380000000000", "tel:+" + e164)
        s = fill(s, "[ТЕЛЕФОН]", phone)
    else:
        s = remove_el(s, '<a class="nav-phone"')
        s = remove_el(s, '<p class="tel">')
        s = remove_el(s, '<a href="tel:+380000000000"><svg')  # мобільна панель
        tb = ('<div class="tb-cell"><span>Instagram</span><b><a href="%s" target="_blank" rel="noopener">@%s</a></b></div>' % (esc(ig), esc(ig_handle))
              if ig else ('<div class="tb-cell"><span>Пошта</span><b><a href="mailto:%s">%s</a></b></div>' % (esc(email), esc(email)) if email else
                          '<div class="tb-cell"><span>Замір</span><b>за заявкою</b></div>'))
        s = replace_el(s, '<div class="tb-cell"><span>Телефон</span>', tb)

    # ---------- Мобільна панель: вирівняти колонки ----------
    if not phone:
        mb = find_el(s, '<nav class="mbar"')
        block = s[mb[0]:mb[1]]
        if ig:
            ig_btn = ('<a href="%s" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/>'
                      '<circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>Instagram</a>\n  ' % esc(ig))
            block = block.replace('<a href="#zayavka" class="mbar-main">', ig_btn + '<a href="#zayavka" class="mbar-main">', 1)
        else:
            block = block.replace('<nav class="mbar"', '<nav class="mbar" style="grid-template-columns:1.2fr 1fr"', 1)
        s = s[:mb[0]] + block + s[mb[1]:]

    # ---------- Email / Instagram / Facebook ----------
    if email:
        s = s.replace("mailto:hello@example.com", "mailto:" + esc(email))
        s = fill(s, "[EMAIL]", email)
    else:
        s = remove_el(s, '<a class="soc" href="mailto:')
    if ig:
        s = s.replace("https://www.instagram.com/username/", esc(ig))
        s = fill(s, "[ІНСТАГРАМ]", "@" + ig_handle)
    else:
        s = remove_el(s, '<a class="link-arrow" href="https://www.instagram.com/')
        s = remove_el(s, '<a class="soc" href="https://www.instagram.com/')
    if fb:
        s = s.replace("https://www.facebook.com/username", esc(fb))
    else:
        s = remove_el(s, '<a class="soc" href="https://www.facebook.com/')

    # рядок «Пошта · Instagram»
    parts = []
    if email:
        parts.append('Пошта: <a href="mailto:%s">%s</a>' % (esc(email), esc(email)))
    if ig:
        parts.append('Instagram: <a href="%s" target="_blank" rel="noopener">@%s</a>' % (esc(ig), esc(ig_handle)))
    if parts:
        s = replace_el(s, '<p class="mail">', '<p class="mail">' + " · ".join(parts) + "</p>")
    else:
        s = remove_el(s, '<p class="mail">')

    # блок кнопок: телефон + наявні соцмережі
    soc = find_el(s, '<div class="socials">')
    block = s[soc[0]:soc[1]]
    if phone:
        call = ('<a class="soc" href="tel:+%s" aria-label="Подзвонити"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 '
                '19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 '
                '1.7 2z"/></svg><span>Подзвонити</span></a>' % e164)
        block = block.replace('<div class="socials">', '<div class="socials">\n        ' + call, 1)
    n = block.count('class="soc"')
    if n <= 1:
        # одна кнопка дублювала б номер телефону / рядок з Instagram вище — прибираємо блок
        s = remove_el(s, '<div class="socials">')
    else:
        block = block.replace('<div class="socials">', '<div class="socials" style="grid-template-columns:repeat(%d,minmax(0,1fr))">' % n, 1)
        s = s[:soc[0]] + block + s[soc[1]:]

    # ---------- Форма: реальні канали ----------
    chans = []
    if mobile:
        chans.append(("sms", "SMS", "sms:+" + e164))
    if email:
        chans.append(("mail", "Email", "mailto:" + email))
    if ig:
        chans.append(("ig", "Instagram", "https://ig.me/m/" + ig_handle))
    js = open(os.path.join(ROOT, "js", "main.js"), encoding="utf-8").read()
    js = sub1(js, 'var LINK_TG = "https://t.me/username";', 'var LINK_TG = "";')
    js = sub1(js, 'var LINK_VIBER = "viber://chat?number=%2B380000000000";', 'var LINK_VIBER = "";')
    js = sub1(js, 'var LINK_MAIL = "mailto:hello@example.com";', 'var LINK_MAIL = %s;' % json.dumps("mailto:" + email if email else ""))
    js = sub1(js, 'var LINK_SMS = "";', 'var LINK_SMS = %s;' % json.dumps("sms:+" + e164 if mobile else ""))
    js = sub1(js, 'var LINK_IG = "";', 'var LINK_IG = %s;' % json.dumps("https://ig.me/m/" + ig_handle if ig else ""))
    js = sub1(js, 'var VIA_DEFAULT = "tg";', 'var VIA_DEFAULT = %s;' % json.dumps(chans[0][0] if chans else "none"))

    if not chans:
        # немає жодного каналу, куди можна надіслати текст → картка дзвінка замість форми
        card = ('<div class="form-card" id="zayavka">\n      <div class="form-ok">\n'
                '        <h3>Заявка на замір</h3>\n'
                '        <p>Подзвоніть нам — узгодимо зручний час і приїдемо на замір зі зразками фасадів і стільниць.</p>\n'
                '        <a class="btn btn-block" href="tel:+%s">Подзвонити %s</a>\n      </div>\n    </div>' % (e164, esc(phone))) if phone else None
        if card is None:
            fail("lead has no channel at all")
        s = replace_el(s, '<div class="form-card" id="zayavka">', card)
    else:
        via = find_el(s, '<fieldset class="field via">')
        if len(chans) == 1:
            s = s[:via[0]] + s[via[1]:]
        else:
            opts = "\n".join('          <label><input type="radio" name="via" value="%s"%s><span>%s</span></label>' % (c[0], " checked" if i == 0 else "", c[1])
                             for i, c in enumerate(chans))
            s = s[:via[0]] + '<fieldset class="field via">\n          <legend>Куди надіслати заявку</legend>\n' + opts + '\n        </fieldset>' + s[via[1]:]
        single = {"sms": "Натискаючи кнопку, ви відкриєте SMS із готовим текстом заявки.",
                  "mail": "Натискаючи кнопку, ви відкриєте пошту з готовим текстом заявки.",
                  "ig": "Відкриється Instagram Direct, а текст заявки скопіюється — просто вставте його в повідомлення."}
        fine = single[chans[0][0]] if len(chans) == 1 else "Натискаючи кнопку, ви відкриєте обраний канал із готовим текстом заявки."
        s = sub1(s, "Натискаючи кнопку, ви відкриєте месенджер із готовим текстом заявки.", fine)
        if phone:
            ok = 'Якщо повідомлення не відкрилося, подзвоніть нам: <a href="tel:+%s">%s</a>. Текст заявки ми також скопіювали в буфер обміну.' % (e164, esc(phone))
        elif ig:
            ok = 'Якщо Instagram не відкрився, напишіть нам у Direct: <a href="%s" target="_blank" rel="noopener">@%s</a>. Текст заявки вже скопійовано в буфер обміну.' % (esc(ig), esc(ig_handle))
        else:
            ok = 'Якщо пошта не відкрилася, напишіть нам: <a href="mailto:%s">%s</a>. Текст заявки ми також скопіювали в буфер обміну.' % (esc(email), esc(email))
        p = find_el(s, '<p>Якщо месенджер не відкрився')
        s = s[:p[0]] + "<p>" + ok + "</p>" + s[p[1]:]

    # ---------- Години роботи ----------
    tbl = find_el(s, '<table class="hours-table">')
    if hours:
        s = s[:tbl[0]] + '<table class="hours-table">\n' + hours_rows(hours) + '\n        </table>' + s[tbl[1]:]
        s = remove_el(s, '<p class="hours-sum">')
        s = fill(s, "[ГОДИНИ]", hours_text or "")
    else:
        s = s[:tbl[0]] + s[tbl[1]:]
        s = remove_el(s, '<p class="hours-status"')
        if hours_text:
            s = fill(s, "[ГОДИНИ]", hours_text)
        # обидва null → заглушка [ГОДИНИ] лишається, живий статус прихований

    # ---------- Карта і маршрут ----------
    s = re.sub(r'https://www\.google\.com/maps\?q=[^"&]*&amp;output=embed', "https://www.google.com/maps?q=%s&amp;output=embed" % mq, s)
    s = re.sub(r'https://www\.google\.com/maps/dir/\?api=1&amp;destination=[^"]*', "https://www.google.com/maps/dir/?api=1&amp;destination=%s" % mq, s)

    # ---------- Текстові токени ----------
    s = fill(s, "[НАЗВА]", name)
    s = city_fill(s, lead)
    if address:
        s = fill(s, "[АДРЕСА]", address)

    # ---------- Перевірки ----------
    for bad in ["380000000000", "example.com", "/username", "t.me/", "wa.me/", "viber://"]:
        if bad in s or bad in js:
            fail("sentinel left: " + bad)
    allowed = {"[ЦІНА]", "[ІМ'Я]", "[РІК]", "[ФОП]", "[ГОДИНИ]", "[АДРЕСА]"}
    left = set(re.findall(r"\[[А-ЯІЇЄҐA-Z']+\]", s))
    if left - allowed:
        fail("unexpected tokens left: %s" % sorted(left - allowed))
    json.loads(re.search(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', s, re.S).group(1))

    # ---------- Запис ----------
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    for item in COPY:
        src, dst = os.path.join(ROOT, item), os.path.join(out, item)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(s)
    open(os.path.join(out, "js", "main.js"), "w", encoding="utf-8").write(js)

    filled = ["назва", "місто"] + [k for k, v in [("адреса", address), ("телефон", phone), ("email", email), ("Instagram", ig),
                                                 ("Facebook", fb), ("графік роботи", hours or hours_text)] if v]
    remain = sorted(left)
    readme = ["# %s — демо-сайт" % name, "",
              "Персоналізована копія шаблону `mebli-na-zamovlennia` (меблі на замовлення).", "",
              "**Заповнено з OpenStreetMap:** " + ", ".join(filled) + ".", ""]
    if lead.get("osm"):
        readme += ["Джерело: " + lead["osm"], ""]
    readme += ["**Ще треба заповнити** (позначені бурштиновим підкресленням на сторінці):", ""]
    hints = {"[ЦІНА]": "ціни «від … грн» у прайсі, hero і конфігураторі", "[ІМ'Я]": "імена авторів відгуків (і самі відгуки — зараз приклади)",
             "[РІК]": "рік заснування", "[ФОП]": "ФОП / ЄДРПОУ у футері", "[ГОДИНИ]": "графік роботи", "[АДРЕСА]": "адреса"}
    readme += ["- `%s` — %s" % (t, hints.get(t, "")) for t in remain]
    readme += ["- фото — замінити на реальні роботи майстерні", ""]
    open(os.path.join(out, "README.md"), "w", encoding="utf-8").write("\n".join(readme))
    print("ok", lead.get("slug"), "->", out, "| left:", " ".join(remain), "| form:", ",".join(c[0] for c in chans) or "call-card")


if __name__ == "__main__":
    main()
