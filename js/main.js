(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* header + menu */
  var hdr = document.querySelector(".hdr");
  var onScroll = function () { hdr.classList.toggle("is-scrolled", window.scrollY > 10); };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  var burger = document.getElementById("burger"), nav = document.getElementById("nav");
  var setMenu = function (open) {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
  };
  burger.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* open now (Kyiv time, Mon–Fri 9–17) */
  var live = document.getElementById("live");
  try {
    var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    var get = function (t) { return (parts.find(function (p) { return p.type === t; }) || {}).value; };
    var mins = parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10);
    if (["Mon", "Tue", "Wed", "Thu", "Fri"].indexOf(get("weekday")) > -1 && mins >= 540 && mins < 1020) { live.textContent = "Зараз відчинено до 17:00"; live.classList.add("is-open"); }
    else live.textContent = "Зараз зачинено · Пн–Пт 9:00–17:00";
  } catch (e) {}

  /* topic prefill */
  var topic = document.getElementById("topic");
  document.querySelectorAll("[data-topic]").forEach(function (a) {
    a.addEventListener("click", function () {
      var v = a.getAttribute("data-topic");
      Array.prototype.forEach.call(topic.options, function (o) { if (o.text === v) topic.value = v; });
    });
  });

  /* risk check */
  var qs = Array.prototype.slice.call(document.querySelectorAll("#qs li"));
  var score = document.getElementById("score"), verdict = document.getElementById("verdict"), level = document.getElementById("level");
  var tiles = document.querySelectorAll("#riskGrid li");
  var answers = new Array(qs.length).fill(null);
  var update = function () {
    var done = answers.filter(function (a) { return a !== null; }).length;
    var yes = answers.filter(function (a) { return a === 1; }).length;
    score.textContent = yes + " з " + qs.length + " захищено";
    answers.forEach(function (a, i) { tiles[i].classList.toggle("is-ok", a === 1); tiles[i].classList.toggle("is-bad", a === 0); });
    if (done < qs.length) { level.textContent = done ? "…" : "—"; level.style.color = ""; }
    else if (yes >= 5) { level.textContent = "Низький ризик"; level.style.color = "var(--blue)"; }
    else if (yes >= 3) { level.textContent = "Середній ризик"; level.style.color = "#d97706"; }
    else { level.textContent = "Високий ризик"; level.style.color = "#e5484d"; }
    var gaps = qs.length - yes;
    if (!done) verdict.textContent = "Почніть відповідати, і тут з'явиться оцінка.";
    else if (done < qs.length) verdict.textContent = "Відповіли на " + done + " з " + qs.length + ". Ще кілька питань.";
    else if (yes === qs.length) verdict.textContent = "Чудово. Бізнес захищений добре. Варто раз на рік перевіряти договори під нові зміни в законодавстві.";
    else if (yes >= 3) verdict.textContent = "Є " + gaps + " " + (gaps === 1 ? "слабке місце" : "слабкі місця") + ". Їх можна закрити за одну-дві зустрічі, поки вони не стали спором.";
    else verdict.textContent = "Ризиків " + gaps + " з " + qs.length + ". Саме з таких ситуацій зазвичай починаються суди й претензії. Варто розібрати їх з адвокатом.";
  };
  qs.forEach(function (li, i) {
    li.querySelectorAll("button").forEach(function (b) {
      b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        li.querySelectorAll("button").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        answers[i] = Number(b.getAttribute("data-v")); update();
        tiles[i].classList.add("pop"); setTimeout(function () { tiles[i].classList.remove("pop"); }, 300);
      });
    });
  });

  /* form → mailto (demo) */
  var form = document.getElementById("form"), state = document.getElementById("formState");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = [], f = form.elements;
    ["name", "phone"].forEach(function (n) {
      var el = f[n], ok = n === "phone" ? /\d{9,}/.test(el.value.replace(/\D/g, "")) : el.value.trim().length > 1;
      el.classList.toggle("is-bad", !ok); if (!ok) bad.push(el);
    });
    if (!f.ok.checked) bad.push(f.ok);
    if (bad.length) { state.textContent = "Перевірте ім'я, телефон і згоду на обробку даних."; bad[0].focus(); return; }
    var extra = answers.some(function (a) { return a !== null; }) ? "\nЕкспрес-перевірка: " + score.textContent + " (" + level.textContent + ")" : "";
    var body = "Ім'я: " + f.name.value.trim() + "\nТелефон: " + f.phone.value.trim() + "\nТема: " + f.topic.value + extra + "\n\n" + f.msg.value.trim();
    state.textContent = "Дякуємо. Відкриваємо пошту, щоб надіслати заявку.";
    window.location.href = "mailto:ostwinpro@gmail.com?subject=" + encodeURIComponent("Заявка з сайту: " + f.topic.value) + "&body=" + encodeURIComponent(body);
  });

  if (reduce || !window.gsap) return;
  document.documentElement.classList.add("js");
  var gsap = window.gsap;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  if (window.Lenis) {
    var lenis = new window.Lenis({ lerp: 0.12 });
    if (window.ScrollTrigger) lenis.on("scroll", window.ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href"); if (id.length < 2) return;
        var el = document.querySelector(id); if (!el) return;
        e.preventDefault(); lenis.scrollTo(el, { offset: -72 });
      });
    });
  }

  /* split section headings into words for a staggered reveal */
  document.querySelectorAll("h2").forEach(function (h) {
    Array.prototype.slice.call(h.childNodes).forEach(function (n) {
      if (n.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(" ")); return; }
        var o = document.createElement("span"); o.className = "w";
        var i = document.createElement("span"); i.textContent = w; o.appendChild(i); frag.appendChild(o);
      });
      h.replaceChild(frag, n);
    });
  });

  var intro = gsap.timeline();
  intro.from(".hero__top", { opacity: 0, y: -10, duration: 0.6 })
    .fromTo(".hero__top", { "--line": 0 }, { "--line": 1, duration: 0.9, ease: "power3.out" }, 0)
    .from(".hero__title .ln > span", { yPercent: 110, duration: 1, ease: "power4.out", stagger: 0.1 }, 0.1)
    .to(".hero__title b", { color: "#2236ff", duration: 0.8, ease: "power2.inOut", stagger: 0.2 }, 0.9);
  gsap.from(".hero__copy, .hero__facts li", { opacity: 0, y: 20, duration: 0.8, ease: "power2.out", stagger: 0.08, delay: 0.45 });
  gsap.from(".hero__photo", { clipPath: "inset(100% 0 0 0 round 24px)", duration: 1.3, ease: "power3.inOut", delay: 0.2 });

  if (!window.ScrollTrigger) return;
  var mm = gsap.matchMedia();

  /* practice: horizontal scroll pinned on desktop */
  mm.add("(min-width: 1021px)", function () {
    var track = document.getElementById("track");
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var hs = gsap.to(track, {
      x: function () { return -dist(); }, ease: "none",
      scrollTrigger: { trigger: ".prac__pin", start: "top 64px", end: function () { return "+=" + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true }
    });
    gsap.utils.toArray(".pc").forEach(function (c) {
      gsap.from(c.querySelector(".pc__n"), { xPercent: 60, opacity: 0.2, ease: "none", scrollTrigger: { trigger: c, containerAnimation: hs, start: "left 95%", end: "left 45%", scrub: true } });
      gsap.from(c.querySelectorAll("li"), { opacity: 0, x: 24, stagger: 0.05, ease: "none", scrollTrigger: { trigger: c, containerAnimation: hs, start: "left 90%", end: "left 50%", scrub: true } });
    });
  });

  gsap.utils.toArray(".check__intro > p, .qs li, .urgent__in, .about__copy > p, .about__list li, .about__facts, .about__photo, .proc__row li, .rc, .faq details, .contact__list li, .contact__msg, .form").forEach(function (el) {
    el.classList.add("rv");
    gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  });

  /* headings: words rise in */
  gsap.utils.toArray("h2").forEach(function (h) {
    gsap.from(h.querySelectorAll(".w > span"), { yPercent: 105, duration: 0.9, ease: "power4.out", stagger: 0.05, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
  });
  /* kicker dash draws */
  gsap.utils.toArray(".kicker").forEach(function (k) {
    gsap.fromTo(k, { "--dash": 0, opacity: 0, x: -8 }, { "--dash": 1, opacity: 1, x: 0, duration: 0.7, ease: "power2.out", scrollTrigger: { trigger: k, start: "top 92%", once: true } });
  });

  /* hero numbers count up */
  document.querySelectorAll(".hero__facts b, .rev h2 .w:first-child > span").forEach(function (b) {
    var txt = b.textContent.trim(), num = parseFloat(txt.replace(",", "."));
    if (isNaN(num)) return;
    var dec = txt.indexOf(",") > -1 ? 1 : 0, o = { v: 0 };
    gsap.to(o, { v: num, duration: 1.4, ease: "power2.out", delay: b.closest(".hero") ? 0.8 : 0,
      scrollTrigger: b.closest(".hero") ? null : { trigger: b, start: "top 85%", once: true },
      onUpdate: function () { b.textContent = o.v.toFixed(dec).replace(".", ","); } });
  });
  gsap.from(".rev .rating__stars svg", { scale: 0, rotate: -40, duration: 0.5, ease: "back.out(3)", stagger: 0.08, scrollTrigger: { trigger: ".rev", start: "top 70%", once: true } });

  /* hero photo drifts and un-zooms on scroll */
  gsap.fromTo(".hero__photo .duo", { scale: 1.15 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.fromTo(".about__photo .duo", { backgroundPosition: "50% 0%" }, { backgroundPosition: "50% 100%", ease: "none", scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true } });

  /* ticker: speeds up and reverses with scroll direction */
  var row = document.querySelector(".ticker__row");
  if (row) {
    document.documentElement.classList.add("gs-ticker");
    var tick = gsap.to(row, { xPercent: -50, duration: 32, ease: "none", repeat: -1 });
    var dir = 1;
    ScrollTrigger.create({ onUpdate: function (self) {
      var v = self.getVelocity(); if (Math.abs(v) < 5) return;
      dir = v > 0 ? 1 : -1;
      gsap.to(tick, { timeScale: dir * Math.min(5, 1 + Math.abs(v) / 400), duration: 0.2, overwrite: true });
      gsap.to(tick, { timeScale: dir, duration: 1, delay: 0.25 });
    } });
  }

  /* risk check: tiles cascade in */
  gsap.from("#riskGrid li", { opacity: 0, y: 16, scale: 0.92, duration: 0.5, ease: "back.out(2)", stagger: 0.06, scrollTrigger: { trigger: ".risk", start: "top 88%", once: true } });
  /* urgent strip: shield pulses once in view */
  gsap.fromTo(".urgent__ic", { scale: 0.6, rotate: -15 }, { scale: 1, rotate: 0, duration: 0.8, ease: "elastic.out(1, .5)", scrollTrigger: { trigger: ".urgent", start: "top 85%", once: true } });
  /* process: top rules draw one after another */
  gsap.fromTo(".proc__row li", { "--rule": 0 }, { "--rule": 1, duration: 0.7, ease: "power2.inOut", stagger: 0.18, scrollTrigger: { trigger: ".proc__row", start: "top 85%", once: true } });
  /* contact phone underline grows */
  gsap.fromTo(".contact__tel", { "--u": 0 }, { "--u": 1, duration: 1, ease: "power3.inOut", scrollTrigger: { trigger: ".contact__tel", start: "top 90%", once: true } });

  /* desktop: practice card numbers slide inside the moving track, magnetic buttons */
  mm.add("(min-width: 1021px) and (pointer: fine)", function () {
    document.querySelectorAll(".btn, .hdr__call").forEach(function (btn) {
      var xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3" }), yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3" });
      var move = function (e) { var r = btn.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.25); yTo((e.clientY - r.top - r.height / 2) * 0.35); };
      var leave = function () { xTo(0); yTo(0); };
      btn.addEventListener("mousemove", move); btn.addEventListener("mouseleave", leave);
      return function () { btn.removeEventListener("mousemove", move); btn.removeEventListener("mouseleave", leave); };
    });
  });
  mm.add("(max-width: 1020px)", function () {
    gsap.from(".pc", { opacity: 0, x: 60, duration: 0.8, ease: "power3.out", stagger: 0.1, scrollTrigger: { trigger: ".prac__track", start: "top 85%", once: true } });
  });
})();
