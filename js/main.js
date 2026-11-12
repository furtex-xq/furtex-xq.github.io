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
  $$('.cases .acc details').forEach(d => d.addEventListener('toggle', () => {
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

  /* перший екран */
  gsap.from('[data-in]', { y: 40, opacity: 0, duration: .9, stagger: .08, ease: 'power3.out', delay: .1 });

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
        onUpdate: s => { $('#bar').style.width = (s.progress * 100).toFixed(1) + '%'; }
      }
    });
    gsap.from('.tc', { opacity: .25, stagger: .2, scrollTrigger: { trigger: '.hour__pin', start: 'top top', end: () => '+=' + dist(), scrub: true } });
    return () => tw.kill();
  });
  mm.add('(max-width: 900px)', () => {
    gsap.utils.toArray('.tc').forEach(c => gsap.from(c, { x: -20, opacity: 0, duration: .7, ease: 'power2.out', scrollTrigger: { trigger: c, start: 'top 85%' } }));
  });

  $$('.sec-head, .cases__intro, .about__txt, .faq__grid > div:first-child').forEach(h => gsap.from(h.children, {
    y: 30, opacity: 0, duration: .8, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 85%' }
  }));
  ScrollTrigger.batch('[data-up], .plist li', {
    start: 'top 90%',
    onEnter: els => gsap.from(els, { y: 30, opacity: 0, duration: .8, stagger: .06, ease: 'power3.out', overwrite: true })
  });
  gsap.from('.phone', { xPercent: -6, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.contact', start: 'top 75%' } });
})();
