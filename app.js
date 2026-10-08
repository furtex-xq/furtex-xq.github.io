(() => {
  const REPO = 'furtex-xq/furtex-xq.github.io';
  const DL_BASE = `https://github.com/${REPO}/releases/latest/download/`;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const calm = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ===== языки ===== */
  const LABEL = { ru: 'RU', uk: 'UA', en: 'EN', cs: 'CZ' };
  const dict = window.I18N || {};
  dict.ru = dict.ru || {};
  $$('[data-i]').forEach(el => { if (!(el.dataset.i in dict.ru)) dict.ru[el.dataset.i] = el.innerHTML; });
  if (!('u.title' in dict.ru)) dict.ru['u.title'] = 'Обновления';

  function detectLang() {
    const saved = store.get('lang');
    if (saved && dict[saved]) return saved;
    for (const l of navigator.languages || [navigator.language || '']) {
      const c = l.slice(0, 2).toLowerCase();
      if (c === 'uk') return 'uk';
      if (c === 'cs' || c === 'sk') return 'cs';
      if (c === 'ru' || c === 'be') return 'ru';
      if (c === 'en') return 'en';
    }
    return 'en';
  }
  let lang = detectLang();
  const t = key => (dict[lang] && dict[lang][key]) ?? dict.ru[key] ?? '';

  function applyLang(l) {
    lang = l;
    document.documentElement.lang = l === 'uk' ? 'uk' : l;
    $$('[data-i]').forEach(el => { const v = t(el.dataset.i); if (v) el.innerHTML = v; });
    const dt = document.body.dataset.title;
    if (dt) document.title = t(dt) + ' · Ansaro Technologies';
    const cur = document.getElementById('langCur');
    if (cur) cur.textContent = LABEL[l];
    $$('.lang-menu button').forEach(b => b.classList.toggle('on', b.dataset.lang === l));
    cars.forEach(c => c.caption());
    renderCounts();
  }

  const langWrap = document.querySelector('.lang');
  document.getElementById('langBtn')?.addEventListener('click', e => { e.stopPropagation(); langWrap.classList.toggle('open'); });
  $$('.lang-menu button').forEach(b => b.addEventListener('click', () => {
    store.set('lang', b.dataset.lang); applyLang(b.dataset.lang); langWrap.classList.remove('open');
  }));
  document.addEventListener('click', () => langWrap?.classList.remove('open'));

  /* ===== тема ===== */
  const sysDark = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => {
    const d = document.documentElement.dataset.theme;
    return d ? d === 'dark' : sysDark.matches;
  };
  const syncThemeColor = () => {
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = isDark() ? '#0a0718' : '#f7f4ff';
  };
  document.getElementById('themeBtn')?.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('theme', next);
    syncThemeColor();
  });
  sysDark.addEventListener?.('change', syncThemeColor);
  syncThemeColor();

  /* ===== карусели ===== */
  const cars = $$('.visual').filter(v => v.querySelector('.track')).map(v => {
    const track = v.querySelector('.track');
    const slides = $$('.slide', track);
    const dots = v.querySelector('.dots');
    const cap = v.querySelector('.cap');
    let idx = 0, timer = null, paused = false;
    slides.forEach((_, i) => {
      const d = document.createElement('i');
      d.addEventListener('click', () => go(i));
      dots.appendChild(d);
    });
    const caption = () => { if (cap) cap.textContent = t(slides[idx].dataset.cap); };
    const mark = () => { $$('i', dots).forEach((d, i) => d.classList.toggle('on', i === idx)); caption(); };
    const go = i => {
      idx = (i + slides.length) % slides.length;
      track.scrollTo({ left: track.clientWidth * idx, behavior: calm ? 'auto' : 'smooth' });
      mark();
    };
    let st;
    track.addEventListener('scroll', () => {
      clearTimeout(st);
      st = setTimeout(() => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        if (i !== idx) { idx = i; mark(); }
      }, 60);
    }, { passive: true });
    v.querySelector('.prev').addEventListener('click', () => { go(idx - 1); hold(); });
    v.querySelector('.next').addEventListener('click', () => { go(idx + 1); hold(); });
    const hold = () => { paused = true; clearTimeout(v._r); v._r = setTimeout(() => (paused = false), 8000); };
    track.addEventListener('pointerdown', hold);
    track.addEventListener('touchstart', hold, { passive: true });
    v.addEventListener('mouseenter', () => (paused = true));
    v.addEventListener('mouseleave', () => (paused = false));
    const start = () => { if (!timer && !calm) timer = setInterval(() => { if (!paused && !document.hidden) go(idx + 1); }, 3800); };
    const stop = () => { clearInterval(timer); timer = null; };
    new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? start() : stop())), { threshold: .35 }).observe(v);
    mark();
    return { caption: mark };
  });

  /* ===== QR-коды ===== */
  function makeQR() {
    if (!window.qrcode) return;
    $$('[data-qr]').forEach(box => {
      const q = window.qrcode(0, 'M');
      q.addData(DL_BASE + box.dataset.qr);
      q.make();
      box.querySelector('.code').innerHTML = q.createSvgTag({ cellSize: 2, margin: 0, scalable: true });
      box.classList.add('ready');
    });
  }
  if (document.querySelector('[data-qr]')) {
    if (window.qrcode) makeQR(); else window.addEventListener('load', makeQR);
  }

  /* ===== счётчики скачиваний ===== */
  let counts = null;
  function renderCounts() {
    if (!counts) return;
    const fmt = (window.I18N_DL || {})[lang] || (n => String(n));
    $$('[data-cnt]').forEach(el => {
      const n = counts[el.dataset.cnt];
      if (n > 0) { el.textContent = '⬇ ' + fmt(n); el.classList.add('ok'); }
    });
  }
  async function loadCounts() {
    if (!document.querySelector('[data-cnt]')) return;
    try {
      const raw = sessionStorage.getItem('dlc');
      if (raw) { const c = JSON.parse(raw); if (Date.now() - c.at < 6e5) { counts = c.v; renderCounts(); return; } }
    } catch (e) {}
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`);
      if (!r.ok) return;
      const v = {};
      (await r.json()).forEach(rel => rel.assets.forEach(a => { v[a.name] = (v[a.name] || 0) + a.download_count; }));
      counts = v;
      try { sessionStorage.setItem('dlc', JSON.stringify({ at: Date.now(), v })); } catch (e) {}
      renderCounts();
    } catch (e) {}
  }

  /* ===== эффекты ===== */
  if (fine && !calm) {
    const spot = document.querySelector('.spot');
    let mx = 0, my = 0, raf = 0;
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      spot?.classList.add('on');
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (spot) spot.style.transform = `translate(${mx}px,${my}px)`; });
    }, { passive: true });
    document.addEventListener('pointerleave', () => spot?.classList.remove('on'));

    $$('.tilt').forEach(el => {
      const max = el.classList.contains('frame') ? 10 : 7;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(900px) rotateY(${x * max}deg) rotateX(${-y * max}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
  if (!calm) {
    const aur = document.querySelector('.aurora'), orb = document.querySelector('.orbit');
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = scrollY;
        if (aur) aur.style.transform = `translateY(${y * -0.08}px)`;
        if (orb && y < 1200) orb.style.transform = `translateY(${y * 0.12}px) rotate(${y * 0.02}deg)`;
        ticking = false;
      });
    }, { passive: true });
  }

  /* ===== появление блоков ===== */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
  }), { threshold: .08 });
  $$('.reveal').forEach(el => io.observe(el));

  applyLang(lang);
  loadCounts();
})();
