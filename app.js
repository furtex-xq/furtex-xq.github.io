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
  Object.assign(dict.ru, { 'demo.hint.mfs': 'Это настоящее приложение, а не видео. Нажимай кнопки, решай примеры. Прогресс сохраняется только в этом браузере.', 'demo.hint.tm': 'Это веб-версия настоящего приложения с живыми ценами. Открывай монеты, смотри графики и индикаторы. Новости обновляются раз в час. Графики некоторых редких монет в браузере могут не загрузиться, а уведомления работают только в приложении на телефоне.', 'demo.hint.py': 'Это веб-версия настоящего приложения. Читай главы, проходи тесты и запускай код на Python прямо здесь. Интерфейс приложения на русском. Прогресс сохраняется только в этом браузере.', 'demo.hint.monko': 'Это веб-версия настоящего приложения с демо-данными. Добавляй расходы, смотри статистику и бюджеты. Сканер чеков, уведомления и резервные копии работают только в приложении на телефоне.', 'demo.full': 'Открыть на весь экран', 'demo.close': 'Закрыть', 'demo.reset': 'Сбросить демо', 'demo.resetAsk': 'Вернуть демо в исходное состояние? Всё, что ты в нём изменил, будет удалено.', 'demo.loading': 'Загружается…', 'st.dl': 'Скачивания', 'st.views': 'Просмотры', 'st.demo': 'Запуски демо', 'st.last': 'последнее', 'st.lastv': 'последний', 'st.none': 'пока не было', 'st.now': 'только что' });

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
    renderStats();
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
    const start = () => { if (!timer && !calm) timer = setInterval(() => { if (!paused && !document.hidden && !document.documentElement.classList.contains('demo-open')) go(idx + 1); }, 3800); };
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
  // Скачивания с прежнего сервера. К ним прибавляется живой счётчик GitHub, поэтому число растёт дальше само.
  const DL_BASE_COUNT = { 'Monko.apk': 874, 'PythonBook.apk': 463, 'MathForSpeed.apk': 647, 'Tidemark.apk': 536 };
  const dlTotal = name => (DL_BASE_COUNT[name] || 0) + ((counts && counts[name]) || 0);
  let counts = null;
  function renderCounts() {
    renderStats();
    const fmt = (window.I18N_DL || {})[lang] || (n => String(n));
    $$('[data-cnt]').forEach(el => {
      const n = dlTotal(el.dataset.cnt);
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
      const place = () => { orb.style.transform = `translate3d(0,${(Math.min(scrollY, 1400) * 0.12).toFixed(1)}px,0)`; };
      // при возврате на первый экран (в том числе прыжком) сразу ставим иконки на место
      new IntersectionObserver(es => { heroOn = es[0].isIntersecting; if (heroOn) place(); }).observe(orb);
      addEventListener('scroll', () => {
        if (ticking || !heroOn) return;
        ticking = true;
        requestAnimationFrame(() => { place(); ticking = false; });
      }, { passive: true });
    }
  }

  /* ===== световые рамки: подсветка края карточки там, где курсор ===== */
  if (fine && !calm) {
    const GLOW = '.proj, .app, .step, .link, .nums div, .news';
    let gf = 0, gx = 0, gy = 0, gt = null;
    document.addEventListener('pointermove', e => {
      gx = e.clientX; gy = e.clientY; gt = e.target;
      if (gf) return;
      gf = requestAnimationFrame(() => {
        gf = 0;
        let el = gt && gt.closest ? gt.closest(GLOW) : null;
        while (el) {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--mx', (gx - r.left).toFixed(0) + 'px');
          el.style.setProperty('--my', (gy - r.top).toFixed(0) + 'px');
          el = el.parentElement ? el.parentElement.closest(GLOW) : null;
        }
      });
    }, { passive: true });
  }

  /* ===== анимации останавливаются, когда блок не на экране ===== */
  const pauser = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('paused', !e.isIntersecting)), { rootMargin: '100px' });
  $$('.hero, .marquee, .proj').forEach(el => pauser.observe(el));

  /* ===== статистика проектов: просмотры, запуски демо, время последнего просмотра и скачивания =====
     У сайта нет своего сервера, поэтому числа хранит бесплатный сервис-счётчик (abacus).
     Скачивания считает GitHub (плюс базовые числа выше). Время хранится как обычное число (секунды). */
  const STAT_API = 'https://abacus.jasoncameron.dev';
  const STAT_NS = 'furtex-xq-site';
  const STAT_KEYS = {"vt-tidemark": "ad5554ff-1874-4465-9aa7-555d658730a0", "vt-mfs": "7cf06a36-e76b-48db-8da8-d9ab38781002", "vt-python": "03c5522b-9a53-40ee-bc2a-c33faa5e50e6", "vt-monko": "fdd2a2f7-0a94-4bd3-9239-3f5102374ab1", "vt-dealio": "f43045dd-3185-41a9-bc65-d4833a458f34", "dt-tidemark": "4d353e70-70f0-403a-badb-d177e801e7a1", "dt-mfs": "c8b43504-43f5-418e-9b6e-a9ec953472a8", "dt-python": "54cd7313-4d1a-4378-a773-63b7abd60883", "dt-monko": "bc1c28c0-902e-4ff0-9643-173e3289ad2b"};
  const statData = {};
  let statChain = Promise.resolve();
  // запросы идут по одному с паузой: у сервиса ограничение на частоту
  const statReq = (path, opt) => {
    const run = () => fetch(STAT_API + path, opt).then(r => (r.ok ? r.json() : null)).catch(() => null);
    const p = statChain.then(run);
    statChain = p.then(() => new Promise(r => setTimeout(r, 260)));
    return p;
  };
  const statGet = k => statReq(`/get/${STAT_NS}/${k}`).then(r => (r && typeof r.value === 'number' ? r.value : 0));
  const statHit = k => statReq(`/hit/${STAT_NS}/${k}`).then(r => (r && typeof r.value === 'number' ? r.value : 0));
  const statStamp = k => {
    const now = Math.floor(Date.now() / 1000);
    if (STAT_KEYS[k]) statReq(`/set/${STAT_NS}/${k}?value=${now}`, { method: 'POST', headers: { Authorization: 'Bearer ' + STAT_KEYS[k] } });
    return now;
  };
  const ago = ts => {
    if (!ts) return t('st.none');
    const d = Math.max(0, Date.now() / 1000 - ts);
    if (d < 60) return t('st.now');
    const loc = lang === 'cs' ? 'cs' : lang === 'uk' ? 'uk' : lang === 'en' ? 'en' : 'ru';
    try {
      const f = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' });
      if (d < 3600) return f.format(-Math.round(d / 60), 'minute');
      if (d < 86400) return f.format(-Math.round(d / 3600), 'hour');
      if (d < 86400 * 30) return f.format(-Math.round(d / 86400), 'day');
    } catch (e) {}
    return new Date(ts * 1000).toLocaleDateString(loc);
  };
  const num = n => Number(n || 0).toLocaleString(lang === 'en' ? 'en' : 'ru');
  function renderStats() {
    $$('[data-stats]').forEach(box => {
      const app = box.dataset.stats, apk = box.dataset.apk, d = statData[app];
      if (!d && !apk) return;
      let html = '';
      if (apk) html += `<div class="stat"><small>${t('st.dl')}</small><b>${num(dlTotal(apk))}</b><i>${d ? t('st.last') + ': ' + ago(d.dt) : ''}</i></div>`;
      if (d) {
        html += `<div class="stat"><small>${t('st.views')}</small><b>${num(d.v)}</b><i>${t('st.lastv')}: ${ago(d.vt)}</i></div>`;
        if (apk) html += `<div class="stat"><small>${t('st.demo')}</small><b>${num(d.demo)}</b><i></i></div>`;
      }
      box.innerHTML = html;
    });
  }
  async function loadStats(app, countView) {
    const hasApk = !!(document.querySelector(`[data-stats="${app}"]`) || {}).dataset?.apk;
    const d = statData[app] || (statData[app] = { v: 0, vt: 0, dt: 0, demo: 0 });
    if (countView) {
      const prevSeen = await statGet('vt-' + app);       // время прошлого просмотра — до того, как запишем свой
      d.v = await statHit('v-' + app);
      d.vt = prevSeen;
      statStamp('vt-' + app);
    } else {
      d.v = await statGet('v-' + app);
      d.vt = await statGet('vt-' + app);
    }
    renderStats();
    if (hasApk) { d.dt = await statGet('dt-' + app); d.demo = await statGet('demo-' + app); renderStats(); }
  }
  if (document.querySelector('[data-stats]')) {
    renderStats();
    const seen = k => { try { if (sessionStorage.getItem(k)) return true; sessionStorage.setItem(k, '1'); } catch (e) {} return false; };
    const sio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      sio.unobserve(e.target);
      const app = e.target.id;
      loadStats(app, !seen('seen-' + app));               // один просмотр на посетителя за сеанс
    }), { threshold: .25 });
    $$('.proj[id]').forEach(el => sio.observe(el));
    // нажатие «Скачать APK» запоминает время последнего скачивания
    $$('.proj[id] a.btn[download]').forEach(a => a.addEventListener('click', () => {
      const app = a.closest('.proj').id;
      const now = statStamp('dt-' + app);
      if (statData[app]) { statData[app].dt = now; renderStats(); }
    }));
    $$('.proj[id] [data-demo]').forEach(b => b.addEventListener('click', () => {
      const app = b.closest('.proj').id;
      statHit('demo-' + app).then(v => { if (statData[app] && v) { statData[app].demo = v; renderStats(); } });
    }));
    setInterval(() => { if (!document.documentElement.classList.contains('demo-open')) renderStats(); }, 60000);                       // «5 минут назад» обновляется само
  }

  /* ===== онлайн-демо: приложение открывается в окне на сайте ===== */
  // какие ключи хранилища браузера принадлежат какому демо (для кнопки «Сбросить демо»)
  const DEMO_KEYS = {
    'demo/mfs/': k => k.startsWith('mfs-'),
    'demo/monko/': k => k.startsWith('moneyollways:') || k.startsWith('monko-'),
    'demo/python/': k => k === 'flutter.farm' || k === 'flutter.progress',
    'demo/tidemark/': k => k.startsWith('flutter.') && k !== 'flutter.farm' && k !== 'flutter.progress',
  };
  let demoEl = null, demoUrl = '', demoBase = '', demoPoll = 0;
  function demoTexts() {
    if (!demoEl) return;
    demoEl.querySelector('.d-hint').textContent = t(demoEl.dataset.hint || 'demo.hint.mfs');
    demoEl.querySelector('.d-full').textContent = t('demo.full');
    demoEl.querySelector('.d-wait').textContent = t('demo.loading');
    demoEl.querySelectorAll('.d-close').forEach(b => { b.textContent = t('demo.close'); });
    demoEl.querySelectorAll('.d-reset').forEach(b => { b.textContent = t('demo.reset'); });
  }
  // заставка висит, пока приложение внутри окна не нарисует первый экран
  function watchDemo() {
    const frame = demoEl.querySelector('iframe'), load = demoEl.querySelector('.demo-load');
    load.classList.remove('done');
    clearInterval(demoPoll);
    const started = Date.now();
    let flutterReady = false, hooked = false;
    demoPoll = setInterval(() => {
      let ok = false;
      try {
        const d = frame.contentDocument, w = frame.contentWindow;
        if (d && d.readyState === 'complete' && w.location.href !== 'about:blank') {
          if (d.querySelector('script[src*="flutter_bootstrap"]')) {
            if (!hooked) { hooked = true; w.addEventListener('flutter-first-frame', () => { flutterReady = true; }); }
            ok = flutterReady || !!d.querySelector('flt-glass-pane, flutter-view');
          } else if (d.querySelector('script[src*="_expo"]')) {
            const r = d.getElementById('root'); ok = !!r && r.innerText.trim().length > 20;
          } else ok = true;
        }
      } catch (e) { ok = true; }
      if (ok || Date.now() - started > 25000) { clearInterval(demoPoll); setTimeout(() => load.classList.add('done'), ok ? 350 : 0); }
    }, 200);
  }
  function openDemo(url, name, hint, base) {
    if (!demoEl) {
      demoEl = document.createElement('div');
      demoEl.className = 'demo';
      demoEl.innerHTML = '<div class="demo-bar"><span class="d-name"></span><span class="grp"><button class="d-reset" type="button"></button><button class="d-close" type="button"></button></span></div>' +
        '<div class="demo-phone"><iframe title="demo" allow="autoplay; fullscreen"></iframe>' +
        '<div class="demo-load"><div class="ring2"></div><b class="d-name"></b><small class="d-wait"></small></div></div>' +
        '<div class="demo-side"><h3 class="d-name"></h3><p class="d-hint"></p><div class="acts">' +
        '<a class="d-full" target="_blank" rel="noopener"></a><button class="d-reset" type="button"></button><button class="d-close x" type="button"></button></div></div>';
      document.body.appendChild(demoEl);
      demoEl.addEventListener('click', e => {
        if (e.target === demoEl || e.target.classList.contains('d-close')) closeDemo();
        else if (e.target.classList.contains('d-reset')) resetDemo();
      });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDemo(); });
    }
    demoUrl = url; demoBase = base || url;
    demoEl.dataset.hint = hint || 'demo.hint.mfs';
    demoEl.querySelectorAll('.d-name').forEach(n => { n.textContent = name; });
    demoEl.querySelector('.d-full').href = url;
    demoEl.querySelector('iframe').src = url;
    demoTexts();
    demoEl.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.classList.add('demo-open');   // страница под окном замирает: все кадры достаются приложению
    watchDemo();
  }
  function closeDemo() {
    if (!demoEl || !demoEl.classList.contains('open')) return;
    clearInterval(demoPoll);
    demoEl.classList.remove('open');
    demoEl.querySelector('iframe').src = 'about:blank';
    document.documentElement.style.overflow = '';
    document.documentElement.classList.remove('demo-open');
  }
  // вернуть демо в исходное состояние: стираем только его данные и перезапускаем
  function resetDemo() {
    const mine = DEMO_KEYS[demoBase];
    if (!mine || !window.confirm(t('demo.resetAsk'))) return;
    const frame = demoEl.querySelector('iframe');
    frame.src = 'about:blank';
    setTimeout(() => {
      try { Object.keys(localStorage).filter(mine).forEach(k => localStorage.removeItem(k)); } catch (e) {}
      frame.src = demoUrl;
      watchDemo();
    }, 150);
  }
  $$('[data-demo]').forEach(b => b.addEventListener('click', () => {
    // приложению передаём язык сайта (чешского в приложениях нет — тогда английский)
    const q = b.dataset.demoLang ? '?lang=' + (lang === 'cs' ? 'en' : lang) : '';
    openDemo(b.dataset.demo + q, b.dataset.demoName || '', b.dataset.demoHint, b.dataset.demo);
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
