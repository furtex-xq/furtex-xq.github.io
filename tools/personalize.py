#!/usr/bin/env python3
"""Personalize the zoomahazyn (pet shop) template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Lead fields (null = unknown): name, slug, city, city_loc, address, phone, phone_e164,
email, instagram, instagram_handle, facebook, hours {"0".."6": [open, close] | null},
hours_text, hours_osm, maps_query.
Known facts replace tokens (placeholder marking dropped); unknown facts stay as marked
placeholders; unknown channels (and Viber/Telegram/WhatsApp, never known) are removed.
Standard library only.
"""
import html
import json
import os
import re
import shutil
import sys
import urllib.parse

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SITE_FILES = ["index.html", "robots.txt", "css", "js", "fonts", "img/favicon.svg"]
DAYS = [("1", "Понеділок"), ("2", "Вівторок"), ("3", "Середа"), ("4", "Четвер"),
        ("5", "П'ятниця"), ("6", "Субота"), ("0", "Неділя")]
MAP_SENTINEL = "%D0%86%D0%B2%D0%B0%D0%BD%D0%BE-%D0%A4%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA"
PHOTO = "https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/a3313a0083f4f57790d13b70938fa0468a5757f2/img/photos/hero.jpg"
TEMPLATE_URL = "https://raw.githack.com/furtex-xq/furtex-xq.github.io/template/zoomahazyn/index.html"


class Doc:
    """Every edit must hit, so template drift fails loudly."""

    def __init__(self, s):
        self.s = s

    def rep(self, old, new, count=1):
        n = self.s.count(old)
        if n != count:
            raise SystemExit(f"personalize: expected {count}x, found {n}x: {old[:100]!r}")
        self.s = self.s.replace(old, new)

    def rep_all(self, old, new):
        if old not in self.s:
            raise SystemExit(f"personalize: not found: {old[:100]!r}")
        self.s = self.s.replace(old, new)

    def line(self, needle, new=None):
        """Replace (or drop when new is None) the single line containing needle."""
        lines = self.s.split("\n")
        hit = [i for i, l in enumerate(lines) if needle in l]
        if len(hit) != 1:
            raise SystemExit(f"personalize: line expected 1, got {len(hit)}: {needle[:100]!r}")
        if new is None:
            del lines[hit[0]]
        else:
            lines[hit[0]] = new
        self.s = "\n".join(lines)

    def block(self, start, end, new_lines):
        """Replace from the line containing start through the next line containing end."""
        lines = self.s.split("\n")
        a = [i for i, l in enumerate(lines) if start in l]
        if len(a) != 1:
            raise SystemExit(f"personalize: block start x{len(a)}: {start!r}")
        b = next((i for i in range(a[0], len(lines)) if end in lines[i]), None)
        if b is None:
            raise SystemExit(f"personalize: block end not found: {end!r}")
        lines[a[0]:b + 1] = new_lines
        self.s = "\n".join(lines)


def esc(v):
    return html.escape(v, quote=True)


def ph(token):
    return f'<span class="ph">{token}</span>'


def icon(name):
    return f'<svg class="ic" aria-hidden="true"><use href="#{name}"/></svg>'


