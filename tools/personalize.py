#!/usr/bin/env python3
"""Personalize the kavyarnia template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Reads the template next to this script, writes a complete personalized copy
into <outdir>. Standard library only. Unknown data stays as marked placeholders;
unknown contact channels are removed cleanly.
"""
import html
import json
import os
import re
import shutil
import sys
import urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY = ["index.html", "robots.txt", "css", "js", "fonts", "img/favicon.svg"]
DAY_KEYS = ["1", "2", "3", "4", "5", "6", "0"]          # Mon..Sun
OSM_DAY = {"1": "Mo", "2": "Tu", "3": "We", "4": "Th", "5": "Fr", "6": "Sa", "0": "Su"}

ICON = {
    "instagram": '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4z"/><path d="M17.5 6.5h.01"/></svg>',
    "facebook": '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
}
LABEL = {"instagram": "Instagram", "facebook": "Facebook"}


def esc(s):
    return html.escape(s, quote=True)


def clean_name(n):
    n = n.strip()
    m = re.fullmatch(r'["“„](.*)["”]', n)
    return "«%s»" % m.group(1) if m else n


def ig_handle(lead):
    if lead.get("instagram_handle"):
        return lead["instagram_handle"].lstrip("@")
    if lead.get("instagram"):
        path = urllib.parse.urlparse(lead["instagram"]).path.strip("/")
        return path.split("/")[0] if path else None
    return None


def fb_name(lead):
    if not lead.get("facebook"):
        return None
    path = urllib.parse.urlparse(lead["facebook"]).path.strip("/")
    return path.split("/")[0] if path else None


def osm_hours(hours):
    """{"1": ["08:00","18:30"], ...} -> ["Mo-Fr 08:00-18:30", "Sa 08:30-18:00"]"""
    out, i = [], 0
    while i < 7:
        h = hours.get(DAY_KEYS[i])
        if not h:
            i += 1
            continue
        j = i
        while j + 1 < 7 and hours.get(DAY_KEYS[j + 1]) == h:
            j += 1
        days = OSM_DAY[DAY_KEYS[i]] + ("" if i == j else "-" + OSM_DAY[DAY_KEYS[j]])
        out.append("%s %s-%s" % (days, h[0], h[1]))
        i = j + 1
    return out


def remove_ch(s, ch):
    """Remove every element carrying data-ch="<ch>" (plus its line indentation)."""
    pat = re.compile(r'[ \t]*<(\w+)\b[^>]*\sdata-ch="%s"[^>]*>.*?</\1>[ \t]*\n?' % re.escape(ch), re.S)
    return pat.sub("", s)


