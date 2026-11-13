"""Download the client's own photos from their current website into img/site/.
Photos are re-encoded (JPEG, max 1600px wide); logos (names starting with 'logo') stay PNG."""
import io, json, pathlib, urllib.request
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
cfg = json.loads((root / "tools/site_photos.json").read_text(encoding="utf-8"))
out = root / "img/site"
out.mkdir(parents=True, exist_ok=True)
manifest = {}
for name, rel in cfg["photos"].items():
    url = cfg["base"] + rel
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15"})
    try:
        data = urllib.request.urlopen(req, timeout=60).read()
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception as e:  # keep going, record failure
        manifest[name] = {"src": url, "error": str(e)}
        print("FAIL", name, e)
        continue
    if name.startswith("logo"):
        dest = out / f"{name}.png"
        im.save(dest, optimize=True)
    else:
        im = im.convert("RGB")
        if im.width > 1600:
            im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
        dest = out / f"{name}.jpg"
        im.save(dest, "JPEG", quality=82, optimize=True, progressive=True)
    manifest[name] = {"src": url, "file": dest.name, "w": im.width, "h": im.height}
    print("OK", name, im.size)
(out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
