#!/usr/bin/env python3
"""Runs on GitHub Actions. Downloads every photo listed in tools/chosen.json
({"slot": "https://images.unsplash.com/photo-..."} or a direct https image URL)
into img/photos/<slot>.jpg and writes img/photos/credits.json.
Slots named hero* are saved 1800px wide, the rest 1100px (q=70, progressive JPEG)."""
import json, os, sys, time, urllib.request
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
UA = "Mozilla/5.0 (template photo fetcher; GitHub Actions)"

def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
        ctype = r.headers.get("Content-Type", "")
    if not ctype.startswith("image/") or len(data) < 5000:
        raise RuntimeError(f"not an image ({ctype}, {len(data)} bytes)")
    with open(path, "wb") as f:
        f.write(data)
    return len(data)

def main():
    ch = json.load(open(os.path.join(ROOT, "tools/chosen.json")))
    out = os.path.join(ROOT, "img/photos"); os.makedirs(out, exist_ok=True)
    credits, failed = [], []
    for slot, src in ch.items():
        w = 1800 if slot.startswith("hero") else 1100
        url = src.split("?")[0] + f"?auto=format&fm=jpg&fit=max&w={w}&q=70" if "images.unsplash.com" in src else src
        try:
            n = download(url, os.path.join(out, slot + ".jpg"))
            credits.append({"slot": slot, "url": src, "bytes": n, "license": "Unsplash License" if "unsplash" in src else "see source"})
            print("ok", slot, n)
        except Exception as e:
            failed.append({"slot": slot, "url": src, "error": str(e)}); print("FAIL", slot, src, e)
        time.sleep(0.5)
    json.dump({"photos": credits, "failed": failed}, open(os.path.join(out, "credits.json"), "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
