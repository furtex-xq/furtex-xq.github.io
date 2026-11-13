#!/usr/bin/env python3
"""Personalize the bar/pub template for one lead.

Usage: python3 tools/personalize.py <lead.json> <outdir>

<lead.json> may hold one lead object or a list (then the first lead is used;
pass a single-lead file per run). Standard library only. The template working
tree is never modified; a complete site copy is written into <outdir>.
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
BAR_WORDS = ("паб", "бар", "кнайп", "pub", "bar", "house", "lounge", "корчм", "пивн")


def esc(s):
    return html.escape(s, quote=True)


def must_replace(s, old, new, count=1):
    if s.count(old) != count:
        raise SystemExit("template changed: expected %d× %r, found %d" % (count, old[:80], s.count(old)))
    return s.replace(old, new)


def sub1(pattern, repl, s, flags=re.S):
    out, n = re.subn(pattern, repl, s, flags=flags)
    if n == 0:
        raise SystemExit("template changed: pattern not found %r" % pattern[:80])
    return out


def to_min(t):
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def ig_handle(lead):
    if lead.get("instagram_handle"):
        return lead["instagram_handle"].lstrip("@")
    url = lead.get("instagram")
    if not url:
        return None
    path = urllib.parse.urlparse(url).path.strip("/")
    return path.split("/")[0] if path else None


def remove_ch(s, ch):
    """Remove an element marked data-ch="<ch>" (an <a> or a <p>), with its line if alone."""
    s, n = re.subn(r'[ \t]*<a data-ch="%s"[^>]*>.*?</a>\n?' % re.escape(ch), "", s, flags=re.S)
    s, n2 = re.subn(r'[ \t]*<(a|p) class="[^"]*" data-ch="%s"[^>]*>.*?</\1>\n?' % re.escape(ch), "", s, flags=re.S)
    return s


def build(lead, outdir):
    name = lead["name"].strip()
    N = esc(name)
    city, city_loc = lead.get("city") or "", lead.get("city_loc") or lead.get("city") or ""
    address = lead.get("address")
    phone, e164 = lead.get("phone"), lead.get("phone_e164")
    if not (phone and e164):
        phone = e164 = None
    email, ig, fb = lead.get("email"), lead.get("instagram"), lead.get("facebook")
    handle = ig_handle(lead) if ig else None
    hours, hours_text = lead.get("hours"), lead.get("hours_text")
    karaoke = (lead.get("category") or "") == "karaoke"
    kind = "караоке-бар" if karaoke else "бар"
    Kind = kind[0].upper() + kind[1:]
    has_bar_word = any(w in name.lower() for w in BAR_WORDS)

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # ---------------- <head> ----------------
    if karaoke:
        title = "%s — караоке-бар у %s: караоке, бар, вечірки до ранку" % (N, esc(city_loc))
        desc_tail = "караоке, пиво з крана, кухня до пива, вечірки й трансляції"
    else:
        title = "%s — бар у %s: пиво з крана, жива музика, квізи" % (N, esc(city_loc))
        desc_tail = "пиво з крана, кухня до пива, концерти, квізи й трансляції матчів"
    s = sub1(r"<title>.*?</title>", "<title>%s</title>" % title, s)
    addr_part = (" (%s)" % esc(address)) if address else ""
    s = sub1(r'<meta name="description" content="[^"]*">',
             '<meta name="description" content="%s — %s у %s%s: %s. Бронювання столу онлайн.">'
             % (N, kind, esc(city_loc), addr_part, desc_tail), s)
    s = sub1(r'<meta property="og:title" content="[^"]*">',
             '<meta property="og:title" content="%s — %s у %s">' % (N, kind, esc(city_loc)), s)
    s = sub1(r'<meta property="og:description" content="[^"]*">',
             '<meta property="og:description" content="%s у %s: %s. Бронюйте стіл онлайн.">'
             % (esc(Kind), esc(city_loc), desc_tail), s)

    # JSON-LD
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    ld["name"] = name
    ld["description"] = "%s у %s: %s." % (Kind, city_loc, desc_tail)
    ld["address"]["streetAddress"] = address or ld["address"]["streetAddress"]
    ld["address"]["addressLocality"] = city
    for k in ("telephone", "email", "openingHours", "priceRange", "sameAs"):
        ld.pop(k, None)
    if phone:
        ld["telephone"] = "+" + e164
    if email:
        ld["email"] = email
    if hours:
        spec = []
        for d in (1, 2, 3, 4, 5, 6, 0):
            v = hours.get(str(d))
            if v:
                spec.append({"@type": "OpeningHoursSpecification", "dayOfWeek": SCHEMA_DAYS[d], "opens": v[0], "closes": v[1]})
        ld["openingHoursSpecification"] = spec
    same = [u for u in (ig, fb) if u]
    if same:
        ld["sameAs"] = same
    if not address:
        ld["address"].pop("streetAddress", None)
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/")
    s = s[:m.start(2)] + "\n" + ld_txt + "\n" + s[m.end(2):]

    # ---------------- header / hero ----------------
    if len(name) > 14:
        s = must_replace(s, '<a class="logo" href="#top"', '<a class="logo logo--long" href="#top"')
    s = must_replace(s, "<small>паб · пиво з крана</small>",
                     "<small>%s</small>" % ("караоке · бар" if karaoke else "бар · пиво з крана"))
    kicker = ("%s · %s" % (N, esc(city))) if has_bar_word else ("%s %s · %s" % (esc(Kind), N, esc(city)))
    s = sub1(r'<span class="hero__kicker">.*?</span>(?=\n)', '<span class="hero__kicker">%s</span>' % kicker, s)

    # ---------------- channels ----------------
    for ch in ("viber", "tg", "wa"):
        s = remove_ch(s, ch)
    if not ig:
        s = remove_ch(s, "ig")
    if not fb:
        s = remove_ch(s, "fb")
    if not email:
        s = remove_ch(s, "mail")
    ig_icon_link = ('<a class="hero__tel" href="%s" target="_blank" rel="noopener"><svg><use href="#i-insta"/></svg>@%s</a>'
                    % (esc(ig), esc(handle or "instagram"))) if ig else ""
    if phone:
        s = s.replace("tel:+380000000000", "tel:+" + e164)
    else:
        # hero: phone link -> Instagram (or nothing)
        s = sub1(r'<a class="hero__tel" data-ch="tel"[^>]*>.*?</a>', ig_icon_link, s)
        s = remove_ch(s, "tel")
        # mobile bar: call -> Instagram / Email / removed
        if ig:
            s = sub1(r'<a data-ch="tel-bar"[^>]*>.*?</a>',
                     '<a href="%s" target="_blank" rel="noopener"><svg><use href="#i-insta"/></svg>Instagram</a>' % esc(ig), s)
        elif email:
            s = sub1(r'<a data-ch="tel-bar"[^>]*>.*?</a>',
                     '<a href="mailto:%s"><svg><use href="#i-mail"/></svg>Написати</a>' % esc(email), s)
        else:
            s = sub1(r'\s*<a data-ch="tel-bar"[^>]*>.*?</a>', "", s)
            s = must_replace(s, '<nav class="actionbar" aria-label="Швидкі дії">',
                             '<nav class="actionbar" aria-label="Швидкі дії" style="grid-template-columns:1.25fr 1fr">')
    s = s.replace(' data-ch="tel-bar"', "").replace(' data-ch="tel"', "")
    for ch in ("ig", "fb", "mail"):
        s = s.replace(' data-ch="%s"' % ch, "")
    if ig:
        s = s.replace("https://www.instagram.com/username/", esc(ig))
    if fb:
        s = s.replace("https://www.facebook.com/username", esc(fb))
    if email:
        s = s.replace("mailto:hello@example.com", "mailto:" + esc(email))

    # menu footnote (Instagram)
    if ig:
        foot = ('<p class="board__foot">Повне меню й актуальні сорти — у барі або в '
                '<a href="%s" target="_blank" rel="noopener">Instagram @%s</a></p>' % (esc(ig), esc(handle or "")))
    else:
        foot = '<p class="board__foot">Повне меню й актуальні сорти — у барі, запитайте бармена.</p>'
    s = sub1(r'<p class="board__foot">.*?</p>', foot, s)
    if not ig:
        s = must_replace(s, "Програму публікуємо в Instagram щопонеділка.", "Програму оголошуємо заздалегідь.")
        s = must_replace(s, "ми пишемо про це в афіші та Instagram заздалегідь.", "ми пишемо про це в афіші заздалегідь.")
    if not phone:
        s = must_replace(s, " Попередньо можна замовити телефоном.", "")

    # FAQ "more" line
    if phone:
        more = 'Не знайшли відповіді? Подзвоніть: <a href="tel:+%s">%s</a>' % (e164, esc(phone))
        if ig:
            more += ' або напишіть в <a href="%s" target="_blank" rel="noopener">Instagram</a>' % esc(ig)
        more = '<p class="faq__more">%s</p>' % more
    elif ig:
        more = '<p class="faq__more">Не знайшли відповіді? Напишіть нам в <a href="%s" target="_blank" rel="noopener">Instagram</a></p>' % esc(ig)
    elif email:
        more = '<p class="faq__more">Не знайшли відповіді? Напишіть на <a href="mailto:%s">%s</a></p>' % (esc(email), esc(email))
    else:
        more = ""
    s = sub1(r'\s*<p class="faq__more">.*?</p>', ("\n    " + more) if more else "", s)

    # booking form channels
    opts = []
    if email:
        opts.append(("mail", "i-mail", "Email", "листом на пошту"))
    if phone:
        opts.append(("sms", "i-phone", "SMS", "SMS-повідомленням"))
    if ig:
        opts.append(("ig", "i-insta", "Instagram", "в Instagram Direct"))
    attrs = []
    if email:
        attrs.append('data-mail="mailto:%s"' % esc(email))
    if phone:
        attrs.append('data-sms="sms:+%s"' % e164)
    if ig:
        attrs.append('data-ig="%s"' % esc(ig))
    s = sub1(r'data-tg="[^"]*" data-viber="[^"]*" data-mail="[^"]*"', " ".join(attrs), s)
    labels = "\n".join(
        '        <label><input type="radio" name="via" value="%s"%s><span><svg><use href="#%s"/></svg>%s</span></label>'
        % (v, " checked" if i == 0 else "", icon, lab) for i, (v, icon, lab, _) in enumerate(opts))
    s = sub1(r'<div class="via__opts">.*?</div>', '<div class="via__opts">\n%s\n        </div>' % labels, s)
    if len(opts) <= 1:
        s = must_replace(s, '<fieldset class="f f--full via">', '<fieldset class="f f--full via" style="display:none">')
    how = " або ".join(o[3] for o in opts) or "зручним для вас способом"
    s = must_replace(s, "<span>у Telegram, Viber або на пошту</span>", "<span>%s</span>" % how)
    s = must_replace(s, "Заповніть форму — вона відкриє месенджер з уже готовим повідомленням.",
                     "Заповніть форму — вона підготує повідомлення з усіма деталями, залишиться лише надіслати.")
    s = must_replace(s, "Натискаючи, ви відкриваєте месенджер із готовим текстом.",
                     "Натискаючи, ви відкриваєте %s із готовим текстом." % (
                         {"mail": "пошту", "sms": "SMS", "ig": "Instagram"}[opts[0][0]] if len(opts) == 1 else "обраний застосунок"))

    # ---------------- maps ----------------
    q = urllib.parse.quote(lead.get("maps_query") or ("%s, %s" % (address or "", city)).strip(", "))
    s = must_replace(s, "https://www.google.com/maps?q=%s&amp;output=embed" % CITY_ENC,
                     "https://www.google.com/maps?q=%s&amp;output=embed" % q)
    s = s.replace("https://www.google.com/maps?q=%s" % CITY_ENC,
                  "https://www.google.com/maps/dir/?api=1&amp;destination=%s" % q)

    # ---------------- hours ----------------
    if hours:
        rows = []
        for d in (1, 2, 3, 4, 5, 6, 0):
            v = hours.get(str(d))
            if v:
                rows.append('        <li data-dow="%d" data-open="%s" data-close="%s"><span>%s</span><b>%s – %s</b></li>'
                            % (d, v[0], v[1], DAY_NAMES[d], v[0], v[1]))
            else:
                rows.append('        <li data-dow="%d"><span>%s</span><b>вихідний</b></li>' % (d, DAY_NAMES[d]))
        s = sub1(r'(<ul class="hours__list" data-hours>\n).*?(\s*</ul>)', lambda mm: mm.group(1) + "\n".join(rows) + mm.group(2), s)
        s = s.replace("<!-- Edit hours here: data-open / data-close (HH:MM, close after midnight is fine, e.g. 02:00) -->\n", "")
    else:
        # no machine-readable hours: no live status, no fake table
        s = sub1(r'\s*<span class="status" data-status>.*?</span></span></span>', "", s)
        s = sub1(r'\s*<span class="status status--big" data-status>.*?</span></span></span>', "", s)
        s = re.sub(r'\s*<!-- Edit hours here.*?-->', "", s)
        txt = esc(hours_text) if hours_text else '<span class="ph">[ГОДИНИ]</span>'
        s = sub1(r'<ul class="hours__list" data-hours>.*?</ul>', '<p class="hours__text">%s</p>' % txt, s)
    if hours_text:
        s = s.replace('<b class="ph">[ГОДИНИ]</b>', "<b>%s</b>" % esc(hours_text))
        s = s.replace('<span class="ph">[ГОДИНИ]</span>', esc(hours_text))

    # afisha: karaoke flavour + drop events on closed days / outside hours
    if karaoke:
        s = must_replace(s, '<article class="ev" data-type="other"><time>20:00</time><h4>Відкритий мікрофон</h4><p>Стендап, вірші, пісні під гітару — сцена для всіх, хто давно хотів спробувати.</p><button type="button" class="ev__book" data-ev="Відкритий мікрофон">',
                         '<article class="ev" data-type="music"><time>20:00</time><h4>Караоке-вечір</h4><p>Тисячі пісень, нормальний звук і зал, який підспіває навіть найсором’язливішим.</p><button type="button" class="ev__book" data-ev="Караоке-вечір">')
        s = must_replace(s, '<article class="ev" data-type="music"><time>21:00</time><h4>Живий концерт</h4><p>',
                         '<article class="ev" data-type="music"><time>21:00</time><h4>Караоке-ніч</h4><p>Хіти, дуети й пісні, які знає весь зал. ')
        s = s.replace('Рок, блюз, фолк від локальних гуртів. ', '')
        s = must_replace(s, 'data-ev="Живий концерт (п’ятниця)"', 'data-ev="Караоке-ніч (п’ятниця)"')
        s = must_replace(s, '<h4>Кавер-вечірка</h4><p>Хіти, які знає весь зал. Танцювати можна й треба.</p><button type="button" class="ev__book" data-ev="Кавер-вечірка">',
                         '<h4>Караоке-батл</h4><p>Змагання співаків за овації залу й приз від бару. Записуйтесь на місці.</p><button type="button" class="ev__book" data-ev="Караоке-батл">')
    if hours:
        def fix_day(mm):
            dow = int(mm.group(2))
            body = mm.group(3)
            v = hours.get(str(dow))
            head = re.match(r'\s*<h3 class="day__n">.*?</h3>', body, re.S).group(0)
            if not v:
                return mm.group(1) + head + '\n      <p class="day__off">Вихідний</p>\n    ' + mm.group(4)
            o, c = to_min(v[0]), to_min(v[1])
            if c <= o:
                c += 1440
            keep = []
            for ev in re.finditer(r'\s*<article class="ev".*?</article>', body, re.S):
                t = to_min(re.search(r"<time>(\d\d:\d\d)</time>", ev.group(0)).group(1))
                if t < o:
                    t += 1440
                if o <= t <= c - 60:
                    keep.append(ev.group(0))
            if not keep:
                keep = ['\n      <p class="day__off">Без події — просто заходьте</p>']
            return mm.group(1) + head + "".join(keep) + "\n    " + mm.group(4)
        s = sub1(r'(<li class="day" data-dow="(\d)">)(.*?)\s*(</li>)', fix_day, s)

    # ---------------- remaining known tokens ----------------
    s = s.replace("Паб і бар у місті <span class=\"ph\">[МІСТО]</span>.", "%s у %s." % (esc(Kind), esc(city_loc)))
    known = {"[НАЗВА]": N, "[МІСТО]": esc(city)}
    if address:
        known["[АДРЕСА]"] = esc(address)
    if phone:
        known["[ТЕЛЕФОН]"] = esc(phone)
    if email:
        known["[EMAIL]"] = esc(email)
    if handle:
        known["[ІНСТАГРАМ]"] = "@" + esc(handle)
    elif ig:
        known["[ІНСТАГРАМ]"] = ""
    for tok, val in known.items():
        t = re.escape(tok)
        # unwrap marker spans, strip ph class from other tags
        s = re.sub(r'<span class="ph">%s</span>' % t, lambda _m: val, s)
        s = re.sub(r'<(\w+) class="ph">%s</\1>' % t, lambda mm: "<%s>%s</%s>" % (mm.group(1), val, mm.group(1)), s)
        s = s.replace(tok, val)
    s = s.replace("<small></small>", "")

    # ---------------- sanity ----------------
    for bad in ("380000000000", "example.com", "/username", "t.me/", "viber://", "wa.me"):
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

    filled = ["назва", "місто"]
    filled += [lab for cond, lab in ((address, "адреса"), (phone, "телефон"), (email, "email"), (ig, "Instagram"),
                                     (fb, "Facebook"), (hours, "години роботи (з живим статусом «відчинено/зачинено»)"),
                                     (not hours and hours_text, "години роботи (текстом)"), (lead.get("maps_query"), "карта й маршрут"))
               if cond]
    remain = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z' ]+\]", s)))
    readme = """# {name} — демо-сайт

Шаблон: **bar** (бар / паб) від Ansaro.

Заповнено з OpenStreetMap: {filled}.
Viber, Telegram і WhatsApp прибрано (невідомі); форма бронювання надсилає заявку через: {how}.

Ще треба заповнити (позначені бурштиновим підкресленням): {remain}.
Відгуки — приклади (картки з позначкою «Приклад відгуку»), замініть на реальні. Меню, афіша й фото — типові для пабу, уточніть у закладу.
""".format(name=name, filled=", ".join(filled), how=", ".join(o[2] for o in opts) or "—",
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