def personalize(lead, outdir):
    def g(k):
        v = lead.get(k)
        if isinstance(v, str):
            v = v.strip()
        return v or None

    name, city, city_loc = g("name"), g("city"), g("city_loc")
    address, phone, e164 = g("address"), g("phone"), g("phone_e164")
    email, insta, insta_h, fb = g("email"), g("instagram"), g("instagram_handle"), g("facebook")
    hours, hours_text, hours_osm = lead.get("hours"), g("hours_text"), g("hours_osm")
    maps_q = g("maps_query") or ", ".join(x for x in [address, city] if x) or None
    slug = g("slug") or "lead"
    if e164:
        e164 = re.sub(r"\D", "", e164)
    if phone and not e164:
        e164 = re.sub(r"\D", "", phone)
    if insta and not insta_h:
        m = re.search(r"instagram\.com/([^/?#]+)", insta)
        insta_h = m.group(1) if m else None
    if insta_h and not insta:
        insta = f"https://www.instagram.com/{insta_h}/"
    if city and not city_loc:
        city_loc = city
    tel = f"tel:+{e164}" if phone else None
    ig_dm = f"https://ig.me/m/{insta_h}" if insta_h else None

    d = Doc(open(os.path.join(ROOT, "index.html"), encoding="utf-8").read())

    # ---------- JSON-LD: rebuilt from known facts only ----------
    ld = {"@context": "https://schema.org", "@type": "PetStore", "name": name or "[НАЗВА]",
          "description": "Зоомагазин: корм і товари для собак, котів, гризунів, птахів і акваріумних рибок"
                         + (f" у {city_loc}." if city_loc else "."),
          "image": PHOTO}
    if phone:
        ld["telephone"] = phone
    if email:
        ld["email"] = email
    addr = {"@type": "PostalAddress", "addressCountry": "UA"}
    if address:
        addr["streetAddress"] = address
    if city:
        addr["addressLocality"] = city
    ld["address"] = addr
    if hours_osm or hours_text:
        ld["openingHours"] = hours_osm or hours_text
    same = [u for u in [insta, fb] if u]
    if same:
        ld["sameAs"] = same
    a = d.s.index('<script type="application/ld+json">')
    b = d.s.index("</script>", a)
    d.s = d.s[:a] + '<script type="application/ld+json">\n' + json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/") + "\n" + d.s[b:]

    # ---------- contacts: channel buttons ----------
    for ch in ["viber", "telegram", "whatsapp"]:
        d.line(f'data-ch="{ch}"')
    if phone:
        d.rep('<a class="chan chan--main" data-ch="phone" href="tel:+380000000000">', f'<a class="chan chan--main" data-ch="phone" href="{tel}">')
    else:
        d.line('data-ch="phone"')
    if insta:
        d.rep('data-ch="instagram" href="https://www.instagram.com/username/"', f'data-ch="instagram" href="{esc(insta)}"')
    else:
        d.line('data-ch="instagram"')
    if fb:
        d.rep('data-ch="facebook" href="https://www.facebook.com/username"', f'data-ch="facebook" href="{esc(fb)}"')
    else:
        d.line('data-ch="facebook"')
    if email:
        d.rep(f'data-ch="email" href="mailto:hello@example.com">{icon("i-mail")}{ph("[EMAIL]")}</a>',
              f'data-ch="email" href="mailto:{esc(email)}">{icon("i-mail")}{esc(email)}</a>')
    else:
        d.line('data-ch="email"')
    if not (phone or insta or fb or email):
        d.block('<div class="chans" data-chans>', "</div>", [])

    # ---------- calls to action that used the phone ----------
    if phone:
        d.rep_all("tel:+380000000000", tel)
        d.rep_all(ph("[ТЕЛЕФОН]"), esc(phone))
    else:
        d.line('<a class="top__tel"')
        alt_hero = (f'        <a class="btn btn--main" href="{esc(insta)}" target="_blank" rel="noopener">{icon("i-insta")}Написати в Instagram</a>' if insta
                    else f'        <a class="btn btn--main" href="#order">{icon("i-bag")}Залишити заявку</a>')
        d.line('Подзвонити й замовити</a>', alt_hero)
        d.line('Спитати телефоном</a>', (f'        <a class="btn btn--light" href="{esc(insta)}" target="_blank" rel="noopener">{icon("i-insta")}Спитати в Instagram</a>') if insta else None)
        if insta:
            d.line('data-call>' + icon("i-phone") + "Дзвінок</a>",
                   f'  <a href="{esc(insta)}" target="_blank" rel="noopener">{icon("i-insta")}Instagram</a>')
        else:
            d.line('data-call>' + icon("i-phone") + "Дзвінок</a>", None)
            d.rep('<nav class="bar" aria-label="Швидкі дії">', '<nav class="bar" aria-label="Швидкі дії" style="grid-template-columns:1.35fr 1fr">')
        d.rep("<h2 id=\"contacts-h\">Приходьте або замовляйте телефоном</h2>", "<h2 id=\"contacts-h\">Приходьте або замовляйте онлайн</h2>")
        d.rep("<p>Подзвоніть перед виходом — зберемо замовлення,", "<p>Залиште заявку перед виходом — зберемо замовлення,")
        d.rep("<h3>Подзвоніть або напишіть</h3>", "<h3>Залиште заявку</h3>")
        d.rep("Скажіть, що потрібно, або надішліть фото упаковки, яку берете зазвичай.", "Напишіть, що потрібно, або назвіть корм, який берете зазвичай.")

    # footer contact line
    bits = []
    if phone:
        bits.append(f'<a href="{tel}">{esc(phone)}</a>')
    if email:
        bits.append(f'<a href="mailto:{esc(email)}">{esc(email)}</a>')
    if insta:
        bits.append(f'<a href="{esc(insta)}" target="_blank" rel="noopener">@{esc(insta_h)}</a>')
    if not bits and fb:
        bits.append(f'<a href="{esc(fb)}" target="_blank" rel="noopener">Facebook</a>')
    d.line("<p data-foot-contacts>", ("      <p data-foot-contacts>" + " · ".join(bits) + "</p>") if bits else None)

    # prices note & FAQ line
    if phone and insta:
        where = "скажемо по телефону або в Instagram."
        faq = "Не знайшли відповіді? Подзвоніть або напишіть нам в Instagram — відповімо в робочий час."
    elif phone:
        where = "скажемо по телефону."
        faq = "Не знайшли відповіді? Подзвоніть нам — відповімо на всі питання в робочий час."
    elif insta:
        where = "скажемо в Instagram."
        faq = "Не знайшли відповіді? Напишіть нам в Instagram — відповімо в робочий час."
    elif fb:
        where = "підкажемо у Facebook або в магазині."
        faq = "Не знайшли відповіді? Напишіть нам у Facebook або залиште заявку нижче."
    else:
        where = "підкажемо в магазині."
        faq = "Не знайшли відповіді? Залиште заявку нижче й поставте питання в коментарі."
    d.rep("скажемо по телефону або в Instagram.</p>", where + "</p>")
    d.rep("Не знайшли відповіді? Подзвоніть або напишіть нам — відповімо в робочий час.", faq)

    # ---------- order form channels ----------
    chans = []
    if insta_h:
        chans.append(("instagram", ig_dm, "i-insta", "Instagram"))
    if phone:
        chans.append(("sms", f"sms:+{e164}", "i-sms", "SMS"))
    if email:
        chans.append(("email", f"mailto:{email}", "i-mail", "Пошта"))
    if fb and not insta_h:
        chans.append(("facebook", fb, "i-fb", "Facebook"))
    if chans:
        new = ['      <fieldset class="channel" data-channels>', "        <legend>Куди надіслати заявку</legend>"]
        for i, (v, href, ic, label) in enumerate(chans):
            new.append(f'        <label class="chip"><input type="radio" name="channel" value="{v}" data-href="{esc(href)}"{" checked" if i == 0 else ""}><span>{icon(ic)}{label}</span></label>')
        new.append("      </fieldset>")
    else:
        new = []
    d.block('<fieldset class="channel" data-channels>', "</fieldset>", new)
    copiers = [c[3] for c in chans if c[0] in ("instagram", "facebook")]
    if copiers:
        d.line('<p class="order__fine">', f'      <p class="order__fine">Для {copiers[0]} текст заявки копіюється автоматично — просто вставте його в чат.</p>')
    else:
        d.line('<p class="order__fine">', None)
    if not chans:
        d.rep("ми сформуємо готове повідомлення, і ви надішлете його нам у зручний спосіб.", "ми сформуємо готовий текст заявки, який можна скопіювати й надіслати нам.")
        d.rep(f"{icon('i-send')}Надіслати заявку</button>", f"{icon('i-check')}Сформувати заявку</button>")

    # ---------- maps ----------
    if maps_q:
        q = urllib.parse.quote(maps_q, safe="")
        d.rep(f"maps?q={MAP_SENTINEL}&amp;output=embed", f"maps?q={q}&amp;output=embed")
        d.rep_all(f"destination={MAP_SENTINEL}", f"destination={q}")

    # ---------- hours ----------
    hours_ok = isinstance(hours, dict) and any(hours.get(k) for k, _ in DAYS)
    if hours_ok:
        rows = []
        for k, label in DAYS:
            v = hours.get(k)
            if v and len(v) == 2:
                rows.append(f'            <tr data-day="{k}" data-open="{v[0]}" data-close="{v[1]}"><th scope="row">{label}</th><td>{v[0]} – {v[1]}</td></tr>')
            else:
                rows.append(f'            <tr data-day="{k}" data-open="" data-close=""><th scope="row">{label}</th><td>вихідний</td></tr>')
        d.block('<table class="hours__t" data-hours>', '<p class="hours__note ph-note">',
                ['        <table class="hours__t" data-hours>', '          <caption class="sr">Графік роботи по днях (київський час)</caption>', "          <tbody>"]
                + rows + ["          </tbody>", "        </table>"])
        summary = esc(hours_text) if hours_text else "див. графік роботи"
        d.rep(f'<span data-status-text>Графік: {ph("[ГОДИНИ]")}</span>', f"<span data-status-text>Графік: {summary}</span>")
        d.rep(f'<span data-status-text>{ph("[ГОДИНИ]")}</span>', f"<span data-status-text>{summary}</span>")
    else:
        txt = esc(hours_text) if hours_text else ph("[ГОДИНИ]")
        d.block('<table class="hours__t" data-hours>', '<p class="hours__note ph-note">', [f'        <p class="hours__text">{txt}</p>'])
        # no live open/closed status: it would present defaults as fact
        d.line('<p class="status hero__status" data-status>', f'      <p class="hero__hours">{icon("i-clock")}Графік: {txt}</p>')
        d.line('<span class="status" data-status>', None)

    # ---------- plain tokens ----------
    city_txt = esc(city) if city else ph("[МІСТО]")
    loc_txt = esc(city_loc) if city_loc else ph("[МІСТО]")
    d.s = re.sub(r"(\b[вуВУ] )" + re.escape(ph("[МІСТО]")), lambda m: m.group(1) + loc_txt, d.s)
    d.s = re.sub(r"(\b[вуВУ] )\[МІСТО\]", lambda m: m.group(1) + loc_txt, d.s)
    if city:
        d.s = d.s.replace(ph("[МІСТО]"), city_txt).replace("[МІСТО]", city_txt)
    if address:
        d.s = d.s.replace(ph("[АДРЕСА]"), esc(address))
    if name:
        d.s = d.s.replace(ph("[НАЗВА]"), esc(name)).replace("[НАЗВА]", esc(name))
    d.s = d.s.replace(TEMPLATE_URL, f"https://raw.githack.com/furtex-xq/furtex-xq.github.io/beta/{slug}/index.html")
    for bad in ["380000000000", "example.com", "/username"]:
        if bad in d.s:
            raise SystemExit(f"personalize: sentinel left in index.html: {bad}")

    # ---------- write ----------
    if os.path.exists(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    for rel in SITE_FILES:
        src, dst = os.path.join(ROOT, rel), os.path.join(outdir, rel)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
    with open(os.path.join(outdir, "index.html"), "w", encoding="utf-8") as f:
        f.write(d.s)

    left = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z'’ ]+\]", d.s)))
    filled = [lbl for lbl, v in [("назва", name), ("місто", city), ("адреса", address), ("телефон", phone), ("email", email),
                                 ("Instagram", insta), ("Facebook", fb), ("графік роботи", hours_ok or hours_text), ("точка на карті", maps_q)] if v]
    removed = ["Viber", "Telegram", "WhatsApp"] + [n for n, v in [("пошта", email), ("Facebook", fb), ("Instagram", insta), ("телефон", phone)] if not v]
    readme = [f"# {name or '[НАЗВА]'} — демо-сайт", "",
              "Шаблон: `zoomahazyn` (зоомагазин, калькулятор корму).", "",
              "З OpenStreetMap підставлено: " + (", ".join(filled) if filled else "нічого") + ".", "",
              "Прибрано кнопки й канали, яких у магазину немає: " + ", ".join(removed) + ".", "",
              "Ще треба заповнити (позначені жовтим пунктиром):", ""]
    readme += [f"- `{t}`" for t in left] + ["- відгуки-приклади (картки з позначкою «Приклад відгуку»)",
                                            "- фото: зараз стокові з Unsplash — краще замінити на фото магазину й полиць"]
    with open(os.path.join(outdir, "README.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(readme) + "\n")
    return left


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    lead = json.load(open(sys.argv[1], encoding="utf-8"))
    if isinstance(lead, list):
        raise SystemExit("personalize: pass a single lead object, not a list")
    left = personalize(lead, sys.argv[2])
    print("ok", sys.argv[2], "remaining:", " ".join(left))