def personalize(lead, out):
    name = clean_name(lead["name"])
    city, city_loc = lead.get("city") or "", lead.get("city_loc") or lead.get("city") or ""
    phone, e164 = lead.get("phone"), lead.get("phone_e164")
    email, ig, fb = lead.get("email"), lead.get("instagram"), lead.get("facebook")
    hours, hours_text = lead.get("hours"), lead.get("hours_text")
    if hours and not any(hours.values()):
        hours = None
    handle = ig_handle(lead)
    bakery = lead.get("category") == "bakery"
    maps_q = lead.get("maps_query") or ("%s, %s" % (lead.get("address") or "", city)).strip(", ")

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # ---- JSON-LD (edited as data, dumped as valid JSON) ----
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    ld["name"] = name
    ld["description"] = "%s в %s: кава на свіжообсмаженому зерні, випічка, сніданки, кава з собою." % (
        "Пекарня-кав'ярня" if bakery else "Кав'ярня", city_loc)
    if phone:
        ld["telephone"] = "+" + e164
    else:
        ld.pop("telephone", None)
    if email:
        ld["email"] = email
    else:
        ld.pop("email", None)
    ld["address"]["streetAddress"] = lead.get("address") or "[АДРЕСА]"
    ld["address"]["addressLocality"] = city
    if hours:
        ld["openingHours"] = osm_hours(hours)
    elif hours_text:
        ld.pop("openingHours", None)
    same = [u for u in (ig, fb) if u]
    if same:
        ld["sameAs"] = same
    else:
        ld.pop("sameAs", None)
    ld["hasMap"] = "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(maps_q)
    ld_txt = "\n" + json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/") + "\n"
    s = s[:m.start(2)] + "%%LD%%" + s[m.end(2):]

    # ---- channels that no lead has ----
    for ch in ("viber", "telegram", "whatsapp"):
        s = remove_ch(s, ch)

    # ---- phone CTAs ----
    alt = "instagram" if ig else "facebook" if fb else None
    alt_url = ig or fb
    if not phone:
        s = remove_ch(s, "phone")
        if alt:
            a_attr = 'href="%s" target="_blank" rel="noopener"' % esc(alt_url)
            s = re.sub(r'<a class="nav__call" data-ch="phone-cta" href="[^"]*">.*?</a>',
                       '<a class="nav__call" %s>Написати в %s</a>' % (a_attr, LABEL[alt]), s, flags=re.S)
            s = re.sub(r'<a class="btn btn--ghost" data-ch="phone-cta" href="[^"]*">.*?</a>',
                       '<a class="btn btn--ghost" %s>\n          %s\n          %s\n        </a>' % (a_attr, ICON[alt], LABEL[alt]), s, flags=re.S)
            s = re.sub(r'<a data-ch="phone-cta" href="tel:[^"]*">.*?</a>',
                       '<a %s>%s%s</a>' % (a_attr, ICON[alt], LABEL[alt]), s, flags=re.S)
        else:
            s = remove_ch(s, "phone-cta")
            s = s.replace('<nav class="bar"', '<nav class="bar bar--2"')
    s = s.replace(' data-ch="phone-cta"', "")

    for ch, val in (("email", email), ("instagram", ig), ("facebook", fb)):
        if not val:
            s = remove_ch(s, ch)

    # contact buttons grid: first one is the big one, odd tail spans full width
    lm = re.search(r'(<div class="links">)(.*?)(\n      </div>)', s, re.S)
    links = re.findall(r'[ \t]*<a class="link[^"]*".*?</a>', lm.group(2), re.S)
    if links and not phone:
        links[0] = links[0].replace('class="link"', 'class="link link--main"', 1)
    rest = [l for l in links if "link--main" not in l]
    if len(rest) % 2 == 1:
        rest_last = rest[-1]
        links[links.index(rest_last)] = rest_last.replace('class="link"', 'class="link link--full"', 1)
    if links:
        s = s[:lm.start(2)] + "\n" + "\n".join(links) + s[lm.end(2):]
    else:
        s = s[:lm.start()] + s[lm.end():]

    # ---- form send options ----
    opts = []
    if ig and handle:
        opts.append(("instagram", "Instagram"))
    if phone:
        opts.append(("sms", "SMS"))
    if email:
        opts.append(("email", "Email"))
    if fb and fb_name(lead) and len(opts) < 3:
        opts.append(("facebook", "Messenger"))
    if not opts:
        opts.append(("email", "Email"))  # unreachable for current leads; keeps the form functional
    radios = "\n".join('        <label><input type="radio" name="via" value="%s"%s><span>%s</span></label>'
                       % (v, " checked" if i == 0 else "", l) for i, (v, l) in enumerate(opts))
    s = re.sub(r'<!--via-->.*?<!--/via-->', radios.lstrip(), s, flags=re.S)
    if len(opts) == 1:
        s = s.replace('<fieldset class="seg seg--send">', '<fieldset class="seg seg--send" hidden>')
    contact = {"email": email or "", "sms": ("sms:+" + e164) if phone else "",
               "instagram": ("https://ig.me/m/" + handle) if handle else "",
               "facebook": ("https://m.me/" + fb_name(lead)) if fb_name(lead) else "",
               "business": name}

    # FAQ sentence about messengers
    dm = [LABEL[c] for c in ("instagram", "facebook") if lead.get(c)]
    if dm:
        s = re.sub(r'<span data-msgr>.*?</span>', " чи ".join(dm), s)
    else:
        s = re.sub(r'або напишіть у <span data-msgr>.*?</span>:',
                   "або зателефонуйте нам:" if phone else "або напишіть на пошту:", s)

    # ---- hours ----
    if hours:
        data = {k: v for k, v in hours.items() if v}
        s = re.sub(r"data-hours='[^']*'", "data-hours='%s'" % json.dumps(data, separators=(",", ":")), s)
    else:
        s = re.sub(r'\s*<ul class="hours__list"[^>]*></ul>', "", s)
        s = s.replace(" data-status>", ">")
    s = re.sub(r'\s*<span class="ph-label">Приклад графіку — замініть на реальний</span>', "", s)

    # ---- niche wording ----
    if not bakery:
        s = s.replace("кав'ярня-пекарня", "кав'ярня").replace("Кав'ярня-пекарня", "Кав'ярня")
    if not phone:
        s = s.replace(", [ТЕЛЕФОН].", ".")

    # ---- links ----
    if phone:
        s = s.replace("tel:+380000000000", "tel:+" + e164)
    if email:
        s = s.replace("mailto:hello@example.com", "mailto:" + esc(email))
    if ig:
        s = s.replace("https://www.instagram.com/username/", esc(ig))
    if fb:
        s = s.replace("https://www.facebook.com/username", esc(fb))
    q = urllib.parse.quote(maps_q)
    s = re.sub(r'https://www\.google\.com/maps\?q=[^"&]*(&amp;output=embed)', "https://www.google.com/maps?q=" + q + r"\1", s)
    s = re.sub(r'(https://www\.google\.com/maps/dir/\?api=1&amp;destination=)[^"]*', r"\g<1>" + q, s)

    # ---- tokens ----
    known = {"НАЗВА": name, "МІСТО": city}
    if lead.get("address"):
        known["АДРЕСА"] = lead["address"]
    if phone:
        known["ТЕЛЕФОН"] = phone
    if email:
        known["EMAIL"] = email
    if handle:
        # long handles do not fit a half-width button
        known["ІНСТАГРАМ"] = "@" + handle if len(handle) <= 15 else "Instagram"
    if hours_text:
        known["ГОДИНИ"] = hours_text

    def prep(mo):
        p = mo.group(2)
        if p.lower() == "в" and city_loc[:1].lower() in "вфу":
            p = "у" if p == "в" else "У"
        return mo.group(1) + p + mo.group(3) + esc(city_loc)
    s = re.sub(r'(^|[\s>(])([вуВУ])(\s+)(?:<span class="ph">)?\[МІСТО\](?:</span>)?', prep, s)
    for tok, val in known.items():
        s = s.replace('<span class="ph">[%s]</span>' % tok, esc(val))
        s = s.replace("[%s]" % tok, esc(val))

    # JS contact config
    js = open(os.path.join(ROOT, "js/main.js"), encoding="utf-8").read()
    js = re.sub(r'  var CONTACT = \{.*?\};', "  var CONTACT = " + json.dumps(contact, ensure_ascii=False) + ";", js, count=1)

    s = s.replace("%%LD%%", ld_txt)

    # ---- write ----
    os.makedirs(out, exist_ok=True)
    for rel in COPY:
        src, dst = os.path.join(ROOT, rel), os.path.join(out, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.isdir(src):
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            shutil.copy2(src, dst)
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(s)
    open(os.path.join(out, "js/main.js"), "w", encoding="utf-8").write(js)

    left = sorted(set(re.findall(r"\[[А-ЯІЇЄҐA-Z'’]+\]", s)))
    filled = [k for k in ("назва", "місто", "адреса", "телефон", "email", "instagram", "facebook", "графік роботи")
              if {"назва": name, "місто": city, "адреса": lead.get("address"), "телефон": phone, "email": email,
                  "instagram": ig, "facebook": fb, "графік роботи": hours or hours_text}[k]]
    readme = """# {name} — демо-сайт

Персоналізована демо-версія шаблону **«Кав'ярня / кав'ярня-пекарня» (`kavyarnia`)** для «{name}», {city}.

**Заповнено з OpenStreetMap:** {filled}.
Джерело: {osm}

**Ще треба заповнити (позначено жовтим на сторінці):**
{left}
- приклади відгуків (картки з міткою «Приклад відгуку») — замінити на реальні;
- фото з Unsplash — замінити на фото закладу;
- меню й тексти — звірити з реальним асортиментом і умовами.
""".format(name=name, city=city, filled=", ".join(filled), osm=lead.get("osm") or "—",
           left="\n".join("- `%s`" % t for t in left) or "- (токенів не лишилось)")
    open(os.path.join(out, "README.md"), "w", encoding="utf-8").write(readme)
    return left


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    lead = json.load(open(sys.argv[1], encoding="utf-8"))
    left = personalize(lead, sys.argv[2])
    print("ok", lead.get("slug"), "remaining:", " ".join(left))
