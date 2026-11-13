#!/usr/bin/env python3
"""Персоналізація шаблону «Ремонт телефонів» під конкретний лід.

Використання:  python3 tools/personalize.py <lead.json> <outdir>
lead.json — один об'єкт ліда (або список; тоді беремо перший).
Пише повну копію сайту в <outdir>, робоче дерево шаблону не змінює.
Лише стандартна бібліотека.
"""
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote, urlparse

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
COPY = ['index.html', 'robots.txt', 'css', 'js', 'fonts', 'img/favicon.svg']
DAY_CODES = {'1': 'Mo', '2': 'Tu', '3': 'We', '4': 'Th', '5': 'Fr', '6': 'Sa', '0': 'Su'}
ALLOWED_LEFT = {"ЦІНА", "ІМ'Я", "РІК", "ФОП", "ГОДИНИ"}

IG_SVG = ('<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/>'
          '<path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4zM17.5 6.5h.01"/></svg>')
FORM_SVG = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>')


def esc(v):
    return html.escape(str(v), quote=True)


def to_hours(t):
    h, m = t.split(':')
    v = int(h) + int(m) / 60
    return v


def ig_handle(lead):
    if lead.get('instagram_handle'):
        h = lead['instagram_handle'].strip()
        return h if h.startswith('@') else '@' + h
    if lead.get('instagram'):
        seg = [x for x in urlparse(lead['instagram']).path.split('/') if x]
        if seg:
            return '@' + seg[0]
    return None


def js_hours(hours):
    parts = []
    for k in ['1', '2', '3', '4', '5', '6', '0']:
        v = hours.get(k)
        if v:
            o, c = to_hours(v[0]), to_hours(v[1])
            if c <= o:
                c = 24
            parts.append('%s: [%s, %s]' % (k, repr(round(o, 4)), repr(round(c, 4))))
        else:
            parts.append('%s: null' % k)
    return '{ ' + ', '.join(parts) + ' }'


def schema_hours(hours):
    out = []
    for k in ['1', '2', '3', '4', '5', '6', '0']:
        v = hours.get(k)
        if v:
            out.append('%s %s-%s' % (DAY_CODES[k], v[0], v[1]))
    return out


