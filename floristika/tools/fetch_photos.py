#!/usr/bin/env python3
"""Download verified, freely licensed photos from Wikimedia Commons for the
Floristika presentation. Runs on GitHub Actions (normal internet access).

For every slot it tries the hand-picked files first, then a Commons search.
A file is accepted only if it is a photo (JPEG), large enough, under a free
licence, and its title/categories mention the expected plant. The result is
img/<slot>.jpg plus img/credits.json with author and licence for attribution.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "FloristikaPresentation/1.0 (https://furtex-xq.github.io/floristika/; school project)"
OUT = os.path.join(os.path.dirname(__file__), "..", "img")
WIDTH = 1400

# slot: (label for credits, must-match words, preferred files, search queries)
SLOTS = {
  "orchidej":    ("Orchidej", ["phalaenopsis", "orchid"], ["Phalaenopsis_Orchid.jpg", "Phalaenopsis_hybrid_yellow_and_pink.jpg"], ['incategory:"Quality images of Phalaenopsis"', "Phalaenopsis flower"]),
  "levandule":   ("Levandule", ["lavand", "lavend", "lawend"], ["Lavandula_angustifolia_002.JPG", "Lavandula-angustifolia-flowering.JPG"], ['incategory:"Quality images of Lavandula angustifolia"', "Lavandula angustifolia flowers"]),
  "kala":        ("Kala", ["zantedeschia", "calla"], ["Calla_lily.jpg", "Zantedeschia_-_Calla_Lilly1.jpg"], ['incategory:"Zantedeschia aethiopica" flower', "Zantedeschia aethiopica flower"]),
  "chryzantema": ("Chryzantéma", ["chrysanth"], ["Chrysanthemum_flower.jpg", "Chrysanthemum_morifolium_08NOV.jpg"], ['incategory:"Quality images of Chrysanthemum"', "Chrysanthemum flower"]),
  "frezie":      ("Frézie", ["freesia", "frezj", "frézia"], ["Freesia_flowers.jpg", "Frezje_(Freesia)_MZW_2011_2393.jpg"], ['incategory:"Freesia (cultivars)"', "Freesia flowers"]),
  "karafiat":    ("Karafiát", ["carnation", "dianthus caryophyllus"], ["Carnation_flower.jpg", "Dianthus_caryophyllus.JPG"], ['incategory:"Dianthus caryophyllus" flower', "carnation flower"]),
  "narcis":      ("Narcis", ["narciss", "daffodil", "narzisse"], ["Narcissus_pseudonarcissus_flower_300303.jpg", "Narcissus_pseudonarcissus_(daffodills)_-_1.jpg"], ['incategory:"Quality images of Narcissus"', "Narcissus pseudonarcissus flower"]),
  "hero":        ("Úvodní kytice", ["bouquet", "flowers", "roses"], ["Bridal_bouquet_white_pink_rose_stephanotis.jpg"], ['incategory:"Flower bouquets" roses', "bouquet of roses flowers"]),
  "k-kytice":    ("Kytice", ["bouquet"], [], ['incategory:"Flower bouquets" bouquet', "flower bouquet tulips roses"]),
  "k-venec":     ("Věnec", ["wreath"], ["Advent_wreath.jpg"], ['incategory:"Flower wreaths"', "flower wreath"]),
  "k-svatba":    ("Svatební kytice", ["bridal", "wedding"], ["Cascading_bridal_bouquet.JPG", "Bridal_bouquet_white_pink_rose_stephanotis.jpg"], ['incategory:"Bridal bouquets"']),
  "k-interier":  ("Dekorace interiéru", ["vase", "arrangement", "ikebana"], ["Vase_of_roses_arrangment.jpg"], ['incategory:"Flower arrangements" vase', "flower arrangement vase table"]),
  "hue-red":     ("Červená růže", ["red", "rose", "rosa"], ["Red_rose.jpg", "A_red_rose.jpg"], ['incategory:"Red roses"']),
  "hue-white":   ("Bílá růže", ["white", "rose", "rosa"], ["White_rose_(Rosa).jpg", "Rosa_'Iceberg'_flower.jpg"], ['incategory:"White roses" flower close', 'incategory:"White roses"', "white rose flower close-up"]),
  "hue-yellow":  ("Žlutá růže", ["yellow", "rose", "rosa"], [], ['incategory:"Yellow roses"', "yellow rose flower"]),
  "hue-pink":    ("Růžová růže", ["pink", "rose", "rosa"], [], ['incategory:"Pink roses" flower close', 'incategory:"Pink roses"', "pink rose flower close-up"]),
  "hue-purple":  ("Fialová růže", ["purple", "violet", "mauve", "lilac", "lavender", "blue", "rose", "rosa"], [], ['incategory:"Lilac roses"', 'incategory:"Mauve roses"', 'incategory:"Purple roses"', "lavender rose flower", "purple rose flower"]),
  "hue-orange":  ("Oranžová růže", ["orange", "rose", "rosa"], [], ['incategory:"Orange roses"', "orange rose flower"]),
}
# for rose colours the title/categories must contain BOTH a colour word and a rose word
PAIRED = {k for k in SLOTS if k.startswith("hue-")}
BAD = re.compile(r"painting|drawing|illustration|engraving|lithograph|herbarium|stamp|logo|svg|museum|plate|watercolou?r|sketch|icon", re.I)
FREE = re.compile(r"^(cc0|cc[- ]by|cc[- ]by[- ]sa|public domain|pd)", re.I)


def get(params):
    params = dict(params, format="json", formatversion="2")
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.load(r)
        except Exception as e:  # rate limits / hiccups
            time.sleep(2 + attempt * 3)
    return {}


IIPROP = {"prop": "imageinfo|categories", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": WIDTH, "cllimit": "max", "clshow": "!hidden"}


def info_titles(titles):
    data = get(dict(IIPROP, action="query", titles="|".join("File:" + t for t in titles)))
    return data.get("query", {}).get("pages", [])


def info_search(q):
    data = get(dict(IIPROP, action="query", generator="search", gsrnamespace=6, gsrlimit=25, gsrsearch=q + " filetype:bitmap"))
    pages = data.get("query", {}).get("pages", [])
    return sorted(pages, key=lambda p: p.get("index", 0))


def strip(html):
    return re.sub(r"<[^>]+>", "", html or "").strip()


def accept(slot, page):
    if not page.get("imageinfo"):
        return None
    ii = page["imageinfo"][0]
    if ii.get("mime") != "image/jpeg" or ii.get("width", 0) < 1000 or ii.get("height", 0) < 700:
        return None
    meta = ii.get("extmetadata", {})
    lic = strip(meta.get("LicenseShortName", {}).get("value", ""))
    if not FREE.match(lic):
        return None
    cats = " ".join(c["title"] for c in page.get("categories", []))
    text = (page["title"] + " " + cats + " " + strip(meta.get("ImageDescription", {}).get("value", ""))).lower()
    if BAD.search(page["title"] + " " + cats):
        return None
    words = SLOTS[slot][1]
    if slot in PAIRED:
        colour_ok = any(w in text for w in words[:-2])
        rose_ok = "rose" in text or "rosa" in text
        if not (colour_ok and rose_ok):
            return None
    elif not any(w in text for w in words):
        return None
    return {
        "slot": slot,
        "label": SLOTS[slot][0],
        "file": page["title"],
        "thumb": ii.get("thumburl") or ii["url"],
        "page": ii.get("descriptionurl"),
        "artist": strip(meta.get("Artist", {}).get("value", "")) or "neznámý autor",
        "license": lic,
        "licenseUrl": meta.get("LicenseUrl", {}).get("value", ""),
    }


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
        f.write(r.read())


def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])  # optional: re-fetch selected slots
    skip_files = {}
    try:  # files rejected after a visual check can be listed here
        skip_files = json.load(open(os.path.join(os.path.dirname(__file__), "reject.json")))
    except Exception:
        pass
    credits_path = os.path.join(OUT, "credits.json")
    try:
        credits = {c["slot"]: c for c in json.load(open(credits_path))}
    except Exception:
        credits = {}
    for slot, (label, words, files, queries) in SLOTS.items():
        if only and slot not in only:
            continue
        rejected = set(skip_files.get(slot, []))
        if slot in credits and os.path.exists(os.path.join(OUT, slot + ".jpg")) and not only and credits[slot]["file"] not in rejected:
            continue
        picked = None
        pages = info_titles(files) if files else []
        order = {("File:" + f.replace("_", " ")).lower(): i for i, f in enumerate(files)}
        pages.sort(key=lambda p: order.get(p.get("title", "").lower(), 99))
        for p in pages:
            if p.get("title") in rejected:
                continue
            picked = accept(slot, p)
            if picked:
                break
        for q in queries:
            if picked:
                break
            for p in info_search(q):
                if p.get("title") in rejected:
                    continue
                picked = accept(slot, p)
                if picked:
                    break
        if not picked:
            print(f"!! {slot}: nothing suitable found")
            continue
        download(picked["thumb"], os.path.join(OUT, slot + ".jpg"))
        credits[slot] = picked
        print(f"ok {slot}: {picked['file']} ({picked['license']})")
        time.sleep(1)
    json.dump(list(credits.values()), open(credits_path, "w"), ensure_ascii=False, indent=1)




def candidates():
    """Save small previews of search results so a person can pick by eye."""
    spec = json.load(open(os.path.join(os.path.dirname(__file__), "candidates.json")))
    base = os.path.join(os.path.dirname(__file__), "cand")
    for slot, queries in spec.items():
        d = os.path.join(base, slot)
        os.makedirs(d, exist_ok=True)
        seen, listing = set(), []
        for q in queries:
            data = get({"action": "query", "generator": "search", "gsrnamespace": 6, "gsrlimit": 20,
                        "gsrsearch": q + " filetype:bitmap", "prop": "imageinfo",
                        "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 320})
            for p in sorted(data.get("query", {}).get("pages", []), key=lambda p: p.get("index", 0)):
                ii = (p.get("imageinfo") or [{}])[0]
                lic = strip(ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value", ""))
                if p["title"] in seen or ii.get("mime") != "image/jpeg" or ii.get("width", 0) < 1000 or not FREE.match(lic):
                    continue
                seen.add(p["title"])
                n = len(listing)
                if n >= 16:
                    break
                try:
                    download(ii["thumburl"], os.path.join(d, f"{n:02d}.jpg"))
                    listing.append(p["title"])
                except Exception:
                    pass
        json.dump(listing, open(os.path.join(d, "list.json"), "w"), ensure_ascii=False, indent=1)
        print(f"candidates {slot}: {len(listing)}")


if __name__ == "__main__":
    if "--candidates" in sys.argv:
        candidates()
    else:
        main()
