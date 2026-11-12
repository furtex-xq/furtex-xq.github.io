/* SPL — інтерактив і анімації. GSAP + ScrollTrigger + Lenis, лише transform/opacity. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- дані послуг для вікон (ціни демонстраційні) ---------- */
  var SVC = {
    audio: { n: '01', t: 'Автозвук', l: 'Від заміни штатних динаміків до системи з процесором. Підбираємо під авто, музику й бюджет, ставимо без пошкодження обшивок.', o: [
      ['Заміна штатних динаміків', 'Нова акустика в штатні місця, перехідні кільця', 'від 1 200 грн'],
      ['Підсилювач + сабвуфер під ключ', 'Проводка, запобіжники, корпус, налаштування', 'від 3 500 грн'],
      ['Аудіопроцесор з налаштуванням', 'Затримки, еквалайзер, кросовери під ваш салон', 'від 2 500 грн'],
      ['Магнітола / мультимедіа', 'Встановлення, рамка, CarPlay / Android Auto', 'від 1 000 грн']] },
    security: { n: '02', t: 'Охоронні системи', l: 'Сигналізації, автозапуск взимку, іммобілайзери й GPS-трекери. Приховане встановлення, щоб систему було важко знайти.', o: [
      ['Сигналізація з автозапуском', 'Двосторонній брелок, керування з телефона', 'від 2 500 грн'],
      ['Іммобілайзер / блокування', 'Додатковий захист від крадіжки', 'від 1 500 грн'],
      ['GPS-трекер', 'Місце авто в реальному часі', 'від 900 грн']] },
    parking: { n: '03', t: 'Паркувальні системи', l: 'Парктроніки й камери, щоб паркуватися без стресу й подряпин на бамперах.', o: [
      ['Парктронік задній', '4 датчики у колір кузова, звуковий сигнал', 'від 900 грн'],
      ['Парктронік передній + задній', '8 датчиків, індикатор у салоні', 'від 1 800 грн'],
      ['Камера заднього виду', 'Підключення до штатного або нового екрана', 'від 800 грн']] },
    light: { n: '04', t: 'Автосвітло', l: 'Світло, яке бачить дорогу, а не сліпить зустрічних. Лінзи, LED, відновлення помутнілих фар.', o: [
      ['Заміна лінз на Bi-LED', 'Розбирання фари, герметизація, регулювання', 'від 2 000 грн'],
      ['Полірування фар', 'Прибираємо жовтизну й матовість', 'від 600 грн'],
      ['Бронювання фар плівкою', 'Захист від сколів і піскоструму', 'від 800 грн'],
      ['LED-лампи / ходові вогні', 'Підбір під цоколь і фару', 'від 400 грн']] },
    diag: { n: '05', t: 'Автодіагностика', l: 'Комп’ютерна діагностика й пошук несправностей в електриці. Пояснюємо людською мовою, що з авто.', o: [
      ['Комп’ютерна діагностика', 'Зчитування й розшифрування помилок', 'від 400 грн'],
      ['Пошук несправності електрики', 'Витік струму, не працюють споживачі', 'від 600 грн'],
      ['Перевірка перед купівлею', 'Електроніка, помилки, сліди втручань', 'від 700 грн']] },
    film: { n: '06', t: 'Антигравійна плівка', l: 'Прозора поліуретанова плівка бере удар каміння на себе. Фарба лишається заводською.', o: [
      ['Фари', 'Бронювання обох фар', 'від 800 грн'],
      ['Зони ризику', 'Капот частково, бампер, дзеркала, пороги', 'від 9 000 грн'],
      ['Повна передня частина', 'Капот, бампер, крила, фари, дзеркала', 'від 18 000 грн'],
      ['Весь кузов', 'Повне оклеювання з підготовкою', 'від 45 000 грн']] },
    tint: { n: '07', t: 'Тонування', l: 'Плівки різної щільності, атермальні варіанти й акуратне зняття старої плівки. Підкажемо, що допустимо за правилами.', o: [
      ['Задня напівсфера', 'Задні бокові й заднє скло', 'від 1 500 грн'],
      ['Атермальна плівка', 'Менше нагріву салону влітку', 'від 2 500 грн'],
      ['Смуга на лобове', 'Захист від сонця зверху', 'від 300 грн'],
      ['Зняття старої плівки', 'Без пошкодження нитки обігріву', 'від 300 грн']] },
    polish: { n: '08', t: 'Полірування', l: 'Прибираємо павутинку, дрібні подряпини й тьмяність. Після полірування можна закріпити блиск захисним покриттям.', o: [
      ['Захисне полірування', 'Освіження блиску + віск', 'від 2 500 грн'],
      ['Відновлювальне полірування', 'Багатоетапне, прибирає подряпини', 'від 6 000 грн'],
      ['Захисне покриття', 'Блиск і легке миття на місяці', 'від 5 000 грн']] },
    clean: { n: '09', t: 'Хімчистка', l: 'Глибоке чищення салону з розбиранням там, де потрібно. Тканина, шкіра, стеля, багажник.', o: [
      ['Комплексна хімчистка салону', 'Сидіння, підлога, стеля, двері, багажник', 'від 3 000 грн'],
      ['Чищення й догляд за шкірою', 'Очищення + кондиціонер для шкіри', 'від 1 500 грн'],
      ['Хімчистка сидінь', 'Окремо передні або всі сидіння', 'від 1 200 грн']] },
    dent: { n: '10', t: 'Видалення вм’ятин', l: 'Вирівнюємо вм’ятини після граду й паркувань без перефарбування, якщо фарба ціла.', o: [
      ['Одна вм’ятина', 'Залежить від розміру й місця', 'від 500 грн'],
      ['Деталь після граду', 'Капот, дах, кришка багажника', 'від 3 000 грн'],
      ['Оцінка за фото', 'Надішліть фото в Telegram', 'безкоштовно']] },
    noise: { n: '11', t: 'Шумоізоляція', l: 'Тихіший салон і кращий звук. Робимо поетапно: можна почати з дверей і додати решту пізніше.', o: [
      ['Двері (4 шт.)', 'Вібро- й шумоізоляція, кращий бас', 'від 3 000 грн'],
      ['Підлога', 'Шум коліс і дороги', 'від 4 500 грн'],
      ['Арки', 'Найгучніше місце на мокрій дорозі', 'від 3 000 грн'],
      ['Комплекс «весь салон»', 'Двері, підлога, арки, багажник, стеля', 'від 14 000 грн']] },
    ac: { n: '12', t: 'Заправка кондиціонерів', l: 'Холодне повітря влітку без сюрпризів. Перевіряємо систему, а не просто доливаємо фреон.', o: [
      ['Заправка кондиціонера', 'Вакуумування, фреон, масло', 'від 800 грн'],
      ['Пошук витоку', 'Барвник / тиск, перевірка вузлів', 'від 500 грн'],
      ['Антибактеріальна обробка', 'Прибирає неприємний запах', 'від 400 грн']] }
  };
  var SVC_SELECT = { audio: 'Автозвук', security: 'Охоронні системи', parking: 'Паркувальні системи', light: 'Автосвітло', diag: 'Автодіагностика', film: 'Антигравійна плівка', tint: 'Тонування', polish: 'Полірування', clean: 'Хімчистка', dent: 'Вм\'ятини', noise: 'Шумоізоляція', ac: 'Заправка кондиціонерів' };

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }
  function goTo(target) {
    var el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -76 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- header, nav, dock ---------- */
  var hdr = $('.hdr'), dock = $('#dock'), burger = $('#burger'), nav = $('#nav');
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    hdr.classList.toggle('is-solid', y > 40);
    var navOpen = nav.classList.contains('is-open');
    hdr.classList.toggle('is-hidden', !navOpen && y > 500 && y > lastY + 4);
    if (y < lastY - 4) hdr.classList.remove('is-hidden');
    if (dock) dock.classList.toggle('is-on', y > window.innerHeight * 0.6);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var el = $(id);
    if (!el) return;
    e.preventDefault();
    if (a.dataset.pick) preselect(a.dataset.pick);
    if (a.dataset.msg && msg) msg.value = a.dataset.msg;
    nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false');
    if (modal.open) closeModal();
    goTo(el);
  });

  /* active nav link */
  if ('IntersectionObserver' in window) {
    var links = $$('.nav a');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (l) { var s = $(l.getAttribute('href')); if (s) io.observe(s); });
  }

  /* ---------- form preselect ---------- */
  var select = $('#svc-select'), msg = $('#form textarea[name=msg]');
  function preselect(label) {
    var shop = label.indexOf('Магазин:') === 0;
    var val = shop ? 'Магазин' : label;
    for (var i = 0; i < select.options.length; i++) if (select.options[i].text === val) select.selectedIndex = i;
    if (shop && msg && !msg.value) msg.value = label.replace('Магазин: ', 'Цікавить: ');
  }

  /* ---------- service modal ---------- */
  var modal = $('#modal');
  var lastFocus = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function openModal(key) {
    var d = SVC[key]; if (!d) return;
    $('#m-num').innerHTML = '<span class="num">' + d.n + '</span>Послуга';
    $('#m-title').textContent = d.t;
    $('#m-lead').textContent = d.l;
    $('#m-opts').innerHTML = d.o.map(function (o) {
      return '<li><b>' + esc(o[0]) + '</b><small>' + esc(o[1]) + '</small><span class="pr">' + esc(o[2]) + '</span></li>';
    }).join('');
    $('#m-book').dataset.pick = SVC_SELECT[key];
    lastFocus = document.activeElement;
    if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
    if (lenis) lenis.stop();
  }
  function closeModal() {
    if (typeof modal.close === 'function') modal.close(); else modal.removeAttribute('open');
  }
  modal.addEventListener('close', function () { if (lenis) lenis.start(); if (lastFocus) lastFocus.focus({ preventScroll: true }); });
  $('#m-close').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  $$('[data-svc]').forEach(function (b) { b.addEventListener('click', function () { openModal(b.dataset.svc); }); });

  /* ---------- tint configurator ---------- */
  var TINT = {
    5: ['5% · Лімузин', 'Максимальна приватність: салону ззовні майже не видно. Тільки для задніх стекол.'],
    15: ['15% · Темне', 'Салон ховається від поглядів, у спеку помітно прохолодніше. Задня напівсфера.'],
    35: ['35% · Збалансоване', 'Помітно темніше ззовні, комфортно вночі. Найпопулярніший вибір для задньої напівсфери.'],
    50: ['50% · Легке', 'Делікатне затемнення й менше сонця, огляд не змінюється.'],
    70: ['70% · Атермальне', 'Майже прозоре скло, яке відсікає тепло й ультрафіолет.']
  };
  var film = $('#tint-film');
  $$('.tint__opts button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.tint__opts button').forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
      var v = +b.dataset.vlt;
      film.style.opacity = (0.92 - v / 100 * 1.05).toFixed(2);
      $('#tint-name').textContent = TINT[v][0];
      $('#tint-text').textContent = TINT[v][1];
      var out = $('#tint-vlt'), from = +out.textContent;
      if (hasGsap && !reduce) { var o = { v: from }; window.gsap.to(o, { v: v, duration: .6, ease: 'power2.out', onUpdate: function () { out.textContent = Math.round(o.v); } }); }
      else out.textContent = v;
    });
  });
  film.style.opacity = (0.92 - 0.35 * 1.05).toFixed(2);

  /* ---------- shop filters ---------- */
  $$('.chip').forEach(function (c) {
    c.addEventListener('click', function () {
      $$('.chip').forEach(function (x) { x.classList.toggle('is-on', x === c); });
      var f = c.dataset.f;
      var shown = [];
      $$('.prod').forEach(function (p) { var on = f === 'all' || p.dataset.c === f; p.classList.toggle('is-out', !on); if (on) shown.push(p); });
      if (hasGsap && !reduce) window.gsap.fromTo(shown, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .45, stagger: .05, ease: 'power2.out', overwrite: true });
      if (hasGsap) window.ScrollTrigger.refresh();
    });
  });

  /* ---------- form ---------- */
  var form = $('#form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#form-err'); err.textContent = '';
    var name = form.name.value.trim(), phone = form.phone.value.trim();
    var bad = [];
    form.name.classList.toggle('bad', !name); if (!name) bad.push('ім’я');
    var okPhone = phone.replace(/\D/g, '').length >= 9;
    form.phone.classList.toggle('bad', !okPhone); if (!okPhone) bad.push('телефон');
    if (bad.length) { err.textContent = 'Будь ласка, вкажіть ' + bad.join(' і ') + '.'; return; }
    var lines = ['Заявка з сайту SPL', 'Ім’я: ' + name, 'Телефон: ' + phone];
    if (form.car.value.trim()) lines.push('Авто: ' + form.car.value.trim());
    if (form.service.value) lines.push('Послуга: ' + form.service.value);
    if (form.msg.value.trim()) lines.push('Коментар: ' + form.msg.value.trim());
    var text = lines.join('\n');
    $('#sent-txt').textContent = text;
    try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (x) {}
    form.hidden = true; $('#sent').hidden = false;
    if (hasGsap) window.ScrollTrigger.refresh();
  });

  /* ---------- калькулятор (демо-ціни) ---------- */
  // [назва, ціна від, множиться на клас авто?, послуга у формі]
  var CALC = [
    ['Звук і електроніка', [
      ['Заміна штатних динаміків', 1200, 0, 'Автозвук'],
      ['Підсилювач + сабвуфер під ключ', 3500, 0, 'Автозвук'],
      ['Аудіопроцесор з налаштуванням', 2500, 0, 'Автозвук'],
      ['Сигналізація з автозапуском', 2500, 0, 'Охоронні системи'],
      ['Парктронік задній', 900, 0, 'Паркувальні системи'],
      ['Камера заднього виду', 800, 0, 'Паркувальні системи'],
      ['Bi-LED лінзи', 2000, 0, 'Автосвітло']]],
    ['Захист і вигляд', [
      ['Плівка на фари', 800, 0, 'Антигравійна плівка'],
      ['Плівка: зони ризику', 9000, 1, 'Антигравійна плівка'],
      ['Тонування задньої напівсфери', 1500, 1, 'Тонування'],
      ['Захисне полірування', 2500, 1, 'Полірування'],
      ['Хімчистка салону', 3000, 1, 'Хімчистка']]],
    ['Комфорт', [
      ['Шумоізоляція дверей', 3000, 0, 'Шумоізоляція'],
      ['Шумоізоляція арок', 3000, 1, 'Шумоізоляція'],
      ['Заправка кондиціонера', 800, 0, 'Заправка кондиціонерів']]]
  ];
  var fmt = function (n) { return Math.round(n).toLocaleString('uk-UA').replace(/,/g, ' '); };
  var calcItems = $('#calc-items');
  calcItems.innerHTML = CALC.map(function (g, gi) {
    return '<div class="calc__group"><h3>' + esc(g[0]) + '</h3><div class="calc__items">' + g[1].map(function (it, ii) {
      return '<label class="it"><input type="checkbox" value="' + gi + '-' + ii + '"><span><b>' + esc(it[0]) + '</b><i>' + fmt(it[1]) + '</i></span></label>';
    }).join('') + '</div></div>';
  }).join('');
  var calcTotal = $('#calc-total'), calcList = $('#calc-list'), calcState = { sum: 0, lines: [], svc: [] }, shownSum = { v: 0 };
  function calcUpdate() {
    var carIn = $('#calc input[name=car]:checked'), k = +carIn.value;
    var sum = 0, lines = [], svc = [];
    $$('#calc-items input:checked').forEach(function (c) {
      var p = c.value.split('-'), it = CALC[+p[0]][1][+p[1]];
      var price = it[2] ? Math.round(it[1] * k / 50) * 50 : it[1];
      sum += price; lines.push([it[0], price]); if (svc.indexOf(it[3]) < 0) svc.push(it[3]);
    });
    calcState = { sum: sum, lines: lines, svc: svc, car: carIn.dataset.name };
    calcList.innerHTML = lines.length ? lines.map(function (l) { return '<li><span>' + esc(l[0]) + '</span><span>від ' + fmt(l[1]) + '</span></li>'; }).join('') : '<li class="calc__empty">Оберіть хоча б одну роботу</li>';
    if (hasGsap && !reduce) window.gsap.to(shownSum, { v: sum, duration: .6, ease: 'power2.out', overwrite: true, onUpdate: function () { calcTotal.textContent = fmt(shownSum.v); } });
    else calcTotal.textContent = fmt(sum);
  }
  $('#calc').addEventListener('submit', function (e) { e.preventDefault(); });
  $('#calc').addEventListener('change', calcUpdate);
  calcUpdate();
  $('#calc-book').addEventListener('click', function () {
    if (!calcState.lines.length) return;
    if (calcState.svc.length === 1) preselect(calcState.svc[0]);
    if (msg) msg.value = 'Розрахунок з калькулятора (' + calcState.car + '): ' + calcState.lines.map(function (l) { return l[0]; }).join(', ') + '. Орієнтовно від ' + fmt(calcState.sum) + ' грн.';
  });

  /* ---------- акція місяця: таймер до кінця місяця (київський час) ---------- */
  var timer = $('#timer');
  if (timer) {
    var cells = {}; $$('[data-t]', timer).forEach(function (b) { cells[b.dataset.t] = b; });
    var kyivNow = function () { // поточний київський час як «локальна» дата
      try { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Kyiv' })); } catch (x) { return new Date(); }
    };
    var tickTimer = function () {
      var now = kyivNow(), end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
      var s = Math.max(0, Math.floor((end - now) / 1000));
      var v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
      Object.keys(v).forEach(function (key) {
        var t = (v[key] < 10 ? '0' : '') + v[key];
        if (cells[key].textContent !== t) { cells[key].textContent = t; if (!reduce) { cells[key].classList.remove('tick'); void cells[key].offsetWidth; cells[key].classList.add('tick'); } }
      });
    };
    tickTimer(); setInterval(tickTimer, 1000);
  }

  /* ---------- corner frames ---------- */
  var FR = ['.promo__box', '.timer > div', '.calc__sum','.dir__media', '.dir__list', '.lab__viz', '.stages', '.tint__view', '.tint__info', '.prods', '.about__media', '.stats', '.bigrate', '.quote', '.mosaic figure', '.form', '.sent', '.clist', '.socials', '.map', '.modal__box', '.step', '.ftr__grid > *', '.rating'];
  FR.forEach(function (sel) {
    var small = /step|ftr|rating|mosaic|bigrate|tint__info|timer/.test(sel);
    $$(sel).forEach(function (el) { var i = document.createElement('i'); i.className = small ? 'fr fr--sm' : 'fr'; i.setAttribute('aria-hidden', 'true'); el.appendChild(i); });
  });

  /* ---------- build decorative elements ---------- */
  var eq = $('#eq'), N = window.innerWidth < 640 ? 28 : 64;
  for (var i = 0; i < N; i++) eq.appendChild(document.createElement('i'));
  var meter = $('#meter');
  for (var j = 0; j < 20; j++) { var seg = document.createElement('i'); if (j >= 15) seg.className = 'hot-slot'; meter.appendChild(seg); }
  var segs = $$('#meter i'), stages = $$('.stage'), spk = $('.spk'), lvl = $('#lvl');
  function setLevel(p) { // p: 0..1
    var lit = Math.round(p * segs.length);
    segs.forEach(function (s, k) { s.classList.toggle('on', k < lit); s.classList.toggle('hot', k < lit && k >= 15); });
    var st = Math.min(stages.length - 1, Math.floor(p * stages.length * 0.999));
    stages.forEach(function (s, k) { s.classList.toggle('is-on', window.innerWidth > 900 ? k === st : k <= st); });
    lvl.textContent = '0' + (st + 1);
    spk.style.setProperty('--l', (0.15 + p * 0.85).toFixed(3));
  }
  setLevel(0.2);

  /* ---------- no animation fallback ---------- */
  if (!hasGsap || reduce) {
    eq.style.display = reduce ? 'none' : '';
    if (!reduce) $$('.eq i').forEach(function (b) { b.style.transform = 'scaleY(' + (0.1 + Math.random() * 0.5) + ')'; });
    window.addEventListener('scroll', function () {
      var lab = $('#zvuk'), r = lab.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / r.height));
      setLevel(Math.max(0.2, p));
    }, { passive: true });
    return;
  }

  /* ---------- GSAP ---------- */
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  document.documentElement.classList.add('js-anim');

  // hero entrance
  var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero__title .line > span', { yPercent: 110, duration: 1.2, stagger: .1 })
    .from('.hero__eyebrow, .hero__lead, .hero__cta, .rating', { opacity: 0, y: 24, duration: 1, stagger: .08 }, '-=.9')
    .from('.hero__ghost', { opacity: 0, x: 60, duration: 1.6 }, 0)
    .from('.hdr', { opacity: 0, y: -20, duration: .8 }, .2);

  // hero parallax
  gsap.to('.hero__img', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__ghost', { yPercent: -30, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // equalizer: each bar loops on its own; louder in the middle
  var bars = $$('.eq i');
  bars.forEach(function (b, k) {
    var c = 1 - Math.abs(k - bars.length / 2) / (bars.length / 2);
    var lo = 0.06 + c * 0.1, hi = 0.25 + c * 0.7;
    (function pump() {
      gsap.to(b, { scaleY: lo + Math.random() * (hi - lo), duration: 0.18 + Math.random() * 0.3, ease: 'sine.inOut', onComplete: pump });
    })();
  });
  // pause the eq when hero is off screen (saves CPU)
  ST.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onLeave: function () { gsap.getTweensOf(bars).forEach(function (t) { t.pause(); }); }, onEnterBack: function () { gsap.getTweensOf(bars).forEach(function (t) { t.resume(); }); } });

  // ticker: endless + reacts to scroll velocity
  var track = $('.ticker__track');
  track.innerHTML += track.innerHTML;
  var tick = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
  ST.create({ onUpdate: function (s) { var v = Math.min(4, 1 + Math.abs(s.getVelocity()) / 600); gsap.to(tick, { timeScale: v, duration: .3, overwrite: true }); gsap.to(tick, { timeScale: 1, duration: 1.2, delay: .3 }); } });

  // generic reveals
  var reveal = $$('.promo__box, .calc__step, .calc__sum, .sec__head,.row, .dir__note, .prod, .step, .quote, .stats div, .clist li, .socials, .map, .mosaic figure, .tint__copy > *, .about__copy > *, .reviews__side > *, .contact__form > *, .demo-note');
  reveal.forEach(function (el) { el.setAttribute('data-r', ''); });
  ST.batch('[data-r]', { start: 'top 90%', once: true, onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .07, overwrite: 'auto' }); } });

  // direction images: slow parallax inside sticky frame
  $$('.dir__media img, .about__media img').forEach(function (img) {
    gsap.fromTo(img, { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // sound lab: pinned on desktop, stepwise on mobile
  var mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', function () {
    var waves = $$('.spk__wave');
    var wt = gsap.timeline({ repeat: -1 });
    waves.forEach(function (w, k) { wt.fromTo(w, { scale: .55, opacity: .7 }, { scale: 1.35, opacity: 0, duration: 1.6, ease: 'power1.out' }, k * .8); });
    wt.timeScale(.6);
    var st = ST.create({ trigger: '.lab', start: 'top top', end: '+=180%', pin: '.lab__pin', scrub: true,
      onUpdate: function (s) { setLevel(Math.max(0.12, s.progress)); wt.timeScale(.6 + s.progress * 1.8); } });
    return function () { st.kill(); wt.kill(); };
  });
  mm.add('(max-width: 900px)', function () {
    var n = stages.length;
    var sts = stages.map(function (s, k) {
      return ST.create({ trigger: s, start: 'top 62%', onEnter: function () { setLevel((k + 1) / n); }, onLeaveBack: function () { setLevel(Math.max(0.12, k / n)); } });
    });
    return function () { sts.forEach(function (t) { t.kill(); }); };
  });

  // process line draws
  gsap.to('.steps__line span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 80%', end: 'bottom 60%', scrub: true } });

  // counters
  $$('.count').forEach(function (el) {
    var to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0), o = { v: 0 };
    ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
      gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: function () {
        el.textContent = dec ? o.v.toFixed(dec).replace('.', ',') : Math.round(o.v).toLocaleString('uk-UA');
      } });
    } });
  });


  /* ================= раунд 3: більше анімацій (тільки transform/opacity) ================= */

  // 1. scroll progress line under the header
  var prog = document.createElement('i'); prog.className = 'progress'; prog.setAttribute('aria-hidden', 'true'); hdr.appendChild(prog);
  gsap.to(prog, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  // 2. headings: words rise from a mask
  $$('.h2, .promo__title, .modal__title').forEach(function (h) {
    if (h.closest('.modal')) return;
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var o = document.createElement('span'); o.className = 'w';
            var i = document.createElement('span'); i.className = 'wi'; i.textContent = part;
            o.appendChild(i); frag.appendChild(o);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') wrap(n);
      });
    })(h);
    gsap.from($$('.wi', h), { yPercent: 115, rotate: 4, duration: 1.1, ease: 'expo.out', stagger: .045, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });

  // 3. eyebrow labels slide in from the left
  $$('.eyebrow').forEach(function (e) {
    if (e.closest('.hero')) return;
    gsap.from(e, { x: -24, opacity: 0, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: e, start: 'top 92%', once: true } });
  });

  // 4. corner brackets "lock on" when their block appears
  ST.batch('.fr', { start: 'top 92%', once: true, onEnter: function (els) {
    gsap.fromTo(els, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: .9, ease: 'expo.out', stagger: .04 });
  } });

  // 5. photos zoom out inside their frames
  $$('.dir__media img, .about__media img, .tint__view img, .mosaic img').forEach(function (img) {
    gsap.from(img, { scale: 1.25, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: img.parentNode, start: 'top 88%', once: true } });
  });

  // 6. service rows: numbers drop in, row slides from the side
  $$('.dir__list').forEach(function (list) {
    var rows = $$('.row', list);
    gsap.from($$('.row__n', list), { yPercent: -60, opacity: 0, duration: .8, ease: 'back.out(2)', stagger: .08, scrollTrigger: { trigger: list, start: 'top 85%', once: true } });
    gsap.from($$('.row__go', list), { x: 20, opacity: 0, duration: .8, ease: 'expo.out', stagger: .08, delay: .2, scrollTrigger: { trigger: list, start: 'top 85%', once: true } });
  });

  // 7. shop: spec numbers punch in
  ST.batch('.prod__spec', { start: 'top 92%', once: true, onEnter: function (els) {
    gsap.from(els, { scale: .6, opacity: 0, duration: .9, ease: 'back.out(1.8)', stagger: .06, transformOrigin: '0% 100%' });
  } });

  // 8. reviews alternate from left/right; stars pop
  $$('.quote').forEach(function (q, k) {
    gsap.from(q, { x: k % 2 ? 40 : -40, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: q, start: 'top 90%', once: true } });
    gsap.from($$('.quote__top svg', q), { scale: 0, duration: .5, ease: 'back.out(3)', stagger: .06, delay: .2, scrollTrigger: { trigger: q, start: 'top 90%', once: true } });
  });
  gsap.from('.bigrate__n', { scale: .5, opacity: 0, duration: 1.2, ease: 'back.out(1.6)', transformOrigin: '0% 100%', scrollTrigger: { trigger: '.bigrate', start: 'top 88%', once: true } });

  // 9. process diamonds spin in
  gsap.from('.step__n', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: '.steps', start: 'top 82%', once: true } });

  // 10. promo: badge stamp + idle breathing
  gsap.from('.promo__badge', { scale: 1.6, rotate: -12, opacity: 0, duration: 1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.promo', start: 'top 80%', once: true },
    onComplete: function () { gsap.to('.promo__badge', { scale: 1.04, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }); } });
  gsap.from('.timer > div', { y: 24, opacity: 0, duration: .8, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: '.timer', start: 'top 90%', once: true } });

  // 11. calculator total bumps on change; chosen items pop
  $('#calc').addEventListener('change', function (e) {
    gsap.fromTo('#calc-total', { scale: 1.12 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
    var lab = e.target.closest('label');
    if (lab) gsap.fromTo(lab.querySelector('span'), { scale: .96 }, { scale: 1, duration: .4, ease: 'back.out(3)' });
  });

  // 12. hero: pointer parallax on desktop
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var heroEl = $('.hero');
    var gx = gsap.quickTo('.hero__ghost', 'x', { duration: .9, ease: 'power3' }), gy = gsap.quickTo('.hero__ghost', 'y', { duration: .9, ease: 'power3' });
    var ix = gsap.quickTo('.hero__media', 'x', { duration: 1.2, ease: 'power3' }), iy = gsap.quickTo('.hero__media', 'y', { duration: 1.2, ease: 'power3' });
    heroEl.addEventListener('pointermove', function (e) {
      var px = e.clientX / window.innerWidth - .5, py = e.clientY / window.innerHeight - .5;
      gx(px * -40); gy(py * -24); ix(px * 14); iy(py * 10);
    });

    // 13. magnetic buttons
    $$('.btn--sig, .btn--sq, .row__go').forEach(function (b) {
      var bx = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' }), by = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); bx((e.clientX - r.left - r.width / 2) * .25); by((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener('pointerleave', function () { bx(0); by(0); });
    });

    // 14. product cards tilt slightly toward the pointer
    $$('.prod').forEach(function (p) {
      var sp = p.querySelector('.prod__spec');
      var sx = gsap.quickTo(sp, 'x', { duration: .6, ease: 'power3' });
      p.addEventListener('pointermove', function (e) { var r = p.getBoundingClientRect(); sx(((e.clientX - r.left) / r.width - .5) * 16); });
      p.addEventListener('pointerleave', function () { sx(0); });
    });
  }

  // 15. footer: letters of SPL rise one by one
  var big = $('.ftr__big');
  if (big) {
    big.innerHTML = big.textContent.split('').map(function (c) { return '<span class="ch">' + c + '</span>'; }).join('');
    gsap.from($$('.ftr__big .ch'), { yPercent: 70, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.ftr', start: 'top 85%', once: true } });
  }

  // 16. map + contact list
  gsap.from('.clist li .ic', { scale: 0, rotate: -90, duration: .7, ease: 'back.out(2.5)', stagger: .1, scrollTrigger: { trigger: '.clist', start: 'top 88%', once: true } });

  window.addEventListener('load', function () { ST.refresh(); });
})();
