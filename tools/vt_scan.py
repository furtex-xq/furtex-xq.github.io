"""Проверка APK из релиза на VirusTotal. Запускается из GitHub Actions (.github/workflows/virustotal.yml).

Для каждого файла релиза:
  1) берёт его SHA-256 у GitHub;
  2) спрашивает у VirusTotal отчёт по этой сумме;
  3) если файла там ещё нет, загружает его и ждёт окончания анализа;
  4) пишет итог в out/vt.json (его читает сайт).

Ключ берётся из переменной окружения VT_API_KEY (секрет репозитория). В коде и на сайте ключа нет.
Бесплатный ключ: не больше 4 запросов в минуту, поэтому между запросами пауза.
"""
import json, os, subprocess, sys, time, urllib.request, urllib.error

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

KEY = os.environ.get('VT_API_KEY', '').strip()
REPO = os.environ.get('GITHUB_REPOSITORY', 'furtex-xq/furtex-xq.github.io')
API = 'https://www.virustotal.com/api/v3'
PAUSE = 16


def http(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, None


def vt(path):
    time.sleep(PAUSE)
    return http(API + path, {'x-apikey': KEY, 'accept': 'application/json'})


def report(sha):
    code, data = vt('/files/' + sha)
    if code != 200 or not data:
        return None
    a = data['data']['attributes']
    s = a.get('last_analysis_stats') or {}
    total = sum(s.get(k, 0) for k in ('malicious', 'suspicious', 'harmless', 'undetected'))
    if not total:
        return None
    return {'sha256': sha, 'malicious': s.get('malicious', 0), 'suspicious': s.get('suspicious', 0), 'total': total,
            'date': a.get('last_analysis_date') or 0, 'link': 'https://www.virustotal.com/gui/file/' + sha}


def upload(name, url, sha):
    path = os.path.join('dl', name)
    os.makedirs('dl', exist_ok=True)
    subprocess.run(['curl', '-sL', '--fail', '--max-time', '900', '-o', path, url], check=True)
    code, data = vt('/files/upload_url')          # отдельный адрес для файлов больше 32 МБ
    if code != 200:
        print('  нет адреса для загрузки, код', code); return None
    time.sleep(PAUSE)
    out = subprocess.run(['curl', '-s', '--max-time', '1800', '-X', 'POST', data['data'], '-H', 'x-apikey: ' + KEY, '-F', 'file=@' + path],
                         capture_output=True, text=True)
    try:
        aid = json.loads(out.stdout)['data']['id']
    except Exception:
        print('  загрузка не удалась:', out.stdout[:200]); return None
    os.remove(path)
    for _ in range(40):                            # ждём до ~15 минут
        time.sleep(8)
        code, d = vt('/analyses/' + aid)
        if code == 200 and d['data']['attributes'].get('status') == 'completed':
            return report(sha)
    print('  анализ не успел завершиться, результат появится при следующем запуске')
    return None


def main():
    if not KEY:
        print('Секрет VT_API_KEY не задан — проверка пропущена.'); return 0
    code, rel = http(f'https://api.github.com/repos/{REPO}/releases/latest', {'accept': 'application/vnd.github+json'})
    if code != 200:
        print('не удалось получить релиз, код', code); return 1
    files = {}
    for a in rel['assets']:
        name, digest = a['name'], (a.get('digest') or '')
        if not name.lower().endswith('.apk') or not digest.startswith('sha256:'):
            continue
        sha = digest.split(':', 1)[1]
        print(name, sha[:16])
        r = report(sha) or upload(name, a['browser_download_url'], sha)
        if r:
            files[name] = r
            print('  →', r['malicious'] + r['suspicious'], 'из', r['total'])
    os.makedirs('out', exist_ok=True)
    json.dump({'updated': int(time.time()), 'files': files}, open('out/vt.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('готово:', len(files), 'файл(ов)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
