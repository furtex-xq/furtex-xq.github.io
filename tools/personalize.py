#!/usr/bin/env python3
"""Персоналізація шаблону СТО під конкретний лід.

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
DEFAULT_CITY_ENC = '%D0%86%D0%B2%D0%B0%D0%BD%D0%BE-%D0%A4%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA'
DAYS = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота']
SCHEMA_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']


def h(s):
    return html.escape(s, quote=True)


def must(s, old, new, count=1):
    """Заміна з перевіркою: шаблон змінився — падаємо, а не мовчки пропускаємо."""
    n = s.count(old)
    if n == 0 or (count and n != count):
        raise SystemExit('personalize: шаблон не містить очікуваного фрагмента (%d разів): %r' % (n, old[:90]))
    return s.replace(old, new)


def cut_line(s, needle):
    """Видаляє весь рядок, що містить needle (рівно один)."""
    lines = s.split('\n')
    idx = [i for i, l in enumerate(lines) if needle in l]
    if len(idx) != 1:
        raise SystemExit('personalize: очікував 1 рядок з %r, знайшов %d' % (needle, len(idx)))
    del lines[idx[0]]
    return '\n'.join(lines)


VOWELS = 'АЕЄИІЇОУЮЯаеєиіїоуюя'


def prep(orig, loc, prev=''):
    """в/у перед назвою міста за правилом милозвучності.
    «в» — перед голосним; «у» — перед в-, ф-, збігом приголосних або після приголосного."""
    first, second = loc[:1], loc[1:2]
    if first in VOWELS:
        p = 'в'
    elif first in 'ВвФф' or (second and second not in VOWELS) or (prev.isalpha() and prev not in VOWELS):
        p = 'у'
    else:
        p = 'в'
    return p.upper() if orig.isupper() else p


def schema_hours(hours):
    """{"0".."6": [o,c]|null} -> ["Mo-Sa 09:00-19:00", "Su 10:00-15:00"]"""
    order = [1, 2, 3, 4, 5, 6, 0]
    out, run = [], []
    for d in order + [None]:
        v = tuple(hours.get(str(d)) or ()) if d is not None else None
        if run and (d is None or v != run[0][1]):
            if run[0][1]:
                a, b = run[0][0], run[-1][0]
                days = SCHEMA_DAYS[a] if a == b else SCHEMA_DAYS[a] + '-' + SCHEMA_DAYS[b]
                out.append('%s %s-%s' % (days, run[0][1][0], run[0][1][1]))
            run = []
        if d is not None:
            run.append((d, v))
    return out


def text_hours(hours):
    short = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    order = [1, 2, 3, 4, 5, 6, 0]
    parts, run = [], []
    for d in order + [None]:
        v = tuple(hours.get(str(d)) or ()) if d is not None else None
        if run and (d is None or v != run[0][1]):
            a, b = run[0][0], run[-1][0]
            days = short[a] if a == b else short[a] + '–' + short[b]
            parts.append(days + (' %s–%s' % run[0][1] if run[0][1] else ' вихідний'))
            run = []
        if d is not None:
            run.append((d, v))
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
    email = lead.get('email') or None
    insta = lead.get('instagram') or None
    insta_handle = lead.get('instagram_handle') or None
    if insta and not insta_handle:
        insta_handle = insta.rstrip('/').rsplit('/', 1)[-1]
    fb = lead.get('facebook') or None
    hours = lead.get('hours') or None
    hours_text = lead.get('hours_text') or (text_hours(hours) if hours else None)
    maps_q = lead.get('maps_query') or ', '.join(x for x in (address, city) if x) or None
    slug = lead.get('slug') or 'demo'
    demo_url = DEMO_BASE.format(slug=slug)

    if not phone and not email and not insta:
        raise SystemExit('personalize: у ліда немає ні телефону, ні email, ні Instagram — формі нікуди надсилати заявку')

    s = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    js = open(os.path.join(ROOT, 'js/main.js'), encoding='utf-8').read()

    # ---------- JSON-LD ----------
    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', s, re.S)
    ld = json.loads(m.group(2))
    if name:
        ld['name'] = name
    if city:
        ld['description'] = 'СТО %s %s: діагностика, ремонт ходової, гальм і двигуна, ТО, шиномонтаж, кондиціонери.' % (prep('в', city_loc), city_loc)
        ld['address']['addressLocality'] = city
        ld['areaServed'] = city
    if address:
        ld['address']['streetAddress'] = address
    if phone:
        ld['telephone'] = '+' + e164
    else:
        ld.pop('telephone', None)
    if email:
        ld['email'] = email
    else:
        ld.pop('email', None)
    if hours:
        ld['openingHours'] = schema_hours(hours)
    else:
        ld.pop('openingHours', None)
    same = [u for u in (insta, fb) if u]
    if same:
        ld['sameAs'] = same
    else:
        ld.pop('sameAs', None)
    ld['url'] = demo_url
    ld_txt = '\n' + json.dumps(ld, ensure_ascii=False, indent=2).replace('</', '<\\/') + '\n'
    s = s[:m.start(2)] + ld_txt + s[m.end(2):]

    # ---------- head ----------
    s = must(s, '<meta property="og:url" content="https://raw.githack.com/furtex-xq/furtex-xq.github.io/template/sto/index.html">',
             '<meta property="og:url" content="%s">' % h(demo_url))

    # ---------- hero eyebrow: назва + адреса ----------
    if name:
        where = address or None
        eb = h(name) + ((' · ' + h(where)) if where else (' · <span class="ph">[АДРЕСА]</span>'))
        s = must(s, '<p class="eyebrow eyebrow--light">СТО · <span class="ph">[МІСТО]</span> · <span class="ph">[АДРЕСА]</span></p>',
                 '<p class="eyebrow eyebrow--light">%s</p>' % eb)

    # ---------- кнопки зв'язку ----------
    s = cut_line(s, 'class="lk" href="viber://')
    s = cut_line(s, 'class="lk" href="https://t.me/')
    s = cut_line(s, 'class="lk" href="https://wa.me/')
    n_small = 0
    if insta:
        s = must(s, '<a class="lk" href="https://www.instagram.com/username/"', '<a class="lk" href="%s"' % h(insta))
        n_small += 1
    else:
        s = cut_line(s, 'class="lk" href="https://www.instagram.com/username/"')
    if fb:
        s = must(s, '<a class="lk" href="https://www.facebook.com/username"', '<a class="lk" href="%s"' % h(fb))
        n_small += 1
    else:
        s = cut_line(s, 'class="lk" href="https://www.facebook.com/username"')
    if email:
        n_small += 1
    else:
        s = cut_line(s, '<a class="lk" href="mailto:hello@example.com">')
    if not phone:
        s = must(s, '<a class="lk lk--main" href="tel:+380000000000"><svg class="ic"><use href="#i-phone"/></svg>Подзвонити</a>',
                 '<a class="lk lk--main" href="#zapys"><svg class="ic"><use href="#i-cal"/></svg>Записатися онлайн</a>')
    s = must(s, '<div class="links" aria-label', '<div class="links links--n%d" aria-label' % n_small)

    # Instagram над галереєю
    if insta:
        s = must(s, '<a class="btn btn--ghost" href="https://www.instagram.com/username/"', '<a class="btn btn--ghost" href="%s"' % h(insta))
        s = must(s, 'Більше в Instagram <span class="ph">[ІНСТАГРАМ]</span>', 'Більше в Instagram @%s' % h(insta_handle))
    else:
        s = cut_line(s, '<a class="btn btn--ghost" href="https://www.instagram.com/username/"')

    # Email у контактах і футері
    if not email:
        s = cut_line(s, '<p><svg class="ic"><use href="#i-mail"/></svg><a href="mailto:hello@example.com">')
        s = must(s, ' · <a href="mailto:hello@example.com"><span class="ph">[EMAIL]</span></a>', '')

    # Телефон
    if phone:
        s = s.replace('tel:+380000000000', 'tel:+' + e164)
    else:
        s = cut_line(s, '<a class="nav__tel" href="tel:+380000000000">')
        s = cut_line(s, '<a class="hero__tel" href="tel:+380000000000">')
        s = cut_line(s, '<p><svg class="ic"><use href="#i-phone"/></svg><a href="tel:+380000000000">')
        s = must(s, 'Не знайшли відповіді? Наберіть <a href="tel:+380000000000"><span class="ph">[ТЕЛЕФОН]</span></a> — майстер підкаже.',
                 'Не знайшли відповіді? <a href="#zapys">Напишіть нам</a> — майстер підкаже.')
        s = must(s, '<p><a href="tel:+380000000000"><span class="ph">[ТЕЛЕФОН]</span></a>', '<p>')
        s = s.replace(' Запис: [ТЕЛЕФОН].', '')
        if insta:
            s = must(s, '<a href="tel:+380000000000"><svg class="ic"><use href="#i-phone"/></svg>Дзвінок</a>',
                     '<a href="%s" target="_blank" rel="noopener"><svg class="ic"><use href="#i-insta"/></svg>Instagram</a>' % h(insta))
        else:
            s = must(s, '<a href="tel:+380000000000"><svg class="ic"><use href="#i-phone"/></svg>Дзвінок</a>',
                     '<a href="mailto:%s"><svg class="ic"><use href="#i-mail"/></svg>Email</a>' % h(email))
    if email:
        s = s.replace('mailto:hello@example.com', 'mailto:' + email)

    # ---------- форма: лише відомі канали ----------
    chans = []
    if phone:
        chans.append(('sms', 'i-phone', 'SMS'))
    if email:
        chans.append(('mail', 'i-mail', 'Email'))
    if not chans:
        chans.append(('ig', 'i-insta', 'Instagram'))
    fs = re.search(r'        <fieldset class="f via">.*?</fieldset>\n', s, re.S)
    if len(chans) == 1:
        new = '        <input type="hidden" name="via" value="%s">\n' % chans[0][0]
    else:
        labels = ''.join('          <label><input type="radio" name="via" value="%s"%s><span><svg class="ic"><use href="#%s"/></svg>%s</span></label>\n'
                         % (v, ' checked' if i == 0 else '', ic, t) for i, (v, ic, t) in enumerate(chans))
        new = '        <fieldset class="f via via--2">\n          <legend>Куди надіслати заявку</legend>\n' + labels + '        </fieldset>\n'
    s = s[:fs.start()] + new + s[fs.end():]
    fine = {('sms',): 'Натискаючи кнопку, ви відкриєте SMS із готовим текстом заявки на наш номер.',
            ('mail',): 'Натискаючи кнопку, ви відкриєте поштову програму з готовим листом.',
            ('sms', 'mail'): 'Натискаючи кнопку, ви відкриєте SMS або пошту з готовим текстом заявки.',
            ('ig',): 'Натискаючи кнопку, ви скопіюєте текст заявки й відкриєте наш Instagram.'}[tuple(c[0] for c in chans)]
    s = must(s, 'Натискаючи кнопку, ви відкриєте месенджер або пошту з готовим текстом заявки.', fine)

    js = re.sub(r"  var CONTACT = \{.*?\n  \};",
                "  var CONTACT = {\n    telegram: '',\n    viber: '',\n    mail: %s,\n    sms: %s,\n    insta: %s\n  };" % (
                    json.dumps('mailto:' + email if email else ''), json.dumps('sms:+' + e164 if phone else ''), json.dumps(insta or '')),
                js, count=1, flags=re.S)
    if name:
        js = must(js, "var text = 'Заявка на СТО з сайту\\n' +", "var text = 'Заявка на СТО з сайту — ' + %s + '\\n' +" % json.dumps(name))

    # ---------- карта й маршрут ----------
    if maps_q:
        q = urllib.parse.quote(maps_q, safe='')
        s = must(s, 'maps?q=%s&amp;output=embed' % DEFAULT_CITY_ENC, 'maps?q=%s&amp;output=embed' % q)
        s = must(s, 'destination=%s' % DEFAULT_CITY_ENC, 'destination=%s' % q, count=2)
        if name:
            s = must(s, 'title="Розташування СТО на мапі"', 'title="%s на мапі"' % h(name))

    # ---------- графік ----------
    hm = re.search(r"<div class=\"hours\" id=\"hours\" data-schedule='[^']*'>", s)
    if hours:
        sched = {str(d): (list(hours[str(d)]) if hours.get(str(d)) else None) for d in range(7)}
        s = s[:hm.start()] + "<div class=\"hours\" id=\"hours\" data-schedule='%s'>" % json.dumps(sched, separators=(',', ':')) + s[hm.end():]
        for d in range(7):
            v = sched[str(d)]
            cell = '%s–%s' % (v[0], v[1]) if v else 'вихідний'
            s = re.sub(r'(<div data-day="%d"><dt>[^<]*</dt><dd>)<span class="ph">[^<]*</span>(</dd></div>)' % d,
                       lambda mm: mm.group(1) + cell + mm.group(2), s, count=1)
        s = must(s, '<p class="hours__sum"><span class="ph">[ГОДИНИ]</span></p>', '<p class="hours__sum">%s</p>' % h(hours_text))
    else:
        s = s[:hm.start()] + '<div class="hours" id="hours">' + s[hm.end():]
        s = must(s, '<span class="status" data-status><i></i><span data-status-text>Графік роботи</span></span>', '')
        s = must(s, '<span class="status status--big" data-status><i></i><span data-status-text>—</span></span>', '')
        s = re.sub(r'\n\s*<dl class="hours__table">.*?</dl>', '', s, count=1, flags=re.S)
        if hours_text:
            s = must(s, '<p class="hours__sum"><span class="ph">[ГОДИНИ]</span></p>', '<p class="hours__sum">%s</p>' % h(hours_text))
        s = s.replace('<p class="hours__sum">', '<p class="hours__sum" style="margin:0;font-size:17px;color:inherit">', 1)

    # ---------- текстові токени ----------
    known = {'[НАЗВА]': name, '[АДРЕСА]': address, '[ТЕЛЕФОН]': phone, '[EMAIL]': email,
             '[ГОДИНИ]': hours_text, '[ІНСТАГРАМ]': ('@' + insta_handle) if insta_handle else None}
    if city:
        known['[МІСТО]'] = city
    if city:
        s = s.replace('[АДРЕСА]</span>, <span class="ph">[МІСТО]</span>', '[АДРЕСА]</span>, <span style="white-space:nowrap">[МІСТО]</span>')
    for tok, val in known.items():
        if val:
            s = s.replace('<span class="ph">%s</span>' % tok, tok)
    if city:
        s = re.sub(r'(\w?)(\s?)(?<![\w])([вуВУ])(\s|&nbsp;)\[МІСТО\]',
                   lambda mm: mm.group(1) + mm.group(2) + prep(mm.group(3), city_loc, mm.group(1) if mm.group(2) else '') + mm.group(4) + h(city_loc), s)
    for tok, val in known.items():
        if val:
            s = s.replace(tok, h(val))
            js = js.replace(tok, val.replace("'", "\\'"))

    # місто в H1 не переносимо по дефісу («Івано-/Франківську»)
    s = re.sub(r'(<h1 id="h1" class="hero__title">Ремонт авто )([вуВУ]&nbsp;)([^,<]+)(,)',
               lambda mm: mm.group(1) + '<span style="white-space:nowrap">' + mm.group(2) + mm.group(3) + mm.group(4) + '</span>', s, count=1)

    # ---------- перевірки ----------
    for bad in ('380000000000', 'example.com', '/username', 'viber://', 't.me/', 'wa.me/'):
        if bad in s or bad in js:
            raise SystemExit('personalize: залишився сентинел %r' % bad)
    left = sorted(set(re.findall(r'\[[^\]\s<>"]{2,12}\]', s)))
    allowed = {'[ЦІНА]', "[ІМ'Я]", '[РІК]', '[ФОП]'} | {t for t, v in known.items() if not v} | ({'[МІСТО]'} if not city else set())
    extra = [t for t in left if t not in allowed]
    if extra:
        raise SystemExit('personalize: неочікувані токени %r' % extra)

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
    remain = sorted(set(left))
    readme = ['# %s — демо-сайт СТО' % (name or 'СТО'), '',
              'Персоналізована копія шаблону **«СТО / автосервіс»** (`template/sto`).', '',
              'Демо: %s' % demo_url, '',
              '## Заповнено з OpenStreetMap', ''] + ['- %s' % x for x in filled] + [
              '', 'Канали, яких немає в OSM (Viber, Telegram, WhatsApp%s%s), прибрані з кнопок і форми.' % (
                  '' if email else ', email', '' if insta else ', Instagram') ,
              '', '## Що ще заповнити', ''] + ['- `%s` (позначено жовтим пунктиром)' % t for t in remain] + [
              '- 3 відгуки-приклади (картки `ph-card`) — замінити на реальні',
              '- фото — зараз стокові з Unsplash, краще замінити на фото сервісу',
              '- коефіцієнти класу авто в калькуляторі (×1 / ×1,2 / ×1,4) — узгодити з власником', '']
    if not hours and not hours_text:
        readme.insert(-1, '- графік роботи (`[ГОДИНИ]`) — живий статус «відчинено/зачинено» вимкнено, доки графік невідомий')
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
