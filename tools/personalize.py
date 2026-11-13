#!/usr/bin/env python3
"""Personalize the «Ательє» template for one real lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Writes a complete, self-contained copy of the site into <outdir> with the lead's
known data filled in. Unknown values stay as marked placeholders; contact
channels that are unknown (Viber/WhatsApp/Telegram always, plus email/Instagram/
Facebook/phone when null) are removed. Standard library only.
"""
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
IF_ENC = "%D0%86%D0%B2%D0%B0%D0%BD%D0%BE-%D0%A4%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA"
DAYS_SCHEMA = {"1": "Mo", "2": "Tu", "3": "We", "4": "Th", "5": "Fr", "6": "Sa", "0": "Su"}

ICON_IG = ('<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/>'
           '<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/></svg>')


def esc(v):
    return html.escape(v, quote=True)


def once(s, old, new):
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"template drift: expected 1 match, got {n}: {old[:80]!r}")
    return s.replace(old, new)


def every(s, old, new):
    if old not in s:
        raise SystemExit(f"template drift: no match for {old[:80]!r}")
    return s.replace(old, new)


def drop_line(s, pattern):
    """Remove one whole line matching a regex (line-anchored)."""
    s2, n = re.subn(r"\n[^\n]*" + pattern + r"[^\n]*(?=\n)", "", s, count=1)
    if n != 1:
        raise SystemExit(f"template drift: line not found: {pattern}")
    return s2


def has_cyr(s):
    return bool(re.search(r"[А-Яа-яІіЇїЄєҐґ]", s))


