"""Download hotel photos listed in tools/urls.txt into img/raw/ (run by GitHub Actions)."""
import os, urllib.request, pathlib
out = pathlib.Path("img/raw"); out.mkdir(parents=True, exist_ok=True)
ua = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "Referer": "https://clubhouse-ivano-frankivs-k.hotelmix.com.ua/"}
for line in open("tools/urls.txt"):
    url = line.strip()
    if not url or url.startswith("#"): continue
    parts = url.split("/")
    name = f"{parts[-2]}-{parts[-1].split('-')[-1].lower().replace('.jpeg','')}.jpg"
    dst = out / name
    if dst.exists(): continue
    try:
        data = urllib.request.urlopen(urllib.request.Request(url, headers=ua), timeout=30).read()
        dst.write_bytes(data); print("ok", name, len(data))
    except Exception as e:
        print("FAIL", url, e)
