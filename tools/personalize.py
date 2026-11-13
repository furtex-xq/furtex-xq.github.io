#!/usr/bin/env python3
"""Personalize the klininh template (клінінг / хімчистка / пральня) for one lead.

usage:
  python3 tools/personalize.py <lead.json> <outdir> [--variant klininh|himchystka]
  python3 tools/personalize.py --preview himchystka      # writes himchystka.html next to index.html

Standard library only. Reads the template next to this script and writes a
complete personalized copy into <outdir> (the template tree is not touched).

Variants: index.html is the cleaning-company version («клінінг»). Blocks marked
<!--v:ID--> ... <!--/v:ID--> are swapped for the same-named blocks from
tools/variants/<variant>.html. The dry-cleaning / laundry variant («хімчистка і
пральня») is chosen automatically for leads that look like a dry cleaner
(name / Instagram / Facebook / explicit "variant" field / VARIANT_BY_SLUG).

Unknown facts stay as marked placeholders; unknown contact channels are removed
cleanly (elements carry data-ch="..." markers in the template).
"""
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY = ["index.html", "robots.txt", "css", "js", "fonts", "img/favicon.svg"]
DAY_ORDER = ["1", "2", "3", "4", "5", "6", "0"]
DAY_UA = {"1": "Понеділок", "2": "Вівторок", "3": "Середа", "4": "Четвер", "5": "П'ятниця", "6": "Субота", "0": "Неділя"}
DAY_SCHEMA = {"1": "Mo", "2": "Tu", "3": "We", "4": "Th", "5": "Fr", "6": "Sa", "0": "Su"}
VARIANTS = ("klininh", "himchystka")
# Leads checked by hand: OSM "clean" storefronts with shop hours = dry cleaners / laundries.
VARIANT_BY_SLUG = {"lora": "himchystka", "popeliushka": "himchystka", "perfetto": "himchystka"}
DRY_RE = re.compile(r"хімчист|химчист|пральн|прачечн|himchist|himchyst|khimchyst|chistk|laundr|dry.?clean|pralnia|pralnya", re.I)
VARIANT_LABEL = {"klininh": "клінінг / прибирання", "himchystka": "хімчистка і пральня"}


def esc(v):
    return html.escape(v, quote=True)


def norm_time(t):
    h, m = t.split(":")
    return "%02d:%s" % (int(h), m)


def sub1(s, old, new):
    if old not in s:
        raise SystemExit("template marker not found: %r" % old[:90])
    return s.replace(old, new)


def remove_el(s, ch, tags=("a", "p", "label")):
    """Remove every element carrying data-ch="<ch>" (with its own line if it sits alone on it)."""
    for tag in tags:
        s = re.sub(r'[ \t]*<%s\b[^>]*\bdata-ch="%s"[^>]*>.*?</%s>[ \t]*(\n)?' % (tag, re.escape(ch), tag),
                   lambda m: "", s, flags=re.S)
    return s


def apply_variant(s, variant):
    if variant == "klininh":
        return s
    src = open(os.path.join(ROOT, "tools", "variants", variant + ".html"), encoding="utf-8").read()
    blocks = dict(re.findall(r"<!--v:([\w-]+)-->(.*?)<!--/v:\1-->", src, re.S))
    for bid, body in blocks.items():
        pat = re.compile(r"<!--v:%s-->.*?<!--/v:%s-->" % (re.escape(bid), re.escape(bid)), re.S)
        if not pat.search(s):
            raise SystemExit("variant block not in template: " + bid)
        s = pat.sub(lambda m: "<!--v:%s-->%s<!--/v:%s-->" % (bid, body, bid), s, count=1)
    return s


def strip_markers(s):
    return re.sub(r"<!--/?v:[\w-]+-->\n?", "", s)


def detect_variant(lead):
    if lead.get("variant") in VARIANTS:
        return lead["variant"]
    if lead.get("slug") in VARIANT_BY_SLUG:
        return VARIANT_BY_SLUG[lead["slug"]]
    hay = " ".join(str(lead.get(k) or "") for k in ("name", "instagram", "instagram_handle", "facebook", "category"))
    return "himchystka" if DRY_RE.search(hay) else "klininh"


