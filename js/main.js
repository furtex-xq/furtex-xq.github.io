(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- mobile menu ---- */
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  function closeMenu() {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Відкрити меню');
  }
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---- reveal on scroll ---- */
  var reveals = document.querySelectorAll('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---- signature: learner car drives down the road ---- */
  var road = document.getElementById('road');
  var car = document.getElementById('car');
  var stops = road ? road.querySelectorAll('.stop') : [];
  var ticking = false;
  function drive() {
    ticking = false;
    if (!road || !car) return;
    var r = road.getBoundingClientRect();
    var vh = window.innerHeight;
    var carH = car.getBoundingClientRect().height;
    var travel = Math.max(0, r.height - carH);
    // the car sits at ~55% of the viewport while the road scrolls under it
    var y = vh * 0.55 - r.top - carH / 2;
    y = Math.min(travel, Math.max(0, y));
    road.style.setProperty('--car', y + 'px');
    road.style.setProperty('--done', (y + carH / 2) + 'px');
    var front = r.top + y + carH;
    for (var i = 0; i < stops.length; i++) {
      var s = stops[i].getBoundingClientRect();
      stops[i].classList.toggle('is-on', front >= s.top + Math.min(40, s.height / 2) || y >= travel - 1);
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(drive); } }
  if (road && car) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', drive);
    drive();
  }

  /* ---- opening hours, Kyiv time ---- */
  var hoursEl = document.getElementById('hours');
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: days[o.weekday], min: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function fmt(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
  if (hoursEl && hoursEl.hasAttribute('data-live') && document.getElementById('open-status')) {
    var cfg = {};
    try { cfg = JSON.parse(hoursEl.getAttribute('data-hours')) || {}; } catch (e) { cfg = {}; }
    var now = kyivNow();
    var today = cfg[now.day];
    var row = hoursEl.querySelector('tr[data-day="' + now.day + '"]');
    if (row) row.classList.add('is-today');
    var status = document.getElementById('open-status');
    var open = today && now.min >= today[0] * 60 && now.min < today[1] * 60;
    hoursEl.classList.add(open ? 'is-open' : 'is-closed');
    if (open) {
      status.textContent = 'Зараз відчинено · до ' + fmt(today[1]);
    } else {
      var next = '';
      for (var k = 0; k < 8; k++) {
        var d = (now.day + k) % 7, h = cfg[d];
        if (!h) continue;
        if (k === 0 && now.min >= h[0] * 60) continue;
        next = (k === 0 ? 'сьогодні' : k === 1 ? 'завтра' : ['у неділю', 'у понеділок', 'у вівторок', 'у середу', 'у четвер', 'у пʼятницю', 'у суботу'][d]) + ' о ' + fmt(h[0]);
        break;
      }
      status.textContent = 'Зараз зачинено' + (next ? ' · відкриємось ' + next : '');
    }
  }

  /* ---- booking form → Telegram / Viber / email ---- */
  var form = document.getElementById('book');
  var ds = form ? form.dataset : {};
  var PHONE = ds.phone || '';
  var TG = ds.tg || '';
  var MAIL = ds.mail || '';
  var IG = ds.ig || '';
  function setBad(input, bad) {
    var f = input.closest('.field');
    f.classList.toggle('is-bad', bad);
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    if (bad) input.setAttribute('aria-describedby', 'e-' + input.name); else input.removeAttribute('aria-describedby');
  }
  function val(name) { var el = form.querySelector('[name="' + name + '"]:checked') || form.elements[name]; return el ? String(el.value).trim() : ''; }
  if (form) {
    var nameI = form.elements.name, phoneI = form.elements.phone;
    [nameI, phoneI].forEach(function (i) { i.addEventListener('input', function () { if (i.closest('.field').classList.contains('is-bad')) validate(i); }); });
    function validate(i) {
      var ok;
      if (i === nameI) ok = i.value.trim().length >= 2;
      else { var digits = i.value.replace(/\D/g, ''); ok = /^(380\d{9}|0\d{9})$/.test(digits); }
      setBad(i, !ok);
      return ok;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var okN = validate(nameI), okP = validate(phoneI);
      if (!okN || !okP) { (okN ? phoneI : nameI).focus(); return; }
      var lines = [
        'Заявка на навчання в автошколі',
        "Ім'я: " + val('name'),
        'Телефон: ' + val('phone'),
        'Категорія: ' + val('cat'),
        'Коробка передач: ' + val('gear'),
        'Зручний час: ' + val('time')
      ];
      if (val('msg')) lines.push('Коментар: ' + val('msg'));
      var text = lines.join('\n');
      var via = val('via'), url = '', note;
      function copy() { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {}); }
      if (!via) {
        copy();
        note = PHONE ? 'Текст заявки скопійовано. Зателефонуйте нам за номером ' + (ds.phoneText || PHONE) + ' — запишемо вас на консультацію.' : 'Текст заявки скопійовано — надішліть його нам зручним способом.';
      } else if (via === 'instagram') {
        copy();
        url = 'https://ig.me/m/' + IG;
        note = 'Текст заявки скопійовано. Відкриваємо Instagram — вставте його в повідомлення й надішліть.';
      } else if (via === 'sms') {
        url = 'sms:' + PHONE + '?&body=' + encodeURIComponent(text);
        note = 'Відкриваємо SMS із готовим текстом — залишилось натиснути «Надіслати».';
      } else if (via === 'viber') {
        url = 'viber://chat?number=' + encodeURIComponent(PHONE) + '&draft=' + encodeURIComponent(text);
        note = 'Відкриваємо Viber із готовим текстом — залишилось натиснути «Надіслати».';
      } else if (via === 'email') {
        url = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Заявка на навчання') + '&body=' + encodeURIComponent(text);
        note = 'Відкриваємо пошту з готовим листом — залишилось натиснути «Надіслати».';
      } else {
        url = TG + '?text=' + encodeURIComponent(text);
        note = 'Текст заявки скопійовано. Відкриваємо Telegram — вставте його в чат і надішліть.';
        copy();
      }
      var ok = document.getElementById('book-ok');
      document.getElementById('ok-text').textContent = note;
      ok.hidden = false;
      ok.focus({ preventScroll: true });
      ok.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
      if (!url) return;
      if (via === 'telegram' || via === 'instagram') window.open(url, '_blank', 'noopener'); else window.location.href = url;
    });
  }

  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();
