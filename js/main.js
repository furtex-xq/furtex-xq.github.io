(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* header state + mobile menu */
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

  /* open / closed now (Kyiv time, Mon–Fri 9–17) */
  var live = document.getElementById("live");
  try {
    var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    var get = function (t) { return (parts.find(function (p) { return p.type === t; }) || {}).value; };
    var wd = get("weekday"), mins = parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10);
    var workday = ["Mon", "Tue", "Wed", "Thu", "Fri"].indexOf(wd) > -1;
    if (workday && mins >= 540 && mins < 1020) { live.textContent = "Зараз відчинено до 17:00"; live.classList.add("is-open"); }
    else live.textContent = "Зараз зачинено · Пн–Пт 9:00–17:00";
  } catch (e) {}

  /* situation tabs */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.sit__tabs [role="tab"]'));
  var select = function (tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(t); });
    t.addEventListener("keydown", function (e) {
      var n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
      if (n === null) return;
      e.preventDefault(); select(tabs[(n + tabs.length) % tabs.length], true);
    });
  });

  /* topic prefill from situation buttons */
  var topic = document.getElementById("topic");
  document.querySelectorAll("[data-topic]").forEach(function (a) {
    a.addEventListener("click", function () {
      var v = a.getAttribute("data-topic");
      Array.prototype.forEach.call(topic.options, function (o) { if (o.text === v) topic.value = v; });
    });
  });

  /* form → mailto (demo) */
  var form = document.getElementById("form"), state = document.getElementById("formState");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = [];
    ["name", "phone"].forEach(function (n) {
      var el = form.elements[n], ok = n === "phone" ? /\d{9,}/.test(el.value.replace(/\D/g, "")) : el.value.trim().length > 1;
      el.classList.toggle("is-bad", !ok); if (!ok) bad.push(el);
    });
    if (!form.elements.ok.checked) bad.push(form.elements.ok);
    if (bad.length) { state.textContent = "Перевірте ім'я, телефон і згоду на обробку даних."; bad[0].focus(); return; }
    var f = form.elements;
    var body = "Ім'я: " + f.name.value.trim() + "\nТелефон: " + f.phone.value.trim() + "\nТема: " + f.topic.value + "\n\n" + f.msg.value.trim();
    state.textContent = "Дякуємо. Відкриваємо пошту, щоб надіслати заявку.";
    window.location.href = "mailto:ostwinpro@gmail.com?subject=" + encodeURIComponent("Заявка з сайту: " + f.topic.value) + "&body=" + encodeURIComponent(body);
  });

  /* motion */
  var sign = document.getElementById("signPath");
  var len = sign ? sign.getTotalLength() : 0;
  if (reduce || !window.gsap) return;
  doc.classList.add("js");
  var gsap = window.gsap;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  if (window.Lenis) {
    var lenis = new window.Lenis({ lerp: 0.12 });
    lenis.on("scroll", window.ScrollTrigger ? window.ScrollTrigger.update : function () {});
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

  gsap.from(".hero__title .line > span", { yPercent: 105, duration: 1.1, ease: "power4.out", stagger: 0.09, delay: 0.1 });
  gsap.from(".hero__lead, .hero__cta, .rating, .eyebrow", { opacity: 0, y: 18, duration: 0.9, ease: "power2.out", stagger: 0.08, delay: 0.5 });
  gsap.from(".hero__img", { clipPath: "inset(0 0 100% 0)", duration: 1.4, ease: "power3.inOut" });
  gsap.from(".hero__cap", { opacity: 0, x: -20, duration: 0.8, delay: 1.1 });

  if (!window.ScrollTrigger) return;

  /* signature draws as you scroll through the article block */
  if (sign) {
    gsap.set(sign, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(sign, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".art", start: "top 70%", end: "center 40%", scrub: 0.6 } });
    gsap.from(".art__quote", { opacity: 0, y: 30, duration: 1, scrollTrigger: { trigger: ".art", start: "top 75%" } });
  }

  gsap.utils.toArray(".head, .sit__box, .prac__item, .proc__steps li, .proc__facts, .about__copy > *, .about__photo, .rev__card, .rev__score, .faq details, .contact__info, .form").forEach(function (el) {
    el.classList.add("rv");
    gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  });
  gsap.fromTo(".about__img", { backgroundPosition: "50% 20%" }, { backgroundPosition: "50% 80%", ease: "none", scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true } });
})();