def build(lead, out):
    name = (lead.get("name") or "").strip()
    city = lead.get("city") or "Івано-Франківськ"
    city_loc = lead.get("city_loc") or city
    address = lead.get("address")
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
    maps_q = lead.get("maps_query") or (f"{address}, {city}" if address else city)
    ig_dm = f"https://ig.me/m/{quote(ig_handle)}" if ig_handle else None

    if name:
        q = f"«{name}»" if has_cyr(name) else name
        full = name if "ательє" in name.lower() else f"Ательє {q}"
    else:
        q, full = None, None

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    j = open(os.path.join(ROOT, "js/main.js"), encoding="utf-8").read()

    # ---------- JSON-LD: parse, edit, re-serialize ----------
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    if full:
        ld["name"] = full
    ld["description"] = f"Ремонт, підгонка та індивідуальне пошиття одягу в {city_loc}."
    for k in ("foundingDate", "priceRange"):
        ld.pop(k, None)
    if phone:
        ld["telephone"] = phone
    else:
        ld.pop("telephone", None)
    if email:
        ld["email"] = email
    else:
        ld.pop("email", None)
    ld["address"]["addressLocality"] = city
    if address:
        ld["address"]["streetAddress"] = address
    else:
        ld["address"].pop("streetAddress", None)
    ld["areaServed"] = city
    if hours:
        ld["openingHours"] = [f"{DAYS_SCHEMA[d]} {hours[d][0]}-{hours[d][1]}"
                              for d in ("1", "2", "3", "4", "5", "6", "0") if hours.get(d)]
    else:
        ld.pop("openingHours", None)
    same = [u for u in (ig, fb) if u]
    if same:
        ld["sameAs"] = same
    else:
        ld.pop("sameAs", None)
    ld_txt = "\n" + json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/") + "\n"
    s = s[:m.start(2)] + "@@LDJSON@@" + s[m.end(2):]

    # ---------- head: title & description ----------
    if full:
        s = re.sub(r"<title>.*?</title>", f"<title>{esc(full)} — пошиття і ремонт одягу, {esc(city)}</title>", s, count=1)
    desc = (f"{full or 'Ательє'} в {city_loc}: ремонт і підгонка одягу, підшити штани чи джинси, вкоротити рукави, "
            f"замінити блискавку, індивідуальне пошиття.")
    desc += f" Запис за телефоном {phone}." if phone else " Запис онлайн на сайті."
    s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(desc)}">', s, count=1)

    # ---------- city (template default text is Ivano-Frankivsk) ----------
    s = s.replace("Івано-Франківську", esc(city_loc)).replace("Івано-Франківськ", esc(city))

    # ---------- maps ----------
    s = every(s, IF_ENC, quote(maps_q, safe=""))

    # ---------- footer contact line (before generic tel/email replacement) ----------
    foot_old = ('<p><a href="tel:+380000000000"><span class="ph">[ТЕЛЕФОН]</span></a> · '
                '<a href="mailto:hello@example.com"><span class="ph">[EMAIL]</span></a></p>')
    parts = []
    if phone:
        parts.append(f'<a href="tel:+{esc(e164)}">{esc(phone)}</a>')
    if email:
        parts.append(f'<a href="mailto:{esc(email)}">{esc(email)}</a>')
    if not parts and ig:
        parts.append(f'<a href="{esc(ig)}" target="_blank" rel="noopener">@{esc(ig_handle)}</a>')
    if parts:
        s = once(s, foot_old, "<p>" + " · ".join(parts) + "</p>")
    else:
        s = drop_line(s, re.escape(foot_old))

    # ---------- price-list note ----------
    note = re.search(r'<p class="pricebook__note" id="priceNote">.*?</p>', s, re.S)
    if ig and phone:
        nt = (f'Не знайшли свою річ? Надішліть фото в <a href="{esc(ig_dm)}" target="_blank" rel="noopener">Instagram</a> '
              f'або зателефонуйте: <a href="tel:+{esc(e164)}">{esc(phone)}</a> — орієнтовну ціну скажемо одразу.')
    elif ig:
        nt = (f'Не знайшли свою річ? Надішліть фото в <a href="{esc(ig_dm)}" target="_blank" rel="noopener">Instagram</a> '
              f'— орієнтовну ціну скажемо одразу.')
    elif phone:
        nt = (f'Не знайшли свою річ? Зателефонуйте: <a href="tel:+{esc(e164)}">{esc(phone)}</a> '
              f'— орієнтовну ціну підкажемо одразу.')
    else:
        nt = None
    if nt:
        s = s[:note.start()] + f'<p class="pricebook__note" id="priceNote">{nt}</p>' + s[note.end():]
    else:
        s = drop_line(s, re.escape('<p class="pricebook__note" id="priceNote">'))

    # ---------- contact buttons: drop unknown channels ----------
    s = drop_line(s, re.escape('<a class="cbtn" href="viber://chat?number=%2B380000000000"'))
    s = drop_line(s, re.escape('<a class="cbtn" href="https://t.me/username"'))
    s = drop_line(s, re.escape('<a class="cbtn" href="https://wa.me/380000000000"'))
    if not email:
        s = drop_line(s, re.escape('<a class="cbtn" href="mailto:hello@example.com"'))
    if not fb:
        s = drop_line(s, re.escape('<a class="cbtn" href="https://www.facebook.com/username"'))
    if not ig:
        s = drop_line(s, re.escape('<a class="cbtn" href="https://www.instagram.com/username/"'))

    # ---------- no phone: re-route the call CTAs ----------
    if not phone:
        s = drop_line(s, re.escape('<a class="nav__tel" href="tel:+380000000000">'))
        s = drop_line(s, re.escape('<a class="cbtn cbtn--main" href="tel:+380000000000">'))
        hero_btn = re.search(r'<a class="btn btn--line" href="tel:\+380000000000">.*?</a>', s, re.S)
        mbar_tel = re.search(r'\n  <a href="tel:\+380000000000">.*?</a>', s, re.S)
        if ig:
            s = s[:hero_btn.start()] + f'<a class="btn btn--line" href="{esc(ig_dm)}" target="_blank" rel="noopener">{ICON_IG}Написати в Instagram</a>' + s[hero_btn.end():]
            s = once(s, '<a class="cbtn" href="https://www.instagram.com/username/"', '<a class="cbtn cbtn--main" href="https://www.instagram.com/username/"')
            mbar_tel = re.search(r'\n  <a href="tel:\+380000000000">.*?</a>', s, re.S)
            s = s[:mbar_tel.start()] + f'\n  <a href="{esc(ig_dm)}" target="_blank" rel="noopener">{ICON_IG}Instagram</a>' + s[mbar_tel.end():]
            alt = f'Якщо вікно не відкрилося, напишіть нам в <a href="{esc(ig_dm)}" target="_blank" rel="noopener">Instagram</a>.'
        else:
            s = s[:hero_btn.start()] + s[hero_btn.end():]
            s = s[:mbar_tel.start()] + s[mbar_tel.end():]
            s = once(s, '<nav class="mbar" aria-label="Швидкі дії">', '<nav class="mbar" aria-label="Швидкі дії" style="grid-template-columns:1.3fr 1fr">')
            alt = None
        ok_alt = re.search(r'<span class="form__ok-alt">.*?</a>\.</span>', s, re.S)
        s = s[:ok_alt.start()] + (f'<span class="form__ok-alt">{alt}</span>' if alt else "") + s[ok_alt.end():]
    else:
        s = every(s, "tel:+380000000000", f"tel:+{esc(e164)}")
        s = every(s, '<span class="ph">[ТЕЛЕФОН]</span>', esc(phone))

    # ---------- socials / email values ----------
    if ig:
        s = every(s, "https://www.instagram.com/username/", esc(ig))
        s = every(s, '<span class="ph">[ІНСТАГРАМ]</span>', "@" + esc(ig_handle))
    if fb:
        s = every(s, "https://www.facebook.com/username", esc(fb))
    if email:
        s = every(s, "mailto:hello@example.com", "mailto:" + esc(email))
        s = every(s, '<span class="ph">[EMAIL]</span>', esc(email))

    # ---------- booking form channels ----------
    channels = []
    if phone:
        channels.append(("sms", "SMS", f"SMS на номер {phone}"))
    if ig:
        channels.append(("instagram", "Instagram", "повідомлення в Instagram"))
    if email:
        channels.append(("email", "Email", f"лист на {email}"))
    fs = re.search(r'<fieldset class="field field--full channels">.*?</fieldset>', s, re.S)
    if len(channels) > 1:
        chips = "\n".join(
            f'          <label class="chip"><input type="radio" name="channel" value="{v}"{" checked" if i == 0 else ""}><span>{lbl}</span></label>'
            for i, (v, lbl, _) in enumerate(channels))
        new_fs = ('<fieldset class="field field--full channels">\n          <legend>Куди надіслати заявку</legend>\n'
                  + chips + "\n        </fieldset>")
    elif len(channels) == 1:
        v, _, how = channels[0]
        new_fs = (f'<input type="radio" name="channel" value="{v}" checked hidden>\n'
                  f'        <p class="form__hint">Заявка відкриється як {esc(how)} з готовим текстом.</p>')
    else:
        new_fs = None
    if new_fs:
        s = s[:fs.start()] + new_fs + s[fs.end():]
    else:
        # no way to deliver a request: hide the form, keep the address/hours block
        b = re.search(r'\n    <div class="booking" id="zapys">.*?\n    </div>\n', s, re.S)
        s = s[:b.start()] + "\n" + s[b.end():]
        s = s.replace('href="#zapys"', 'href="#kontakty"')

    links = {
        "telegram": "", "viber": "",
        "email": f"mailto:{email}" if email else "",
        "sms": f"sms:+{e164}" if phone else "",
        "instagram": ig_dm or "",
    }
    lj = ",\n".join(f"    {k}: {json.dumps(v, ensure_ascii=False)}" for k, v in links.items())
    j, n = re.subn(r"var LINKS = \{.*?\n  \};", "var LINKS = {\n" + lj + "\n  };", j, count=1, flags=re.S)
    if n != 1:
        raise SystemExit("template drift: LINKS block")

    # ---------- hours ----------
    hm = re.search(r"""<div class="hours" id="hours" data-hours='[^']*'>""", s)
    if hours:
        data = json.dumps({k: hours.get(k) for k in ("1", "2", "3", "4", "5", "6", "0")}, separators=(",", ":"))
        s = s[:hm.start()] + f"""<div class="hours" id="hours" data-hours='{data}'>""" + s[hm.end():]
    else:
        s = s[:hm.start()] + '<div class="hours" id="hours">' + s[hm.end():]
        s = re.sub(r'<p class="hours__status" id="hoursStatus">.*?</p>', '<p class="hours__status"><span>Графік роботи</span></p>', s, count=1, flags=re.S)
        s = re.sub(r'\n\s*<table class="hours__t">.*?</table>', "", s, count=1, flags=re.S)
    if hours_text:
        s = once(s, '<p class="hours__sum"><span class="ph">[ГОДИНИ]</span></p>', f'<p class="hours__sum">{esc(hours_text)}</p>')

    # ---------- name / city / address tokens ----------
    if full:
        s = s.replace('Ательє <span class="ph">[НАЗВА]</span>', esc(full))
        s = s.replace("Ательє [НАЗВА]", esc(full))
        s = s.replace('<span class="ph">[НАЗВА]</span>', esc(q)).replace("[НАЗВА]", esc(q))
    s = s.replace('<span class="ph">[МІСТО]</span>', esc(city)).replace("[МІСТО]", esc(city))
    if address:
        s = s.replace('<span class="ph">[АДРЕСА]</span>', esc(address)).replace("[АДРЕСА]", esc(address))

    s = s.replace("@@LDJSON@@", ld_txt)

    # ---------- write output ----------
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    for d in ("css", "fonts"):
        shutil.copytree(os.path.join(ROOT, d), os.path.join(out, d))
    os.makedirs(os.path.join(out, "js"))
    os.makedirs(os.path.join(out, "img"))
    shutil.copy2(os.path.join(ROOT, "img/favicon.svg"), os.path.join(out, "img/favicon.svg"))
    shutil.copy2(os.path.join(ROOT, "robots.txt"), os.path.join(out, "robots.txt"))
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(s)
    open(os.path.join(out, "js/main.js"), "w", encoding="utf-8").write(j)

    filled = [("назва", name), ("місто", city), ("адреса", address), ("телефон", phone), ("email", email),
              ("Instagram", ig), ("Facebook", fb), ("графік", hours_text or (hours and "так")), ("точка на карті", maps_q)]
    left = sorted(set(re.findall(r"\[[A-ZА-ЯІЇЄҐ'’ ]+\]", s)))
    readme = [f"# {full or 'Ательє'} — демо-сайт", "",
              "Персоналізована копія шаблону **«Ательє»** (гілка `template/atelie`) для показу клієнту.", "",
              "## Заповнено з OpenStreetMap", ""]
    readme += [f"- {k}: {v}" for k, v in filled if v]
    readme += ["", "Канали, яких немає в даних (Viber, Telegram, WhatsApp" + ("" if email else ", email")
               + ("" if ig else ", Instagram") + ("" if fb else ", Facebook") + ("" if phone else ", телефон")
               + "), прибрано зі сторінки.", "", "## Що ще заповнити", ""]
    readme += [f"- `{t}`" for t in left] or ["- нічого"]
    readme += ["- відгуки-приклади (картки `ph-card`) — замінити на справжні",
               "- фото — бажано замінити на фото ательє (див. README шаблону)", ""]
    open(os.path.join(out, "README.md"), "w", encoding="utf-8").write("\n".join(readme))
    return left


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: personalize.py <lead.json> <outdir>")
    lead = json.load(open(sys.argv[1], encoding="utf-8"))
    left = build(lead, sys.argv[2])
    print("ok", sys.argv[2], "placeholders left:", " ".join(left))


if __name__ == "__main__":
    main()
