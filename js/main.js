/* Автомийка / детейлінг — шаблон Ansaro. Без бібліотек. */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BIZ = "Garages1";

  /* ---------- меню ---------- */
  var burger = $('#burger'), nav = $('#nav');
  function closeNav() { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Відкрити меню'); }
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
  }

  /* ---------- піна в hero: стираємо «склоочисником» ---------- */
  (function foam() {
    var wrap = $('#foamwrap'), cv = $('#foam'), hint = $('#foamhint');
    if (!wrap || !cv || !cv.getContext) return;
    if (reduce) { cv.remove(); if (hint) hint.remove(); return; }
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, lastW = 0, wiped = 0, seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    if (hint && window.matchMedia('(pointer:fine)').matches) {
      hint.lastChild.nodeValue = 'Проведіть курсором — змийте піну';
    }

    function paint() {
      var r = wrap.getBoundingClientRect();
      W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
      if (!W || !H) return false;
      cv.width = W; cv.height = H; lastW = r.width; seed = 7;
      ctx.globalCompositeOperation = 'source-over';
      var g = ctx.createLinearGradient(0, 0, W * 0.3, H);
      g.addColorStop(0, 'rgba(246,250,252,0.97)');
      g.addColorStop(1, 'rgba(214,226,232,0.95)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var n = Math.round((W * H) / (900 * dpr * dpr));
      for (var i = 0; i < n; i++) {
        var x = rnd() * W, y = rnd() * H, rr = (2 + Math.pow(rnd(), 2.4) * 22) * dpr;
        ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + rnd() * 0.4) + ')'; ctx.fill();
        ctx.lineWidth = Math.max(0.8, rr * 0.08);
        ctx.strokeStyle = 'rgba(120,145,158,' + (0.18 + rnd() * 0.22) + ')'; ctx.stroke();
        if (rr > 5 * dpr) {
          ctx.beginPath(); ctx.arc(x - rr * 0.35, y - rr * 0.35, rr * 0.22, 0, 6.283);
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'destination-out';
      return true;
    }
    // смуга, яку змиває склоочисник: від y0 до y1, рваний край з боків
    var x0f = 0.07, x1f = 0.93;
    function wipeBand(y0, y1) {
      var x0 = W * x0f, x1 = W * x1f;
      ctx.fillStyle = '#000';
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0 + 1);
      for (var y = y0; y < y1; y += 9 * dpr) {
        ctx.beginPath(); ctx.arc(x0, y, (6 + rnd() * 16) * dpr, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(x1, y, (6 + rnd() * 16) * dpr, 0, 6.283); ctx.fill();
      }
    }
    function finalState() { wipeBand(0, H * 0.9); bottomEdge(); }
    function bottomEdge() {
      var yb = H * 0.9;
      for (var x = W * x0f; x < W * x1f; x += 10 * dpr) {
        ctx.beginPath(); ctx.arc(x, yb, (5 + rnd() * 18) * dpr, 0, 6.283); ctx.fill();
      }
    }

    var blade = document.createElement('i');
    blade.className = 'blade'; blade.setAttribute('aria-hidden', 'true');
    wrap.appendChild(blade);

    function run() {
      if (!paint()) return;
      var t0 = null, dur = 1500, prev = 0, end = H * 0.9;
      blade.style.left = (x0f * 100) + '%'; blade.style.right = ((1 - x1f) * 100) + '%';
      blade.classList.add('on');
      function frame(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur);
        var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var y = e * end;
        wipeBand(prev, y); prev = y;
        blade.style.transform = 'translateY(' + (y / dpr) + 'px)';
        if (k < 1) requestAnimationFrame(frame);
        else { bottomEdge(); blade.classList.remove('on'); }
      }
      setTimeout(function () { requestAnimationFrame(frame); }, 450);
    }
    var img = $('img', wrap);
    if (img && !img.complete) img.addEventListener('load', run, { once: true }); else run();
    setTimeout(function () { if (!W) run(); }, 2500);

    window.addEventListener('resize', function () {
      var r = wrap.getBoundingClientRect();
      if (Math.abs(r.width - lastW) > 2 && paint()) finalState();
    });

    // стирання пальцем/курсором
    var drawing = false, lx = 0, ly = 0;
    function pos(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr]; }
    function stroke(x, y) {
      ctx.lineCap = 'round'; ctx.lineWidth = 64 * dpr; ctx.strokeStyle = '#000';
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke();
      wiped += Math.hypot(x - lx, y - ly);
      if (hint && wiped > 400 * dpr) hint.classList.add('gone');
      lx = x; ly = y;
    }
    cv.addEventListener('pointerdown', function (e) { var p = pos(e); drawing = true; lx = p[0]; ly = p[1]; stroke(p[0] + 0.1, p[1]); });
    cv.addEventListener('pointermove', function (e) {
      var p = pos(e);
      if (drawing || e.pointerType === 'mouse') {
        if (!drawing) { lx = p[0]; ly = p[1]; drawing = true; }
        stroke(p[0], p[1]);
      }
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { cv.addEventListener(ev, function () { drawing = false; }); });
  })();

  /* ---------- підбір пакета ---------- */
  var CLS = ['Легкове', 'Кросовер', 'Великий авто'];
  var CARS = ['#car-sedan', '#car-suv', '#car-van'];
  var PACKS = {
    express: { name: 'Експрес-мийка', time: ['≈ 30 хв', '≈ 40 хв', '≈ 50 хв'],
      list: ['Безконтактна піна й ополіскування', 'Ручна мийка кузова', 'Мийка килимків', 'Сушка мікрофіброю'] },
    complex: { name: 'Комплексна мийка', time: ['≈ 1,5 год', '≈ 2 год', '≈ 2,5 год'],
      list: ['Двофазна мийка кузова й дисків', 'Пилосос салону й багажника', 'Панель, пороги, пластик', 'Скло зсередини без розводів'] },
    dry: { name: 'Хімчистка салону', time: ['4–5 год', '5–6 год', '6–8 год'],
      list: ['Сидіння, стеля, підлога, багажник', 'Засіб під тип оббивки', 'Сушка на місці', 'Кондиціонер для шкіри'] },
    polish: { name: 'Полірування кузова', time: ['1 день', '1–2 дні', '2 дні'],
      list: ['Мийка й очищення лаку глиною', 'Замір товщини покриття', 'Багатоетапне полірування', 'Захисний віск на кузов'] }
  };
  var state = { cls: 0, pack: 'express' };
  var ticket = $('#ticket'), pt = $('#pt');

  function priceHTML(pack, cls) {
    var row = pt && pt.querySelector('.pt__row[data-pack="' + pack + '"]');
    var cell = row && row.children[cls + 1];
    return cell ? cell.innerHTML : '';
  }
  function render(flash) {
    if (!ticket) return;
    var p = PACKS[state.pack];
    $('[data-t="cls"]', ticket).textContent = CLS[state.cls];
    $('[data-t="car"]', ticket).setAttribute('href', CARS[state.cls]);
    $('[data-t="name"]', ticket).textContent = p.name;
    $('[data-t="price"]', ticket).innerHTML = priceHTML(state.pack, state.cls);
    $('[data-t="time"]', ticket).textContent = p.time[state.cls];
    $('[data-t="list"]', ticket).innerHTML = p.list.map(function (t) {
      return '<li><svg class="ic"><use href="#i-check"/></svg><span>' + t + '</span></li>';
    }).join('');
    $$('.pack').forEach(function (l) { l.classList.toggle('on', $('input', l).checked); });
    if (pt) {
      pt.setAttribute('data-active', String(state.cls));
      $$('.pt__row', pt).forEach(function (r) { r.classList.toggle('hl', r.getAttribute('data-pack') === state.pack); });
    }
    $$('#priceSeg button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-cls') === String(state.cls) ? 'true' : 'false'); });
    var rc = $('input[name="cls"][value="' + state.cls + '"]'); if (rc) rc.checked = true;
    if (flash && !reduce) { ticket.classList.remove('flash'); void ticket.offsetWidth; ticket.classList.add('flash'); }
  }
  $$('input[name="cls"]').forEach(function (i) { i.addEventListener('change', function () { state.cls = +i.value; render(true); }); });
  $$('input[name="pack"]').forEach(function (i) { i.addEventListener('change', function () { state.pack = i.value; render(true); }); });
  $$('#priceSeg button').forEach(function (b) { b.addEventListener('click', function () { state.cls = +b.getAttribute('data-cls'); render(false); }); });
  var tb = $('#ticketBook');
  if (tb) tb.addEventListener('click', function () {
    var fc = $('#fCls'), fp = $('#fPack');
    if (fc) fc.value = String(state.cls);
    if (fp) fp.value = state.pack;
  });
  render(false);

  /* ---------- кроки: лінія води ---------- */
  var steps = $('#steps'), fill = $('#stepsFill'), stepEls = $$('.step');
  function onScrollSteps() {
    if (!steps) return;
    var r = steps.getBoundingClientRect(), vh = window.innerHeight, mark = vh * 0.62;
    var p = Math.max(0, Math.min(1, (mark - r.top) / r.height));
    if (fill) fill.style.setProperty('--p', (p * 100).toFixed(1) + '%');
    stepEls.forEach(function (s) { s.classList.toggle('lit', s.getBoundingClientRect().top < mark); });
  }

  /* ---------- мобільна панель ---------- */
  var bar = $('.bar'), hero = $('.hero');
  function onScrollBar() {
    if (!bar || !hero) return;
    bar.classList.toggle('show', window.scrollY > hero.offsetHeight * 0.5);
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { onScrollSteps(); onScrollBar(); ticking = false; });
  }, { passive: true });
  onScrollSteps(); onScrollBar();

  /* ---------- поява блоків ---------- */
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rvs.forEach(function (el) { io.observe(el); });
  } else rvs.forEach(function (el) { el.classList.add('in'); });

  /* ---------- графік і статус за київським часом ---------- */
  (function hours() {
    var list = $('#hoursList'); if (!list) return;
    var H = {};
    $$('li', list).forEach(function (li) {
      var o = li.getAttribute('data-open'), c = li.getAttribute('data-close');
      H[li.getAttribute('data-day')] = o && c ? [o, c] : null;
    });
    var DAYN = ['неділю', 'понеділок', 'вівторок', 'середу', 'четвер', "п'ятницю", 'суботу'];
    function mins(t) { var a = t.split(':'); return +a[0] * 60 + +a[1]; }
    function kyiv() {
      try {
        var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
        var parts = {}; f.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
        var wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
        return { d: wd, m: (+parts.hour % 24) * 60 + +parts.minute };
      } catch (e) { var n = new Date(); return { d: n.getDay(), m: n.getHours() * 60 + n.getMinutes() }; }
    }
    function update() {
      var now = kyiv(), today = H[now.d], open = false, text;
      if (today) {
        var o = mins(today[0]), c = mins(today[1]);
        if (c <= o) c += 1440;
        open = now.m >= o && now.m < c;
      }
      if (open) text = 'Відчинено до ' + today[1];
      else {
        if (today && now.m < mins(today[0])) text = 'Зачинено · відкриємо о ' + today[0];
        else {
          text = 'Зачинено';
          for (var i = 1; i <= 7; i++) {
            var d = (now.d + i) % 7;
            if (H[d]) { text = 'Зачинено · відкриємо ' + (i === 1 ? 'завтра' : 'в ' + DAYN[d]) + ' о ' + H[d][0]; break; }
          }
        }
      }
      $$('[data-status]').forEach(function (s) {
        s.classList.toggle('is-open', open); s.classList.toggle('is-closed', !open);
        var t = $('[data-status-text]', s); if (t) t.textContent = text;
      });
      $$('li', list).forEach(function (li) { li.classList.toggle('today', li.getAttribute('data-day') === String(now.d)); });
    }
    update(); setInterval(update, 60000);
  })();

  /* ---------- форма ---------- */
  (function form() {
    var f = $('#form'), done = $('#done'); if (!f) return;
    var date = $('#fDate');
    if (date) {
      var d = new Date(), iso = function (x) { return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
      date.min = iso(d); date.value = iso(d);
    }
    var note = $('#viaNote');
    function syncNote() {
      var c = f.querySelector('input[name="via"]:checked');
      var v = c ? c.value : (f.querySelector('input[name="via"]') || {}).value;
      if (note) note.hidden = !(v === 'telegram' || v === 'instagram');
    }
    $$('input[name="via"]', f).forEach(function (i) { i.addEventListener('change', syncNote); });
    syncNote();

    function bad(name, on) { var el = f.elements[name]; if (el) el.closest('.f').classList.toggle('bad', on); return on; }
    f.addEventListener('input', function (e) { var l = e.target.closest('.f'); if (l) l.classList.remove('bad'); });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.elements.name.value.trim(), phone = f.elements.phone.value.trim();
      var digits = phone.replace(/\D/g, '');
      var err = false;
      err = bad('name', name.length < 2) || err;
      err = bad('phone', digits.length < 10 || digits.length > 12) || err;
      err = bad('date', date && !date.value) || err;
      if (err) { var first = f.querySelector('.bad input'); if (first) first.focus(); return; }

      var cls = f.elements.cls, pack = f.elements.pack;
      var dt = date && date.value ? date.value.split('-').reverse().slice(0, 2).join('.') : '';
      var car = f.elements.car.value.trim();
      var text = 'Запис на мийку — ' + BIZ + '\n' +
        "Ім'я: " + name + '\n' +
        'Телефон: ' + phone + '\n' +
        'Авто: ' + cls.options[cls.selectedIndex].text + (car ? ' (' + car + ')' : '') + '\n' +
        'Пакет: ' + pack.options[pack.selectedIndex].text + '\n' +
        'Коли: ' + dt + (f.elements.time.value ? ', ' + f.elements.time.value : '');

      var ch = f.querySelector('input[name="via"]:checked') || f.querySelector('input[name="via"]');
      if (!ch) return;
      var v = ch.value, base = ch.getAttribute('data-url'), enc = encodeURIComponent(text), url = base, copy = false;
      if (v === 'viber') url = base + '&draft=' + enc;
      else if (v === 'whatsapp') url = base + '?text=' + enc;
      else if (v === 'sms') url = base + '?&body=' + enc;
      else if (v === 'email') url = base + '?subject=' + encodeURIComponent('Запис на мийку') + '&body=' + enc;
      else copy = true;
      if (copy && navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});

      var web = /^https:/.test(url);
      if (web) window.open(url, '_blank', 'noopener'); else window.location.href = url;

      var link = $('#doneLink');
      if (link) {
        link.href = url;
        if (web) { link.target = '_blank'; link.rel = 'noopener'; } else { link.removeAttribute('target'); }
      }
      var dtext = $('#doneText');
      if (dtext) dtext.textContent = copy
        ? 'Текст заявки скопійовано. Вставте його в чат, що відкрився, і надішліть — ми підтвердимо час.'
        : 'Надішліть повідомлення, що відкрилося, — ми підтвердимо час.';
      f.hidden = true; done.hidden = false;
      done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
    var back = $('#doneBack');
    if (back) back.addEventListener('click', function () { done.hidden = true; f.hidden = false; });
  })();

  var y = $('#year'); if (y) y.textContent = String(new Date().getFullYear());
})();
