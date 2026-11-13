(function () {
  'use strict';
  document.documentElement.classList.add('js');

  /* ------------------------------------------------------------------
     Канали для форми. Порожній рядок = каналу немає (кнопка прихована).
     sms: номер у міжнародному форматі; instagram: лише нікнейм;
     email: адреса; viber/whatsapp: номер; telegram: нікнейм.
  ------------------------------------------------------------------ */
  var CONTACT = {
    sms: '',
    viber: '',
    whatsapp: '',
    telegram: '',
    instagram: "silver_time_if",
    email: ''
  };
  var BIZ = "Срібний час";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- шапка й меню ---------- */
  var top = $('[data-top]');
  var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 30); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var burger = $('[data-burger]');
  var nav = $('#nav');
  var setMenu = function (open) {
    nav.classList.toggle('open', open);
    top.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
  };
  burger.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---------- вкладки прайсу ---------- */
  var tabs = $$('[role="tab"]');
  var selectTab = function (t, focus) {
    tabs.forEach(function (b) {
      var on = b === t;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
  };
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* ---------- розмірник каблучки ---------- */
  var fmt = function (n, dec) { return n.toFixed(dec).replace('.', ','); };
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* приватний режим */ } }
  };
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var ppm = parseFloat(store.get('yuv-ppm')) || (coarse ? 6.05 : 3.78); // CSS-пікселів на 1 мм
  var ring = $('[data-sz-ring]');
  var range = $('[data-sz-range]');
  var cal = $('[data-sz-cal]');
  var card = $('[data-sz-card]');
  var circIn = $('[data-sz-circ]');
  var tbody = $('[data-sz-tbody]');
  var sizeInput = $('[data-size-input]');
  var current = 17;

  var usOf = function (d) { var u = (d - 11.63) / 0.8128; return Math.max(0, Math.round(u * 4) / 4); };
  var usTxt = function (d) { return fmt(usOf(d), usOf(d) % 1 ? (usOf(d) * 4 % 2 ? 2 : 1) : 0); };

  if (tbody) {
    var rows = '';
    for (var d = 15; d <= 23.01; d += 0.5) {
      rows += '<tr data-d="' + d + '"><td>' + fmt(d, d % 1 ? 1 : 0) + '</td><td>' + fmt(d, 1) + '</td><td>' + fmt(Math.PI * d, 1) + '</td><td>' + Math.round(Math.PI * d) + '</td><td>' + usTxt(d) + '</td></tr>';
    }
    tbody.innerHTML = rows;
  }

  var show = function (d) {
    current = Math.round(d * 2) / 2;
    var c = Math.PI * d;
    $('[data-sz-ua]').textContent = fmt(current, current % 1 ? 1 : 0);
    $('[data-sz-d]').textContent = fmt(d, 1);
    $('[data-sz-c]').textContent = fmt(c, 1);
    $('[data-sz-eu]').textContent = Math.round(c);
    $('[data-sz-us]').textContent = usTxt(d);
    $$('tr', tbody).forEach(function (tr) { tr.classList.toggle('on', parseFloat(tr.getAttribute('data-d')) === current); });
  };
  var drawRing = function () {
    if (ring) ring.style.setProperty('--d', (parseFloat(range.value) * ppm).toFixed(1) + 'px');
    if (card) card.style.setProperty('--w', (53.98 * ppm).toFixed(1) + 'px');
  };
  if (range) {
    range.addEventListener('input', function () { show(parseFloat(range.value)); drawRing(); });
    cal.value = Math.round(ppm * 100);
    cal.addEventListener('input', function () { ppm = cal.value / 100; store.set('yuv-ppm', String(ppm)); drawRing(); });
    circIn.addEventListener('input', function () {
      var c = parseFloat(String(circIn.value).replace(',', '.'));
      if (c >= 40 && c <= 80) show(c / Math.PI);
    });
    $$('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        var mode = b.getAttribute('data-mode');
        $$('[data-mode]').forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
        $$('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== mode; });
        if (mode === 'ring') show(parseFloat(range.value)); else circIn.dispatchEvent(new Event('input'));
      });
    });
    $('[data-sz-apply]').addEventListener('click', function () {
      if (sizeInput) sizeInput.value = fmt(current, current % 1 ? 1 : 0);
      var topic = $('select[name="topic"]');
      if (topic && topic.selectedIndex === 0) topic.value = 'Зміна розміру каблучки';
    });
    show(parseFloat(range.value));
    drawRing();
  }

  /* ---------- графік і статус «відчинено» за київським часом ---------- */
  var list = $('[data-hours-list]');
  var status = $('[data-status]');
  if (list && status) {
    var kyivNow = function () {
      try {
        var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
        var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
        var wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday];
        return { day: wd, min: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
      } catch (e) { var n = new Date(); return { day: n.getDay(), min: n.getHours() * 60 + n.getMinutes() }; }
    };
    var toMin = function (t) { var p = t.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); };
    var hoursOf = function (day) {
      var li = $('li[data-day="' + day + '"]', list);
      var v = li ? li.getAttribute('data-hours') : '';
      if (!v) return null;
      var p = v.split('-'); return [toMin(p[0]), toMin(p[1]), p[0], p[1]];
    };
    var dayNames = ['неділю', 'понеділок', 'вівторок', 'середу', 'четвер', 'пʼятницю', 'суботу'];
    var upd = function () {
      var now = kyivNow();
      $$('li', list).forEach(function (li) { li.classList.toggle('today', li.getAttribute('data-day') === String(now.day)); });
      var h = hoursOf(now.day), txt, open = false;
      if (h && now.min >= h[0] && now.min < h[1]) { open = true; txt = 'Зараз відчинено до ' + h[3]; }
      else if (h && now.min < h[0]) { txt = 'Зачинено · відкриємося о ' + h[2]; }
      else {
        txt = 'Зараз зачинено';
        for (var i = 1; i <= 7; i++) {
          var dd = (now.day + i) % 7, hh = hoursOf(dd);
          if (hh) { txt = 'Зачинено · відкриємося ' + (i === 1 ? 'завтра' : 'в ' + dayNames[dd]) + ' о ' + hh[2]; break; }
        }
      }
      status.classList.toggle('open', open);
      status.classList.toggle('closed', !open);
      $('[data-status-text]', status).textContent = txt;
      status.hidden = false;
    };
    upd();
    setInterval(upd, 60000);
  }

  /* ---------- форма ---------- */
  var form = $('[data-form]');
  if (form) {
    var body = $('[data-form-body]', form);
    var done = $('[data-form-done]', form);
    var doneText = $('[data-done-text]', form);
    var lastText = '';
    var copy = function (t) {
      try { if (navigator.clipboard) return navigator.clipboard.writeText(t).catch(function () {}); } catch (e) { /* */ }
      return null;
    };
    var check = function (input) {
      var v = input.value.trim(), ok = true;
      if (input.name === 'name') ok = v.length >= 2;
      if (input.name === 'phone') ok = v.replace(/\D/g, '').length >= 10;
      input.closest('.field').classList.toggle('invalid', !ok);
      return ok;
    };
    $$('input[required]', form).forEach(function (i) {
      i.addEventListener('blur', function () { if (i.value) check(i); });
      i.addEventListener('input', function () { if (i.closest('.field').classList.contains('invalid')) check(i); });
    });
    var MSG = {
      sms: 'Ми відкрили SMS із готовим текстом — натисніть «Надіслати», і майстер зв’яжеться з вами.',
      viber: 'Ми відкрили Viber, а текст заявки скопіювали — вставте його в чат і надішліть.',
      telegram: 'Ми відкрили Telegram, а текст заявки скопіювали — вставте його в чат і надішліть.',
      whatsapp: 'Ми відкрили WhatsApp із готовим текстом — натисніть «Надіслати».',
      instagram: 'Текст заявки скопійовано. Ми відкрили Instagram Direct — вставте текст у повідомлення й надішліть.',
      email: 'Ми відкрили лист із готовим текстом — натисніть «Надіслати», і майстер відповість вам.',
      none: 'Текст заявки скопійовано — надішліть його нам зручним способом або зателефонуйте.'
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = $$('input[required]', form);
      var bad = fields.filter(function (i) { return !check(i); });
      if (bad.length) { bad[0].focus(); return; }
      var f = form.elements;
      var lines = ['Заявка з сайту ' + BIZ,
        'Ім’я: ' + f.name.value.trim(),
        'Телефон: ' + f.phone.value.trim(),
        'Послуга: ' + f.topic.value];
      if (f.size.value.trim()) lines.push('Розмір каблучки: ' + f.size.value.trim());
      if (f.msg.value.trim()) lines.push('Коментар: ' + f.msg.value.trim());
      var text = lines.join('\n');
      lastText = text;
      var viaEl = form.querySelector('input[name="via"]:checked');
      var via = viaEl ? viaEl.value : 'none';
      var enc = encodeURIComponent(text), url = '';
      if (via === 'sms' && CONTACT.sms) url = 'sms:' + CONTACT.sms + '?&body=' + enc;
      else if (via === 'viber' && CONTACT.viber) { url = 'viber://chat?number=' + encodeURIComponent(CONTACT.viber); copy(text); }
      else if (via === 'telegram' && CONTACT.telegram) { url = 'https://t.me/' + CONTACT.telegram; copy(text); }
      else if (via === 'whatsapp' && CONTACT.whatsapp) url = 'https://wa.me/' + CONTACT.whatsapp + '?text=' + enc;
      else if (via === 'instagram' && CONTACT.instagram) { url = 'https://ig.me/m/' + CONTACT.instagram; copy(text); }
      else if (via === 'email' && CONTACT.email) url = 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent('Заявка з сайту') + '&body=' + enc;
      else { via = 'none'; copy(text); }
      doneText.textContent = MSG[via];
      body.hidden = true;
      done.hidden = false;
      done.focus();
      if (url) {
        if (/^https:/.test(url)) window.open(url, '_blank', 'noopener');
        else window.location.href = url;
      }
    });
    $('[data-copy]', form).addEventListener('click', function (e) {
      var b = e.currentTarget;
      var p = copy(lastText);
      var ok = function () { b.lastChild.textContent = 'Скопійовано'; };
      if (p && p.then) p.then(ok); else ok();
    });
    $('[data-form-reset]', form).addEventListener('click', function () {
      form.reset();
      done.hidden = true;
      body.hidden = false;
      var b = $('[data-copy]', form); b.lastChild.textContent = 'Скопіювати текст заявки';
    });
  }

  /* ---------- поява при скролі ---------- */
  var items = $$('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  var y = $('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
