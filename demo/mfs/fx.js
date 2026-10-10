'use strict';

/* =========================================================
   FX — анимации Math for Speed.
   Все эффекты короткие и не блокируют ввод; выключаются в Настройках.
   Номера в комментариях — пункты из списка 150 анимаций.
   ========================================================= */

const FX = (() => {
  const VIEW_ORDER = { dashboard: 0, training: 1, stats: 2, settings: 3, game: 4, results: 5 };
  const GOLD = ['#e3bf6b', '#f7e3a3', '#c9963c'];
  const CONFETTI = ['#e3bf6b', '#f06a6e', '#5fd391', '#779bf3', '#a98afa', '#f5a25c'];
  const finePointer = window.matchMedia('(pointer: fine)');

  let layer = null;
  let prevView = null;
  let lastXp = 0;
  let lastLevel = null;
  let avatarFlipped = false;
  let lastLightning = 0;
  let segPrev = {};
  let prevDonut = null;
  let lastHoverDraw = new WeakMap();
  let newAchievements = new Set();
  let enterTimer = null;

  const on = () => typeof data !== 'undefined' && data.settings.animations !== false;
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const rand = (a, b) => a + Math.random() * (b - a);

  function getLayer() {
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'fx-layer';
      document.body.appendChild(layer);
    }
    return layer;
  }

  function restart(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
  }

  // Класс-анимация на время ms
  function pulse(el, cls, ms = 700) {
    if (!on() || !el) return;
    restart(el, cls);
    clearTimeout(el[`__fx_${cls}`]);
    el[`__fx_${cls}`] = setTimeout(() => el.classList.remove(cls), ms);
  }

  const rectCenter = el => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
  };

  function spawn(html, cls, x, y, ms) {
    const el = document.createElement('div');
    el.className = `fx ${cls}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.innerHTML = html;
    getLayer().appendChild(el);
    setTimeout(() => el.remove(), ms);
    return el;
  }

  /* ---------- Частицы: искры, конфетти, дым, пыль ластика ---------- */

  function burst(x, y, { count = 10, colors = GOLD, kind = 'spark', spread = 70, ms = 700 } = {}) {
    if (!on()) return;
    // Слабый телефон — меньше частиц
    if (window.FX_LITE) count = Math.max(3, Math.round(count * 0.35));
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = spread * rand(0.35, 1);
      let dx = Math.cos(a) * d;
      let dy = Math.sin(a) * d;
      if (kind === 'confetti') dy += rand(40, 110);
      if (kind === 'smoke') { dx = rand(-14, 14); dy = -rand(25, 60); }
      if (kind === 'dust') { dx = rand(-18, 18); dy = rand(10, 40); }
      const p = document.createElement('i');
      p.className = `fx-p fx-${kind}`;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);
      p.style.setProperty('--rot', `${rand(-300, 300)}deg`);
      p.style.setProperty('--c', colors[i % colors.length]);
      p.style.animationDuration = `${ms * rand(0.7, 1.2)}ms`;
      frag.appendChild(p);
      setTimeout(() => p.remove(), ms * 1.3);
    }
    getLayer().appendChild(frag);
  }

  function burstAt(el, opts) {
    if (!on() || !el) return;
    const c = rectCenter(el);
    burst(c.x, c.y, opts);
  }

  /* ---------- Летящие и всплывающие надписи ---------- */

  function fly(html, from, to, { cls = '', ms = 650 } = {}) {
    if (!on() || !from || !to) return;
    const a = rectCenter(from);
    const b = rectCenter(to);
    const el = spawn(html, `fx-fly ${cls}`, a.x, a.y, ms + 60);
    el.style.setProperty('--tx', `${b.x - a.x}px`);
    el.style.setProperty('--ty', `${b.y - a.y}px`);
    el.style.animationDuration = `${ms}ms`;
  }

  function floatUp(html, from, { cls = '', ms = 850 } = {}) {
    if (!on() || !from) return;
    const c = rectCenter(from);
    const el = spawn(html, `fx-float ${cls}`, c.x, c.y, ms + 60);
    el.style.animationDuration = `${ms}ms`;
  }

  // Крупная надпись поверх экрана: «Старт!», «В ударе!», «Молния!»
  function shout(html, { cls = '', at = null, ms = 900, scatter = false } = {}) {
    if (!on()) return;
    const c = at ? rectCenter(at) : { x: innerWidth / 2, y: innerHeight / 2 };
    spawn(html, `fx-shout ${cls}`, c.x, c.y, ms + 60).style.animationDuration = `${ms}ms`;
    if (scatter) setTimeout(() => burst(c.x, c.y, { count: 16, kind: 'stroke', colors: GOLD, spread: 120 }), ms * 0.45);
  }

  /* ---------- Карандашные пометки поверх элементов ---------- */

  const DECO = {
    oval: 'M10 58C4 18 92 4 96 46C99 88 12 99 5 52C3 36 20 20 44 16',
    strike: 'M2 58L98 42',
    check: 'M14 54L38 80L88 18',
    cross: 'M18 18L82 82M82 18L18 82',
    crack: 'M0 1.5L10 4L18 .8L30 4.5L40 1.2L52 4L62 .6L74 3.8L86 1L100 3',
    frame: 'M5 6H95V94H5Z',
    underline: 'M3 70C30 62 70 62 97 68',
  };

  function deco(el, kind, { color = '#efe6d2', width = 3, ms = 450, persist = false, cls = '' } = {}) {
    if (!on() || !el) return null;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `fx-deco fx-deco-${kind} ${cls}`);
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = `<g><path d="${DECO[kind]}" pathLength="1" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="--d:${ms}ms"/></g>`;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(svg);
    if (!persist) setTimeout(() => svg.remove(), ms + 700);
    return svg;
  }

  // Пометка в слое поверх (элемент может исчезнуть сразу)
  function decoAt(el, kind, opts = {}) {
    if (!on() || !el) return;
    const r = el.getBoundingClientRect();
    const box = spawn('', `fx-deco-box ${opts.boxCls || ''}`, r.left, r.top, (opts.ms || 450) + 800);
    box.style.width = `${r.width}px`;
    box.style.height = `${r.height}px`;
    deco(box, kind, { ...opts, persist: true });
    return box;
  }

  /* ---------- Счётчики и печать текста ---------- */

  function countUp(el, to, { from = 0, ms = 900, decimals = 0, suffix = '' } = {}) {
    if (!el) return;
    const fmt = v => `${decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString(I18N.locale)}${suffix}`;
    if (!on() || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = fmt(from);
    requestAnimationFrame(step);
  }

  function typeText(el, speed = 32) { // 6
    if (!on() || !el) return;
    const text = el.textContent;
    el.textContent = '';
    el.classList.add('fx-typing');
    let i = 0;
    const timer = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) {
        clearInterval(timer);
        setTimeout(() => el.classList.remove('fx-typing'), 900);
      }
    }, speed);
  }

  /* ---------- Карандашные иконки ---------- */

  // Рисование карандашом. Все классы снимаются и ставятся пачкой — с одним пересчётом
  // вёрстки на все иконки, а не по пересчёту на каждую (из-за этого дёргались вкладки).
  function drawIcons(root, limit = 12) { // 21, 22
    if (!on() || !root) return;
    const icons = (root.matches?.('svg.ill') ? [root] : qsa('svg.ill', root))
      .filter(svg => !svg.querySelector('use'))
      .slice(0, limit);
    if (!icons.length) return;
    icons.forEach(svg => svg.classList.remove('fx-draw'));
    void root.offsetWidth;
    icons.forEach((svg, i) => {
      svg.style.setProperty('--di', `${Math.min(i, 8) * 40}ms`);
      svg.classList.add('fx-draw');
    });
    setTimeout(() => icons.forEach(svg => svg.classList.remove('fx-draw')), 1400);
  }

  function swapIcon(container, html) { // 24
    if (!on() || !container) { if (container) container.innerHTML = html; return; }
    const old = container.querySelector('svg.ill');
    if (!old) { container.innerHTML = html; drawIcons(container); return; }
    old.classList.add('fx-erase');
    setTimeout(() => {
      container.innerHTML = html;
      drawIcons(container);
      pulse(container.querySelector('svg.ill'), 'fx-hover', 900);
    }, 220);
  }

  /* ---------- Оверлеи экрана ---------- */

  function vignette(kind, ms = 600) { // 58, 86
    if (!on()) return;
    const el = spawn('', `fx-vignette fx-vignette-${kind}`, 0, 0, ms);
    el.style.animationDuration = `${ms}ms`;
  }

  function speedLines(ms = 450) { // 59
    if (!on()) return;
    spawn('', 'fx-speedlines', 0, 0, ms).style.animationDuration = `${ms}ms`;
  }

  function topFlash() { // 4
    if (!on()) return;
    spawn('', 'fx-topflash', 0, 0, 700);
  }

  function comet() { // 97, 30
    if (!on()) return;
    spawn(ico('comet'), 'fx-comet', 0, 0, 1300);
  }

  function levelUp(level) { // 125, 126
    if (!on()) return;
    const el = spawn(`
      <div class="lv-rays"></div>
      <div class="lv-coin"><span>${level}</span></div>
      <div class="lv-text">${tr('Новый уровень!')}</div>`, 'fx-levelup', 0, 0, 2300);
    el.addEventListener('click', () => el.remove());
    setTimeout(() => burst(innerWidth / 2, innerHeight / 2, { count: 26, kind: 'confetti', colors: CONFETTI, spread: 180, ms: 1200 }), 450);
  }

  function achievementToast(a, delay = 0) { // 133
    if (!on()) return;
    setTimeout(() => {
      const el = spawn(`<span class="at-ico">${ico(a.icon)}</span><span><small>${tr('Достижение открыто')}</small><b>${a.name}</b></span>`, 'fx-ach-toast', 0, 0, 2600);
      if (a.color) el.style.setProperty('--rc', a.color);
      drawIcons(el);
    }, delay);
  }

  function eraseScreen(done) { // 149
    if (!on()) { done(); return; }
    const app = document.getElementById('app');
    spawn(ico('backspace'), 'fx-eraser', 0, 0, 900);
    app.classList.add('fx-erasing');
    setTimeout(() => { app.classList.remove('fx-erasing'); done(); }, 750);
  }

  /* ---------- Кнопки: рябь, наклон, перерисовка иконок при наведении ---------- */

  const RIPPLE_SEL = '.btn, .chip, .mode-card, .action-tile, .row-card, button.list-row, .nav-item, .segmented button, .numpad button, .choices button, .icon-sq, .nav-fab';
  const TILT_SEL = '.mode-card, .action-tile, .tile, .ach';
  const HOVER_SEL = '.mode-card, .action-tile, .row-card, .icon-sq, .chip, .ach, .tile, .nav-item, .emoji-sq, .pill-stat, .btn, .banner, .list-row';

  function ripple(e) { // 16
    const host = e.target.closest(RIPPLE_SEL);
    if (!on() || !host) return;
    const r = host.getBoundingClientRect();
    let wrap = host.querySelector(':scope > .fx-ripple-wrap');
    if (!wrap) {
      wrap = document.createElement('span');
      wrap.className = 'fx-ripple-wrap';
      host.appendChild(wrap);
    }
    const dot = document.createElement('span');
    const size = Math.max(r.width, r.height) * 2.2;
    dot.className = 'fx-ripple';
    dot.style.width = dot.style.height = `${size}px`;
    dot.style.left = `${e.clientX - r.left - size / 2}px`;
    dot.style.top = `${e.clientY - r.top - size / 2}px`;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 650);
  }

  // Наклон карточки за курсором. Размеры берём из кеша, а сам поворот
  // применяем раз в кадр — иначе каждое движение мыши заставляет браузер
  // пересчитывать вёрстку и появляются рывки.
  let tiltHost = null;
  let tiltRect = null;
  let tiltPending = null;

  function tilt(e) { // 15
    if (!on() || !finePointer.matches) return;
    const host = e.target.closest(TILT_SEL);
    if (!host) return;
    if (host !== tiltHost) {
      tiltHost = host;
      tiltRect = host.getBoundingClientRect();
    }
    tiltPending = { x: e.clientX, y: e.clientY };
    if (tilt.frame) return;
    tilt.frame = requestAnimationFrame(() => {
      tilt.frame = 0;
      if (!tiltHost || !tiltRect || !tiltPending) return;
      const px = (tiltPending.x - tiltRect.left) / tiltRect.width - 0.5;
      const py = (tiltPending.y - tiltRect.top) / tiltRect.height - 0.5;
      tiltHost.style.setProperty('--ry', `${(px * 10).toFixed(2)}deg`);
      tiltHost.style.setProperty('--rx', `${(-py * 10).toFixed(2)}deg`);
      tiltHost.classList.add('fx-tilting');
    });
  }

  function untilt(e) {
    const host = e.target.closest?.(TILT_SEL);
    if (!host || host.contains(e.relatedTarget)) return;
    host.style.removeProperty('--rx');
    host.style.removeProperty('--ry');
    host.classList.remove('fx-tilting');
    if (host === tiltHost) { tiltHost = null; tiltRect = null; }
  }

  function hoverDraw(e) { // 25, 26–33, 138
    if (!on() || !finePointer.matches) return;
    const host = e.target.closest(HOVER_SEL);
    if (!host || host.contains(e.relatedTarget)) return;
    const now = performance.now();
    if (now - (lastHoverDraw.get(host) || 0) < 900) return;
    lastHoverDraw.set(host, now);
    qsa('svg.ill', host).slice(0, 4).forEach(svg => {
      pulse(svg, 'fx-hover', 1100);
      if (svg.classList.contains('ill-bolt')) burstAt(svg, { count: 7, kind: 'stroke', spread: 34, ms: 450 });
      if (svg.classList.contains('ill-rocket')) setTimeout(() => burstAt(svg, { count: 6, kind: 'smoke', ms: 700 }), 250);
    });
  }

  /* ---------- Нижнее меню ---------- */

  function moveNavIndicator() { // 36
    const nav = document.querySelector('.bottom-nav');
    const ind = nav?.querySelector('.nav-indicator');
    if (!ind) return;
    const active = nav.querySelector('.nav-item.active');
    if (!active) { ind.style.opacity = '0'; return; }
    ind.style.opacity = '1';
    ind.style.transform = `translateX(${active.offsetLeft + active.offsetWidth * 0.22}px)`;
    ind.style.width = `${active.offsetWidth * 0.56}px`;
  }

  function navActivated(view) { // 37, 38
    moveNavIndicator();
    if (!on()) return;
    const item = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (!item) return;
    pulse(item.querySelector('.nav-ico'), 'fx-jump', 600);
    drawIcons(item);
  }

  function setBadge(visible) { // 43
    const item = document.querySelector('.nav-item[data-view="stats"]');
    if (!item) return;
    let badge = item.querySelector('.nav-badge');
    if (visible && !badge) {
      badge = document.createElement('i');
      badge.className = 'nav-badge';
      item.appendChild(badge);
    } else if (!visible && badge) {
      badge.remove();
    }
  }

  let lastScrollY = 0;
  function onScroll() { // 39
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return;
    const y = window.scrollY;
    if (!on() || document.body.classList.contains('in-game')) { nav.classList.remove('nav-hidden'); lastScrollY = y; return; }
    if (y > lastScrollY + 8 && y > 120) nav.classList.add('nav-hidden');
    else if (y < lastScrollY - 8 || y < 60) nav.classList.remove('nav-hidden');
    lastScrollY = y;
  }

  function fabLaunch(start) { // 40
    const fab = document.querySelector('.nav-fab');
    if (!on() || !fab) { start(); return; }
    pulse(fab, 'fx-launch', 500);
    setTimeout(start, 230);
  }

  /* ---------- Переходы между экранами ---------- */

  const STAGGER_PARENTS = '.mode-cards, .actions3, .ach-grid, .tiles, .grid, .flow-cards, .stack, .setup, .week, .inner-list, .list, .chips, .pills';
  const REVEAL_SEL = '#app > *, .mode-cards > *, .actions3 > *, .ach-grid > *, .stack > *, .setup > *, .grid > *, .flow-cards > *';
  let revealObserver = null;

  function indexChildren(root) {
    qsa(STAGGER_PARENTS, root).forEach(parent => {
      [...parent.children].forEach((child, i) => child.style.setProperty('--i', i));
    });
    qsa('.day-head, .session-card', root).forEach((el, i) => el.style.setProperty('--i', Math.min(i, 14)));
  }

  /* Вход на экран. Раньше здесь для каждого блока и каждой иконки браузер
     пересчитывал вёрстку — отсюда рывок при смене вкладок. Теперь только запись
     классов без чтения размеров, а всё движение — прозрачность и сдвиг,
     которые видеокарта рисует без перерисовки страницы. */
  function enterView(view) { // 1, 2, 3, 4, 5
    const app = document.getElementById('app');
    indexChildren(app);
    if (!on()) {
      prevView = view;
      requestAnimationFrame(() => syncSegments(false));
      return;
    }

    const dir = prevView === null ? 'up' : (VIEW_ORDER[view] >= VIEW_ORDER[prevView] ? 'right' : 'left');
    app.classList.remove('fx-enter', 'fx-from-left', 'fx-from-right', 'fx-from-up');
    // Перезапуск анимации без чтения размеров страницы
    app.style.animation = 'none';
    requestAnimationFrame(() => {
      app.style.animation = '';
      app.classList.add('fx-enter', `fx-from-${dir}`);
      syncSegments(false);
    });
    clearTimeout(enterTimer);
    enterTimer = setTimeout(() => app.classList.remove('fx-enter', 'fx-from-left', 'fx-from-right', 'fx-from-up'), 1200);
    if (prevView !== null && prevView !== view) topFlash();
    prevView = view;
    revealObserver?.disconnect();
  }

  /* ---------- Переключатели: чипы и сегменты ---------- */

  function beforeAction() {
    segPrev = {};
    qsa('.segmented').forEach(seg => {
      const act = seg.querySelector('button.on');
      const key = seg.querySelector('button')?.dataset.action;
      if (act && key) segPrev[key] = { left: act.offsetLeft, top: act.offsetTop, width: act.offsetWidth, height: act.offsetHeight };
    });
  }

  function syncSegments(animate) { // 20
    qsa('.segmented').forEach(seg => {
      const active = seg.querySelector('button.on');
      let ind = seg.querySelector('.seg-ind');
      if (!active) { ind?.remove(); return; }
      if (!ind) {
        ind = document.createElement('span');
        ind.className = 'seg-ind';
        seg.prepend(ind);
      }
      seg.classList.add('has-ind');
      const key = active.dataset.action;
      const to = { left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight };
      const from = animate && on() ? segPrev[key] : null;
      const place = p => {
        ind.style.transform = `translate(${p.left}px, ${p.top}px)`;
        ind.style.width = `${p.width}px`;
        ind.style.height = `${p.height}px`;
      };
      if (from && (from.left !== to.left || from.top !== to.top)) {
        ind.style.transition = 'none';
        place(from);
        void ind.offsetWidth;
        ind.style.transition = '';
      }
      place(to);
    });
  }

  function afterAction(action, dataset) { // 19
    if (['nav', 'quick', 'start', 'start-last', 'record', 'end', 'focusop', 'reset'].includes(action)) return;
    indexChildren(document.getElementById('app'));
    syncSegments(['level', 'answermode', 'period'].includes(action));
    if (!on()) return;
    const sel = {
      op: `[data-action="op"][data-op="${dataset.op}"]`,
      tnum: `[data-action="tnum"][data-n="${dataset.n}"]`,
      goal: `[data-action="goal"][data-n="${dataset.n}"]`,
    }[action];
    const chip = sel && document.querySelector(sel);
    if (chip?.classList.contains('on')) pulse(chip, 'fx-fill', 500);
    if (chip) drawIcons(chip);
    if (action === 'mode') {
      const card = document.querySelector('.mode-card.selected');
      pulse(card, 'fx-select', 600);
      drawIcons(card);
      drawIcons(document.querySelector('.summary'));
    }
    if (action === 'answermode') drawIcons(document.querySelector('.segmented button.on'));
  }

  /* ---------- Логотип при запуске ---------- */

  function boot() { // 7, 8, 9, 23, 34, 35
    document.body.classList.toggle('fx-on', on());
    const mark = document.querySelector('.brand-mark');
    if (on() && mark && !mark.querySelector('.logo-draw')) {
      mark.insertAdjacentHTML('beforeend', `<svg class="logo-draw" viewBox="0 0 40 50" aria-hidden="true"><g><path d="M34 7H7l15 18L7 43h28" pathLength="1"/></g></svg>`);
      mark.classList.add('fx-logo');
      setTimeout(() => mark.querySelector('.logo-draw')?.remove(), 1900);
    }

    const nav = document.querySelector('.bottom-nav');
    if (nav && !nav.querySelector('.nav-indicator')) nav.insertAdjacentHTML('beforeend', '<span class="nav-indicator"></span>');

    document.addEventListener('pointerdown', ripple, { passive: true });
    document.addEventListener('pointermove', tilt, { passive: true });
    document.addEventListener('pointerout', untilt, { passive: true });
    document.addEventListener('pointerover', hoverDraw, { passive: true });
    document.addEventListener('click', e => { // 135
      const locked = e.target.closest('.ach.locked');
      if (locked) pulse(locked.querySelector('.ach-lock'), 'fx-wiggle', 600);
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { moveNavIndicator(); syncSegments(false); });
  }

  function apply() {
    document.body.classList.toggle('fx-on', on());
  }

  /* ---------- Главная ---------- */

  function dashboard({ xp, level, goalPct, streak }) {
    const app = document.getElementById('app');
    const avatar = app.querySelector('.avatar');
    if (on() && avatar) {
      if (lastLevel !== null && level > lastLevel) { // 47
        avatar.innerHTML = `<span class="av-old">${lastLevel}</span><span class="av-new">${level}</span>`;
      } else if (!avatarFlipped) { // 46
        avatar.classList.add('fx-flip');
        avatarFlipped = true;
      }
    }
    lastLevel = level;

    countUp(app.querySelector('.hero-value .num'), xp, { from: on() ? lastXp : xp }); // 44
    lastXp = xp;

    typeText(app.querySelector('.greet h1')); // 6

    const fire = app.querySelector('.pill-stat .ill-fire'); // 48
    if (fire) fire.style.setProperty('--heat', Math.min(streak, 14) / 14);

    const goalRow = app.querySelector('.goal-row');
    if (on() && goalRow && goalPct >= 100) { // 49, 50
      setTimeout(() => {
        const bar = goalRow.querySelector('.bar');
        if (!bar) return;
        const r = bar.getBoundingClientRect();
        burst(r.right - 4, r.top + r.height / 2, { count: 12, spread: 50 });
        deco(goalRow.querySelector('.goal-title'), 'underline', { color: '#e3bf6b', width: 2.5, ms: 700, persist: true, cls: 'goal-line' });
      }, 900);
    }

    // 131, 132 — только что открытые достижения
    newAchievements.forEach(id => {
      const card = app.querySelector(`.ach[data-ach="${id}"]`);
      if (!card || !on()) return;
      card.classList.add('just-unlocked');
      card.insertAdjacentHTML('beforeend', `<span class="stamp">${tr('Получено')}</span>`);
    });
    newAchievements.clear();
  }

  /* ---------- Игра ---------- */

  function countDigit(el, n) { // 54, 55, 56
    if (!on()) { el.textContent = n; return; }
    el.classList.remove('count');
    el.innerHTML = `
      <span class="cd">
        <svg class="cd-ring" viewBox="0 0 100 100"><g><circle cx="50" cy="50" r="44" pathLength="1"/></g></svg>
        <span class="cd-digit">${n}</span>
        <svg class="cd-strike" viewBox="0 0 100 100" preserveAspectRatio="none"><g><path d="M18 70L84 30" pathLength="1"/></g></svg>
      </span>`;
  }

  function gameStart(card) { // 57, 58, 59, 61
    document.body.classList.remove('fx-countdown');
    if (!on()) return;
    shout(tr('Старт!'), { cls: 'fx-start', at: card, ms: 800, scatter: true });
    speedLines();
  }

  function countdownBegin() { // 58, 61
    if (on()) document.body.classList.add('fx-countdown');
    const card = document.getElementById('gCard');
    if (card) setTimeout(() => card.classList.remove('fx-drop'), 900);
  }

  // Токены задачи появляются по очереди: «7», «×», «8»
  function tokenize(html) { // 64
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const out = [];
    let i = 0;
    tpl.content.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) out.push(part);
          else out.push(`<span class="tok" style="--t:${i++}">${part}</span>`);
        });
      } else {
        out.push(`<span class="tok" style="--t:${i++}">${node.outerHTML}</span>`);
      }
    });
    return out.join('');
  }

  function problemIn(el, html, { style = 'slide', first = false } = {}) { // 62, 63, 68, 69
    if (!on()) { el.innerHTML = html; return; }
    if (!first && el.innerHTML.trim()) {
      const r = el.getBoundingClientRect();
      const ghost = spawn(el.innerHTML, `fx-problem-ghost fx-out-${style}`, r.left, r.top, 320);
      ghost.style.width = `${r.width}px`;
      ghost.style.height = `${r.height}px`;
      ghost.style.fontSize = getComputedStyle(el).fontSize;
    }
    el.innerHTML = tokenize(html);
    restart(el, `fx-in-${style}`);
    el.classList.remove(style === 'slide' ? 'fx-in-flip' : 'fx-in-slide');
  }

  function choicesIn(container, first) { // 112, 113, 114, 116, 119
    [...container.children].forEach((btn, i) => {
      btn.style.setProperty('--i', i);
      btn.style.setProperty('--sx', `${rand(-30, 30)}px`);
      btn.style.setProperty('--sy', `${rand(-18, 18)}px`);
      btn.style.setProperty('--sr', `${rand(-8, 8)}deg`);
      btn.insertAdjacentHTML('beforeend', '<svg class="pencil-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g><rect x="3" y="4" width="94" height="92" rx="14" pathLength="1" vector-effect="non-scaling-stroke"/></g></svg>');
    });
    if (!on()) return;
    restart(container, first ? 'fx-fan' : 'fx-shuffle');
    container.classList.remove(first ? 'fx-shuffle' : 'fx-fan');
  }

  // Цифры ответа поверх поля ввода — чтобы каждая могла прыгать
  function digits(value, prev) { // 60, 65, 67, 71
    const box = document.getElementById('gDigits');
    const wrap = box?.parentElement;
    if (!box) return;
    wrap.classList.toggle('empty', !value);
    if (!on()) { box.textContent = ''; return; }
    if (value.length === prev.length + 1 && value.startsWith(prev)) {
      box.querySelector('.caret')?.remove();
      box.insertAdjacentHTML('beforeend', `<span class="dg fx-pop">${value.slice(-1)}</span><span class="caret"></span>`);
      pulse(wrap, 'typing', 400);
      return;
    }
    if (value.length === prev.length - 1 && prev.startsWith(value)) {
      const spans = box.querySelectorAll('.dg');
      const last = spans[spans.length - 1];
      if (last) {
        burstAt(last, { count: 8, kind: 'dust', colors: ['#bdb6a6', '#8a8a8a'], ms: 600 });
        last.remove();
      }
      if (!value) box.innerHTML = '';
      return;
    }
    box.innerHTML = value ? [...value].map(ch => `<span class="dg">${ch}</span>`).join('') + '<span class="caret"></span>' : '';
  }

  // Аккуратная отметка «верно / неверно»: маленький значок у поля ответа и подсветка рамки
  function mark(ok, target) {
    const host = target || document.querySelector('.answer-wrap:not([hidden])');
    if (!host) return;
    const path = ok ? 'M11.5 20.5l5.5 5.5 11.5-12.5' : 'M14 14l12 12M26 14L14 26';
    const m = document.createElement('span');
    m.className = `fx-mark ${ok ? 'ok' : 'bad'}`;
    m.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17.5" pathLength="1"/><path d="${path}" pathLength="1"/></svg>`;
    host.appendChild(m);
    setTimeout(() => m.remove(), 750);
    // Подсвечиваем саму рамку поля (или кнопки варианта)
    const box = target || host.querySelector('.answer') || host;
    box.classList.remove('flash-ok', 'flash-bad');
    void box.offsetWidth;
    box.classList.add(ok ? 'flash-ok' : 'flash-bad');
    setTimeout(() => box.classList.remove('flash-ok', 'flash-bad'), 600);
  }

  function correct({ g, ms, xpGain, from, chosen }) {
    if (!on()) return;
    const card = document.getElementById('gCard');
    const correctEl = document.getElementById('gCorrect');
    const src = chosen || document.querySelector('.answer-wrap') || card;

    mark(true, chosen); // 73
    if (chosen) { // 117
      const r = chosen.getBoundingClientRect();
      const ghost = spawn(chosen.innerHTML, 'fx-choice-ghost ok', r.left, r.top, 500);
      ghost.style.width = `${r.width}px`;
      ghost.style.height = `${r.height}px`;
    }
    fly(from, src, correctEl, { cls: 'fx-answer-fly' }); // 74
    pulse(correctEl, 'fx-bump', 450); // 75
    burstAt(card, { count: 8, spread: 90, kind: 'stroke', ms: 550 }); // 76
    floatUp(`${tr('{0} с', (ms / 1000).toFixed(1))}`, document.getElementById('gFeedback'), { cls: 'fx-time' }); // 77
    if (ms < 800 && performance.now() - lastLightning > 4000) { // 78
      lastLightning = performance.now();
      shout(`${tr('{0} Молния!', ico('bolt'))}`, { cls: 'fx-lightning', at: card, ms: 750 });
    }
    fly(`+${xpGain} XP`, card, document.getElementById('levelChip'), { cls: 'fx-xp-fly', ms: 800 }); // 79
    pulse(card, 'fx-bump-card', 350); // 80
    if (g.correct % 10 === 0) burstAt(card, { count: 30, kind: 'confetti', colors: CONFETTI, spread: 160, ms: 1100 }); // 81

    streakFx(g, true);
  }

  function streakFx(g, ok, prevStreak = 0) { // 92–101
    const streakEl = document.getElementById('gStreak');
    const fire = document.getElementById('gFire');
    const mult = document.getElementById('gMult');
    const combo = document.getElementById('gCombo');
    const card = document.getElementById('gCard');
    if (!streakEl) return;

    const s = g.streak;
    fire?.style.setProperty('--heat', Math.min(s, 30) / 30);
    streakEl.classList.toggle('s-gold', s >= 10 && s < 20);
    streakEl.classList.toggle('s-orange', s >= 20);

    const m = s >= 10 ? Math.floor(s / 10) + 1 : 0;
    if (mult) {
      const text = m ? `×${m}` : '';
      if (mult.textContent !== text) {
        mult.textContent = text;
        if (text) pulse(mult, 'fx-pop', 500);
      }
    }

    if (combo) {
      const part = s % 5;
      combo.style.width = `${ok && s > 0 && part === 0 ? 100 : (part / 5) * 100}%`;
      if (ok && s > 0 && part === 0) pulse(combo.parentElement, 'fx-combo-full', 600);
    }

    card?.classList.toggle('on-fire', on() && s >= 10);
    if (!on()) return;

    if (ok) {
      if (s === 5) shout(tr('В ударе!'), { cls: 'fx-hot', at: card, ms: 900 });
      if (s >= 20) pulse(document.body, 'fx-beat', 400);
      if (s === 30) comet();
      if (s > data.bestStreak && data.bestStreak > 0 && !g.bestShown) {
        g.bestShown = true;
        const best = document.getElementById('gBest');
        if (best) { best.hidden = false; pulse(best, 'fx-pop', 600); drawIcons(best); }
      }
    } else if (prevStreak > 0) {
      pulse(streakEl, 'fx-break', 600);
      if (prevStreak >= 5) burstAt(fire, { count: 8, kind: 'smoke', colors: ['#6f6f6f', '#9a9a9a'], ms: 900 });
    }
  }

  function wrong({ g, given, prevStreak, timeout, lostLife }) {
    const card = document.getElementById('gCard');
    if (!on()) { streakFx(g, false, prevStreak); return; }

    if (!g.choiceMode && given !== null) { // 83, 89
      const digitsEl = document.getElementById('gDigits');
      if (digitsEl && digitsEl.textContent.trim()) {
        const r = digitsEl.getBoundingClientRect();
        const ghost = spawn(`<span>${given}</span>`, 'fx-wrong-ghost', r.left, r.top, 900);
        ghost.style.width = `${r.width}px`;
        ghost.style.height = `${r.height}px`;
        deco(ghost, 'strike', { color: '#f06a6e', width: 4, ms: 220, persist: true });
      }
    }
    if (!g.choiceMode) mark(false); // 85
    vignette('red', 550); // 86
    streakFx(g, false, prevStreak); // 87, 99

    if (g.mode === 'blitz') { // 88
      const time = document.getElementById('gTime');
      const r = time.getBoundingClientRect();
      const el = spawn(`${tr('+{0} с', g.penaltyStep || BLITZ_PENALTY)}`, 'fx-penalty', r.left + r.width / 2, r.top - 50, 700);
      setTimeout(() => pulse(time, 'fx-shake-sm', 400), 520);
      void el;
    }

    if (timeout) pulse(document.querySelector('.game .pill .ill'), 'fx-ring', 700); // 105
    if (lostLife !== undefined) loseHeart(lostLife); // 106
  }

  function loseHeart(index) { // 106, 107
    const lives = document.getElementById('gLives');
    const heart = lives?.querySelectorAll('svg.ill')[index];
    if (!heart) return;
    const r = heart.getBoundingClientRect();
    const clone = spawn(heart.outerHTML, 'fx-heart-fall', r.left, r.top, 1000);
    clone.style.width = `${r.width}px`;
    clone.style.height = `${r.height}px`;
    deco(clone, 'crack', { color: '#1b1b1b', width: 3, ms: 200, persist: true });
  }

  function choiceWrong(container, chosenValue, rightValue) { // 90, 91, 115, 118
    [...container.children].forEach(btn => {
      if (btn.dataset.choice === chosenValue) {
        btn.classList.add('fx-wrong');
        deco(btn, 'cross', { color: '#f06a6e', width: 3, ms: 260, persist: true });
      } else if (btn.dataset.choice === rightValue) {
        btn.classList.add('fx-right');
      } else {
        btn.classList.add('fx-away');
      }
    });
  }

  function tickPop(el) { pulse(el, 'fx-tickpop', 300); } // 104

  function blitzDot(index, ok, total) { // 109, 110
    const dot = document.querySelectorAll('.blitz-dots i')[index];
    if (!dot) return;
    dot.classList.add(ok ? 'ok' : 'bad');
    if (index === total - 1) pulse(dot, 'fx-flash', 600);
  }

  function tableCell(problem) { // 111
    const svg = document.querySelector('.game .pill .ill-grid');
    if (!svg) return;
    const n = parseInt(problem.text, 10) || 0;
    svg.querySelectorAll('.cell').forEach(c => c.classList.remove('hot'));
    svg.querySelector(`.c${n % 9}`)?.classList.add('hot');
  }

  function finish(mode) { // 105, 110
    if (!on()) return 0;
    const pill = document.querySelector('.game .pill .ill');
    if (mode === 'blitz') pill?.classList.add('stopped');
    pulse(pill, 'fx-ring', 700);
    shout(tr('Финиш!'), { cls: 'fx-finish', at: document.getElementById('gCard'), ms: 700, scatter: true });
    return 650;
  }

  /* ---------- Результаты ---------- */

  function results({ session, isRecord, prevRecord, unlocked, levelUp: newLevel, xpBefore, xpAfter }) {
    const app = document.getElementById('app');
    const score = app.querySelector('.big-score');
    const isBlitz = session.mode === 'blitz';
    countUp(score, session.score, { decimals: isBlitz ? 1 : 0, suffix: isBlitz ? tr(' с') : '', ms: 1000 }); // 120

    // 127 — шкала опыта с переполнением
    const bar = app.querySelector('#rXpBar');
    const text = app.querySelector('#rXpText');
    if (bar) {
      const pct = xp => {
        const l = levelFromXp(xp);
        return ((xp - xpForLevel(l)) / (xpForLevel(l + 1) - xpForLevel(l))) * 100;
      };
      const lvlAfter = levelFromXp(xpAfter);
      text.textContent = `${tr('{0} / {1} XP до уровня {2}', xpAfter - xpForLevel(lvlAfter), xpForLevel(lvlAfter + 1) - xpForLevel(lvlAfter), lvlAfter + 1)}`;
      if (!on()) {
        bar.style.width = `${pct(xpAfter)}%`;
      } else {
        bar.style.transition = 'none';
        bar.style.width = `${pct(xpBefore)}%`;
        void bar.offsetWidth;
        bar.style.transition = '';
        if (newLevel) {
          setTimeout(() => { bar.style.width = '100%'; }, 350);
          setTimeout(() => { bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth; bar.style.transition = ''; }, 1150);
          setTimeout(() => { bar.style.width = `${pct(xpAfter)}%`; }, 1250);
        } else {
          setTimeout(() => { bar.style.width = `${pct(xpAfter)}%`; }, 350);
        }
      }
    }

    if (!on()) return;

    if (isRecord) { // 123, 124
      const banner = app.querySelector('.banner.record');
      setTimeout(() => {
        burstAt(banner, { count: 22, spread: 150, ms: 1000 });
        const old = banner?.querySelector('.old-record');
        if (old) deco(old, 'strike', { color: '#f06a6e', width: 2.5, ms: 400, persist: true });
      }, 450);
    }

    const acc = app.querySelector('.acc-ring circle.val'); // 130
    if (acc) setTimeout(() => acc.classList.add('go'), 300);

    if (newLevel) setTimeout(() => levelUp(newLevel), 700); // 125
    unlocked.forEach((a, i) => { // 133
      newAchievements.add(a.id);
      achievementToast(a, 1200 + i * 1400);
    });
    if (isRecord) setBadge(true); // 43
    void prevRecord;
  }

  /* ---------- Статистика ---------- */

  function stats(reason) { // 139–146
    const app = document.getElementById('app');
    const circles = qsa('.donut circle[data-op]', app);
    const current = {};
    circles.forEach(c => { current[c.dataset.op] = { dash: c.getAttribute('stroke-dasharray'), off: c.getAttribute('stroke-dashoffset') }; });

    const center = app.querySelector('.donut-center b');
    if (center) countUp(center, Number(center.textContent) || 0, { ms: 900 }); // 141

    if (on() && reason === 'period' && prevDonut) { // 143
      app.querySelector('.donut')?.classList.add('no-draw');
      const C = 2 * Math.PI * 110;
      circles.forEach(c => {
        const old = prevDonut[c.dataset.op] || { dash: `0 ${C}`, off: current[c.dataset.op].off };
        c.style.transition = 'none';
        c.style.strokeDasharray = old.dash;
        c.style.strokeDashoffset = old.off;
      });
      void app.offsetWidth;
      requestAnimationFrame(() => circles.forEach(c => {
        c.style.transition = '';
        c.style.strokeDasharray = current[c.dataset.op].dash;
        c.style.strokeDashoffset = current[c.dataset.op].off;
      }));
    }
    prevDonut = current;
    setBadge(false);
  }

  /* ---------- Настройки ---------- */

  function volume(value) { // 148
    document.querySelectorAll('.vol-ico').forEach(el => el.style.setProperty('--vol', value));
  }

  /* ---------- Уведомление ---------- */

  function toastShow(el) { // 150
    el.classList.remove('fx-toast-out');
    restart(el, 'fx-toast-in');
  }

  function toastHide(el, done) {
    if (!on()) { done(); return; }
    el.classList.remove('fx-toast-in');
    el.classList.add('fx-toast-out');
    setTimeout(done, 280);
  }

  return {
    on, apply, boot, pulse, burst, burstAt, fly, floatUp, shout, deco, decoAt, countUp, drawIcons, swapIcon,
    vignette, speedLines, comet, levelUp, eraseScreen, enterView, beforeAction, afterAction, syncSegments,
    navActivated, moveNavIndicator, setBadge, fabLaunch, dashboard, countDigit, countdownBegin, gameStart,
    problemIn, choicesIn, digits, correct, wrong, streakFx, choiceWrong, tickPop, blitzDot, tableCell, finish,
    results, stats, volume, toastShow, toastHide,
  };
})();
