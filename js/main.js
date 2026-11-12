(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.remove('no-js');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var motion = hasGsap && !reduce;
  var lenis = null;
  var top = document.querySelector('.top');

  /* Some embedded viewers scroll <body> instead of the window; support both */
  var bodyScroller = (function () {
    var b = document.body, cs = getComputedStyle(b);
    return ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && b.scrollHeight > b.clientHeight + 2 &&
      document.documentElement.scrollHeight <= window.innerHeight + 2) ? b : null;
  })();
  var scrollTarget = bodyScroller || window;
  function getY() { return bodyScroller ? bodyScroller.scrollTop : window.scrollY; }
  function maxY() { return bodyScroller ? bodyScroller.scrollHeight - bodyScroller.clientHeight : document.documentElement.scrollHeight - window.innerHeight; }
  var HEADER = 68;

  /* ---------- fallback for broken stock photos: keep the stone texture ---------- */
  document.querySelectorAll('img[data-ph]').forEach(function (img) {
    img.addEventListener('error', function () { img.remove(); });
  });

  /* ---------- smooth scroll (Lenis) ---------- */
  if (motion && window.Lenis && !bodyScroller) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(el) {
    if (lenis) lenis.scrollTo(el, { offset: -HEADER + 1, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    setMenu(false);
    scrollToTarget(el);
    if (id === '#zayavka') setTimeout(function () { el.querySelector('input').focus({ preventScroll: true }); }, lenis ? 1400 : 600);
  });

  /* ---------- header: solid after the top, hides while scrolling down ---------- */
  var lastY = 0;
  var heroIn = true;
  function onScroll() {
    var y = getY();
    top.classList.toggle('is-solid', y > 40 || !heroIn);
    var menuOpen = top.classList.contains('menu-open');
    top.classList.toggle('is-hidden', !menuOpen && y > 400 && y > lastY + 2);
    if (y < lastY - 2 || y <= 400) top.classList.remove('is-hidden');
    lastY = y;
  }
  onScroll();
  scrollTarget.addEventListener('scroll', onScroll, { passive: true });
  // Independent of the scroll container: the header turns solid once the hero is out of view
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      heroIn = en[0].isIntersecting;
      top.classList.toggle('is-solid', !heroIn || getY() > 40);
      document.querySelector('.dock').classList.toggle('is-on', !heroIn);
    }, { rootMargin: '-70% 0px 0px 0px' }).observe(document.querySelector('.hero'));
  }

  /* ---------- mobile menu ---------- */
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    nav.classList.toggle('is-open', open);
    top.classList.toggle('menu-open', open);
    if (open) top.classList.remove('is-hidden');
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---------- gallery filter (animated with Flip when available) ---------- */
  var chips = document.querySelectorAll('#roboty .chip');
  var cells = document.querySelectorAll('.gallery .ph');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-f');
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', String(on));
      });
      var state = motion && window.Flip ? Flip.getState(cells) : null;
      cells.forEach(function (cell) {
        cell.classList.toggle('is-hidden', f !== 'all' && cell.getAttribute('data-c') !== f);
      });
      if (state) {
        Flip.from(state, {
          duration: 0.7, ease: 'power3.inOut', absolute: true, scale: true,
          onEnter: function (els) { return gsap.fromTo(els, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6 }); },
          onLeave: function (els) { return gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.4 }); },
          onComplete: function () { ScrollTrigger.refresh(); }
        });
      }
    });
  });

  /* ---------- product catalogue: filter + "order" buttons fill in the form ---------- */
  var cchips = document.querySelectorAll('[data-cf]');
  var prods = document.querySelectorAll('.prod');
  cchips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-cf');
      cchips.forEach(function (c) { var on = c === chip; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
      var state = motion && window.Flip ? Flip.getState(prods) : null;
      prods.forEach(function (pr) { pr.classList.toggle('is-hidden', f !== 'all' && pr.getAttribute('data-cat') !== f); });
      if (state) {
        Flip.from(state, {
          duration: 0.7, ease: 'power3.inOut', absolute: true,
          onEnter: function (els) { return gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }); },
          onLeave: function (els) { return gsap.to(els, { opacity: 0, duration: 0.3 }); },
          onComplete: function () { ScrollTrigger.refresh(); }
        });
      }
    });
  });
  document.querySelectorAll('.prod__buy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = document.getElementById('zayavka');
      var kind = btn.getAttribute('data-kind');
      Array.prototype.forEach.call(f.elements.kind.options, function (o) { if (o.text === kind) o.selected = true; });
      var price = btn.parentNode.querySelector('.prod__price').textContent.replace(/\s+/g, ' ').trim();
      f.elements.msg.value = 'Цікавить: ' + btn.getAttribute('data-product') + ' (' + price + ')';
      scrollToTarget(f);
      setTimeout(function () { f.elements.name.focus({ preventScroll: true }); }, lenis ? 1400 : 600);
    });
  });

  /* ---------- scroll progress + mobile contact dock ---------- */
  var prog = document.querySelector('.progress span');
  var dock = document.querySelector('.dock');
  function onProgress() {
    var max = maxY();
    prog.style.transform = 'scaleX(' + (max > 0 ? getY() / max : 0) + ')';
    if (getY() > window.innerHeight * 0.6) dock.classList.add('is-on');
  }
  onProgress();
  scrollTarget.addEventListener('scroll', onProgress, { passive: true });

  /* ---------- mobile catalogue progress (native swipe) ---------- */
  var hsView = document.querySelector('.hs__view');
  var hsBar = document.querySelector('.hs__bar span');
  var hsN = document.querySelector('.hs__n');
  var hsTotal = document.querySelectorAll('.hs__track .card').length;
  function setHs(p) {
    hsBar.style.transform = 'scaleX(' + p + ')';
    var n = Math.min(hsTotal, Math.round(p * (hsTotal - 1)) + 1);
    hsN.textContent = (n < 10 ? '0' : '') + n;
  }
  function nativeBar() {
    var max = hsView.scrollWidth - hsView.clientWidth;
    setHs(max > 0 ? hsView.scrollLeft / max : 0);
  }
  hsView.addEventListener('scroll', nativeBar, { passive: true });
  nativeBar();

  /* ---------- request form ---------- */
  var form = document.getElementById('zayavka');
  var status = form.querySelector('.form__status');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name, phone = form.elements.phone;
    var okName = name.value.trim().length > 1;
    var okPhone = phone.value.replace(/\D/g, '').length >= 9;
    name.setAttribute('aria-invalid', String(!okName));
    phone.setAttribute('aria-invalid', String(!okPhone));
    if (!okName || !okPhone) {
      status.textContent = !okName ? 'Вкажіть, будь ласка, ваше ім\'я.' : 'Вкажіть номер телефону, щоб ми могли передзвонити.';
      (!okName ? name : phone).focus();
      return;
    }
    // Static hosting: open a pre-filled email. In production this goes to a Telegram bot or form service.
    var body = 'Ім\'я: ' + name.value.trim() +
      '\nТелефон: ' + phone.value.trim() +
      '\nЩо потрібно: ' + form.elements.kind.value +
      (form.elements.msg.value.trim() ? '\nКоментар: ' + form.elements.msg.value.trim() : '');
    window.location.href = 'mailto:grand-granit@ukr.net?subject=' +
      encodeURIComponent('Заявка з сайту: ' + form.elements.kind.value) +
      '&body=' + encodeURIComponent(body);
    status.textContent = 'Дякуємо! Відкрили лист із вашою заявкою. Надішліть його, і ми передзвонимо.';
    form.reset();
  });

  var years = new Date().getFullYear() - 2008;
  document.querySelectorAll('[data-count="since2008"]').forEach(function (el) { el.setAttribute('data-count', years); el.textContent = years; });

  var y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();

  if (!motion) {
    doc.classList.remove('has-loader');
    document.querySelectorAll('.hl').forEach(function (m) { m.classList.add('is-on'); });
    document.querySelector('.hs').classList.add('is-static');
    return;
  }

  /* ======================= GSAP animations ======================= */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  if (bodyScroller) ScrollTrigger.defaults({ scroller: bodyScroller });
  if (window.Flip) gsap.registerPlugin(Flip);

  /* 1. Hero: the headline is carved letter by letter, then the slab gets polished */
  var chars = [];
  document.querySelectorAll('[data-split]').forEach(function (line) {
    var text = line.textContent.trim();
    line.setAttribute('aria-hidden', 'true');
    line.textContent = '';
    line.classList.add('is-split');
    text.split(' ').forEach(function (w, wi, arr) {
      var word = document.createElement('span');
      word.className = 'word';
      w.split('').forEach(function (ch) {
        var c = document.createElement('span');
        c.className = 'char';
        c.textContent = ch;
        word.appendChild(c);
        chars.push(c);
      });
      line.appendChild(word);
      if (wi < arr.length - 1) line.appendChild(document.createTextNode(' '));
    });
  });
  var h1 = document.getElementById('hero-title');
  h1.setAttribute('aria-label', 'Ми вміємо творити красу з натурального каменю');

  var intro = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } });
  intro
    .from(chars, { yPercent: 115, rotate: 6, duration: 1.1, stagger: 0.035 }, 0.15)
    .from('.hero [data-hero]', { y: 24, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.7)
    .from('.hero__photo', { opacity: 0, scale: 1.08, duration: 2.2, ease: 'power2.out' }, 0)
    .fromTo('.hero__sheen', { xPercent: -45 }, { xPercent: 45, duration: 2.6, ease: 'power2.inOut' }, 0.9);

  // Intro loader: a counter runs to 100, then the slab lifts away and the headline is carved
  if (doc.classList.contains('has-loader')) {
    if (lenis) lenis.stop();
    var counter = { v: 0 };
    var nEl = document.querySelector('.loader__n');
    gsap.timeline({
      onComplete: function () {
        doc.classList.remove('has-loader');
        try { sessionStorage.setItem('gg-intro', '1'); } catch (e) {}
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      }
    })
      .to(counter, { v: 100, duration: 1.5, ease: 'power2.inOut', onUpdate: function () { nEl.textContent = Math.round(counter.v); } }, 0)
      .fromTo('.loader__bar span', { scaleX: 0 }, { scaleX: 1, duration: 1.5, ease: 'power2.inOut' }, 0)
      .to('.loader__in', { y: -30, opacity: 0, duration: 0.5, ease: 'power2.in' }, 1.6)
      .to('.loader', { yPercent: -100, duration: 1, ease: 'power4.inOut' }, 1.9)
      .add(function () { intro.play(); }, 2.2);
  } else {
    intro.play();
  }

  // Hero parallax on the way out
  gsap.to('.hero__bg', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__photo img', { yPercent: 8, scale: 1.14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__in', { y: -80, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* 2. Generic reveals */
  gsap.utils.toArray('[data-reveal]').forEach(function (el) {
    gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  gsap.utils.toArray('[data-stagger]').forEach(function (list) {
    gsap.from(list.children, { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, scrollTrigger: { trigger: list, start: 'top 85%', once: true } });
  });

  /* 3. Direction tiles: the photo is uncovered like a slab being lifted */
  gsap.utils.toArray('[data-wipe]').forEach(function (tile, i) {
    var media = tile.querySelector('.way__media');
    var tl = gsap.timeline({ scrollTrigger: { trigger: tile, start: 'top 80%', once: true } });
    tl.fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut', delay: i * 0.12 })
      .from(media.firstElementChild, { scale: 1.3, duration: 1.6, ease: 'power3.out' }, '<')
      .from(tile.querySelector('.way__body').children, { y: 24, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' }, '-=0.8');
  });

  /* 4. Interior catalogue: pinned horizontal scroll on desktop */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 981px)', function () {
    var section = document.querySelector('.hs');
    var track = document.querySelector('.hs__track');
    hsView.style.overflow = 'visible';
    function dist() { return Math.max(0, track.scrollWidth - window.innerWidth); }
    var tween = gsap.to(track, {
      x: function () { return -dist(); },
      ease: 'none',
      scrollTrigger: {
        trigger: section, start: 'top top', end: function () { return '+=' + dist(); },
        pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: function (self) { setHs(self.progress); }
      }
    });
    gsap.utils.toArray('.card__img img').forEach(function (img) {
      gsap.fromTo(img, { xPercent: -6 }, {
        xPercent: 6, ease: 'none',
        scrollTrigger: { trigger: img.parentNode, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
      });
    });
    return function () { hsView.style.overflow = ''; };
  });
  mm.add('(max-width: 980px)', function () {
    gsap.from('.card', { y: 40, opacity: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.hs__track', start: 'top 85%', once: true } });
  });

  /* 5. Materials: the stone slides slowly behind its frame */
  gsap.utils.toArray('[data-parallax]').forEach(function (slab) {
    gsap.fromTo(slab, { yPercent: -10 }, { yPercent: 10, ease: 'none', force3D: true, scrollTrigger: { trigger: slab.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* 6. Process: a bronze line is drawn through the steps */
  var steps = gsap.utils.toArray('.steps li');
  var stl = gsap.timeline({ scrollTrigger: { trigger: '.steps-wrap', start: 'top 80%', end: 'bottom 55%', scrub: 0.8 } });
  stl.fromTo('.steps__line span', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0);
  steps.forEach(function (li, i) {
    stl.from(li, { opacity: 0.15, y: 20, duration: 0.25, ease: 'power2.out' }, i * 0.22);
  });

  /* 7. About: the timeline line grows and each year appears as it is reached */
  gsap.fromTo('.timeline__line span', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 75%', end: 'bottom 60%', scrub: 0.8 } });
  gsap.utils.toArray('[data-tl]').forEach(function (li) {
    gsap.from(li, { x: -20, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 82%', once: true } });
  });

  /* 8. Delivery ticker: steady drift that speeds up with scroll velocity */
  var trackT = document.querySelector('.ticker__track');
  trackT.style.animation = 'none';
  var drift = gsap.to(trackT, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
  ScrollTrigger.create({
    trigger: '.ticker', start: 'top bottom', end: 'bottom top',
    onUpdate: function (self) {
      var v = Math.min(Math.abs(self.getVelocity()) / 300, 6);
      gsap.to(drift, { timeScale: 1 + v, duration: 0.2, overwrite: true });
      gsap.to(drift, { timeScale: 1, duration: 1.2, delay: 0.2, ease: 'power2.out' });
    }
  });

  /* 10. Section headings rise word by word out of a mask */
  // split into masked words but keep <em> accents (italic bronze words)
  function wrapWords(h) {
    var out = [];
    h.childNodes.forEach(function (n) {
      var isEm = n.nodeType === 1 && n.tagName === 'EM';
      var txt = n.textContent;
      txt.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { out.push(' '); return; }
        out.push('<span class="word" aria-hidden="true"><span class="w">' + (isEm ? '<em>' + w + '</em>' : w) + '</span></span>');
      });
    });
    return out.join('').replace(/\s+/g, ' ');
  }
  gsap.utils.toArray('main .h2, .foot__title').forEach(function (h) {
    h.setAttribute('aria-label', h.textContent.trim().replace(/\s+/g, ' '));
    h.innerHTML = wrapWords(h);
    gsap.from(h.querySelectorAll('.w'), { yPercent: 110, duration: 1, ease: 'power4.out', stagger: 0.06, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });
  gsap.utils.toArray('.eyebrow').forEach(function (e) {
    gsap.from(e, { opacity: 0, x: -16, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: e, start: 'top 90%', once: true } });
  });

  /* 11. Catalogue cards lift in like slabs being set upright */
  gsap.set('.prods', { perspective: 900 });
  ScrollTrigger.batch('.prod', {
    start: 'top 90%', once: true,
    onEnter: function (batch) {
      gsap.fromTo(batch, { opacity: 0, y: 60, rotateX: -14, transformOrigin: '50% 100%' }, { opacity: 1, y: 0, rotateX: 0, duration: 1, ease: 'power3.out', stagger: 0.08, clearProps: 'transform' });
    }
  });

  /* 12. Footer: contact tiles stagger in, big outlined wordmark rises */
  gsap.from('.links li', { y: 30, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.links', start: 'top 88%', once: true } });
  gsap.fromTo('.foot__mark', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.foot__mark', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* 13. Typography: highlighted phrases get their bronze underline, ornaments draw open */
  gsap.utils.toArray('.hl').forEach(function (m) {
    ScrollTrigger.create({ trigger: m, start: 'top 82%', once: true, onEnter: function () { m.classList.add('is-on'); } });
  });
  gsap.utils.toArray('.orn').forEach(function (o) {
    var tl = gsap.timeline({ scrollTrigger: { trigger: o, start: 'top 90%', once: true } });
    tl.from(o.querySelectorAll('span'), { scaleX: 0, duration: 1.1, ease: 'power3.inOut' }, 0)
      .from(o.querySelector('i'), { scale: 0, rotate: -135, duration: 0.8, ease: 'back.out(2)' }, 0.35);
  });

  /* 14. Quote: words light up one by one as you scroll through it */
  gsap.utils.toArray('[data-words]').forEach(function (q) {
    q.setAttribute('aria-label', q.textContent.trim());
    var html = [];
    q.childNodes.forEach(function (n) {
      var isEm = n.nodeType === 1 && n.tagName === 'EM';
      n.textContent.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { html.push(' '); return; }
        html.push('<span class="qw" aria-hidden="true">' + (isEm ? '<em>' + w + '</em>' : w) + '</span>');
      });
    });
    q.innerHTML = html.join('');
    var ws = q.querySelectorAll('.qw');
    q.querySelectorAll('.qw').forEach(function (w) { w.style.transition = 'none'; });
    gsap.to(ws, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: q, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 } });
  });

  /* 9. Figures count up when they come into view */
  gsap.utils.toArray('[data-count]').forEach(function (el) {
    var end = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (!end) return;
    var o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: function () { el.textContent = Math.round(o.v); } });
  });
  gsap.from('.stats__in li', { y: 30, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.stats', start: 'top 85%', once: true } });

  /* keep measurements right once fonts and photos are in */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
