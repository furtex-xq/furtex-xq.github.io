/* Ательє — main.js (no dependencies) */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Measuring tape: unrolls with scroll progress ---------- */
  var TOTAL_CM = 150;
  var tape = document.getElementById('tape');
  var strip = document.getElementById('tapeStrip');
  var read = document.getElementById('tapeRead');
  var track = tape ? tape.querySelector('.tape__track') : null;
  var caseSvg = tape ? tape.querySelector('.tape__case svg') : null;
  var vertical = false, L = 0, ticking = false;

  function buildTape() {
    if (!track) return;
    vertical = window.innerWidth >= 1100;
    L = vertical ? track.clientHeight : track.clientWidth;
    var pxcm = L / TOTAL_CM;
    var step = pxcm >= 4 ? 1 : (pxcm * 5 >= 6 ? 5 : 10);
    var numEvery = pxcm * 10 >= 24 ? 10 : (pxcm * 20 >= 24 ? 20 : 50);
    var html = '';
    for (var cm = step; cm < TOTAL_CM; cm += step) {
      var pos = (cm * pxcm).toFixed(1) + 'px';
      var cls = cm % 10 === 0 ? 'tk tk--10' : (cm % 5 === 0 ? 'tk tk--5' : 'tk');
      html += '<i class="' + cls + '" style="' + (vertical ? 'top:' : 'left:') + pos + '"></i>';
      if (cm % numEvery === 0) {
        html += '<span class="nm" style="' + (vertical ? 'top:' : 'left:') + pos + (vertical ? '' : ';margin-left:-1px') + '">' + cm + '</span>';
      }
    }
    strip.innerHTML = html;
    update();
  }

  function update() {
    ticking = false;
    if (!track) return;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    var p = Math.min(1, Math.max(0, window.scrollY / max));
    var len = Math.round(p * L);
    if (vertical) { strip.style.height = len + 'px'; strip.style.width = ''; }
    else { strip.style.width = len + 'px'; strip.style.height = ''; }
    tape.style.setProperty('--len', len + 'px');
    if (caseSvg) caseSvg.style.setProperty('--spin', (len / 94 * 360).toFixed(1) + 'deg');
    read.textContent = Math.round(p * TOTAL_CM);
  }
  function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  var rT;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(buildTape, 120); });
  buildTape();

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger && nav) {
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1000) setMenu(false); });
  }

  /* ---------- Price tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  function selectTab(name, focus) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) t.focus();
      if (on && !focus && t.scrollIntoView && window.innerWidth < 760) {
        t.parentNode.scrollLeft = t.offsetLeft - 20;
      }
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t.getAttribute('data-tab'), false); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      selectTab(tabs[(i + d + tabs.length) % tabs.length].getAttribute('data-tab'), true);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('a[data-tab]'), function (a) {
    a.addEventListener('click', function () { selectTab(a.getAttribute('data-tab'), false); });
  });

  /* ---------- Opening hours, Kyiv time ---------- */
  var hoursEl = document.getElementById('hours');
  if (hoursEl) {
    var H = null;
    try { H = JSON.parse(hoursEl.getAttribute('data-hours')); } catch (e) {}
    if (!H) {
      /* schedule unknown: show only the text summary, no live status */
      Array.prototype.forEach.call(hoursEl.querySelectorAll('.hours__status, .hours__t'), function (el) { el.hidden = true; });
    } else {
    var names = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота'];
    var order = [1, 2, 3, 4, 5, 6, 0];
    var now = null;
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      var o = {}; parts.forEach(function (x) { o[x.type] = x.value; });
      var wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday];
      now = { d: wd, m: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
    } catch (e) {}
    var body = document.getElementById('hoursBody');
    var rows = '';
    order.forEach(function (d) {
      var h = H[String(d)];
      rows += '<tr' + (now && now.d === d ? ' class="is-today"' : '') + '><td>' + names[d] + '</td><td>' + (h ? h[0] + '–' + h[1] : 'вихідний') + '</td></tr>';
    });
    body.innerHTML = rows;
    var st = document.getElementById('hoursStatus');
    if (now && st) {
      var toM = function (s) { var a = s.split(':'); return +a[0] * 60 + +a[1]; };
      var today = H[String(now.d)];
      var open = today && now.m >= toM(today[0]) && now.m < toM(today[1]);
      var txt;
      if (open) txt = 'Зараз відчинено · до ' + today[1];
      else {
        var nxt = null;
        if (today && now.m < toM(today[0])) nxt = 'сьогодні о ' + today[0];
        else for (var k = 1; k <= 7; k++) { var dd = (now.d + k) % 7, hh = H[String(dd)]; if (hh) { nxt = (k === 1 ? 'завтра' : names[dd].toLowerCase()) + ' о ' + hh[0]; break; } }
        txt = 'Зараз зачинено' + (nxt ? ' · відчинимо ' + nxt : '');
      }
      st.classList.add(open ? 'is-open' : 'is-closed');
      st.querySelector('span').textContent = txt;
    }
    }
  }

  /* ---------- Booking form → Telegram / Viber / email ---------- */
  var form = document.getElementById('form');
  var ok = document.getElementById('formOk');
  var LINKS = {
    telegram: "",
    viber: "",
    email: "",
    sms: "sms:+380993237606",
    instagram: "https://ig.me/m/buton_school"
  };
  var OK_TEXT = {
    telegram: 'Ми відкрили Telegram із готовим текстом — натисніть «Надіслати».',
    viber: 'Ми відкрили Viber із готовим текстом — натисніть «Надіслати».',
    email: 'Ми відкрили лист із готовим текстом — натисніть «Надіслати».',
    sms: 'Ми відкрили SMS із готовим текстом — натисніть «Надіслати».',
    instagram: 'Текст заявки скопійовано. Вставте його в повідомлення в Instagram і надішліть.'
  };
  function setErr(input, msg) {
    var f = input.closest('.field');
    f.classList.toggle('is-bad', !!msg);
    f.querySelector('.field__err').textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function check(input) {
    var v = input.value.trim(), msg = '';
    if (input.name === 'name' && v.length < 2) msg = 'Вкажіть ім’я — хоча б дві літери.';
    if (input.name === 'phone' && v.replace(/\D/g, '').length < 10) msg = 'Вкажіть номер телефону повністю, наприклад +380 67 123 45 67.';
    if (input.name === 'service' && !v) msg = 'Оберіть послугу зі списку.';
    if (input.name === 'date' && v) {
      var t = new Date(); t.setHours(0, 0, 0, 0);
      if (new Date(v + 'T00:00:00') < t) msg = 'Оберіть сьогоднішню або майбутню дату.';
    }
    setErr(input, msg);
    return !msg;
  }
  if (form) {
    var dateIn = form.querySelector('#f-date');
    if (dateIn) { var td = new Date(); dateIn.min = new Date(td.getTime() - td.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
    ['name', 'phone', 'service', 'date'].forEach(function (n) {
      var el = form.elements[n];
      el.addEventListener('blur', function () { if (el.value) check(el); });
      el.addEventListener('input', function () { if (el.closest('.field').classList.contains('is-bad')) check(el); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var good = true, first = null;
      ['name', 'phone', 'service', 'date'].forEach(function (n) {
        var el = form.elements[n];
        if (!check(el)) { good = false; first = first || el; }
      });
      if (!good) { first.focus(); return; }
      var f = form.elements;
      var dateTxt = f.date.value ? f.date.value.split('-').reverse().join('.') : 'будь-який';
      var msg = 'Заявка з сайту ательє\n' +
        'Ім’я: ' + f.name.value.trim() + '\n' +
        'Телефон: ' + f.phone.value.trim() + '\n' +
        'Послуга: ' + f.service.value + '\n' +
        'Зручний день: ' + dateTxt +
        (f.msg.value.trim() ? '\nПро річ: ' + f.msg.value.trim() : '');
      var ch = form.querySelector('input[name="channel"]:checked').value;
      var url;
      if (ch === 'telegram') url = LINKS.telegram + '?text=' + encodeURIComponent(msg);
      else if (ch === 'viber') url = LINKS.viber + '&draft=' + encodeURIComponent(msg);
      else if (ch === 'sms') url = LINKS.sms + '?&body=' + encodeURIComponent(msg);
      else if (ch === 'instagram') url = LINKS.instagram;
      else url = LINKS.email + '?subject=' + encodeURIComponent('Запис в ательє') + '&body=' + encodeURIComponent(msg);
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(msg).catch(function () {}); }
      var okMsg = document.getElementById('formOkMsg');
      if (okMsg && OK_TEXT[ch]) okMsg.textContent = OK_TEXT[ch];
      if (ch === 'telegram' || ch === 'instagram') { var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }
      else window.location.href = url;
      form.hidden = true; ok.hidden = false; ok.focus();
    });
    document.getElementById('formAgain').addEventListener('click', function () {
      form.reset(); ok.hidden = true; form.hidden = false; form.elements.name.focus();
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var rev = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(rev, function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(rev, function (el) { io.observe(el); });
  }

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
