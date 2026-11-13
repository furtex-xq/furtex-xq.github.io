(function () {
  'use strict';
  var d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var focus = d.body.getAttribute('data-focus') || 'mix'; // pizza | burger | mix

  /* ---------- mobile menu ---------- */
  var nav = $('#nav'), mbtn = $('[data-menu-btn]');
  if (nav && mbtn) {
    var setMenu = function (open) {
      nav.classList.toggle('is-open', open);
      mbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      mbtn.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
      mbtn.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
    };
    mbtn.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- menu tabs ---------- */
  var tabs = $$('[data-tab]');
  function showTab(name, focusIt) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focusIt) t.focus();
    });
    $$('[data-panel]').forEach(function (p) {
      var on = p.getAttribute('data-panel') === name;
      p.hidden = !on;
      p.classList.remove('is-in');
      if (on) { void p.offsetWidth; p.classList.add('is-in'); }
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { showTab(t.getAttribute('data-tab')); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (n) { e.preventDefault(); showTab(n.getAttribute('data-tab'), true); }
    });
  });
  if (tabs.length) showTab(focus === 'pizza' ? 'pizza' : 'burger');

  /* ---------- builder (signature) ---------- */
  var builder = $('#builder');
  var NAMES = {
    burger: { patty: 'яловича котлета', patty2: 'друга котлета', cheese: 'чедер', bacon: 'бекон', pickles: 'огірки', lettuce: 'салат', tomato: 'томат', onion: 'червона цибуля', sauce: 'фірмовий соус' },
    pizza: { cheese: 'моцарела', pepperoni: 'пепероні', ham: 'шинка', mushroom: 'печериці', olives: 'оливки', pepper: 'болгарський перець', jalapeno: 'халапеньо', basil: 'базилік' }
  };
  var mode = focus === 'pizza' ? 'pizza' : 'burger';
  var built = false;
  function plural(n) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return 'інгредієнт';
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'інгредієнти';
    return 'інгредієнтів';
  }
  function chosen(m) {
    return $$('[data-group="' + m + '"] input[type="checkbox"]').filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
  }
  function summary() {
    var list = chosen(mode).map(function (v) { return NAMES[mode][v]; });
    if (mode === 'pizza') {
      var base = $('[name="base"]:checked');
      list.unshift((base && base.value === 'cream' ? 'вершкова' : 'томатна') + ' основа');
      return 'Своя піца: ' + list.join(', ');
    }
    return 'Свій бургер: ' + list.join(', ');
  }
  function render(animate) {
    if (!builder) return;
    builder.setAttribute('data-mode', mode);
    $$('[data-mode-btn]').forEach(function (b) { b.setAttribute('aria-checked', b.getAttribute('data-mode-btn') === mode ? 'true' : 'false'); });
    $$('[data-stage]').forEach(function (s) { s.hidden = s.getAttribute('data-stage') !== mode; });
    $$('[data-group]').forEach(function (g) { g.hidden = g.getAttribute('data-group') !== mode; });
    var on = chosen(mode);
    if (mode === 'burger') {
      var delay = 0;
      // bottom-up order so the stack assembles from the plate
      $$('[data-stage="burger"] [data-layer]').reverse().forEach(function (l) {
        var k = l.getAttribute('data-layer');
        var want = k === 'bun-top' || k === 'bun-bottom' || on.indexOf(k) > -1;
        var was = !l.classList.contains('is-off') && l.hasAttribute('data-shown');
        if (!want) { l.classList.add('is-off'); l.removeAttribute('data-shown'); l.classList.remove('drop'); return; }
        l.classList.remove('is-off');
        if (!was && animate && !reduce) {
          l.classList.remove('drop'); void l.offsetWidth;
          l.style.animationDelay = delay + 's'; delay += 0.09;
          l.classList.add('drop');
        }
        l.setAttribute('data-shown', '');
      });
    } else {
      $$('[data-stage="pizza"] [data-pz]').forEach(function (g, i) {
        var k = g.getAttribute('data-pz');
        var want = on.indexOf(k) > -1;
        g.style.transitionDelay = (animate && !reduce && want) ? (i * 0.06) + 's' : '0s';
        g.classList.toggle('is-off', !want);
      });
      var base = $('[name="base"]:checked');
      var sauce = $('[data-sauce]');
      if (sauce) sauce.setAttribute('fill', base && base.value === 'cream' ? '#F3E6CC' : '#C8321F');
    }
    var n = on.length + (mode === 'pizza' ? 1 : 0);
    var c = $('[data-count]'); if (c) c.textContent = n;
    var w = $('[data-count-word]'); if (w) w.textContent = plural(n);
    var t = $('[data-sum-title]'); if (t) t.textContent = mode === 'pizza' ? 'Ваша піца' : 'Ваш бургер';
    var li = $('[data-sum-list]'); if (li) li.textContent = summary().replace(/^[^:]+:\s*/, '');
  }
  if (builder) {
    $$('[data-mode-btn]').forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-mode-btn');
        if (mode === 'burger') $$('[data-stage="burger"] [data-layer]').forEach(function (l) { l.removeAttribute('data-shown'); });
        render(true);
      });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var other = $$('[data-mode-btn]').filter(function (x) { return x !== b; })[0];
          other.focus(); other.click();
        }
      });
    });
    $$('#builder input').forEach(function (i) { i.addEventListener('change', function () { render(true); }); });
    // first paint without layers drawn; assemble when the section scrolls into view
    if ('IntersectionObserver' in window && !reduce) {
      $$('[data-stage="burger"] [data-layer]').forEach(function (l) { l.classList.add('is-off'); });
      $$('[data-stage="pizza"] [data-pz]').forEach(function (g) { g.classList.add('is-off'); });
      render(false);
      $$('[data-stage="burger"] [data-layer]').forEach(function (l) { l.classList.add('is-off'); l.removeAttribute('data-shown'); });
      $$('[data-stage="pizza"] [data-pz]').forEach(function (g) { g.classList.add('is-off'); });
      var io0 = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && !built) { built = true; render(true); io0.disconnect(); } });
      }, { threshold: 0.35 });
      io0.observe($('.stage'));
    } else { built = true; render(false); }
  }

  /* ---------- reveal on scroll ---------- */
  var rv = $$('.sec__head, .panel__pic, .delivery__grid, .about__grid, .revs, .faq__grid, .contacts__grid');
  if ('IntersectionObserver' in window && !reduce) {
    rv.forEach(function (el) { el.classList.add('rv'); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  }

  /* ---------- hours & live status (Kyiv time) ---------- */
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
      return { dow: dow, min: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
    } catch (e) { var n = new Date(); return { dow: n.getDay(), min: n.getHours() * 60 + n.getMinutes() }; }
  }
  function toMin(s) { var p = s.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
  var DAYS = ['у неділю', 'у понеділок', 'у вівторок', 'у середу', 'у четвер', 'у п’ятницю', 'у суботу'];
  var hoursList = $('[data-hours]');
  if (hoursList) {
    var H = {};
    $$('li', hoursList).forEach(function (li) {
      var o = li.getAttribute('data-open'), c = li.getAttribute('data-close');
      H[li.getAttribute('data-dow')] = o && c ? [toMin(o), toMin(c)] : null;
    });
    var now = kyivNow();
    var today = $('li[data-dow="' + now.dow + '"]', hoursList); if (today) today.classList.add('is-today');
    var open = false, msg = '';
    var td = H[now.dow], yd = H[(now.dow + 6) % 7];
    if (yd && yd[1] <= yd[0] && now.min < yd[1]) { open = true; msg = 'Відчинено до ' + fmt(yd[1]); }
    else if (td) {
      var close = td[1] <= td[0] ? td[1] + 1440 : td[1];
      if (now.min >= td[0] && now.min < close) { open = true; msg = 'Відчинено до ' + fmt(td[1]); }
      else if (now.min < td[0]) msg = 'Зачинено · відчиняємось о ' + fmt(td[0]);
    }
    if (!msg) {
      for (var i = 1; i <= 7; i++) {
        var nd = (now.dow + i) % 7;
        if (H[nd]) { msg = 'Зачинено · відчиняємось ' + (i === 1 ? 'завтра' : DAYS[nd]) + ' о ' + fmt(H[nd][0]); break; }
      }
      if (!msg) msg = 'Зачинено';
    }
    $$('[data-status]').forEach(function (s) {
      s.classList.add(open ? 'is-open' : 'is-closed');
      var t = $('[data-status-text]', s); if (t) t.textContent = msg;
    });
  }
  function fmt(m) { m = m % 1440; var h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; }

  /* ---------- order form ---------- */
  var form = $('[data-form]'), done = $('[data-done]');
  if (form) {
    var addrField = $('[data-addr-field]');
    var syncHow = function () {
      var how = $('[name="how"]:checked', form);
      if (addrField) addrField.hidden = !(how && how.value === 'Доставка');
    };
    $$('[name="how"]', form).forEach(function (r) { r.addEventListener('change', syncHow); });
    syncHow();

    var toOrder = $('[data-to-order]');
    if (toOrder) toOrder.addEventListener('click', function () {
      var ta = $('#f-order');
      var line = summary();
      ta.value = ta.value ? ta.value.replace(/\s+$/, '') + '\n' + line : line;
      var target = $('#order');
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { ta.focus({ preventScroll: true }); }, reduce ? 0 : 600);
    });

    var bizName = (d.querySelector('.logo__name') || {}).textContent || '';
    var check = function (el, ok) { el.closest('.f').classList.toggle('is-bad', !ok); return ok; };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#f-name'), phone = $('#f-phone'), order = $('#f-order'), addr = $('#f-addr');
      var how = ($('[name="how"]:checked', form) || {}).value || '';
      var ok = check(name, name.value.trim().length > 1);
      ok = check(phone, phone.value.replace(/\D/g, '').length >= 9) && ok;
      if (how === 'Доставка') ok = check(addr, addr.value.trim().length > 3) && ok;
      ok = check(order, order.value.trim().length > 2) && ok;
      if (!ok) { var bad = $('.f.is-bad input, .f.is-bad textarea', form); if (bad) bad.focus(); return; }

      var lines = [
        'Замовлення з сайту ' + bizName.trim(),
        'Ім’я: ' + name.value.trim(),
        'Телефон: ' + phone.value.trim(),
        'Отримання: ' + how + (how === 'Доставка' ? ' — ' + addr.value.trim() : ''),
        'Замовлення: ' + order.value.trim(),
        'Коли: ' + $('#f-time').value
      ];
      var note = $('#f-note').value.trim(); if (note) lines.push('Коментар: ' + note);
      var text = lines.join('\n');
      var via = ($('[name="via"]:checked', form) || {}).value || '';
      var enc = encodeURIComponent(text);
      var url = '';
      var base = form.getAttribute('data-' + via) || '';
      if (via === 'tg') url = base + (base.indexOf('?') > -1 ? '&' : '?') + 'text=' + enc;
      else if (via === 'viber') url = base;
      else if (via === 'wa') url = base + (base.indexOf('?') > -1 ? '&' : '?') + 'text=' + enc;
      else if (via === 'sms') url = base + (/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?') + 'body=' + enc;
      else if (via === 'mail') url = base + '?subject=' + encodeURIComponent('Замовлення з сайту') + '&body=' + enc;
      else if (via === 'ig') url = base;

      $('[data-done-msg]').textContent = text;
      var title = $('[data-done-title]'), dtext = $('[data-done-text]');
      if (!url) {
        title.textContent = 'Залишилось подзвонити';
        dtext.textContent = 'Продиктуйте це замовлення по телефону — ми все підтвердимо й назвемо час.';
      } else if (via === 'viber' || via === 'ig') {
        title.textContent = 'Текст скопійовано';
        dtext.textContent = 'Ми відкрили чат — вставте текст у повідомлення й надішліть. Якщо чат не відкрився, скопіюйте текст нижче.';
        copy(text);
      }
      form.hidden = true; done.hidden = false; done.focus();
      if (url) {
        if (/^https?:/.test(url)) window.open(url, '_blank', 'noopener'); else window.location.href = url;
      }
    });
    $$('input, textarea', form).forEach(function (el) {
      el.addEventListener('input', function () { var f = el.closest('.f'); if (f) f.classList.remove('is-bad'); });
    });
    var again = $('[data-again]');
    if (again) again.addEventListener('click', function () { form.reset(); syncHow(); done.hidden = true; form.hidden = false; $('#f-name').focus(); });
    var cbtn = $('[data-copy]');
    if (cbtn) cbtn.addEventListener('click', function () {
      copy($('[data-done-msg]').textContent);
      cbtn.textContent = 'Скопійовано';
      setTimeout(function () { cbtn.textContent = 'Скопіювати текст'; }, 1800);
    });
  }
  function copy(t) {
    try { if (navigator.clipboard) { navigator.clipboard.writeText(t); return; } } catch (e) { /* fall through */ }
    var ta = d.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    d.body.appendChild(ta); ta.select(); try { d.execCommand('copy'); } catch (e) { /* ignore */ } d.body.removeChild(ta);
  }

  var y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
