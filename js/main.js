/* Shamanka — демо. Без залежностей, окрім Lenis (плавний скрол). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Плавний скрол */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = $(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(el, { offset: -72 }); else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* Шапка, мобільна панель, «пасмо»-прогрес */
  const hdr = $('.hdr'), mbar = $('.mbar'), sp = $('.sp-fg');
  let spLen = 0;
  if (sp) { spLen = sp.getTotalLength(); sp.style.strokeDasharray = spLen; sp.style.strokeDashoffset = spLen; }
  const onScroll = () => {
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    hdr.classList.toggle('is-solid', y > 30);
    const nearForm = (() => { const f = $('#zapys').getBoundingClientRect(); return f.top < innerHeight && f.bottom > 0; })();
    mbar.classList.toggle('show', y > innerHeight * .6 && !nearForm);
    if (sp) sp.style.strokeDashoffset = spLen * (1 - Math.min(1, Math.max(0, y / h)));
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* Мобільне меню */
  const burger = $('.burger'), mnav = $('#mnav');
  function closeMenu() { if (!mnav.hidden) { mnav.hidden = true; burger.setAttribute('aria-expanded', 'false'); hdr.classList.toggle('is-solid', scrollY > 30); } }
  burger.addEventListener('click', () => {
    const open = mnav.hidden;
    mnav.hidden = !open; burger.setAttribute('aria-expanded', String(open));
    if (open) hdr.classList.add('is-solid');
  });

  /* Поява блоків */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });

  /* Послуги: акордеон + фото, що летить за курсором */
  $$('.svc__item').forEach(item => {
    const btn = $('.svc__row', item);
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('open');
      $$('.svc__item.open').forEach(o => { o.classList.remove('open'); $('.svc__row', o).setAttribute('aria-expanded', 'false'); });
      item.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
    });
  });
  const float = $('.svc__float'), svcWrap = $('.services .wrap');
  if (float && matchMedia('(hover:hover) and (min-width:861px)').matches) {
    let tx = 0, ty = 0, x = 0, y = 0, on = false;
    $$('.svc__row').forEach(r => {
      r.addEventListener('mouseenter', () => { const src = r.parentElement.dataset.img; if (src && !float.src.endsWith(src)) float.src = src; on = !r.parentElement.classList.contains('open'); float.classList.toggle('on', on); });
      r.addEventListener('mouseleave', () => { on = false; float.classList.remove('on'); });
    });
    svcWrap.addEventListener('mousemove', e => { const b = svcWrap.getBoundingClientRect(); tx = e.clientX - b.left + 150; ty = e.clientY - b.top; });
    const loop = () => { x += (tx - x) * .14; y += (ty - y) * .14; float.style.left = x + 'px'; float.style.top = y + 'px'; requestAnimationFrame(loop); };
    loop();
  }

  /* Підбір відтінку */
  const SHADES = {
    cold:     { name: 'Холодний блонд', c: ['#7a6a58', '#cfc2a8', '#efe7d6'], d: 'Світлий, без жовтизни. Потребує доглядових масок і тонування раз на 6–8 тижнів.' },
    sand:     { name: 'Пісочний',       c: ['#6a4e36', '#bf9c70', '#e3cca2'], d: 'Теплий натуральний блонд — виглядає так, ніби волосся вигоріло на сонці.' },
    honey:    { name: 'Мед',            c: ['#55361f', '#b0733a', '#d9a964'], d: 'Тепле золото на темній базі. Освіжає обличчя й гарно переливається на світлі.' },
    copper:   { name: 'Мідь',           c: ['#4a2516', '#a3472a', '#d27a40'], d: 'Яскравий рудий з глибиною. Сміливий вибір для тих, хто хоче, щоб волосся помічали.' },
    choco:    { name: 'Шоколад',        c: ['#24160f', '#51301e', '#86573a'], d: 'Глибокий темний відтінок з блиском. Пасує майже всім і легко доглядається.' },
    graphite: { name: 'Графіт',         c: ['#1c1b1a', '#4a4744', '#9a9692'], d: 'Холодний сіро-попелястий — модний спосіб красиво «обіграти» сивину.' }
  };
  const TECH = {
    solid:    { name: 'однотонне', d: 'Рівний колір від коренів до кінчиків.' },
    balayage: { name: 'балаяж', d: 'Мазки кольору від середини довжини — м’який перехід, корені можна не підфарбовувати місяцями.' },
    ombre:    { name: 'омбре', d: 'Чіткий перехід від темних коренів до світлих кінчиків.' },
    airtouch: { name: 'аіртач', d: 'Найтонші світлі пасма, відібрані феном, — максимально природний відблиск.' }
  };
  const svg = $('#hairSvg');
  if (svg) {
    const NS = 'http://www.w3.org/2000/svg', defs = $('defs', svg), g = $('#hairStrands');
    const W = 360, H = 560, N = 26;
    let shade = 'honey', tech = 'balayage';
    const mkGrad = id => { const lg = document.createElementNS(NS, 'linearGradient'); lg.id = id; lg.setAttribute('gradientUnits', 'userSpaceOnUse'); lg.setAttribute('x1', 0); lg.setAttribute('y1', 30); lg.setAttribute('x2', 0); lg.setAttribute('y2', H - 10); defs.appendChild(lg); return lg; };
    const gA = mkGrad('gA'), gB = mkGrad('gB');
    const strands = [];
    for (let i = 0; i < N; i++) {
      const p = document.createElementNS(NS, 'path');
      const t = i / (N - 1);
      const s = { p, x0: 120 + t * 120 + (Math.random() - .5) * 8, spread: (t - .5) * 220, amp: 14 + Math.random() * 16, ph: Math.random() * 6.28, len: H - 40 - Math.random() * 70, w: 3.2 + Math.random() * 3.4, alt: i % 3 === 1 };
      p.setAttribute('stroke-width', s.w.toFixed(2));
      p.setAttribute('stroke', s.alt ? 'url(#gB)' : 'url(#gA)');
      p.style.opacity = (.78 + Math.random() * .22).toFixed(2);
      g.appendChild(p); strands.push(s);
    }
    const draw = time => {
      const k = time * .0006;
      strands.forEach(s => {
        const pts = [];
        for (let j = 0; j <= 12; j++) {
          const v = j / 12, y = 30 + v * s.len;
          const x = s.x0 + s.spread * Math.pow(v, 1.6) + Math.sin(v * 5 + s.ph + k) * s.amp * v + Math.sin(v * 11 + s.ph) * 3 * v;
          pts.push([x, y]);
        }
        let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
        for (let j = 1; j < pts.length; j++) { const [x0, y0] = pts[j - 1], [x1, y1] = pts[j]; d += ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`; }
        s.p.setAttribute('d', d);
      });
    };
    const stops = (lg, arr) => { lg.innerHTML = arr.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join(''); };
    const paint = () => {
      const [root, mid, tip] = SHADES[shade].c, nat = '#3a2a1f';
      let a, b;
      if (tech === 'solid') { a = [[0, mid], [1, mid]]; b = [[0, root], [.15, mid], [1, mid]]; }
      if (tech === 'balayage') { a = [[0, nat], [.32, nat], [.62, mid], [1, tip]]; b = [[0, nat], [.2, mid], [.55, tip], [1, tip]]; }
      if (tech === 'ombre') { a = [[0, nat], [.48, nat], [.66, mid], [1, tip]]; b = [[0, nat], [.5, nat], [.68, tip], [1, tip]]; }
      if (tech === 'airtouch') { a = [[0, root], [.12, mid], [.7, mid], [1, tip]]; b = [[0, mid], [.08, tip], [1, tip]]; }
      stops(gA, a); stops(gB, b);
      $('#shadeName').textContent = SHADES[shade].name;
      $('#techName').textContent = TECH[tech].name;
      $('.shades__desc').textContent = SHADES[shade].d + ' ' + TECH[tech].d;
    };
    const radio = (sel, attr, set) => $$(sel).forEach(b => b.addEventListener('click', () => {
      $$(sel).forEach(x => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); set(b.dataset[attr]); paint();
    }));
    radio('.swatches button', 'shade', v => shade = v);
    radio('.techs button', 'tech', v => tech = v);
    paint(); draw(0);
    if (!reduce) {
      let vis = false;
      new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(svg);
      const loop = t => { if (vis) draw(t); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
    $('#shadeCta').addEventListener('click', () => {
      $('#f-service').value = 'Фарбування';
      $('#f-msg').value = `Хочу колір: ${SHADES[shade].name.toLowerCase()}, техніка: ${TECH[tech].name}.`;
    });
  }

  /* Кнопки «Записатися на…» підставляють послугу */
  $$('[data-service]').forEach(b => b.addEventListener('click', () => { $('#f-service').value = b.dataset.service; }));

  /* Форма запису */
  const form = $('#bookForm');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = form.name.value.trim(), phone = form.phone.value.trim();
    const okPhone = phone.replace(/\D/g, '').length >= 9;
    form.name.parentElement.classList.toggle('err', !name);
    form.phone.parentElement.classList.toggle('err', !okPhone);
    $('.form__err', form).hidden = !!(name && okPhone);
    if (!name || !okPhone) return;
    const text = `Доброго дня! Хочу записатися в Shamanka.\nІм’я: ${name}\nТелефон: ${phone}\nПослуга: ${form.service.value}` +
      (form.when.value.trim() ? `\nКоли зручно: ${form.when.value.trim()}` : '') + (form.msg.value.trim() ? `\nКоментар: ${form.msg.value.trim()}` : '');
    $('#sendWa').href = 'https://wa.me/380661296439?text=' + encodeURIComponent(text);
    $('#sendViber').href = 'viber://chat?number=%2B380661296439';
    try { navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {}); } catch (_) {}
    $('.form__done', form).hidden = false;
    $('button[type=submit]', form).textContent = 'Оновити заявку';
  });

  /* Відкрито зараз? (час Києва) */
  const now = $('#openNow');
  if (now) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const get = t => parts.find(p => p.type === t).value;
      const wd = get('weekday'), m = +get('hour') * 60 + +get('minute');
      const close = wd === 'Sun' ? 0 : wd === 'Sat' ? 17 * 60 : 19 * 60;
      const open = wd !== 'Sun' && m >= 540 && m < close;
      now.textContent = open ? `Зараз відчинено · до ${close / 60}:00` : 'Зараз зачинено · запишіться на завтра';
    } catch (_) {}
  }
  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
