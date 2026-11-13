/* Клінінг / хімчистка — шаблон. Без бібліотек. */
(function () {
  'use strict';
  var d = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function num(v) {
    if (v == null) return null;
    v = String(v).replace(/\s/g, '').replace(',', '.');
    return /^\d+(\.\d+)?$/.test(v) ? parseFloat(v) : null;
  }
  function fmt(n) { return Math.round(n).toLocaleString('uk-UA').replace(/ | /g, ' '); }
  var PH = '<span class="ph">[ЦІНА]</span>';

  /* ---------- рік у футері ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- шапка й меню ---------- */
  var hdr = $('[data-hdr]'), nav = $('#nav'), burger = $('[data-burger]');
  function onScroll() { if (hdr) hdr.classList.toggle('is-stuck', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  function closeNav() {
    if (!nav) return;
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Відкрити меню');
    burger.querySelector('use').setAttribute('href', '#i-menu');
  }
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
      burger.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', closeNav); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
  }

  /* ---------- фішка: скребок протирає запітніле фото ---------- */
  var win = $('[data-win]');
  if (win) {
    var fog = $('.win__fog', win);
    if (reduce || !fog) { win.classList.add('is-clean'); }
    else {
      var started = false;
      var run = function () {
        if (started) return; started = true;
        win.classList.add('is-wiping');
        var t0 = null, dur = 1700;
        var stepF = function (t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / dur);
          var e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          var x = (e * 112 - 6);
          win.style.setProperty('--wipe', x + '%');
          fog.style.clipPath = 'inset(0 0 0 ' + Math.max(0, x) + '%)';
          if (p < 1) requestAnimationFrame(stepF);
          else { win.classList.remove('is-wiping'); win.classList.add('is-clean'); fog.style.display = 'none'; }
        };
        requestAnimationFrame(stepF);
      };
      var main = $('.win__img', win);
      var go = function () { setTimeout(run, 450); };
      if (main && !main.complete) { main.addEventListener('load', go); main.addEventListener('error', go); setTimeout(run, 2600); }
      else go();
    }
  }

  /* ---------- калькулятор ---------- */
  var calc = $('[data-calc]');
  var calcSummary = '';
  if (calc) {
    var area = $('input[name="area"]', calc), areaOut = $('[data-area-out]', calc);
    var totalEl = $('[data-total]', calc), linesEl = $('[data-lines]', calc);
    var timeEl = $('[data-time]', calc), timeTxt = $('[data-time-text]', calc), noteEl = $('[data-note]', calc);
    var ticket = $('.ticket', calc), lastTotal = '';
    var noteDefault = noteEl ? noteEl.textContent : '';

    $$('[data-area-step]', calc).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = Math.min(+area.max, Math.max(+area.min, +area.value + +b.getAttribute('data-area-step')));
        area.value = v; update();
      });
    });
    $$('li[data-item]', calc).forEach(function (li) {
      var out = $('[data-q-out]', li);
      $$('[data-q]', li).forEach(function (b) {
        b.addEventListener('click', function () {
          var max = +(li.getAttribute('data-max') || 30);
          out.value = out.textContent = String(Math.min(max, Math.max(0, (+out.textContent || 0) + +b.getAttribute('data-q'))));
          update();
        });
      });
    });
    calc.addEventListener('input', update);
    calc.addEventListener('change', update);
    calc.addEventListener('submit', function (e) { e.preventDefault(); });

    function update() {
      var lines = [], unknown = 0, sum = 0, mins = 0, any = false;
      var kind = $('input[name="kind"]:checked', calc);
      var a = area ? +area.value : 0;
      if (area) {
        if (areaOut) areaOut.textContent = a + ' м²';
        var p = (a - area.min) / (area.max - area.min) * 100;
        area.style.setProperty('--p', p + '%');
      }
      if (kind) {
        any = true;
        var rate = num(kind.getAttribute('data-rate'));
        var line = { label: kind.value + (area ? ', ' + a + ' м²' : ''), price: rate === null ? null : rate * (area ? a : 1) };
        lines.push(line);
        mins += (area ? a / (+kind.getAttribute('data-speed') || 15) * 60 : 0);
      }
      $$('[data-item]', calc).forEach(function (it) {
        var q = it.tagName === 'INPUT' ? (it.checked ? 1 : 0) : (+($('[data-q-out]', it) || {}).textContent || 0);
        if (!q) return;
        any = true;
        var pr = num(it.getAttribute('data-price'));
        lines.push({ label: it.getAttribute('data-label') + (it.tagName === 'INPUT' ? '' : ' × ' + q), price: pr === null ? null : pr * q });
        mins += (+it.getAttribute('data-mins') || 0) * q;
      });
      lines.forEach(function (l) { if (l.price === null) unknown++; else sum += l.price; });

      linesEl.innerHTML = lines.map(function (l) {
        return '<li><span>' + l.label + '</span><span>' + (l.price === null ? PH + ' грн' : fmt(l.price) + ' грн') + '</span></li>';
      }).join('');
      var html;
      if (!any) html = '—';
      else if (unknown) html = 'від ' + PH + ' грн';
      else html = 'від ' + fmt(sum) + ' грн';
      totalEl.innerHTML = html;
      if (noteEl) {
        if (!any) noteEl.textContent = calc.getAttribute('data-empty') || 'Оберіть хоча б одну позицію — і калькулятор порахує вартість.';
        else noteEl.textContent = unknown ? noteDefault : (calc.getAttribute('data-final') || 'Остаточну ціну підтвердимо після фото або огляду — і вона вже не зміниться.');
      }
      if (timeEl) {
        if (kind && area) {
          var crew = a <= 70 ? 2 : a <= 150 ? 3 : 4;
          var h = Math.max(2, Math.ceil(mins / 60 / crew * 2) / 2);
          timeTxt.textContent = 'Бригада: ' + crew + ' працівники · орієнтовно ' + String(h).replace('.', ',') + ' год роботи';
          timeEl.hidden = false;
        } else timeEl.hidden = true;
      }
      calcSummary = any ? lines.map(function (l) { return '— ' + l.label + (l.price === null ? '' : ': ' + fmt(l.price) + ' грн'); }).join('\n') +
        (unknown || !any ? '' : '\nРазом: від ' + fmt(sum) + ' грн') : '';
      if (ticket && !reduce && lastTotal && lastTotal !== html + lines.length) {
        ticket.classList.remove('is-pop'); void ticket.offsetWidth; ticket.classList.add('is-pop');
      }
      lastTotal = html + lines.length;
    }
    update();

    var orderBtn = $('[data-calc-order]', calc);
    if (orderBtn) orderBtn.addEventListener('click', function () {
      var msg = $('#f-msg');
      if (msg && calcSummary) msg.value = 'Мій розрахунок:\n' + calcSummary + (msg.value && msg.value.indexOf('Мій розрахунок:') !== 0 ? '\n\n' + msg.value : '');
      var kind = $('input[name="kind"]:checked', calc), sel = $('#f-service');
      if (kind && sel) $$('option', sel).forEach(function (o) { if (o.textContent.indexOf(kind.value) === 0) sel.value = o.value || o.textContent; });
    });
  }

  /* ---------- сітка каналів зв'язку ---------- */
  $$('.channels').forEach(function (c) { c.classList.add('n' + c.children.length); });

  /* ---------- вкладки (кімнати / речі) ---------- */
  $$('[data-tabs]').forEach(function (box) {
    var tabs = $$('[role="tab"]', box);
    function sel(t, focus) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        var p = d.getElementById(x.getAttribute('aria-controls'));
        if (p) { p.hidden = !on; if (on) { p.classList.remove('is-in'); void p.offsetWidth; p.classList.add('is-in'); } }
      });
      if (focus) t.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { sel(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, j = null;
        if (k === 'ArrowRight') j = (i + 1) % tabs.length;
        if (k === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        if (k === 'Home') j = 0;
        if (k === 'End') j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); sel(tabs[j], true); }
      });
    });
  });

  /* ---------- до / після ---------- */
  $$('[data-ba]').forEach(function (ba) {
    var r = $('.ba__range', ba);
    if (!r) return;
    var set = function () { ba.style.setProperty('--x', r.value + '%'); };
    r.addEventListener('input', set); set();
  });

  /* ---------- графік і статус «відчинено» (Київ) ---------- */
  var DAYS_ACC = ['в неділю', 'в понеділок', 'у вівторок', 'в середу', 'в четвер', "у п'ятницю", 'в суботу'];
  var list = $('[data-hours-list]');
  var statusEl = $('[data-status]');
  if (list) {
    var sched = {};
    $$('li[data-day]', list).forEach(function (li) {
      var h = li.getAttribute('data-hours') || '';
      var m = h.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
      sched[li.getAttribute('data-day')] = m ? [(+m[1]) * 60 + (+m[2]), (+m[3]) * 60 + (+m[4]), m[1].padStart(2, '0') + ':' + m[2], m[3].padStart(2, '0') + ':' + m[4]] : null;
    });
    var now = kyivNow();
    var today = $('li[data-day="' + now.day + '"]', list);
    if (today) today.classList.add('is-today');
    if (statusEl) {
      var t = sched[now.day], txt, open = false;
      if (t && now.min >= t[0] && now.min < t[1]) { open = true; txt = 'Зараз відчинено · до ' + t[3]; }
      else {
        var when = null;
        if (t && now.min < t[0]) when = 'сьогодні о ' + t[2];
        else {
          for (var i = 1; i <= 7; i++) {
            var dd = (now.day + i) % 7, s = sched[dd];
            if (s) { when = (i === 1 ? 'завтра' : DAYS_ACC[dd]) + ' о ' + s[2]; break; }
          }
        }
        txt = 'Зараз зачинено' + (when ? ' · відчинимо ' + when : '');
      }
      $('[data-status-text]', statusEl).textContent = txt;
      statusEl.classList.add(open ? 'is-open' : 'is-closed');
      statusEl.hidden = false;
    }
  }
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: map[o.weekday], min: (+o.hour % 24) * 60 + (+o.minute) };
    } catch (e) { var n = new Date(); return { day: n.getDay(), min: n.getHours() * 60 + n.getMinutes() }; }
  }

  /* ---------- форма заявки ---------- */
  var form = $('[data-form]');
  if (form) {
    var done = $('[data-done]', form), doneText = $('[data-done-text]', form);
    var doneDefault = doneText ? doneText.textContent : '';
    var dateIn = $('#f-date', form);
    if (dateIn) { var td = new Date(); dateIn.min = td.getFullYear() + '-' + String(td.getMonth() + 1).padStart(2, '0') + '-' + String(td.getDate()).padStart(2, '0'); }
    function bad(input, isBad) { input.closest('.f').classList.toggle('is-bad', isBad); input.setAttribute('aria-invalid', String(isBad)); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim(), phone = form.phone.value.trim();
      var okName = name.length >= 2, okPhone = phone.replace(/\D/g, '').length >= 10;
      bad(form.name, !okName); bad(form.phone, !okPhone);
      if (!okName) { form.name.focus(); return; }
      if (!okPhone) { form.phone.focus(); return; }
      var subj = (form.subject && form.subject.value) || 'Заявка';
      var g = function (n) { var el = form.elements[n]; return el && el.value ? el.value.trim() : ''; };
      var rows = [subj + ' — ' + d.title.split('|').pop().trim(), '', "Ім'я: " + name, 'Телефон: ' + phone];
      if (g('service')) rows.push('Послуга: ' + g('service'));
      if (g('date')) rows.push('Бажана дата: ' + g('date').split('-').reverse().join('.'));
      if (g('where')) rows.push((form.elements.where.closest('.f').querySelector('label').textContent) + ': ' + g('where'));
      if (g('msg')) rows.push('', g('msg'));
      var text = rows.join('\n');
      var via = $('input[name="via"]:checked', form) || $('input[name="via"]', form);
      var kind = via ? via.value : '', href = via ? via.getAttribute('data-href') : '';
      var enc = encodeURIComponent(text), url = '', copied = false;
      var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (kind === 'sms') url = href + (ios ? '&' : '?') + 'body=' + enc;
      else if (kind === 'email') url = href + '?subject=' + encodeURIComponent(subj) + '&body=' + enc;
      else if (kind === 'whatsapp') url = href + '?text=' + enc;
      else if (href) { url = href; copied = true; }
      else copied = true;
      if (copied) copyText(text);
      if (doneText) doneText.textContent = copied
        ? 'Текст заявки скопійовано. ' + (url ? 'У чаті, що відкрився, вставте його й надішліть' : 'Надішліть його нам зручним способом') + ' — ми зв\'яжемося, щоб погодити деталі.'
        : doneDefault;
      if (url) {
        if (/^https?:/.test(url)) window.open(url, '_blank', 'noopener');
        else window.location.href = url;
      }
      done.hidden = false; done.focus();
    });
    $$('input', form).forEach(function (i) { i.addEventListener('input', function () { if (i.closest('.f').classList.contains('is-bad')) bad(i, false); }); });
    var again = $('[data-again]', form);
    if (again) again.addEventListener('click', function () { done.hidden = true; form.reset(); form.name.focus(); });
  }
  function copyText(t) {
    try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(t).catch(fallback); return; } } catch (e) { }
    fallback();
    function fallback() {
      var ta = d.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      d.body.appendChild(ta); ta.select(); try { d.execCommand('copy'); } catch (e) { } d.body.removeChild(ta);
    }
  }

  /* ---------- поява блоків ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var els = $$('.sec-head, .srv__card, .rooms, .ba, .step-card, .about__photo, .about__copy, .rev, .faq__list, .form, .hours, .cont__map, .calc__controls, .ticket');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) return;
      el.classList.add('rv'); io.observe(el);
    });
  }
})();
