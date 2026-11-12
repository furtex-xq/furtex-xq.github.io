/* The Hustle Gym Zone — demo, Ansaro Technologies */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PHONE = '+380992219995';
  const fmt = n => n.toLocaleString('uk-UA').replace(/ /g, ' ');

  /* nav */
  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const burger = $('.burger'), mnav = $('#mnav');
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    mnav.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', mnav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* open now (Kyiv time). Пн–Сб 07–22, Нд 09–20 */
  const HOURS = { 0: [9, 20], 1: [7, 22], 2: [7, 22], 3: [7, 22], 4: [7, 22], 5: [7, 22], 6: [7, 22] };
  const kyivNow = () => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
    return { wd, h: (+g('hour') % 24) + (+g('minute')) / 60 };
  };
  const pad = h => String(h).padStart(2, '0') + ':00';
  const updateStatus = () => {
    let { wd, h } = { wd: new Date().getDay(), h: new Date().getHours() };
    try { ({ wd, h } = kyivNow()); } catch (e) {}
    const [o, c] = HOURS[wd];
    const open = h >= o && h < c;
    let text;
    if (open) text = `Відкрито до ${pad(c)}`;
    else if (h < o) text = `Зачинено · відкриємось о ${pad(o)}`;
    else text = `Зачинено · завтра з ${pad(HOURS[(wd + 1) % 7][0])}`;
    $$('[data-status]').forEach(el => {
      el.classList.toggle('is-open', open); el.classList.toggle('is-closed', !open);
      $('b', el).textContent = text;
    });
    $$('.hours tr').forEach(tr => tr.classList.toggle('is-today', tr.dataset.days.split(',').includes(String(wd))));
  };
  updateStatus(); setInterval(updateStatus, 60000);

  /* barbell configurator */
  const PLANS = {
    1: { total: 1700, plates: [25] },
    3: { total: 4400, plates: [25, 20] },
    6: { total: 8000, plates: [25, 20, 15] },
    12: { total: 12000, plates: [25, 20, 15, 10] }
  };
  // competition (IWF) plate colours: 25 red, 20 blue, 15 yellow, 10 green
  const PLATE = { 25: { h: 196, w: 26, c: '#d7262e' }, 20: { h: 196, w: 22, c: '#1f5fd1' }, 15: { h: 168, w: 20, c: '#ffd400' }, 10: { h: 140, w: 18, c: '#1d9a52' } };
  const NS = 'http://www.w3.org/2000/svg';
  const gL = $('.plates--l'), gR = $('.plates--r');
  const drawPlates = (list, animate) => {
    [gL, gR].forEach(g => g.replaceChildren());
    let xl = 150, xr = 490;
    list.forEach((kg, i) => {
      const p = PLATE[kg];
      const mk = (x, side) => {
        const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'plate');
        const r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', x); r.setAttribute('y', 110 - p.h / 2); r.setAttribute('width', p.w); r.setAttribute('height', p.h); r.setAttribute('rx', 3); r.setAttribute('fill', p.c);
        g.appendChild(r);
        (side === 'l' ? gL : gR).appendChild(g);
        if (animate && window.gsap && !reduce) gsap.from(g, { x: side === 'l' ? -60 : 60, opacity: 0, duration: .45, delay: i * .06, ease: 'back.out(1.6)' });
      };
      xl -= p.w + 2; mk(xl, 'l');
      mk(xr, 'r'); xr += p.w + 2;
    });
  };
  const setPlan = (m, animate = true) => {
    const plan = PLANS[m];
    const per = Math.round(plan.total / m);
    const save = 1700 * m - plan.total;
    const kg = 20 + 2 * plan.plates.reduce((a, b) => a + b, 0);
    $('[data-total]').textContent = fmt(plan.total);
    $('[data-per]').textContent = fmt(per);
    $('[data-save]').textContent = fmt(save);
    $('[data-kg]').textContent = kg;
    const cta = $('[data-pick-dyn]');
    cta.textContent = `Записатися на безліміт ${m} міс`;
    cta.dataset.pick = `Безліміт ${m} міс`;
    $$('.seg button').forEach(b => b.setAttribute('aria-checked', b.dataset.m == m));
    drawPlates(plan.plates, animate);
  };
  const seg = $$('.seg button');
  seg.forEach((b, i) => {
    b.addEventListener('click', () => setPlan(+b.dataset.m));
    b.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return; e.preventDefault();
      const n = seg[(i + d + seg.length) % seg.length]; n.focus(); n.click();
    });
  });
  setPlan(1, false);

  /* preselect in form */
  const sel = $('select[name=what]');
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-pick]');
    if (!a) return;
    const want = a.dataset.pick;
    const opt = [...sel.options].find(o => o.text === want || o.text.startsWith(want));
    if (opt) sel.value = opt.value;
  });

  /* form */
  const form = $('#signup'), msg = $('.form__msg', form);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(form);
    const name = (f.get('name') || '').trim(), phone = (f.get('phone') || '').trim();
    const okPhone = phone.replace(/\D/g, '').length >= 9;
    form.name.setAttribute('aria-invalid', !name);
    form.phone.setAttribute('aria-invalid', !okPhone);
    if (!name || !okPhone) {
      msg.className = 'form__msg err';
      msg.textContent = !name ? 'Вкажіть, будь ласка, ім\'я.' : 'Перевірте номер телефону.';
      (!name ? form.name : form.phone).focus();
      return;
    }
    const when = (f.get('when') || '').trim();
    const text = `Заявка з сайту Hustle Gym\nІм'я: ${name}\nТелефон: ${phone}\nЦікавить: ${f.get('what')}` + (when ? `\nКоли зручно: ${when}` : '');
    msg.className = 'form__msg';
    msg.textContent = 'Дякуємо. Відкриваємо повідомлення для залу, залишилось натиснути «Надіслати».';
    location.href = `sms:${PHONE}?body=${encodeURIComponent(text)}`;
  });

  /* year */
  $('[data-year]').textContent = new Date().getFullYear();

  /* motion */
  const init = () => {
    if (reduce || !window.gsap) { $$('.reveal').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; }); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      const lenis = new Lenis({ lerp: .12 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
        const id = a.getAttribute('href'); if (id.length < 2) return;
        const t = $(id); if (!t) return; e.preventDefault(); lenis.scrollTo(t, { offset: -70 });
      }));
    }
    // hero: poster slams in, photo straightens and the sticker spins as you scroll (signature with the barbell)
    gsap.from('[data-word]', { y: 60, opacity: 0, duration: .9, ease: 'power4.out' });
    gsap.from('.hero__sub, .hero__lead, .hero__cta', { y: 24, opacity: 0, duration: .7, stagger: .08, delay: .2, ease: 'power3.out' });
    gsap.from('[data-photo]', { rotate: -9, x: 60, opacity: 0, duration: 1, delay: .15, ease: 'back.out(1.4)' });
    gsap.from('.sticker', { scale: 0, rotate: -120, duration: .7, delay: .7, ease: 'back.out(2)' });
    gsap.to('[data-photo]', { rotate: 0, yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.sticker', { rotate: 40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    ScrollTrigger.batch('.reveal', { start: 'top 88%', once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: .8, stagger: .09, ease: 'power3.out' }) });
    // barbell lifts when the rack enters
    ScrollTrigger.create({ trigger: '.rack', start: 'top 75%', once: true, onEnter: () => gsap.fromTo('.bar', { y: 30, rotate: -2 }, { y: 0, rotate: 0, duration: 1, ease: 'elastic.out(1,.6)' }) });
  };
  if (document.readyState === 'complete') init(); else addEventListener('load', init);
})();
