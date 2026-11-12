(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const PHONE = '+380987538642';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- rooms ---------- */
  const COMMON = ['Власна ванна з душем', 'Фен і рушники', 'Smart TV', 'Wi‑Fi', 'Кава й чай', 'Щоденне прибирання'];
  const ROOMS = [
    { no: '01', key: 'Бюджет', title: 'Бюджетний двомісний', desc: 'Компактний номер з двома окремими ліжками. Ідеально для мандрівників і відряджень: виспатися, прийняти душ і знову в дорогу.',
      specs: [['i-users', 'до 2 гостей'], ['i-bed', '2 окремі ліжка']], inc: COMMON,
      img: ['r-budget', 'r-budget2', 'bath'] },
    { no: '02', key: 'Двомісний', title: 'Двомісний номер', desc: 'Найпопулярніший вибір: велике двоспальне ліжко або два окремі, робочий стіл і тематичний арт на стіні.',
      specs: [['i-ruler', '15–17 м²'], ['i-users', 'до 2 гостей'], ['i-bed', '1 двоспальне або 2 окремі']], inc: [...COMMON, 'Кондиціонер', 'Робочий стіл'],
      img: ['r-double', 'r-double2', 'r-double3', 'r-double4'] },
    { no: '03', key: 'Покращений', title: 'Покращений двомісний', desc: 'Більше простору і світла. У частині номерів — вихід на балкон і великий принт легендарного мотоцикла над ліжком.',
      specs: [['i-ruler', '19–21 м²'], ['i-users', 'до 2 гостей'], ['i-bed', 'двоспальне ліжко']], inc: [...COMMON, 'Кондиціонер', 'Звукоізоляція'],
      img: ['r-improved', 'r-improved2', 'r-improved3'] },
    { no: '04', key: 'Тримісний', title: 'Покращений тримісний', desc: 'Для компанії друзів чи сім’ї з дорослою дитиною: двоспальне ліжко плюс окреме, простір для речей і шоломів.',
      specs: [['i-ruler', '27 м²'], ['i-users', 'до 3 гостей'], ['i-bed', 'двоспальне + окреме']], inc: [...COMMON, 'Кондиціонер'],
      img: ['r-triple', 'r-triple2'] },
    { no: '05', key: 'Напівлюкс', title: 'Напівлюкс', desc: 'Найпросторіший номер готелю: king-size ліжко, окрема зона з диваном і столиком, цегляна стіна і багато світла.',
      specs: [['i-ruler', '32 м²'], ['i-users', 'до 2 гостей'], ['i-bed', 'king-size']], inc: [...COMMON, 'Кондиціонер', 'Зона відпочинку з диваном'],
      img: ['r-suite', 'r-suite2', 'r-suite3'] },
  ];

  const board = $('.keyboard'), room = $('#room'), sel = $('#roomSelect');
  let cur = 1, photo = 0;
  ROOMS.forEach((r, i) => {
    const b = document.createElement('button');
    b.className = 'key'; b.type = 'button'; b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'room'); b.setAttribute('aria-label', r.title);
    b.innerHTML = `<span class="key__ring"></span><span class="key__tag"><span class="key__no">${r.no}</span><span class="key__name">${r.key}</span></span>`;
    b.addEventListener('click', () => { showRoom(i); swing(b); });
    board.appendChild(b);
    const o = document.createElement('option'); o.value = o.textContent = r.title; sel.appendChild(o);
  });
  const keys = $$('.key', board);

  function swing(el) {
    if (reduce || !window.gsap) return;
    gsap.fromTo(el, { rotate: -14 }, { rotate: 0, duration: 1.4, ease: 'elastic.out(1.1,0.25)' });
  }
  function setPhoto(n) {
    const r = ROOMS[cur], img = $('.room__img', room);
    photo = (n + r.img.length) % r.img.length;
    img.classList.add('is-fading');
    const src = `img/photos/${r.img[photo]}.jpg`;
    const pre = new Image(); pre.src = src;
    const done = () => { img.src = src; img.alt = `${r.title} — фото ${photo + 1} з ${r.img.length}, готель Clubhouse`; img.classList.remove('is-fading'); };
    pre.complete ? setTimeout(done, 120) : (pre.onload = pre.onerror = done);
    $$('.room__dots span', room).forEach((d, k) => d.classList.toggle('on', k === photo));
  }
  function showRoom(i) {
    cur = i; const r = ROOMS[i];
    keys.forEach((k, j) => { k.setAttribute('aria-selected', j === i); k.tabIndex = j === i ? 0 : -1; });
    $('.room__no', room).textContent = `Ключ № ${r.no}`;
    $('.room__title', room).textContent = r.title;
    $('.room__desc', room).textContent = r.desc;
    $('.room__specs', room).innerHTML = r.specs.map(([ic, t]) => `<li><svg class="ic"><use href="#${ic}"/></svg>${t}</li>`).join('');
    $('.room__inc', room).innerHTML = r.inc.map(t => `<li>${t}</li>`).join('');
    $('.room__dots', room).innerHTML = r.img.map(() => '<span></span>').join('');
    setPhoto(0);
  }
  $('.room__nav--prev').addEventListener('click', () => setPhoto(photo - 1));
  $('.room__nav--next').addEventListener('click', () => setPhoto(photo + 1));
  let tx = 0;
  $('.room__gallery').addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  $('.room__gallery').addEventListener('touchend', e => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 40) setPhoto(photo + (d < 0 ? 1 : -1)); });
  board.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = (cur + (e.key === 'ArrowRight' ? 1 : -1) + ROOMS.length) % ROOMS.length;
    showRoom(n); keys[n].focus(); swing(keys[n]);
  });
  $('.room__cta').addEventListener('click', () => { sel.value = ROOMS[cur].title; });
  showRoom(1);

  /* ---------- dates ---------- */
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const today = new Date(), tmr = new Date(Date.now() + 864e5);
  $$('input[type=date]').forEach(inp => { inp.min = iso(today); });
  $$('input[name=in]').forEach(i => i.value = iso(today));
  $$('input[name=out]').forEach(i => i.value = iso(tmr));
  $$('input[name=in]').forEach(i => i.addEventListener('change', () => {
    const out = i.form.querySelector('input[name=out]');
    out.min = i.value;
    if (out.value <= i.value) { const d = new Date(i.value); d.setDate(d.getDate() + 1); out.value = iso(d); }
  }));

  const bf = $('#bookform');
  $('#qbook').addEventListener('submit', e => {
    e.preventDefault();
    const q = e.target;
    ['in', 'out', 'guests'].forEach(n => { bf.elements[n].value = q.elements[n].value; });
    bf.elements.out.min = q.elements.in.value;
    go('#book'); setTimeout(() => bf.elements.name.focus({ preventScroll: true }), 900);
  });

  /* ---------- booking form ---------- */
  const fmt = v => v ? v.split('-').reverse().join('.') : '';
  bf.addEventListener('submit', e => {
    e.preventDefault();
    const f = bf.elements, err = $('.form__err', bf);
    const bad = [];
    [f.name, f.phone, f.in, f.out].forEach(el => el.classList.remove('is-bad'));
    if (!f.name.value.trim()) bad.push(f.name);
    if (f.phone.value.replace(/\D/g, '').length < 9) bad.push(f.phone);
    if (!f.in.value) bad.push(f.in);
    if (!f.out.value || f.out.value <= f.in.value) bad.push(f.out);
    if (bad.length) {
      bad.forEach(el => el.classList.add('is-bad'));
      err.textContent = bad.includes(f.out) && f.out.value ? 'Дата виїзду має бути пізніше за дату заїзду.' : 'Будь ласка, заповніть ім’я, телефон і дати.';
      err.hidden = false; bad[0].focus(); return;
    }
    err.hidden = true;
    const nights = Math.round((new Date(f.out.value) - new Date(f.in.value)) / 864e5);
    const txt = `Добрий день! Хочу забронювати номер у Clubhouse.\nЗаїзд: ${fmt(f.in.value)}, виїзд: ${fmt(f.out.value)} (${nights} ноч.)\nНомер: ${f.room.value}, гостей: ${f.guests.value}\nІм'я: ${f.name.value.trim()}\nТелефон: ${f.phone.value.trim()}${f.note.value.trim() ? '\nКоментар: ' + f.note.value.trim() : ''}`;
    $('.form__text', bf).textContent = txt;
    $('#sendSms').href = `sms:${PHONE}?&body=${encodeURIComponent(txt)}`;
    const done = $('.form__done', bf); done.hidden = false;
    done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  });

  /* ---------- header / menu ---------- */
  const hdr = $('.hdr'), burger = $('.burger'), mnav = $('.mnav');
  const onScroll = () => hdr.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', open); mnav.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('a', mnav).forEach(a => a.addEventListener('click', () => { burger.setAttribute('aria-expanded', 'false'); mnav.hidden = true; document.body.style.overflow = ''; }));
  $('#yr').textContent = new Date().getFullYear();

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  function go(target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -70 }); else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const el = $(id); if (!el) return;
    e.preventDefault(); go(el); history.replaceState(null, '', id);
  }));

  /* ---------- gauges (no-GSAP fallback included) ---------- */
  const gauges = $$('.gauge');
  const fillGauge = g => { const v = parseFloat(g.dataset.score) / parseFloat(g.dataset.max); $('.gauge__val', g).style.strokeDashoffset = 158 * (1 - v); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { fillGauge(en.target); io.unobserve(en.target); } }), { threshold: .4 });
    gauges.forEach(g => io.observe(g));
  } else gauges.forEach(fillGauge);

  /* ---------- motion ---------- */
  if (reduce || !window.gsap || !window.ScrollTrigger) {
    $$('.reveal').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    document.documentElement.classList.remove('js');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.11 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // hero intro
  gsap.from('.hero__title .ln', { yPercent: 60, opacity: 0, duration: 1.1, stagger: .12, ease: 'power3.out', delay: .1 });
  gsap.from(['.kicker', '.hero__lead', '.hero__cta', '.hero__scores'], { y: 24, opacity: 0, duration: .9, stagger: .1, ease: 'power2.out', delay: .45 });
  gsap.to('.hero__media img', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__ghost', { yPercent: -30, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // road progress
  gsap.to('.road__fill', { scaleY: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  // reveals
  $$('.reveal').forEach(el => gsap.to(el, { opacity: 1, y: 0, duration: .9, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));

  // collage parallax
  gsap.to('.ph--b', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.about', scrub: true } });
  gsap.to('.ph--c', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.about', scrub: true } });

  // keys drop in and swing
  gsap.from(keys, { y: -60, rotate: i => (i % 2 ? 18 : -18), opacity: 0, duration: 1.6, stagger: .09, ease: 'elastic.out(1,0.35)',
    scrollTrigger: { trigger: '.keyboard', start: 'top 80%', once: true } });

  // horizontal garage strip (desktop)
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = $('.strip__track');
    const dist = () => track.scrollWidth - innerWidth;
    gsap.to(track, { x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.strip', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true } });
  });

  /* ---------- extra motion ---------- */
  const fine = matchMedia('(pointer: fine)').matches;

  // headlight beam sweeps across the facade on load
  gsap.timeline({ delay: .3 })
    .fromTo('.hero__beam', { xPercent: -60, opacity: 0 }, { xPercent: 10, opacity: 1, duration: 1.6, ease: 'power2.inOut' })
    .to('.hero__beam', { xPercent: 25, opacity: .55, duration: 1.2, ease: 'power1.out' });
  if (fine) {
    const hero = $('.hero');
    const bx = gsap.quickTo('.hero__beam', 'x', { duration: .9, ease: 'power3' });
    const by = gsap.quickTo('.hero__beam', 'y', { duration: .9, ease: 'power3' });
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); bx((e.clientX - r.width / 2) * .35); by((e.clientY - r.height / 2) * .35); });
  }

  // headings: words rise from a mask
  $$('.h2').forEach(h => {
    if (h.closest('.strip')) return;
    h.classList.remove('reveal'); h.style.opacity = 1; h.style.transform = 'none';
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
          const w = document.createElement('span'); w.className = 'split-w';
          const i = document.createElement('span'); i.textContent = t; w.appendChild(i); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    walk(h);
    gsap.from($$('.split-w>span', h), { yPercent: 110, rotate: 4, duration: 1, stagger: .06, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });

  // garage shutters roll up over photos
  $$('.shutter').forEach(el => gsap.to(el, { '--sh': 0, duration: 1.3, ease: 'power3.inOut', scrollTrigger: { trigger: el, start: 'top 85%', once: true } }));
  $$('.shutter img').forEach(img => gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: img, start: 'top 85%', once: true } }));

  // odometer counters
  $$('[data-count]').forEach(el => {
    const to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, suf = el.dataset.suf || '';
    const o = { v: el.dataset.from ? parseFloat(el.dataset.from) : 0 };
    const paint = () => { el.textContent = o.v.toFixed(dec).replace('.', ',') + suf; };
    paint();
    gsap.to(o, { v: to, duration: 1.8, ease: 'power2.out', onUpdate: paint, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });

  // amenity icons draw themselves
  $$('.amen__list li').forEach((li, i) => gsap.to($('.ic', li), { '--draw': 0, duration: 1.4, delay: (i % 2) * .12, ease: 'power2.out', scrollTrigger: { trigger: li, start: 'top 88%', once: true } }));

  // distance rows: road markings run out
  gsap.to('.dist li', { '--ln': 1, duration: .9, stagger: .15, ease: 'power2.inOut', scrollTrigger: { trigger: '.dist', start: 'top 85%', once: true } });
  gsap.from('.rules > div', { y: 30, opacity: 0, rotate: i => (i - 1) * 3, duration: .9, stagger: .1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.rules', start: 'top 88%', once: true } });

  // review cards land like postcards
  gsap.from('.quote', { y: 60, rotate: i => (i % 2 ? 2.5 : -2.5), opacity: 0, duration: 1, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.rev__grid', start: 'top 82%', once: true } });


  // room panel: new room slides in
  const roomInfo = $('.room__info');
  keys.forEach(k => k.addEventListener('click', () => gsap.fromTo(roomInfo.children, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: .04, ease: 'power2.out', overwrite: true })));

  // inner parallax inside the horizontal strip
  if (matchMedia('(min-width: 901px)').matches) {
    $$('.strip figure img').forEach(img => gsap.fromTo(img, { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.strip', start: 'top top', end: () => '+=' + ($('.strip__track').scrollWidth - innerWidth), scrub: true } }));
  }

  // booking contacts slide in
  gsap.from('.book__contacts li', { x: -30, opacity: 0, duration: .7, stagger: .1, ease: 'power2.out', scrollTrigger: { trigger: '.book__contacts', start: 'top 88%', once: true } });

  // magnetic buttons on desktop
  if (fine) $$('.btn').forEach(b => {
    const mx = gsap.quickTo(b, 'x', { duration: .4, ease: 'power3' }), my = gsap.quickTo(b, 'y', { duration: .4, ease: 'power3' });
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .25); my((e.clientY - r.top - r.height / 2) * .3); });
    b.addEventListener('pointerleave', () => { mx(0); my(0); });
  });

  // header hides on scroll down, returns on scroll up
  let lastY = 0;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => {
    const y = self.scroll(); if (!mnav.hidden) return;
    gsap.to(hdr, { yPercent: y > 300 && y > lastY ? -100 : 0, duration: .35, ease: 'power2.out', overwrite: true }); lastY = y;
  } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
