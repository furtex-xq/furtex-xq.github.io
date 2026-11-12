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

  gsap.from(".hero__title .ln > span", { yPercent: 110, duration: 1, ease: "power4.out", stagger: 0.1 });
  gsap.from(".hero__copy, .hero__facts li", { opacity: 0, y: 20, duration: 0.8, ease: "power2.out", stagger: 0.08, delay: 0.45 });
  gsap.from(".hero__photo", { clipPath: "inset(100% 0 0 0 round 24px)", duration: 1.3, ease: "power3.inOut", delay: 0.2 });

  if (!window.ScrollTrigger) return;
  var mm = gsap.matchMedia();

  /* practice: horizontal scroll pinned on desktop */
  mm.add("(min-width: 1021px)", function () {
    var track = document.getElementById("track");
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    gsap.to(track, {
      x: function () { return -dist(); }, ease: "none",
      scrollTrigger: { trigger: ".prac__pin", start: "top 64px", end: function () { return "+=" + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true }
    });
  });

  gsap.utils.toArray(".check__intro, .qs li, .urgent__in, .about__copy > *, .about__photo, .proc__row li, .rc, .faq details, .contact__info, .form").forEach(function (el) {
    el.classList.add("rv");
    gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  });
})();
