(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  /* ---------- Kyiv time ---------- */
  function kyivNow() {
    var parts;
    try {
      parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    } catch (e) {
      try {
        parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kiev', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      } catch (e2) { parts = null; }
    }
    var n = new Date();
    if (!parts) return { dow: n.getDay(), min: n.getHours() * 60 + n.getMinutes(), y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
    var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
    var dows = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { dow: dows[o.weekday], min: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10), y: +o.year, m: +o.month, d: +o.day };
  }
  var now = kyivNow();
  var toMin = function (s) { var p = (s || '0:0').split(':'); return (+p[0]) * 60 + (+p[1]); };

  /* ---------- Open / closed status ---------- */
  (function status() {
    var rows = $$('[data-hours] li');
    if (!rows.length) return;
    var byDow = {};
    rows.forEach(function (li) { byDow[li.getAttribute('data-dow')] = li; });
    function span(dow) {
      var li = byDow[dow]; if (!li || !li.getAttribute('data-open')) return null;
      var o = toMin(li.getAttribute('data-open')), c = toMin(li.getAttribute('data-close'));
      if (c <= o) c += 1440;
      return { o: o, c: c, close: li.getAttribute('data-close'), open: li.getAttribute('data-open') };
    }
    var t = now.min, today = span(now.dow), yest = span((now.dow + 6) % 7);
    var open = false, until = '', next = '';
    if (today && t >= today.o && t < today.c) { open = true; until = today.close; }
    else if (yest && t + 1440 < yest.c) { open = true; until = yest.close; }
    if (!open) {
      if (today && t < today.o) next = 'сьогодні о ' + today.open;
      else {
        var acc = ['у неділю', 'у понеділок', 'у вівторок', 'у середу', 'у четвер', 'у п’ятницю', 'у суботу'];
        for (var k = 1; k <= 7; k++) { var sp = span((now.dow + k) % 7); if (sp) { next = (k === 1 ? 'завтра' : acc[(now.dow + k) % 7]) + ' о ' + sp.open; break; } }
      }
    }
    if (byDow[now.dow]) byDow[now.dow].classList.add('is-today');
    $$('[data-status]').forEach(function (el) {
      el.classList.add(open ? 'is-open' : 'is-closed');
      var txt = $('[data-status-text]', el);
      if (txt) txt.textContent = open ? 'Зараз відчинено · до ' + until : 'Зараз зачинено' + (next ? ' · відкриємось ' + next : '');
    });
  })();

  /* ---------- Header + menu ---------- */
  var top = $('.top'), burger = $('.burger'), nav = $('#nav');
  function onScroll() { top.classList.toggle('is-solid', window.scrollY > 30); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    $('use', burger).setAttribute('href', open ? '#i-x' : '#i-menu');
    top.classList.toggle('is-solid', open || window.scrollY > 30);
  }
  burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); } });

  /* ---------- Tabs ---------- */
  var tabs = $$('[role="tab"]');
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      d.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, j = k === 'ArrowRight' ? i + 1 : k === 'ArrowLeft' ? i - 1 : null;
      if (j === null) return;
      e.preventDefault(); j = (j + tabs.length) % tabs.length; tabs[j].focus(); selectTab(tabs[j]);
    });
  });

  /* ---------- Tap list pour (signature) ---------- */
  var pint = $('.pint'), glass = $('[data-big-glass]'), taps = $$('.tap');
  function pourBig(btn) {
    var s = btn.style;
    glass.style.setProperty('--beer', s.getPropertyValue('--beer'));
    glass.style.setProperty('--head', s.getPropertyValue('--head'));
    $('[data-pint-style]').textContent = $('.tap__name', btn).textContent;
    $('[data-pint-note]').textContent = btn.getAttribute('data-note');
    $('[data-pint-meta]').textContent = btn.getAttribute('data-meta');
    taps.forEach(function (t) { t.classList.toggle('is-current', t === btn); t.setAttribute('aria-pressed', t === btn ? 'true' : 'false'); });
    pint.classList.remove('is-poured');
    void pint.offsetWidth;
    pint.classList.add('is-poured');
  }
  taps.forEach(function (t, i) {
    t.style.setProperty('--d', (i * 0.12) + 's');
    t.setAttribute('aria-pressed', 'false');
    t.addEventListener('click', function () {
      pourBig(t);
      if (window.innerWidth < 1000) {
        var r = pint.getBoundingClientRect();
        if (r.bottom < 70 || r.top > window.innerHeight * .6) window.scrollTo({ top: window.scrollY + r.top - 90, behavior: reduce ? 'auto' : 'smooth' });
      }
    });
  });
  function startPour() {
    taps.forEach(function (t) { t.classList.add('is-poured'); });
    if (taps[0]) pourBig(taps[0]);
  }
  var board = $('[data-board]');
  if ('IntersectionObserver' in window && board) {
    var bo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { startPour(); bo.disconnect(); } });
    }, { threshold: 0.25 });
    bo.observe(board);
  } else startPour();

  /* ---------- Afisha: today + filter ---------- */
  var days = $$('.day');
  days.forEach(function (day) { if (+day.getAttribute('data-dow') === now.dow) day.classList.add('is-today'); });
  var todayDay = days.filter(function (x) { return x.classList.contains('is-today'); })[0];
  var todayWhat = $('[data-today-what]');
  if (todayDay && todayWhat) {
    var evs = $$('.ev', todayDay);
    if (evs.length) todayWhat.textContent = evs.map(function (e) { return $('h4', e).textContent; }).join(' + ') + ' · ' + $('time', evs[0]).textContent;
  }
  var chips = $$('.chip'), empty = $('[data-empty]');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var f = c.getAttribute('data-filter'), any = false;
      chips.forEach(function (x) { var on = x === c; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      days.forEach(function (day) {
        var vis = 0;
        $$('.ev', day).forEach(function (ev) { var ok = f === 'all' || ev.getAttribute('data-type') === f; ev.hidden = !ok; if (ok) vis++; });
        day.classList.toggle('is-empty', !vis);
        if (vis) any = true;
      });
      empty.hidden = any;
    });
  });

  /* ---------- Booking form ---------- */
  var form = $('#book-form'), done = $('[data-done]');
  var dateIn = $('#f-date'), occ = $('#f-occasion'), note = $('#f-note');
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var todayIso = now.y + '-' + pad(now.m) + '-' + pad(now.d);
  dateIn.min = todayIso; dateIn.value = todayIso;
  function nextDateFor(dow) {
    var dt = new Date(now.y, now.m - 1, now.d);
    dt.setDate(dt.getDate() + ((dow - now.dow + 7) % 7));
    return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
  }
  $$('.ev__book').forEach(function (b) {
    b.addEventListener('click', function () {
      var day = b.closest('.day'), ev = b.closest('.ev');
      dateIn.value = nextDateFor(+day.getAttribute('data-dow'));
      var t = $('time', ev).textContent; $('#f-time').value = t;
      occ.value = ev.getAttribute('data-type') === 'quiz' ? 'Квіз (реєстрація команди)' : 'Подія з афіші';
      note.value = 'Подія: ' + b.getAttribute('data-ev') + (note.value && note.value.indexOf('Подія:') !== 0 ? '. ' + note.value : '');
      d.getElementById('book').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      setTimeout(function () { $('#f-name').focus({ preventScroll: true }); }, reduce ? 0 : 600);
    });
  });
  $$('[data-occasion]').forEach(function (a) { a.addEventListener('click', function () { occ.value = a.getAttribute('data-occasion'); }); });

  function check(input) {
    var f = input.closest('.f'), ok = true, v = input.value.trim();
    if (input.id === 'f-name') ok = v.length >= 2;
    if (input.id === 'f-phone') ok = v.replace(/\D/g, '').length >= 10 && /^[+\d\s()\-]+$/.test(v);
    if (input.id === 'f-date') ok = !!v && v >= todayIso;
    if (input.id === 'f-time') ok = !!v;
    f.classList.toggle('is-bad', !ok);
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }
  var req = ['#f-name', '#f-phone', '#f-date', '#f-time'].map(function (s) { return $(s); });
  req.forEach(function (i) {
    i.addEventListener('blur', function () { if (i.value) check(i); });
    i.addEventListener('input', function () { if (i.closest('.f').classList.contains('is-bad')) check(i); });
  });
  function fmtDate(iso) { var p = iso.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = req.filter(function (i) { return !check(i); });
    if (bad.length) { bad[0].focus(); return; }
    var fd = new FormData(form);
    var msg = [
      'Бронювання столу',
      'Ім’я: ' + fd.get('name').trim(),
      'Телефон: ' + fd.get('phone').trim(),
      'Дата: ' + fmtDate(fd.get('date')) + ', ' + fd.get('time'),
      'Гостей: ' + fd.get('guests'),
      'Привід: ' + fd.get('occasion')
    ];
    if (fd.get('note').trim()) msg.push('Коментар: ' + fd.get('note').trim());
    var text = msg.join('\n'), via = fd.get('via'), url, info;
    if (via === 'sms') {
      url = form.getAttribute('data-sms') + '?&body=' + encodeURIComponent(text);
      info = 'Відкрили SMS з готовим текстом — залишилось натиснути «Надіслати».';
    } else if (via === 'ig') {
      url = form.getAttribute('data-ig');
      info = 'Текст заявки скопійовано. Відкрили Instagram — вставте текст у Direct і надішліть.';
    } else if (via === 'viber') {
      url = form.getAttribute('data-viber') + '&draft=' + encodeURIComponent(text);
      info = 'Відкрили Viber з готовим текстом — залишилось натиснути «Надіслати».';
    } else if (via === 'mail') {
      url = form.getAttribute('data-mail') + '?subject=' + encodeURIComponent('Бронювання столу — ' + fmtDate(fd.get('date'))) + '&body=' + encodeURIComponent(text);
      info = 'Відкрили поштову програму з готовим листом — залишилось його надіслати.';
    } else {
      url = form.getAttribute('data-tg') + '?text=' + encodeURIComponent(text);
      info = 'Відкрили Telegram. Текст заявки скопійовано — вставте його в чат, якщо поле порожнє, і надішліть.';
    }
    try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (err) {}
    if (via === 'mail' || via === 'viber' || via === 'sms') window.location.href = url;
    else window.open(url, '_blank', 'noopener');
    $('[data-done-text]').textContent = info;
    form.hidden = true; done.hidden = false; done.focus();
  });
  $('[data-reset]').addEventListener('click', function () {
    form.reset(); dateIn.value = todayIso; done.hidden = true; form.hidden = false; $('#f-name').focus();
  });

  /* ---------- Reveal on scroll ---------- */
  var rv = $$('.sec-head, .hero__copy, .hero__arch, .board, .day, .about__pics, .about__text, .tile, .packs, .coasters, .faq__list, .book__card, .book__intro, .contacts__info, .map');
  if (!reduce && 'IntersectionObserver' in window) {
    rv.forEach(function (el) { el.classList.add('rv'); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    rv.forEach(function (el) { io.observe(el); });
  }

  var y = $('[data-year]'); if (y) y.textContent = String(now.y);
})();
