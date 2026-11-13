#!/usr/bin/env python3
"""Personalize the travel-agency template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

<lead.json> may hold one lead object or a list (then every lead is written to <outdir>/<slug>/).
Standard library only. The template working tree is never modified.
"""
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY = ["index.html", "css", "js", "fonts", "img/favicon.svg", "robots.txt"]
CITY_ENC = quote("Івано-Франківськ")
DAYS = [("1", "Понеділок"), ("2", "Вівторок"), ("3", "Середа"), ("4", "Четвер"),
        ("5", "П’ятниця"), ("6", "Субота"), ("0", "Неділя")]
OSM_DAYS = {"1": "Monday", "2": "Tuesday", "3": "Wednesday", "4": "Thursday", "5": "Friday", "6": "Saturday", "0": "Sunday"}


def esc(s):
    return html.escape(s, quote=True)


class Page:
    def __init__(self, text):
        self.t = text

    def sub(self, old, new, count=None, must=True):
        n = self.t.count(old)
        if must and n == 0:
            raise SystemExit("template changed, not found: " + old[:90])
        if count is not None and n != count:
            raise SystemExit("expected %d× but found %d×: %s" % (count, n, old[:90]))
        self.t = self.t.replace(old, new)

    def drop_line(self, marker):
        lines = self.t.split("\n")
        keep = [l for l in lines if marker not in l]
        if len(keep) == len(lines):
            raise SystemExit("template changed, line not found: " + marker[:90])
        self.t = "\n".join(keep)

    def token(self, tok, value):
        """Known value: unwrap the .ph span and replace bare occurrences (attributes, head, svg)."""
        v = esc(value)
        self.t = self.t.replace('<span class="ph">%s</span>' % tok, v)
        self.t = self.t.replace(tok, v)


def ig_handle(lead):
    if lead.get("instagram_handle"):
        return lead["instagram_handle"].lstrip("@")
    if lead.get("instagram"):
        m = re.search(r"instagram\.com/([^/?#]+)", lead["instagram"])
        if m:
            return m.group(1)
    return None


def hours_table(hours):
    rows = []
    for d, label in DAYS:
        v = hours.get(d)
        val = "%s–%s" % (v[0], v[1]) if v else "вихідний"
        rows.append('            <tr data-day="%s"><th scope="row">%s</th><td>%s</td></tr>' % (d, label, val))
    return "\n".join(rows)


def build_jsonld(lead, hours):
    d = {
        "@context": "https://schema.org",
        "@type": "TravelAgency",
        "name": lead["name"],
        "description": "Туристична агенція в %s: пакетні тури, авіаквитки, бронювання готелів, страхування та візова підтримка." % lead["city_loc"],
        "image": None,
        "address": {"@type": "PostalAddress", "addressLocality": lead["city"], "addressCountry": "UA"},
        "areaServed": lead["city"],
    }
    if lead.get("address"):
        d["address"]["streetAddress"] = lead["address"]
    if lead.get("phone"):
        d["telephone"] = lead["phone"]
    if lead.get("email"):
        d["email"] = lead["email"]
    if hours:
        spec = []
        for k, v in hours.items():
            if v:
                spec.append({"@type": "OpeningHoursSpecification", "dayOfWeek": OSM_DAYS[k], "opens": v[0], "closes": v[1]})
        if spec:
            d["openingHoursSpecification"] = spec
    same = [u for u in (lead.get("instagram"), lead.get("facebook")) if u]
    if same:
        d["sameAs"] = same
    return d


