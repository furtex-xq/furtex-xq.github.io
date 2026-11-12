/* Експресія — інтерактив сайту */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* ---- години роботи: «зараз відчинено» за київським часом ---- */
  const HOURS = { 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [10, 15], 0: null };
  const DAYS = ['неділю', 'понеділок', 'вівторок', 'середу', 'четвер', "п'ятницю", 'суботу'];
  function kyivNow() {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
    return { wd, h: +g('hour') % 24 + +g('minute') / 60 };
  }
  function status() {
    const { wd, h } = kyivNow();
    const t = HOURS[wd];
    if (t && h >= t[0] && h < t[1]) return { open: true, text: `Зараз відчинено, до ${t[1]}:00` };
    let d = wd, add = 0;
    if (t && h < t[0]) return { open: false, text: `Зачинено, відкриємось сьогодні о ${t[0]}:00` };
    do { d = (d + 1) % 7; add++; } while (!HOURS[d]);
    const when = add === 1 ? 'завтра' : `у ${DAYS[d]}`;
    return { open: false, text: `Зачинено, відкриємось ${when} о ${HOURS[d][0]}:00` };
  }
  try {
    const s = status();
    $$('[data-status],[data-open]').forEach(el => { el.textContent = s.text; el.classList.add(s.open ? 'is-open' : 'is-closed'); });
    const today = $(`[data-hours] tr[data-d="${kyivNow().wd}"]`);
    today && today.classList.add('is-today');
  } catch (e) { /* старі браузери: залишаємо статичний текст */ }

  /* ---- шапка, меню ---- */
  const top = $('.top'), burger = $('.burger'), drawer = $('#drawer'), dock = $('.dock');
  const onScroll = () => {
    top.classList.toggle('is-solid', scrollY > 30);
    dock && dock.classList.toggle('is-on', scrollY > innerHeight * 0.6);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open); drawer.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(drawer.hidden));
  $$('a', drawer).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) setMenu(false); });

  /* ---- hero: фото «проявляється» ---- */
  const heroImg = $('.print__img'), dev = $('[data-dev]');
  const startDev = () => {
    heroImg.classList.add('is-dev');
    if (reduce) { dev.textContent = 100; return; }
    const t0 = performance.now();
    const tick = now => { const k = Math.min(1, (now - t0 - 300) / 2600); dev.textContent = Math.max(0, Math.round(k * 100)); if (k < 1) requestAnimationFrame(tick); else dev.parentNode.textContent = 'готово · 100%'; };
    requestAnimationFrame(tick);
  };
  heroImg.complete ? startDev() : heroImg.addEventListener('load', startDev, { once: true });
  heroImg.addEventListener('error', startDev, { once: true });

  /* ---- послуги: акордеон + фото-підглядання ---- */
  const peek = $('.svc__peek'), peekImg = peek && $('img', peek), list = $('[data-svc]');
  $$('.svc__item').forEach(item => {
    const btn = $('.svc__row', item);
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      $$('.svc__item.is-open').forEach(o => { o.classList.remove('is-open'); $('.svc__row', o).setAttribute('aria-expanded', false); });
      item.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open);
    });
    item.addEventListener('mouseenter', () => { if (peekImg) { peekImg.src = item.dataset.img; peek.classList.add('is-on'); } });
  });
  if (list && peek && matchMedia('(hover:hover)').matches) {
    list.addEventListener('mouseleave', () => peek.classList.remove('is-on'));
    list.addEventListener('mousemove', e => {
      const r = list.parentNode.getBoundingClientRect();
      peek.style.left = (e.clientX - r.left - 130) + 'px';
      peek.style.top = (e.clientY - r.top - 170) + 'px';
      peek.style.transform = '';
    });
    $$('.svc__item').forEach(i => { const im = new Image(); im.src = i.dataset.img; });
  }

  /* ---- фото на документи ---- */
  const frame = $('.frame'), photo = $('[data-photo]');
  $$('[data-chips] button').forEach(b => b.addEventListener('click', () => {
    $$('[data-chips] button').forEach(x => x.setAttribute('aria-selected', x === b));
    const w = +b.dataset.w, h = +b.dataset.h;
    frame.classList.toggle('is-other', !w);
    if (w) { photo.style.setProperty('--w', w); photo.style.setProperty('--h', h); }
    else { photo.style.removeProperty('--w'); photo.style.removeProperty('--h'); }
    const cm = n => String(n / 10).replace('.', ',');
    $('[data-size]').textContent = w ? `${cm(w)} × ${cm(h)}` : '? × ?';
    $('[data-dw]').textContent = w ? `${w} мм` : '';
    $('[data-dh]').textContent = w ? `${h} мм` : '';
    $('[data-note]').textContent = b.dataset.t;
  }));

  /* ---- реставрація: до / після ---- */
  const ba = $('[data-ba]');
  if (ba) {
    const r = $('.ba__range', ba);
    r.addEventListener('input', () => ba.style.setProperty('--pos', r.value + '%'));
  }

  /* ---- форма ---- */
  const form = $('[data-form]');
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    ['name', 'phone'].forEach(n => {
      const f = form.elements[n];
      const bad = n === 'phone' ? f.value.replace(/\D/g, '').length < 9 : !f.value.trim();
      f.classList.toggle('is-err', bad); f.setAttribute('aria-invalid', bad); if (bad) ok = false;
    });
    if (!ok) { form.querySelector('.is-err').focus(); return; }
    const d = Object.fromEntries(new FormData(form));
    const okEl = $('[data-ok]');
    okEl.hidden = false;
    okEl.textContent = `Дякуємо, ${d.name}! Ми передзвонимо на ${d.phone} у робочий час. (Демо: після запуску заявки приходитимуть адміністратору в Telegram.)`;
    form.reset();
  });
  $('[data-year]').textContent = new Date().getFullYear();

  /* ---- плавний скрол + анімації появи ---- */
  if (reduce || !window.gsap) return;
  const lenis = window.Lenis ? new Lenis({ lerp: 0.12 }) : null;
  gsap.registerPlugin(ScrollTrigger);
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'); if (id.length < 2) return;
      const t = $(id); if (!t) return; e.preventDefault(); lenis.scrollTo(t, { offset: -70 });
    }));
  }
  gsap.from('.hero__title .line', { yPercent: 60, opacity: 0, duration: 1.1, stagger: .12, ease: 'power3.out' });
  gsap.from('.hero__lead, .hero__cta, .hero__facts', { y: 24, opacity: 0, duration: .9, stagger: .1, delay: .35, ease: 'power2.out' });
  $$('.sec-head, .docs__intro, .frame, .restore__text, .ba, .about__img, .about__text, .rev blockquote, .contacts__info, .form').forEach(el => el.setAttribute('data-r', ''));
  ScrollTrigger.batch('[data-r]', { start: 'top 88%', once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: .9, stagger: .1, ease: 'power2.out' }) });
  gsap.from('.svc__item', { scrollTrigger: { trigger: '.svc', start: 'top 85%' }, y: 30, opacity: 0, duration: .7, stagger: .06, ease: 'power2.out' });
  gsap.to('.print', { scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }, rotate: -2, y: 60 });
})();
