(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  /* ---------- year ---------- */
  $$("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- open / closed (Kyiv time) ---------- */
  // Пн–Пт 9–13, 14–18; Сб 9–13 (з OSM, уточнити в клініки)
  const HOURS = { 1: [[9, 13], [14, 18]], 2: [[9, 13], [14, 18]], 3: [[9, 13], [14, 18]], 4: [[9, 13], [14, 18]], 5: [[9, 13], [14, 18]], 6: [[9, 13]], 0: [] };
  const DAYS = ["у неділю", "у понеділок", "у вівторок", "у середу", "у четвер", "у п'ятницю", "у суботу"];
  function kyivNow() {
    try {
      const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      const g = t => p.find(x => x.type === t).value;
      const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
      return { wd, h: (+g("hour") % 24) + +g("minute") / 60 };
    } catch (e) { const d = new Date(); return { wd: d.getDay(), h: d.getHours() + d.getMinutes() / 60 }; }
  }
  function status() {
    const { wd, h } = kyivNow();
    const slot = HOURS[wd].find(([a, b]) => h >= a && h < b);
    if (slot) return { open: true, text: `Зараз відчинено · до ${slot[1]}:00` };
    const later = HOURS[wd].find(([a]) => h < a);
    if (later) return { open: false, text: `Зачинено · відкриємо о ${later[0]}:00` };
    for (let i = 1; i <= 7; i++) {
      const d = (wd + i) % 7;
      if (HOURS[d].length) return { open: false, text: `Зачинено · відкриємо ${i === 1 ? "завтра" : DAYS[d]} о ${HOURS[d][0][0]}:00` };
    }
    return { open: false, text: "" };
  }
  const st = status();
  $$("[data-status]").forEach(el => el.classList.toggle("is-open", st.open));
  const stText = $("[data-status-text]");
  if (stText && st.text) stText.textContent = st.text;

  /* ---------- header + mobile menu ---------- */
  const top = $(".top"), burger = $(".burger"), mnav = $("#mnav");
  function closeMenu() { burger.setAttribute("aria-expanded", "false"); mnav.hidden = true; }
  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", String(!open)); mnav.hidden = open;
  });
  $$("a", mnav).forEach(a => a.addEventListener("click", closeMenu));
  const dock = $(".dock"), hero = $(".hero");
  function onScroll() {
    const y = window.scrollY;
    top.classList.toggle("is-scrolled", y > 8);
    dock.classList.toggle("is-on", y > hero.offsetHeight * 0.6);
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- tooth arch (signature) ---------- */
  const svg = $("#arch"), NS = "http://www.w3.org/2000/svg";
  // FDI upper jaw, patient's right (18) → left (28). Sizes: [width along arch, depth]
  const SIZE = { 1: [25, 15], 2: [20, 15], 3: [20, 19], 4: [20, 22], 5: [20, 22], 6: [29, 28], 7: [27, 27], 8: [24, 25] };
  const order = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const cx = 200, cy = 250, A = 160, B = 205, T = 1.72, GAP = 3.2;
  const pt = t => [cx + A * Math.sin(t), cy - B * Math.cos(t)];
  // arc-length lookup
  const N = 600, ts = [], ls = [0];
  for (let i = 0; i <= N; i++) ts.push(-T + (2 * T * i) / N);
  for (let i = 1; i <= N; i++) { const [x1, y1] = pt(ts[i - 1]), [x2, y2] = pt(ts[i]); ls.push(ls[i - 1] + Math.hypot(x2 - x1, y2 - y1)); }
  const total = ls[N];
  const tAt = L => { let i = ls.findIndex(v => v >= L); if (i <= 0) return ts[0]; const f = (L - ls[i - 1]) / (ls[i] - ls[i - 1]); return ts[i - 1] + f * (ts[i] - ts[i - 1]); };
  const widths = order.map(n => SIZE[n % 10][0]);
  const need = widths.reduce((a, b) => a + b, 0) + GAP * (order.length - 1);
  let L = (total - need) / 2;
  const gum = document.createElementNS(NS, "path");
  const L0 = L - 14, L1 = L + need + 14; let d = "";
  for (let k = 0; k <= 80; k++) { const [x, y] = pt(tAt(L0 + (L1 - L0) * k / 80)); d += (k ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); }
  gum.setAttribute("d", d); gum.setAttribute("class", "gum"); svg.appendChild(gum);
  const teeth = {};
  order.forEach((n, i) => {
    const [w, dep] = SIZE[n % 10];
    const t = tAt(L + w / 2); L += w + GAP;
    const [x, y] = pt(t);
    const ang = (Math.atan2(B * Math.sin(t), A * Math.cos(t)) * 180) / Math.PI; // tangent angle
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "tooth ok");
    g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
    g.dataset.base = g.getAttribute("transform");
    const inner = document.createElementNS(NS, "g");
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("x", -w / 2); r.setAttribute("y", -dep / 2); r.setAttribute("width", w); r.setAttribute("height", dep);
    r.setAttribute("rx", n % 10 <= 3 ? 6 : 8);
    inner.appendChild(r); g.appendChild(inner);
    const title = document.createElementNS(NS, "title"); title.textContent = "Зуб " + n; g.appendChild(title);
    svg.appendChild(g); teeth[n] = { g, inner };
    // number label outside arch
    const [lx, ly] = [cx + (A + 30) * Math.sin(t), cy - (B + 30) * Math.cos(t)];
    if (n % 10 === 1 || n % 10 === 3 || n % 10 === 6 || n % 10 === 8) {
      const tx = document.createElementNS(NS, "text");
      tx.setAttribute("x", lx.toFixed(1)); tx.setAttribute("y", (ly + 3).toFixed(1)); tx.setAttribute("text-anchor", "middle"); tx.setAttribute("class", "lbl");
      tx.textContent = n; svg.appendChild(tx);
    }
  });

  try { const bb = svg.getBBox(), m = 30; svg.setAttribute("viewBox", `${(bb.x - m).toFixed(0)} ${(bb.y - m).toFixed(0)} ${(bb.width + 2 * m).toFixed(0)} ${(bb.height + 2 * m).toFixed(0)}`); } catch (e) {}

  const SYM = {
    pain: { on: [16, 25], tag: "Лікування зубів", title: "Біль і чутливість не минають самі", text: "Найчастіше це карієс або запалення під пломбою. Чим раніше лікар подивиться, тим простішим буде лікування і тим більше шансів зберегти власний зуб.", cta: "Записатися на лікування", service: "Лікування зубів" },
    chip: { on: [11, 21, 12], tag: "Естетична реставрація", title: "Скол чи пляма на передньому зубі", text: "Форму і колір можна відновити так, що реставрацію не видно в усмішці. Також замінюємо старі пломби, які потемніли з часом.", cta: "Записатися на реставрацію", service: "Естетична реставрація" },
    crooked: { on: [13, 12, 11, 21, 22, 23], shift: { 12: [0, 4, 8], 11: [1, -3, -6], 21: [-1, 3, 7], 22: [0, -4, -9] }, tag: "Ортодонтія і брекети", title: "Криві зуби вирівнюються в будь-якому віці", text: "Починаємо з діагностики прикусу. Після неї лікар пояснить, чи підходять брекети, і приблизно скільки триватиме лікування.", cta: "Записатися до ортодонта", service: "Ортодонтія і брекети" },
    missing: { on: [15], ghost: [26], tag: "Протезування", title: "Коли зуба немає або він зруйнований", text: "Без зуба сусідні поступово зміщуються, а жувати стає важче. Лікар підбере рішення під вашу ситуацію і пояснить різницю між варіантами.", cta: "Записатися на консультацію", service: "Протезування" },
    check: { on: "all", tag: "Огляд і консультація", title: "Огляд раз на пів року береже і зуби, і гроші", text: "Проблему, знайдену рано, лікувати швидше і дешевше. Почніть з огляду, а лікар скаже, чи потрібно щось робити.", cta: "Записатися на огляд", service: "Огляд і консультація" }
  };
  const ans = k => $(`[data-ans="${k}"]`);
  function show(key, animate = true) {
    const s = SYM[key];
    const on = s.on === "all" ? order : s.on;
    order.forEach((n, i) => {
      const { g, inner } = teeth[n];
      const isOn = on.includes(n), isGhost = (s.ghost || []).includes(n);
      g.setAttribute("class", "tooth " + (isGhost ? "ghost" : isOn ? "on" : "ok"));
      const sh = (s.shift || {})[n];
      inner.setAttribute("transform", sh ? `translate(${sh[0]} ${sh[1]}) rotate(${sh[2]})` : "");
      if (s.on === "all" && animate && !reduce) {
        g.setAttribute("class", "tooth ok");
        setTimeout(() => g.setAttribute("class", "tooth on"), 40 * i);
      }
    });
    ans("tag").textContent = s.tag; ans("title").textContent = s.title; ans("text").textContent = s.text;
    const c = ans("cta"); c.textContent = s.cta; c.dataset.service = s.service;
    if (animate && window.gsap && !reduce) gsap.fromTo(".care__answer > *", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .45, stagger: .05, ease: "power2.out" });
  }
  const chips = $$(".care__chips button");
  chips.forEach(b => b.addEventListener("click", () => {
    chips.forEach(x => x.setAttribute("aria-selected", String(x === b)));
    show(b.dataset.sym);
  }));
  $(".care__chips").addEventListener("keydown", e => {
    const i = chips.findIndex(b => b === document.activeElement);
    if (i < 0 || !["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    const n = chips[(i + (e.key === "ArrowRight" ? 1 : chips.length - 1)) % chips.length]; n.focus(); n.click();
  });
  show("pain", false);

  /* ---------- services preview (desktop) ---------- */
  const prev = $(".srv__preview img");
  $$(".srv__item").forEach(li => li.addEventListener("mouseenter", () => {
    const src = li.dataset.img; if (!prev || prev.getAttribute("src") === src) return;
    prev.classList.add("swap");
    setTimeout(() => { prev.src = src; prev.onload = () => prev.classList.remove("swap"); }, 180);
  }));
  // preload
  $$(".srv__item").forEach(li => { const i = new Image(); i.src = li.dataset.img; });

  /* ---------- booking form ---------- */
  const form = $("#booking"), msg = $(".book__msg", form);
  $$("[data-service]").forEach(a => a.addEventListener("click", () => {
    const v = a.dataset.service, sel = form.elements.service;
    [...sel.options].forEach(o => { if (o.text === v) sel.value = o.value; });
  }));
  form.addEventListener("submit", e => {
    e.preventDefault();
    const f = form.elements; let bad = null;
    [f.name, f.phone].forEach(el => el.classList.remove("is-bad"));
    if (!f.name.value.trim()) bad = bad || f.name, f.name.classList.add("is-bad");
    if (f.phone.value.replace(/\D/g, "").length < 9) bad = bad || f.phone, f.phone.classList.add("is-bad");
    if (bad) { msg.className = "book__msg err"; msg.textContent = "Вкажіть ім'я і номер телефону."; bad.focus(); return; }
    if (!f.agree.checked) { msg.className = "book__msg err"; msg.textContent = "Поставте позначку про згоду на обробку даних."; f.agree.focus(); return; }
    const body = `Ім'я: ${f.name.value.trim()}\nТелефон: ${f.phone.value.trim()}\nПослуга: ${f.service.value}\nЗручний час: ${f.time.value}\nКоментар: ${f.msg.value.trim() || "—"}\n\n(заявка з сайту)`;
    const href = "mailto:ads.stomatologia@gmail.com?subject=" + encodeURIComponent("Запис на прийом: " + f.name.value.trim()) + "&body=" + encodeURIComponent(body);
    msg.className = "book__msg ok";
    msg.textContent = "Дякуємо. Відкриваємо пошту з готовою заявкою. Якщо вона не відкрилась, подзвоніть 050 150 40 40.";
    window.location.href = href;
  });

  /* ---------- motion ---------- */
  if (reduce || !window.gsap) { $$(".rv").forEach(el => el.classList.remove("rv")); return; }
  gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.12 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
      const id = a.getAttribute("href"); if (id.length < 2) return;
      const el = $(id); if (!el) return; e.preventDefault(); lenis.scrollTo(el, { offset: -76 });
    }));
  }
  // hero
  gsap.from(".hero__title .line > span", { yPercent: 105, duration: 1.1, stagger: .1, ease: "expo.out", delay: .1 });
  gsap.from(".hero__lead, .hero__cta, .hero__tags, .hero .eyebrow", { y: 18, opacity: 0, duration: .8, stagger: .08, ease: "power3.out", delay: .45 });
  gsap.fromTo(".hero__media", { clipPath: "inset(12% 8% 12% 8% round 22px)" }, { clipPath: "inset(0% 0% 0% 0% round 22px)", duration: 1.4, ease: "expo.out", delay: .15, clearProps: "clipPath" });
  gsap.from(".hero__media img", { scale: 1.18, duration: 1.8, ease: "expo.out", delay: .15 });
  gsap.from(".hero__card", { y: -14, opacity: 0, duration: .7, delay: 1, ease: "power3.out" });
  gsap.to(".hero__media img", { yPercent: 8, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  // teeth grow in when arch enters
  gsap.from("#arch .tooth > g", { scale: 0, transformOrigin: "50% 50%", duration: .5, ease: "back.out(2)", stagger: { each: .04, from: "center" }, scrollTrigger: { trigger: "#arch", start: "top 80%" } });

  // generic reveals
  const groups = [".sec-head", ".care__chips", ".care__answer", ".srv__item", ".about__media", ".about__text > *", ".steps li", ".visit__media", ".rev__item", ".faq__list details", ".ct__info > *", ".book", ".map"];
  groups.forEach(sel => $$(sel).forEach(el => el.classList.add("rv")));
  ScrollTrigger.batch(".rv", { start: "top 88%", once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: .8, stagger: .08, ease: "power3.out", overwrite: true }) });
  gsap.fromTo(".about__media img", { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true } });
  addEventListener("load", () => ScrollTrigger.refresh());
})();
