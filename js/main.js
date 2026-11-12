/* Kulyk Medicine — демо. GSAP + ScrollTrigger + Lenis (локально). */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasG = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!reduce && typeof window.Lenis !== "undefined") {
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    if (hasG) {
      lenis.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }
  function goTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -80 });
    else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var t = $(id);
      if (!t) return;
      e.preventDefault();
      closeMenu();
      goTo(t);
      if (id === "#booking") setTimeout(function () { var n = $("#booking input[name=name]"); if (n) n.focus({ preventScroll: true }); }, 900);
    });
  });

  /* ---------- header + menu + dock ---------- */
  var hdr = $("#hdr"), burger = $(".burger"), mnav = $("#mnav"), dock = $(".dock"), hero = $(".hero");
  function closeMenu() {
    if (!mnav.classList.contains("is-open")) return;
    mnav.classList.remove("is-open"); hdr.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Відкрити меню");
  }
  burger.addEventListener("click", function () {
    var open = !mnav.classList.contains("is-open");
    mnav.classList.toggle("is-open", open); hdr.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
  });
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY;
    hdr.classList.toggle("is-solid", y > 30);
    hdr.classList.toggle("is-hidden", y > 400 && y > lastY + 4 && !mnav.classList.contains("is-open"));
    if (y < lastY - 4) hdr.classList.remove("is-hidden");
    lastY = y;
    var heroEnd = hero.offsetTop + hero.offsetHeight * 0.6;
    var nearForm = (function () { var f = $("#booking").getBoundingClientRect(); return f.top < window.innerHeight && f.bottom > 0; })();
    dock.classList.toggle("is-on", y > heroEnd && !nearForm);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- hero reticle ticks ---------- */
  var ticks = $(".reticle .ticks");
  if (ticks) {
    var svgNS = "http://www.w3.org/2000/svg", html = "";
    for (var i = 0; i < 72; i++) {
      var a = (i / 72) * Math.PI * 2, long = i % 6 === 0, r1 = 99, r2 = long ? 92 : 96;
      html += '<line x1="' + (100 + Math.cos(a) * r1).toFixed(2) + '" y1="' + (100 + Math.sin(a) * r1).toFixed(2) + '" x2="' + (100 + Math.cos(a) * r2).toFixed(2) + '" y2="' + (100 + Math.sin(a) * r2).toFixed(2) + '"/>';
    }
    html += '<line x1="100" y1="88" x2="100" y2="112"/><line x1="88" y1="100" x2="112" y2="100"/>';
    ticks.innerHTML = html;
    void svgNS;
  }

  /* ---------- MICROSCOPE LENS (signature) ---------- */
  var scope = $("#scope"), lens = $("#lens"), img = scope && $(".scope__img", scope), zoomVal = $("#zoomVal");
  var steps = $$(".micro__steps li");
  var state = { z: 1.5, px: 0.42, py: 0.5, hover: false };
  if (scope && img) {
    lens.style.backgroundImage = 'url("' + img.getAttribute("src") + '")';
    var iwN = 1000, ihN = 1500;
    function renderLens() {
      var W = scope.clientWidth, H = scope.clientHeight;
      var s = Math.max(W / iwN, H / ihN), iw = iwN * s, ih = ihN * s, ox = (W - iw) / 2, oy = (H - ih) / 2;
      var L = lens.offsetWidth, z = state.z;
      var cx = state.px * W, cy = state.py * H;
      lens.style.transform = "translate(" + (cx - L / 2) + "px," + (cy - L / 2) + "px)";
      lens.style.backgroundSize = iw * z + "px " + ih * z + "px";
      lens.style.backgroundPosition = (L / 2 - (cx - ox) * z) + "px " + (L / 2 - (cy - oy) * z) + "px";
    }
    function setStep(idx) {
      var labels = [1, 4, 25];
      steps.forEach(function (li, k) { li.classList.toggle("is-on", k === idx); });
      if (zoomVal.textContent !== String(labels[idx])) zoomVal.textContent = labels[idx];
    }
    function fromProgress(p) {
      // візуальне збільшення 1.5 → 4.2, лінза пливе по зубах
      state.z = 1.5 + p * 2.7;
      if (!state.hover) {
        state.px = 0.3 + 0.4 * p;
        state.py = 0.52 + Math.sin(p * Math.PI) * -0.06;
      }
      setStep(p < 0.34 ? 0 : p < 0.67 ? 1 : 2);
      renderLens();
    }
    fromProgress(0);
    window.addEventListener("resize", renderLens);
    img.addEventListener("load", renderLens);

    if (window.matchMedia("(hover:hover)").matches) {
      scope.addEventListener("mousemove", function (e) {
        var r = scope.getBoundingClientRect();
        state.hover = true;
        state.px = (e.clientX - r.left) / r.width;
        state.py = (e.clientY - r.top) / r.height;
        if (state.z < 2.6) state.z = 2.6;
        renderLens();
      });
      scope.addEventListener("mouseleave", function () { state.hover = false; });
    }

    if (hasG && !reduce) {
      var desktop = window.matchMedia("(min-width: 901px)").matches;
      window.ScrollTrigger.create({
        trigger: desktop ? ".micro__pin" : ".micro__stage",
        start: desktop ? "top top" : "top 75%",
        end: desktop ? "+=180%" : "bottom 15%",
        pin: desktop,
        scrub: true,
        onUpdate: function (st) { fromProgress(st.progress); }
      });
    } else {
      fromProgress(0.5);
    }
  }

  /* ---------- services accordion ---------- */
  var items = $$(".srv__item");
  function openItem(it, open) {
    it.classList.toggle("is-open", open);
    $(".srv__btn", it).setAttribute("aria-expanded", String(open));
  }
  items.forEach(function (it) {
    $(".srv__btn", it).addEventListener("click", function () {
      var willOpen = !it.classList.contains("is-open");
      items.forEach(function (o) { if (o !== it) openItem(o, false); });
      openItem(it, willOpen);
      if (hasG) setTimeout(function () { window.ScrollTrigger.refresh(); }, 550);
    });
  });
  if (items[0]) openItem(items[0], true);

  /* service → form preselect */
  var sel = $("#booking select[name=service]");
  $$("[data-service]").forEach(function (a) {
    a.addEventListener("click", function () {
      var v = a.getAttribute("data-service");
      $$("option", sel).forEach(function (o) { if (o.textContent === v) sel.value = v; });
    });
  });

  /* ---------- reviews slider ---------- */
  var rv = $("#rv");
  if (rv) {
    $$(".rv__arr").forEach(function (b) {
      b.addEventListener("click", function () {
        var card = $(".rv__card", rv);
        var step = card ? card.offsetWidth + 18 : 300;
        rv.scrollBy({ left: step * Number(b.getAttribute("data-dir")), behavior: reduce ? "auto" : "smooth" });
      });
    });
    var down = false, sx = 0, sl = 0, moved = false;
    rv.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false; sx = e.clientX; sl = rv.scrollLeft; rv.classList.add("is-drag");
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - sx; if (Math.abs(dx) > 3) moved = true;
      rv.scrollLeft = sl - dx;
    });
    window.addEventListener("pointerup", function () { if (down) { down = false; rv.classList.remove("is-drag"); } });
    rv.addEventListener("click", function (e) { if (moved) e.preventDefault(); }, true);
    rv.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") rv.scrollBy({ left: 300 });
      if (e.key === "ArrowLeft") rv.scrollBy({ left: -300 });
    });
  }

  /* ---------- form ---------- */
  var form = $("#booking"), msg = $("#formMsg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = form.elements.name, phone = form.elements.phone, ok = form.elements.ok;
    var digits = phone.value.replace(/\D/g, "");
    var bad = [];
    name.classList.toggle("err", name.value.trim().length < 2); if (name.value.trim().length < 2) bad.push("ім'я");
    phone.classList.toggle("err", digits.length < 9); if (digits.length < 9) bad.push("телефон");
    if (!ok.checked) bad.push("згоду на обробку даних");
    if (bad.length) {
      msg.className = "form__msg bad";
      msg.textContent = "Будь ласка, вкажіть " + bad.join(", ") + ".";
      return;
    }
    msg.className = "form__msg ok";
    msg.textContent = "Дякуємо, " + name.value.trim() + ". Адміністратор передзвонить вам найближчим часом. (Демо: після запуску заявки надходитимуть клініці в Telegram.)";
    form.reset();
  });

  /* ---------- reveal animations ---------- */
  if (hasG && !reduce) {
    var g = window.gsap;
    g.registerPlugin(window.ScrollTrigger);
    g.from(".hero__h1 .ln > span", { yPercent: 105, duration: 1.1, ease: "power4.out", stagger: 0.08, delay: 0.1 });
    g.from(".hero__lead, .hero__cta, .hero__facts", { opacity: 0, y: 20, duration: 0.9, ease: "power3.out", stagger: 0.1, delay: 0.45 });
    g.from(".lensframe", { scale: 0.86, opacity: 0, duration: 1.4, ease: "power3.out", delay: 0.15 });
    g.from(".lensframe img", { scale: 1.6, duration: 2.2, ease: "power3.out", delay: 0.15 });
    g.to(".reticle", { rotate: 30, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

    $$(".sec-head, .srv__item, .step, .doctor__photo, .doctor__txt, .rv__card, .faq__list details, .contacts__info, .form, .map, .process__fig").forEach(function (el) {
      el.classList.add("rv-up");
    });
    window.ScrollTrigger.batch(".rv-up", {
      start: "top 88%",
      once: true,
      onEnter: function (els) { g.to(els, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, overwrite: true }); }
    });
    g.fromTo(".doctor__photo img", { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".doctor", start: "top bottom", end: "bottom top", scrub: true } });
  }
})();
