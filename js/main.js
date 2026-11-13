/* СТО — універсальний шаблон. Без бібліотек. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  /* ==== Контакти (змініть ці рядки при адаптації — вони ж стоять у HTML) ==== */
  var CONTACT = {
    telegram: '',
    viber: '',
    mail: "",
    sms: "sms:+380669201567",
    insta: ""
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- меню ---------- */
  var burger = $('.burger'), nav = $('#nav');
  function closeNav() { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Відкрити меню'); }
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
  }

  /* ---------- поява при скролі ---------- */
  var hero = $('.hero');
  requestAnimationFrame(function () { setTimeout(function () { hero && hero.classList.add('is-ready'); }, 250); });
  var revealEls = $$('.sec__head, .pgroup, .steps li, .rev, .gal__grid figure, .rules div, .ticket, .car, .formbox, .hours, .faq details');
  if ('IntersectionObserver' in window && !reduce) {
    revealEls.forEach(function (el) { el.classList.add('rv'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- графік роботи (час Києва) ---------- */
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: days[o.weekday], min: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
    } catch (e) {
      var d = new Date(); return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function toMin(t) { var a = t.split(':'); return +a[0] * 60 + +a[1]; }
  var hoursBox = $('#hours');
  function updateStatus() {
    if (!hoursBox) return;
    var sched; try { sched = JSON.parse(hoursBox.getAttribute('data-schedule')); } catch (e) { return; }
    if (!sched) return;
    var now = kyivNow(), today = sched[String(now.day)], open = false, text;
    if (today && now.min >= toMin(today[0]) && now.min < toMin(today[1])) {
      open = true; text = 'Зараз відчинено · до ' + today[1];
    } else {
      // шукаємо найближче відкриття
      for (var i = 0; i < 8; i++) {
        var d = (now.day + i) % 7, s = sched[String(d)];
        if (!s) continue;
        if (i === 0 && now.min >= toMin(s[0])) continue;
        var names = ['у неділю', 'у понеділок', 'у вівторок', 'у середу', 'у четвер', 'у пʼятницю', 'у суботу'];
        text = 'Зачинено · відчинимо ' + (i === 0 ? 'сьогодні' : i === 1 ? 'завтра' : names[d]) + ' о ' + s[0];
        break;
      }
      text = text || 'Зачинено';
    }
    $$('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open', open); el.classList.toggle('is-closed', !open);
      var t = $('[data-status-text]', el); if (t) t.textContent = el.classList.contains('status--big') ? text : (open ? 'Відчинено' : 'Зачинено');
    });
    $$('.hours__table [data-day]').forEach(function (r) { r.classList.toggle('is-today', +r.getAttribute('data-day') === now.day); });
  }
  updateStatus(); setInterval(updateStatus, 60000);

  /* ---------- калькулятор-кошторис ---------- */
  var SYS = { engine: 'Двигун і ТО', brakes: 'Гальма', susp: 'Ходова і підвіска', elec: 'Діагностика й електрика', tires: 'Шини й колеса', ac: 'Кондиціонер', exhaust: 'Вихлоп' };
  var CODE = { engine: 'ДВ', brakes: 'ГМ', susp: 'ХД', elec: 'ЕЛ', tires: 'ШН', ac: 'КД', exhaust: 'ВХ' };
  var worksBox = $('#works');
  var works = [];
  // Джерело даних — прейскурант на сторінці: змініть ціну там, і калькулятор підхопить її.
  $$('.pgroup li').forEach(function (li) {
    var sys = li.getAttribute('data-sys') || li.closest('.pgroup').getAttribute('data-sys');
    var prEl = $('.pr', li);
    var num = parseInt(prEl.textContent.replace(/[^\d]/g, ''), 10);
    works.push({
      code: li.getAttribute('data-code'), sys: sys, name: $('.nm', li).textContent,
      price: isNaN(num) ? null : num, time: parseFloat(li.getAttribute('data-time')) || 0
    });
  });

  var fmt = function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  var fmtH = function (h) { return (Math.round(h * 10) / 10).toString().replace('.', ',') + ' год'; };
  var PH_PRICE = 'від <span class="ph">[ЦІНА]</span> грн';

  if (worksBox && works.length) {
    var html = '';
    Object.keys(SYS).forEach(function (sys) {
      var list = works.filter(function (w) { return w.sys === sys; });
      if (!list.length) return;
      html += '<div class="wgroup" data-sys="' + sys + '"><h4><b>' + CODE[sys] + '</b>' + SYS[sys] + '</h4>';
      list.forEach(function (w) {
        var id = 'w-' + w.code;
        html += '<label class="wrow" for="' + id + '"><input type="checkbox" id="' + id + '" value="' + w.code + '">' +
          '<span class="box"><svg class="ic"><use href="#i-check"/></svg></span>' +
          '<span class="nm">' + w.name + '<small>' + w.code + ' · ≈ ' + fmtH(w.time) + '</small></span>' +
          '<span class="pr">' + (w.price === null ? PH_PRICE : 'від ' + fmt(w.price) + ' грн') + '</span></label>';
      });
      html += '</div>';
    });
    worksBox.innerHTML = html;
  }

  var tLines = $('[data-t-lines]'), tCount = $('[data-t-count]'), tTime = $('[data-t-time]'),
      tTotal = $('[data-t-total]'), tClass = $('[data-t-class]'), tBook = $('[data-t-book]'), tClear = $('[data-t-clear]');
  var lastTotal = '';

  var peek = $('[data-peek]'), peekCountEl = $('[data-peek-count]'), peekTotalEl = $('[data-peek-total]'), peekCount = 0, calcVisible = false, ticketVisible = false;
  function plural(n) { var m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? 'робота' : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'роботи' : 'робіт'); }
  function updatePeek() { if (peek) peek.hidden = !(peekCount > 0 && calcVisible && !ticketVisible); }
  if (peek && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { calcVisible = en[0].isIntersecting; updatePeek(); }).observe($('#koshtorys'));
    new IntersectionObserver(function (en) { ticketVisible = en[0].isIntersecting; updatePeek(); }, { threshold: 0.35 }).observe($('.ticket'));
    peek.addEventListener('click', function () { $('.ticket').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); });
  }
  function currentClass() {
    var r = $('input[name="carclass"]:checked');
    return { k: r ? parseFloat(r.value) : 1, name: r ? r.getAttribute('data-name') : 'Легковий' };
  }
  function selected() {
    return $$('#works input:checked').map(function (i) {
      return works.filter(function (w) { return w.code === i.value; })[0];
    });
  }
  function renderTicket() {
    if (!tLines) return;
    var c = currentClass(), sel = selected();
    tClass.textContent = c.name + ' · ×' + c.k.toFixed(1).replace('.', ',');
    if (!sel.length) {
      tLines.innerHTML = '<li class="ticket__empty">Ще нічого не обрано. Позначте роботи у списку.</li>';
    } else {
      tLines.innerHTML = sel.map(function (w) {
        return '<li><span class="c">' + w.code + '</span><span>' + w.name + '</span><span class="p">' +
          (w.price === null ? '<span class="ph">[ЦІНА]</span>' : fmt(w.price * c.k)) + '</span></li>';
      }).join('');
    }
    var sum = 0, unknown = 0, time = 0;
    sel.forEach(function (w) { time += w.time; if (w.price === null) unknown++; else sum += w.price * c.k; });
    tCount.textContent = sel.length;
    tTime.textContent = sel.length ? '≈ ' + fmtH(time) : '—';
    var totalHtml;
    if (!sel.length) totalHtml = '—';
    else if (unknown === sel.length) totalHtml = PH_PRICE;
    else totalHtml = 'від ' + fmt(sum) + ' грн' + (unknown ? '<small style="display:block;font:400 13px var(--f-text);color:var(--mute-l)">+ ' + unknown + ' поз. за домовленістю</small>' : '');
    tTotal.innerHTML = totalHtml;
    if (totalHtml !== lastTotal && !reduce) { tTotal.classList.remove('bump'); void tTotal.offsetWidth; tTotal.classList.add('bump'); }
    lastTotal = totalHtml;
    tBook.disabled = !sel.length;
    peekCount = sel.length; if (peekCountEl) { peekCountEl.textContent = sel.length + ' ' + plural(sel.length); peekTotalEl.innerHTML = totalHtml.replace(/<small.*$/, ''); } updatePeek();
    // позначки на схемі та чіпах
    var bySys = {};
    sel.forEach(function (w) { bySys[w.sys] = (bySys[w.sys] || 0) + 1; });
    $$('.hs').forEach(function (h) { h.classList.toggle('has-sel', !!bySys[h.getAttribute('data-sys')]); });
    $$('.chip').forEach(function (ch) {
      var s = ch.getAttribute('data-sys'), sup = $('sup', ch);
      if (sup) sup.remove();
      if (bySys[s]) { var el = document.createElement('sup'); el.textContent = bySys[s]; ch.appendChild(el); }
    });
  }

  function filterSys(sys) {
    $$('.wgroup').forEach(function (g) { g.hidden = !(sys === 'all' || g.getAttribute('data-sys') === sys); });
    $$('.chip').forEach(function (c) { c.classList.toggle('is-on', c.getAttribute('data-sys') === sys); });
    $$('.hs').forEach(function (h) { h.classList.toggle('is-on', h.getAttribute('data-sys') === sys); });
    var chip = $('.chip[data-sys="' + sys + '"]'), row = chip && chip.parentNode;
    if (chip && row.scrollWidth > row.clientWidth) {
      var left = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
      try { row.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' }); } catch (e) { row.scrollLeft = left; }
    }
  }
  $$('.chip').forEach(function (c) { c.addEventListener('click', function () { filterSys(c.getAttribute('data-sys')); }); });
  $$('.hs').forEach(function (h) {
    var go = function () {
      var s = h.getAttribute('data-sys');
      filterSys(h.classList.contains('is-on') ? 'all' : s);
    };
    h.addEventListener('click', go);
    h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  if (worksBox) worksBox.addEventListener('change', renderTicket);
  $$('input[name="carclass"]').forEach(function (r) { r.addEventListener('change', renderTicket); });
  if (tClear) tClear.addEventListener('click', function () { $$('#works input:checked').forEach(function (i) { i.checked = false; }); renderTicket(); });
  filterSys('engine');
  renderTicket();

  /* ---------- форма ---------- */
  var form = $('#form'), ok = $('#form-ok'), msg = $('#f-msg');
  if (tBook) tBook.addEventListener('click', function () {
    var c = currentClass(), sel = selected();
    var lines = sel.map(function (w) { return '— ' + w.code + ' ' + w.name; });
    var txt = 'Попередній наряд (' + c.name + '):\n' + lines.join('\n');
    var tot = tTotal.textContent.replace(/\s+/g, ' ').trim();
    if (tot && tot !== '—') txt += '\nОрієнтовно: ' + tot;
    if (msg) msg.value = txt;
    var target = $('#zapys');
    if (target) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setTimeout(function () { var n = $('#f-name'); if (n) n.focus({ preventScroll: true }); }, reduce ? 0 : 600);
  });

  function setBad(input, bad) { input.closest('.f').classList.toggle('is-bad', bad); input.setAttribute('aria-invalid', bad ? 'true' : 'false'); }
  function validate() {
    var name = $('#f-name'), phone = $('#f-phone'), good = true;
    var nOk = name.value.trim().length >= 2; setBad(name, !nOk); good = good && nOk;
    var digits = phone.value.replace(/\D/g, ''); var pOk = digits.length >= 10 && digits.length <= 12; setBad(phone, !pOk); good = good && pOk;
    if (!good) { var first = $('.f.is-bad input', form); if (first) first.focus(); }
    return good;
  }
  if (form) {
    ['#f-name', '#f-phone'].forEach(function (s) {
      var el = $(s); el.addEventListener('input', function () { if (el.closest('.f').classList.contains('is-bad')) validate(); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;
      var v = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ''; };
      var text = 'Заявка на СТО з сайту — ' + "\u0410\u0432\u0442\u043e\u0441\u0435\u0440\u0432\u0456\u0441" + '\n' +
        'Ім’я: ' + v('name') + '\nТелефон: ' + v('phone') +
        (v('car') ? '\nАвто: ' + v('car') : '') +
        (v('date') ? '\nДата: ' + v('date').split('-').reverse().join('.') : '') +
        (v('time') ? '\nЧас: ' + v('time') : '') +
        (v('msg') ? '\n\n' + v('msg') : '');
      var via = (form.querySelector('input[name="via"]:checked') || form.querySelector('input[type="hidden"][name="via"]') || {}).value || 'tg';
      var url, note;
      if (via === 'viber') {
        url = CONTACT.viber + '&draft=' + encodeURIComponent(text);
        note = 'Ми відкрили Viber з текстом заявки — натисніть «Надіслати», і майстер передзвонить.';
      } else if (via === 'sms') {
        url = CONTACT.sms + '?&body=' + encodeURIComponent(text);
        note = 'Ми відкрили SMS з текстом заявки — надішліть його, і майстер передзвонить.';
      } else if (via === 'ig') {
        url = CONTACT.insta;
        note = 'Текст заявки скопійовано. Ми відкрили Instagram — вставте текст у Direct і надішліть.';
        try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (err) {}
      } else if (via === 'mail') {
        url = CONTACT.mail + '?subject=' + encodeURIComponent('Запис на СТО — ' + v('name')) + '&body=' + encodeURIComponent(text);
        note = 'Ми відкрили поштову програму з листом — надішліть його, і ми відповімо найближчим часом.';
      } else {
        url = CONTACT.telegram + '?text=' + encodeURIComponent(text);
        note = 'Текст заявки скопійовано. Ми відкрили Telegram — вставте текст у чат і надішліть.';
        try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (err) {}
      }
      if (via === 'tg' || via === 'ig') window.open(url, '_blank', 'noopener'); else window.location.href = url;
      $('[data-ok-text]', ok).textContent = note;
      form.hidden = true; ok.hidden = false; ok.focus();
    });
    $('[data-ok-back]', ok).addEventListener('click', function () { form.reset(); ok.hidden = true; form.hidden = false; $('#f-name').focus(); });
  }

  /* мінімальна дата — сьогодні */
  var date = $('#f-date');
  if (date) { var d = new Date(); date.min = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
})();
