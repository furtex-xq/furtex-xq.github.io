/* I.F. you dance — demo */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* smooth scroll */
  let lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.11 });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const goTo = target => {
    if (lenis) lenis.scrollTo(target, { offset: -70 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  /* nav */
  const nav = $('.nav'), burger = $('.burger'), mnav = $('#mnav');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('solid', y > 40);
    nav.classList.toggle('hide', y > 500 && y > lastY && mnav.hidden);
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open); mnav.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setMenu(mnav.hidden));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !mnav.hidden) setMenu(false); });

  /* anchors (+ prefill style) */
  const styleSel = $('#su-style');
  const prefill = val => {
    if (!val) return;
    const opt = [...styleSel.options].find(o => o.text === val);
    if (opt) {
      styleSel.value = opt.value || opt.text;
      const f = styleSel.closest('.fld'); f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash');
      setTimeout(() => f.classList.remove('flash'), 1600);
    }
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const t = document.querySelector(id); if (!t) return;
    e.preventDefault();
    if (!mnav.hidden) setMenu(false);
    if (a.dataset.style) prefill(a.dataset.style);
    goTo(t);
  }));

  /* count-in metronome: 5 6 7 8 at 120 bpm */
  const beats = $$('.count-in span');
  if (beats.length && !reduce) {
    let i = 0;
    const tapes = $$('.tape');
    setInterval(() => {
      beats.forEach((b, k) => b.classList.toggle('on', k === i % 4));
      if (i % 4 === 3) tapes.forEach(t => { t.classList.remove('beat'); void t.getBoundingClientRect(); t.classList.add('beat'); });
      i++;
    }, 500);
  }

  /* schedule (demo) */
  const days = [
    ['Пн', [['17:00', 'Діти 4–7: бальні', 'k'], ['18:30', 'Хіп-хоп', 'a'], ['19:45', 'Бачата', 'a']]],
    ['Вт', [['17:00', 'Діти 8–14: хіп-хоп', 'k'], ['18:30', 'Heels', 'a'], ['19:45', 'Стретчинг', 'a']]],
    ['Ср', [['17:00', 'Діти: акро-денс', 'k'], ['18:30', 'Контемп', 'a'], ['19:45', 'Сальса', 'a']]],
    ['Чт', [['17:00', 'Діти 4–7: бальні', 'k'], ['18:30', 'Хіп-хоп', 'a'], ['19:45', 'Бачата', 'a']]],
    ['Пт', [['17:00', 'Діти 8–14: хіп-хоп', 'k'], ['18:30', 'Heels', 'a'], ['19:45', 'Стретчинг', 'a']]],
    ['Сб', [['10:00', 'Діти: акро-денс', 'k'], ['11:30', 'Весільні постановки', 'a'], ['12:45', 'Меренге / вечірка', 'a']]]
  ];
  const grid = $('#sch-grid');
  grid.innerHTML = days.map(([d, slots]) =>
    `<div class="day rv"><h3>${d}</h3>${slots.map(([t, n, c]) => `<div class="slot ${c}" data-c="${c}"><b>${t}</b><span>${n}</span></div>`).join('')}</div>`).join('');
  $$('.seg button').forEach(b => b.addEventListener('click', () => {
    $$('.seg button').forEach(x => x.setAttribute('aria-selected', x === b));
    const f = b.dataset.f;
    $$('.slot', grid).forEach(s => s.classList.toggle('off', f !== 'all' && s.dataset.c !== f));
  }));

  /* quiz */
  const quiz = $('#quiz');
  if (quiz) quiz.addEventListener('submit', e => e.preventDefault());
  const steps = $$('.q', quiz), result = $('.q-result', quiz);
  const R = {
    latina: ['<span class="serif">Латина:</span> бачата і сальса', 'Соціальні танці в парі: вже через місяць зможете танцювати на вечірці. Партнер не обов\'язковий.', 'Латина (сальса, бачата, меренге)'],
    hiphop: ['Хіп-хоп', 'Енергія, грув і хореографія під сучасні треки. Найкраще «перезавантаження» після робочого дня.', 'Хіп-хоп (дорослі)'],
    heels: ['<span class="serif">Heels</span>', 'Пластика, хода і впевненість у тілі. Починаємо в зручному взутті, на підбори переходимо поступово.', 'Heels'],
    contemp: ['Контемп', 'Сучасна хореографія для тих, хто хоче виступати і розповідати рухом.', 'Контемп / сучасна хореографія'],
    stretch: ['Стретчинг', 'Гнучкість і здорова спина. Ідеально в парі з будь-яким танцювальним напрямком.', 'Стретчинг'],
    wedding: ['Весільний <span class="serif">танець</span>', 'Постановка першого танцю під вашу пісню і ваш рівень. Зазвичай 5–8 зустрічей.', 'Весільний танець'],
    kidsBall: ['Бальні <span class="serif">для дітей</span>', 'Постава, ритм і перші виступи. Ігрова подача для малюків, тренер з досвідом дитячих груп.', 'Діти: бальні танці'],
    kidsHip: ['Хіп-хоп і <span class="serif">акро-денс</span>', 'Енергія в правильне русло: координація, сила й акробатика з підстраховкою.', 'Діти: хіп-хоп / акро-денс']
  };
  const pick = (who, goal) => {
    if (goal === 'wed') return 'wedding';
    if (who === 'kid1') return goal === 'drive' ? 'kidsHip' : 'kidsBall';
    if (who === 'kid2') return (goal === 'social' || goal === 'fem') ? 'kidsBall' : 'kidsHip';
    if (who === 'pair') return goal === 'stage' ? 'contemp' : 'latina';
    return { drive: 'hiphop', fem: 'heels', social: 'latina', body: 'stretch', stage: 'contemp' }[goal] || 'hiphop';
  };
  let chosenStyle = '';
  quiz.addEventListener('change', e => {
    const fs = e.target.closest('.q'); const n = +fs.dataset.step;
    if (n < 3) { steps[n].disabled = false; steps[n].querySelector('input').focus({ preventScroll: true }); return; }
    const v = Object.fromEntries(new FormData(quiz));
    const key = pick(v.who, v.goal); const [t, txt, style] = R[key];
    chosenStyle = style;
    $('.qr-title', quiz).innerHTML = t;
    const lvl = v.lvl === '0' ? ' Почнемо з базової групи, нікого не «кинуть» у складну зв\'язку.' : v.lvl === '2' ? ' Тренер підбере групу вашого рівня або індивідуальні уроки.' : '';
    $('.qr-text', quiz).textContent = txt.replace(/<[^>]+>/g, '') + lvl;
    result.hidden = false;
    if (hasGsap && !reduce) gsap.from(result, { y: 20, opacity: 0, duration: .5, ease: 'power3.out' });
  });
  $('#qr-go').addEventListener('click', () => {
    prefill(chosenStyle);
    const v = Object.fromEntries(new FormData(quiz));
    const ta = $('#signup textarea');
    const who = { adult: 'дорослий', kid1: 'дитина 4–7 років', kid2: 'дитина 8–14 років', pair: 'пара' }[v.who];
    const lv = ['з нуля', 'трохи танцював(-ла)', 'танцюю давно'][+v.lvl];
    if (!ta.value) ta.value = `Підбір на сайті: ${who}, ${lv}.`;
  });
  $('#qr-reset').addEventListener('click', () => {
    quiz.reset(); result.hidden = true; steps.forEach((s, i) => s.disabled = i > 0);
    steps[0].querySelector('input').focus();
  });

  /* signup form (demo: no backend yet) */
  const form = $('#signup');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const el = n => form.elements.namedItem(n); const name = el('name'), phone = el('phone'), ok = el('ok');
    let good = true;
    [name, phone].forEach(i => i.classList.remove('bad'));
    ok.closest('.agree').classList.remove('bad');
    if (name.value.trim().length < 2) { name.classList.add('bad'); good = false; }
    if (phone.value.replace(/\D/g, '').length < 9) { phone.classList.add('bad'); good = false; }
    if (!ok.checked) { ok.closest('.agree').classList.add('bad'); good = false; }
    const st = $('.su-status', form);
    if (!good) { st.style.color = 'var(--red)'; st.textContent = 'Перевірте ім\'я, телефон і згоду.'; return; }
    st.style.color = '';
    st.textContent = `Дякуємо, ${name.value.trim()}! Ми передзвонимо найближчим часом. (Демо: після запуску заявка приходитиме студії в Telegram або на email.)`;
    form.querySelector('button[type=submit]').disabled = true;
  });

  /* reveal */
  const rvTargets = ['.counts-head', '.match-intro', '.q', '.about-photo', '.about-text', '.sch-head', '.price', '.wed-inner > *', '.gift-grid > *', '.quote', '.faq details', '.ct-info', '.signup'];
  rvTargets.forEach(s => $$(s).forEach(el => el.classList.add('rv')));
  if (reduce || !('IntersectionObserver' in window)) $$('.rv').forEach(el => el.classList.add('in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach(el => io.observe(el));
  }

  if (!hasGsap || reduce) return;
  gsap.registerPlugin(ScrollTrigger);

  /* hero intro + parallax */
  gsap.from('.h1-big .w', { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: .12, delay: .1 });
  gsap.from(['.h1-small', '.hero-lead', '.hero-cta', '.hero-facts li'], { y: 24, opacity: 0, duration: .9, ease: 'power3.out', stagger: .08, delay: .45 });
  gsap.from('.tape', { scale: 0, rotate: -90, duration: .8, ease: 'back.out(2)', stagger: .15, delay: .9 });
  gsap.to('.hero-media img', { yPercent: 12, scale: 1.16, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.fromTo('.wed-media img', { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.wedding', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('.cert-card', { rotate: 3, ease: 'none', scrollTrigger: { trigger: '.gift', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* signature: pinned 8-count */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 821px)', () => {
    const track = $('.counts-track'), cards = $$('.cnt'), num = $('.cm-num'), dots = $$('.cm-dots i');
    const dist = () => track.scrollWidth - innerWidth;
    let cur = 0;
    const setCount = n => {
      if (n === cur) return; cur = n;
      num.textContent = n;
      dots.forEach((d, i) => d.classList.toggle('on', i < n));
      gsap.fromTo(num, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .35, ease: 'power3.out' });
    };
    setCount(1);
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.counts-pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: self => setCount(Math.min(8, 1 + Math.floor(self.progress * 7.999)))
      }
    });
    cards.forEach(c => {
      gsap.from(c.querySelector('.cnt-n'), { xPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left 95%', end: 'left 45%', scrub: true } });
      gsap.from(c.querySelector('.cnt-img img'), { scale: 1.25, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
    return () => { dots.forEach(d => d.classList.remove('on')); };
  });
  mm.add('(max-width: 820px)', () => {
    $$('.cnt').forEach(c => {
      gsap.from(c.querySelector('.cnt-n'), { y: 60, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 80%' } });
      gsap.from(c.querySelector('.cnt-img'), { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'power3.inOut', scrollTrigger: { trigger: c, start: 'top 85%' } });
    });
  });

  /* ---- extra motion (v3) ---- */
  // split section headings into words; serif accents stay whole
  const splitWords = el => {
    const out = [];
    [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span'); w.className = 'wd';
          const i = document.createElement('span'); i.className = 'wi'; i.textContent = part;
          w.appendChild(i); frag.appendChild(w); out.push(i);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) {
        const w = document.createElement('span'); w.className = 'wd';
        n.replaceWith(w); n.classList.add('wi'); w.appendChild(n); out.push(n);
      }
    });
    return out;
  };
  $$('h2:not(.sr-only)').forEach(h => {
    const words = splitWords(h);
    gsap.from(words, { yPercent: 115, rotate: 4, duration: .9, ease: 'power4.out', stagger: .07,
      scrollTrigger: { trigger: h, start: 'top 86%' } });
  });

  // review: words light up one by one while scrolling
  const qp = $('.quote blockquote p');
  if (qp) {
    const qw = splitWords(qp);
    gsap.fromTo(qw, { opacity: .12 }, { opacity: 1, stagger: .15, ease: 'none',
      scrollTrigger: { trigger: '.quote', start: 'top 80%', end: 'top 35%', scrub: true } });
    gsap.from('.stars', { scale: .4, opacity: 0, duration: .7, ease: 'back.out(3)', scrollTrigger: { trigger: '.quote', start: 'top 85%' } });
  }

  // marquee reacts to scroll speed and direction
  const mqEl = $('.marquee-track');
  const mqAnim = mqEl.getAnimations ? mqEl.getAnimations()[0] : null;
  const skewTo = gsap.quickTo('.marquee-track', 'skewX', { duration: .4, ease: 'power3' });
  ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onUpdate: self => {
    const v = self.getVelocity();
    if (mqAnim) mqAnim.playbackRate = gsap.utils.clamp(-4, 4, 1 + v / 900);
    skewTo(gsap.utils.clamp(-8, 8, -v / 300));
  }, onLeave: () => skewTo(0), onLeaveBack: () => skewTo(0) });

  // hero numbers count up
  $$('.hero-facts b').forEach(b => {
    const m = b.textContent.match(/^(\d+)(.*)$/); if (!m) return;
    const o = { v: 0 };
    gsap.to(o, { v: +m[1], duration: 1.4, delay: .8, ease: 'power2.out', onUpdate: () => { b.textContent = Math.round(o.v) + m[2]; } });
  });

  // stage spotlight follows the pointer in the hero (desktop) + magnetic buttons
  const hero = $('.hero');
  if (matchMedia('(pointer:fine)').matches) {
    const spot = document.createElement('div'); spot.className = 'spot'; spot.setAttribute('aria-hidden', 'true');
    hero.insertBefore(spot, $('.hero-inner'));
    const pos = { x: 60, y: 40 };
    const upd = () => { spot.style.setProperty('--x', pos.x); spot.style.setProperty('--y', pos.y); };
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      gsap.to(pos, { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100, duration: .6, ease: 'power3', overwrite: true, onUpdate: upd });
    });
    $$('.btn-lg, .nav-cta').forEach(btn => {
      const bx = gsap.quickTo(btn, 'x', { duration: .4, ease: 'power3' }), by = gsap.quickTo(btn, 'y', { duration: .4, ease: 'power3' });
      btn.addEventListener('pointermove', e => { const r = btn.getBoundingClientRect(); bx((e.clientX - r.left - r.width / 2) * .25); by((e.clientY - r.top - r.height / 2) * .35); });
      btn.addEventListener('pointerleave', () => { bx(0); by(0); });
    });
  }

  // tape crosses spin with scroll
  gsap.to('.tape-a', { rotate: 188, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.tape-c', { rotate: 172, ease: 'none', scrollTrigger: { trigger: '.match', start: 'top bottom', end: 'bottom top', scrub: true } });

  // about photo: curtain reveal + slow zoom
  gsap.fromTo('.about-photo img', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.2, ease: 'power3.inOut', scrollTrigger: { trigger: '.about-photo', start: 'top 80%' } });
  gsap.fromTo('.about-photo img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.about-photo', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.about-list li', { x: -24, opacity: 0, duration: .6, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.about-list', start: 'top 85%' } });

  // schedule: classes drop in day by day, like beats
  ScrollTrigger.batch('.day', { start: 'top 88%', once: true, onEnter: ds => ds.forEach((d, k) =>
    gsap.from($$('.slot', d), { y: 18, opacity: 0, duration: .5, ease: 'power3.out', stagger: .08, delay: k * .09 })) });
  gsap.from('.pr-val b', { yPercent: 60, opacity: 0, duration: .8, ease: 'back.out(2)', stagger: .12, scrollTrigger: { trigger: '.prices', start: 'top 85%' } });

  // wedding steps: line draws, then text
  $$('.wed-steps li').forEach((li, k) => {
    const line = document.createElement('i'); line.className = 'wl'; li.insertBefore(line, li.firstChild);
    gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: .9, delay: k * .15, ease: 'power3.inOut', scrollTrigger: { trigger: '.wed-steps', start: 'top 85%' } });
    gsap.from(li.querySelectorAll('b, span'), { y: 16, opacity: 0, duration: .6, delay: .3 + k * .15, ease: 'power3.out', scrollTrigger: { trigger: '.wed-steps', start: 'top 85%' } });
  });

  // certificate flips in
  gsap.from('.cert-card', { rotateY: -70, rotateX: 12, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.cert', start: 'top 80%' } });
  gsap.from('.cert-x', { scale: 0, rotate: -180, duration: 1, delay: .4, ease: 'back.out(2)', scrollTrigger: { trigger: '.cert', start: 'top 80%' } });

  // contacts + mobile bar
  gsap.from('.ct-info address p, .soc', { y: 14, opacity: 0, duration: .5, stagger: .06, ease: 'power2.out', scrollTrigger: { trigger: '.ct-info address', start: 'top 85%' } });
  gsap.from('.mbar', { yPercent: 160, duration: .8, delay: 1.2, ease: 'power3.out' });
  addEventListener('load', () => ScrollTrigger.refresh());
})();
