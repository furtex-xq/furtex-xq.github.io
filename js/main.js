(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- header & menu ---------- */
  var top = $("[data-top]");
  var onScroll = function () { if (top) top.classList.toggle("is-scrolled", window.scrollY > 10); };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  var burger = $("[data-burger]"), nav = $("#nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") !== "true";
      burger.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    });
    $$("a", nav).forEach(function (a) {
      a.addEventListener("click", function () { burger.setAttribute("aria-expanded", "false"); nav.classList.remove("is-open"); });
    });
  }
  var y = $("[data-year]"); if (y) y.textContent = String(new Date().getFullYear());

  /* ---------- reveal & paw trail ---------- */
  var reveals = $$(".reveal"), trail = $("[data-trail]");
  if (!("IntersectionObserver" in window) || reduce) {
    reveals.forEach(function (el) { el.classList.add("in"); });
    if (trail) $$("li", trail).forEach(function (li) { li.classList.add("on"); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
    if (trail) {
      var tio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          $$("li", trail).forEach(function (li, i) { setTimeout(function () { li.classList.add("on"); }, 120 + i * 320); });
          tio.disconnect();
        });
      }, { threshold: 0.35 });
      tio.observe(trail);
    }
  }

  /* ---------- opening hours (Kyiv time) ---------- */
  var DAYN = ["у неділю", "у понеділок", "у вівторок", "у середу", "у четвер", "у п'ятницю", "у суботу"];
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday);
      return { day: wd, min: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
    } catch (e) { var d = new Date(); return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() }; }
  }
  var toMin = function (t) { var p = (t || "").split(":"); return p.length === 2 ? (+p[0]) * 60 + (+p[1]) : null; };
  var rows = $$("[data-hours] tr[data-day]");
  if (rows.length) {
    var H = {};
    rows.forEach(function (r) { H[r.getAttribute("data-day")] = { o: toMin(r.getAttribute("data-open")), c: toMin(r.getAttribute("data-close")), open: r.getAttribute("data-open") }; });
    var now = kyivNow(), today = H[String(now.day)], txt, open = false;
    var tr = $('[data-hours] tr[data-day="' + now.day + '"]'); if (tr) tr.classList.add("today");
    if (today && today.o !== null && now.min >= today.o && now.min < today.c) {
      open = true;
      var cl = rows.filter(function (r) { return r.getAttribute("data-day") === String(now.day); })[0].getAttribute("data-close");
      txt = "Зараз відчинено · до " + cl;
    } else if (today && today.o !== null && now.min < today.o) {
      txt = "Зараз зачинено · відкриємо о " + today.open;
    } else {
      txt = "Зараз зачинено";
      for (var i = 1; i <= 7; i++) {
        var d = (now.day + i) % 7, h = H[String(d)];
        if (h && h.o !== null) { txt += " · відкриємо " + (i === 1 ? "завтра" : DAYN[d]) + " о " + h.open; break; }
      }
    }
    $$("[data-status]").forEach(function (s) {
      s.classList.add(open ? "is-open" : "is-closed");
      var t = $("[data-status-text]", s); if (t) t.textContent = txt;
    });
  }

  /* ---------- food calculator ---------- */
  var calc = $("[data-calc]");
  var PET = {
    dog: { min: 1, max: 70, def: 12, young: "Цуценя", act: ["Спокійний", "Звичайний", "Активний"], kcal: 3.6, wetKcal: 0.9, bags: [2, 3, 7, 12, 15], noun: "собака",
      f: { young: [2.5, 2.5, 2.7], adult: [1.4, 1.6, 2.0], senior: [1.2, 1.3, 1.5] } },
    cat: { min: 1, max: 12, def: 4.5, young: "Кошеня", act: ["Домашній", "Звичайний", "Гуляє надворі"], kcal: 3.9, wetKcal: 0.85, bags: [0.4, 1.5, 2, 4, 10], noun: "кіт",
      f: { young: [2.5, 2.5, 2.5], adult: [1.0, 1.2, 1.4], senior: [1.0, 1.1, 1.2] } }
  };
  var AGE = { young: "малюк", adult: "дорослий", senior: "літній" };
  var fmt = function (n, d) { return n.toLocaleString("uk-UA", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var kg = function (n) { return n < 1 ? fmt(n * 1000) + " г" : fmt(n, n % 1 ? 1 : 0) + " кг"; };
  var plural = function (n, a, b, c) { var m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c); };
  var summary = "";
  if (calc) {
    var w = $("#weight"), wOut = $("[data-weight-out]"), kib = $("[data-kibble]"), fill = $("[data-fill]");
    var NS = "http://www.w3.org/2000/svg", dots = [];
    // kibble mound: rows from the rim upwards, narrowing
    for (var r = 0; r < 5; r++) {
      var half = 78 - r * 15, cy = 50 - r * 8.5, n = Math.floor((half * 2) / 12);
      for (var k = 0; k < n; k++) {
        var c = document.createElementNS(NS, "circle");
        var cx = 100 - half + 6 + k * ((half * 2 - 12) / Math.max(1, n - 1)) + (r % 2 ? 3 : -3);
        c.setAttribute("cx", cx.toFixed(1)); c.setAttribute("cy", (cy + ((k * 7) % 3) - 1).toFixed(1)); c.setAttribute("r", "5.6");
        kib.appendChild(c); dots.push(c);
      }
    }
    var val = function (name) { var x = $('input[name="' + name + '"]:checked', calc); return x ? x.value : ""; };
    var lastPet = "dog";
    var run = function () {
      var pet = val("pet"), P = PET[pet];
      if (pet !== lastPet) {
        w.min = P.min; w.max = P.max; w.value = P.def; lastPet = pet;
        $("[data-young-label]", calc).textContent = P.young;
        ["low", "mid", "high"].forEach(function (a, i) { $('[data-act-label="' + a + '"]', calc).textContent = P.act[i]; });
      }
      var wt = parseFloat(w.value), age = val("age"), ai = ["low", "mid", "high"].indexOf(val("act")), mix = val("feed") === "mix";
      w.style.setProperty("--p", ((wt - P.min) / (P.max - P.min) * 100).toFixed(1) + "%");
      wOut.textContent = fmt(wt, wt % 1 ? 1 : 0) + " кг";
      var kcal = 70 * Math.pow(wt, 0.75) * P.f[age][ai];
      var dry = Math.max(5, Math.round((mix ? kcal * 0.75 : kcal) / P.kcal / 5) * 5);
      var wetG = mix ? Math.round(kcal * 0.25 / P.wetKcal / 10) * 10 : 0;
      $("[data-daily]").textContent = fmt(dry);
      var wet = $("[data-wet]");
      var pouches = Math.max(1, Math.round(wetG / 85));
      if (mix) {
        wet.hidden = false;
        wet.textContent = pet === "cat" ? "+ " + pouches + " " + plural(pouches, "пауч", "паучі", "паучів") + " по 85 г вологого" : "+ ≈ " + fmt(wetG) + " г вологого корму (консерва)";
      } else wet.hidden = true;
      var month = dry * 30 / 1000;
      $("[data-month]").textContent = fmt(month, month < 10 ? 1 : 0);
      var bag = P.bags.filter(function (b) { return b >= month; })[0], tip, frac;
      if (bag) {
        var days = Math.floor(bag * 1000 / dry);
        tip = "Беріть упаковку <b>" + kg(bag) + "</b> — вистачить приблизно на " + days + " " + plural(days, "день", "дні", "днів") + ".";
        frac = month / bag;
      } else {
        var big = P.bags[P.bags.length - 1], cnt = Math.ceil(month / big);
        tip = "Знадобиться <b>" + cnt + " мішки по " + kg(big) + "</b> на місяць — спитайте про ціну за великий об'єм.";
        frac = 1;
      }
      $("[data-pack]").innerHTML = tip;
      var h = 130 * Math.min(1, frac);
      fill.setAttribute("y", (152 - h).toFixed(1)); fill.setAttribute("height", h.toFixed(1));
      var show = Math.max(4, Math.min(dots.length, Math.round(Math.sqrt(dry) * 2.2)));
      dots.forEach(function (d, i) { var on = i < show; d.style.opacity = on ? 1 : 0; d.style.transform = on ? "none" : "translateY(-24px)"; });
      summary = "Корм на місяць: " + P.noun + ", " + fmt(wt, wt % 1 ? 1 : 0) + " кг, " + AGE[age] + ". Порція ≈ " + fmt(dry) + " г сухого на день" +
        (mix ? " + вологий" : "") + ", ≈ " + fmt(month, 1) + " кг на місяць" + (bag ? ", упаковка " + kg(bag) : "") + ".";
    };
    calc.addEventListener("input", run); calc.addEventListener("change", run);
    calc.addEventListener("submit", function (e) { e.preventDefault(); });
    run();
    var go = $("[data-calc-order]");
    if (go) go.addEventListener("click", function () {
      var msg = $("#f-msg"), petSel = $("#f-pet");
      if (msg) msg.value = summary + " Підкажіть, будь ласка, який корм порадите.";
      if (petSel) petSel.value = val("pet") === "cat" ? "Кіт" : "Собака";
      var order = $("[data-order]"); if (order) order.classList.remove("is-done");
      var dn = $("[data-done]"); if (dn) dn.hidden = true;
    });
  }

  /* ---------- order form ---------- */
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
    legacyCopy(text); return Promise.resolve();
  }
  function legacyCopy(text) {
    var t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (e) { /* ignore */ } document.body.removeChild(t);
  }
  var form = $("[data-order]");
  if (form) {
    var done = $("[data-done]"), lastMsg = "";
    var shop = ($(".logo__txt b") || {}).textContent || "";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, first = null;
      ["name", "tel", "msg"].forEach(function (n) {
        var el = form.elements[n], v = (el.value || "").trim(), good = v.length > 1;
        if (n === "tel") good = v.replace(/\D/g, "").length >= 9;
        el.closest(".field").classList.toggle("bad", !good);
        if (!good) { ok = false; if (!first) first = el; }
      });
      if (!ok) { first.focus(); return; }
      var msg = "Заявка з сайту «" + shop.trim() + "»\n" +
        "Ім'я: " + form.elements.name.value.trim() + "\n" +
        "Телефон: " + form.elements.tel.value.trim() + "\n" +
        "Для кого: " + form.elements.pet.value + "\n" +
        "Що потрібно: " + form.elements.msg.value.trim();
      lastMsg = msg;
      var ch = $('input[name="channel"]:checked', form), href = ch ? ch.getAttribute("data-href") : "", kind = ch ? ch.value : "";
      var enc = encodeURIComponent(msg), url = "", note = "Надішліть повідомлення, яке відкрилося, і ми відповімо найближчим часом.";
      if (kind === "whatsapp") url = href + "?text=" + enc;
      else if (kind === "sms") url = href + "?&body=" + enc;
      else if (kind === "email") url = href + "?subject=" + encodeURIComponent("Замовлення з сайту") + "&body=" + enc;
      else if (kind === "viber") { url = href + "&draft=" + enc; copy(msg); note = "Текст заявки скопійовано. Якщо він не вставився в чат сам, просто вставте його й надішліть."; }
      else if (kind) { url = href; copy(msg); note = "Текст заявки скопійовано — вставте його в чат, що відкрився, і надішліть."; }
      else note = "Скопіюйте текст заявки й надішліть нам будь-яким зручним способом.";
      $("[data-done-text]", form).textContent = note;
      $("[data-done-msg]", form).textContent = msg;
      done.hidden = false; form.classList.add("is-done"); done.focus();
      if (url) {
        if (/^https?:/.test(url)) window.open(url, "_blank", "noopener"); else window.location.href = url;
      }
    });
    form.addEventListener("input", function (e) { var f = e.target.closest(".field"); if (f) f.classList.remove("bad"); });
    $("[data-copy]", form).addEventListener("click", function () {
      var b = this; copy(lastMsg).then(function () { b.lastChild.textContent = "Скопійовано"; setTimeout(function () { b.lastChild.textContent = "Скопіювати текст"; }, 1800); });
    });
    $("[data-again]", form).addEventListener("click", function () { form.reset(); form.classList.remove("is-done"); done.hidden = true; form.elements.name.focus(); });
  }
})();
