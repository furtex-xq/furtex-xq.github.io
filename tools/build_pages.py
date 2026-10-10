"""Собирает отдельные страницы приложений (/tidemark/, /mfs/, /python/, /monko/, /dealio/) и sitemap.xml
из главной index.html. Запускать после любого изменения блока приложения на главной:

    python tools/build_pages.py
"""
import json, os, re, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'https://furtex-xq.github.io/'
REL = 'https://github.com/furtex-xq/furtex-xq.github.io/releases/latest/download/'

APPS = {
    'tidemark': dict(name='Tidemark', title='Tidemark — крипто-трекер для Android',
                     desc='Tidemark: живые цены криптовалют, графики с индикаторами, портфель, уведомления и обучение. Онлайн-демо и скачивание APK.',
                     cat='FinanceApplication', apk='Tidemark.apk', ver='1.0.1'),
    'mfs': dict(name='Math for Speed', title='Math for Speed — тренажёр устного счёта',
                desc='Math for Speed: считай в уме быстрее таймера. Режимы, уровни, учебник и награды. Онлайн-демо и скачивание APK.',
                cat='EducationalApplication', apk='MathForSpeed.apk', ver='1.25'),
    'python': dict(name='Python с нуля до профи', title='Python с нуля до профи — приложение по программированию',
                   desc='Учись программировать на Python в телефоне: 32 главы, тесты, задачи с автопроверкой и запуск кода. Онлайн-демо и скачивание APK.',
                   cat='EducationalApplication', apk='PythonBook.apk', ver=None),
    'monko': dict(name='Monko', title='Monko — личные финансы для Android',
                  desc='Monko: счета в разных валютах, бюджеты, цели, долги и статистика в премиальном дизайне. Онлайн-демо и скачивание APK.',
                  cat='FinanceApplication', apk='Monko.apk', ver='1.0.0'),
    'dealio': dict(name='Dealio', title='Dealio — сравнение цен и скидок',
                   desc='Dealio сравнивает цены в магазинах рядом и подсказывает, где купить дешевле. Приложение в разработке.',
                   cat='ShoppingApplication', apk=None, ver=None),
}


def cut(html, start_marker, end_marker, from_pos=0, include_end=True):
    a = html.index(start_marker, from_pos)
    b = html.index(end_marker, a) + (len(end_marker) if include_end else 0)
    return html[a:b]


def main():
    src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    head = cut(src, '<head>', '</head>')
    symbols = cut(src, '<svg width="0" height="0"', '</svg>')
    nav = cut(src, '<nav>', '</nav>')
    apps_grid = cut(src, '<div class="apps reveal">', '</div>\n\n<!-- TIDEMARK -->', include_end=False).rstrip() + '\n</div>'
    how = cut(src, '<section class="how reveal" id="install">', '</section>')
    about = cut(src, '<section class="about reveal" id="about">', '</section>')
    footer = cut(src, '<footer>', '</footer>')
    scripts = '\n'.join(re.findall(r'<script src="[^"]+" defer></script>', src))

    for key, a in APPS.items():
        section = cut(src, '<section class="proj', '</section>', src.index(f'id="{key}"') - 60)
        assert f'id="{key}"' in section[:200], key
        section = re.sub(r'\s*<a class="page-link"[^>]*>[^<]*</a>', '', section)          # на своей странице ссылка на себя не нужна
        section = section.replace('<h2', '<h1', 1).replace('</h2>', '</h1>', 1)            # главный заголовок страницы
        grid = apps_grid.replace(f'href="#{key}"', f'href="{key}/" aria-current="page"')
        grid = re.sub(r'href="#(tidemark|mfs|python|monko|dealio)"', r'href="\1/"', grid)

        h = head
        h = re.sub(r'<title>[^<]*</title>', f'<title>{a["title"]} · Ansaro Technologies</title>', h)
        h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{a["desc"]}">', h)
        h = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{URL}{key}/">', h)
        h = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{a["title"]}">', h)
        h = re.sub(r'<meta name="twitter:title" content="[^"]*">', f'<meta name="twitter:title" content="{a["title"]}">', h)
        h = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{a["desc"]}">', h)
        h = re.sub(r'<meta name="twitter:description" content="[^"]*">', f'<meta name="twitter:description" content="{a["desc"]}">', h)
        h = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{URL}{key}/">', h)
        h = h.replace(f'{URL}img/og.png', f'{URL}img/og-{key}.png')
        ld = {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": a['name'], "description": a['desc'],
              "operatingSystem": "Android", "applicationCategory": a['cat'], "url": f'{URL}{key}/', "image": f'{URL}img/og-{key}.png',
              "author": {"@type": "Organization", "name": "Ansaro Technologies", "url": URL},
              "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}
        if a['apk']: ld["downloadUrl"] = REL + a['apk']
        if a['ver']: ld["softwareVersion"] = a['ver']
        h = re.sub(r'<script type="application/ld\+json">.*?</script>', '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>', h, flags=re.S)
        h = h.replace('<head>', '<head>\n<base href="/">', 1)   # все пути считаются от корня сайта

        page = f'''<!doctype html>
<html lang="ru">
{h}
<body>
<div class="aurora"></div><div class="noise"></div><div class="spot"></div>

{symbols}

{nav}

<main class="wrap">
<a class="crumb" href="./" data-i="back">← Все приложения</a>

{section}

{how}

<h2 class="subhead reveal" data-i="other">Другие приложения</h2>
{grid}

{about}

</main>

{footer}

{scripts}
</body>
</html>
'''
        os.makedirs(os.path.join(ROOT, key), exist_ok=True)
        open(os.path.join(ROOT, key, 'index.html'), 'w', encoding='utf-8', newline='\n').write(page)

    today = datetime.date.today().isoformat()
    urls = ['', 'updates.html'] + [k + '/' for k in APPS]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sm += ''.join(f'  <url><loc>{URL}{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n'
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8', newline='\n').write(sm)
    print('pages:', ', '.join(APPS), '+ sitemap.xml')


if __name__ == '__main__':
    main()
