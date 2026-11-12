/* White Story — додаткові анімації (легкі, лише transform/opacity/clip-path) */
(() => {
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  root.classList.add("mo");

  /* 1. Заголовок першого екрана: слова піднімаються по черзі */
  const h1 = document.querySelector(".hero__h");
  if (h1) {
    let n = 0;
    const wrap = node => {
      [...node.childNodes].forEach(c => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(w => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.append(w); return; }
            const o = document.createElement("span"); o.className = "w";
            const i = document.createElement("span"); i.className = "w__i"; i.textContent = w;
            i.style.transitionDelay = (0.12 + n++ * 0.07) + "s";
            o.append(i); frag.append(o);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && !c.classList.contains("hero__kicker")) wrap(c);
      });
    };
    wrap(h1);
    h1.classList.remove("rv");
    requestAnimationFrame(() => requestAnimationFrame(() => h1.classList.add("is-split")));
  }

  /* 2. Поступова поява дочірніх елементів (списки, картки, чіпи) */
  const groups = ".ticks, .finder__chips, .rev__row, .why__list, .faq__list, .team__row, .cinfo, .social, .hero__facts, .guide";
  $$(groups).forEach(g => [...g.children].forEach((c, i) => { c.classList.add("st"); c.style.setProperty("--d", (i * 0.07) + "s"); }));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -10% 0px" });
  $$(groups + ", .h2, .wipe").forEach(el => io.observe(el));

  /* 3. Фото відкриваються «шторкою» */
  $$(".why__a, .why__b, .faq__img, .finder__img, .rev__big").forEach(el => { el.classList.add("wipe"); io.observe(el); });

  /* 4. Лічильники: 4,9 і «6 напрямків» */
  const count = (el, to, dec, suffix) => {
    const t0 = performance.now(), dur = 1400;
    const step = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.firstChild.nodeValue = (to * e).toFixed(dec).replace(".", ",") + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, d = el.dataset;
    count(el, +d.to, +d.dec, d.suf || ""); cio.unobserve(el);
  }), { threshold: 0.6 });
  $$(".hero__facts li:first-child b, .rev__score b, .why__list div:nth-child(3) dt").forEach(b => {
    if (!b.firstChild || b.firstChild.nodeType !== 3) return;
    b.dataset.to = "4.9"; b.dataset.dec = "1"; b.dataset.suf = b.firstChild.nodeValue.replace(/^[\d,.]+/, "");
    cio.observe(b);
  });
  $$(".why__list dt").forEach(dt => {
    const m = dt.firstChild && dt.firstChild.nodeType === 3 && dt.firstChild.nodeValue.match(/^(\d+)(\s.*)$/);
    if (m) { dt.dataset.to = m[1]; dt.dataset.dec = "0"; dt.dataset.suf = m[2]; cio.observe(dt); }
  });

  /* 5. Паралакс: панорама усмішки й фото «Про клініку» */
  const smileImg = document.querySelector(".smile img");
  const par = $$(".why__b, .faq__img");
  let tick = false;
  const onScroll = () => {
    tick = false;
    const vh = innerHeight;
    if (smileImg) {
      const r = smileImg.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const p = 1 - (r.bottom / (vh + r.height));
        smileImg.style.transform = `scale(${1.12 - p * 0.12}) translateY(${p * 24}px)`;
      }
    }
    par.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.translate = `0 ${(p * -36).toFixed(1)}px`;
    });
  };
  addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* 6. Зуб: блиск, коли шкала доходить до BL1 */
  const tooth = document.querySelector(".tooth");
  const shade = document.querySelector(".js-shade");
  if (tooth && shade) {
    let was = "";
    new MutationObserver(() => {
      const v = shade.textContent;
      if (v === "BL1" && was !== "BL1") { tooth.classList.remove("shine"); void tooth.offsetWidth; tooth.classList.add("shine"); }
      shade.classList.remove("tick"); void shade.offsetWidth; shade.classList.add("tick");
      was = v;
    }).observe(shade, { childList: true, characterData: true, subtree: true });
  }

  /* 7. «Магнітні» кнопки (лише миша) */
  if (matchMedia("(pointer:fine)").matches) {
    $$(".btn").forEach(b => {
      b.addEventListener("pointermove", e => {
        const r = b.getBoundingClientRect();
        b.style.translate = `${((e.clientX - r.left) / r.width - 0.5) * 8}px ${((e.clientY - r.top) / r.height - 0.5) * 8}px`;
      });
      b.addEventListener("pointerleave", () => { b.style.translate = ""; });
    });
  }

  /* 8. Відкриття послуги: фото з'являється шторкою */
  $$(".svc__it").forEach(d => d.addEventListener("toggle", () => {
    if (!d.open) return;
    const img = d.querySelector(".svc__body img");
    if (img) { img.classList.remove("svc-in"); void img.offsetWidth; img.classList.add("svc-in"); }
  }));
})();
