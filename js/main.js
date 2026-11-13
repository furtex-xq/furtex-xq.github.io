/* Медичний центр — шаблон klinika. Без бібліотек. */
(function () {
  'use strict';
  var d = document;
  d.documentElement.classList.add('js');

  /* ---- Контакти для форми (замініть на реальні) ---- */
  var CONTACT = {
    telegram: 'https://t.me/username',
    viber: 'viber://chat?number=%2B380000000000',
    email: 'mailto:hello@example.com'
  };

  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  /* ---- Header: shadow on scroll + mobile menu ---- */
  var header = $('.site-header');
  var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var burger = $('.burger'), nav = $('#nav');
  var setMenu = function (open) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    burger.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
  };
  burger.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  $$('#nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---- Opening hours / "зараз відчинено" by Kyiv time ---- */
  var DAYS = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота'];
  var schedule = {};
  $$('.hours-list li').forEach(function (li) { schedule[li.getAttribute('data-day')] = li.getAttribute('data-hours') || ''; });

  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday];
      return { day: wd, min: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
    } catch (e) { var n = new Date(); return { day: n.getDay(), min: n.getHours() * 60 + n.getMinutes() }; }
  }
  function parse(h) {
    var m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(h || '');
    return m ? { o: +m[1] * 60 + +m[2], c: +m[3] * 60 + +m[4], os: m[1] + ':' + m[2], cs: m[3] + ':' + m[4] } : null;
  }
  function updateStatus() {
    var now = kyivNow(), today = parse(schedule[now.day]), state, text;
    if (today && now.min >= today.o && now.min < today.c) {
      state = 'open'; text = 'Зараз відчинено · до ' + today.cs;
    } else {
      state = 'closed';
      if (today && now.min < today.o) { text = 'Зачинено · відкриємося сьогодні о ' + today.os; }
      else {
        text = 'Зараз зачинено';
        for (var i = 1; i <= 7; i++) {
          var dd = (now.day + i) % 7, h = parse(schedule[dd]);
          if (h) { text = 'Зачинено · відкриємося ' + (i === 1 ? 'завтра' : 'у ' + DAYS[dd].replace('неділя', 'неділю').replace('середа', 'середу').replace("п'ятниця", "п'ятницю").replace('субота', 'суботу')) + ' о ' + h.os; break; }
        }
      }
    }
    $$('[data-status]').forEach(function (el) { el.setAttribute('data-state', state); var t = el.querySelector('[data-status-text]'); if (t) t.textContent = text; });
    var dayEl = $('[data-today]'); if (dayEl) dayEl.textContent = DAYS[now.day];
    var hEl = $('[data-today-hours]'); if (hEl) hEl.textContent = today ? 'Сьогодні ' + today.os + '–' + today.cs : 'Сьогодні вихідний';
    $$('.hours-list li').forEach(function (li) { li.classList.toggle('today', li.getAttribute('data-day') === String(now.day)); });
  }
  updateStatus(); setInterval(updateStatus, 60000);

  /* ---- Finder (symptom → specialist board) ---- */
  var board = $('.board'), note = $('[data-board-note]'), reset = $('.board-reset');
  var defaultNote = note ? note.textContent : '';
  var syms = $$('.sym');
  function applyFinder() {
    var picked = syms.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; });
    var match = {};
    picked.forEach(function (b) { b.getAttribute('data-match').split(/\s+/).forEach(function (k) { match[k] = 1; }); });
    $$('.spec').forEach(function (li) { li.classList.toggle('match', !!match[li.getAttribute('data-spec')]); });
    board.classList.toggle('has-pick', picked.length > 0);
    reset.hidden = picked.length === 0;
    note.textContent = picked.length ? picked[picked.length - 1].getAttribute('data-note') : defaultNote;
  }
  syms.forEach(function (b) {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      applyFinder();
    });
  });
  if (reset) reset.addEventListener('click', function () { syms.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); applyFinder(); });
  $$('[data-quick]').forEach(function (a) {
    a.addEventListener('click', function () {
      var key = a.getAttribute('data-quick');
      syms.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-sym') === key ? 'true' : 'false'); });
      applyFinder();
      var on = $('.sym[data-sym="' + key + '"]'), strip = $('.symptoms');
      if (on && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = on.offsetLeft - strip.offsetLeft - 20;
    });
  });

  /* ---- Price tabs ---- */
  var tabs = $$('[role="tab"]');
  function selectTab(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      x.tabIndex = on ? 0 : -1;
      d.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var n = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
        selectTab(tabs[n], true);
      }
    });
  });

  /* ---- Booking form ---- */
  var form = $('.book-form'), F = function (n) { return form.elements.namedItem(n); }, done = $('.form-done'), spec = $('#f-spec'), date = $('#f-date');
  $$('.spec [data-book]').forEach(function (a) {
    var o = d.createElement('option'); o.value = o.textContent = a.getAttribute('data-book'); spec.appendChild(o);
  });
  $$('[data-book]').forEach(function (a) {
    a.addEventListener('click', function () { spec.value = a.getAttribute('data-book'); });
  });
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var t = new Date(); var todayISO = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
  date.min = todayISO;

  function setErr(name, bad) {
    var e = form.querySelector('[data-err="' + name + '"]');
    var f = e.closest('.field');
    if (f) f.classList.toggle('invalid', bad); else e.classList.toggle('show', bad);
    return bad;
  }
  function validate() {
    var bad = false, first = null;
    var name = F('name').value.trim();
    if (setErr('name', name.length < 2)) { bad = true; first = first || F('name'); }
    var digits = F('phone').value.replace(/\D/g, '');
    if (setErr('phone', digits.length < 10 || digits.length > 13)) { bad = true; first = first || F('phone'); }
    if (setErr('date', !!date.value && date.value < todayISO)) { bad = true; first = first || date; }
    if (setErr('consent', !F('consent').checked)) { bad = true; first = first || F('consent'); }
    if (first) first.focus();
    return !bad;
  }
  ['name', 'phone'].forEach(function (n) { F(n).addEventListener('input', function () { if (F(n).closest('.field').classList.contains('invalid')) validate(); }); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    var dt = date.value ? date.value.split('-').reverse().join('.') : 'будь-яка';
    var lines = [
      'Запис на прийом',
      "Ім'я: " + F('name').value.trim(),
      'Телефон: ' + F('phone').value.trim(),
      'Лікар / послуга: ' + spec.value,
      'Дата: ' + dt + ', час: ' + F('time').value
    ];
    if (F('msg').value.trim()) lines.push('Коментар: ' + F('msg').value.trim());
    var text = lines.join('\n');
    var via = form.querySelector('input[name="via"]:checked').value, url;
    if (via === 'email') url = CONTACT.email + '?subject=' + encodeURIComponent('Запис на прийом — ' + F('name').value.trim()) + '&body=' + encodeURIComponent(text);
    else if (via === 'viber') url = CONTACT.viber + '&draft=' + encodeURIComponent(text);
    else url = CONTACT.telegram + '?text=' + encodeURIComponent(text);
    try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (err) {}
    if (via === 'telegram') window.open(url, '_blank', 'noopener'); else window.location.href = url;
    form.hidden = true; done.hidden = false; done.focus();
  });
  $('[data-form-again]').addEventListener('click', function () { form.reset(); done.hidden = true; form.hidden = false; F('name').focus(); });

  /* ---- Footer year ---- */
  var y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();

  /* ---- Reveal on scroll ---- */
  var targets = $$('.sec-head, .board, .price-list, .about-photos, .about-copy, .doc, .steps li, .review, .faq-list, .booking, .contact-info, .map');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  }
})();
