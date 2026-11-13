/* Shamanka — демо. Без залежностей, окрім Lenis (плавний скрол). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Резерв для фото: якщо raw.githubusercontent недоступний, беремо ту саму версію з jsDelivr */
  document.addEventListener('error', e => {
    const im = e.target;
    if (im.tagName !== 'IMG' || im.dataset.fb) return;
    const m = im.src.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([0-9a-f]{40})\/(.+)$/);
    if (m) { im.dataset.fb = 1; im.src = `https://cdn.jsdelivr.net/gh/${m[1]}/${m[2]}@${m[3]}/${m[4]}`; }
  }, true);
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
  const hdr = $('.hdr'), mbar = $('.mbar'), fab = $('.fab'), sp = $('.sp-fg');
  let spLen = 0;
  if (sp) { spLen = sp.getTotalLength(); sp.style.strokeDasharray = spLen; sp.style.strokeDashoffset = spLen; }
  const onScroll = () => {
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    hdr.classList.toggle('is-solid', y > 30);
    const nearForm = (() => { const f = $('#zapys').getBoundingClientRect(); return f.top < innerHeight && f.bottom > 0; })();
    mbar.classList.toggle('show', !nearForm); mbar.classList.toggle('hide', nearForm);
    if (fab) fab.classList.toggle('show', y > innerHeight * .8 && !nearForm);
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
    const W = 360, H = 560, N = 64, TOP = 70;
    let shade = 'honey', tech = 'balayage';
    const mkGrad = id => { const lg = document.createElementNS(NS, 'linearGradient'); lg.id = id; lg.setAttribute('gradientUnits', 'userSpaceOnUse'); lg.setAttribute('x1', 0); lg.setAttribute('y1', TOP); lg.setAttribute('x2', 0); lg.setAttribute('y2', H - 20); defs.appendChild(lg); return lg; };
    const gA = mkGrad('gA'), gB = mkGrad('gB');
    /* Пасмо волосся: зібране «затискачем» угорі, розходиться хвилею й звужується до кінчика */
    const strands = [];
    for (let i = 0; i < N; i++) {
      const p = document.createElementNS(NS, 'path');
      const t = i / (N - 1) - .5;
      const s = { p, t, jit: (Math.random() - .5) * .25, len: .82 + Math.random() * .18, ph: Math.random() * 6.28, w: 1.3 + Math.random() * 1.6, alt: Math.random() < .38 };
      p.setAttribute('stroke-width', s.w.toFixed(2));
      p.setAttribute('stroke', s.alt ? 'url(#gB)' : 'url(#gA)');
      p.style.opacity = (.7 + Math.random() * .3).toFixed(2);
      g.appendChild(p); strands.push(s);
    }
    const clasp = document.createElementNS(NS, 'ellipse');
    clasp.setAttribute('class', 'clasp'); clasp.setAttribute('cx', W / 2); clasp.setAttribute('cy', TOP + 4); clasp.setAttribute('rx', 20); clasp.setAttribute('ry', 6);
    svg.appendChild(clasp);
    const draw = time => {
      const k = time * .0007;
      strands.forEach(s => {
        const L = (H - 30 - TOP) * s.len;
        let d = '';
        let px, py;
        for (let j = 0; j <= 16; j++) {
          const v = j / 16, y = TOP + v * L;
          const width = 14 + 120 * Math.sin(Math.min(1, v * 1.15) * Math.PI) * (1 - v * .35);
          const wave = Math.sin(v * 5.2 - 1 + k) * 46 * v + Math.sin(v * 9 + s.ph + k * 1.3) * 4 * v;
          const x = W / 2 + wave + (s.t + s.jit * v) * width;
          if (!j) d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
          else d += ` Q${px.toFixed(1)} ${py.toFixed(1)} ${((px + x) / 2).toFixed(1)} ${((py + y) / 2).toFixed(1)}`;
          px = x; py = y;
        }
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

  /* ===== Анімації v2 ===== */
  // Слово «характером»: по літерах
  const em = $('.hero__title em');
  if (em && !reduce) { const t = em.textContent; em.setAttribute('aria-label', t); em.innerHTML = [...t].map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i}">${c}</span>`).join(''); }
  // Заголовки секцій: по словах (зберігаємо <em>)
  $$('.sec h2').forEach(h => {
    let i = 0;
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(w => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'sw'; s.innerHTML = `<span style="--i:${i++}">${w}</span>`; frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(h);
  });
  // Пасмо-розділювач над кожним заголовком секції
  $$('.sec__head, .shades__text, .booking__text, .contacts__info').forEach(head => {
    const eb = $('.eyebrow', head); if (!eb) return;
    eb.insertAdjacentHTML('beforebegin', '<svg class="divider" viewBox="0 0 120 18" aria-hidden="true"><path d="M2 9 C 18 -2, 30 20, 46 9 S 74 -2, 90 9 S 110 18, 118 7"/></svg>');
  });
  // Фото послуг і мапа: розкриття шторкою
  $$('.svc__inner img, .map').forEach(el => el.classList.add('mask'));
  // Футер-логотип: по літерах
  const fb = $('.ftr__big');
  if (fb) fb.innerHTML = [...fb.textContent].map((c, i) => `<span class="fl" style="--i:${i}">${c}</span>`).join('');
  const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); } }), { threshold: .12 });
  if (reduce) $$('.mask, .gal figure, .ftr__big, .reveal, .step, .master').forEach(el => el.classList.add('in'));
  else $$('.mask, .gal figure, .ftr__big, .step, .master').forEach(el => io2.observe(el));
  // Відкриття акордеону: фото знову «розкривається»
  $$('.svc__row').forEach(r => r.addEventListener('click', () => { const im = $('.svc__inner img', r.parentElement); if (im && !reduce) { im.classList.remove('in'); setTimeout(() => im.classList.add('in'), 150); } }));
  // Перефарбування пасма: короткий спалах
  const vis = $('.shades__visual');
  $$('.swatches button, .techs button').forEach(b => b.addEventListener('click', () => { if (!vis) return; vis.classList.add('repaint'); setTimeout(() => vis.classList.remove('repaint'), 260); }));
  if (!reduce) {
    // Паралакс: фото героя й галерея
    const heroImg = $('.arch img'), gal = $('.gal');
    let ticking = false;
    const par = () => {
      ticking = false;
      const y = scrollY;
      if (heroImg && y < innerHeight * 1.3) heroImg.style.transform = `translateY(${(y * .1).toFixed(1)}px) scale(1.08)`;
      if (gal) {
        const r = gal.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) {
          const k = (innerHeight - r.top) / (innerHeight + r.height);
          $$('figure.in img', gal).forEach((im, i) => { im.style.transform = `translateY(${((k - .5) * (i % 2 ? -36 : 36)).toFixed(1)}px) scale(1.1)`; });
        }
      }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true });
    setTimeout(par, 1700);
    // Магнітні кнопки (ПК)
    if (matchMedia('(hover:hover) and (pointer:fine)').matches) $$('.btn').forEach(b => {
      b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * .15).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * .25).toFixed(1)}px)`; });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
  }
  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