def personalize(lead, outdir):
    src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    p = Page(src)
    name, city, city_loc = lead["name"], lead.get("city") or "Івано-Франківськ", lead.get("city_loc") or "Івано-Франківську"
    lead = dict(lead, city=city, city_loc=city_loc)
    phone, email, ig, fb = lead.get("phone"), lead.get("email"), lead.get("instagram"), lead.get("facebook")
    hours, hours_text = lead.get("hours"), lead.get("hours_text")
    handle = ig_handle(lead)
    maps_q = quote(lead.get("maps_query") or ("%s, %s" % (lead.get("address") or "", city)).strip(", "))

    # ---------- head ----------
    p.sub("<title>Туристична агенція [МІСТО] — ", "<title>Туристична агенція в %s — " % esc(city_loc), 1)
    p.drop_line('<link rel="canonical" href="https://example.com/">')
    m = re.search(r'<script type="application/ld\+json">\n(.*?)\n</script>', p.t, re.S)
    old = json.loads(m.group(1))
    ld = build_jsonld(lead, hours)
    ld["image"] = old["image"]
    p.t = p.t[:m.start(1)] + json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/") + p.t[m.end(1):]

    # ---------- postmark ring text ----------
    ring = "%s · %s · " % (name.upper(), city.upper())
    if len(ring) > 36:
        ring = "%s · ТУРИ · " % name.upper()
    p.sub('<textPath href="#pm-c">[НАЗВА] · ТУРИ З ТУРБОТОЮ · [МІСТО] ·</textPath>',
          '<textPath href="#pm-c" textLength="346" lengthAdjust="spacing">%s</textPath>' % esc(ring), 1)

    # ---------- about tag ----------
    if lead.get("address"):
        p.sub('Офіс у центрі: <span class="ph">[АДРЕСА]</span>', 'Наш офіс: <span class="ph">[АДРЕСА]</span>', 1)

    # ---------- phone ----------
    if phone:
        p.sub("tel:+380000000000", "tel:+" + lead["phone_e164"])
    else:
        p.drop_line('<a class="nav__call" href="tel:+380000000000">')
        p.drop_line('<span class="clist__k">Телефон</span>')
        p.drop_line('<p><a href="tel:+380000000000"><span class="ph">[ТЕЛЕФОН]</span></a></p>')
        p.drop_line('<a class="soc" href="tel:+380000000000">')
        alt_href, alt_attr, alt_label, alt_icon = ("#zaiavka", "", "Залишити заявку", "i-send")
        if ig:
            alt_href, alt_attr, alt_label, alt_icon = (esc(ig), ' target="_blank" rel="noopener"', "Написати в Instagram", "i-ig")
        p.sub('<a class="btn btn--ghost" href="tel:+380000000000"><svg class="ic"><use href="#i-phone"/></svg>Зателефонувати</a>',
              '<a class="btn btn--ghost" href="%s"%s><svg class="ic"><use href="#%s"/></svg>%s</a>' % (alt_href, alt_attr, alt_icon, alt_label), 1)
        p.sub('<a href="tel:+380000000000"><svg class="ic"><use href="#i-phone"/></svg>Дзвінок</a>',
              '<a href="%s"%s><svg class="ic"><use href="#%s"/></svg>%s</a>' % (alt_href, alt_attr, alt_icon, "Instagram" if ig else "Заявка"), 1)

    # ---------- messengers that no lead has ----------
    for mk in ('<a class="soc" href="viber://', '<a class="soc" href="https://t.me/username"', '<a class="soc" href="https://wa.me/'):
        p.drop_line(mk)

    # ---------- email / instagram / facebook ----------
    if email:
        p.sub("mailto:hello@example.com", "mailto:" + esc(email))
    else:
        p.drop_line('<span class="clist__k">Пошта</span>')
        p.drop_line('<a class="soc" href="mailto:hello@example.com">')
    if ig:
        p.sub("https://www.instagram.com/username/", esc(ig))
    else:
        p.drop_line('<span class="clist__k">Instagram</span>')
        p.drop_line('<a class="soc" href="https://www.instagram.com/username/"')
    if fb:
        p.sub("https://www.facebook.com/username", esc(fb))
    else:
        p.drop_line('<a class="soc" href="https://www.facebook.com/username"')
    if handle:
        p.token("[ІНСТАГРАМ]", handle)
    elif ig:
        p.sub('@<span class="ph">[ІНСТАГРАМ]</span>', "Instagram", 1)

    # ---------- request form channels ----------
    # SMS only to Ukrainian mobile numbers (landlines like +380 34… can't receive it)
    mobile = bool(phone and re.match(r"380(39|50|63|66|67|68|73|91|92|93|94|95|96|97|98|99)\d{7}$", lead.get("phone_e164") or ""))
    channels = []
    if mobile:
        channels.append(("sms", "SMS"))
    if email:
        channels.append(("email", "Email"))
    if not channels and ig:
        channels.append(("instagram", "Instagram"))
    if not channels and phone:
        channels.append(("call", "дзвінок"))
    attrs = ['data-channel="%s"' % (channels[0][0] if channels else "none")]
    if mobile:
        attrs.append('data-sms="sms:+%s"' % lead["phone_e164"])
    if phone:
        attrs.append('data-tel="tel:+%s"' % lead["phone_e164"])
    if email:
        attrs.append('data-mail="mailto:%s"' % esc(email))
    if ig:
        attrs.append('data-ig="%s"' % esc(ig))
    p.t = re.sub(r'(<form class="form" id="zaiavka" novalidate) data-tg="[^"]*" data-viber="[^"]*" data-mail="[^"]*">',
                 lambda mm: mm.group(1) + " " + " ".join(attrs) + ">", p.t, count=1)
    if channels and channels[0][0] == "call":
        p.sub('Надіслати заявку<svg class="ic"><use href="#i-send"/></svg>', 'Зателефонувати із заявкою<svg class="ic"><use href="#i-phone"/></svg>', 1)
    fs = re.search(r'\n\s*<fieldset class="field channel">.*?</fieldset>', p.t, re.S)
    if len(channels) >= 2:
        chips = "\n".join('          <label class="chip chip--sm"><input type="radio" name="channel" value="%s"%s><span>%s</span></label>'
                          % (v, " checked" if i == 0 else "", lab) for i, (v, lab) in enumerate(channels))
        new = '\n        <fieldset class="field channel">\n          <legend>Куди надіслати заявку</legend>\n%s\n        </fieldset>' % chips
        p.t = p.t[:fs.start()] + new + p.t[fs.end():]
    else:
        p.t = p.t[:fs.start()] + p.t[fs.end():]
    p.sub("Не знайшли відповіді? Напишіть нам у Telegram чи Viber — відповімо протягом години в робочий час.",
          ("Не знайшли відповіді? Зателефонуйте або залиште заявку — відповімо протягом години в робочий час." if phone
           else "Не знайшли відповіді? Залиште заявку — відповімо протягом години в робочий час."), 1)

    # ---------- maps ----------
    p.sub("https://www.google.com/maps?q=%s&amp;output=embed" % CITY_ENC, "https://www.google.com/maps?q=%s&amp;output=embed" % maps_q, 1)
    p.sub("https://www.google.com/maps/dir/?api=1&amp;destination=%s" % CITY_ENC,
          "https://www.google.com/maps/dir/?api=1&amp;destination=%s" % maps_q, 2)

    # ---------- hours ----------
    tb = re.search(r"(<tbody>\n)(.*?)(\n\s*</tbody>)", p.t, re.S)
    if hours:
        full = {d: hours.get(d) for d, _ in DAYS}
        p.t = p.t[:tb.start(2)] + hours_table(full) + p.t[tb.end(2):]
        p.t = re.sub(r"data-hours='[^']*'", "data-hours='%s'" % json.dumps(full, separators=(",", ":")), p.t, count=1)
        # the table below shows the exact schedule, the head is just a label + live status
        p.sub('<span>Графік: <span class="ph">[ГОДИНИ]</span></span>', "<span>Графік роботи</span>", 1)
    else:
        # no machine-readable schedule: no live status, no default table
        p.t = re.sub(r"\n\s*<table class=\"hours__table\">.*?</table>", "", p.t, count=1, flags=re.S)
        p.drop_line('<span class="status" id="status" hidden></span>')
        p.t = re.sub(r" data-hours='[^']*'", "", p.t, count=1)
        if hours_text:
            p.token("[ГОДИНИ]", hours_text)

    # ---------- [МІСТО] grammar, then plain tokens ----------
    p.t = re.sub(r"(\b[вуВУ]) (<span class=\"ph\">)?\[МІСТО\](</span>)?", lambda mm: mm.group(1) + " " + esc(city_loc), p.t)
    p.sub('<span class="ph">[МІСТО]</span>', '<span class="nw">%s</span>' % esc(city))
    p.token("[МІСТО]", city)
    p.token("[НАЗВА]", name)
    if lead.get("address"):
        p.token("[АДРЕСА]", lead["address"])
    if phone:
        p.token("[ТЕЛЕФОН]", phone)
    if email:
        p.token("[EMAIL]", email)

    # ---------- write ----------
    if os.path.exists(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    for item in COPY:
        s, d = os.path.join(ROOT, item), os.path.join(outdir, item)
        os.makedirs(os.path.dirname(d), exist_ok=True)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)
    with open(os.path.join(outdir, "index.html"), "w", encoding="utf-8") as f:
        f.write(p.t)

    left = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z'’]+\]", p.t)))
    filled = ["назва", "місто"]
    if lead.get("address"): filled.append("адреса")
    if phone: filled.append("телефон")
    if email: filled.append("email")
    if ig: filled.append("Instagram")
    if fb: filled.append("Facebook")
    if hours or hours_text: filled.append("години роботи")
    readme = """# {name} — демо-сайт турагенції

Шаблон: `turahentsiia` (туристична агенція, «море й пісок», маршрут на скролі, квіз-посадковий талон).

Заповнено з OpenStreetMap: {filled}.
Viber, Telegram і WhatsApp невідомі — ці кнопки прибрано; заявку з форми клієнт надсилає через: {chan}.

## Що ще заповнити (позначені плейсхолдери)
{left}
- Відгуки: три картки `ph-card` — приклади, замініть на реальні відгуки.
- Фото: `hero` і `about` бажано замінити на фото агенції.
""".format(name=name, filled=", ".join(filled),
           chan=", ".join(lab for _, lab in channels) if channels else "— (немає каналу, додайте телефон або email)",
           left="\n".join("- `%s`" % t for t in left) or "- немає")
    with open(os.path.join(outdir, "README.md"), "w", encoding="utf-8") as f:
        f.write(readme)
    return left


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    data = json.load(open(sys.argv[1], encoding="utf-8"))
    out = sys.argv[2]
    if isinstance(data, list):
        for lead in data:
            left = personalize(lead, os.path.join(out, lead["slug"]))
            print("ok", lead["slug"], "left:", " ".join(left))
    else:
        left = personalize(data, out)
        print("ok", data.get("slug"), "left:", " ".join(left))


if __name__ == "__main__":
    main()
