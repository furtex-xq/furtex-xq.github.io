/* Ремонт телефонів — шаблон. Без залежностей. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Налаштування (змініть під клієнта) ---------- */
  var CONTACT = {"ig": "https://www.instagram.com/black.istore/"};
  // Графік: 0 = неділя … 6 = субота; [відкриття, закриття] у годинах (можна 9.5 = 9:30), null = вихідний
  // null = графік невідомий: живий статус і таблиця не показуються
  var HOURS = { 1: [10.0, 19.0], 2: [10.0, 19.0], 3: [10.0, 19.0], 4: [10.0, 19.0], 5: [10.0, 19.0], 6: [10.0, 17.0], 0: null };

  /* ---------- Меню ---------- */
  var burger = $('.burger'), nav = $('#nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Відкрити меню' : 'Закрити меню');
      nav.classList.toggle('is-open', !open);
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () {
        burger.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
      });
    });
  }

  /* ---------- Рік ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Відчинено / зачинено (за київським часом) ---------- */
  var DAYS = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота'];
  function kyivNow() {
    var now = new Date();
    var tz = ['Europe/Kyiv', 'Europe/Kiev'];
    for (var i = 0; i < tz.length; i++) {
      try {
        var parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz[i], weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
        var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
        var wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday];
        return { day: wd, h: parseInt(o.hour, 10) + parseInt(o.minute, 10) / 60 };
      } catch (e) { /* наступний варіант */ }
    }
    return { day: now.getDay(), h: now.getHours() + now.getMinutes() / 60 };
  }
  function fmt(h) { var m = Math.round((h % 1) * 60); return Math.floor(h) + ':' + (m < 10 ? '0' : '') + m; }
  function renderHours() {
    if (!HOURS) {
      $$('[data-status]').forEach(function (el) { el.parentNode.removeChild(el); });
      var ht = $('#hours'); if (ht) ht.parentNode.removeChild(ht);
      return;
    }
    var k = kyivNow(), t = HOURS[k.day], txt, open = false;
    if (t && k.h >= t[0] && k.h < t[1]) { open = true; txt = 'Зараз відчинено · до ' + fmt(t[1]); }
    else if (t && k.h < t[0]) { txt = 'Зачинено · відкриємось о ' + fmt(t[0]); }
    else {
      var n = 1; while (n < 8 && !HOURS[(k.day + n) % 7]) n++;
      var nd = (k.day + n) % 7, nt = HOURS[nd];
      txt = nt ? 'Зачинено · відкриємось ' + (n === 1 ? 'завтра' : DAYS[nd].toLowerCase()) + ' о ' + fmt(nt[0]) : 'Зачинено';
    }
    $$('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open', open); el.classList.toggle('is-closed', !open);
      var s = $('[data-status-text]', el); if (s) s.textContent = txt;
    });
    var tb = $('#hours tbody');
    if (tb) {
      tb.innerHTML = '';
      [1, 2, 3, 4, 5, 6, 0].forEach(function (i) {
        var tr = d.createElement('tr'); if (i === k.day) tr.className = 'is-today';
        var a = d.createElement('td'); a.textContent = DAYS[i];
        var b = d.createElement('td'); b.textContent = HOURS[i] ? fmt(HOURS[i][0]) + '–' + fmt(HOURS[i][1]) : 'вихідний';
        tr.appendChild(a); tr.appendChild(b); tb.appendChild(tr);
      });
    }
  }
  renderHours(); if (HOURS) setInterval(renderHours, 60000);

  /* ---------- Reveal ---------- */
  var reveals = $$('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add('in'); });

  /* ---------- Exploded view ---------- */
  var xray = $('#xray'), layers = $$('.layer'), items = $$('#xray-list li'), mm = $('#xray-mm');
  var mqDesk = window.matchMedia('(min-width: 900px)');
  function setLayers(e, active) {
    var gap = mqDesk.matches ? 56 : 30;
    layers.forEach(function (l, i) {
      var z = ((layers.length - 1 - i) - (layers.length - 1) / 2) * gap * e;
      l.style.transform = 'translateZ(' + z.toFixed(1) + 'px)';
      l.classList.toggle('is-active', i === active);
    });
    items.forEach(function (li, i) { li.classList.toggle('is-active', i === active); });
    if (mm) mm.textContent = (e * 7.8).toFixed(1) + ' мм';
  }
  if (xray && layers.length) {
    if (reduce) { setLayers(1, -1); }
    else {
      root.classList.add('js-x');
      var xTick = false;
      var xUpdate = function () {
        xTick = false;
        var r = xray.getBoundingClientRect(), vh = window.innerHeight, e, active;
        if (mqDesk.matches) {
          var p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
          e = clamp(p * 2.4, 0, 1);
          active = Math.min(items.length - 1, Math.floor(p * items.length * 0.999));
        } else {
          e = clamp((vh * 0.75 - r.top) / (vh * 0.9), 0, 1);
          var line = 64 + 290 + 70; active = 0;
          items.forEach(function (li, i) { if (li.getBoundingClientRect().top < line) active = i; });
        }
        setLayers(e, active);
      };
      var xReq = function () { if (!xTick) { xTick = true; requestAnimationFrame(xUpdate); } };
      window.addEventListener('scroll', xReq, { passive: true });
      window.addEventListener('resize', xReq);
      xUpdate();
    }
  }

  /* ---------- Process trace ---------- */
  var trace = $('#trace');
  if (trace) {
    var nodes = $$('li', trace);
    var tUpdate = function () {
      var r = trace.getBoundingClientRect(), vh = window.innerHeight;
      var desk = window.matchMedia('(min-width: 1000px)').matches;
      var p = reduce ? 1 : clamp((vh * 0.75 - r.top) / (desk ? vh * 0.4 : r.height), 0, 1);
      trace.style.setProperty('--p', p.toFixed(3));
      nodes.forEach(function (li, i) { li.classList.toggle('is-on', p >= (i / (nodes.length - 1)) - 0.001); });
    };
    window.addEventListener('scroll', function () { requestAnimationFrame(tUpdate); }, { passive: true });
    tUpdate();
  }

  /* ---------- Ціни: вкладки ---------- */
  var tabs = $$('[role="tab"]');
  function selectTab(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
      var panel = d.getElementById(x.getAttribute('aria-controls')); if (panel) panel.hidden = !on;
    });
    if (focus) t.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        selectTab(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
      }
    });
  });

  /* ---------- Калькулятор ремонту ---------- */
  // t = орієнтовний час, w = відносна тривалість (1–5) для шкали, part = чи потрібна запчастина
  var PROBLEMS = {
    phone: [
      { n: 'Розбитий екран', t: '40–90 хв', w: 2, part: 1 },
      { n: 'Тріснуло лише скло', t: '1–3 год', w: 3, part: 1 },
      { n: 'Швидко сідає батарея', t: '20–40 хв', w: 1, part: 1 },
      { n: 'Не заряджає', t: '40–60 хв', w: 2, part: 1 },
      { n: 'Потрапила вода', t: '1–2 дні', w: 5, part: 0 },
      { n: 'Не працює камера', t: '30–60 хв', w: 2, part: 1 },
      { n: 'Погано чути', t: '30–60 хв', w: 2, part: 1 },
      { n: 'Тріснула задня кришка', t: '1–2 год', w: 3, part: 1 },
      { n: 'Не вмикається', t: 'від 1 дня', w: 4, part: 0 },
      { n: 'Глючить, зависає', t: '30–90 хв', w: 2, part: -1 }
    ],
    tablet: [
      { n: 'Розбитий тачскрін', t: '1–2 год', w: 3, part: 1 },
      { n: 'Смуги на екрані', t: '1–2 год', w: 3, part: 1 },
      { n: 'Швидко сідає батарея', t: '1–2 год', w: 3, part: 1 },
      { n: 'Не заряджає', t: '~1 год', w: 2, part: 1 },
      { n: 'Потрапила вода', t: '1–3 дні', w: 5, part: 0 },
      { n: 'Зависає на логотипі', t: '1–2 год', w: 3, part: -1 }
    ],
    laptop: [
      { n: 'Гріється й шумить', t: '1–2 год', w: 3, part: -1 },
      { n: 'Розбитий екран', t: '1–2 год', w: 3, part: 1 },
      { n: 'Залили клавіатуру', t: '1–3 дні', w: 5, part: 0 },
      { n: 'Повільно працює', t: '1–2 год', w: 3, part: 0 },
      { n: 'Зламалися петлі', t: '2–4 год', w: 4, part: 1 },
      { n: 'Не вмикається', t: 'від 1 дня', w: 5, part: 0 }
    ],
    gadget: [
      { n: 'Розбите скло годинника', t: '1–2 год', w: 3, part: 1 },
      { n: 'Не тримає батарея', t: '1–2 год', w: 3, part: 1 },
      { n: 'Дрифт стіків джойстика', t: '~1 год', w: 2, part: 1 },
      { n: 'Консоль: немає зображення', t: '1–2 дні', w: 5, part: 1 },
      { n: 'Не заряджається', t: '1–2 год', w: 3, part: 1 }
    ]
  };
  var DEV = { phone: 'Смартфон', tablet: 'Планшет', laptop: 'Ноутбук', gadget: 'Гаджет' };
  var PART = {
    budget: 'якісна копія — найкраще за ціною',
    mid: 'оригінал або копія — на вибір',
    flag: 'радимо оригінальну деталь'
  };
  var calcForm = $('#calc-form'), probBox = $('#calc-problems'), lastCalc = null;
  function val(name) { var el = $('input[name="' + name + '"]:checked', calcForm); return el ? el.value : ''; }
  function buildProblems() {
    var list = PROBLEMS[val('device')] || [];
    probBox.innerHTML = '';
    list.forEach(function (p, i) {
      var lab = d.createElement('label');
      var inp = d.createElement('input'); inp.type = 'radio'; inp.name = 'problem'; inp.value = String(i); if (i === 0) inp.checked = true;
      var sp = d.createElement('span'); sp.textContent = p.n;
      lab.appendChild(inp); lab.appendChild(sp); probBox.appendChild(lab);
    });
  }
  function calc() {
    var dev = val('device'), p = (PROBLEMS[dev] || [])[parseInt(val('problem'), 10) || 0];
    if (!p) return;
    var brand = val('brand');
    $('#o-device').textContent = DEV[dev] + ' · ' + brand;
    $('#o-problem').textContent = p.n;
    $('#o-time').textContent = p.t;
    $('#o-part').textContent = p.part === 1 ? PART[val('tier')] : (p.part === 0 ? 'визначимо після діагностики' : 'не потрібна');
    $('#o-bar').style.width = (p.w * 20) + '%';
    lastCalc = { device: DEV[dev] + ' ' + brand, problem: p.n, time: p.t };
    if (!reduce) { var o = $('.readout'); o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash'); }
  }
  if (calcForm) {
    buildProblems(); calc();
    calcForm.addEventListener('change', function (e) {
      if (e.target.name === 'device') buildProblems();
      calc();
    });
    $('#calc-send').addEventListener('click', function () {
      if (lastCalc) {
        $('#f-device').value = lastCalc.device;
        $('#f-msg').value = lastCalc.problem + ' (орієнтовно ' + lastCalc.time + ')';
      }
      var f = $('#form'); f.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { $('#f-name').focus({ preventScroll: true }); }, reduce ? 0 : 600);
    });
  }

  /* ---------- Форма заявки ---------- */
  var form = $('#form');
  function setErr(input, msg) {
    var f = input.closest('.field'); f.classList.toggle('has-err', !!msg);
    var e = $('.err', f); if (e) e.textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#f-name'), phone = $('#f-phone'), dev = $('#f-device'), msg = $('#f-msg');
      var ok = true;
      if (name.value.trim().length < 2) { setErr(name, 'Вкажіть ім’я — хоча б дві літери.'); ok = false; } else setErr(name);
      var digits = phone.value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) { setErr(phone, 'Вкажіть номер повністю, наприклад +380 67 123 45 67.'); ok = false; } else setErr(phone);
      if (dev.value.trim().length < 2) { setErr(dev, 'Напишіть, який пристрій ремонтуємо.'); ok = false; } else setErr(dev);
      if (!ok) { var first = $('[aria-invalid="true"]', form); if (first) first.focus(); return; }

      var text = 'Заявка на ремонт\n' +
        'Ім’я: ' + name.value.trim() + '\n' +
        'Телефон: ' + phone.value.trim() + '\n' +
        'Пристрій: ' + dev.value.trim() +
        (msg.value.trim() ? '\nПроблема: ' + msg.value.trim() : '');
      var viaEl = $('input[name="via"]:checked', form) || $('input[name="via"][type="hidden"]', form);
      var via = viaEl ? viaEl.value : 'tg';
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {});
      if (via === 'viber') {
        window.location.href = CONTACT.viber + '&draft=' + encodeURIComponent(text);
      } else if (via === 'sms') {
        window.location.href = CONTACT.sms + '?&body=' + encodeURIComponent(text);
      } else if (via === 'ig') {
        window.open(CONTACT.ig, '_blank', 'noopener');
      } else if (via === 'mail') {
        window.location.href = 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent('Заявка на ремонт: ' + dev.value.trim()) + '&body=' + encodeURIComponent(text);
      } else {
        window.open(CONTACT.tg + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      }
      var okBox = $('#form-ok'); okBox.hidden = false;
      form.querySelector('button[type="submit"]').textContent = 'Надіслати ще раз';
    });
    $$('input', form).forEach(function (i) { i.addEventListener('input', function () { if (i.getAttribute('aria-invalid') === 'true') setErr(i); }); });
  }

  /* ---------- Мобільна панель: ховається над формою, щоб не заважати ---------- */
  var mbar = $('.mbar'), contacts = $('#form');
  if (mbar && contacts && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { mbar.style.transform = e.isIntersecting ? 'translateY(140%)' : ''; });
    }, { threshold: 0.25 }).observe(contacts);
  }
})();
