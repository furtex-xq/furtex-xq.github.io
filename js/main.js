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

  /* ---------- corner frames ---------- */
  var FR = ['.dir__media', '.dir__list', '.lab__viz', '.stages', '.tint__view', '.tint__info', '.prods', '.about__media', '.stats', '.bigrate', '.quote', '.mosaic figure', '.form', '.sent', '.clist', '.socials', '.map', '.modal__box', '.step', '.ftr__grid > *', '.rating'];
  FR.forEach(function (sel) {
    var small = /step|ftr|rating|mosaic|bigrate|tint__info/.test(sel);
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
  var reveal = $$('.sec__head, .row, .dir__note, .prod, .step, .quote, .stats div, .clist li, .socials, .map, .mosaic figure, .tint__copy > *, .about__copy > *, .reviews__side > *, .contact__form > *, .demo-note');
  reveal.forEach(function (el) { el.setAttribute('data-r', ''); });
  ST.batch('[data-r]', { start: 'top 90%', once: true, onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .07, overwrite: true }); } });

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

  // footer word
  gsap.from('.ftr__big', { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.ftr', start: 'top bottom', end: 'top 50%', scrub: true } });

  window.addEventListener('load', function () { ST.refresh(); });
})();
