(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hdr = $(".hdr");

  /* smooth scroll */
  let lenis = null;
  if (!reduce && window.Lenis && matchMedia("(pointer:fine)").matches) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const goTo = el => {
    const y = el.getBoundingClientRect().top + scrollY - (hdr.offsetHeight + 12);
    if (lenis) lenis.scrollTo(y); else scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  };
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length < 2) { e.preventDefault(); goTo(document.body); return; }
    const el = $(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    if (a.dataset.service) setService(a.dataset.service);
    goTo(el);
    if (id === "#zapys") setTimeout(() => $('#zapys input[name="name"]').focus({ preventScroll: true }), 700);
  });

  /* menu */
  const burger = $(".burger"), mnav = $("#mnav");
  function closeMenu() { burger.setAttribute("aria-expanded", "false"); mnav.hidden = true; }
  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", String(open)); mnav.hidden = !open;
  });

  /* header + mobile bar */
  const mbar = $(".mbar"), hero = $(".hero");
  const onScroll = () => {
    hdr.classList.toggle("is-s", scrollY > 8);
    const past = scrollY > hero.offsetHeight * 0.6;
    const nearForm = $("#zapys").getBoundingClientRect().top < innerHeight && $("#zapys").getBoundingClientRect().bottom > 0;
    mbar.classList.toggle("is-on", past && !nearForm);
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* reveal */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  $$(".rv, .smile").forEach(el => io.observe(el));

  /* finder */
  const F = [
    { dir: "Терапія", img: "therapy", alt: "Лікар показує модель зуба", t: "Біль не варто терпіти до вихідних", p: "Лікар знайде причину болю й вилікує карієс або поставить пломбу. Що раніше прийти, то простіше й дешевше лікування.", l: ["Лікування карієсу", "Пломбування зубів", "Консультація стоматолога"], s: "Терапія (лікування зубів)" },
    { dir: "Гігієна і відбілювання", img: "whitening", alt: "Білі рівні зуби крупним планом", t: "Спочатку чистка, потім відбілювання", p: "Професійна чистка знімає наліт від кави, чаю й цигарок, і зуби вже стають світлішими. Далі можна обрати лазерне або фотовідбілювання.", l: ["Чистка Air Flow і ультразвук", "Полірування зубів", "Лазерне та фотовідбілювання"], s: "Гігієна / відбілювання" },
    { dir: "Імплантація", img: "implant", alt: "Модель зубного імпланта", t: "Імплант замість втраченого зуба", p: "Імплант відновлює зуб разом з коренем і не чіпає сусідні зуби. Якщо кістки замало, хірург запропонує кісткову пластику.", l: ["Консультація хірурга-стоматолога", "Встановлення імплантів", "Кісткова пластика"], s: "Імплантація / хірургія" },
    { dir: "Ортодонтія", img: "ortho", alt: "Прозорий елайнер", t: "Рівні зуби в будь-якому віці", p: "Ортодонт оцінить прикус і запропонує брекети або майже непомітні елайнери. Після лікування ретейнер зберігає результат.", l: ["Консультація ортодонта", "Брекет-системи", "Елайнери та ретейнери"], s: "Ортодонтія (брекети, елайнери)" },
    { dir: "Ортопедія", img: "scan", alt: "Цифровий знімок зубів", t: "Повернути зубу форму й колір", p: "Сколотий зуб відновлять вкладкою або коронкою, стару коронку замінять. Для фронтальних зубів є вініри й люмініри.", l: ["Коронки й мости", "Вкладки", "Вініри та люмініри"], s: "Ортопедія (коронки, вініри)" },
    { dir: "Дитяча стоматологія", img: "kids", alt: "Дитина на огляді в стоматолога", t: "Перший візит без страху", p: "Огляд, лікування молочних і постійних зубів, герметизація фісур, щоб захистити жувальні зуби від карієсу.", l: ["Огляд і консультація", "Лікування карієсу", "Герметизація фісур"], s: "Дитяча стоматологія" }
  ];
  const fb = $(".finder__body"), fimg = $(".js-f-img");
  $$(".finder__chips button").forEach(b => b.addEventListener("click", () => {
    $$(".finder__chips button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
    const d = F[+b.dataset.f];
    $(".js-f-dir").textContent = d.dir; $(".js-f-title").textContent = d.t; $(".js-f-text").textContent = d.p;
    $(".js-f-list").innerHTML = d.l.map(x => `<li>${x}</li>`).join("");
    $(".js-f-btn").dataset.service = d.s;
    fimg.style.opacity = 0;
    setTimeout(() => { fimg.src = `img/photos/${d.img}.jpg`; fimg.alt = d.alt; fimg.style.opacity = 1; }, 200);
    fb.classList.remove("is-swap"); void fb.offsetWidth; fb.classList.add("is-swap");
  }));

  /* service → form */
  const sel = $('#zapys select[name="service"]');
  function setService(s) {
    const o = [...sel.options].find(o => o.text === s);
    if (o) sel.value = o.value;
  }

  /* signature: shade story */
  const shades = [["A3.5", "#d6bb8e"], ["A3", "#dcc49c"], ["A2", "#e3cfab"], ["B2", "#e8d8ba"], ["A1", "#ede2ca"], ["B1", "#f2ead9"], ["BL2", "#f6f1e6"], ["BL1", "#fbf8f2"]];
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };
  const story = $(".story"), chaps = $$(".chap"), tabs = $$(".guide li"), label = $(".js-shade"), bar = $(".js-bar"), root = document.documentElement;
  let lastIdx = -1, ticking = false;
  function storyUpdate() {
    ticking = false;
    const r = $(".story__chapters").getBoundingClientRect();
    const start = innerHeight * 0.75, total = r.height - innerHeight * 0.35;
    const p = Math.min(1, Math.max(0, (start - r.top) / total));
    const f = p * (shades.length - 1), i = Math.min(shades.length - 2, Math.floor(f));
    root.style.setProperty("--tooth", mix(shades[i][1], shades[i + 1][1], f - i));
    const idx = Math.round(f);
    if (idx !== lastIdx) {
      lastIdx = idx; label.textContent = shades[idx][0];
      tabs.forEach((t, k) => t.classList.toggle("is-on", k === idx));
    }
    bar.style.transform = `scaleX(${p})`;
    const mid = innerHeight * 0.55;
    let on = 0;
    chaps.forEach((c, k) => { if (c.getBoundingClientRect().top < mid) on = k; });
    chaps.forEach((c, k) => c.classList.toggle("is-on", k === on));
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(storyUpdate); } }, { passive: true });
  addEventListener("resize", storyUpdate); storyUpdate();

  /* open now (Kyiv time) */
  function kyivNow() {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const g = t => parts.find(p => p.type === t).value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
    return { day, min: (+g("hour") % 24) * 60 + +g("minute") };
  }
  try {
    const { day, min } = kyivNow();
    const open = day >= 1 && day <= 6 && min >= 540 && min < 1200;
    const tr = $(`.hours tr[data-d="${day}"]`); if (tr) tr.classList.add("is-today");
    const nextTxt = day === 6 || day === 0 ? (day === 0 || min >= 1200 ? "відкриємось у понеділок о 9:00" : "відкриємось о 9:00") : (min < 540 ? "відкриємось о 9:00" : "відкриємось завтра о 9:00");
    $(".js-open").textContent = open ? "Відчинено" : "Зачинено";
    $(".js-open").classList.toggle("is-closed", !open);
    $(".js-open-sub").textContent = open ? "сьогодні до 20:00" : nextTxt;
    $(".js-open-long").textContent = open ? "Зараз відчинено, до 20:00" : "Зараз зачинено, " + nextTxt;
    $(".openst").classList.toggle("is-closed", !open);
  } catch (e) { /* keep static text */ }

  /* form */
  const form = $("#zapys"), err = $(".form__err"), ok = $(".form__ok");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const d = new FormData(form);
    const name = (d.get("name") || "").trim(), phone = (d.get("phone") || "").trim();
    $$(".bad", form).forEach(x => x.classList.remove("bad"));
    const probs = [];
    if (name.length < 2) { probs.push("ім'я"); form.name.classList.add("bad"); }
    if (phone.replace(/\D/g, "").length < 9) { probs.push("телефон"); form.phone.classList.add("bad"); }
    if (!form.ok.checked) probs.push("згоду на обробку даних");
    if (probs.length) { err.textContent = "Будь ласка, вкажіть " + probs.join(", ") + "."; err.hidden = false; return; }
    err.hidden = true;
    const body = `Ім'я: ${name}\nТелефон: ${phone}\nНапрям: ${d.get("service")}\nКоли зручно: ${d.get("when")}\nКоментар: ${(d.get("msg") || "").trim() || "—"}`;
    ok.hidden = false;
    location.href = `mailto:wsdentistry.if@gmail.com?subject=${encodeURIComponent("Запис з сайту: " + d.get("service"))}&body=${encodeURIComponent(body)}`;
  });

  $(".js-y").textContent = new Date().getFullYear();
})();
