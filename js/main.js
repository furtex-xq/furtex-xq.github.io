/* Оптика 1st — interactions. GSAP + ScrollTrigger + Lenis (local copies in js/vendor). */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var anim = hasGsap && !reduce;
  var lenis = null;

  /* ---------- header: scrolled state + hide on scroll down ---------- */
  var top = $('#top'), lastY = 0;
  function onScroll() {
    var y = window.scrollY;
    top.classList.toggle('is-scrolled', y > 20);
    var navOpen = $('#nav').classList.contains('is-open');
    top.classList.toggle('is-hidden', !navOpen && y > 400 && y > lastY + 4);
    if (y < lastY - 4 || y < 400) top.classList.remove('is-hidden');
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  var burger = $('.burger'), nav = $('#nav');
  function closeNav() { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Відкрити меню'); }
  burger.addEventListener('click', function () {
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });

  /* ---------- smooth anchor scrolling ---------- */
  $$('a[href^="#"]:not(.tile)').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeNav();
      if (lenis) lenis.scrollTo(el, { offset: -80, duration: 1.3 });
      else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      if (id === '#zapys') setTimeout(function () { $('#zapys input[name=name]').focus({ preventScroll: true }); }, reduce ? 0 : 1300);
    });
  });

  /* ---------- open now (Kyiv time, daily 9–19) ---------- */
  var openEl = $('[data-open]');
  if (openEl) {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':');
      var mins = (+parts[0]) * 60 + (+parts[1]);
      var isOpen = mins >= 540 && mins < 1140;
      openEl.textContent = isOpen ? 'Зараз відчинено' : 'Зараз зачинено';
      openEl.classList.add(isOpen ? 'is-open' : 'is-closed');
    } catch (e) { /* old browser: just hide */ }
  }

  /* ---------- before / after compare ---------- */
  var compare = $('[data-compare]'), range = compare && $('.compare__range', compare);
  function setPos(v) { compare.style.setProperty('--pos', v + '%'); }
  if (range) range.addEventListener('input', function () { setPos(range.value); });

  /* ---------- lens coatings ---------- */
  var coats = {
    ar: ['З антивідблиском', 'Прибирає відблиски від ламп і фар. Очі менше втомлюються, а співрозмовник бачить ваші очі, а не відблиск.'],
    blue: ['З фільтром синього світла', 'Для тих, хто багато часу проводить за комп\'ютером і телефоном: зменшує навантаження на очі від екранів увечері.'],
    photo: ['Фотохромні', 'Лінзи-«хамелеони»: у приміщенні прозорі, а на сонці темніють. Одні окуляри замість двох.'],
    prog: ['Прогресивні', 'Чітко на будь-якій відстані: зверху для далі, знизу для читання. Без різкої межі, як у біфокальних.']
  };
  var coatTxt = $('[data-coat-text]'), lensLbl = $('[data-lens-label]');
  if (compare) compare.setAttribute('data-c', 'ar');
  $$('.coat__btn').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.coat__btn').forEach(function (x) { x.classList.remove('is-on'); x.setAttribute('aria-selected', 'false'); });
      b.classList.add('is-on'); b.setAttribute('aria-selected', 'true');
      var c = coats[b.dataset.coat];
      compare.setAttribute('data-c', b.dataset.coat);
      lensLbl.textContent = c[0];
      if (anim) {
        gsap.fromTo(coatTxt, { opacity: 0, y: 10, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .5, ease: 'power2.out' });
      }
      coatTxt.textContent = c[1];
    });
  });

  /* ---------- product shelf: drag with mouse ---------- */
  var shelf = $('[data-shelf]');
  if (shelf) {
    var down = false, sx = 0, sl = 0, moved = false;
    shelf.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = shelf.scrollLeft; shelf.style.scrollSnapType = 'none'; });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; shelf.scrollLeft = sl - dx; });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; shelf.style.scrollSnapType = ''; });
    shelf.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    shelf.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return; // vertical wheel scrolls the page
    }, { passive: true });
  }

  /* ---------- prefill form from catalogue ---------- */
  var form = $('#zapys');
  function prefill(text, kind) {
    var msg = form.elements.msg;
    msg.value = 'Цікавить: ' + text;
    if (kind) { var r = form.querySelector('input[name=kind][value="' + kind + '"]'); if (r) r.checked = true; }
    if (lenis) lenis.scrollTo(form, { offset: -90, duration: 1.4 }); else form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(function () { form.elements.name.focus({ preventScroll: true }); }, reduce ? 0 : 1400);
  }
  $$('[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.pick, k = /лінзи/i.test(t) && /контакт/i.test(t) ? 'Контактні лінзи' : /МКЛ/.test(t) ? 'Контактні лінзи' : 'Окуляри';
      prefill(t, k);
    });
  });
  $$('.tile[data-kind]').forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      var kd = t.dataset.kind;
      prefill(kd, /Контакт|МКЛ/.test(kd) ? 'Контактні лінзи' : 'Окуляри');
    });
  });

  /* ---------- form ---------- */
  var status = $('.form__status', form);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name, phone = form.elements.phone, ok = true;
    [name, phone].forEach(function (f) { f.closest('.field').classList.remove('is-bad'); });
    if (name.value.trim().length < 2) { name.closest('.field').classList.add('is-bad'); ok = false; }
    if (phone.value.replace(/\D/g, '').length < 9) { phone.closest('.field').classList.add('is-bad'); ok = false; }
    status.classList.toggle('is-err', !ok);
    if (!ok) { status.textContent = 'Перевірте, будь ласка, ім\'я та номер телефону.'; return; }
    // Demo: static hosting has no backend, so the request opens in WhatsApp.
    // After launch, requests go straight to the shop's Telegram bot / email.
    var text = 'Заявка з сайту Оптика 1st\nІм\'я: ' + name.value.trim() + '\nТелефон: ' + phone.value.trim() +
      '\nЦікавить: ' + form.elements.kind.value +
      (form.elements.msg.value.trim() ? '\nКоментар: ' + form.elements.msg.value.trim() : '');
    window.open('https://wa.me/380675000829?text=' + encodeURIComponent(text), '_blank', 'noopener');
    status.textContent = 'Дякуємо! Заявку сформовано, ми зателефонуємо найближчим часом.';
    form.reset();
  });

  /* ---------- service windows ---------- */
  var IMG = function (id) { return 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=900&h=1100&q=70'; };
  var services = {
    test: {
      kicker: 'Послуга 01', title: 'Перевірка зору', img: IMG('1576210117723-cd06449a467d'), alt: 'Перевірка зору на обладнанні',
      lead: 'Оптометрист перевірить гостроту зору кожного ока й підбере точну корекцію для окулярів або контактних лінз.',
      kind: 'Перевірка зору',
      opts: [
        ['Для окулярів', 'Перевіряємо гостроту зору й підбираємо корекцію, з якою вам буде комфортно і вдалину, і зблизька.'],
        ['Для контактних лінз', 'Окрім гостроти зору, підбираємо параметри лінзи, щоб вона сиділа зручно й не пересушувала око.'],
        ['Для дитини', 'Спокійна перевірка в ігровому темпі. Пояснимо батькам результат і підкажемо, чи потрібні окуляри.']
      ],
      list: ['Перевірка кожного ока окремо', 'Підбір корекції на пробних лінзах', 'Пояснення результату простими словами', 'Рекомендації щодо окулярів або лінз'],
      price: 'Безкоштовно'
    },
    glasses: {
      kicker: 'Послуга 02', title: 'Окуляри за рецептом', img: IMG('1486250944723-86bca2b15b06'), alt: 'Оправи для окулярів на стенді',
      lead: 'Від вибору оправи до готових окулярів: підбираємо форму, лінзи й покриття, а потім підганяємо посадку.',
      kind: 'Окуляри',
      opts: [
        ['Для читання', 'Лінзи для близької відстані: книжки, телефон, рукоділля. Широка зона чіткості без напруження.'],
        ['Для комп\'ютера', 'Лінзи з фільтром синього світла й антивідблиском. Менше втоми очей після робочого дня за екраном.'],
        ['Для водіння', 'Антивідблиск проти світла фар і чітке зображення вдалину. Можна з поляризацією для дня.'],
        ['Прогресивні', 'Одні окуляри на всі відстані: зверху вдалину, посередині для екрана, внизу для читання.']
      ],
      list: ['Оправи для жінок, чоловіків і дітей', 'Лінзи з покриттями на вибір', 'Підгонка дужок і носових упорів', 'Можна за вашим рецептом від лікаря'],
      price: 'від 1 500 грн <small>демо-ціна комплекту</small>'
    },
    contacts: {
      kicker: 'Послуга 03', title: 'Контактні лінзи', img: IMG('1589835815854-8668885ba8a6'), alt: 'Крупний план очей',
      lead: 'Підберемо лінзи під ваш ритм, навчимо одягати й знімати їх і розповімо про правильний догляд.',
      kind: 'Контактні лінзи',
      opts: [
        ['Одноденні', 'Нова пара щодня, без розчинів і контейнерів. Ідеально для спорту, подорожей і тих, хто носить лінзи час від часу.'],
        ['Двотижневі', 'Баланс ціни й комфорту. Знімаються на ніч, зберігаються в розчині.'],
        ['Місячні', 'Найвигідніший варіант для щоденного носіння за умови правильного догляду.']
      ],
      list: ['Підбір параметрів лінзи', 'Перше одягання разом з консультантом', 'Розчини, краплі та контейнери в наявності', 'Нагадаємо, коли час замінити лінзи'],
      price: 'від 520 грн <small>демо-ціна упаковки</small>'
    },
    sun: {
      kicker: 'Послуга 04', title: 'Сонцезахисні окуляри', img: IMG('1608539733292-190446b22b83'), alt: 'Сонцезахисні окуляри',
      lead: 'Окуляри, які справді захищають очі від ультрафіолету, а не лише гарно виглядають.',
      kind: 'Окуляри',
      opts: [
        ['UV400', 'Повний захист від ультрафіолетових променів UVA і UVB. Базова вимога до будь-яких сонцезахисних окулярів.'],
        ['Поляризаційні', 'Прибирають відблиски від води, снігу й мокрої дороги. Найкращий вибір для водіїв і рибалок.'],
        ['З діоптріями', 'Сонцезахисні лінзи з вашою корекцією: бачите чітко й без мруження навіть улітку.']
      ],
      list: ['Моделі для жінок, чоловіків і дітей', 'Перевіримо UV-захист у салоні', 'Підгонка посадки', 'Футляр у комплекті'],
      price: 'від 690 грн <small>демо-ціна</small>'
    },
    care: {
      kicker: 'Послуга 05', title: 'Догляд і аксесуари', img: IMG('1591076482161-42ce6da69f67'), alt: 'Окуляри на дерев\'яному столі',
      lead: 'Усе, щоб окуляри й лінзи служили довше: від розчинів до футлярів і спреїв проти запотівання.',
      kind: 'Інше',
      opts: [
        ['Для контактних лінз', 'Багатофункціональні розчини, зволожувальні краплі та контейнери для зберігання.'],
        ['Для окулярів', 'Серветки з мікрофібри, спреї для чищення та засоби проти запотівання лінз.'],
        ['Аксесуари', 'Жорсткі й м\'які футляри, ланцюжки та шнурки, щоб окуляри завжди були під рукою.']
      ],
      list: ['Усе в наявності в салоні', 'Порадимо, що підійде саме вам', 'Можна відкласти товар за телефоном'],
      price: 'від 150 грн <small>демо-ціна</small>'
    }
  };
  var win = $('#win'), winCur = null, winOpt = null, winFrom = null;
  function fillWin(key) {
    var s = services[key]; winCur = key;
    $('[data-win-img]', win).src = s.img; $('[data-win-img]', win).alt = s.alt;
    $('[data-win-kicker]', win).textContent = s.kicker;
    $('[data-win-title]', win).textContent = s.title;
    $('[data-win-lead]', win).textContent = s.lead;
    $('[data-win-price]', win).innerHTML = s.price;
    $('[data-win-list]', win).innerHTML = s.list.map(function (t) { return '<li>' + t + '</li>'; }).join('');
    var box = $('[data-win-opts]', win);
    box.innerHTML = s.opts.map(function (o, i) { return '<button type="button" class="win__opt" role="radio" aria-checked="' + (i === 0) + '" data-i="' + i + '">' + o[0] + '</button>'; }).join('');
    selectOpt(0, false);
  }
  function selectOpt(i, animate) {
    var s = services[winCur]; winOpt = s.opts[i][0];
    $$('.win__opt', win).forEach(function (b) { b.setAttribute('aria-checked', String(+b.dataset.i === i)); });
    var d = $('[data-win-detail]', win);
    d.textContent = s.opts[i][1];
    if (animate && anim) gsap.fromTo(d, { opacity: 0, y: 8, filter: 'blur(5px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .45, ease: 'power2.out' });
  }
  $('[data-win-opts]', win).addEventListener('click', function (e) {
    var b = e.target.closest('.win__opt'); if (b) selectOpt(+b.dataset.i, true);
  });
  function openWin(key, fromEl) {
    fillWin(key); winFrom = fromEl;
    document.documentElement.classList.add('win-open');
    if (lenis) lenis.stop();
    win.showModal();
    var panel = $('.win__panel', win);
    if (anim) {
      var r = fromEl.getBoundingClientRect(), pr = panel.getBoundingClientRect();
      gsap.fromTo(panel,
        { x: (r.left + r.width / 2) - (pr.left + pr.width / 2), y: (r.top + r.height / 2) - (pr.top + pr.height / 2), scale: .2, opacity: 0, borderRadius: 200 },
        { x: 0, y: 0, scale: 1, opacity: 1, borderRadius: window.innerWidth > 900 ? 32 : 26, duration: .7, ease: 'expo.out', clearProps: 'borderRadius' });
      gsap.fromTo($('[data-win-img]', win), { scale: 1.3 }, { scale: 1, duration: 1.2, ease: 'expo.out' });
      gsap.fromTo($$('.win__body > *', win), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .6, stagger: .045, delay: .15, ease: 'power3.out' });
    }
  }
  function closeWin(after) {
    var done = function () { win.close(); document.documentElement.classList.remove('win-open'); if (lenis) lenis.start(); if (winFrom) winFrom.focus({ preventScroll: true }); if (after) after(); };
    if (anim) gsap.to($('.win__panel', win), { scale: .9, opacity: 0, y: 30, duration: .3, ease: 'power2.in', onComplete: function () { gsap.set($('.win__panel', win), { clearProps: 'all' }); done(); } });
    else done();
  }
  $$('.svc-card').forEach(function (card) {
    var btn = $('.svc-open', card);
    btn.addEventListener('click', function () { openWin(card.dataset.svc, btn); });
    $('.svc-card__img', card).addEventListener('click', function () { openWin(card.dataset.svc, btn); });
  });
  $('.win__close', win).addEventListener('click', function () { closeWin(); });
  win.addEventListener('cancel', function (e) { e.preventDefault(); closeWin(); });
  win.addEventListener('click', function (e) { if (e.target === win) closeWin(); });
  $('[data-win-book]', win).addEventListener('click', function () {
    var s = services[winCur];
    closeWin(function () { prefill(s.title + ' — ' + winOpt, s.kind); });
  });

  /* eye chart rows: build a sharp layer and a pre-blurred layer (blur is painted once, only opacity animates) */
  $$('.chart__row').forEach(function (r, i) {
    var html = r.innerHTML;
    r.innerHTML = '<span class="rs">' + html + '</span><span class="rb" aria-hidden="true">' + html + '</span>';
    r.style.setProperty('--bl', (5 + i * 1.4) + 'px');
  });

  /* statement: split into words for the scroll highlight */
  var stateTxt = $('[data-state]');
  if (stateTxt) {
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span'); s.className = 'sw'; s.textContent = t; frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) { wrap(n); }
      });
    })(stateTxt);
  }

  /* ================= animations ================= */
  if (!anim) {
    $('.chart').classList.add('no-anim');
    $$('mark.hl').forEach(function (m) { m.classList.add('is-on'); });
    $('.chart').classList.add('is-sharp');
    var d = $('[data-diopter]'); if (d) d.textContent = '0.00';
    return;
  }

  document.documentElement.classList.add('js-anim');
  gsap.registerPlugin(ScrollTrigger);

  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    ScrollTrigger.config({ ignoreMobileResize: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* hero: "autofocus" — headline and photo come into focus */
  var heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTl
    .from('.lens', { scale: .86, opacity: 0, duration: 1.2 })
    .fromTo('.lens__img', { filter: 'blur(22px)', scale: 1.3 }, { filter: 'blur(0px)', scale: 1.08, duration: 1.6, ease: 'expo.out' }, '-=.9')
    .from('.lens__reticle', { rotate: -45, scale: 1.3, opacity: 0, duration: 1.2 }, '<')
    .from('.hero .eyebrow', { y: 16, opacity: 0, duration: .7 }, .1)
    .fromTo('.hero__title .line', { opacity: 0, filter: 'blur(14px)', y: 20 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.3, stagger: .18, ease: 'expo.out' }, .2)
    .from('.hero__lead, .hero__cta, .hero__facts', { y: 24, opacity: 0, duration: .9, stagger: .1 }, .7)
    .from('.ring', { opacity: 0, duration: 1.4 }, .6)
    .from('.hero__badge', { x: -30, opacity: 0, duration: .8 }, 1.1);

  gsap.to('.hero__visual', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.lens__reticle', { rotate: 90, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* signature: eye chart comes into focus while pinned */
  var rows = $$('.chart__row'), dEl = $('[data-diopter]'), chartEl = $('.chart');
  var layers = rows.map(function (r) { return [$('.rs', r), $('.rb', r), -1]; });
  var state = { p: 0 }, lastTxt = '';
  function renderChart() {
    var n = rows.length;
    layers.forEach(function (l, i) {
      // each row starts sharpening a bit later; smaller rows stay blurry longer
      var local = Math.round(Math.min(1, Math.max(0, (state.p * (n + 2) - i) / 3)) * 100) / 100;
      if (local === l[2]) return;
      l[2] = local;
      l[0].style.opacity = local;
      l[1].style.opacity = 1 - local;
    });
    var v = -2.75 * (1 - state.p);
    var txt = (v < -0.004 ? '−' : '') + Math.abs(v).toFixed(2);
    if (txt !== lastTxt) { dEl.textContent = txt; lastTxt = txt; }
    var sharp = state.p > .97;
    if (sharp !== chartEl.classList.contains('is-sharp')) chartEl.classList.toggle('is-sharp', sharp);
  }
  renderChart();
  gsap.to(state, {
    p: 1, ease: 'none', onUpdate: renderChart,
    scrollTrigger: { trigger: '.chart__pin', start: 'top top', end: '+=' + Math.round(window.innerHeight * 1.1), pin: true, scrub: .6, anticipatePin: 1 }
  });
  gsap.from('.chart__board', { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.chart', start: 'top 75%' } });

  /* generic reveals */
  var revealSel = ['.sec-head > :not(h2)', '.chart__intro > *', '.step', '.shelf-head > *', '.coat', '.coat__txt', '.about__txt > :not(h2)', '.stats li', '.promo__in > *', '.faq details', '.cinfo li', '.socials', '.map', '.form', '.foot__in > *'];
  var revealEls = $$(revealSel.join(','));
  revealEls.forEach(function (el) { el.setAttribute('data-reveal', ''); });
  ScrollTrigger.batch(revealEls, {
    start: 'top 88%',
    once: true,
    onEnter: function (batch) {
      gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .08, overwrite: true });
    }
  });

  /* tiles: subtle image parallax */
  $$('.tile img').forEach(function (img) {
    gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* compare: handle sweeps once to show it is interactive */
  if (compare) {
    var sweep = { v: 50 };
    gsap.timeline({ scrollTrigger: { trigger: compare, start: 'top 65%', once: true } })
      .to(sweep, { v: 22, duration: .9, ease: 'power2.inOut', onUpdate: function () { setPos(sweep.v); range.value = sweep.v; } })
      .to(sweep, { v: 72, duration: 1.1, ease: 'power2.inOut', onUpdate: function () { setPos(sweep.v); range.value = sweep.v; } })
      .to(sweep, { v: 50, duration: .8, ease: 'power2.inOut', onUpdate: function () { setPos(sweep.v); range.value = sweep.v; } });
    gsap.from(compare, { clipPath: 'inset(12% 8% 12% 8% round 22px)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: compare, start: 'top 85%' } });
  }

  /* about: arch photo parallax */
  gsap.fromTo('.about__img img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* stats count-up */
  $$('[data-count]').forEach(function (el) {
    var to = +el.dataset.count, suf = el.dataset.suffix || '', o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: function () {
        gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString('uk-UA').replace(/\s/g, ' ') + suf; } });
      }
    });
  });

  /* marquee: GSAP loop that speeds up with scroll velocity */
  var track = $('.marquee__track');
  if (track) {
    track.style.animation = 'none';
    var loop = gsap.to(track, { xPercent: -50, duration: 32, ease: 'none', repeat: -1 });
    var settle;
    ScrollTrigger.create({
      trigger: '.promo', start: 'top bottom', end: 'bottom top',
      onUpdate: function (self) {
        var v = Math.min(5, 1 + Math.abs(self.getVelocity()) / 600);
        gsap.to(loop, { timeScale: v, duration: .2, overwrite: true });
        clearTimeout(settle);
        settle = setTimeout(function () { gsap.to(loop, { timeScale: 1, duration: 1.2, overwrite: true }); }, 200);
      }
    });
  }

  /* ---------- v2: more scroll motion ---------- */

  /* reading progress */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: .3 } });

  /* headings: words rise from a mask, italic words come into focus */
  function splitWords(h) {
    var out = [];
    Array.prototype.slice.call(h.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (t) {
          if (!t) return;
          if (/^\s+$/.test(t)) { out.push(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'w';
          var i = document.createElement('span'); i.textContent = t; w.appendChild(i); out.push(w);
        });
      } else if (n.nodeName === 'BR') {
        out.push(n.cloneNode());
      } else {
        var w2 = document.createElement('span'); w2.className = 'w';
        var i2 = document.createElement('span'); i2.appendChild(n.cloneNode(true)); w2.appendChild(i2); out.push(w2);
      }
    });
    h.textContent = '';
    out.forEach(function (n) { h.appendChild(n); });
  }
  $$('.sec-head h2, .about__txt h2, .contact h2, .promo h2').forEach(function (h) {
    splitWords(h);
    var words = $$('.w > span', h);
    var tl = gsap.timeline({ scrollTrigger: { trigger: h, start: 'top 86%', once: true } });
    tl.from(words, { yPercent: 115, rotate: 4, duration: 1, ease: 'power4.out', stagger: .06 });
    var ems = $$('em', h);
    if (ems.length) tl.fromTo(ems, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 1, ease: 'power2.out' }, .25);
  });

  /* hero: lens grows and drifts as you leave the first screen */
  gsap.to('.lens', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__text', { yPercent: -10, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

  /* steps: top rule draws, numbers count up */
  $$('.step').forEach(function (s, i) {
    gsap.fromTo(s, { '--rule': 0 }, { '--rule': 1, duration: 1.2, delay: i * .12, ease: 'power3.inOut', scrollTrigger: { trigger: '.steps', start: 'top 85%', once: true } });
  });

  /* services: stacked cards shrink and dim as the next one covers them */
  var cards = $$('.svc-card');
  cards.forEach(function (c, i) {
    var img = $('.svc-card__img img', c);
    gsap.fromTo(img, { scale: 1.25 }, { scale: 1.02, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'top 20%', scrub: true } });
    gsap.from($$('.svc-card__txt > *', c), { y: 40, opacity: 0, duration: .9, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 75%', once: true } });
    if (i === cards.length - 1) return;
    var shade = document.createElement('div'); shade.className = 'svc-card__shade'; c.appendChild(shade);
    var st = { trigger: cards[i + 1], start: 'top bottom', end: 'top ' + (96 + (i + 1) * 16) + 'px', scrub: true };
    gsap.fromTo(c, { scale: 1 }, { scale: 1 - (cards.length - i) * 0.03, ease: 'none', force3D: true, scrollTrigger: st });
    gsap.fromTo(shade, { opacity: 0 }, { opacity: .14, ease: 'none', scrollTrigger: st });
  });

  /* catalogue tiles: shutter (clip-path) reveal */
  ScrollTrigger.batch('.tile', {
    start: 'top 88%', once: true,
    onEnter: function (b) {
      gsap.fromTo(b, { clipPath: 'inset(100% 0% 0% 0% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.2, ease: 'expo.out', stagger: .1, clearProps: 'clipPath' });
      gsap.fromTo(b.map(function (t) { return $('.tile__cap', t); }), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .9, delay: .35, stagger: .1, ease: 'power3.out' });
    }
  });

  /* product shelf: cards fly in from the right; on desktop the shelf drifts with scroll */
  gsap.from('.prod', { x: 120, opacity: 0, rotate: 3, duration: 1, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: '.shelf', start: 'top 85%', once: true } });

  /* about: iris-opening photo reveal */
  // played once (not scrubbed) so the clip-path is painted only during a short reveal
  gsap.fromTo('.about__img', { clipPath: 'circle(8% at 50% 45%)' }, { clipPath: 'circle(75% at 50% 45%)', duration: 1.6, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: '.about', start: 'top 70%', once: true } });

  /* reviews: cards tilt into place */
  gsap.from('.rev', { y: 80, rotate: function (i) { return [-4, 3, -2][i % 3]; }, opacity: 0, duration: 1.1, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: '.rev-grid', start: 'top 80%', once: true } });

  /* lenses section: corners round in as it enters */
  gsap.fromTo('.lenses', { scale: .95 }, { scale: 1, ease: 'none', force3D: true, scrollTrigger: { trigger: '.lenses', start: 'top bottom', end: 'top 30%', scrub: true } });

  /* ---------- v3: decoration motion (transform / opacity / stroke only) ---------- */

  /* hand-drawn underline under the hero accent */
  $$('.scribble__svg path').forEach(function (p, i) {
    var L = p.getTotalLength ? p.getTotalLength() : 400;
    gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.1, delay: 1.1 + i * .25, ease: 'power2.inOut' });
  });

  /* marker highlights sweep in */
  $$('mark.hl').forEach(function (m) {
    ScrollTrigger.create({ trigger: m, start: 'top 85%', once: true, onEnter: function () { setTimeout(function () { m.classList.add('is-on'); }, 250); } });
  });

  /* hero orbits: slow spin + drift with scroll */
  gsap.to('.hero__orbits', { rotate: 360, duration: 90, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
  gsap.from('.hero__orbits', { scale: .8, opacity: 0, duration: 1.6, ease: 'expo.out', delay: .3 });

  /* giant outlined words slide sideways */
  $$('.bigword span').forEach(function (w, i) {
    gsap.fromTo(w, { xPercent: i % 2 ? -30 : 0 }, { xPercent: i % 2 ? 0 : -30, ease: 'none', scrollTrigger: { trigger: w.closest('section'), start: 'top bottom', end: 'bottom top', scrub: .5 } });
  });

  /* diopter ruler: ticks draw, marker slides to the end */
  $$('.ruler').forEach(function (r) {
    var ticks = $('.ruler__ticks', r), mark = $('.ruler__mark', r);
    gsap.fromTo(ticks, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'power3.inOut', scrollTrigger: { trigger: r, start: 'top 92%', once: true } });
    gsap.fromTo(mark, { x: 0 }, { x: function () { return Math.max(0, ticks.offsetWidth - mark.offsetWidth - 10); }, ease: 'none', scrollTrigger: { trigger: r, start: 'top 95%', end: 'top 35%', scrub: .5, invalidateOnRefresh: true } });
  });

  /* statement: words light up while you read */
  var sws = $$('.state__txt .sw');
  if (sws.length) {
    gsap.to(sws, { opacity: 1, ease: 'none', stagger: .1, scrollTrigger: { trigger: '.state', start: 'top 70%', end: 'bottom 60%', scrub: .4 } });
    gsap.fromTo('.state__rings', { rotate: -40, scale: .85 }, { rotate: 40, scale: 1.05, ease: 'none', transformOrigin: '50% 50%', scrollTrigger: { trigger: '.state', start: 'top bottom', end: 'bottom top', scrub: .5 } });
    gsap.from('.state__sign', { opacity: 0, x: -20, duration: .9, scrollTrigger: { trigger: '.state__sign', start: 'top 90%', once: true } });
  }

  /* line-art glasses draw themselves */
  var gPaths = $$('.glasses-art path');
  if (gPaths.length) {
    gPaths.forEach(function (p) { var L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); });
    gsap.to(gPaths, { strokeDashoffset: 0, duration: 1.6, stagger: .18, ease: 'power2.inOut', scrollTrigger: { trigger: '.about', start: 'top 70%', once: true } });
    gsap.to('.glasses-art', { y: -30, rotate: -4, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: .6 } });
  }

  /* custom cursor (desktop with mouse only) */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.documentElement.classList.add('has-cursor');
    var cur = $('.cursor'), curLbl = $('span', cur);
    var qx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' }), qy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
    window.addEventListener('pointermove', function (e) { qx(e.clientX); qy(e.clientY); });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest('.svc-card__img, .tile, .compare, .prod img');
      cur.classList.toggle('is-big', !!t);
      if (t) curLbl.textContent = t.classList.contains('compare') ? 'Тягніть' : t.classList.contains('tile') ? 'Обрати' : 'Відкрити';
    });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
