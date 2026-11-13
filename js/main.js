(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  function closeNav() {
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Відкрити меню');
  }
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
  });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeNav(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });

  /* ---------- Date in hero, like a school notebook ---------- */
  var kyivNow = function () {
    var p = {};
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    } catch (err) { var d = new Date(); return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() }; }
    var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: days[p.weekday], min: parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10) };
  };
  var today = document.getElementById('today');
  try {
    var ds = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'long' }).format(new Date());
    today.textContent = ds + ' · класна робота';
  } catch (err) { /* keep default */ }
  var yearNow = document.getElementById('yearNow');
  if (yearNow) yearNow.textContent = String(new Date().getFullYear());

  /* ---------- Reveal + highlighter ---------- */
  var watch = document.querySelectorAll('.reveal, mark.hl');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add(en.target.tagName === 'MARK' ? 'on' : 'in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    watch.forEach(function (el) { io.observe(el); });
  } else {
    watch.forEach(function (el) { el.classList.add(el.tagName === 'MARK' ? 'on' : 'in'); });
  }

  /* ---------- Level test ---------- */
  var quiz = document.getElementById('quizForm');
  var qs = Array.prototype.slice.call(quiz.querySelectorAll('.q'));
  var dots = document.querySelectorAll('#testDots li');
  var prev = document.getElementById('qPrev');
  var next = document.getElementById('qNext');
  var count = document.getElementById('qCount');
  var result = document.getElementById('result');
  var cur = 0;
  var LEVELS = [
    { lv: 'A1', name: 'Beginner', group: 'Англійська A1 · пн / ср, 16:00 (діти) або індивідуально', text: 'Ви на старті — і це найкращий момент, щоб поставити правильну вимову й базу без помилок, що потім «в’їдаються».' },
    { lv: 'A1+', name: 'Elementary', group: 'Англійська A2 · пн / ср, 18:30', text: 'Базу ви вже маєте. У групі A2 швидко систематизуєте граматику і почнете вільніше говорити про себе й побут.' },
    { lv: 'A2', name: 'Pre-Intermediate', group: 'Англійська A2 · пн / ср, 18:30', text: 'Ви розумієте прості тексти й розмови. Наступний крок — говорити впевнено і без довгих пауз.' },
    { lv: 'B1', name: 'Intermediate', group: 'Англійська B1 · вт / чт, 18:30', text: 'Ви вже можете спілкуватися на більшість тем. Зараз головне — розширити словник і прибрати типові помилки.' },
    { lv: 'B2', name: 'Upper-Intermediate', group: 'Англійська B2 · пт, 17:00 або розмовний клуб', text: 'Сильний рівень: можна готуватися до IELTS чи співбесід англійською і працювати над природністю мовлення.' },
    { lv: 'C1', name: 'Advanced', group: 'Англійська C1 · сб, 10:00 (міні-група)', text: 'Чудовий результат. Пропонуємо міні-групу C1 або індивідуальну програму під вашу професійну мету.' }
  ];

  function show(i) {
    cur = i;
    qs.forEach(function (q, k) { q.classList.toggle('is-active', k === i); });
    dots.forEach(function (d, k) {
      d.classList.toggle('cur', k === i);
      d.classList.toggle('done', !!quiz.querySelector('input[name="q' + (k + 1) + '"]:checked'));
    });
    prev.disabled = i === 0;
    next.disabled = !quiz.querySelector('input[name="q' + (i + 1) + '"]:checked');
    next.textContent = i === qs.length - 1 ? 'Результат' : 'Далі';
    count.textContent = (i + 1) + ' / ' + qs.length;
  }

  function finish() {
    var score = 0;
    qs.forEach(function (q, k) {
      var c = quiz.querySelector('input[name="q' + (k + 1) + '"]:checked');
      if (c && c.value === q.getAttribute('data-answer')) score++;
    });
    var r = LEVELS[score];
    document.getElementById('rLevel').textContent = r.lv;
    document.getElementById('rName').textContent = r.name;
    document.getElementById('rText').textContent = r.text;
    document.getElementById('rGroup').textContent = r.group;
    quiz.hidden = true;
    result.hidden = false;
    dots.forEach(function (d) { d.classList.remove('cur'); d.classList.add('done'); });
    requestAnimationFrame(function () { requestAnimationFrame(function () { result.classList.add('show'); }); });
    result.dataset.level = r.lv.replace('+', '');
    result.dataset.group = r.group;
  }

  quiz.addEventListener('change', function (e) {
    if (e.target.type !== 'radio') return;
    next.disabled = false;
    dots[cur].classList.add('done');
    var at = cur;
    setTimeout(function () {
      if (at !== cur) return;
      if (cur < qs.length - 1) show(cur + 1); else finish();
    }, reduce ? 0 : 420);
  });
  next.addEventListener('click', function () { if (cur < qs.length - 1) show(cur + 1); else finish(); });
  prev.addEventListener('click', function () { if (cur > 0) show(cur - 1); });
  document.getElementById('qRetry').addEventListener('click', function () {
    quiz.reset();
    result.classList.remove('show');
    result.hidden = true;
    quiz.hidden = false;
    show(0);
  });
  document.getElementById('rBook').addEventListener('click', function () {
    setSelect('fLang', 'Англійська');
    var lv = result.dataset.level || '';
    var lvSel = document.getElementById('fLevel');
    Array.prototype.forEach.call(lvSel.options, function (o) { if (o.text.indexOf(lv) === 0) lvSel.value = o.value; });
    var msg = document.getElementById('fMsg');
    msg.value = 'Тест на сайті: рівень ' + (result.dataset.level || '') + '. Цікавить група: ' + (result.dataset.group || '');
  });
  function setSelect(id, text) {
    var s = document.getElementById(id);
    Array.prototype.forEach.call(s.options, function (o) { if (o.text === text) s.value = o.value; });
  }
  show(0);

  /* ---------- Schedule filter ---------- */
  var chips = document.querySelectorAll('.chip');
  var slots = document.querySelectorAll('#week .slot');
  var empty = document.getElementById('weekEmpty');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var f = c.getAttribute('data-f');
      chips.forEach(function (x) { var on = x === c; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var shown = 0;
      slots.forEach(function (s) {
        var ok = f === 'all' || (' ' + s.getAttribute('data-l') + ' ').indexOf(' ' + f + ' ') > -1;
        s.classList.toggle('is-dim', !ok);
        if (ok) shown++;
      });
      empty.hidden = shown > 0;
    });
  });

  /* ---------- Opening hours (Kyiv time) ---------- */
  var rows = document.querySelectorAll('#hoursTable tr');
  var st = document.getElementById('openStatus');
  var stText = document.getElementById('openText');
  function toMin(t) { if (!t) return null; var a = t.split(':'); return +a[0] * 60 + +a[1]; }
  function updateHours() {
    var now = kyivNow(), open = false, closeAt = null;
    rows.forEach(function (r) {
      var days = r.getAttribute('data-days').split(',').map(Number);
      var isToday = days.indexOf(now.day) > -1;
      r.classList.toggle('today', isToday);
      if (!isToday) return;
      var o = toMin(r.getAttribute('data-open')), c = toMin(r.getAttribute('data-close'));
      if (o !== null && c !== null && now.min >= o && now.min < c) { open = true; closeAt = r.getAttribute('data-close'); }
    });
    st.setAttribute('data-state', open ? 'open' : 'closed');
    stText.textContent = open ? 'Зараз відчинено · до ' + closeAt : 'Зараз зачинено · залиште заявку';
  }
  updateHours();
  setInterval(updateHours, 60000);

  /* ---------- Lead form ---------- */
  var form = document.getElementById('leadForm');
  var ok = document.getElementById('formOk');
  var okMsg = document.getElementById('formOkMsg');
  var TG = 'https://t.me/username';
  var VIBER_NUM = '%2B380000000000';
  var MAIL = 'hello@example.com';

  function setBad(id, bad) {
    var f = document.getElementById(id).closest('.field');
    f.classList.toggle('bad', bad);
    document.getElementById(id).setAttribute('aria-invalid', bad ? 'true' : 'false');
  }
  function validName(v) { return v.trim().length >= 2; }
  function validPhone(v) { var d = v.replace(/\D/g, ''); return /^(380\d{9}|0\d{9})$/.test(d); }

  ['fName', 'fPhone'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () {
      var el = document.getElementById(id);
      if (el.closest('.field').classList.contains('bad')) setBad(id, id === 'fName' ? !validName(el.value) : !validPhone(el.value));
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('fName').value;
    var phone = document.getElementById('fPhone').value;
    var nBad = !validName(name), pBad = !validPhone(phone);
    setBad('fName', nBad); setBad('fPhone', pBad);
    if (nBad || pBad) { document.getElementById(nBad ? 'fName' : 'fPhone').focus(); return; }

    var v = function (id) { return document.getElementById(id).value.trim(); };
    var lines = [
      'Заявка на пробне заняття',
      'Ім’я: ' + name.trim(),
      'Телефон: ' + phone.trim(),
      'Мова: ' + v('fLang') + ', рівень: ' + v('fLevel'),
      'Для кого: ' + v('fWho') + ', формат: ' + v('fFormat')
    ];
    if (v('fMsg')) lines.push('Коментар: ' + v('fMsg'));
    var text = lines.join('\n');
    var ch = (form.querySelector('input[name="ch"]:checked') || {}).value || 'tg';
    var url;
    if (ch === 'viber') url = 'viber://chat?number=' + VIBER_NUM + '&draft=' + encodeURIComponent(text);
    else if (ch === 'mail') url = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Запис на пробне заняття') + '&body=' + encodeURIComponent(text);
    else url = TG + '?text=' + encodeURIComponent(text);

    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {});
    if (ch === 'tg') { var w = window.open(url, '_blank', 'noopener'); if (!w) window.location.href = url; }
    else window.location.href = url;

    okMsg.textContent = text;
    form.hidden = true;
    ok.hidden = false;
    ok.focus();
  });
  document.getElementById('formAgain').addEventListener('click', function () {
    form.reset();
    ok.hidden = true;
    form.hidden = false;
    document.getElementById('fName').focus();
  });
})();
