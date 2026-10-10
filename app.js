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
  Object.assign(dict.ru, { 'demo.hint.mfs': 'Это настоящее приложение, а не видео. Нажимай кнопки, решай примеры. Прогресс сохраняется только в этом браузере.', 'demo.hint.monko': 'Это веб-версия настоящего приложения с демо-данными. Добавляй расходы, смотри статистику и бюджеты. Сканер чеков, уведомления и резервные копии работают только в приложении на телефоне.', 'demo.full': 'Открыть на весь экран', 'demo.close': 'Закрыть' });

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
    demoTexts();
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
    document.body.style.transition = 'background .35s, color .35s';
    setTimeout(() => { document.body.style.transition = ''; }, 400);
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

  /* ===== QR-коды (только на компьютере: библиотека на телефоне не грузится) ===== */
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
  if (fine && innerWidth > 900 && document.querySelector('[data-qr]')) {
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    sc.onload = makeQR;
    const idle = window.requestIdleCallback || (f => setTimeout(f, 800));
    idle(() => document.head.appendChild(sc));
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

  /* ===== эффекты (только мышь; на телефоне не запускаются) ===== */
  if (fine && !calm) {
    const spot = document.querySelector('.spot');
    let mx = 0, my = 0, raf = 0;
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (spot) { spot.classList.add('on'); spot.style.transform = `translate3d(${mx}px,${my}px,0)`; }
      });
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => spot?.classList.remove('on'));

    $$('.tilt').forEach(el => {
      const max = el.classList.contains('frame') ? 10 : 7;
      let rect = null, f = 0, px = 0, py = 0;
      el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', e => {
        px = e.clientX; py = e.clientY;
        if (f || !rect) return;
        f = requestAnimationFrame(() => {
          f = 0;
          if (!rect) return;
          const x = (px - rect.left) / rect.width - .5, y = (py - rect.top) / rect.height - .5;
          el.style.transform = `perspective(900px) rotateY(${(x * max).toFixed(2)}deg) rotateX(${(-y * max).toFixed(2)}deg) translateY(-4px)`;
        });
      }, { passive: true });
      el.addEventListener('pointerleave', () => { rect = null; el.style.transform = ''; });
    });

    // параллакс иконок — только пока первый экран виден
    const orb = document.querySelector('.orbit');
    if (orb) {
      let ticking = false, heroOn = true;
      new IntersectionObserver(es => { heroOn = es[0].isIntersecting; }).observe(orb);
      addEventListener('scroll', () => {
        if (ticking || !heroOn) return;
        ticking = true;
        requestAnimationFrame(() => { orb.style.transform = `translate3d(0,${(scrollY * 0.12).toFixed(1)}px,0)`; ticking = false; });
      }, { passive: true });
    }
  }

  /* ===== анимации останавливаются, когда блок не на экране ===== */
  const pauser = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('paused', !e.isIntersecting)), { rootMargin: '100px' });
  $$('.hero, .marquee, .proj').forEach(el => pauser.observe(el));

  /* ===== онлайн-демо: приложение открывается в окне на сайте ===== */
  let demoEl = null;
  function demoTexts() {
    if (!demoEl) return;
    demoEl.querySelector('.d-hint').textContent = t(demoEl.dataset.hint || 'demo.hint.mfs');
    demoEl.querySelector('.d-full').textContent = t('demo.full');
    demoEl.querySelectorAll('.d-close').forEach(b => { b.textContent = t('demo.close'); });
  }
  function openDemo(url, name, hint) {
    if (!demoEl) {
      demoEl = document.createElement('div');
      demoEl.className = 'demo';
      demoEl.innerHTML = '<div class="demo-bar"><span class="d-name"></span><button class="d-close" type="button"></button></div>' +
        '<div class="demo-phone"><iframe title="demo" allow="autoplay; fullscreen"></iframe></div>' +
        '<div class="demo-side"><h3 class="d-name"></h3><p class="d-hint"></p><div class="acts">' +
        '<a class="d-full" target="_blank" rel="noopener"></a><button class="d-close x" type="button"></button></div></div>';
      document.body.appendChild(demoEl);
      demoEl.addEventListener('click', e => { if (e.target === demoEl || e.target.classList.contains('d-close')) closeDemo(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDemo(); });
    }
    demoEl.dataset.hint = hint || 'demo.hint.mfs';
    demoEl.querySelectorAll('.d-name').forEach(n => { n.textContent = name; });
    demoEl.querySelector('.d-full').href = url;
    demoEl.querySelector('iframe').src = url;
    demoTexts();
    demoEl.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
  }
  function closeDemo() {
    if (!demoEl || !demoEl.classList.contains('open')) return;
    demoEl.classList.remove('open');
    demoEl.querySelector('iframe').src = 'about:blank';
    document.documentElement.style.overflow = '';
  }
  $$('[data-demo]').forEach(b => b.addEventListener('click', () => {
    // приложению передаём язык сайта (чешского в приложениях нет — тогда английский)
    const q = b.dataset.demoLang ? '?lang=' + (lang === 'cs' ? 'en' : lang) : '';
    openDemo(b.dataset.demo + q, b.dataset.demoName || '', b.dataset.demoHint);
  }));

  /* ===== появление блоков ===== */
  let pending = $$('.reveal');
  const show = el => { el.classList.add('in-view'); };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
  }), { threshold: .08 });
  pending.forEach(el => io.observe(el));
  // запасной способ: если наблюдатель не сработал, проверяем положение при прокрутке
  let rv = false;
  const sweep = () => {
    rv = false;
    const h = innerHeight;
    pending = pending.filter(el => {
      if (el.classList.contains('in-view')) return false;
      const r = el.getBoundingClientRect();
      if (r.top < h * .94 && r.bottom > 0) { show(el); io.unobserve(el); return false; }
      return true;
    });
    if (!pending.length) { removeEventListener('scroll', onScroll); clearInterval(guard); }
  };
  const onScroll = () => { if (!rv) { rv = true; setTimeout(sweep, 120); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('hashchange', () => setTimeout(sweep, 150));
  const guard = setInterval(sweep, 900);
  setTimeout(sweep, 400);

  applyLang(lang);
  loadCounts();
})();