def personalize(lead, outdir):
    name = lead['name']
    city = lead.get('city')
    city_loc = lead.get('city_loc') or city
    phone = lead.get('phone')
    e164 = lead.get('phone_e164')
    email = lead.get('email')
    ig = lead.get('instagram')
    fb = lead.get('facebook')
    hours = lead.get('hours')
    hours_text = lead.get('hours_text')
    address = lead.get('address')
    maps_q = lead.get('maps_query') or ', '.join(x for x in [address, city] if x)
    has_phone = bool(phone and e164)

    s = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

    # ---------- 1. JSON-LD ----------
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    ld['name'] = name
    ld['description'] = 'Ремонт телефонів, планшетів, ноутбуків і гаджетів у %s' % city_loc
    if has_phone:
        ld['telephone'] = phone
    else:
        ld.pop('telephone', None)
    if email:
        ld['email'] = email
    else:
        ld.pop('email', None)
    ld.pop('priceRange', None)      # ціни невідомі
    ld.pop('foundingDate', None)    # рік невідомий
    ld['address']['streetAddress'] = address or ''
    ld['address']['addressLocality'] = city
    if not address:
        ld['address'].pop('streetAddress')
    if hours:
        ld['openingHours'] = schema_hours(hours)
    else:
        ld.pop('openingHours', None)
    same = [u for u in [ig, fb] if u]
    if same:
        ld['sameAs'] = same
    else:
        ld.pop('sameAs', None)
    ld_txt = json.dumps(ld, ensure_ascii=False, indent=2).replace('</', '<\\/')
    s = s[:m.start(2)] + '\n' + ld_txt + '\n' + s[m.end(2):]

    # ---------- 2. Канали: прибрати невідомі ----------
    known = {
        'phone': has_phone, 'email': bool(email), 'ig': bool(ig), 'fb': bool(fb),
        'viber': False, 'tg': False, 'wa': False, 'status': bool(hours),
    }
    if ig:
        alt_top = ('<a class="btn btn--sm btn--lime top__call" href="%s" target="_blank" rel="noopener">%s'
                   '<span>Написати в Instagram</span></a>' % (esc(ig), IG_SVG))
        alt_hero = '<a class="btn btn--ghost" href="%s" target="_blank" rel="noopener">Написати в Instagram</a>' % esc(ig)
        alt_mbar = '<a href="%s" target="_blank" rel="noopener">%sInstagram</a>' % (esc(ig), IG_SVG)
    else:
        alt_top = '<a class="btn btn--sm btn--lime top__call" href="#form">%s<span>Залишити заявку</span></a>' % FORM_SVG
        alt_hero = ''
        alt_mbar = '<a href="#prices">%sЦіни</a>' % FORM_SVG
    alts = {('phone', 'top'): alt_top, ('phone', 'hero'): alt_hero, ('phone', 'mbar'): alt_mbar}

    def ch(mo):
        chan, ident, inner = mo.group(1), mo.group(2), mo.group(3)
        if known.get(chan):
            return inner
        return alts.get((chan, ident), '')
    s = re.sub(r'<!--ch:(\w+)(?::(\w+))?-->(.*?)<!--/ch:\1(?::\2)?-->', ch, s, flags=re.S)
    n_links = sum(1 for c in ['phone', 'ig', 'fb', 'email'] if known[c])
    if n_links <= 3:  # мало кнопок — по одній у рядок, щоб довгі email/нікнейми не обрізались
        s = s.replace('<div class="links">', '<div class="links links--stack">')
    s = re.sub(r'\n[ \t]+(?=\n)', '\n', s)          # рядки, що стали порожніми
    s = re.sub(r'\n{3,}', '\n\n', s)

    # ---------- 3. Куди надсилати заявку ----------
    opts = []
    if has_phone:
        opts.append(('sms', 'SMS', 'Заявка відкриється як SMS на номер %s — залишиться натиснути «Надіслати».' % phone))
    if email:
        opts.append(('mail', 'Email', 'Заявка відкриється як лист на %s — залишиться натиснути «Надіслати».' % email))
    if not opts and ig:
        opts.append(('ig', 'Instagram', 'Текст заявки скопіюється, а Instagram відкриється — вставте його в Direct.'))
    if len(opts) > 1:
        chips = ''.join('<label><input type="radio" name="via" value="%s"%s><span>%s</span></label>'
                        % (v, ' checked' if i == 0 else '', l) for i, (v, l, _) in enumerate(opts))
        via_html = ('<fieldset class="field">\n          <legend>Куди надіслати заявку</legend>\n'
                    '          <div class="chips chips--sm">%s</div>\n        </fieldset>' % chips)
        intro = 'Заповніть форму — повідомлення з заявкою відкриється в обраному застосунку, залишиться натиснути «Надіслати».'
    elif opts:
        via_html = '<input type="hidden" name="via" value="%s">' % opts[0][0]
        intro = 'Заповніть форму. ' + opts[0][2]
    else:
        via_html = '<input type="hidden" name="via" value="none">'
        intro = 'Заповніть форму — текст заявки скопіюється, щоб ви могли надіслати його нам.'
    s = re.sub(r'<!--via-->.*?<!--/via-->', lambda _: via_html, s, flags=re.S)
    s = s.replace('Заповніть форму — повідомлення з заявкою відкриється в обраному застосунку, залишиться натиснути «Надіслати».', esc(intro))

    # ---------- 4. Посилання ----------
    if has_phone:
        s = s.replace('tel:+380000000000', 'tel:+' + e164)
    if email:
        s = s.replace('mailto:hello@example.com', 'mailto:' + esc(email))
    if ig:
        s = s.replace('https://www.instagram.com/username/', esc(ig))
    if fb:
        s = s.replace('https://www.facebook.com/username', esc(fb))
    q = quote(maps_q, safe='')
    s = re.sub(r'(https://www\.google\.com/maps\?q=)[^&"]*', lambda mo: mo.group(1) + q, s)
    s = re.sub(r'(destination=)[^&"]*', lambda mo: mo.group(1) + q, s)

    # ---------- 5. Токени ----------
    def outside_ld(fn):
        nonlocal s
        mo = re.search(r'<script type="application/ld\+json">.*?</script>', s, re.S)
        a, b = mo.start(), mo.end()
        # JSON-LD уже заповнений; захищаємо його від текстових замін
        head, mid, tail = s[:a], s[a:b], s[b:]
        head, tail = fn(head), fn(tail)
        s = head + mid + tail

    vals = {
        'НАЗВА': name, 'АДРЕСА': address, 'ТЕЛЕФОН': phone if has_phone else None, 'EMAIL': email,
        'ІНСТАГРАМ': ig_handle(lead) if ig else None, 'ГОДИНИ': hours_text,
    }

    def repl_tokens(t):
        # [МІСТО]: після «в/у» — місцевий відмінок, інакше називний
        t = re.sub(r'(\b[вуВУ])(\s|&nbsp;)(<span class="ph">)?\[МІСТО\](</span>)?',
                   lambda mo: mo.group(1) + mo.group(2) + esc(city_loc), t)
        t = re.sub(r'(<span class="ph">)?\[МІСТО\](</span>)?', lambda mo: esc(city), t)
        for k, v in vals.items():
            if v:
                t = t.replace('<span class="ph">[%s]</span>' % k, esc(v))
                t = t.replace('[%s]' % k, esc(v))
        return t
    outside_ld(repl_tokens)

    # Невідомий графік: живий статус уже вирізано, таблиця теж
    # ---------- 6. JS ----------
    js = open(os.path.join(ROOT, 'js/main.js'), encoding='utf-8').read()
    contact = {}
    if has_phone:
        contact['sms'] = 'sms:+' + e164
    if email:
        contact['email'] = email
    if ig:
        contact['ig'] = ig
    js = re.sub(r'/\*CONTACT\*/.*?/\*/CONTACT\*/', lambda _: json.dumps(contact, ensure_ascii=False), js, flags=re.S)
    js = re.sub(r'/\*HOURS\*/.*?/\*/HOURS\*/', lambda _: js_hours(hours) if hours else 'null', js, flags=re.S)

    # ---------- 7. Запис ----------
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
    open(os.path.join(outdir, 'index.html'), 'w', encoding='utf-8').write(s)
    open(os.path.join(outdir, 'js/main.js'), 'w', encoding='utf-8').write(js)

    left = sorted(set(re.findall(r'\[([A-ZА-ЯІЇЄҐ\'’]+)\]', s)))
    filled = [lbl for lbl, ok in [('назва', True), ('місто', bool(city)), ('адреса', bool(address)),
                                  ('телефон', has_phone), ('email', bool(email)), ('Instagram', bool(ig)),
                                  ('Facebook', bool(fb)), ('графік роботи', bool(hours or hours_text)),
                                  ('точка на карті', bool(maps_q))] if ok]
    hints = {"ЦІНА": 'ціни в прайсі, «рентгені», калькуляторі й hero (`від [ЦІНА] грн`)',
             "ІМ'Я": 'імена майстра й авторів відгуків', "РІК": 'рік заснування («Про нас»)',
             "ФОП": 'ФОП / ЄДРПОУ у футері', "ГОДИНИ": 'графік роботи (у OSM його немає)'}
    readme = ['# %s — демо-сайт' % name, '',
              'Шаблон: **remont-telefoniv** (ремонт телефонів і техніки).', '',
              '## Заповнено з OpenStreetMap', '']
    readme += ['- ' + x for x in filled]
    readme += ['', 'Viber, Telegram і WhatsApp невідомі — кнопки прибрано. Невідомі канали теж прибрано.', '',
               '## Що ще заповнити', '']
    readme += ['- `[%s]` — %s' % (t, hints.get(t, '')) for t in left]
    readme += ['- Приклади відгуків (картки з міткою «Приклад відгуку») — замінити на реальні.',
               '- Фото з Unsplash — бажано замінити на фото майстерні.', '']
    open(os.path.join(outdir, 'README.md'), 'w', encoding='utf-8').write('\n'.join(readme))
    return left


def main():
    if len(sys.argv) != 3:
        sys.exit('usage: personalize.py <lead.json> <outdir>')
    lead = json.load(open(sys.argv[1], encoding='utf-8'))
    if isinstance(lead, list):
        lead = lead[0]
    left = personalize(lead, sys.argv[2])
    bad = [t for t in left if t not in ALLOWED_LEFT]
    print('%s -> %s; left: %s' % (lead.get('slug'), sys.argv[2], ', '.join(left) or '—'))
    if bad:
        sys.exit('unexpected tokens left: %s' % bad)


if __name__ == '__main__':
    main()
