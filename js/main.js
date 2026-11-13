/* A-dance studio — танцювальна студія. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  /* ---- contact channels: the only place the form takes addresses from ----
     Remove a key if the studio does not use that channel (and the matching
     data-ch elements in index.html). */
  var CONTACT = {
    sms: "+380508115475"
  };

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

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

  /* ---- signature: headline that moves to the beat ---- */
  var words = document.querySelectorAll('.beat-title .bw');
  var counts = document.querySelectorAll('.counts li');
  var bpmEl = document.getElementById('met-bpm');
  var styleEl = document.getElementById('met-style');
  var toggle = document.getElementById('met-toggle');
  var bpm = 96, step = 0, timer = null, offTimer = null;
  var paused = reduce, heroVisible = true;

  function tick() {
    var ms = 60000 / bpm;
    // counts run 5-6-7-8-1-2-3-4: the count-in, then the bar
    for (var i = 0; i < counts.length; i++) counts[i].classList.toggle('on', i === step);
    var w = words[step % words.length];
    for (var j = 0; j < words.length; j++) words[j].classList.toggle('on', words[j] === w);
    var activeTab = document.querySelector('.pt[aria-selected="true"]');
    if (activeTab) activeTab.classList.toggle('tick', step % 2 === 0);
    clearTimeout(offTimer);
    offTimer = setTimeout(function () { if (w) w.classList.remove('on'); }, ms * 0.55);
    step = (step + 1) % 8;
  }
  function stopBeat() {
    clearInterval(timer); timer = null;
    clearTimeout(offTimer);
    for (var j = 0; j < words.length; j++) words[j].classList.remove('on');
  }
  function startBeat() {
    stopBeat();
    if (paused || !heroVisible || document.hidden) return;
    tick();
    timer = setInterval(tick, 60000 / bpm);
  }
  function setTempo(newBpm, label) {
    bpm = newBpm;
    root.style.setProperty('--beat', Math.round(60000 / bpm) + 'ms');
    if (bpmEl) bpmEl.textContent = String(bpm);
    if (styleEl && label) styleEl.textContent = label;
    step = 0;
    if (timer) startBeat();
  }
  function setPaused(p) {
    paused = p;
    root.classList.toggle('is-paused', p);
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(p));
      toggle.setAttribute('aria-label', p ? 'Увімкнути ритм' : 'Зупинити ритм');
    }
    if (p) { stopBeat(); for (var i = 0; i < counts.length; i++) counts[i].classList.remove('on'); }
    else startBeat();
  }
  if (toggle) toggle.addEventListener('click', function () { setPaused(!paused); });
  var hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      heroVisible = en[0].isIntersecting;
      if (heroVisible) startBeat(); else stopBeat();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopBeat(); else startBeat(); });
  setPaused(paused);

  /* ---- schedule (sample data: replace with the studio's real timetable) ---- */
  var DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  var NAMES = { hiphop: 'Хіп-хоп', contemp: 'Контемп', pole: 'Pole dance', latina: 'Латина', kids: 'Діти' };
  var SCHEDULE = [
    // d: 1 = понеділок … 7 = неділя
    { d: 1, t: '17:00', s: 'kids', l: 'Діти 4–6 років' },
    { d: 1, t: '18:30', s: 'hiphop', l: 'Початківці' },
    { d: 1, t: '20:00', s: 'pole', l: 'Початківці' },
    { d: 2, t: '17:00', s: 'kids', l: 'Діти 7–10 років' },
    { d: 2, t: '18:30', s: 'contemp', l: 'Усі рівні' },
    { d: 2, t: '20:00', s: 'latina', l: 'Сальса, початківці' },
    { d: 3, t: '18:00', s: 'hiphop', l: 'Підлітки' },
    { d: 3, t: '19:30', s: 'pole', l: 'Продовжуючі' },
    { d: 4, t: '17:00', s: 'kids', l: 'Діти 4–6 років' },
    { d: 4, t: '18:30', s: 'hiphop', l: 'Початківці' },
    { d: 4, t: '20:00', s: 'latina', l: 'Бачата' },
    { d: 5, t: '17:30', s: 'kids', l: 'Діти 11–14 років' },
    { d: 5, t: '19:00', s: 'contemp', l: 'Продовжуючі' },
    { d: 5, t: '20:15', s: 'pole', l: 'Exotic' },
    { d: 6, t: '10:30', s: 'kids', l: 'Діти 7–10 років' },
    { d: 6, t: '12:00', s: 'hiphop', l: 'Фристайл-практика' },
    { d: 6, t: '13:30', s: 'latina', l: 'Леді-стайл' }
  ];
  var week = document.getElementById('week');
  var filter = 'hiphop';
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: map[o.weekday], min: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
    } catch (e) {
      var d = new Date(); return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function renderWeek(animate) {
    if (!week) return;
    var today = kyivNow().day; today = today === 0 ? 7 : today;
    var html = '';
    for (var d = 1; d <= 7; d++) {
      var items = SCHEDULE.filter(function (c) { return c.d === d && (filter === 'all' || c.s === filter); });
      html += '<div class="day' + (d === today ? ' today' : '') + (items.length ? '' : ' empty') + '"><div class="day-name">' + DAYS[d - 1] + '</div><div class="day-list">';
      if (!items.length) html += '<span class="day-empty">—</span>';
      items.forEach(function (c, i) {
        html += '<div class="cls' + (animate && !reduce ? ' fade' : '') + '" style="animation-delay:' + (i * 40) + 'ms"><span class="cls-time">' + c.t + '</span><span class="cls-name">' + NAMES[c.s] + '</span><span class="cls-lvl">' + c.l + '</span></div>';
      });
      html += '</div></div>';
    }
    week.innerHTML = html;
  }
  var chips = document.querySelectorAll('.chip');
  function setFilter(f, animate) {
    filter = f;
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-filter') === f)); });
    renderWeek(animate);
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { setFilter(c.getAttribute('data-filter'), true); }); });
  renderWeek(false);

  /* ---- style picker: tabs drive tempo + schedule filter ---- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.pt'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) {
        panel.hidden = !on;
        if (on) { panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap'); }
      }
    });
    if (focus) tab.focus();
    setTempo(parseInt(tab.getAttribute('data-bpm'), 10), tab.getAttribute('data-label'));
    setFilter(tab.getAttribute('data-style'), true);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t, false); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') n = tabs[0];
      else if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });

  /* ---- "Записатися на …" buttons preselect the style in the form ---- */
  var styleSelect = document.getElementById('f-style');
  document.querySelectorAll('[data-pick]').forEach(function (a) {
    a.addEventListener('click', function () {
      var v = a.getAttribute('data-pick');
      if (!styleSelect) return;
      for (var i = 0; i < styleSelect.options.length; i++) {
        if (styleSelect.options[i].text === v) { styleSelect.selectedIndex = i; break; }
      }
    });
  });

  /* ---- opening hours: live status by Kyiv time ---- */
  var table = document.getElementById('hours-table');
  var status = document.getElementById('open-status');
  var ACC = ['у неділю', 'у понеділок', 'у вівторок', 'у середу', 'у четвер', 'у п’ятницю', 'у суботу'];
  function toMin(s) { var p = s.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
  function updateStatus() {
    if (!table || !status) return;
    var now = kyivNow();
    var rows = table.querySelectorAll('tr[data-day]');
    var row = table.querySelector('tr[data-day="' + now.day + '"]');
    rows.forEach(function (r) { r.classList.toggle('today', r === row); });
    var open = false, txt = '';
    if (row && row.getAttribute('data-open')) {
      var o = toMin(row.getAttribute('data-open')), c = toMin(row.getAttribute('data-close'));
      if (now.min >= o && now.min < c) { open = true; txt = 'Зараз відчинено до ' + row.getAttribute('data-close'); }
      else if (now.min < o) txt = 'Зараз зачинено · відчинимося о ' + row.getAttribute('data-open');
    }
    if (!open && !txt) {
      for (var k = 1; k <= 7; k++) {
        var nd = (now.day + k) % 7;
        var nr = table.querySelector('tr[data-day="' + nd + '"][data-open]');
        if (nr) { txt = 'Зараз зачинено · відчинимося ' + (k === 1 ? 'завтра' : ACC[nd]) + ' о ' + nr.getAttribute('data-open'); break; }
      }
      if (!txt) txt = 'Зараз зачинено';
    }
    status.classList.toggle('open', open);
    status.classList.toggle('closed', !open);
    status.querySelector('.status-text').textContent = txt;
    status.hidden = false;
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---- booking form ---- */
  var form = document.getElementById('book-form');
  var done = document.getElementById('form-done');
  var hint = document.getElementById('form-hint');
  var submitBtn = document.getElementById('f-submit');
  var LABELS = { telegram: 'Telegram', viber: 'Viber', whatsapp: 'WhatsApp', sms: 'SMS', instagram: 'Instagram', facebook: 'Facebook', email: 'пошту' };

  // keep only channels that exist in CONTACT
  var viaWrap = document.getElementById('send-via');
  var radios = [];
  document.querySelectorAll('.via-opts label').forEach(function (l) {
    var r = l.querySelector('input');
    if (!CONTACT[r.value]) l.parentNode.removeChild(l); else radios.push(r);
  });
  if (radios.length && !radios.some(function (r) { return r.checked; })) radios[0].checked = true;
  if (viaWrap && radios.length <= 1) viaWrap.hidden = true;
  function currentVia() {
    for (var i = 0; i < radios.length; i++) if (radios[i].checked) return radios[i].value;
    return null;
  }
  function updateButton() {
    var v = currentVia();
    if (!submitBtn) return;
    var label = v === 'sms' ? 'Надіслати SMS' : v === 'email' ? 'Надіслати листом' : v ? 'Надіслати в ' + LABELS[v] : 'Надіслати заявку';
    submitBtn.firstChild.nodeValue = label;
    if (hint) hint.textContent = (v === 'instagram' || v === 'facebook' || v === 'telegram') ? 'Текст заявки скопіюється — вставте його в чат і надішліть.' : '';
  }
  radios.forEach(function (r) { r.addEventListener('change', updateButton); });
  if (submitBtn && !radios.length) submitBtn.hidden = true;
  updateButton();

  function fieldOk(id, test) {
    var el = document.getElementById(id);
    var ok = test(el.value.trim());
    el.closest('.field').classList.toggle('invalid', !ok);
    el.setAttribute('aria-invalid', String(!ok));
    if (!ok) el.setAttribute('aria-describedby', 'e-' + id.slice(2)); else el.removeAttribute('aria-describedby');
    return ok;
  }
  function buildUrl(via, text) {
    var t = encodeURIComponent(text);
    switch (via) {
      case 'telegram': return 'https://t.me/' + CONTACT.telegram;
      case 'viber': return 'viber://chat?number=' + encodeURIComponent(CONTACT.viber) + '&draft=' + t;
      case 'whatsapp': return 'https://wa.me/' + CONTACT.whatsapp + '?text=' + t;
      case 'sms': return 'sms:' + CONTACT.sms + '?&body=' + t;
      case 'instagram': return 'https://ig.me/m/' + CONTACT.instagram;
      case 'facebook': return 'https://m.me/' + CONTACT.facebook;
      case 'email': return 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent('Запис на пробне заняття') + '&body=' + t;
    }
    return null;
  }
  function copy(text) {
    try { if (navigator.clipboard) navigator.clipboard.writeText(text); } catch (e) { /* ignore */ }
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = fieldOk('f-name', function (v) { return v.length >= 2; });
      ok = fieldOk('f-phone', function (v) { return v.replace(/\D/g, '').length >= 9; }) && ok;
      var consent = document.getElementById('f-ok');
      document.getElementById('e-ok').classList.toggle('show', !consent.checked);
      ok = consent.checked && ok;
      if (!ok) { var bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }

      var via = currentVia();
      var text = 'Запис на пробне заняття (A-dance studio)\n' +
        'Ім’я: ' + document.getElementById('f-name').value.trim() + '\n' +
        'Телефон: ' + document.getElementById('f-phone').value.trim() + '\n' +
        'Напрям: ' + styleSelect.value + '\n' +
        'Зручний час: ' + document.getElementById('f-time').value;
      var msg = document.getElementById('f-msg').value.trim();
      if (msg) text += '\nКоментар: ' + msg;

      var url = buildUrl(via, text);
      var copied = via === 'telegram' || via === 'instagram' || via === 'facebook';
      if (copied) copy(text);
      if (url) {
        if (/^https:/.test(url)) window.open(url, '_blank', 'noopener');
        else window.location.href = url;
      }
      var dt = document.getElementById('done-text');
      if (dt) {
        dt.textContent = copied
          ? 'Текст заявки скопійовано. Вставте його в чат ' + LABELS[via] + ', що відкрився, і надішліть — ми підтвердимо день і час пробного заняття.'
          : 'Надішліть повідомлення у вікні, що відкрилося (' + LABELS[via] + '), і ми зв’яжемося з вами, щоб підтвердити пробне заняття.';
      }
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });
    form.addEventListener('input', function (e) {
      var f = e.target.closest('.field');
      if (f && f.classList.contains('invalid')) f.classList.remove('invalid');
    });
    document.getElementById('form-again').addEventListener('click', function () {
      done.hidden = true; form.hidden = false; form.reset(); updateButton();
      document.getElementById('f-name').focus();
    });
  }

  /* ---- reveal on scroll ---- */
  var rv = document.querySelectorAll('.sec-head, .pp-body, .price-col, .about-copy, .step, .faq-list, .cont-info, .form-card');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { el.classList.add('rv'); io.observe(el); });
  }

  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();
