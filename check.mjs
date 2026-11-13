// Loads every URL in urls.txt as an iPhone (real WebKit engine) and as desktop Chromium.
// Scrolls the whole page, then reports broken images (incl. CSS backgrounds), console errors,
// CSP violations, failed requests and horizontal overflow. Writes report/report.json + screenshots.
import { webkit, chromium, devices } from "playwright";
import fs from "fs";
const urls = fs.readFileSync("urls.txt", "utf8").split("\n").map(s => s.trim()).filter(s => s && !s.startsWith("#"));
fs.rmSync("report", { recursive: true, force: true }); fs.mkdirSync("report/shots", { recursive: true });
const setups = [
  { name: "iphone-webkit", type: webkit, opts: { ...devices["iPhone 13"] } },
  { name: "desktop-chromium", type: chromium, opts: { viewport: { width: 1440, height: 900 } } },
];
const raw = fs.readFileSync("urls.txt", "utf8");
const iphoneOnly = raw.includes("#mode=iphone");
const results = [];
// interstitial check only; real page content follows
for (const s of setups.filter(x => !iphoneOnly || x.name === "iphone-webkit")) {
  const browser = await s.type.launch();
  for (const url of urls) {
    const slug = (url.match(/template\/([^/]+)/) || url.match(/beta\/([^/]+)/) || [, "page"])[1];
    const ctx = await browser.newContext({ ...s.opts, bypassCSP: false });
    const page = await ctx.newPage();
    const r = { url, setup: s.name, console: [], pageErrors: [], failedRequests: [], badResponses: [], csp: [] };
    page.on("console", m => { if (m.type() === "error") r.console.push(m.text().slice(0, 300)); });
    page.on("pageerror", e => r.pageErrors.push(String(e).slice(0, 300)));
    page.on("requestfailed", q => r.failedRequests.push(q.url() + " " + (q.failure()?.errorText || "")));
    page.on("response", res => { if (res.status() >= 400) r.badResponses.push(res.status() + " " + res.url()); });
    try {
      await page.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", e => window.__csp.push(e.violatedDirective + " " + e.blockedURI)); });
      const resp = await page.goto(url, { waitUntil: "load", timeout: 60000 });
      r.status = resp?.status(); r.contentType = resp?.headers()["content-type"];
      // raw.githack now shows a "One more step" interstitial before the page: record it, click through
      if (await page.locator("text=One more step").count()) {
        r.interstitial = true;
        await Promise.all([page.waitForNavigation({ waitUntil: "load", timeout: 60000 }).catch(() => {}), page.locator("text=Open the page").first().click()]);
        await page.waitForTimeout(1500);
      }
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 500) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
      await page.waitForTimeout(1500);
      // give every <img> a fair chance: scroll it into view and wait for it to finish (lazy images in WebKit)
      const n = await page.evaluate(() => document.images.length);
      for (let i = 0; i < n; i++) {
        await page.evaluate(async i => { const im = document.images[i]; if (!im || (im.complete && im.naturalWidth)) return;
          const vis = im.offsetParent !== null; if (vis) im.scrollIntoView({ block: "center" });
          await Promise.race([im.decode().catch(() => {}), new Promise(r => setTimeout(r, 8000))]); }, i);
      }
      await page.waitForTimeout(1000);
      Object.assign(r, await page.evaluate(async () => {
        const imgs = [...document.images].map(i => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, hidden: i.offsetParent === null }));
        const bgUrls = new Set();
        for (const el of document.querySelectorAll("*")) { const b = getComputedStyle(el).backgroundImage; (b.match(/url\("?([^")]+)"?\)/g) || []).forEach(u => bgUrls.add(u.replace(/^url\("?|"?\)$/g, ""))); }
        const bg = [];
        for (const u of bgUrls) { if (u.startsWith("data:")) continue; bg.push(await new Promise(res => { const im = new Image(); im.onload = () => res({ src: u, ok: im.naturalWidth > 0 }); im.onerror = () => res({ src: u, ok: false }); im.src = u; setTimeout(() => res({ src: u, ok: false, timeout: true }), 15000); })); }
        return { title: document.title, imgCount: imgs.length, brokenImgs: imgs.filter(i => !i.ok && !i.hidden).map(i => i.src), hiddenNotLoaded: imgs.filter(i => !i.ok && i.hidden).map(i => i.src), bgCount: bg.length, brokenBg: bg.filter(b => !b.ok).map(b => b.src),
          overflowX: document.documentElement.scrollWidth - window.innerWidth, csp: window.__csp };
      }));
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(800);
      await page.screenshot({ path: `report/shots/${slug}-${s.name}-top.jpg`, type: "jpeg", quality: 55 });
      if (!iphoneOnly) await page.screenshot({ path: `report/shots/${slug}-${s.name}-full.jpg`, type: "jpeg", quality: 40, fullPage: true }).catch(() => {});
    } catch (e) { r.fatal = String(e).slice(0, 400); }
    r.ok = !r.fatal && r.status === 200 && !(r.brokenImgs || []).length && !(r.brokenBg || []).length && !r.pageErrors.length && !(r.csp || []).length && (r.overflowX || 0) <= 1;
    results.push(r); console.log(r.ok ? "OK  " : "FAIL", s.name, url, r.fatal || "", JSON.stringify({ b: r.brokenImgs, bg: r.brokenBg, csp: r.csp, pe: r.pageErrors, ox: r.overflowX }));
    await ctx.close();
  }
  await browser.close();
}
fs.writeFileSync("report/report.json", JSON.stringify(results, null, 1));
