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

  /* ================= animations ================= */
  if (!anim) {
    $$('.chart__row').forEach(function (r) { r.style.setProperty('--b', 0); });
    $('.chart').classList.add('is-sharp');
    var d = $('[data-diopter]'); if (d) d.textContent = '0.00';
    return;
  }

  document.documentElement.classList.add('js-anim');
  gsap.registerPlugin(ScrollTrigger);

  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
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
  var rows = $$('.chart__row'), dEl = $('[data-diopter]');
  var state = { p: 0 };
  function renderChart() {
    var n = rows.length;
    rows.forEach(function (r, i) {
      // each row starts sharpening a bit later; smaller rows stay blurry longer
      var local = Math.min(1, Math.max(0, (state.p * (n + 2) - i) / 3));
      r.style.setProperty('--b', ((1 - local) * (6 + i * 1.6)).toFixed(2));
    });
    var v = -2.75 * (1 - state.p);
    dEl.textContent = (v < -0.004 ? '−' : '') + Math.abs(v).toFixed(2);
    $('.chart').classList.toggle('is-sharp', state.p > .97);
  }
  renderChart();
  gsap.to(state, {
    p: 1, ease: 'none', onUpdate: renderChart,
    scrollTrigger: { trigger: '.chart__pin', start: 'top top', end: '+=' + Math.round(window.innerHeight * 1.1), pin: true, scrub: .6, anticipatePin: 1 }
  });
  gsap.from('.chart__board', { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.chart', start: 'top 75%' } });

  /* generic reveals */
  var revealSel = ['.sec-head > *', '.chart__intro > *', '.step', '.tile', '.shelf-head > *', '.prod', '.coat', '.coat__txt', '.about__txt > *', '.stats li', '.promo__in > *', '.rev', '.faq details', '.cinfo li', '.socials', '.map', '.form', '.foot__in > *'];
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

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
