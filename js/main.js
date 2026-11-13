/* Стоматологія — шаблон. Без бібліотек. */
(function () {
  'use strict';

  /* Канали, куди форма надсилає заявку. Порожній рядок / false = канал вимкнено.
     phone — номер у форматі 380XXXXXXXXX (без +). */
  var CONTACT = {
    phone: "380956043835",
    sms: true,
    viber: false,
    whatsapp: false,
    telegram: '',
    instagram: "stomatologist_if",
    email: ''
  };

  var doc = document;
  doc.documentElement.classList.remove('no-js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }

  /* ---------- рік у футері ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- header + меню ---------- */
  var header = $('[data-header]');
  var burger = $('[data-burger]');
  var bar = $('[data-actionbar]');
  function setMenu(open) {
    doc.body.classList.toggle('menu-open', open);
    if (burger) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
      var use = burger.querySelector('use');
      if (use) use.setAttribute('href', open ? '#i-x' : '#i-menu');
    }
  }
  if (burger) burger.addEventListener('click', function () { setMenu(!doc.body.classList.contains('menu-open')); });
  $$('[data-nav] a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  var book = $('#zapys');
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (bar && book) {
      var r = book.getBoundingClientRect();
      bar.classList.toggle('hide', r.top < window.innerHeight * 0.6 && r.bottom > 0);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- графік і статус «відчинено/зачинено» (час Києва) ---------- */
  function kyivNow() {
    var d = new Date(), parts;
    try {
      parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
    } catch (e) {
      try { parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kiev', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d); }
      catch (e2) { return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() }; }
    }
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: days[o.weekday], min: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
  }
  function toMin(t) { var p = t.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
  var DAY_ACC = ['у неділю', 'у понеділок', 'у вівторок', 'у середу', 'у четвер', 'у п’ятницю', 'у суботу'];
  var list = $('[data-hours-list]');
  if (list) {
    var sched = {};
    $$('li[data-day]', list).forEach(function (li) {
      var h = li.getAttribute('data-hours');
      sched[li.getAttribute('data-day')] = h ? h.split('-') : null;
    });
    var now = kyivNow();
    var todayLi = $('li[data-day="' + now.day + '"]', list);
    if (todayLi) todayLi.classList.add('today');
    var t = sched[String(now.day)], text, open = false;
    if (t && now.min >= toMin(t[0]) && now.min < toMin(t[1])) {
      open = true;
      text = 'Зараз відчинено · до ' + t[1];
    } else {
      var nxt = null;
      if (t && now.min < toMin(t[0])) nxt = 'сьогодні о ' + t[0];
      for (var k = 1; k <= 7 && !nxt; k++) {
        var dd = (now.day + k) % 7, s = sched[String(dd)];
        if (s) nxt = (k === 1 ? 'завтра' : DAY_ACC[dd]) + ' о ' + s[0];
      }
      text = 'Зараз зачинено' + (nxt ? ' · відкриємось ' + nxt : '');
    }
    $$('[data-status]').forEach(function (el) {
      el.textContent = text;
      el.classList.toggle('is-open', open);
      el.hidden = false;
    });
  }

  /* ---------- таймлайн посмішки ---------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var arc = $('[data-arc]');
  var tabs = $$('[data-tabs] [role="tab"]');
  var current = null;

  function drawArc(panel, animate) {
    if (!arc || !panel) return;
    var items = $$('.visits li', panel);
    var n = items.length;
    var W = Math.max(arc.clientWidth || arc.getBoundingClientRect().width, 280);
    var H = arc.clientHeight || 100;
    var wide = window.innerWidth >= 960;
    var r = wide ? 18 : 15, y0 = r + 3, yb = H - r - 3;
    arc.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    while (arc.firstChild) arc.removeChild(arc.firstChild);
    var cy = 2 * yb - y0; // control point so that the bottom of the curve is yb
    var d = 'M0,' + y0 + ' Q' + (W / 2) + ',' + cy + ' ' + W + ',' + y0;
    var base = doc.createElementNS(SVGNS, 'path');
    base.setAttribute('d', d); base.setAttribute('class', 'arc-base');
    arc.appendChild(base);
    var line = doc.createElementNS(SVGNS, 'path');
    line.setAttribute('d', d); line.setAttribute('class', 'arc-line');
    arc.appendChild(line);
    var len = line.getTotalLength ? line.getTotalLength() : W;
    // x on this curve is linear in t, so a column centre maps straight to t
    var pad = wide ? 0 : r + 6;
    var nodes = [];
    for (var i = 0; i < n; i++) {
      var tt = wide ? (i + 0.5) / n : (n === 1 ? 0.5 : (pad + (W - 2 * pad) * i / (n - 1)) / W);
      var x = W * tt;
      var y = (1 - tt) * (1 - tt) * y0 + 2 * (1 - tt) * tt * cy + tt * tt * y0;
      var g = doc.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'node');
      var c = doc.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', r);
      var tx = doc.createElementNS(SVGNS, 'text');
      tx.setAttribute('x', x.toFixed(1)); tx.setAttribute('y', (y + 0.5).toFixed(1));
      tx.textContent = String(i + 1);
      g.appendChild(c); g.appendChild(tx);
      arc.appendChild(g);
      nodes.push(g);
    }
    panel.querySelector('.visits').style.setProperty('--n', String(n));
    if (!animate || reduce) {
      nodes.forEach(function (g) { g.classList.add('on'); });
      items.forEach(function (li) { li.classList.add('on'); });
      return;
    }
    line.style.strokeDasharray = len + ' ' + len;
    line.style.strokeDashoffset = String(len);
    line.getBoundingClientRect();
    line.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.6,.1,.2,1)';
    line.style.strokeDashoffset = '0';
    items.forEach(function (li) { li.classList.remove('on'); });
    nodes.forEach(function (g, j) {
      setTimeout(function () {
        g.classList.add('on');
        if (items[j]) items[j].classList.add('on');
      }, 180 + j * (900 / Math.max(n, 1)));
    });
  }

  function selectTab(tab, focus, animate) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var p = doc.getElementById(t.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
    });
    current = doc.getElementById(tab.getAttribute('aria-controls'));
    if (focus) tab.focus();
    drawArc(current, animate);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t, false, true); });
    t.addEventListener('keydown', function (e) {
      var j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j], true, true); }
    });
  });
  if (tabs.length) {
    current = doc.getElementById(tabs[0].getAttribute('aria-controls'));
    var planSec = $('#plan');
    var started = false;
    drawArc(current, false);
    if (!reduce && 'IntersectionObserver' in window && planSec) {
      $$('.visits li', current).forEach(function (li) { li.classList.remove('on'); });
      $$('.arc .node').forEach(function (g) { g.classList.remove('on'); });
      var io0 = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (e.isIntersecting && !started) { started = true; drawArc(current, true); io0.disconnect(); }
        });
      }, { threshold: 0.25 });
      io0.observe(planSec);
    }
    var rw = null, lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(rw);
      rw = setTimeout(function () { drawArc(current, false); }, 120);
    });
  }

  /* кнопки «Записатися» з таймлайну підставляють послугу у форму */
  var svc = $('#f-service');
  $$('[data-book]').forEach(function (a) {
    a.addEventListener('click', function () {
      var v = a.getAttribute('data-book');
      if (!svc) return;
      for (var i = 0; i < svc.options.length; i++) {
        if (svc.options[i].text === v) { svc.selectedIndex = i; break; }
      }
    });
  });

  /* ---------- поява при скролі ---------- */
  var rev = $$('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rev.forEach(function (el) { io.observe(el); });
  } else {
    rev.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- форма запису ---------- */
  var form = $('[data-form]');
  var done = $('[data-done]');
  function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text); return true; }
    } catch (e) { /* ignore */ }
    try {
      var ta = doc.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      doc.body.appendChild(ta); ta.select();
      var ok = doc.execCommand('copy');
      doc.body.removeChild(ta);
      return ok;
    } catch (e2) { return false; }
  }
  function go(url) {
    if (/^https?:/.test(url)) {
      var w = window.open(url, '_blank', 'noopener');
      if (!w) window.location.href = url;
    } else {
      window.location.href = url;
    }
  }
  if (form) {
    var fields = {
      name: function (v) { return v.trim().length >= 2; },
      phone: function (v) { return v.replace(/\D/g, '').length >= 9; },
      service: function (v) { return !!v; }
    };
    function check(name) {
      var el = form.elements[name];
      var ok = fields[name](el.value);
      el.closest('.field').classList.toggle('bad', !ok);
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    }
    Object.keys(fields).forEach(function (n) {
      var el = form.elements[n];
      el.addEventListener('blur', function () { if (el.value) check(n); });
      el.addEventListener('input', function () { if (el.closest('.field').classList.contains('bad')) check(n); });
      el.addEventListener('change', function () { if (el.closest('.field').classList.contains('bad')) check(n); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, first = null;
      Object.keys(fields).forEach(function (n) { if (!check(n)) { ok = false; first = first || form.elements[n]; } });
      var consent = form.elements.ok;
      var cErr = $('[data-err="ok"]', form);
      if (consent && !consent.checked) { ok = false; if (cErr) cErr.classList.add('show'); first = first || consent; }
      else if (cErr) cErr.classList.remove('show');
      if (!ok) { if (first) first.focus(); return; }

      var v = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ''; };
      var lines = [
        'Заявка на прийом з сайту',
        'Ім’я: ' + v('name'),
        'Телефон: ' + v('phone'),
        'Послуга: ' + v('service'),
        'Зручний час: ' + v('time')
      ];
      if (v('msg')) lines.push('Коментар: ' + v('msg'));
      var text = lines.join('\n');
      var enc = encodeURIComponent(text);
      var viaEl = form.querySelector('input[name="via"]:checked');
      var via = viaEl ? viaEl.value : '';
      var p = CONTACT.phone, msg = 'Надішліть повідомлення, що відкрилося, — адміністратор зв’яжеться з вами й підтвердить час прийому.';
      var copied = false, url = '';
      if (via === 'whatsapp' && p) url = 'https://wa.me/' + p + '?text=' + enc;
      else if (via === 'sms' && p) url = 'sms:+' + p + '?&body=' + enc;
      else if (via === 'email' && CONTACT.email) url = 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent('Запис на прийом') + '&body=' + enc;
      else if (via === 'viber' && p) { copied = copy(text); url = 'viber://chat?number=%2B' + p; }
      else if (via === 'telegram' && CONTACT.telegram) { copied = copy(text); url = 'https://t.me/' + CONTACT.telegram; }
      else if (via === 'instagram' && CONTACT.instagram) { copied = copy(text); url = 'https://ig.me/m/' + CONTACT.instagram; }
      else { copied = copy(text); }
      if (copied && url) msg = 'Текст заявки скопійовано. Вставте його в чат, що відкрився, і надішліть — адміністратор підтвердить час прийому.';
      else if (copied) msg = 'Текст заявки скопійовано в буфер обміну — надішліть його нам зручним способом, і адміністратор підтвердить час прийому.';
      var dt = $('[data-done-text]');
      if (dt) dt.textContent = msg;
      form.hidden = true;
      var sub = $('[data-form-sub]'); if (sub) sub.hidden = true;
      if (done) { done.hidden = false; done.focus(); }
      if (url) go(url);
    });
    var again = $('[data-again]');
    if (again) again.addEventListener('click', function () {
      form.reset();
      form.hidden = false;
      var sub = $('[data-form-sub]'); if (sub) sub.hidden = false;
      if (done) done.hidden = true;
      form.elements.name.focus();
    });
  }
})();
