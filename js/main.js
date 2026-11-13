(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PHOTO = 'https://raw.githubusercontent.com/furtex-xq/furtex-xq.github.io/6486b85e3906637b496edbee4a318d03b54e6ca4/img/photos/';

  /* ---------- Barber pole + header progress ---------- */
  var poleEls = [document.querySelector('.pole'), document.querySelector('.top__progress')];
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var max = root.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      poleEls.forEach(function (el) {
        if (!el) return;
        el.style.setProperty('--p', p.toFixed(4));
        // stripes travel with scroll → the pole "rotates"
        if (!reduce) el.style.setProperty('--s', (window.scrollY * 0.35).toFixed(1) + 'px');
      });
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  function closeMenu() {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Відкрити меню');
    document.body.style.overflow = '';
  }
  burger.addEventListener('click', function () {
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Reveal on scroll ---------- */
  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Lookbook ---------- */
  var LOOKS = [
    { name: 'Фейд', img: 'look-fade', alt: 'Стрижка фейд — плавний перехід над вухом, контур бритвою',
      desc: 'Плавний перехід від шкіри до потрібної довжини без жодної сходинки. Low, mid чи high — підбираємо під форму голови й лінію росту волосся.',
      who: 'Тим, хто хоче виглядати акуратно щодня без зусиль', care: '2 хвилини, матова паста', when: 'кожні 2–3 тижні' },
    { name: 'Кроп', img: 'look-crop', alt: 'Коротка текстурна стрижка кроп',
      desc: 'Коротка текстурна верхівка, чубчик уперед і чітка лінія над чолом. Майже не потребує укладки й добре ховає високий лоб.',
      who: 'Густому волоссю та тим, хто не любить фен', care: 'пальцями, трохи глини', when: 'кожні 3 тижні' },
    { name: 'Андеркат', img: 'look-undercut', alt: 'Андеркат — довгий зачесаний верх і коротко зняті боки з малюнком',
      desc: 'Довгий верх і коротко зняті скроні та потилиця — з різким контрастом або з плавним фейдом. Верх зачісуємо назад, на бік або залишаємо вільним.',
      who: 'Прямому чи хвилястому волоссю від 8 см на маківці', care: '5 хвилин, фен і помада', when: 'боки — кожні 3 тижні' },
    { name: 'Помпадур', img: 'look-pompadour', alt: 'Обʼємна укладка над чолом і коротко зняті скроні',
      desc: "Об'єм над чолом, зачесаний назад, і короткі боки. Класика 50-х, яка тримає форму цілий день і робить силует вищим.",
      who: 'Тим, хто готовий до щоденної укладки', care: 'фен, гребінець, помада з блиском', when: 'кожні 4 тижні' },
    { name: 'Класика', img: 'look-classic', alt: 'Барбер формує класичну стрижку ножицями й гребінцем',
      desc: 'Пробор, боки ножицями, м’яка лінія на потилиці. Джентльменський силует, який однаково доречний з костюмом і зі светром.',
      who: 'Офісу, переговорам і весіллям', care: '3 хвилини, крем або легка помада', when: 'кожні 4–6 тижнів' },
    { name: 'Борода', img: 'look-beard', alt: 'Барбер моделює бороду ножицями',
      desc: 'Форма під овал обличчя: від короткої щетини до повної бороди. Чіткий контур на щоках і шиї, симетрія та олія для м’якості.',
      who: 'Усім, хто відпускає бороду й хоче, щоб вона виглядала задумано', care: 'олія та щітка щоранку', when: 'кожні 2–3 тижні' }
  ];
  var tabs = document.querySelectorAll('.looks__names button');
  var img = document.querySelector('[data-look-img]');
  var fields = {
    title: document.querySelector('[data-look-title]'), desc: document.querySelector('[data-look-desc]'),
    who: document.querySelector('[data-look-who]'), care: document.querySelector('[data-look-care]'),
    when: document.querySelector('[data-look-when]'), no: document.querySelector('[data-look-no]')
  };
  var current = 0;
  // warm the cache so switching feels instant
  LOOKS.forEach(function (l) { var i = new Image(); i.decoding = 'async'; i.src = PHOTO + l.img + '.jpg'; });
  function showLook(i) {
    current = i;
    var l = LOOKS[i];
    tabs.forEach(function (t, k) {
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    fields.title.textContent = l.name;
    fields.desc.textContent = l.desc;
    fields.who.textContent = l.who;
    fields.care.textContent = l.care;
    fields.when.textContent = l.when;
    fields.no.textContent = '№ ' + (i + 1);
    if (reduce) { img.src = PHOTO + l.img + '.jpg'; img.alt = l.alt; return; }
    img.classList.add('is-swap');
    setTimeout(function () {
      img.src = PHOTO + l.img + '.jpg'; img.alt = l.alt;
      img.classList.remove('is-swap');
    }, 220);
  }
  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { if (k !== current) showLook(k); });
    t.addEventListener('keydown', function (e) {
      var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = (current + d + LOOKS.length) % LOOKS.length;
      showLook(n); tabs[n].focus();
    });
  });
  var lookSelect = document.getElementById('f-look');
  document.querySelector('[data-look-book]').addEventListener('click', function () {
    lookSelect.value = LOOKS[current].name;
    var svc = document.getElementById('f-service');
    svc.value = LOOKS[current].name === 'Борода' ? 'Моделювання бороди' : (LOOKS[current].name === 'Фейд' ? 'Фейд / скін-фейд' : 'Чоловіча стрижка');
    document.getElementById('booking').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(function () { document.getElementById('f-date').focus({ preventScroll: true }); }, reduce ? 0 : 700);
  });

  /* ---------- Opening hours: open / closed by Kyiv time ---------- */
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: days[o.weekday], min: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
    } catch (e) { var d = new Date(); return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() }; }
  }
  function toMin(s) { var a = (s || '').split(':'); return a.length === 2 ? (+a[0]) * 60 + (+a[1]) : null; }
  var rows = document.querySelectorAll('#hours tr');
  var DAY_ACC = ['у неділю', 'в понеділок', 'у вівторок', 'у середу', 'у четвер', "у п'ятницю", 'у суботу'];
  function sched(day) {
    for (var i = 0; i < rows.length; i++) if (+rows[i].dataset.day === day) return { o: toMin(rows[i].dataset.open), c: toMin(rows[i].dataset.close), row: rows[i] };
    return { o: null, c: null };
  }
  function updateStatus() {
    var n = kyivNow(), t = sched(n.day), open = t.o !== null && t.c !== null && n.min >= t.o && n.min < t.c, text;
    rows.forEach(function (r) { r.classList.toggle('is-today', +r.dataset.day === n.day); });
    if (open) {
      var left = t.c - n.min;
      text = left <= 60 ? 'Зараз відчинено · зачиняємось о ' + t.row.dataset.close : 'Зараз відчинено до ' + t.row.dataset.close;
    } else {
      var nextText = '';
      if (t.o !== null && n.min < t.o) nextText = 'відчиняємось сьогодні о ' + t.row.dataset.open;
      else {
        for (var k = 1; k <= 7; k++) {
          var nd = (n.day + k) % 7, s = sched(nd);
          if (s.o !== null) { nextText = 'відчиняємось ' + (k === 1 ? 'завтра' : DAY_ACC[nd]) + ' о ' + s.row.dataset.open; break; }
        }
      }
      text = 'Зараз зачинено' + (nextText ? ' · ' + nextText : '');
    }
    document.querySelectorAll('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open', open); el.classList.toggle('is-closed', !open);
      el.querySelector('[data-status-text]').textContent = text;
    });
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- Booking form → messenger ---------- */
  var form = document.getElementById('form');
  var ok = document.getElementById('form-ok');
  var date = document.getElementById('f-date');
  var today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  date.min = today.toISOString().slice(0, 10);

  var TG = 'https://t.me/username';
  var VIBER = 'viber://chat?number=%2B380000000000';
  var MAIL = 'mailto:hello@example.com';

  function setBad(input, bad) { input.closest('.field').classList.toggle('is-bad', bad); input.setAttribute('aria-invalid', String(bad)); }
  function validate() {
    var name = form.name.value.trim(), phone = form.phone.value.replace(/\D/g, ''), okAll = true, first = null;
    var badName = name.length < 2, badPhone = phone.length < 10 || phone.length > 12, badDate = !date.value;
    setBad(form.name, badName); setBad(form.phone, badPhone); setBad(date, badDate);
    [[badName, form.name], [badPhone, form.phone], [badDate, date]].forEach(function (p) { if (p[0]) { okAll = false; if (!first) first = p[1]; } });
    if (first) first.focus();
    return okAll;
  }
  ['input', 'change'].forEach(function (ev) {
    form.addEventListener(ev, function (e) { if (e.target.closest('.field.is-bad')) setBad(e.target, false); });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    var d = date.value.split('-').reverse().join('.');
    var lines = [
      'Добрий день! Хочу записатися.',
      'Послуга: ' + form.service.value,
      form.look.value ? 'Стиль: ' + form.look.value : '',
      'Дата: ' + d + ', ' + form.time.value.toLowerCase(),
      "Ім'я: " + form.name.value.trim(),
      'Телефон: ' + form.phone.value.trim(),
      form.note.value.trim() ? 'Коментар: ' + form.note.value.trim() : ''
    ].filter(Boolean);
    var msg = lines.join('\n');
    var ch = form.channel.value, url;
    if (ch === 'viber') url = VIBER + '&draft=' + encodeURIComponent(msg);
    else if (ch === 'email') url = MAIL + '?subject=' + encodeURIComponent('Запис на стрижку — ' + form.name.value.trim()) + '&body=' + encodeURIComponent(msg);
    else url = TG + '?text=' + encodeURIComponent(msg);
    ok.hidden = false;
    if (ch === 'telegram') window.open(url, '_blank', 'noopener'); else window.location.href = url;
  });

  /* ---------- Year ---------- */
  var y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
