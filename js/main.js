(function () {
  'use strict';
  document.documentElement.classList.add('js');

  /* Куди надсилати заявку з форми. Порожній рядок = канал вимкнено. */
  var CONTACT = {
    telegram: '',
    viber: '',
    sms: '',
    email: "mailto:office@moris.law"
  };
  var BIZ_NAME = "Moris";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- header / menu ---------- */
  var top = $('[data-top]');
  var onScroll = function () { if (top) top.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var burger = $('[data-burger]'), nav = $('[data-nav]');
  if (burger && nav) {
    var close = function () { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---------- reveal on scroll ---------- */
  var rev = $$('.reveal');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    rev.forEach(function (el) { io.observe(el); });
  } else { rev.forEach(function (el) { el.classList.add('in'); }); }

  /* ---------- case navigator ---------- */
  var navi = $('[data-navi]');
  var caseSelect = $('#f-case');
  var current = 'family';
  if (navi) {
    var tabs = $$('[role="tab"]', navi);
    var sheet = $('.navi-sheet', navi);
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) { p.hidden = !on; if (on && !reduce) { p.classList.remove('enter'); void p.offsetWidth; p.classList.add('enter'); } }
      });
      current = tab.getAttribute('data-case');
      if (sheet && !reduce) { sheet.classList.remove('swap'); void sheet.offsetWidth; sheet.classList.add('swap'); }
      if (focus) tab.focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowDown' || k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (k === 'ArrowUp' || k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (k === 'Home') n = tabs[0];
        if (k === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    // document checklist counters
    $$('.case', navi).forEach(function (c) {
      var boxes = $$('.docs input', c), out = $('[data-count]', c), tot = $('[data-total]', c);
      if (tot) tot.textContent = boxes.length;
      boxes.forEach(function (b) {
        b.addEventListener('change', function () {
          if (out) out.textContent = boxes.filter(function (x) { return x.checked; }).length;
        });
      });
    });
    var cta = $('[data-case-cta]');
    if (cta && caseSelect) cta.addEventListener('click', function () {
      var panel = document.getElementById('p-' + current);
      var title = panel && panel.getAttribute('data-title');
      $$('option', caseSelect).forEach(function (o, i) {
        if (title && o.textContent.trim() === title) caseSelect.selectedIndex = i;
      });
      var msg = $('#f-msg');
      if (msg && panel && !msg.value) {
        var ready = $$('.docs input', panel).filter(function (x) { return x.checked; }).map(function (x) { return x.nextElementSibling.textContent.trim(); });
        if (ready.length) msg.value = 'Вже маю: ' + ready.join('; ') + '.';
      }
    });
  }

  /* ---------- opening hours, Kyiv time ---------- */
  var list = $('[data-hours]');
  var statuses = $$('[data-status]');
  if (list && statuses.length) {
    var now = new Date(), day = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
      var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ''; };
      day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      mins = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);
    } catch (e) { /* fall back to device time */ }
    var toMin = function (s) { var a = s.split(':'); return parseInt(a[0], 10) * 60 + parseInt(a[1], 10); };
    var row = $('[data-day="' + day + '"]', list);
    var open = false, txt = 'Зараз зачинено';
    if (row) {
      row.classList.add('today');
      var h = row.getAttribute('data-hours');
      if (h) {
        var se = h.split('-'), s = toMin(se[0]), en = toMin(se[1]);
        if (mins >= s && mins < en) { open = true; txt = 'Зараз відчинено до ' + se[1]; }
        else if (mins < s) txt = 'Зачинено, відкриється о ' + se[0];
      }
    }
    statuses.forEach(function (el) { el.textContent = txt; el.classList.add(open ? 'open' : 'closed'); el.hidden = false; });
  }

  /* ---------- form ---------- */
  var form = $('[data-form]');
  if (form) {
    var done = $('[data-done]', form);
    var setErr = function (name, bad) {
      var f = form.elements[name]; if (!f) return;
      f.closest('.field').classList.toggle('invalid', bad);
      f.setAttribute('aria-invalid', bad ? 'true' : 'false');
    };
    var phoneOk = function (v) { var d = v.replace(/\D/g, ''); return d.length >= 10 && d.length <= 13; };
    ['name', 'phone'].forEach(function (n) {
      var f = form.elements[n];
      if (f) f.addEventListener('input', function () { if (f.closest('.field').classList.contains('invalid')) setErr(n, n === 'name' ? f.value.trim().length < 2 : !phoneOk(f.value)); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim(), phone = form.elements.phone.value.trim();
      var badN = name.length < 2, badP = !phoneOk(phone);
      setErr('name', badN); setErr('phone', badP);
      if (badN || badP) { (badN ? form.elements.name : form.elements.phone).focus(); return; }
      var cs = form.elements['case'] ? form.elements['case'].value : '';
      var msg = form.elements.msg ? form.elements.msg.value.trim() : '';
      var text = 'Заявка на консультацію (' + BIZ_NAME + ')\n' + 'Ім\'я: ' + name + '\nТелефон: ' + phone + (cs ? '\nСправа: ' + cs : '') + (msg ? '\nСитуація: ' + msg : '');
      var viaEl = form.querySelector('input[name="via"]:checked');
      var via = viaEl ? viaEl.value : '';
      var enc = encodeURIComponent(text), url = '';
      if (via === 'email' && CONTACT.email) url = CONTACT.email + '?subject=' + encodeURIComponent('Заявка на консультацію') + '&body=' + enc;
      else if (via === 'sms' && CONTACT.sms) url = CONTACT.sms + '?&body=' + enc;
      else if (via === 'viber' && CONTACT.viber) url = CONTACT.viber + '&draft=' + enc;
      else if (via === 'telegram' && CONTACT.telegram) url = CONTACT.telegram;
      if (navigator.clipboard && (via === 'telegram' || !url)) { navigator.clipboard.writeText(text).catch(function () {}); }
      if (url) {
        if (/^https?:/.test(url)) window.open(url, '_blank', 'noopener'); else window.location.href = url;
      }
      if (done) { done.hidden = false; done.focus(); }
    });
    var again = $('[data-again]', form);
    if (again) again.addEventListener('click', function () { form.reset(); done.hidden = true; form.elements.name.focus(); });
  }

  var y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
