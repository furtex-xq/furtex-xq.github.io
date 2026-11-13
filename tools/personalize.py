#!/usr/bin/env python3
"""Personalize the language-school template for one lead.

usage: python3 tools/personalize.py <lead.json> <outdir>

Standard library only. Reads the template next to this script, never modifies it,
writes a complete site copy to <outdir>. Known lead values replace the bracket
tokens and lose their placeholder marking; unknown channels are removed cleanly;
unknowns like [ЦІНА], [ІМ'Я], [РІК], [ФОП] stay marked.
"""
import html
import json
import os
import re
import shutil
import sys
import urllib.parse

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COPY_DIRS = ["css", "js", "fonts", "img"]
SKIP = {"photos"}  # img/photos — photos are absolute URLs pinned to a template commit
PHOTO_BASE = "https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/"

# leads that teach only German (no language field in the lead data)
GERMAN_ONLY_SLUGS = {"otto-hans"}
GERMAN_HINTS = ("sprach", "deutsch", "german", "німецьк")

DAY_SHORT = {1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 0: "Нд"}
DAY_SCHEMA = {1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday", 0: "Sunday"}
WEEK = [1, 2, 3, 4, 5, 6, 0]
TOKEN_RE = r"\[(?:НАЗВА|МІСТО|АДРЕСА|ТЕЛЕФОН|EMAIL|ГОДИНИ|ІНСТАГРАМ|ФОП|РІК|ЦІНА|ІМ'Я)\]"


def esc(v):
    return html.escape(v, quote=True)


class Page:
    def __init__(self, text):
        self.s = text

    def rep(self, old, new, count=1):
        n = self.s.count(old)
        if count is not None and n != count:
            raise SystemExit("template mismatch (%d× instead of %d): %r" % (n, count, old[:80]))
        self.s = self.s.replace(old, new)

    def block(self, name, new):
        """replace <!--name--> ... <!--/name--> (markers included) with new"""
        pat = re.compile(r"[ \t]*<!--%s-->.*?<!--/%s-->\n?" % (name, name), re.S)
        if not pat.search(self.s):
            raise SystemExit("marker not found: " + name)
        self.s = pat.sub(lambda m: new, self.s, count=1)

    def drop_marked(self, ch):
        """remove every single-line element carrying data-ch="ch" """
        self.s = re.sub(r'\n[ \t]*<(a|div|p)\b[^>\n]*data-ch="%s"[^\n]*</\1>' % ch, "", self.s)

    def unmark(self):
        self.s = re.sub(r"[ \t]*<!--/?(dict|week|questions|status|hourstable|channels|notes)-->\n", "", self.s)


def is_german_only(lead):
    if lead.get("slug") in GERMAN_ONLY_SLUGS:
        return True
    hay = " ".join(str(lead.get(k) or "") for k in ("name", "facebook", "instagram", "instagram_handle")).lower()
    return any(h in hay for h in GERMAN_HINTS)


def group_hours(hours):
    """{"0".."6": [open, close] | None} -> list of (days[], open, close)"""
    rows = []
    for d in WEEK:
        v = hours.get(str(d))
        key = tuple(v) if v else None
        if rows and rows[-1][1] == key:
            rows[-1][0].append(d)
        else:
            rows.append([[d], key])
    out = []
    for days, key in rows:
        out.append((days, key[0] if key else "", key[1] if key else ""))
    return out


def days_label(days):
    if len(days) == 1:
        return DAY_SHORT[days[0]]
    return DAY_SHORT[days[0]] + "–" + DAY_SHORT[days[-1]]


def hours_summary(groups):
    parts = []
    for days, o, c in groups:
        parts.append("%s %s" % (days_label(days), ("%s–%s" % (o, c)) if o else "вихідний"))
    return ", ".join(parts)


# ---------------------------------------------------------------- German variant blocks
DE_DICT = '''  <div class="dict">
    <article class="entry reveal">
      <p class="entry__word" lang="de">Hallo</p>
      <p class="entry__ipa" lang="de">[haˈloː]</p>
      <h3 class="entry__lang">Загальна німецька</h3>
      <p class="entry__def">Від нуля до вільного спілкування: граматика без зубріння, живі діалоги, вимова й розуміння на слух.</p>
      <p class="entry__meta"><span>A1–C1</span><span>підлітки · дорослі</span></p>
      <p class="entry__price">від <span class="ph">[ЦІНА]</span> грн/міс</p>
    </article>
    <article class="entry reveal">
      <p class="entry__word" lang="de">Prüfung</p>
      <p class="entry__ipa" lang="de">[ˈpʁyːfʊŋ]</p>
      <h3 class="entry__lang">Підготовка до іспитів</h3>
      <p class="entry__def">Goethe-Zertifikat, ÖSD, telc: формат іспиту, пробні тести, письмо й усна частина з викладачем.</p>
      <p class="entry__meta"><span>A2–C1</span><span>інтенсив</span></p>
      <p class="entry__price">від <span class="ph">[ЦІНА]</span> грн/міс</p>
    </article>
    <article class="entry reveal">
      <p class="entry__word" lang="de">Arbeit</p>
      <p class="entry__ipa" lang="de">[ˈaʁbaɪ̯t]</p>
      <h3 class="entry__lang">Німецька для роботи</h3>
      <p class="entry__def">Співбесіда, ділове листування, лексика вашої професії — для переїзду, роботи й навчання в Німеччині та Австрії.</p>
      <p class="entry__meta"><span>B1–C1</span><span>індивідуально · міні-група</span></p>
      <p class="entry__price">від <span class="ph">[ЦІНА]</span> грн/міс</p>
    </article>
  </div>
'''

DE_QUESTIONS = '''        <fieldset class="q is-active" data-answer="b">
          <legend><span class="q__n">1.</span> Ich <span class="gap">___</span> aus der Ukraine.</legend>
          <label><input type="radio" name="q1" value="a"><span>kommt</span></label>
          <label><input type="radio" name="q1" value="b"><span>komme</span></label>
          <label><input type="radio" name="q1" value="c"><span>kommst</span></label>
          <label class="q__idk"><input type="radio" name="q1" value="x"><span>Не знаю</span></label>
        </fieldset>
        <fieldset class="q" data-answer="c">
          <legend><span class="q__n">2.</span> Gestern <span class="gap">___</span> wir ins Kino gegangen.</legend>
          <label><input type="radio" name="q2" value="a"><span>haben</span></label>
          <label><input type="radio" name="q2" value="b"><span>waren</span></label>
          <label><input type="radio" name="q2" value="c"><span>sind</span></label>
          <label class="q__idk"><input type="radio" name="q2" value="x"><span>Не знаю</span></label>
        </fieldset>
        <fieldset class="q" data-answer="a">
          <legend><span class="q__n">3.</span> Wenn ich mehr Zeit <span class="gap">___</span>, würde ich öfter reisen.</legend>
          <label><input type="radio" name="q3" value="a"><span>hätte</span></label>
          <label><input type="radio" name="q3" value="b"><span>habe</span></label>
          <label><input type="radio" name="q3" value="c"><span>hatte</span></label>
          <label class="q__idk"><input type="radio" name="q3" value="x"><span>Не знаю</span></label>
        </fieldset>
        <fieldset class="q" data-answer="c">
          <legend><span class="q__n">4.</span> Das ist der Mann, <span class="gap">___</span> ich gestern geholfen habe.</legend>
          <label><input type="radio" name="q4" value="a"><span>den</span></label>
          <label><input type="radio" name="q4" value="b"><span>der</span></label>
          <label><input type="radio" name="q4" value="c"><span>dem</span></label>
          <label class="q__idk"><input type="radio" name="q4" value="x"><span>Не знаю</span></label>
        </fieldset>
        <fieldset class="q" data-answer="b">
          <legend><span class="q__n">5.</span> <span class="gap">___</span> des schlechten Wetters fand das Konzert statt.</legend>
          <label><input type="radio" name="q5" value="a"><span>Wegen</span></label>
          <label><input type="radio" name="q5" value="b"><span>Trotz</span></label>
          <label><input type="radio" name="q5" value="c"><span>Während</span></label>
          <label class="q__idk"><input type="radio" name="q5" value="x"><span>Не знаю</span></label>
        </fieldset>
'''

DE_WEEK = '''  <div class="week" id="week">
    <div class="day"><h3 class="day__name">Понеділок</h3>
      <p class="slot"><time>17:00</time><b>Німецька A2</b><small>підлітки</small></p>
      <p class="slot"><time>18:30</time><b>Німецька A1</b><small>дорослі</small></p>
    </div>
    <div class="day"><h3 class="day__name">Вівторок</h3>
      <p class="slot"><time>18:30</time><b>Німецька B1</b><small>дорослі</small></p>
    </div>
    <div class="day"><h3 class="day__name">Середа</h3>
      <p class="slot"><time>17:00</time><b>Німецька A2</b><small>підлітки</small></p>
      <p class="slot"><time>18:30</time><b>Німецька A1</b><small>дорослі</small></p>
    </div>
    <div class="day"><h3 class="day__name">Четвер</h3>
      <p class="slot"><time>18:30</time><b>Німецька B1</b><small>дорослі</small></p>
    </div>
    <div class="day"><h3 class="day__name">П’ятниця</h3>
      <p class="slot"><time>18:00</time><b>Підготовка до Goethe</b><small>B1 / B2</small></p>
    </div>
    <div class="day"><h3 class="day__name">Субота</h3>
      <p class="slot"><time>10:00</time><b>Німецька B2</b><small>міні-група</small></p>
      <p class="slot"><time>12:00</time><b>Stammtisch</b><small>розмовний клуб, B1+</small></p>
    </div>
  </div>
'''

DE_NOTES = '''  <div class="notes">
    <figure class="note ph-card reveal">
      <span class="ph-card__label">Приклад відгуку — замініть на реальний</span>
      <blockquote>Пішла на німецьку з нуля перед переїздом. За пів року спокійно говорила з орендодавцем і в банку. Найбільше ціную, що викладачка пояснює граматику простими словами.</blockquote>
      <figcaption><span class="ph">[ІМ'Я]</span> · німецька, A1 → B1</figcaption>
    </figure>
    <figure class="note ph-card reveal">
      <span class="ph-card__label">Приклад відгуку — замініть на реальний</span>
      <blockquote>Готувалася до Goethe B2 для вступу. Пробні іспити з таймером і розбір кожного листа дали впевненість — склала з першого разу.</blockquote>
      <figcaption><span class="ph">[ІМ'Я]</span> · підготовка до Goethe-Zertifikat</figcaption>
    </figure>
    <figure class="note ph-card reveal">
      <span class="ph-card__label">Приклад відгуку — замініть на реальний</span>
      <blockquote>Потрібна була німецька для роботи в Австрії. Індивідуальні заняття вписалися у мій графік, а тренування співбесід зняли весь стрес.</blockquote>
      <figcaption><span class="ph">[ІМ'Я]</span> · німецька для роботи, індивідуально</figcaption>
    </figure>
  </div>
'''


def apply_german(p):
    p.rep("Курси іноземних мов [МІСТО]", "Курси німецької мови [МІСТО]", count=2)  # title + og:title
    p.rep("— школа [НАЗВА]: англійська, німецька, польська</title>", "— мовна студія [НАЗВА]: Goethe, ÖSD, telc</title>")
    p.rep('<meta name="description" content="Школа іноземних мов [НАЗВА] у [МІСТО]: курси англійської, німецької, польської та інших мов для дітей, підлітків і дорослих.',
          '<meta name="description" content="Курси німецької мови [НАЗВА] у [МІСТО]: німецька з нуля до C1 для підлітків і дорослих, підготовка до Goethe, ÖSD і telc.')
    p.rep("Англійська, німецька, польська, французька, іспанська, італійська. Безкоштовний тест рівня і пробне заняття.",
          "Німецька з нуля до C1, підготовка до Goethe-Zertifikat. Безкоштовний тест рівня і пробне заняття.")
    p.rep('"knowsLanguage": ["en", "de", "pl", "fr", "es", "it"]', '"knowsLanguage": ["de"]')
    p.rep("англійська, німецька, польська, французька, іспанська, італійська для дітей і дорослих",
          "курси німецької мови для підлітків і дорослих")
    p.rep("школа іноземних мов</small>", "курси німецької мови</small>")
    p.rep('<p class="eyebrow">Школа іноземних мов · <span class="ph">[МІСТО]</span></p>',
          '<p class="eyebrow">Курси німецької мови · <span class="ph">[МІСТО]</span></p>')
    p.rep("Курси іноземних мов, де <mark", "Курси німецької мови, де <mark")
    p.rep("Англійська, німецька, польська та ще три мови для дітей, підлітків і дорослих. Невеликі групи, живі розмови замість зубріння і зрозумілий план: від нуля до впевненого рівня.",
          "Німецька для підлітків і дорослих — для переїзду, роботи, навчання чи задоволення. Невеликі групи, живі розмови замість зубріння і зрозумілий план: від нуля до впевненого рівня.")
    p.rep('<ul class="hero__langs" aria-label="Мови, які ми викладаємо">\n        <li>англ.</li><li>нім.</li><li>пол.</li><li>фр.</li><li>ісп.</li><li>італ.</li>\n      </ul>',
          '<ul class="hero__langs" aria-label="Рівні та іспити">\n        <li>A1–C1</li><li>Goethe</li><li>ÖSD</li><li>telc</li>\n      </ul>')
    p.rep('<p class="eyebrow">Шість мов, один підхід</p>', '<p class="eyebrow">Одна мова — глибоко</p>')
    p.rep('<h2>Оберіть мову — <mark class="hl">ми підберемо групу</mark></h2>',
          '<h2>Німецька під <mark class="hl">вашу мету</mark></h2>')
    p.rep("У кожної мови свій викладач-фахівець і своя програма. Рівні — за шкалою CEFR, від A1 (з нуля) до C1.",
          "Ми викладаємо лише німецьку — і тому знаємо її пастки: артиклі, відмінки, порядок слів. Рівні — за шкалою CEFR, від A1 (з нуля) до C1.")
    p.block("dict", DE_DICT)
    p.rep("Безкоштовно · 5 питань · англійська", "Безкоштовно · 5 питань · німецька")
    p.rep(" Рівень з інших мов викладач визначить на пробному занятті.", " Точніше рівень визначимо на пробному занятті.")
    p.rep('data-lang="en" data-form-lang="Англійська"', 'data-lang="de" data-form-lang="Загальний курс"')
    p.block("questions", DE_QUESTIONS)
    p.rep('<p class="result__name" id="rName">Intermediate</p>', '<p class="result__name" id="rName">Mittelstufe</p>')
    p.rep("Англійська B1 · вт / чт, 18:30</p>", "Німецька B1 · вт / чт, 18:30</p>")
    p.rep("НМТ, IELTS, Goethe, DELF — інтенсив 2–3 місяці", "Goethe, ÖSD, telc — інтенсив 2–3 місяці")
    p.rep("Граматика без нудьги, підготовка до НМТ і міжнародних іспитів, проєкти й дебати.",
          "Граматика без нудьги, підготовка до міжнародних іспитів і літніх програм у Німеччині.")
    p.rep('<p class="eyebrow">Набір у групи відкрито</p>\n    <h2>Розклад <mark class="hl">груп на тиждень</mark></h2>',
          '<p class="eyebrow">Набір у групи відкрито</p>\n    <h2>Розклад <mark class="hl">груп німецької</mark></h2>')
    p.block("week", DE_WEEK)
    p.rep("Сучасні підручники Cambridge, Oxford, Hueber", "Сучасні підручники Hueber, Klett, Cornelsen")
    p.rep("Ми — команда викладачів, які самі вчили мови дорослими", "Ми — викладачі німецької, які самі вчили її дорослими")
    p.block("notes", DE_NOTES)
    p.rep("Для міжнародних сертифікатів готуємо до іспитів IELTS, Goethe, DELF.",
          "Для міжнародних сертифікатів готуємо до іспитів Goethe-Zertifikat, ÖSD і telc.")
    p.rep("<option>Англійська</option><option>Німецька</option><option>Польська</option><option>Французька</option><option>Іспанська</option><option>Італійська</option>",
          "<option>Загальний курс</option><option>Підготовка до іспиту</option><option>Для роботи</option>")
    p.rep('<label for="fLang">Мова</label>', '<label for="fLang">Напрям</label>')
    p.rep(". Англійська, німецька, польська, французька, іспанська, італійська.</p>",
          ". Німецька з нуля до C1 та підготовка до іспитів.</p>")
    p.rep('Школа іноземних мов у <span class="ph">[МІСТО]</span>. ', 'Курси німецької мови у <span class="ph">[МІСТО]</span>. ')


# ---------------------------------------------------------------- channels
def channel_inputs(lead):
    """form send options available for this lead: (value, url, display name, label)"""
    out = []
    if lead.get("phone_e164"):
        out.append(("sms", "sms:+" + lead["phone_e164"], "SMS-повідомлення", "SMS"))
    if lead.get("email"):
        out.append(("mail", "mailto:" + lead["email"], "пошту", "Email"))
    if lead.get("instagram_handle"):
        out.append(("ig", "https://ig.me/m/" + lead["instagram_handle"], "Instagram", "Instagram"))
    if lead.get("facebook"):
        path = urllib.parse.urlparse(lead["facebook"]).path.strip("/")
        url = ("https://m.me/" + path) if path and "/" not in path and "profile.php" not in path else lead["facebook"]
        out.append(("fb", url, "Facebook", "Facebook"))
    return out


def channels_block(chs, lead):
    if not chs:
        return ('        <p class="channel-note">Після натискання кнопки текст заявки буде скопійовано — '
                'надішліть його нам зручним способом із розділу «Контакти».</p>\n'
                '        <input type="hidden" name="ch" value="copy" data-url="" data-name="">\n')
    if len(chs) == 1:
        v, url, name, label = chs[0]
        note = {
            "sms": "Заявка відкриється як SMS на номер %s — залишиться натиснути «Надіслати»." % esc(lead.get("phone") or ""),
            "mail": "Заявка відкриється як лист на %s." % esc(lead.get("email") or ""),
            "ig": "Відкриється чат в Instagram, а текст заявки буде скопійовано — просто вставте його.",
            "fb": "Відкриється чат у Facebook, а текст заявки буде скопійовано — просто вставте його.",
        }[v]
        return ('        <p class="channel-note">%s</p>\n'
                '        <input type="hidden" name="ch" value="%s" data-url="%s" data-name="%s">\n') % (note, v, esc(url), esc(name))
    rows = ['        <fieldset class="channel">', '          <legend>Куди надіслати заявку</legend>']
    for i, (v, url, name, label) in enumerate(chs):
        rows.append('          <label><input type="radio" name="ch" value="%s" data-url="%s" data-name="%s"%s><span>%s</span></label>'
                    % (v, esc(url), esc(name), " checked" if i == 0 else "", label))
    rows.append("        </fieldset>")
    return "\n".join(rows) + "\n"


SVG_PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
SVG_MSG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'


# ---------------------------------------------------------------- main
def personalize(lead, src):
    p = Page(src)
    name = lead.get("name")
    city = lead.get("city")
    city_loc = lead.get("city_loc") or city
    phone = lead.get("phone")
    e164 = lead.get("phone_e164")
    email = lead.get("email")
    ig = lead.get("instagram")
    ig_handle = lead.get("instagram_handle")
    fb = lead.get("facebook")
    hours = lead.get("hours")
    hours_text = lead.get("hours_text")
    maps_q = lead.get("maps_query") or ", ".join(x for x in (lead.get("address"), city) if x)

    if is_german_only(lead):
        apply_german(p)

    # ---- JSON-LD: rebuild from the template block with real values
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', p.s, re.S)
    ld = json.loads(m.group(2))
    if name:
        ld["name"] = name
    if city:
        ld["description"] = re.sub(r"у \[МІСТО\]", "у " + city_loc, ld["description"])
        ld["address"]["addressLocality"] = city
    if lead.get("address"):
        ld["address"]["streetAddress"] = lead["address"]
    if phone:
        ld["telephone"] = "+" + e164 if e164 else phone
    else:
        ld.pop("telephone", None)
    if email:
        ld["email"] = email
    else:
        ld.pop("email", None)
    same = [u for u in (ig, fb) if u]
    if same:
        ld["sameAs"] = same
    else:
        ld.pop("sameAs", None)
    if maps_q:
        ld["hasMap"] = "https://www.google.com/maps?q=" + urllib.parse.quote(maps_q)
    groups = group_hours(hours) if hours else None
    if groups:
        ld.pop("openingHours", None)
        ld["openingHoursSpecification"] = [
            {"@type": "OpeningHoursSpecification", "dayOfWeek": [DAY_SCHEMA[d] for d in days], "opens": o, "closes": c}
            for days, o, c in groups if o]
    elif hours_text:
        ld.pop("openingHours", None)  # free text is not schema-valid; shown on the page instead
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/")
    p.s = p.s[:m.start(2)] + "\n" + ld_txt + "\n" + p.s[m.end(2):]

    # ---- hours
    if groups:
        rows = []
        for days, o, c in groups:
            rows.append('            <tr data-days="%s" data-open="%s" data-close="%s"><th scope="row">%s</th><td>%s</td></tr>'
                        % (",".join(str(d) for d in days), o, c, days_label(days), ("%s–%s" % (o, c)) if o else "вихідний"))
        p.s = re.sub(r"(<table class=\"hours__table\" id=\"hoursTable\">.*?<tbody>\n).*?(\s*</tbody>)",
                     lambda mm: mm.group(1) + "\n".join(rows) + mm.group(2), p.s, count=1, flags=re.S)
        summary = hours_text or hours_summary(groups)
        p.rep('<span class="ph">[ГОДИНИ]</span>', esc(summary), count=None)
    else:
        # no structured hours: no live status, no default table (would be shown as fact)
        p.block("status", '        <p class="hours__status hours__status--static"><span class="dot" aria-hidden="true"></span>Графік роботи</p>\n'
                          '        <p class="hours__sum"><span class="ph">[ГОДИНИ]</span></p>\n')
        p.block("hourstable", "")
        if hours_text:
            p.rep('<span class="ph">[ГОДИНИ]</span>', esc(hours_text), count=None)

    # ---- channels: viber / telegram / whatsapp are never known
    for ch in ("viber", "tg", "wa"):
        p.drop_marked(ch)
    if not phone:
        p.drop_marked("tel")
    if not email:
        p.drop_marked("mail")
    if not ig:
        p.drop_marked("ig")
    if not fb:
        p.drop_marked("fb")
    p.block("channels", channels_block(channel_inputs(lead), lead))

    # route button in contacts (address is known for every lead)
    route = "https://www.google.com/maps/dir/?api=1&destination=" + urllib.parse.quote(maps_q)
    soc_end = p.s.index("\n      </div>", p.s.index('<div class="socials">'))
    p.s = (p.s[:soc_end] + '\n        <a class="soc" data-ch="route" href="%s" target="_blank" rel="noopener">%sМаршрут</a>'
           % (esc(route), SVG_PIN) + p.s[soc_end:])

    # mobile bar: call → write when there is no phone
    if not phone:
        alt = ig or fb
        if alt:
            p.s = p.s.replace('<a class="mbar__main" href="#zapys">',
                              '<a href="%s" target="_blank" rel="noopener">%sНаписати</a>\n  <a class="mbar__main" href="#zapys">' % (esc(alt), SVG_MSG), 1)
        else:
            p.s = p.s.replace('<nav class="mbar" aria-label="Швидкі дії">',
                              '<nav class="mbar mbar--two" aria-label="Швидкі дії">', 1)
        p.rep("<h3>Заявка або дзвінок</h3>", "<h3>Заявка</h3>")

    # ---- links
    if e164:
        p.rep("tel:+380000000000", "tel:+" + e164, count=None)
    if email:
        p.rep("mailto:hello@example.com", "mailto:" + email, count=None)
    if ig:
        p.rep("https://www.instagram.com/username/", esc(ig), count=None)
    if fb:
        p.rep("https://www.facebook.com/username", esc(fb), count=None)
    enc_city = urllib.parse.quote("Івано-Франківськ")
    p.rep("https://www.google.com/maps?q=%s&amp;output=embed" % enc_city,
          "https://www.google.com/maps?q=%s&amp;output=embed" % urllib.parse.quote(maps_q))
    p.rep("https://www.google.com/maps/dir/?api=1&amp;destination=%s" % enc_city, esc(route))

    # ---- tokens (visible spans first, then bare tokens in attributes/head)
    def fill(token, value):
        if not value:
            return
        p.s = p.s.replace('<span class="ph">%s</span>' % token, esc(value))
        p.s = p.s.replace(token, esc(value))

    if city:
        # locative after в/у (with or without the placeholder span)
        p.s = re.sub(r'(\b[вуВУ]) (?:<span class="ph">)?\[МІСТО\](?:</span>)?', lambda mm: mm.group(1) + " " + esc(city_loc), p.s)
    fill("[МІСТО]", city)
    fill("[НАЗВА]", name)
    fill("[АДРЕСА]", lead.get("address"))
    fill("[ТЕЛЕФОН]", phone)
    fill("[EMAIL]", email)
    fill("[ІНСТАГРАМ]", ig_handle)

    p.unmark()
    return p.s


def write_readme(lead, out, german):
    known = []
    for k, label in (("name", "назва"), ("address", "адреса"), ("phone", "телефон"), ("email", "email"),
                     ("instagram", "Instagram"), ("facebook", "Facebook"), ("hours_text", "години роботи")):
        if lead.get(k):
            known.append(label)
    html_s = open(os.path.join(out, "index.html"), encoding="utf-8").read()
    left = sorted(set(re.findall(TOKEN_RE, html_s)))
    lines = [
        "# %s — демо-сайт" % lead.get("name"),
        "",
        "Шаблон: «Школа іноземних мов» (`movna-shkola`)%s." % (", варіант лише для німецької мови" if german else ""),
        "",
        "Заповнено з OpenStreetMap: %s." % (", ".join(known) or "—"),
        "Карта і кнопка «Маршрут» ведуть на: %s." % (lead.get("maps_query") or "—"),
        "",
        "Ще потрібно заповнити (підсвічені на сторінці):",
    ]
    lines += ["- `%s`" % t for t in left]
    lines += [
        "- відгуки з міткою «Приклад відгуку» — замінити на реальні",
        "- розклад груп і тексти про програми — звірити з клієнтом",
        "- фото — зараз стокові (Unsplash), бажано замінити на фото школи",
    ]
    if not lead.get("hours") and not lead.get("hours_text"):
        lines.append("- години роботи невідомі: статус «зараз відчинено» вимкнено")
    open(os.path.join(out, "README.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: personalize.py <lead.json> <outdir>")
    lead = json.load(open(sys.argv[1], encoding="utf-8"))
    out = os.path.abspath(sys.argv[2])
    if out == ROOT or out.startswith(ROOT + os.sep):
        sys.exit("outdir must be outside the template")
    os.makedirs(out, exist_ok=True)
    for d in COPY_DIRS:
        src = os.path.join(ROOT, d)
        dst = os.path.join(out, d)
        if os.path.isdir(dst):
            shutil.rmtree(dst)
        shutil.copytree(src, dst, ignore=lambda dirpath, names: [n for n in names if n in SKIP or n.endswith(".zip")])
    shutil.copy2(os.path.join(ROOT, "robots.txt"), out)

    src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    page = personalize(lead, src)
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(page)

    js_path = os.path.join(out, "js", "main.js")
    js = open(js_path, encoding="utf-8").read()
    if is_german_only(lead):
        js = js.replace("'Мова: ' + v('fLang')", "'Напрям: ' + v('fLang')")
    open(js_path, "w", encoding="utf-8").write(js)

    write_readme(lead, out, is_german_only(lead))
    print("ok", lead.get("slug"), "->", out)


if __name__ == "__main__":
    main()
