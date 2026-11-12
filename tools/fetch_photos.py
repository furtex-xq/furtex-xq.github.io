#!/usr/bin/env python3
"""Runs on GitHub Actions (normal internet). Downloads freely licensed candidate photos
from Wikimedia Commons for ADS into tools/candidates/ with credits, so they can be
reviewed. Files listed in tools/chosen.json are then saved to img/photos/ at full size."""
import json, os, re, sys, time, urllib.parse, urllib.request
API = "https://commons.wikimedia.org/w/api.php"
UA = "AdsDemo/1.0 (static website demo; contact via GitHub furtex-xq)"
ROOT = os.path.join(os.path.dirname(__file__), "..")
OK = re.compile(r"^(cc0|public domain|pd|cc by(-sa)? ?\d|cc-by(-sa)?-\d)", re.I)

def get(params):
    params.update(format="json", formatversion="2")
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(path, "wb") as f:
        f.write(r.read())

def info(titles, width):
    d = get({"action": "query", "prop": "imageinfo", "titles": "|".join(titles), "iiprop": "url|extmetadata|mime|size", "iiurlwidth": width})
    out = []
    for p in d["query"]["pages"]:
        ii = (p.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata", {})
        lic = md.get("LicenseShortName", {}).get("value", "")
        if ii.get("mime") != "image/jpeg" or not OK.match(lic.strip()):
            continue
        if ii.get("width", 0) < 900:
            continue
        artist = re.sub("<[^>]+>", "", md.get("Artist", {}).get("value", "")).strip()
        out.append({"title": p["title"], "thumb": ii["thumburl"], "page": ii["descriptionurl"], "license": lic, "artist": artist,
                    "desc": re.sub("<[^>]+>", "", md.get("ImageDescription", {}).get("value", ""))[:200]})
    return out

def candidates():
    q = json.load(open(os.path.join(ROOT, "tools/queries.json")))
    outdir = os.path.join(ROOT, "tools/candidates"); os.makedirs(outdir, exist_ok=True)
    allc = {}
    for slot, queries in q.items():
        seen, picked = set(), []
        for qu in queries:
            try:
                d = get({"action": "query", "list": "search", "srsearch": qu + " filetype:bitmap", "srnamespace": 6, "srlimit": 12})
            except Exception as e:
                print("search fail", qu, e); continue
            titles = [h["title"] for h in d["query"]["search"] if h["title"] not in seen]
            seen.update(titles)
            if not titles: continue
            for c in info(titles, 480):
                if len(picked) >= 8: break
                picked.append(c)
            time.sleep(1)
        for i, c in enumerate(picked):
            fn = f"{slot}-{i}.jpg"
            try:
                download(c["thumb"], os.path.join(outdir, fn)); c["file"] = fn
            except Exception as e:
                print("dl fail", c["title"], e)
            time.sleep(0.5)
        allc[slot] = [c for c in picked if c.get("file")]
        print(slot, len(allc[slot]))
    json.dump(allc, open(os.path.join(outdir, "candidates.json"), "w"), ensure_ascii=False, indent=1)

def unsplash_candidates():
    q = json.load(open(os.path.join(ROOT, "tools/queries.json")))
    outdir = os.path.join(ROOT, "tools/candidates"); os.makedirs(outdir, exist_ok=True)
    allc = {}
    for slot, queries in q.items():
        seen, picked = set(), []
        for qu in queries:
            url = "https://unsplash.com/napi/search/photos?" + urllib.parse.urlencode({"query": qu, "per_page": 20})
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    res = json.load(r)["results"]
            except Exception as e:
                print("unsplash fail", qu, e); continue
            for ph in res:
                if ph.get("premium") or ph.get("plus") or ph["id"] in seen: continue
                raw = ph["urls"]["raw"].split("?")[0]
                if not raw.startswith("https://images.unsplash.com/"): continue
                seen.add(ph["id"])
                picked.append({"id": ph["id"], "raw": raw, "alt": ph.get("alt_description") or "", "author": ph["user"]["name"], "page": ph["links"]["html"]})
                if len(picked) >= 12: break
            if len(picked) >= 12: break
            time.sleep(1)
        for i, c in enumerate(picked):
            fn = f"u-{slot}-{i}.jpg"
            try:
                download(c["raw"] + "?auto=format&fm=jpg&fit=crop&w=420&q=60", os.path.join(outdir, fn)); c["file"] = fn
            except Exception as e:
                print("dl fail", c["id"], e)
        allc[slot] = [c for c in picked if c.get("file")]
        print("unsplash", slot, len(allc[slot]))
    json.dump(allc, open(os.path.join(outdir, "unsplash.json"), "w"), ensure_ascii=False, indent=1)

def url_candidates():
    d = json.load(open(os.path.join(ROOT, "tools/urls.json")))
    outdir = os.path.join(ROOT, "tools/candidates"); os.makedirs(outdir, exist_ok=True)
    for slot, urls in d.items():
        for i, u in enumerate(urls):
            try:
                download(u + "?auto=format&fm=jpg&fit=max&w=480&q=60", os.path.join(outdir, f"x-{slot}-{i}.jpg"))
            except Exception as e:
                print("dl fail", u, e)
            time.sleep(0.3)

def chosen():
    path = os.path.join(ROOT, "tools/chosen.json")
    if not os.path.exists(path): return
    ch = json.load(open(path))
    outdir = os.path.join(ROOT, "img/photos"); os.makedirs(outdir, exist_ok=True)
    credits = []
    for slot, src in ch.items():
        if src.startswith("https://images.unsplash.com/"):
            download(src + ("?auto=format&fm=jpg&fit=max&w=1600&q=72" if slot=="hero" else "?auto=format&fm=jpg&fit=max&w=1000&q=70"), os.path.join(outdir, slot + ".jpg"))
            credits.append({"slot": slot, "source": "Unsplash", "url": src, "license": "Unsplash License"})
        else:
            c = info([src], 1400)
            if not c: print("not allowed", src); continue
            download(c[0]["thumb"], os.path.join(outdir, slot + ".jpg"))
            credits.append({"slot": slot, "source": "Wikimedia Commons", "url": c[0]["page"], "license": c[0]["license"], "artist": c[0]["artist"]})
        time.sleep(1)
    json.dump(credits, open(os.path.join(outdir, "credits.json"), "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    if "--chosen" in sys.argv: chosen()
    elif "--unsplash" in sys.argv: unsplash_candidates()
    elif "--urls" in sys.argv: url_candidates()
    else: candidates()