def schema_hours(hours):
    out, i = [], 0
    days = DAY_ORDER
    while i < len(days):
        h = hours.get(days[i])
        if not h:
            i += 1
            continue
        j = i
        while j + 1 < len(days) and hours.get(days[j + 1]) and [norm_time(x) for x in hours[days[j + 1]]] == [norm_time(x) for x in h]:
            j += 1
        span = DAY_SCHEMA[days[i]] if i == j else DAY_SCHEMA[days[i]] + "-" + DAY_SCHEMA[days[j]]
        out.append("%s %s-%s" % (span, norm_time(h[0]), norm_time(h[1])))
        i = j + 1
    return out


def personalize(lead, outdir, variant=None):
    variant = variant or detect_variant(lead)
    name = (lead.get("name") or "").strip() or None
    city = lead.get("city") or None
    city_loc = lead.get("city_loc") or city
    address = lead.get("address") or None
    phone = lead.get("phone") or None
    e164 = (lead.get("phone_e164") or "").lstrip("+") or None
    if phone and not e164:
        e164 = re.sub(r"\D", "", phone)
    if e164 and not phone:
        phone = "+" + e164
    email = lead.get("email") or None
    ig = lead.get("instagram") or None
    ig_handle = (lead.get("instagram_handle") or "").lstrip("@") or None
    if ig and not ig_handle:
        ig_handle = ig.rstrip("/").split("/")[-1]
    if ig_handle and not ig:
        ig = "https://www.instagram.com/%s/" % ig_handle
    fb = lead.get("facebook") or None
    hours = lead.get("hours") or None
    if hours and not any(hours.get(k) for k in DAY_ORDER):
        hours = None
    hours_text = lead.get("hours_text") or None
    maps_query = lead.get("maps_query") or ", ".join(x for x in [address, city] if x) or "Івано-Франківськ"

    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    s = strip_markers(apply_variant(s, variant))

    # ---------- JSON-LD (edit as data, re-serialize) ----------
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    if name:
        ld["name"] = name
    if city:
        ld["description"] = re.sub(r"\b[ву] \[МІСТО\]", ("в " if city_loc[:1].upper() in "АЕЄИІЇОУЮЯ" else "у ") + city_loc, ld["description"]).replace("[МІСТО]", city)
        ld["address"]["addressLocality"] = city
        ld["areaServed"] = city
    if address:
        ld["address"]["streetAddress"] = address
    else:
        ld["address"].pop("streetAddress", None)
    for key, val in (("telephone", phone), ("email", email)):
        if val:
            ld[key] = val
        else:
            ld.pop(key, None)
    ld.pop("priceRange", None)
    ld.pop("foundingDate", None)
    if hours:
        ld["openingHours"] = schema_hours(hours)
    else:
        ld.pop("openingHours", None)
    same = [u for u in (ig, fb) if u]
    if same:
        ld["sameAs"] = same
    else:
        ld.pop("sameAs", None)
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/")
    s = s[:m.start(2)] + "\n" + ld_txt + "\n" + s[m.end(2):]

    # ---------- contact channels ----------
    for ch in ("viber", "telegram", "whatsapp"):
        s = remove_el(s, ch)
    if not ig:
        s = remove_el(s, "instagram")
    if not fb:
        s = remove_el(s, "facebook")
    if not email:
        s = remove_el(s, "email")

    hero_call = '<a class="btn btn--ghost btn--lg" data-ch="phone" href="tel:+380000000000"><svg aria-hidden="true"><use href="#i-phone"/></svg>Зателефонувати</a>'
    bar_call = '<a data-ch="phone-bar" href="tel:+380000000000"><svg aria-hidden="true"><use href="#i-phone"/></svg>Подзвонити</a>'
    if phone:
        s = s.replace("tel:+380000000000", "tel:+" + e164)
        s = s.replace("sms:+380000000000", "sms:+" + e164)
    else:
        social = (ig, "#i-ig", "Написати в Instagram", "Instagram") if ig else ((fb, "#i-fb", "Написати у Facebook", "Facebook") if fb else None)
        if social:
            s = sub1(s, hero_call, '<a class="btn btn--ghost btn--lg" href="%s" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-%s"/></svg>%s</a>' % (esc(social[0]), social[1][3:], social[2]))
            s = sub1(s, bar_call, '<a href="%s" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-%s"/></svg>%s</a>' % (esc(social[0]), social[1][3:], social[3]))
        else:
            s = sub1(s, hero_call, "")
            s = sub1(s, "  " + bar_call + "\n", "")
            s = sub1(s, '<nav class="bar"', '<nav class="bar ab-2"')
        s = remove_el(s, "phone")
        s = remove_el(s, "sms")

    # contact buttons: drop the grid if only the call button would remain (the big number is right above it)
    cm = re.search(r'([ \t]*<div class="channels">\n)(.*?)([ \t]*</div>\n)', s, re.S)
    items = re.findall(r'<a class="ch"[^>]*data-ch="([a-z]+)"', cm.group(2))
    if not items or items == ["phone"]:
        s = s[:cm.start()] + s[cm.end():]

    # ---------- booking form channels ----------
    if ig_handle:
        s = s.replace("https://ig.me/m/username", "https://ig.me/m/" + quote(ig_handle, safe="._"))
    fs = re.search(r'<fieldset class="f via">.*?</fieldset>\n', s, re.S)
    block = fs.group(0).replace(" checked>", ">")
    vias = re.findall(r'name="via" value="([a-z]+)"', block)
    if vias:
        block = block.replace('value="%s"' % vias[0], 'value="%s" checked' % vias[0], 1)
        if len(vias) == 1:
            block = block.replace('<fieldset class="f via">', '<fieldset class="f via" hidden>', 1)
        s = s[:fs.start()] + block + s[fs.end():]
    else:
        s = s[:fs.start()] + s[fs.end():]
    names = {"sms": "SMS", "instagram": "Instagram Direct", "email": "листі"}
    if not vias:
        sub_txt = "Заповніть форму — ми підготуємо текст заявки й скопіюємо його, щоб ви могли надіслати його нам зручним способом."
    elif len(vias) == 1:
        sub_txt = {"sms": "Заповніть форму — відкриється SMS із готовим текстом заявки, залишиться лише надіслати її.",
                   "email": "Заповніть форму — відкриється лист із готовим текстом заявки, залишиться лише надіслати його.",
                   "instagram": "Заповніть форму — текст заявки скопіюється, а Instagram Direct відкриється: вставте текст і надішліть."}[vias[0]]
    else:
        sub_txt = "Заповніть форму й оберіть, куди надіслати — %s: відкриється повідомлення з готовим текстом заявки." % " або ".join(names[v] if v != "email" else "email" for v in vias)
    s = re.sub(r'(<p class="order__sub" data-form-sub>).*?(</p>)', lambda mm: mm.group(1) + sub_txt + mm.group(2), s, flags=re.S)

    # ---------- hours ----------
    if hours:
        lis = []
        for dd in DAY_ORDER:
            h = hours.get(dd)
            if h:
                a, b = norm_time(h[0]), norm_time(h[1])
                lis.append('          <li data-day="%s" data-hours="%s-%s"><span>%s</span><span>%s–%s</span></li>' % (dd, a, b, DAY_UA[dd], a, b))
            else:
                lis.append('          <li data-day="%s" data-hours=""><span>%s</span><span>вихідний</span></li>' % (dd, DAY_UA[dd]))
        s = re.sub(r'[ \t]*<!-- Графік.*?-->\n[ \t]*<ul class="hours__list" data-hours-list>.*?</ul>',
                   lambda mm: '        <ul class="hours__list" data-hours-list>\n' + "\n".join(lis) + "\n        </ul>", s, count=1, flags=re.S)
    else:
        s = re.sub(r'[ \t]*<!-- Графік.*?-->\n[ \t]*<ul class="hours__list" data-hours-list>.*?</ul>\n', "", s, count=1, flags=re.S)
        s = re.sub(r'[ \t]*<p class="status" data-status hidden>.*?</p>\n', "", s, count=1, flags=re.S)
    s = re.sub(r'[ \t]*<p class="ph-note" data-hours-note>.*?</p>\n', "", s, count=1, flags=re.S)
    if hours_text or hours:
        txt = hours_text or "; ".join(schema_hours(hours))
        s = s.replace('<span class="ph">[ГОДИНИ]</span>', esc(txt))

    # ---------- maps / links ----------
    q = quote(maps_query, safe="")
    s = re.sub(r'https://www\.google\.com/maps\?q=[^"&]*&amp;output=embed', "https://www.google.com/maps?q=%s&amp;output=embed" % q, s)
    s = re.sub(r'https://www\.google\.com/maps/dir/\?api=1&amp;destination=[^"]*', "https://www.google.com/maps/dir/?api=1&amp;destination=%s" % q, s)
    if email:
        s = s.replace("mailto:hello@example.com", "mailto:" + esc(email))
    if ig:
        s = s.replace("https://www.instagram.com/username/", esc(ig))
    if fb:
        s = s.replace("https://www.facebook.com/username", esc(fb))
    s = s.replace("https://raw.githack.com/furtex-xq/furtex-xq.github.io/template/klininh/index.html",
                  "https://raw.githack.com/furtex-xq/furtex-xq.github.io/beta/%s/index.html" % (lead.get("slug") or "demo"))

    # ---------- address line without unknown parts ----------
    if not address and city:
        s = s.replace('<span class="ph">[АДРЕСА]</span>, <span class="ph">[МІСТО]</span>', '<span class="ph">[АДРЕСА]</span>, ' + esc(city))

    # ---------- tokens ----------
    if city:
        vowel = city_loc[:1].upper() in "АЕЄИІЇОУЮЯ"

        def prep(mm):
            p = mm.group(1)
            if vowel:
                p = "В" if p.isupper() else "в"
            return p + " " + esc(city_loc)
        s = re.sub(r"(?<![\wА-яІіЇїЄєҐґ'])([вуВУ]) (?:<span class=\"ph\">)?\[МІСТО\](?:</span>)?", prep, s)
    vals = {"[НАЗВА]": name, "[МІСТО]": city, "[АДРЕСА]": address, "[ТЕЛЕФОН]": phone, "[EMAIL]": email,
            "[ІНСТАГРАМ]": ("@" + ig_handle) if ig_handle else None}
    for tok, v in vals.items():
        if v:
            s = s.replace('<span class="ph">%s</span>' % tok, esc(v)).replace(tok, esc(v))

    # ---------- write ----------
    if os.path.exists(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    for rel in COPY:
        src, dst = os.path.join(ROOT, rel), os.path.join(outdir, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
    open(os.path.join(outdir, "index.html"), "w", encoding="utf-8").write(s)

    left = sorted(set(re.findall(r"\[[A-ZА-ЯІЇЄҐ'’ ]{2,}\]", re.sub(r"<script.*?</script>", "", s, flags=re.S))))
    filled = [lbl for lbl, v in [("назва", name), ("місто", city), ("адреса", address), ("телефон", phone), ("email", email),
                                 ("Instagram", ig), ("Facebook", fb), ("графік роботи", hours or hours_text)] if v]
    readme = ["# %s — демо-сайт (%s)" % (name or "Демо", VARIANT_LABEL[variant]), "",
              "Шаблон: **klininh**, варіант **%s** (%s)." % (variant, VARIANT_LABEL[variant]), "",
              "Заповнено з OpenStreetMap: " + (", ".join(filled) if filled else "нічого") + ".", "",
              "Залишилося заповнити (на сторінці позначені жовтим пунктиром):", ""]
    hints = {"[ЦІНА]": "ціни: калькулятор (атрибути data-price / data-rate) і прайс у «Послуги й ціни»",
             "[ІМ'Я]": "імена авторів відгуків", "[РІК]": "рік заснування (підпис до фото в «Про нас»)",
             "[ФОП]": "ФОП / ТОВ і ЄДРПОУ у футері", "[ГОДИНИ]": "графік роботи", "[АДРЕСА]": "адреса",
             "[ТЕЛЕФОН]": "телефон", "[EMAIL]": "email", "[ІНСТАГРАМ]": "Instagram"}
    for t in left:
        readme.append("- `%s` — %s" % (t, hints.get(t, "")))
    readme += ["- три відгуки з міткою «Приклад відгуку» — замінити на реальні",
               "- блок «До і після» — замінити на реальну пару фото (і прибрати клас `is-sim`)",
               "- фото (зараз стокові з Unsplash) — замінити на фото закладу й робіт",
               "- перелік послуг і позицій калькулятора — звірити з реальним прайсом"]
    open(os.path.join(outdir, "README.md"), "w", encoding="utf-8").write("\n".join(readme) + "\n")
    return variant, left


def main():
    args = sys.argv[1:]
    if len(args) == 2 and args[0] == "--preview":
        s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
        out = os.path.join(ROOT, args[1] + ".html")
        open(out, "w", encoding="utf-8").write(apply_variant(s, args[1]))
        print("preview written:", out)
        return
    variant = None
    if "--variant" in args:
        i = args.index("--variant")
        variant = args[i + 1]
        if variant not in VARIANTS:
            raise SystemExit("unknown variant: " + variant)
        del args[i:i + 2]
    if len(args) != 2:
        raise SystemExit(__doc__)
    lead = json.load(open(args[0], encoding="utf-8"))
    v, left = personalize(lead, args[1], variant)
    print("ok", lead.get("slug"), "variant:", v, "left:", " ".join(left))


if __name__ == "__main__":
    main()
