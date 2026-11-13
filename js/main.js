/* Оптика — шаблон. Без залежностей. */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- header & menu ---------- */
  var top = $('[data-top]');
  var burger = $('[data-burger]');
  var nav = $('#nav');
  function onScrollTop() { if (top) top.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScrollTop, { passive: true });
  onScrollTop();
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    $('use', burger).setAttribute('href', open ? '#i-x' : '#i-menu');
  }
  if (burger && nav) {
    burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- year ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- signature: Sivtsev chart (Ukrainian letters) ---------- */
  var ROWS = [
    ['ШБ', '50,0', 0.1], ['МНК', '25,0', 0.2], ['ІМБШ', '16,7', 0.3], ['БІНКМ', '12,5', 0.4],
    ['ИНШМК', '10,0', 0.5], ['НШІИКБ', '8,33', 0.6], ['ШИНБМК', '7,14', 0.7], ['КНШМІБИ', '6,25', 0.8],
    ['БКШМІН', '5,55', 0.9], ['НШИКБМІ', '5,0', 1.0], ['ШІНБКМИ', '3,33', 1.5], ['КИБМШНІК', '2,5', 2.0]
  ];
  var fmt = function (n, d) { return n.toFixed(d).replace('.', ','); };
  var check = $('[data-check]');
  var rowsBox = $('[data-rows]');
  var rowEls = [];
  if (rowsBox) {
    ROWS.forEach(function (r) {
      var row = doc.createElement('div');
      row.className = 'chart-row' + (r[2] === 1 ? ' is-ref' : '');
      var size = 6 + 34 * Math.pow(0.1 / r[2], 0.75);
      row.innerHTML = '<span class="d">' + r[1] + '</span><span class="l" style="--s:' + size.toFixed(1) + '">' + r[0].split('').join(' ') + '</span><span class="v">' + fmt(r[2], 1) + '</span>';
      rowsBox.appendChild(row);
      rowEls.push({ el: $('.l', row), v: r[2] });
    });
  }
  var lensOut = $('[data-lens]');
  var acuOut = $('[data-acuity]');
  var steps = $$('[data-steps] li');
  function paintChart(cur, stepIdx) {
    rowEls.forEach(function (r) {
      var diff = Math.log(r.v / cur) / Math.LN2;
      var b = diff <= 0.02 ? 0 : Math.min(5, diff * 2.6);
      r.el.style.setProperty('--b', b.toFixed(2) + 'px');
    });
    var lens = -Math.round(((cur - 0.2) / 0.8) * 2.5 * 4) / 4;
    if (lensOut) lensOut.textContent = (lens === 0 ? '0,00' : '−' + fmt(Math.abs(lens), 2)) + ' D';
    if (acuOut) acuOut.textContent = fmt(Math.round(cur * 10) / 10, 1);
    steps.forEach(function (li, i) { li.classList.toggle('is-on', i === stepIdx); });
  }
  if (check) {
    if (reduce) {
      check.classList.add('is-static');
      paintChart(1, 3);
      steps.forEach(function (li) { li.classList.add('is-on'); });
    } else {
      var ticking = false;
      var update = function () {
        ticking = false;
        var rect = check.getBoundingClientRect();
        var span = rect.height - window.innerHeight;
        var p = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 1;
        var t = Math.min(1, p / 0.82);
        var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        paintChart(0.2 + 0.8 * eased, Math.min(3, Math.floor(p * 4.4)));
      };
      var req = function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } };
      window.addEventListener('scroll', req, { passive: true });
      window.addEventListener('resize', req);
      update();
    }
  }

  /* ---------- price tabs ---------- */
  var tabs = $$('[data-tabs] [role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = doc.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* ---------- frame finder ---------- */
  var SHAPES = {
    oval: {
      cap: 'Форма: овальна', title: 'Овальне обличчя — пасує майже все',
      text: 'Збалансовані пропорції дозволяють експериментувати. Головне — щоб оправа не була ширшою за найширшу частину обличчя.',
      tr: 'вайфарери, прямокутні й геометричні оправи', av: 'надто масивних оправ, що перекривають брови',
      face: 'M100 18C150 18 166 62 166 112C166 172 138 222 100 222C62 222 34 172 34 112C34 62 50 18 100 18Z',
      lens: 'M46 93L92 95Q92 122 76 124L60 124Q48 122 46 93Z'
    },
    round: {
      cap: 'Форма: кругла', title: 'Кругле обличчя — додайте кутів',
      text: 'Чіткі лінії візуально витягують обличчя й додають виразності, а широка оправа робить його стрункішим.',
      tr: 'прямокутні та квадратні оправи, широкі вайфарери', av: 'маленьких круглих оправ',
      face: 'M100 22C156 22 180 66 180 118C180 176 146 214 100 214C54 214 20 176 20 118C20 66 44 22 100 22Z',
      lens: 'M50 94H88Q92 94 92 98V119Q92 124 87 124H53Q48 124 48 119V98Q48 94 50 94Z'
    },
    square: {
      cap: 'Форма: квадратна', title: 'Квадратне обличчя — пом’якшіть лінії',
      text: 'Виразна лінія щелепи гарно врівноважується плавними формами: круглі й овальні оправи роблять риси м’якшими.',
      tr: 'круглі, овальні оправи й панто', av: 'вузьких прямокутних і різко кутастих оправ',
      face: 'M100 20C150 20 164 40 166 70L168 160C168 200 140 216 100 216C60 216 32 200 32 160L34 70C36 40 50 20 100 20Z',
      lens: 'M49 108A21 21 0 1 0 91 108A21 21 0 1 0 49 108Z'
    },
    heart: {
      cap: 'Форма: серцеподібна', title: 'Серцеподібне обличчя — врівноважте низ',
      text: 'Широкий лоб і вузьке підборіддя: оправа, що розширюється донизу, або легка безободкова виглядає природно.',
      tr: 'авіатори, напівободкові й безободкові оправи', av: 'масивного верху й декору на верхній лінії',
      face: 'M100 18C160 18 174 52 172 92C170 140 132 192 100 224C68 192 30 140 28 92C26 52 40 18 100 18Z',
      lens: 'M48 96Q70 90 92 97Q94 126 74 131Q50 130 48 96Z'
    },
    diamond: {
      cap: 'Форма: ромбоподібна', title: 'Ромбоподібне обличчя — підкресліть вилиці',
      text: 'Вузький лоб і підборіддя з широкими вилицями: оправа з акцентом на верхню лінію врівноважує пропорції.',
      tr: '«котяче око», овальні оправи, оправи з виразною верхньою лінією', av: 'вузьких оправ, вужчих за вилиці',
      face: 'M100 16C126 16 140 44 152 78C168 104 172 124 160 146C146 182 124 220 100 224C76 220 54 182 40 146C28 124 32 104 48 78C60 44 74 16 100 16Z',
      lens: 'M44 90Q62 98 92 98Q92 122 72 124Q52 123 47 104Z'
    }
  };
  var shapeBtns = $$('[data-shapes] [data-shape]');
  var faceEl = $('[data-face]'), frameG = $('[data-frame]'), lensL = $('[data-lens-l]'), lensR = $('[data-lens-r]');
  function setShape(key, focusBtn) {
    var s = SHAPES[key]; if (!s || !faceEl) return;
    shapeBtns.forEach(function (b) {
      var on = b.getAttribute('data-shape') === key;
      b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      if (on && focusBtn) b.focus();
    });
    faceEl.setAttribute('d', s.face);
    var apply = function () { lensL.setAttribute('d', s.lens); lensR.setAttribute('d', s.lens); frameG.classList.remove('is-swap'); };
    if (reduce || !lensL.getAttribute('d')) apply(); else { frameG.classList.add('is-swap'); setTimeout(apply, 220); }
    $('[data-face-cap]').textContent = s.cap;
    $('[data-adv-title]').textContent = s.title;
    $('[data-adv-text]').textContent = s.text;
    $('[data-adv-try]').textContent = s.tr;
    $('[data-adv-avoid]').textContent = s.av;
  }
  shapeBtns.forEach(function (b, i) {
    b.addEventListener('click', function () { setShape(b.getAttribute('data-shape')); });
    b.addEventListener('keydown', function (e) {
      var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (d) { e.preventDefault(); setShape(shapeBtns[(i + d + shapeBtns.length) % shapeBtns.length].getAttribute('data-shape'), true); }
    });
  });
  if (shapeBtns.length) setShape('oval');

  /* ---------- opening hours, Kyiv time ---------- */
  var list = $('[data-hours-list]');
  var statusEls = $$('[data-status]');
  function kyivNow() {
    var zones = ['Europe/Kyiv', 'Europe/Kiev'];
    for (var i = 0; i < zones.length; i++) {
      try {
        var parts = new Intl.DateTimeFormat('en-GB', { timeZone: zones[i], weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
        var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
        var wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday];
        return { day: wd, min: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
      } catch (e) { /* try next */ }
    }
    var d = new Date(); return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
  }
  if (!list) {
    statusEls.forEach(function (el) { el.hidden = true; });
  } else {
    var H = {};
    $$('li[data-day]', list).forEach(function (li) {
      var v = li.getAttribute('data-hours');
      var m = v && v.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
      H[li.getAttribute('data-day')] = m ? { o: +m[1] * 60 + +m[2], c: +m[3] * 60 + +m[4], os: m[1].padStart(2, '0') + ':' + m[2], cs: m[3].padStart(2, '0') + ':' + m[4] } : null;
    });
    var now = kyivNow();
    var li = $('li[data-day="' + now.day + '"]', list); if (li) li.classList.add('is-today');
    var today = H[now.day], open = !!(today && now.min >= today.o && now.min < today.c), text;
    if (open) {
      text = 'Зараз відчинено · до ' + today.cs;
    } else if (today && now.min < today.o) {
      text = 'Зараз зачинено · відчинимо о ' + today.os;
    } else {
      text = 'Зараз зачинено';
      for (var k = 1; k <= 7; k++) {
        var dd = (now.day + k) % 7;
        if (H[dd]) { text += k === 1 ? ' · відчинимо завтра о ' + H[dd].os : ' · відчинимо ' + ['у неділю', 'в понеділок', 'у вівторок', 'в середу', 'в четвер', 'у п’ятницю', 'в суботу'][dd] + ' о ' + H[dd].os; break; }
      }
    }
    statusEls.forEach(function (el) {
      el.classList.add(open ? 'is-open' : 'is-closed');
      var t = $('[data-status-text]', el); if (t) t.textContent = text;
    });
  }

  /* ---------- booking form ---------- */
  var form = $('[data-form]');
  function copyText(txt) {
    var ok = false;
    try {
      var ta = doc.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0'; doc.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, txt.length);
      ok = doc.execCommand('copy'); doc.body.removeChild(ta);
    } catch (e) { ok = false; }
    if (!ok && navigator.clipboard && window.isSecureContext) {
      try { navigator.clipboard.writeText(txt).catch(function () {}); ok = true; } catch (e2) { /* ignore */ }
    }
    return ok;
  }
  if (form) {
    var body = $('[data-form-body]', form), done = $('[data-form-done]', form), doneText = $('[data-done-text]', form);
    var defaultDone = doneText ? doneText.textContent : '';
    var biz = doc.body.getAttribute('data-biz') || '';
    var showErr = function (name, bad) { var f = form.elements[name].closest('.field'); f.classList.toggle('is-bad', bad); return bad; };
    ['name', 'phone'].forEach(function (n) { form.elements[n].addEventListener('input', function () { showErr(n, false); }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var el = form.elements;
      var name = el.name.value.trim(), phone = el.phone.value.trim();
      var bad1 = showErr('name', name.length < 2);
      var bad2 = showErr('phone', phone.replace(/\D/g, '').length < 9);
      if (bad1 || bad2) { (bad1 ? el.name : el.phone).focus(); return; }
      var date = el.date.value ? el.date.value.split('-').reverse().join('.') : 'будь-яка';
      var lines = ['Заявка з сайту' + (biz && biz.charAt(0) !== '[' ? ' «' + biz + '»' : ''),
        'Ім’я: ' + name, 'Телефон: ' + phone, 'Послуга: ' + el.service.value,
        'Дата: ' + date + ', час: ' + el.time.value.toLowerCase()];
      if (el.note.value.trim()) lines.push('Коментар: ' + el.note.value.trim());
      var msg = lines.join('\n');
      var radio = $('input[name="via"]:checked', form);
      var via = radio ? radio.value : 'copy';
      var href = radio ? radio.getAttribute('data-href') : '';
      var enc = encodeURIComponent(msg), copied = false, url = '';
      if (via === 'sms') url = href + '?&body=' + enc;
      else if (via === 'email') url = href + '?subject=' + encodeURIComponent('Запис на перевірку зору') + '&body=' + enc;
      else if (via === 'viber') url = 'viber://forward?text=' + enc;
      else { copied = copyText(msg); url = href; }
      if (doneText) {
        doneText.textContent = (via === 'instagram' || via === 'telegram')
          ? (copied ? 'Текст заявки скопійовано — вставте його в чат, що відкрився, і надішліть. Ми підтвердимо час.' : 'Напишіть нам у чат, що відкрився: ім’я, телефон і бажаний час.')
          : (via === 'copy' ? (copied ? 'Текст заявки скопійовано — надішліть його нам зручним способом.' : msg) : defaultDone);
      }
      if (url) {
        if (/^https?:/.test(url)) window.open(url, '_blank', 'noopener'); else window.location.href = url;
      }
      body.hidden = true; done.hidden = false; done.focus();
    });
    $('[data-form-reset]', form).addEventListener('click', function () { form.reset(); done.hidden = true; body.hidden = false; el0(); });
    var el0 = function () { form.elements.name.focus(); };
    var dateIn = form.elements.date;
    if (dateIn) { var t = new Date(); dateIn.min = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }
  }

  /* ---------- reveal on scroll ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = $$('.sec-head, .plist li, .v-item, .about-photo, .about-copy, .why-grid > *, .rev, .faq-list details, .form, .contacts-info, .map-col, .finder-copy, .face-stage');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (t) {
      var r = t.getBoundingClientRect();
      if (r.top < window.innerHeight) return;
      t.classList.add('rv'); io.observe(t);
    });
  }
})();
