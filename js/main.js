(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && window.ScrollTrigger;
  $('#year').textContent = new Date().getFullYear();

  /* живий годинник (час Києва) */
  const clock = $('#clock');
  const tick = () => {
    try { clock.textContent = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' }).format(new Date()); }
    catch (e) { const d = new Date(); clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  };
  tick(); setInterval(tick, 15000);

  /* плавний скрол */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* шапка і меню */
  const hdr = $('.hdr'), burger = $('#burger'), nav = $('#nav');
  const onScroll = () => hdr.classList.toggle('is-scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const closeMenu = () => { nav.classList.remove('is-open'); hdr.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open); hdr.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = $(id); if (!el) return;
    e.preventDefault(); closeMenu();
    if (lenis) lenis.scrollTo(el, { offset: id === '#top' ? 0 : -68 }); else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  }));

  /* акордеон: одна відкрита ситуація */
  if (!hasGsap || reduce) $$('.cases .acc details').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) $$('.cases .acc details').forEach(o => { if (o !== d) o.open = false; });
  }));

  /* форма -> лист адвокату (після запуску: Telegram-бот) */
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
    const topic = form.querySelector('input[name=topic]:checked').value;
    const body = `Ім’я: ${f.name.value.trim()}\nТелефон: ${f.phone.value.trim()}\nТема: ${topic}\n\n${f.msg.value.trim()}`;
    location.href = 'mailto:advokatdoronin@gmail.com?subject=' + encodeURIComponent('Заявка з сайту: ' + topic) + '&body=' + encodeURIComponent(body);
    status.className = 'form__status ok';
    status.textContent = 'Дякую. Відкрився лист із заявкою, надішліть його. Якщо терміново — краще зателефонуйте.';
    form.reset();
  });

  if (!hasGsap || reduce) return;
  gsap.registerPlugin(ScrollTrigger);

  /* розбивка заголовків h2 на слова */
  $$('h2').forEach(h => {
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = h.textContent.trim().split(/\s+/).map(w => `<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
  });

  /* перший екран: заголовок виїжджає рядками, сканер, лічильники */
  const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
  intro.fromTo('.h1row', { yPercent: 60, opacity: 0, clipPath: 'inset(-20% -5% 100% -5%)' },
      { yPercent: 0, opacity: 1, clipPath: 'inset(-20% -5% -20% -5%)', duration: 1.1, stagger: .12 })
    .from('.hl', { color: '#e8edf3', duration: .6, ease: 'power1.out' }, '-=.4')
    .from('[data-in]', { y: 30, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out' }, '-=.9')
    .fromTo('.scan', { top: '0%', opacity: 0 }, { top: '100%', opacity: .9, duration: 1.6, ease: 'power1.inOut' }, .2)
    .to('.scan', { opacity: 0, duration: .3 }, '>-0.3')
    .from('.hero__grid', { opacity: 0, duration: 1.4, ease: 'none' }, 0);
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, o = { v: +(el.dataset.from || 0) };
    gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', delay: .9, onUpdate: () => { el.textContent = Math.round(o.v); } });
  });
  /* контурне «хвилини» заливається під час скролу */
  gsap.to('.h1row--out', { '--fill': '100%', ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 30%', scrub: true } });
  gsap.to('.hero__h1', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* мітки секцій і заголовки по словах */
  $$('h2').forEach(h => gsap.from(h.querySelectorAll('.w>span'), { yPercent: 110, duration: .9, stagger: .045, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));

  /* акордеон з плавним відкриттям */
  $$('.acc details').forEach(d => {
    const sum = d.querySelector('summary'), body = d.querySelector('ul, p');
    sum.addEventListener('click', e => {
      e.preventDefault();
      if (d.open) {
        gsap.to(body, { height: 0, opacity: 0, duration: .35, ease: 'power2.in', onComplete: () => { d.open = false; gsap.set(body, { clearProps: 'all' }); } });
      } else {
        d.open = true;
        gsap.from(body, { height: 0, opacity: 0, duration: .45, ease: 'power2.out', clearProps: 'all' });
        gsap.from(body.querySelectorAll('li'), { x: -16, opacity: 0, duration: .4, stagger: .06, delay: .1, clearProps: 'all' });
        if (d.closest('.cases')) $$('.cases .acc details').forEach(o => { if (o !== d && o.open) o.querySelector('summary').click(); });
      }
    });
  });

  /* великий телефон «набирається» цифрами */
  const phone = $('.phone');
  if (phone) {
    const final = phone.textContent;
    ScrollTrigger.create({ trigger: phone, start: 'top 85%', once: true, onEnter: () => {
      const o = { p: 0 };
      gsap.to(o, { p: 1, duration: 1.4, ease: 'power2.out', onUpdate: () => {
        const n = Math.floor(o.p * final.length);
        phone.textContent = final.split('').map((c, i) => i < n || !/\d/.test(c) ? c : Math.floor(Math.random() * 10)).join('');
      }, onComplete: () => { phone.textContent = final; } });
    } });
  }

  /* фото-заглушка, кроки, відгуки */
  gsap.to('.photo__ini', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.photo', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.flow li', { clipPath: 'inset(0 100% 0 0)', duration: .9, stagger: .12, ease: 'power3.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: '.flow', start: 'top 80%' } });
  gsap.from('.rules__list li', { borderTopColor: 'rgba(255,90,31,1)', duration: 1.2, stagger: .15, scrollTrigger: { trigger: '.rules__list', start: 'top 80%' } });

  /* фішка: горизонтальний таймлайн «перша година» (на ПК) */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = $('.track__in');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tw = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.hour__pin', start: 'top top', end: () => '+=' + (dist() + innerHeight * .4),
        pin: true, scrub: .6, invalidateOnRefresh: true,
        onUpdate: s => { $('#bar').style.width = (s.progress * 100).toFixed(1) + '%'; const cards = $$('.tc'); const n = Math.round(s.progress * (cards.length - 1)); cards.forEach((c, i) => c.classList.toggle('is-lit', i <= n)); }
      }
    });
    gsap.from('.tc', { opacity: .25, stagger: .2, scrollTrigger: { trigger: '.hour__pin', start: 'top top', end: () => '+=' + dist(), scrub: true } });
    return () => tw.kill();
  });
  mm.add('(max-width: 900px)', () => {
    gsap.utils.toArray('.tc').forEach(c => gsap.from(c, { x: -20, opacity: 0, duration: .7, ease: 'power2.out', scrollTrigger: { trigger: c, start: 'top 85%', onEnter: () => c.classList.add('is-lit'), onLeaveBack: () => c.classList.remove('is-lit') } }));
  });

  $$('.sec-head, .cases__intro, .about__txt, .faq__grid > div:first-child').forEach(h => gsap.from(h.querySelectorAll(':scope > :not(h2)'), {
    y: 30, opacity: 0, duration: .8, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 85%' }
  }));
  ScrollTrigger.batch('[data-up], .plist li', {
    start: 'top 90%',
    onEnter: els => gsap.from(els, { y: 30, opacity: 0, duration: .8, stagger: .06, ease: 'power3.out', overwrite: true })
  });
  
})();
