/* Квітковий магазин — шаблон. Без бібліотек. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  /* ===== Налаштування (змініть під клієнта) ===== */
  /*CONFIG-START*/
  var CONFIG = {"hours": {"0": ["08:00", "20:00"], "1": ["08:00", "21:00"], "2": ["08:00", "21:00"], "3": ["08:00", "21:00"], "4": ["08:00", "21:00"], "5": ["08:00", "21:00"], "6": ["08:00", "21:00"]}, "prepHours": 2, "slots": [[9, 12], [12, 15], [15, 18], [18, 21]], "telegram": "", "viber": "", "email": "", "sms": "sms:+380955769235", "instagramDm": "https://ig.me/m/floriya.if"};
  /*CONFIG-END*/

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var DAYS_ACC = ['у неділю', 'у понеділок', 'у вівторок', 'у середу', 'у четвер', 'у п\'ятницю', 'у суботу'];
  var DAYS_SHORT = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var live = !!CONFIG.hours;

  /* ===== Київський час ===== */
  function kyivNow() {
    var parts = {};
    try {
      var tz = 'Europe/Kyiv';
      try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); } catch (e) { tz = 'Europe/Kiev'; }
      new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
      var h = parseInt(parts.hour, 10) % 24;
      return { h: h, min: parseInt(parts.minute, 10), wd: DAYS_SHORT[parts.weekday], date: parts.year + '-' + parts.month + '-' + parts.day };
    } catch (e) {
      var n = new Date();
      return { h: n.getHours(), min: n.getMinutes(), wd: n.getDay(), date: n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()) };
    }
  }
  function toH(str) { var p = str.split(':'); return parseInt(p[0], 10) + parseInt(p[1], 10) / 60; }
  function dayHours(wd) {
    if (!live) return null;
    var d = CONFIG.hours[String(wd)];
    return d ? [toH(d[0]), toH(d[1]), d[0], d[1]] : null;
  }
  // чи можна доставити слот у день wd; t — поточний час (лише для сьогодні)
  function slotOk(slot, wd, t) {
    if (!live) return true;
    var d = dayHours(wd);
    if (!d || slot[0] >= d[1] || slot[1] <= d[0]) return false;
    if (t == null) return true;
    return t + CONFIG.prepHours <= Math.min(slot[1], d[1]);
  }
  function slotLabel(s) { return pad(s[0]) + ':00 — ' + pad(s[1]) + ':00'; }

  function updateStatus() {
    if (!live) {
      $$('[data-live]').forEach(function (el) { el.hidden = true; });
      $$('[data-slot-board] em').forEach(function (el) { el.hidden = true; });
      $$('[data-slot-title]').forEach(function (el) { el.textContent = 'Слоти доставки'; });
      syncFormSlots();
      return;
    }
    var now = kyivNow();
    var t = now.h + now.min / 60;
    var today = dayHours(now.wd);
    var isOpen = !!today && t >= today[0] && t < today[1];
    var text;
    if (isOpen) text = 'Зараз відчинено · до ' + today[3];
    else if (today && t < today[0]) text = 'Зараз зачинено · відкриємося о ' + today[2];
    else {
      text = 'Зараз зачинено';
      for (var k = 1; k <= 7; k++) {
        var nd = dayHours((now.wd + k) % 7);
        if (nd) { text += ' · відкриємося ' + (k === 1 ? 'завтра' : DAYS_ACC[(now.wd + k) % 7]) + ' о ' + nd[2]; break; }
      }
    }
    $$('[data-open-text]').forEach(function (el) { el.textContent = text; });
    $$('[data-open-dot]').forEach(function (el) {
      el.classList.toggle('is-open', isOpen);
      el.classList.toggle('is-closed', !isOpen);
    });

    var next = null;
    $$('[data-slot-board] li').forEach(function (li, i) {
      var s = CONFIG.slots[i]; if (!s) return;
      var dayOk = slotOk(s, now.wd, null);
      var ok = slotOk(s, now.wd, t);
      var current = ok && t >= s[0] - CONFIG.prepHours;
      li.classList.toggle('is-past', !ok);
      li.classList.toggle('is-soon', current);
      li.querySelector('em').textContent = ok ? (current ? 'ще встигаємо' : 'вільно') : (dayOk ? 'закрито' : 'не працюємо');
      if (ok && !next) next = s;
    });
    var nextText = next ? 'сьогодні, ' + slotLabel(next) : '';
    if (!next) {
      for (var j = 1; j <= 7 && !nextText; j++) {
        var wd = (now.wd + j) % 7;
        for (var q = 0; q < CONFIG.slots.length; q++) {
          if (slotOk(CONFIG.slots[q], wd, null)) { nextText = (j === 1 ? 'завтра' : DAYS_ACC[wd]) + ', ' + slotLabel(CONFIG.slots[q]); break; }
        }
      }
    }
    var nextEl = $('[data-next-slot]');
    if (nextEl) nextEl.textContent = nextText || '—';
    syncFormSlots();
  }

  /* ===== Шапка й меню ===== */
  var header = $('.site-header');
  var burger = $('.burger');
  var nav = $('#nav');
  function onScroll() { header.classList.toggle('is-solid', window.scrollY > 30 || nav.classList.contains('is-open')); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    document.body.style.overflow = open ? 'hidden' : '';
    onScroll();
  }
  burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1024 && nav.classList.contains('is-open')) setMenu(false); });

  /* ===== Поява при скролі ===== */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ===== Конструктор букета ===== */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var PALETTES = {
    blush: { name: 'Рум\'янець', c: ['#f1b9c0', '#f8dcd9', '#e48a9b', '#fbeee9'], filler: '#ffffff', mix: 'кущові троянди, еустома, гвоздика, гіпсофіла' },
    white: { name: 'Біла класика', c: ['#fbf7ef', '#eef0e2', '#f4ead7', '#ffffff'], filler: '#dfe7c9', mix: 'білі троянди, маттіола, хризантема, евкаліпт' },
    wine:  { name: 'Червоне вино', c: ['#8e1c33', '#c23a4e', '#6b1228', '#d75a6a'], filler: '#f3d9dc', mix: 'темно-червоні троянди, ранункулюси, гвоздика' },
    sun:   { name: 'Сонячна', c: ['#f7c56b', '#f6a58a', '#fbe3a4', '#f08c6c'], filler: '#fff6dc', mix: 'персикові троянди, альстромерія, хризантема' },
    plum:  { name: 'Слива', c: ['#7a3d6c', '#b98ab8', '#d8c2e0', '#5a2550'], filler: '#efe4f2', mix: 'троянди сливового відтінку, лізіантус, лаванда' }
  };
  var MOODS = {
    tender:  { name: 'Ніжний', spread: 0.05, flat: 0.78, xs: 1, types: ['rose', 'rose', 'cup'], fillers: 0.5, leaves: 0.45, note: 'м\'яка куполоподібна форма' },
    joy:     { name: 'Радісний', spread: 0.22, flat: 0.86, xs: 1.08, types: ['daisy', 'rose', 'cup', 'daisy'], fillers: 0.35, leaves: 0.6, note: 'вільна форма з польовими акцентами' },
    passion: { name: 'Пристрасний', spread: 0.0, flat: 0.74, xs: 0.94, types: ['rose'], fillers: 0.1, leaves: 0.3, note: 'щільна куля без зайвого декору' },
    calm:    { name: 'Стриманий', spread: 0.1, flat: 1.08, xs: 0.8, types: ['cup', 'rose'], fillers: 0.2, leaves: 1.1, note: 'витягнутий силует і багато зелені' }
  };
  var SIZES = { s: { n: 7, label: 'S' }, m: { n: 12, label: 'M' }, l: { n: 19, label: 'L' }, xl: { n: 28, label: 'XL' } };

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r * (1 - k)); g = Math.round(g * (1 - k)); b = Math.round(b * (1 - k));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function el(name, attrs, parent) {
    var e = document.createElementNS(SVGNS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function drawBloom(g, type, x, y, r, col, rand, delay) {
    var pos = el('g', { transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')' }, g);
    var b = el('g', { 'class': 'bloom' }, pos);
    b.style.animationDelay = delay + 'ms';
    var rot = Math.round(rand() * 360);
    if (type === 'rose') {
      el('circle', { r: r, fill: col, stroke: shade(col, 0.18), 'stroke-width': 1 }, b);
      el('circle', { r: r * 0.7, fill: shade(col, 0.08) }, b);
      el('circle', { r: r * 0.42, fill: shade(col, 0.16) }, b);
      el('path', { d: 'M0 ' + (-r * 0.15) + ' a' + r * 0.18 + ' ' + r * 0.18 + ' 0 1 1 ' + r * 0.25 + ' ' + r * 0.2 + ' a' + r * 0.4 + ' ' + r * 0.4 + ' 0 1 1 ' + (-r * 0.62) + ' ' + (-r * 0.1) + ' a' + r * 0.62 + ' ' + r * 0.62 + ' 0 0 1 ' + r * 0.9 + ' ' + (-r * 0.46), fill: 'none', stroke: shade(col, 0.3), 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.7, transform: 'rotate(' + rot + ')' }, b);
    } else if (type === 'cup') {
      var cg = el('g', { transform: 'rotate(' + rot + ')' }, b);
      for (var i = 0; i < 6; i++) {
        el('ellipse', { cx: 0, cy: -r * 0.45, rx: r * 0.5, ry: r * 0.62, fill: i % 2 ? col : shade(col, 0.06), stroke: shade(col, 0.16), 'stroke-width': 0.8, transform: 'rotate(' + i * 60 + ')' }, cg);
      }
      el('circle', { r: r * 0.38, fill: shade(col, 0.14) }, b);
      el('circle', { r: r * 0.16, fill: shade(col, 0.28) }, b);
    } else {
      var dg = el('g', { transform: 'rotate(' + rot + ')' }, b);
      for (var j = 0; j < 10; j++) {
        el('ellipse', { cx: 0, cy: -r * 0.55, rx: r * 0.2, ry: r * 0.48, fill: col, stroke: shade(col, 0.12), 'stroke-width': 0.6, transform: 'rotate(' + j * 36 + ')' }, dg);
      }
      el('circle', { r: r * 0.3, fill: '#c98a2c' }, b);
      el('circle', { r: r * 0.16, fill: '#8a5a17' }, b);
    }
  }

  var form = $('#builderForm');
  var state = {};
  function readState() {
    state.mood = form.elements.mood.value || 'tender';
    state.palette = form.elements.palette.value || 'blush';
    state.size = form.elements.size.value || 'm';
  }

  function renderBouquet() {
    readState();
    var mood = MOODS[state.mood], pal = PALETTES[state.palette], size = SIZES[state.size];
    var seed = state.mood.length * 131 + state.palette.length * 977 + size.n * 31;
    var rand = rng(seed);
    var N = size.n;
    var R = 78 + Math.sqrt(N) * 13;
    var cx = 200, cy = 175;
    var w = R * mood.xs;
    var stems = $('#bqStems'), leaves = $('#bqLeaves'), blooms = $('#bqBlooms');
    stems.textContent = ''; leaves.textContent = ''; blooms.textContent = '';

    // папір позаду
    var top = cy - R * mood.flat * 0.55;
    $('#bqPaperBack').setAttribute('d', 'M' + (cx - w * 1.18) + ' ' + (top + 10) + ' L' + (cx - 20) + ' 412 L' + (cx + 20) + ' 412 L' + (cx + w * 1.18) + ' ' + (top + 10) + ' Q' + cx + ' ' + (top - 40) + ' ' + (cx - w * 1.18) + ' ' + (top + 10) + 'Z');
    // папір спереду
    var py = cy + R * 0.5;
    $('#bqPaper').setAttribute('d', 'M' + (cx - w * 1.02) + ' ' + py + ' Q' + (cx - w * 0.45) + ' ' + (py + 90) + ' ' + (cx - 22) + ' 418 L' + (cx + 22) + ' 418 Q' + (cx + w * 0.45) + ' ' + (py + 90) + ' ' + (cx + w * 1.02) + ' ' + py + ' Q' + cx + ' ' + (py + 52) + ' ' + (cx - w * 1.02) + ' ' + py + 'Z');
    // стрічка
    var ry = 372;
    $('#bqRibbon').setAttribute('d', 'M' + (cx - 26) + ' ' + ry + ' L' + (cx + 26) + ' ' + ry + ' M' + cx + ' ' + ry + ' c-18 -16 -36 -6 -24 6 c6 6 18 0 24 -6 c18 -16 36 -6 24 6 c-6 6 -18 0 -24 -6 M' + cx + ' ' + ry + ' l-14 34 M' + cx + ' ' + ry + ' l12 36');

    // стебла
    for (var s = 0; s < 7; s++) {
      var sx = cx - 12 + s * 4;
      el('line', { x1: sx, y1: 405, x2: cx - 22 + s * 7.5, y2: 452 + (s % 3) * 4 }, stems);
    }

    // листя по краю
    var L = Math.round(6 + N * mood.leaves);
    for (var l = 0; l < L; l++) {
      var a = Math.PI + (l / (L - 1 || 1)) * Math.PI + (rand() - 0.5) * 0.3;
      var lr = R * (0.92 + rand() * 0.22);
      var lx = cx + Math.cos(a) * lr * mood.xs, ly = cy + Math.sin(a) * lr * mood.flat + R * 0.12;
      var deg = a * 180 / Math.PI + 90;
      var lg = el('g', { transform: 'rotate(' + deg.toFixed(0) + ' ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ')' }, leaves);
      var leaf = el('ellipse', { cx: lx.toFixed(1), cy: ly.toFixed(1), rx: 7 + rand() * 4, ry: 20 + rand() * 10, fill: l % 2 ? '#5d6b3a' : '#7f8d57', 'class': 'leaf' }, lg);
      leaf.style.animationDelay = (reduceMotion ? 0 : l * 18) + 'ms';
    }

    // квіти (філотаксис)
    var pts = [];
    var br = 21 + Math.sqrt(N) * 2.6;
    for (var i = 0; i < N; i++) {
      var rr = R * 0.82 * Math.sqrt((i + 0.5) / N);
      var th = i * 2.39996 + 0.4;
      var jx = (rand() - 0.5) * R * mood.spread, jy = (rand() - 0.5) * R * mood.spread;
      pts.push({
        x: cx + Math.cos(th) * rr * mood.xs + jx,
        y: cy + Math.sin(th) * rr * mood.flat + jy,
        r: br * (0.82 + rand() * 0.34),
        type: mood.types[i % mood.types.length],
        col: pal.c[Math.floor(rand() * 3)]
      });
    }
    pts.sort(function (p, q) { return p.y - q.y; });
    // дрібні наповнювачі
    var F = Math.round(N * mood.fillers) + 2;
    var fillers = [];
    for (var f = 0; f < F; f++) {
      var fa = Math.PI * 1.05 + rand() * Math.PI * 0.9;
      var fr = R * (0.75 + rand() * 0.3);
      fillers.push({ x: cx + Math.cos(fa) * fr * mood.xs, y: cy + Math.sin(fa) * fr * mood.flat });
    }
    fillers.forEach(function (p, k) {
      var fg = el('g', { 'class': 'bloom' }, blooms);
      fg.style.animationDelay = (reduceMotion ? 0 : 60 + k * 25) + 'ms';
      for (var d = 0; d < 6; d++) {
        el('circle', { cx: (p.x + (rand() - 0.5) * 16).toFixed(1), cy: (p.y + (rand() - 0.5) * 16).toFixed(1), r: 2.4 + rand() * 1.6, fill: pal.filler, stroke: 'rgba(58,26,49,.18)', 'stroke-width': 0.6 }, fg);
      }
    });
    pts.forEach(function (p, k) {
      drawBloom(blooms, p.type, p.x, p.y, p.r, p.col, rand, reduceMotion ? 0 : 120 + k * 35);
    });

    $('#bqName').textContent = mood.name + ' букет · ' + pal.name + ' · ' + size.label;
    $('#bqMix').textContent = pal.mix.charAt(0).toUpperCase() + pal.mix.slice(1) + '; ' + mood.note + '.';
  }
  if (form) {
    form.addEventListener('change', renderBouquet);
    renderBouquet();
    $('#bqOrder').addEventListener('click', function () {
      readState();
      var wish = $('#f-wish');
      wish.value = 'Букет із конструктора: ' + $('#bqName').textContent + '. ' + $('#bqMix').textContent;
      var target = $('#order');
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { $('#f-name').focus({ preventScroll: true }); }, reduceMotion ? 0 : 700);
    });
  }

  /* ===== Форма замовлення ===== */
  var order = $('#orderForm');
  var dateInput = $('#f-date');
  function syncFormSlots() {
    if (!order) return;
    var now = kyivNow();
    if (dateInput && !dateInput.min) dateInput.min = now.date;
    var val = dateInput && dateInput.value;
    var wd = null;
    if (val) { var p = val.split('-'); wd = new Date(+p[0], +p[1] - 1, +p[2]).getDay(); }
    var isToday = val === now.date;
    var t = now.h + now.min / 60;
    $$('[data-form-slots] input').forEach(function (inp, i) {
      var dis = live && wd !== null && !slotOk(CONFIG.slots[i], wd, isToday ? t : null);
      inp.disabled = dis;
      if (dis && inp.checked) inp.checked = false;
    });
  }
  if (order) {
    var addrField = $('[data-address]');
    order.addEventListener('change', function (e) {
      if (e.target.name === 'way') {
        var pickup = e.target.value === 'Самовивіз';
        addrField.hidden = pickup;
        if (pickup) addrField.classList.remove('is-invalid');
      }
      if (e.target === dateInput) syncFormSlots();
      var f = e.target.closest('.field');
      if (f) f.classList.remove('is-invalid');
    });
    order.addEventListener('input', function (e) {
      var f = e.target.closest('.field');
      if (f) f.classList.remove('is-invalid');
    });

    order.addEventListener('submit', function (e) {
      e.preventDefault();
      var now = kyivNow();
      var name = order.elements['name'].value.trim();
      var phone = order.elements.phone.value.replace(/[\s\-()]/g, '');
      var date = dateInput.value;
      var pickup = order.elements.way.value === 'Самовивіз';
      var addr = order.elements.address.value.trim();
      var slotInput = $('[data-form-slots] input:checked');
      var bad = [];
      function mark(id, ok) {
        var node = id === 'slot' ? $('[data-form-slots]').closest('.field') : $('#' + id).closest('.field');
        node.classList.toggle('is-invalid', !ok);
        if (!ok) bad.push(node);
      }
      mark('f-name', name.length >= 2);
      mark('f-phone', /^\+?(38)?0\d{9}$/.test(phone));
      mark('f-date', !!date && date >= now.date);
      if (!pickup) mark('f-addr', addr.length >= 5); else $('#f-addr').closest('.field').classList.remove('is-invalid');
      mark('slot', !!slotInput);
      if (bad.length) {
        var first = bad[0].querySelector('input, textarea');
        if (first) first.focus();
        return;
      }
      var lines = [
        'Замовлення букета з сайту',
        'Ім\'я: ' + name,
        'Телефон: ' + phone,
        'Спосіб: ' + order.elements.way.value,
        'Дата: ' + date.split('-').reverse().join('.'),
        'Час: ' + slotInput.value
      ];
      if (!pickup) lines.push('Адреса: ' + addr);
      if (order.elements.wish.value.trim()) lines.push('Букет: ' + order.elements.wish.value.trim());
      if (order.elements.card.value.trim()) lines.push('Листівка: ' + order.elements.card.value.trim());
      var text = lines.join('\n');
      var enc = encodeURIComponent(text);
      var channel = order.elements.channel.value;
      var url, newTab = false, copy = false;
      if (channel === 'viber') url = CONFIG.viber + '&draft=' + enc;
      else if (channel === 'email') url = CONFIG.email + '?subject=' + encodeURIComponent('Замовлення букета — ' + name) + '&body=' + enc;
      else if (channel === 'sms') url = CONFIG.sms + '?&body=' + enc;
      else if (channel === 'instagram') { url = CONFIG.instagramDm; newTab = true; copy = true; }
      else if (channel === 'none') url = '';
      else { url = CONFIG.telegram + '?text=' + enc; newTab = true; }

      var ok = $('#formSuccess');
      var note = $('[data-copy-note]');
      if (copy) {
        try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (err) { /* без буфера */ }
      }
      if (note) note.hidden = !copy;
      ok.hidden = false;
      ok.focus({ preventScroll: true });
      ok.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
      if (!url) return;
      if (newTab) window.open(url, '_blank', 'noopener');
      else window.location.href = url;
    });
  }

  /* ===== Старт ===== */
  var y = $('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
  updateStatus();
  setInterval(updateStatus, 60000);
})();
