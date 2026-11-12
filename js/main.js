(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';
  $('#year').textContent = new Date().getFullYear();

  /* smooth scroll */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    if (hasGsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* header + menu */
  const hdr = $('.hdr'), burger = $('#burger'), nav = $('#nav');
  const onScroll = () => hdr.classList.toggle('is-scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const closeMenu = () => { nav.classList.remove('is-open'); hdr.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open); hdr.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* anchor links through lenis */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = $(id); if (!el) return;
    e.preventDefault(); closeMenu();
    if (lenis) lenis.scrollTo(el, { offset: -76 }); else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  }));

  /* situations tabs */
  const tabs = $$('.sos__tabs [role=tab]');
  const select = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      const p = $('#' + t.getAttribute('aria-controls'));
      p.hidden = !on; p.classList.toggle('is-on', on);
    });
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  };
  tabs.forEach((t, i) => {
    t.tabIndex = i ? -1 : 0;
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      const k = e.key; let n = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (k === 'ArrowUp' || k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (n) { e.preventDefault(); select(n); n.focus(); }
    });
  });

  /* practice: article counter + underline */
  const num = $('#artNum');
  const arts = $$('.art');
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        arts.forEach(a => a.classList.toggle('is-active', a === en.target));
        if (num) num.textContent = en.target.dataset.art;
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  arts.forEach(a => io.observe(a));

  /* form -> email to the lawyer (до запуску: заявки в Telegram-бот) */
  const form = $('#form'), status = $('#formStatus');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = form.elements; let bad = null;
    [f.name, f.phone].forEach(el => {
      const ok = el.name === 'phone' ? el.value.replace(/\D/g, '').length >= 9 : el.value.trim().length > 1;
      el.classList.toggle('is-err', !ok); if (!ok && !bad) bad = el;
    });
    if (!f.ok.checked && !bad) bad = f.ok;
    if (bad) {
      status.className = 'form__status err';
      status.textContent = bad === f.ok ? 'Позначте згоду на обробку даних.' : 'Перевірте ім’я та телефон.';
      bad.focus(); return;
    }
    const body = `Ім’я: ${f.name.value.trim()}\nТелефон: ${f.phone.value.trim()}\nСитуація: ${f.topic.value}\n\n${f.msg.value.trim()}`;
    location.href = 'mailto:advokatdoronin@gmail.com?subject=' + encodeURIComponent('Заявка з сайту: ' + f.topic.value) + '&body=' + encodeURIComponent(body);
    status.className = 'form__status ok';
    status.textContent = 'Дякую. Відкрився лист із вашою заявкою, надішліть його. Якщо справа термінова, краще зателефонуйте.';
    form.reset();
  });

  /* animations */
  if (!hasGsap || reduce) return;
  gsap.registerPlugin(ScrollTrigger);

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.hero__h1 .line > span', { yPercent: 105, duration: 1.1, stagger: .12 })
    .from('.kicker, .hero__lead, .hero__cta, .hero__facts', { y: 18, opacity: 0, duration: .8, stagger: .08 }, '-=.75')
    .from('.dossier__sheet', { y: 40, rotate: 4, opacity: 0, duration: 1 }, '-=1');
  const sig = $('.sig');
  if (sig) {
    const len = sig.getTotalLength();
    gsap.set(sig, { strokeDasharray: len, strokeDashoffset: len });
    tl.to(sig, { strokeDashoffset: 0, duration: 1.2, ease: 'power1.inOut' }, '-=.3');
  }
  /* печатка: падає і «прибивається» до аркуша */
  tl.fromTo('.stamp', { scale: 2.2, opacity: 0, rotate: -40 }, { scale: 1, opacity: .86, rotate: -14, duration: .38, ease: 'power4.in' }, '-=.2')
    .to('.dossier__sheet', { x: 2, y: 3, duration: .06, yoyo: true, repeat: 1, ease: 'none' });

  $$('.sec-head').forEach(h => gsap.from(h.children, {
    y: 28, opacity: 0, duration: .9, stagger: .08, ease: 'power3.out',
    scrollTrigger: { trigger: h, start: 'top 85%' }
  }));
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    onEnter: els => gsap.from(els, { y: 34, opacity: 0, duration: .9, stagger: .09, ease: 'power3.out', overwrite: true })
  });
  gsap.from('.art', {
    opacity: 0, y: 30, duration: .8, stagger: .05, ease: 'power2.out',
    scrollTrigger: { trigger: '.articles', start: 'top 80%' }
  });
})();
