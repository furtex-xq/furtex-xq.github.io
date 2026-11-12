#!/usr/bin/env python3
"""Runs on GitHub Actions. Downloads temporary Unsplash photos (Unsplash License) for the Shamanka demo.
--candidates: tools/ids.json {slot: [short ids]} -> small previews in tools/candidates/
--chosen:     tools/chosen.json {slot: short id} -> img/photos/<slot>.jpg + credits.json"""
import json, os, re, sys, time, urllib.request
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}

def base_url(pid):
    try:
        req = urllib.request.Request(f"https://unsplash.com/photos/{pid}/download?force=true", headers=UA)
        with urllib.request.urlopen(req, timeout=60) as r:
            u = r.geturl()
        if "images.unsplash.com/photo-" in u:
            return u.split("?")[0]
    except Exception as e:
        print("download-redirect fail", pid, e)
    req = urllib.request.Request(f"https://unsplash.com/photos/{pid}", headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        html = r.read().decode("utf-8", "ignore")
    m = re.search(r'https://images\.unsplash\.com/photo-[0-9a-zA-Z-]+', html)
    if not m: raise RuntimeError("no image url for " + pid)
    return m.group(0)

def dl(url, path):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r, open(path, "wb") as f:
        f.write(r.read())

def candidates():
    ids = json.load(open(os.path.join(ROOT, "tools/ids.json")))
    out = os.path.join(ROOT, "tools/candidates"); os.makedirs(out, exist_ok=True)
    found = {}
    for slot, lst in ids.items():
        for pid in lst:
            try:
                b = base_url(pid); found[pid] = b
                dl(b + "?auto=format&fm=jpg&fit=crop&w=360&h=360&q=55", os.path.join(out, f"{slot}__{pid}.jpg"))
            except Exception as e:
                print("fail", slot, pid, e)
            time.sleep(0.5)
    json.dump(found, open(os.path.join(out, "found.json"), "w"), indent=1)

def chosen():
    ch = json.load(open(os.path.join(ROOT, "tools/chosen.json")))
    out = os.path.join(ROOT, "img/photos"); os.makedirs(out, exist_ok=True)
    credits = []
    for slot, pid in ch.items():
        b = base_url(pid)
        w = 1800 if slot.startswith("hero") else 1100
        dl(b + f"?auto=format&fm=jpg&fit=max&w={w}&q=72", os.path.join(out, slot + ".jpg"))
        credits.append({"slot": slot, "source": "Unsplash", "page": f"https://unsplash.com/photos/{pid}", "url": b, "license": "Unsplash License"})
        time.sleep(0.5)
    json.dump(credits, open(os.path.join(out, "credits.json"), "w"), indent=1)

if __name__ == "__main__":
    chosen() if "--chosen" in sys.argv else candidates()
