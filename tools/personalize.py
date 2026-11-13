#!/usr/bin/env python3
"""Personalize the hrumin-vet template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Lead fields (null = unknown): name, slug, city, city_loc, address, phone, phone_e164,
email, instagram, instagram_handle, facebook, hours {"0".."6": [open, close] | null},
hours_text, hours_osm, maps_query, category ("groom" -> grooming-only copy, no vet claims).
Unknown facts stay as marked placeholders; unknown channels are removed.
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
PHOTO_BASE = "https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/39dee7afb7584197b982eeb8e0e14dfa14f5fc50/img/photos/"


class Doc:
    """Tiny helper: every edit must hit, so template drift fails loudly."""

    def __init__(self, s):
        self.s = s

    def rep(self, old, new, count=1):
        n = self.s.count(old)
        if n != count:
            raise SystemExit(f"personalize: expected {count}x, found {n}x: {old[:90]!r}")
        self.s = self.s.replace(old, new)

    def rep_all(self, old, new):
        if old not in self.s:
            raise SystemExit(f"personalize: not found: {old[:90]!r}")
        self.s = self.s.replace(old, new)

    def drop_line(self, needle):
        lines = self.s.split("\n")
        hit = [i for i, l in enumerate(lines) if needle in l]
        if len(hit) != 1:
            raise SystemExit(f"personalize: drop_line expected 1 line, got {len(hit)}: {needle[:90]!r}")
        del lines[hit[0]]
        self.s = "\n".join(lines)

    def drop_between(self, start, end):
        """Remove from the line containing `start` through the line containing `end` (inclusive)."""
        lines = self.s.split("\n")
        a = [i for i, l in enumerate(lines) if start in l]
        if len(a) != 1:
            raise SystemExit(f"personalize: drop_between start x{len(a)}: {start!r}")
        b = next((i for i in range(a[0], len(lines)) if end in lines[i]), None)
        if b is None:
            raise SystemExit(f"personalize: drop_between end not found: {end!r}")
        del lines[a[0]:b + 1]
        self.s = "\n".join(lines)


def esc(v):
    return html.escape(v, quote=True)


def ph(token):
    return f'<span class="ph">{token}</span>'


def personalize(lead, outdir):
    g = lambda k: (lead.get(k) or None) if not isinstance(lead.get(k), str) else (lead.get(k).strip() or None)
    name, city, city_loc = g("name"), g("city"), g("city_loc")
    address, phone, e164 = g("address"), g("phone"), g("phone_e164")
    email, insta, insta_h, fb = g("email"), g("instagram"), g("instagram_handle"), g("facebook")
    hours, hours_text, hours_osm = lead.get("hours"), g("hours_text"), g("hours_osm")
    maps_q = g("maps_query") or ", ".join(x for x in [address, city] if x) or None
    slug = g("slug") or "lead"
    groom_only = (lead.get("category") or "").lower() == "groom"
    if e164:
        e164 = re.sub(r"\D", "", e164)
    if insta and not insta_h:
        m = re.search(r"instagram\.com/([^/?#]+)", insta)
        insta_h = m.group(1) if m else None
    if not city_loc and city:
        city_loc = city

    d = Doc(open(os.path.join(ROOT, "index.html"), encoding="utf-8").read())

    # ---------- grooming-only copy (the lead is a groomer, not a vet) ----------
    if groom_only:
        d.rep("<title>Грумінг і ветеринарний кабінет [МІСТО] — [НАЗВА] | стрижка собак і котів, ветлікар</title>",
              "<title>[НАЗВА] — грумінг-салон у [МІСТО_LOC] | стрижка й купання собак і котів</title>")
        d.rep('content="Грумінг-салон і ветеринарний кабінет [НАЗВА] у місті [МІСТО]: стрижка й купання собак і котів, тримінг, кігті, вакцинація, чипування, огляд лікаря. Запис онлайн, [ТЕЛЕФОН].">',
              'content="Грумінг-салон [НАЗВА] у [МІСТО_LOC]: стрижка й купання собак і котів, тримінг, експрес-линька, кігті та вуха. Запис онлайн[, ТЕЛ].">')
        d.rep('content="[НАЗВА] — грумінг і ветеринарний кабінет, [МІСТО]">', 'content="[НАЗВА] — грумінг-салон у [МІСТО_LOC]">')
        d.rep("Стрижка, купання й догляд за собаками та котами плюс ветлікар в одному місці.", "Стрижка, купання й догляд за собаками та котами без поспіху й клітки.")
        d.rep_all("<small>грумінг · ветеринар</small>", "<small>грумінг-салон</small>")
        d.rep("<span>Грумінг і ветеринарний кабінет · <span class=\"ph\">[МІСТО]</span></span>", "<span>Грумінг-салон у [МІСТО_LOC]</span>")
        d.rep("<h1>Грумінг і ветлікар в одному місці. <em>Хвостом виляє сам.</em></h1>",
              "<h1>Грумінг, після якого <em>хвостом виляє сам.</em></h1>")
        d.rep("вичісуємо линьку, а за стіною працює ветеринар. Без клітки", "вичісуємо линьку й підстригаємо кігті. Без клітки")
        d.drop_line("<span>Огляд лікаря від ")
        d.drop_between('<label class="toggle">', "</label>")
        # price list: only the grooming panel, no tabs
        d.drop_between('<div class="tabs" role="tablist"', "</div>")
        lines = d.s.split("\n")
        a = next(i for i, l in enumerate(lines) if 'id="panel-vet"' in l)
        b = next(i for i in range(a, len(lines)) if lines[i] == "    </div>")
        del lines[a:b + 1]
        d.s = "\n".join(lines)
        d.rep('<div class="panel" role="tabpanel" id="panel-groom" aria-labelledby="tab-groom">', '<div class="panel">')
        # about
        d.rep(PHOTO_BASE + 'vet-dog.jpg" width="1100" height="1650" alt="Ветеринар обробляє лапу таксі під час прийому"',
              PHOTO_BASE + 'cat-fluffy.jpg" width="1100" height="733" alt="Грумерка підстригає шерсть пухнастому перському коту"')
        d.rep("а якщо під шерстю знайдеться подразнення чи кліщ — лікар огляне одразу, без окремого запису в іншому кінці міста.",
              "а якщо під шерстю знайдеться подразнення чи кліщ, ми одразу покажемо його вам і підкажемо, що робити далі.")
        lines = d.s.split("\n")
        i = next(i for i, l in enumerate(lines) if "<h3>Лікар — за стіною</h3>" in l)
        lines[i] = ('        <li><svg class="ic" aria-hidden="true"><use href="#i-paw"/></svg><div><h3>Цуценята й літні тварини</h3>'
                    "<p>Для малюків — спокійний перший візит-знайомство, для старших — більше пауз і м'який стіл.</p></div></li>")
        d.s = "\n".join(lines)
        d.drop_line("<small>лікар ветеринарної медицини</small>")
        d.rep('<div class="team">', '<div class="team" style="grid-template-columns:1fr">')
        d.rep(" За потреби кличемо лікаря.</p>", "</p>")
        d.drop_line(PHOTO_BASE + "vet-kitten.jpg")
        d.drop_line("<figcaption>Стрижка перського кота</figcaption>")
        d.rep("«Прийшли на тримінг, а грумер помітила почервоніння у вусі. Лікар оглянув одразу, виписав краплі — за тиждень усе минуло. Зручно, що не треба було їхати в іншу клініку».",
              "«Привели цвергшнауцера на тримінг — уперше борода й брови виглядають як на виставкових фото. Грумерка пояснила, як часто приходити і як розчісувати вдома».")
        d.rep("Седацію робимо лише за рішенням лікаря після огляду і ніколи «про всяк випадок».",
              "Якщо тварина дуже напружена, процедуру можна розбити на кілька коротших візитів.")
        d.rep("Якщо кіт дуже агресивний або має сильні колтуни, лікар оцінить, чи потрібна легка седація.",
              "Якщо кіт дуже напружений або має сильні колтуни, чесно скажемо, що можна зробити без стресу для нього.")
        d.drop_line("<summary>Які документи потрібні для вакцинації чи чипування?")
        d.drop_line("<option>Огляд ветеринара</option>")
        d.drop_line("<option>Вакцинація / чипування</option>")
        d.rep("<p>Грумінг-салон і ветеринарний кабінет для собак і котів у місті <span class=\"ph\">[МІСТО]</span>.</p>",
              "<p>Грумінг-салон для собак і котів у [МІСТО_LOC].</p>")
    else:
        d.rep("<title>Грумінг і ветеринарний кабінет [МІСТО] —", "<title>Грумінг і ветеринарний кабінет у [МІСТО_LOC] —")
        d.rep("ветеринарний кабінет [НАЗВА] у місті [МІСТО]:", "ветеринарний кабінет [НАЗВА] у [МІСТО_LOC]:")
        d.rep("Запис онлайн, [ТЕЛЕФОН].\">", "Запис онлайн[, ТЕЛ].\">")
        d.rep('content="[НАЗВА] — грумінг і ветеринарний кабінет, [МІСТО]">', 'content="[НАЗВА] — грумінг і ветеринарний кабінет у [МІСТО_LOC]">')
        d.rep("<span>Грумінг і ветеринарний кабінет · <span class=\"ph\">[МІСТО]</span></span>", "<span>Грумінг і ветеринарний кабінет у [МІСТО_LOC]</span>")
        d.rep("для собак і котів у місті <span class=\"ph\">[МІСТО]</span>.</p>", "для собак і котів у [МІСТО_LOC].</p>")

    # ---------- JSON-LD: rebuilt from known facts only ----------
    ld = {"@context": "https://schema.org", "@type": "LocalBusiness" if groom_only else ["LocalBusiness", "VeterinaryCare"],
          "name": name or "[НАЗВА]",
          "description": ("Грумінг-салон для собак і котів" if groom_only else "Грумінг-салон і ветеринарний кабінет для собак і котів")
                         + (f" у {city_loc}." if city_loc else "."),
          "image": PHOTO_BASE + "hero.jpg"}
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
    services = ["Комплексний грумінг собак", "Грумінг котів", "Тримінг", "Експрес-линька"] + ([] if groom_only else ["Вакцинація та чипування", "Огляд і консультація ветеринара"])
    ld["hasOfferCatalog"] = {"@type": "OfferCatalog", "name": "Послуги грумінгу" if groom_only else "Грумінг і ветеринарні послуги",
                             "itemListElement": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": s}} for s in services]}
    a = d.s.index('<script type="application/ld+json">')
    b = d.s.index("</script>", a)
    d.s = d.s[:a] + '<script type="application/ld+json">\n' + json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/") + "\n" + d.s[b:]

    # ---------- channels ----------
    ig_dm = f"https://ig.me/m/{insta_h}" if insta_h else None
    # contacts: rebuild link grid
    lines = d.s.split("\n")
    a = next(i for i, l in enumerate(lines) if 'class="link link--main"' in l)
    b = next(i for i, l in enumerate(lines) if 'href="mailto:hello@example.com"' in l and 'class="link' in l)
    links = []
    if phone:
        links.append(f'        <a class="link link--main" href="tel:+{e164}"><svg class="ic" aria-hidden="true"><use href="#i-phone"/></svg><span>Подзвонити<small>{esc(phone)}</small></span></a>')
    rest = []
    if fb:
        rest.append(("fb", f'href="{esc(fb)}" target="_blank" rel="noopener"><svg class="ic" aria-hidden="true"><use href="#i-fb"/></svg>Facebook</a>'))
    if email:
        rest.append(("mail", f'href="mailto:{esc(email)}"><svg class="ic" aria-hidden="true"><use href="#i-mail"/></svg><span>{esc(email)}</span></a>'))
    halves = len(rest)
    for k, tail in rest:
        cls = "link" if halves == 2 else "link link--wide"
        links.append(f'        <a class="{cls}" {tail}')
    if insta:
        links.append(f'        <a class="link link--wide" href="{esc(insta)}" target="_blank" rel="noopener"><svg class="ic" aria-hidden="true"><use href="#i-insta"/></svg>Instagram · @{esc(insta_h or "")}</a>')
    lines[a:b + 1] = links
    d.s = "\n".join(lines)
    if not links:
        d.drop_between('<div class="links">', "</div>")

    # header / booking / footer phone
    if phone:
        d.rep_all("tel:+380000000000", f"tel:+{e164}")
        d.rep_all(ph("[ТЕЛЕФОН]"), esc(phone))
        d.rep("Запис онлайн[, ТЕЛ].", f"Запис онлайн, {esc(phone)}.")
    else:
        d.rep("Запис онлайн[, ТЕЛ].", "Запис онлайн.")
        d.drop_line('<a class="top__tel"')
        d.drop_line('<a class="book__call"')
        d.rep('<a href="tel:+380000000000"><svg class="ic" aria-hidden="true"><use href="#i-phone"/></svg>Дзвінок</a>',
              (f'<a href="{esc(insta)}" target="_blank" rel="noopener"><svg class="ic" aria-hidden="true"><use href="#i-insta"/></svg>Instagram</a>') if insta else "")
        if not insta:
            d.rep('<nav class="bar" aria-label="Швидкі дії">', '<nav class="bar" aria-label="Швидкі дії" style="grid-template-columns:1.35fr 1fr">')
    # footer contact line
    foot_bits = []
    if phone:
        foot_bits.append(f'<a href="tel:+{e164}">{esc(phone)}</a>')
    if email:
        foot_bits.append(f'<a href="mailto:{esc(email)}">{esc(email)}</a>')
    if insta:
        foot_bits.append(f'<a href="{esc(insta)}" target="_blank" rel="noopener">@{esc(insta_h or "instagram")}</a>')
    foot_old = f'      <p><a href="tel:+{e164}">{esc(phone)}</a> · <a href="mailto:hello@example.com"><span class="ph">[EMAIL]</span></a></p>' if phone else \
        '      <p><a href="tel:+380000000000"><span class="ph">[ТЕЛЕФОН]</span></a> · <a href="mailto:hello@example.com"><span class="ph">[EMAIL]</span></a></p>'
    d.rep(foot_old, ("      <p>" + " · ".join(foot_bits) + "</p>") if foot_bits else "")

    # booking form channels
    chans = []
    if insta_h:
        chans.append(("instagram", ig_dm, "i-insta", "Instagram"))
    if phone:
        chans.append(("sms", f"sms:+{e164}", "i-sms", "SMS"))
    if email:
        chans.append(("email", f"mailto:{email}", "i-mail", "Пошта"))
    lines = d.s.split("\n")
    a = next(i for i, l in enumerate(lines) if '<fieldset class="channel">' in l)
    b = next(i for i in range(a, len(lines)) if "</fieldset>" in lines[i])
    if chans:
        new = ['      <fieldset class="channel">', "        <legend>Куди надіслати заявку</legend>"]
        for i, (v, href, ic, label) in enumerate(chans):
            new.append(f'        <label class="chip"><input type="radio" name="channel" value="{v}" data-href="{esc(href)}"{" checked" if i == 0 else ""}><span><svg class="ic" aria-hidden="true"><use href="#{ic}"/></svg>{label}</span></label>')
        new.append("      </fieldset>")
    else:
        new = []
    lines[a:b + 1] = new
    d.s = "\n".join(lines)
    d.rep('  <symbol id="i-copy"', '  <symbol id="i-sms" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/></symbol>\n  <symbol id="i-copy"')
    names = {"instagram": "в Instagram", "sms": "через SMS", "email": "на пошту"}
    if chans:
        lst = [names[c[0]] for c in chans]
        where = lst[0] if len(lst) == 1 else ", ".join(lst[:-1]) + " чи " + lst[-1]
        d.rep("і ви надішлете його нам у Telegram, Viber чи на пошту.", f"і ви надішлете його нам {where}.")
        d.rep("Натискаючи кнопку, ви відкриваєте месенджер із готовим текстом.", "Натиснувши кнопку, ви отримаєте готовий текст заявки.")
    else:
        d.rep("ми сформуємо повідомлення, і ви надішлете його нам у Telegram, Viber чи на пошту.", "ми сформуємо готовий текст заявки, який можна скопіювати.")
        d.rep("Натискаючи кнопку, ви відкриваєте месенджер із готовим текстом.", "Натиснувши кнопку, ви отримаєте готовий текст заявки.")
    if phone and insta:
        faq = "Не знайшли відповіді? Подзвоніть або напишіть нам в Instagram — відповімо в робочий час."
    elif phone:
        faq = "Не знайшли відповіді? Подзвоніть нам — відповімо на всі питання."
    elif insta:
        faq = "Не знайшли відповіді? Напишіть нам в Instagram — відповімо в робочий час."
    elif email:
        faq = "Не знайшли відповіді? Напишіть нам на пошту — відповімо в робочий час."
    else:
        faq = "Не знайшли відповіді? Залиште заявку нижче й поставте питання в коментарі."
    d.rep("Не знайшли відповіді? Напишіть нам у Viber чи Telegram — відповімо в робочий час.", faq)

    # ---------- maps ----------
    if maps_q:
        q = urllib.parse.quote(maps_q, safe="")
        d.rep_all(f"maps?q={MAP_SENTINEL}&amp;output=embed", f"maps?q={q}&amp;output=embed")
        d.rep_all(f"destination={MAP_SENTINEL}", f"destination={q}")

    # ---------- hours ----------
    hours_ok = isinstance(hours, dict) and any(hours.get(k) for k, _ in DAYS)
    lines = d.s.split("\n")
    a = next(i for i, l in enumerate(lines) if '<table class="hours__t">' in l)
    b = next(i for i, l in enumerate(lines) if '<p class="hours__note">' in l)
    if hours_ok:
        rows = []
        for k, label in DAYS:
            v = hours.get(k)
            if v and len(v) == 2:
                rows.append(f'            <tr data-day="{k}" data-open="{v[0]}" data-close="{v[1]}"><th scope="row">{label}</th><td>{v[0]} – {v[1]}</td></tr>')
            else:
                rows.append(f'            <tr data-day="{k}" data-open="" data-close=""><th scope="row">{label}</th><td>вихідний</td></tr>')
        lines[a:b + 1] = (['        <table class="hours__t">', '          <caption class="sr">Графік роботи по днях (київський час)</caption>', "          <tbody>"]
                          + rows + ["          </tbody>", "        </table>"])
        d.s = "\n".join(lines)
        summary = esc(hours_text) if hours_text else "див. графік нижче"
        d.rep('<span data-status-text>Графік: <span class="ph">[ГОДИНИ]</span></span>', f"<span data-status-text>Графік: {summary}</span>")
        d.rep('<span data-status-text><span class="ph">[ГОДИНИ]</span></span>', f"<span data-status-text>{summary}</span>")
    else:
        txt = esc(hours_text) if hours_text else ph("[ГОДИНИ]")
        lines[a:b + 1] = [f'        <p class="hours__text">{txt}</p>']
        d.s = "\n".join(lines)
        # no live open/closed status: it would present defaults as fact
        d.rep('      <p class="status status--lg hero__status" data-status><i></i><span data-status-text>Графік: <span class="ph">[ГОДИНИ]</span></span></p>',
              f'      <p class="hero__status hero__hours"><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg>Графік: {txt}</p>')
        d.rep('<span class="status status--lg" data-status><i></i><span data-status-text><span class="ph">[ГОДИНИ]</span></span></span>', "")

    # ---------- plain token replacements ----------
    city_txt = esc(city) if city else ph("[МІСТО]")
    loc_txt = esc(city_loc) if city_loc else ph("[МІСТО]")
    d.rep_all("[МІСТО_LOC]", loc_txt)
    d.s = re.sub(r"(\b[вуВУ] )" + re.escape(ph("[МІСТО]")), lambda m: m.group(1) + loc_txt, d.s)
    d.s = re.sub(r"(\b[вуВУ] )\[МІСТО\]", lambda m: m.group(1) + loc_txt, d.s)
    if city:
        d.s = d.s.replace(ph("[МІСТО]"), city_txt).replace("[МІСТО]", city_txt)
    if address:
        d.s = d.s.replace(ph("[АДРЕСА]") + ", ", esc(address) + ", ")
    else:
        d.s = d.s.replace(ph("[АДРЕСА]") + ", ", "")
    if name:
        # attribute contexts first (no span inside attributes)
        d.s = d.s.replace(ph("[НАЗВА]"), esc(name)).replace("[НАЗВА]", esc(name))
    if hours_text:
        d.s = d.s.replace(ph("[ГОДИНИ]"), esc(hours_text))
    d.s = d.s.replace("https://raw.githack.com/furtex-xq/furtex-xq.github.io/template/hrumin-vet/index.html",
                      f"https://raw.githack.com/furtex-xq/furtex-xq.github.io/beta/{slug}/index.html")
    # leftovers that are never valid in a personalized copy
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
    readme = [f"# {name or '[НАЗВА]'} — демо-сайт", "",
              f"Шаблон: `hrumin-vet` ({'грумінг-салон, без ветеринарних послуг' if groom_only else 'грумінг і ветеринарний кабінет'}).", "",
              "З OpenStreetMap підставлено: " + (", ".join(filled) if filled else "нічого") + ".", "",
              "Прибрано кнопки й канали, яких у закладу немає (Viber, Telegram, WhatsApp"
              + ("" if email else ", пошта") + ("" if fb else ", Facebook") + ("" if insta else ", Instagram") + ("" if phone else ", телефон") + ").", "",
              "Ще треба заповнити (позначені жовтим пунктиром):", ""]
    readme += [f"- `{t}`" for t in left] + ["- відгуки-приклади (картки з позначкою «Приклад відгуку»)",
                                            "- фото: зараз стокові з Unsplash — краще замінити на фото салону"]
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
