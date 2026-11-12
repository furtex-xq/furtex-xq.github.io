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

  /* ---------- animations («прилад») ---------- */
  if (hasG && !reduce) {
    var g = window.gsap, ST = window.ScrollTrigger;
    g.registerPlugin(ST);
    var fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

    /* 1. Герой: «наведення фокуса» — лінза розмита → різка, мітки сітки малюються по колу */
    var tl = g.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".lensframe", { scale: 0.86, opacity: 0, duration: 1.2 }, 0.05)
      .fromTo(".lensframe img", { scale: 1.7, filter: "blur(14px) saturate(.4)" }, { scale: 1.15, filter: "blur(0px) saturate(1)", duration: 1.9, ease: "power2.out" }, 0.1)
      .from(".reticle .ticks line", { opacity: 0, duration: 0.02, stagger: { each: 0.012, from: "start" } }, 0.25)
      .from(".lensframe__tag", { y: 20, opacity: 0, duration: 0.6 }, 1.2)
      .from(".hero .eyebrow", { opacity: 0, x: -16, duration: 0.6 }, 0.1)
      .from(".hero__h1 .ln > span", { yPercent: 108, duration: 1.1, ease: "power4.out", stagger: 0.08 }, 0.15)
      .from(".hero__lead, .hero__cta", { opacity: 0, y: 20, duration: 0.9, stagger: 0.1 }, 0.55)
      .from(".hero__facts li", { opacity: 0, y: 14, duration: 0.6, stagger: 0.08 }, 0.8)
      .from(".hdr__in > *", { opacity: 0, y: -12, duration: 0.6, stagger: 0.05 }, 0.1);
    // лічильник рейтингу 0 → 4,6
    var fb = $(".hero__facts li:last-child b");
    if (fb) { var o = { v: 0 }; tl.to(o, { v: 4.6, duration: 1.4, ease: "power2.out", onUpdate: function () { fb.textContent = o.v.toFixed(1).replace(".", ",") + " ★"; } }, 0.9); }
    // сітка героя повільно «їде», лінза обертає шкалу при скролі
    g.to(".hero", { backgroundPosition: "0px 60px, 60px 0px, 0px 12px, 12px 0px", ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    g.to(".reticle", { rotate: 45, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    g.to(".lensframe", { yPercent: 10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    // лінза злегка тягнеться за мишкою
    if (fine) {
      var lf = $(".lensframe"), qx = g.quickTo(lf, "x", { duration: 0.8, ease: "power3" }), qy = g.quickTo(lf, "y", { duration: 0.8, ease: "power3" });
      var qr = g.quickTo(".reticle", "rotation", { duration: 1.2, ease: "power3" });
      $(".hero").addEventListener("mousemove", function (e) {
        var r = this.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
        qx(dx * 24); qy(dy * 24); qr(dx * 25);
      });
    }

    /* 2. Заголовки секцій: червона «скан-лінія» проходить і відкриває текст */
    $$(".sec-head h2, .micro__h2, .contacts h2, .doctor__txt h2").forEach(function (h) {
      h.classList.add("scan");
      var bar = document.createElement("span"); bar.className = "scan__bar"; bar.setAttribute("aria-hidden", "true"); h.appendChild(bar);
      var t = g.timeline({ scrollTrigger: { trigger: h, start: "top 85%", once: true } });
      t.fromTo(bar, { scaleX: 0, transformOrigin: "left" }, { scaleX: 1, duration: 0.45, ease: "power2.in" })
       .fromTo(h, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", clearProps: "clipPath", duration: 0.01 })
       .to(bar, { scaleX: 0, transformOrigin: "right", duration: 0.55, ease: "power3.out" });
    });
    $$(".eyebrow").forEach(function (e) {
      if (e.closest(".hero")) return;
      g.from(e, { opacity: 0, x: -20, duration: 0.6, scrollTrigger: { trigger: e, start: "top 90%", once: true } });
    });

    /* 3. Біжучий рядок реагує на швидкість скролу */
    var mq = $(".marquee__track");
    if (mq) {
      mq.style.animation = "none";
      var mqT = g.to(mq, { xPercent: -50, duration: 40, ease: "none", repeat: -1 });
      ST.create({ onUpdate: function (s) { var v = Math.min(Math.abs(s.getVelocity()) / 400, 6); g.to(mqT, { timeScale: 1 + v, duration: 0.2, overwrite: true }); g.to(mqT, { timeScale: 1, duration: 1, delay: 0.25 }); } });
    }

    /* 4. Мікроскоп: заголовок і кроки з’являються, лінза «вмикається» */
    g.fromTo(".scope", { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", clearProps: "clipPath", duration: 1.4, ease: "power3.inOut", scrollTrigger: { trigger: ".micro", start: "top 70%", once: true } });
    g.from(".micro__steps li", { opacity: 0, x: -24, duration: 0.7, stagger: 0.12, scrollTrigger: { trigger: ".micro__steps", start: "top 85%", once: true } });
    g.from(".zoom", { opacity: 0, y: 30, duration: 0.8, scrollTrigger: { trigger: ".micro", start: "top 60%", once: true } });

    /* 5. Послуги: рядки «друкуються» по черзі, номери рахуються, фото відкривається як діафрагма */
    g.from(".srv__item", { opacity: 0, y: 26, duration: 0.7, stagger: 0.07, ease: "power3.out", scrollTrigger: { trigger: ".srv", start: "top 85%", once: true } });
    $$(".srv__btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var it = b.parentNode, im = $(".srv__grid img", it);
        if (it.classList.contains("is-open") && im) {
          g.fromTo(im, { clipPath: "circle(0% at 50% 50%)", scale: 1.15 }, { clipPath: "circle(75% at 50% 50%)", scale: 1, clearProps: "clipPath", duration: 0.9, ease: "power3.out", delay: 0.1 });
          g.from($$(".ticks-list li", it), { opacity: 0, x: -12, duration: 0.4, stagger: 0.06, delay: 0.25 });
        }
      });
    });

    /* 6. Процес: червона шкала заповнюється під час скролу, кроки підсвічуються */
    var steps2 = $(".steps");
    if (steps2) {
      var rail = document.createElement("span"); rail.className = "steps__rail"; rail.setAttribute("aria-hidden", "true"); steps2.appendChild(rail);
      g.fromTo(rail, { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: steps2, start: "top 70%", end: "bottom 60%", scrub: true } });
      $$(".step", steps2).forEach(function (s) {
        ST.create({ trigger: s, start: "top 65%", end: "bottom 40%", toggleClass: { targets: s, className: "is-lit" } });
        g.from(s, { opacity: 0, y: 30, duration: 0.8, scrollTrigger: { trigger: s, start: "top 88%", once: true } });
      });
    }
    g.fromTo(".process__fig img", { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", clearProps: "clipPath", duration: 1.2, ease: "power3.inOut", scrollTrigger: { trigger: ".process__fig", start: "top 80%", once: true } });

    /* 7. Лікар: фото відкривається колом (діафрагма), список «вимірюється» */
    g.fromTo(".doctor__photo", { clipPath: "circle(8% at 50% 50%)" }, { clipPath: "circle(80% at 50% 50%)", clearProps: "clipPath", duration: 1.5, ease: "power3.inOut", scrollTrigger: { trigger: ".doctor__photo", start: "top 80%", once: true } });
    g.fromTo(".doctor__photo img", { scale: 1.25 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".doctor", start: "top bottom", end: "bottom top", scrub: true } });
    g.from(".doctor__q, .doctor__txt > p, .doctor__role", { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, scrollTrigger: { trigger: ".doctor__txt", start: "top 80%", once: true } });
    g.from(".doctor__list li", { opacity: 0, x: 30, duration: 0.6, stagger: 0.1, scrollTrigger: { trigger: ".doctor__list", start: "top 88%", once: true } });

    /* 8. Відгуки: картки «падають» на стіл зі зсувом тіні, рейтинг рахується */
    g.from(".rv__card", { y: 60, rotation: function (i) { return i % 2 ? 3 : -3; }, opacity: 0, boxShadow: "0px 0px 0 #0d0e0f", duration: 0.9, stagger: 0.08, ease: "back.out(1.4)", scrollTrigger: { trigger: ".rv", start: "top 85%", once: true } });
    var rb = $(".rating__big");
    if (rb) { var ro = { v: 0 }; g.to(ro, { v: 4.6, duration: 1.6, ease: "power2.out", scrollTrigger: { trigger: rb, start: "top 90%", once: true }, onUpdate: function () { rb.textContent = ro.v.toFixed(1).replace(".", ","); } }); }
    g.fromTo(".rating__stars", { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", clearProps: "clipPath", duration: 1.2, ease: "power2.out", scrollTrigger: { trigger: ".rating", start: "top 90%", once: true } });

    /* 9. FAQ, контакти, форма */
    g.from(".faq__list details", { opacity: 0, y: 20, duration: 0.6, stagger: 0.07, scrollTrigger: { trigger: ".faq__list", start: "top 85%", once: true } });
    g.from(".cinfo li, .socials .soc", { opacity: 0, x: -20, duration: 0.6, stagger: 0.07, scrollTrigger: { trigger: ".cinfo", start: "top 85%", once: true } });
    g.from(".form", { y: 60, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".form", start: "top 90%", once: true } });
    g.from(".form .fld, .form .chk, .form .btn", { opacity: 0, y: 14, duration: 0.5, stagger: 0.06, delay: 0.3, scrollTrigger: { trigger: ".form", start: "top 90%", once: true } });
    g.fromTo(".map iframe", { clipPath: "inset(0% 50% 0% 50%)" }, { clipPath: "inset(0% 0% 0% 0%)", clearProps: "clipPath", duration: 1.3, ease: "power3.inOut", scrollTrigger: { trigger: ".map", start: "top 90%", once: true } });
    g.from(".ftr__in > *", { opacity: 0, y: 20, duration: 0.7, stagger: 0.1, scrollTrigger: { trigger: ".ftr", start: "top 92%", once: true } });

    /* 10. Магнітні кнопки (ПК) */
    if (fine) {
      $$(".btn").forEach(function (b) {
        var bx = g.quickTo(b, "x", { duration: 0.4, ease: "power3" }), by = g.quickTo(b, "y", { duration: 0.4, ease: "power3" });
        b.addEventListener("mousemove", function (e) { var r = b.getBoundingClientRect(); bx((e.clientX - r.left - r.width / 2) * 0.25); by((e.clientY - r.top - r.height / 2) * 0.35); });
        b.addEventListener("mouseleave", function () { bx(0); by(0); });
      });
    }

    /* прогрес-лінія прокрутки під шапкою */
    var pb = document.createElement("span"); pb.className = "progress"; pb.setAttribute("aria-hidden", "true"); hdr.appendChild(pb);
    g.to(pb, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

    window.addEventListener("load", function () { ST.refresh(); });
  }
})();
