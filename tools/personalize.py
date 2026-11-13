#!/usr/bin/env python3
"""Персоналізація шаблону «Автомийка / детейлінг» під конкретний лід.

    python3 tools/personalize.py <lead.json> <outdir>

lead.json — один об'єкт ліда (або список з одним об'єктом). Пише повну копію сайту в <outdir>,
робоче дерево шаблону не змінює. Лише стандартна бібліотека.
"""
import html
import json
import os
import re
import shutil
import sys
import urllib.parse

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SITE_FILES = ['index.html', 'robots.txt', 'css/style.css', 'js/main.js', 'img/favicon.svg']
SITE_DIRS = ['fonts']
DEMO_BASE = 'https://raw.githack.com/furtex-xq/furtex-xq.github.io/beta/{slug}/index.html'
TPL_URL = 'https://raw.githack.com/furtex-xq/furtex-xq.github.io/template/avtomyika/index.html'
DEFAULT_CITY_ENC = '%D0%86%D0%B2%D0%B0%D0%BD%D0%BE-%D0%A4%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA'
DAYS = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота']
SCHEMA_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
# коди мобільних операторів України — на такі номери можна надіслати SMS
MOBILE = {'39', '50', '63', '66', '67', '68', '73', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'}
VOWELS = 'АЕЄИІЇОУЮЯаеєиіїоуюя'


def h(s):
    return html.escape(s, quote=True)


def must(s, old, new, count=1):
    """Заміна з перевіркою: якщо шаблон змінився — падаємо, а не мовчки пропускаємо."""
    n = s.count(old)
    if n == 0 or (count and n != count):
        raise SystemExit('personalize: шаблон не містить очікуваного фрагмента (%d разів): %r' % (n, old[:90]))
    return s.replace(old, new)


def cut_line(s, needle, count=1):
    lines = s.split('\n')
    idx = [i for i, l in enumerate(lines) if needle in l]
    if len(idx) != count:
        raise SystemExit('personalize: очікував %d рядк(ів) з %r, знайшов %d' % (count, needle, len(idx)))
    return '\n'.join(l for i, l in enumerate(lines) if i not in idx)


def prep(orig, loc, prev=''):
    """в/у перед назвою міста за правилом милозвучності."""
    first, second = loc[:1], loc[1:2]
    if first in VOWELS:
        p = 'в'
    elif first in 'ВвФф' or (second and second not in VOWELS) or (prev.isalpha() and prev not in VOWELS):
        p = 'у'
    else:
        p = 'в'
    return p.upper() if orig.isupper() else p


def runs(hours):
    order = [1, 2, 3, 4, 5, 6, 0]
    out, run = [], []
    for d in order + [None]:
        v = tuple(hours.get(str(d)) or ()) if d is not None else None
        if run and (d is None or v != run[0][1]):
            out.append((run[0][0], run[-1][0], run[0][1]))
            run = []
        if d is not None:
            run.append((d, v))
    return out


def schema_hours(hours):
    return ['%s %s-%s' % (SCHEMA_DAYS[a] if a == b else SCHEMA_DAYS[a] + '-' + SCHEMA_DAYS[b], v[0], v[1])
            for a, b, v in runs(hours) if v]


def text_hours(hours):
    short = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    parts = [(short[a] if a == b else short[a] + '–' + short[b]) + (' %s–%s' % v if v else ' вихідний') for a, b, v in runs(hours)]
    if len(parts) == 1 and parts[0].startswith('Пн–Нд'):
        return 'Щодня' + parts[0][5:]
    return ', '.join(parts)


def build(lead, outdir):
    name = lead.get('name') or None
    city = lead.get('city') or None
    city_loc = lead.get('city_loc') or city
    address = lead.get('address') or None
    phone = lead.get('phone') or None
    e164 = (lead.get('phone_e164') or '').lstrip('+') or None
    if phone and not e164:
        e164 = re.sub(r'\D', '', phone) or None
    if e164 and not phone:
        phone = '+' + e164
    mobile = bool(e164 and e164.startswith('380') and e164[3:5] in MOBILE)
    email = lead.get('email') or None
    insta = lead.get('instagram') or None
    handle = (lead.get('instagram_handle') or '').lstrip('@') or None
    if insta and not handle:
        handle = insta.rstrip('/').rsplit('/', 1)[-1]
    if handle and not insta:
        insta = 'https://www.instagram.com/%s/' % handle
    fb = lead.get('facebook') or None
    hours = lead.get('hours') or None
    if hours and not any(hours.get(str(d)) for d in range(7)):
        hours = None
    hours_text = lead.get('hours_text') or (text_hours(hours) if hours else None)
    maps_q = lead.get('maps_query') or ', '.join(x for x in (address, city) if x) or None
    slug = lead.get('slug') or 'demo'
    demo_url = DEMO_BASE.format(slug=slug)
    generic = bool(name) and re.sub(r'\W', '', name.lower()) in ('автомийка', 'мийка', 'автомийкасамообслуговування', 'carwash')

    if not phone and not email and not insta:
        raise SystemExit('personalize: у ліда немає ні телефону, ні email, ні Instagram — нікуди надсилати заявку')

    s = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    js = open(os.path.join(ROOT, 'js/main.js'), encoding='utf-8').read()

    # ---------- JSON-LD ----------
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    if name:
        ld['name'] = name
    if city:
        ld['description'] = 'Автомийка й детейлінг %s %s: ручна мийка, комплекс, хімчистка салону, полірування кузова.' % (prep('у', city_loc), city_loc)
        ld['address']['addressLocality'] = city
        ld['areaServed'] = city
    if address:
        ld['address']['streetAddress'] = address
    else:
        ld['address'].pop('streetAddress')
    for key, val in (('telephone', '+' + e164 if e164 else None), ('email', email)):
        if val:
            ld[key] = val
        else:
            ld.pop(key, None)
    if hours:
        ld['openingHours'] = schema_hours(hours)
    else:
        ld.pop('openingHours', None)
    ld.pop('priceRange', None)
    same = [u for u in (insta, fb) if u]
    if same:
        ld['sameAs'] = same
    else:
        ld.pop('sameAs', None)
    ld['url'] = demo_url
    ld_txt = '\n' + json.dumps(ld, ensure_ascii=False, indent=2).replace('</', '<\\/') + '\n'
    s = s[:m.start(2)] + ld_txt + s[m.end(2):]

    s = must(s, '<meta property="og:url" content="%s">' % TPL_URL, '<meta property="og:url" content="%s">' % h(demo_url))

    # ---------- заголовки під назву ----------
    if generic and city:
        s = must(s, '<title>[НАЗВА] — автомийка й детейлінг, [МІСТО] | мийка, хімчистка, полірування</title>',
                 '<title>%s %s %s — мийка, хімчистка салону, полірування</title>' % (h(name), prep('у', city_loc), h(city_loc)))
        s = must(s, 'content="Автомийка [НАЗВА], [МІСТО]: ', 'content="%s %s %s: ' % (h(name), prep('у', city_loc), h(city_loc)))
        s = must(s, '<meta property="og:title" content="[НАЗВА] — автомийка й детейлінг, [МІСТО]">',
                 '<meta property="og:title" content="%s %s %s — мийка й детейлінг">' % (h(name), prep('у', city_loc), h(city_loc)))
        s = must(s, '<span class="ph">[НАЗВА]</span>&nbsp;— мийка, де за машиною справді доглядають',
                 '<span class="ph">[НАЗВА]</span>&nbsp;— місце, де за машиною справді доглядають')

    # ---------- кнопки зв'язку ----------
    s = cut_line(s, '<a class="lk" href="viber://')
    s = cut_line(s, '<a class="lk" href="https://t.me/')
    s = cut_line(s, '<a class="lk" href="https://wa.me/')
    if insta:
        s = must(s, '<a class="lk" href="https://www.instagram.com/username/"', '<a class="lk" href="%s"' % h(insta))
    else:
        s = cut_line(s, '<a class="lk" href="https://www.instagram.com/username/"')
    if fb:
        s = must(s, '<a class="lk" href="https://www.facebook.com/username"', '<a class="lk" href="%s"' % h(fb))
    else:
        s = cut_line(s, '<a class="lk" href="https://www.facebook.com/username"')
    if email:
        s = s.replace('mailto:hello@example.com', 'mailto:' + email)
    else:
        s = cut_line(s, '<a class="lk" href="mailto:hello@example.com">')
        s = cut_line(s, '<li><svg class="ic"><use href="#i-mail"/></svg><a href="mailto:hello@example.com">')

    # ---------- телефон ----------
    if phone:
        s = s.replace('tel:+380000000000', 'tel:+' + e164)
    else:
        s = must(s, '<a class="lk lk--main" href="tel:+380000000000"><svg class="ic"><use href="#i-phone"/></svg>Подзвонити</a>',
                 '<a class="lk lk--main" href="#zapys"><svg class="ic"><use href="#i-cal"/></svg>Записатися онлайн</a>')
        s = cut_line(s, '<a class="top__tel" href="tel:+380000000000">')
        s = cut_line(s, '<a class="btn btn--line" href="tel:+380000000000">')
        s = cut_line(s, '<li><svg class="ic"><use href="#i-phone"/></svg><a href="tel:+380000000000">')
        s = cut_line(s, '<p><a href="tel:+380000000000"><span class="ph">[ТЕЛЕФОН]</span></a></p>')
        s = must(s, 'Не знайшли відповіді? Наберіть <a href="tel:+380000000000"><span class="ph">[ТЕЛЕФОН]</span></a>&nbsp;— підкажемо',
                 'Не знайшли відповіді? <a href="#zapys">Напишіть нам</a>&nbsp;— підкажемо')
        s = s.replace(' Ціни від класу авто, запис на зручний час — [ТЕЛЕФОН].', ' Ціни від класу авто, запис на зручний час.')
        s = cut_line(s, '<a href="tel:+380000000000"><svg class="ic"><use href="#i-phone"/></svg>Дзвінок</a>')
        s = must(s, '<nav class="bar" aria-label="Швидкі дії">', '<nav class="bar" data-n="2" aria-label="Швидкі дії">')

    # ---------- форма: лише відомі канали ----------
    chans = []
    if phone and mobile:
        chans.append(('sms', 'sms:+' + e164, 'i-sms', 'SMS'))
    if handle:
        chans.append(('instagram', 'https://ig.me/m/' + handle, 'i-insta', 'Instagram'))
    if email:
        chans.append(('email', 'mailto:' + email, 'i-mail', 'Email'))
    fs = re.search(r'        <fieldset class="f via" id="via">.*?</fieldset>\n', s, re.S)
    if not chans:
        # лише стаціонарний номер: онлайн-заявку надіслати нікуди — пропонуємо подзвонити
        new = ('        <p class="form__call">Заявки з сайту поки приймаємо телефоном: <a href="tel:+%s">%s</a>. '
               'Заповніть поля, щоб нічого не забути під час дзвінка.</p>\n' % (e164, h(phone)))
        s = s[:fs.start()] + new + s[fs.end():]
        s = must(s, '<button class="btn btn--cyan btn--full" type="submit"><svg class="ic"><use href="#i-send"/></svg>Надіслати заявку</button>',
                 '<a class="btn btn--cyan btn--full" href="tel:+%s"><svg class="ic"><use href="#i-phone"/></svg>Зателефонувати</a>' % e164)
        sub = 'Оберіть пакет і зручний час — і просто наберіть нас.'
    else:
        if len(chans) == 1:
            v, url, ic, t = chans[0]
            new = '        <input type="hidden" name="via" value="%s" data-url="%s">\n' % (v, h(url))
        else:
            labels = ''.join('          <label><input type="radio" name="via" value="%s" data-url="%s"%s><span><svg class="ic"><use href="#%s"/></svg>%s</span></label>\n'
                             % (v, h(url), ' checked' if i == 0 else '', ic, t) for i, (v, url, ic, t) in enumerate(chans))
            new = '        <fieldset class="f via" id="via">\n          <legend>Куди надіслати заявку</legend>\n' + labels + '        </fieldset>\n'
        s = s[:fs.start()] + new + s[fs.end():]
        kinds = tuple(c[0] for c in chans)
        sub = {('sms',): 'Заповніть — і відкриється SMS із готовим текстом заявки на наш номер.',
               ('email',): 'Заповніть — і відкриється лист із готовим текстом заявки.',
               ('instagram',): 'Заповніть — ми скопіюємо текст заявки й відкриємо наш Instagram Direct.'}.get(
            kinds, 'Заповніть — і заявка відкриється в %s з уже готовим текстом.' % ' чи '.join(
                {'sms': 'SMS', 'instagram': 'Instagram', 'email': 'пошті'}[k] for k in kinds).replace(' чи ', ', ', len(kinds) - 2))
    s = must(s, 'Заповніть — і заявка відкриється в зручному месенджері з уже готовим текстом.', sub)
    if 'instagram' in [c[0] for c in chans]:
        s = must(s, 'Telegram та Instagram не підставляють текст самі', 'Instagram не підставляє текст сам')
    else:
        s = cut_line(s, '<p class="form__fine" id="viaNote">')

    if name:
        js = must(js, "var BIZ = '[НАЗВА]';", 'var BIZ = %s;' % json.dumps(name, ensure_ascii=False))

    # ---------- карта й маршрут ----------
    if maps_q:
        q = urllib.parse.quote(maps_q, safe='')
        s = must(s, 'maps?q=%s&amp;output=embed' % DEFAULT_CITY_ENC, 'maps?q=%s&amp;output=embed' % q)
        s = must(s, 'destination=%s' % DEFAULT_CITY_ENC, 'destination=%s' % q, count=2)

    # ---------- графік ----------
    if hours:
        items = []
        for d in [1, 2, 3, 4, 5, 6, 0]:
            v = hours.get(str(d))
            if v:
                items.append('          <li data-day="%d" data-open="%s" data-close="%s"><span>%s</span><span>%s–%s</span></li>' % (d, v[0], v[1], DAYS[d], v[0], v[1]))
            else:
                items.append('          <li data-day="%d"><span>%s</span><span>вихідний</span></li>' % (d, DAYS[d]))
        s = re.sub(r'(<ul class="hours__list" id="hoursList">\n).*?(\n        </ul>)', lambda mm: mm.group(1) + '\n'.join(items) + mm.group(2), s, count=1, flags=re.S)
    else:
        s = re.sub(r'\n        <ul class="hours__list" id="hoursList">.*?</ul>', '', s, count=1, flags=re.S)
        s = cut_line(s, '<span class="status status--big" data-status>')
        s = cut_line(s, '<li class="hero__status">')
        s = must(s, '<ul class="hero__facts">', '<ul class="hero__facts hero__facts--2">')

    # ---------- текстові токени ----------
    known = {'[НАЗВА]': name, '[МІСТО]': city, '[АДРЕСА]': address, '[ТЕЛЕФОН]': phone, '[EMAIL]': email,
             '[ГОДИНИ]': hours_text, '[ІНСТАГРАМ]': ('@' + handle) if handle else None}
    if address and city:
        s = s.replace('<span class="ph">[АДРЕСА]</span>, <span class="ph">[МІСТО]</span>', '[АДРЕСА], <span class="nw">[МІСТО]</span>')
    for tok, val in known.items():
        if val:
            s = s.replace('<span class="ph">%s</span>' % tok, tok)
    if city:
        s = re.sub(r'(\w?)(\s?)(?<![\w])([вуВУ])(\s|&nbsp;)\[МІСТО\]',
                   lambda mm: mm.group(1) + mm.group(2) + prep(mm.group(3), city_loc, mm.group(1) if mm.group(2) else '') + mm.group(4) + h(city_loc), s)
    for tok, val in known.items():
        if val:
            s = s.replace(tok, h(val))

    # ---------- перевірки ----------
    for bad in ('380000000000', 'example.com', '/username', 'viber://', 't.me/', 'wa.me/'):
        if bad in s or bad in js:
            raise SystemExit('personalize: залишився сентинел %r' % bad)
    left = sorted(set(re.findall(r'\[[^\]\s<>"]{2,12}\]', s)))
    allowed = {'[ЦІНА]', "[ІМ'Я]", '[РІК]', '[ФОП]'} | {t for t, v in known.items() if not v}
    extra = [t for t in left if t not in allowed]
    if extra:
        raise SystemExit('personalize: неочікувані токени %r' % extra)
    json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S).group(1))

    # ---------- запис ----------
    if os.path.exists(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    for f in SITE_FILES:
        os.makedirs(os.path.dirname(os.path.join(outdir, f)) or outdir, exist_ok=True)
        shutil.copy2(os.path.join(ROOT, f), os.path.join(outdir, f))
    for d in SITE_DIRS:
        shutil.copytree(os.path.join(ROOT, d), os.path.join(outdir, d))
    open(os.path.join(outdir, 'index.html'), 'w', encoding='utf-8').write(s)
    open(os.path.join(outdir, 'js/main.js'), 'w', encoding='utf-8').write(js)

    filled = [lbl for lbl, v in (('назва', name), ('місто', city), ('адреса', address), ('телефон', phone), ('email', email),
                                ('Instagram', insta), ('Facebook', fb), ('графік роботи', hours or hours_text), ('точка на карті', maps_q)) if v]
    gone = ['Viber', 'Telegram', 'WhatsApp'] + [x for x, v in (('email', email), ('Instagram', insta), ('Facebook', fb)) if not v]
    readme = ['# %s — демо-сайт автомийки' % (name or 'Автомийка'), '',
              'Персоналізована копія шаблону **«Автомийка / детейлінг»** (`template/avtomyika`).', '',
              'Демо: %s' % demo_url, '',
              '## Заповнено з OpenStreetMap', ''] + ['- %s' % x for x in filled] + [
              '', 'Канали, яких немає в OSM (%s), прибрані з кнопок і форми. Заявка з форми йде: %s.' % (
                  ', '.join(gone), ', '.join(c[3] for c in chans) if chans else 'дзвінком (номер стаціонарний)'),
              '', '## Що ще заповнити', ''] + ['- `%s` (позначено жовтим пунктиром)' % t for t in left] + [
              '- 3 відгуки-приклади (картки `ph-card`) — замінити на реальні',
              '- фото — зараз стокові з Unsplash, краще замінити на фото мийки',
              '- тривалості й склад пакетів (`PACKS` у `js/main.js`) — узгодити з власником', '']
    if not hours:
        readme.insert(-1, '- точний графік по днях — живий статус «відчинено/зачинено» вимкнено, доки графік невідомий')
    open(os.path.join(outdir, 'README.md'), 'w', encoding='utf-8').write('\n'.join(readme))
    return outdir


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    lead = json.load(open(sys.argv[1], encoding='utf-8'))
    if isinstance(lead, list):
        if len(lead) != 1:
            raise SystemExit('personalize: передайте файл з одним лідом')
        lead = lead[0]
    print(build(lead, sys.argv[2]))


if __name__ == '__main__':
    main()
