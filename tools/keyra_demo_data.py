"""Готовит данные для веб-демо Keyra (demo/keyra/) из исходников Android-приложения:
тексты интерфейса на трёх языках, каталог сервисов и шрифт. Запускать после обновления приложения:

    python tools/keyra_demo_data.py
"""
import json, os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r'C:\Users\david\OneDrive\Робочий стіл\Проекты\Мой Пароль\app\src\main'
OUT = os.path.join(ROOT, 'demo', 'keyra')
KT = os.path.join(SRC, 'java', 'app', 'keyra')


def kstr(s):
    """Kotlin-строка в обычную: экранирование и подстановки $name -> {name}."""
    s = s.replace('\\n', '\n').replace('\\"', '"').replace("\\'", "'")
    s = re.sub(r'\$\{(\w+)\}|\$(\w+)', lambda m: '{' + (m.group(1) or m.group(2)) + '}', s)
    return s.replace('\\$', '$')


def strings():
    src = open(os.path.join(KT, 'i18n', 'Strings.kt'), encoding='utf-8').read()
    blocks = {'en': src[src.index('open class Strings'):src.index('object En')],
              'ru': src[src.index('object Ru'):src.index('object Uk')],
              'uk': src[src.index('object Uk'):]}
    out = {}
    for lang, body in blocks.items():
        d = {}
        for m in re.finditer(r'^\s*(?:open|override)\s+(?:val|fun)\s+(\w+)(?:\([^)]*\))?\s*=\s*(.+)$', body, re.M):
            name, val = m.group(1), m.group(2).strip()
            if val.startswith('listOf('):
                d[name] = [kstr(x) for x in re.findall(r'"((?:[^"\\]|\\.)*)"', val)]
            else:
                q = re.match(r'"((?:[^"\\]|\\.)*)"$', val)
                assert q, (lang, name, val)
                d[name] = kstr(q.group(1))
        out[lang] = d
    assert len(out['en']) > 150 and set(out['ru']) <= set(out['en']), 'строки не разобраны'
    return out


def brands():
    src = open(os.path.join(KT, 'data', 'Brands.kt'), encoding='utf-8').read()
    lst = lambda s: re.findall(r'"((?:[^"\\]|\\.)*)"', s)
    popular = lst(src[src.index('private val POPULAR'):src.index('private val EXTRA_ALIASES')])
    al_src = src[src.index('private val EXTRA_ALIASES'):src.index('private val CATEGORIES')]
    aliases = {m.group(1): lst(m.group(2)) for m in re.finditer(r'"(\w+)" to listOf\(([^)]*)\)', al_src)}
    cat_src = src[src.index('private val CATEGORIES'):src.index('private val EXTRA_BRANDS')]
    cats = {}
    for m in re.finditer(r'for \(s in listOf\((.*?)\)\) put\(s, Category\.(\w+)\)', cat_src, re.S):
        for s in lst(m.group(1)): cats[s] = m.group(2).lower()
    extra = []
    for m in re.finditer(r'Brand\("([^"]+)", "([^"]+)", 0x([0-9A-Fa-f]+), listOf\(([^)]*)\), mono = "([^"]+)"(?:, category = Category\.(\w+))?\)', src[src.index('private val EXTRA_BRANDS'):]):
        extra.append({'s': m.group(1), 't': m.group(2), 'c': m.group(3).upper().zfill(6), 'a': lst(m.group(4)), 'm': m.group(5), 'k': (m.group(6) or '').lower()})
    assert len(popular) == 40 and len(extra) > 20 and cats and aliases
    # полный каталог: slug, название, цвет, псевдонимы, контур логотипа
    rows = []
    for line in open(os.path.join(SRC, 'assets', 'brands.tsv'), encoding='utf-8'):
        f = line.rstrip('\n').split('\t')
        if len(f) >= 5: rows.append(f[:5])
    slugs = {r[0] for r in rows}
    total = len(rows) + sum(1 for e in extra if e['s'] not in slugs)
    # для мгновенного старта в сам скрипт кладём только популярные сервисы и те, что есть в демо-данных
    need = set(popular) | {'github', 'steam', 'discord', 'instagram', 'gmail', 'telegram', 'spotify', 'netflix'}
    seed = [{'s': r[0], 't': r[1], 'c': r[2].upper(), 'a': [x for x in r[3].split('|') if x], 'p': r[4]} for r in rows if r[0] in need]
    return {'popular': popular, 'aliases': aliases, 'cats': cats, 'extra': extra, 'seed': seed, 'total': total}, rows


def main():
    os.makedirs(OUT, exist_ok=True)
    s = strings()
    b, rows = brands()
    with open(os.path.join(OUT, 'data.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('/* Сгенерировано tools/keyra_demo_data.py из исходников приложения Keyra. Не править вручную. */\n')
        f.write('window.KEYRA_STR=' + json.dumps(s, ensure_ascii=False, separators=(',', ':')) + ';\n')
        f.write('window.KEYRA_BRANDS=' + json.dumps(b, ensure_ascii=False, separators=(',', ':')) + ';\n')
    gen = open(os.path.join(KT, 'util', 'PasswordTools.kt'), encoding='utf-8').read()
    words = gen[gen.index('WORDS = """') + 10:]
    words = words[:words.index('"""')].split()
    assert len(words) > 500
    with open(os.path.join(OUT, 'data.js'), 'a', encoding='utf-8', newline='\n') as f:
        f.write('window.KEYRA_WORDS=' + json.dumps(' '.join(words)) + ';\n')
    with open(os.path.join(OUT, 'brands.tsv'), 'w', encoding='utf-8', newline='\n') as f:
        for r in rows: f.write('\t'.join(r) + '\n')
    shutil.copyfile(os.path.join(SRC, 'res', 'font', 'manrope.ttf'), os.path.join(OUT, 'manrope.ttf'))
    print('строк:', {k: len(v) for k, v in s.items()}, '| сервисов:', b['total'], '| в скрипте:', len(b['seed']), '| data.js', os.path.getsize(os.path.join(OUT, 'data.js')) // 1024, 'КБ')


if __name__ == '__main__':
    main()
