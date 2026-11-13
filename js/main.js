/* Меблі на замовлення — шаблон. Без бібліотек. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Контакти-заглушки (замініть разом з HTML) ---- */
  var LINK_TG = "";
  var LINK_VIBER = "";
  var LINK_MAIL = "";
  var LINK_SMS = "";   // напр. "sms:+380XXXXXXXXX" — для персоналізованих копій
  var LINK_IG = "";    // напр. "https://ig.me/m/<нікнейм>" — Instagram Direct
  var VIA_DEFAULT = "none"; // канал, якщо в формі немає перемикача

  /* ---------- Меню ---------- */
  var burger = document.querySelector(".burger");
  var nav = document.getElementById("nav");
  function closeNav() { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Відкрити меню"); }
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeNav(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
  }

  /* ---------- Поява при прокручуванні ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Таймлайн етапів ---------- */
  var tl = document.getElementById("timeline");
  if (tl) {
    var steps = tl.querySelectorAll(".tl-step");
    var ticking = false;
    var updTl = function () {
      ticking = false;
      var r = tl.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.75 - r.top) / (r.height + vh * 0.25);
      p = Math.max(0, Math.min(1, p));
      if (reduce) p = 1;
      tl.style.setProperty("--p", p.toFixed(3));
      steps.forEach(function (s, i) { s.classList.toggle("on", p >= i / steps.length + 0.02 || p === 1); });
    };
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(updTl); } }, { passive: true });
    window.addEventListener("resize", updTl);
    updTl();
  }

  /* ---------- Конфігуратор кухні ---------- */
  var NS = "http://www.w3.org/2000/svg";
  var cfg = document.getElementById("cfg");
  var state = { layout: "line", a: 3000, b: 2200, c: 2200, color: "#B98A58", colorName: "Дуб натуральний" };
  var D = 600, DT = 350, WALL = 150; // глибина нижніх, верхніх модулів і товщина стіни, мм

  function el(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function fmtM(mm) { return (mm / 1000).toFixed(1).replace(".", ",") + " пог. м"; }

  function runLength() {
    if (state.layout === "line") return state.a;
    if (state.layout === "corner") return state.a + state.b - D;
    return state.a + state.b + state.c - 2 * D;
  }

  function dimH(g, x1, x2, y, label) {
    el("path", { d: "M" + x1 + " " + y + "H" + x2 + "M" + (x1 - 4) + " " + (y + 4) + "l8 -8M" + (x2 - 4) + " " + (y + 4) + "l8 -8M" + x1 + " " + (y - 7) + "v14M" + x2 + " " + (y - 7) + "v14", "class": "dimline" }, g);
    var t = el("text", { x: (x1 + x2) / 2, y: y - 5, "text-anchor": "middle", "class": "dimtxt" }, g, label);
    return t;
  }
  function dimV(g, x, y1, y2, label) {
    el("path", { d: "M" + x + " " + y1 + "V" + y2 + "M" + (x - 4) + " " + (y1 + 4) + "l8 -8M" + (x - 4) + " " + (y2 + 4) + "l8 -8M" + (x - 7) + " " + y1 + "h14M" + (x - 7) + " " + y2 + "h14", "class": "dimline" }, g);
    var cy = (y1 + y2) / 2;
    el("text", { x: x - 5, y: cy, "text-anchor": "middle", "class": "dimtxt", transform: "rotate(-90 " + (x - 5) + " " + cy + ")" }, g, label);
  }

  function svgNarrow() { var d = document.querySelector(".cfg-drawing"); return d && d.clientWidth < 520; }

  function drawPlan() {
    var g = document.getElementById("planG");
    if (!g) return;
    while (g.firstChild) g.removeChild(g.firstChild);
    var L = state.layout, A = state.a, B = state.b, C = state.c;
    var depth = L === "line" ? 1900 : Math.max(B, L === "u" ? C : 0) + 800;
    var narrow = svgNarrow();
    var VW = narrow ? 340 : 460, VH = narrow ? 290 : 360, mx = narrow ? 44 : 62, my = 54;
    document.getElementById("plan").setAttribute("viewBox", "0 0 " + VW + " " + VH);
    var s = Math.min((VW - mx * 2) / (A + WALL * 2), (VH - my - 24) / (depth + WALL));
    var ox = (VW - (A + WALL * 2) * s) / 2 + WALL * s, oy = my + WALL * s;
    function X(v) { return ox + v * s; }
    function Y(v) { return oy + v * s; }
    function R(x, y, w, h, cls, parent, extra) {
      var a = { x: X(x), y: Y(y), width: w * s, height: h * s, "class": cls };
      for (var k in extra || {}) a[k] = extra[k];
      return el("rect", a, parent || g);
    }

    // стіни (А — верх, ліва, права)
    var win0 = A / 2 - Math.min(1200, A * 0.34) / 2, win1 = A - win0;
    var walls = el("path", {
      d: "M" + X(-WALL) + " " + Y(depth) + "V" + Y(-WALL) + "H" + X(A + WALL) + "V" + Y(depth) + "H" + X(A) + "V" + Y(0) + "H" + X(0) + "V" + Y(depth) + "Z",
      "class": "wall"
    }, g);
    walls.style.color = "#262624";
    // вікно в стіні А
    R(win0, -WALL, win1 - win0, WALL, "win");
    el("path", { d: "M" + X(win0) + " " + Y(-WALL / 2) + "H" + X(win1), "class": "dimline" }, g);
    // обрив кімнати
    el("path", { d: "M" + X(-WALL - 120) + " " + Y(depth) + "H" + X(A + WALL + 120), "class": "dimline", "stroke-dasharray": "6 4" }, g);

    // нижні модулі
    var fill = state.color;
    R(0, 0, A, D, "base", null, { fill: fill });
    if (L !== "line") R(0, D, D, B - D, "base", null, { fill: fill });
    if (L === "u") R(A - D, D, D, C - D, "base", null, { fill: fill });
    // лінія стільниці (виступ)
    // верхні модулі (пунктир), без зони вікна
    var top = el("path", {
      d: "M" + X(0) + " " + Y(DT) + "H" + X(win0) + "M" + X(win1) + " " + Y(DT) + "H" + X(A) +
        (L !== "line" ? "M" + X(DT) + " " + Y(DT) + "V" + Y(B) : "") +
        (L === "u" ? "M" + X(A - DT) + " " + Y(DT) + "V" + Y(C) : ""),
      "class": "top"
    }, g);
    top.setAttribute("fill", "none");

    // техніка
    function sink(cx, cy, rot) {
      var gg = el("g", { transform: "rotate(" + (rot || 0) + " " + X(cx) + " " + Y(cy) + ")" }, g);
      el("rect", { x: X(cx - 380), y: Y(cy - 220), width: 760 * s, height: 440 * s, rx: 4, "class": "appl" }, gg);
      el("rect", { x: X(cx - 320), y: Y(cy - 160), width: 420 * s, height: 320 * s, rx: 6, "class": "appl" }, gg);
      el("circle", { cx: X(cx - 110), cy: Y(cy), r: 30 * s + 1, "class": "appl" }, gg);
          }
    function hob(cx, cy) {
      el("rect", { x: X(cx - 290), y: Y(cy - 260), width: 580 * s, height: 520 * s, "class": "appl" }, g);
      [[-140, -120, 95], [140, -120, 70], [-140, 120, 70], [140, 120, 95]].forEach(function (c) {
        el("circle", { cx: X(cx + c[0]), cy: Y(cy + c[1]), r: c[2] * s, "class": "appl" }, g);
      });
    }
    function fridge(x, y, w, h) {
      R(x, y, w, h, "appl");
      el("path", { d: "M" + X(x) + " " + Y(y) + "L" + X(x + w) + " " + Y(y + h) + "M" + X(x + w) + " " + Y(y) + "L" + X(x) + " " + Y(y + h), "class": "dimline" }, g);
    }

    if (L === "line") {
      fridge(0, 0, 600, 650);
      sink(A / 2, D / 2);
      hob(Math.min(A - 450, A / 2 + Math.max(900, A * 0.28)), D / 2);
    } else if (L === "corner") {
      sink(A / 2, D / 2);
      if (B - D >= 1500) { hob(D / 2, D + (B - D - 600) / 2); fridge(0, B - 600, 650, 600); }
      else { hob(Math.min(A - 450, A / 2 + Math.max(900, A * 0.28)), D / 2); fridge(0, B - 600, 650, 600); }
    } else {
      sink(A / 2, D / 2);
      fridge(0, B - 600, 650, 600);
      hob(A - D / 2, D + Math.max(320, (C - D) / 2));
    }

    // розміри
    dimH(g, X(0), X(A), Y(-WALL) - 26, "А · " + fmt(A));
    if (L !== "line") dimV(g, X(-WALL) - 26, Y(0), Y(B), "Б · " + fmt(B));
    if (L === "u") dimV(g, X(A + WALL) + 34, Y(0), Y(C), "В · " + fmt(C));
    // глибина
    if (L === "line") dimV(g, X(A + WALL) + 34, Y(0), Y(D), "600");
    el("text", { x: X(A / 2), y: Y(depth) - 8, "text-anchor": "middle", "class": "lbl" }, g, "ПРОХІД");
  }

  function drawElev() {
    var g = document.getElementById("elevG");
    if (!g) return;
    while (g.firstChild) g.removeChild(g.firstChild);
    var A = state.a, H = 2400, L = state.layout;
    var narrow = svgNarrow();
    var VW = narrow ? 340 : 460, VH = narrow ? 190 : 210;
    document.getElementById("elev").setAttribute("viewBox", "0 0 " + VW + " " + VH);
    var s = Math.min((VW - 40) / A, (VH - 40) / H);
    var ox = (VW - A * s) / 2, base = VH - 22;
    function X(v) { return ox + v * s; }
    function Y(v) { return base - v * s; }
    function rect(x, y0, w, h, cls, fillc) {
      var a = { x: X(x), y: Y(y0 + h), width: w * s, height: h * s, "class": cls };
      if (fillc) a.fill = fillc;
      return el("rect", a, g);
    }
    var win0 = A / 2 - Math.min(1200, A * 0.34) / 2, win1 = A - win0;
    // вікно
    el("rect", { x: X(win0), y: Y(2250), width: (win1 - win0) * s, height: 1300 * s, fill: "none", "class": "gap" }, g);
    el("path", { d: "M" + X(A / 2) + " " + Y(2250) + "V" + Y(950), "class": "gap" }, g);

    var start = 0;
    if (L === "line") { rect(0, 100, 600, 2050, "front", state.color); el("path", { d: "M" + X(560) + " " + Y(1300) + "v" + (180 * s) + "M" + X(560) + " " + Y(900) + "v" + (-250 * s), "class": "handle" }, g); el("path", { d: "M" + X(0) + " " + Y(1250) + "H" + X(600), "class": "gap" }, g); start = 600; }
    // нижні модулі
    var n = Math.max(1, Math.round((A - start) / 600)), w = (A - start) / n;
    for (var i = 0; i < n; i++) {
      var x = start + i * w;
      rect(x, 100, w, 750, "front", state.color);
      var mid = x + w / 2;
      var isSink = mid > win0 && mid < win1 && Math.abs(mid - A / 2) < w;
      if (isSink || i % 2 === 0) {
        el("path", { d: "M" + X(mid) + " " + Y(100) + "V" + Y(850), "class": "gap" }, g);
        el("path", { d: "M" + X(mid - 40) + " " + Y(780) + "v" + (-0) + "h" + (-60 * s) + "M" + X(mid + 40) + " " + Y(780) + "h" + (60 * s), "class": "handle" }, g);
      } else {
        el("path", { d: "M" + X(x) + " " + Y(600) + "H" + X(x + w) + "M" + X(x) + " " + Y(350) + "H" + X(x + w), "class": "gap" }, g);
        [800, 560, 310].forEach(function (hh) { el("path", { d: "M" + X(mid - 120) + " " + Y(hh) + "H" + X(mid + 120), "class": "handle" }, g); });
      }
      // верхні модулі, якщо не на вікні
      if (x + w <= win0 + 1 || x >= win1 - 1) {
        rect(x, 1450, w, 720, "front", state.color);
        el("path", { d: "M" + X(mid - 100) + " " + Y(1490) + "H" + X(mid + 100), "class": "handle" }, g);
      }
    }
    // стільниця, цоколь, підлога
    el("rect", { x: X(start) - 2, y: Y(890), width: (A - start) * s + 4, height: 40 * s, "class": "counter" }, g);
    el("rect", { x: X(start), y: Y(100), width: (A - start) * s, height: 100 * s, fill: "#8b857a", "class": "gap" }, g);
    el("path", { d: "M" + (X(0) - 16) + " " + Y(0) + "H" + (X(A) + 16), "class": "floor" }, g);
    dimH(g, X(0), X(A), VH - 2, fmt(A));
  }

  function render() { if (cfg) cfg.style.setProperty("--facade", state.color); drawPlan(); drawElev(); var r = document.getElementById("runM"); if (r) r.textContent = fmtM(runLength()); }

  if (cfg) {
    var wB = cfg.querySelector('[data-wall="b"]'), wC = cfg.querySelector('[data-wall="c"]');
    function syncLayout() {
      wB.hidden = state.layout === "line";
      wC.hidden = state.layout !== "u";
    }
    cfg.addEventListener("change", function (e) {
      var t = e.target;
      if (t.name === "layout") { state.layout = t.value; syncLayout(); }
      if (t.name === "facade") {
        state.color = t.getAttribute("data-c"); state.colorName = t.getAttribute("data-name");
        document.getElementById("facadeName").textContent = state.colorName;
      }
      render();
    });
    [["wallA", "a", "outA"], ["wallB", "b", "outB"], ["wallC", "c", "outC"]].forEach(function (k) {
      var inp = document.getElementById(k[0]);
      inp.addEventListener("input", function () {
        state[k[1]] = +inp.value;
        document.getElementById(k[2]).textContent = fmt(inp.value);
        render();
      });
    });
    syncLayout();
    render();
    var lastNarrow = svgNarrow();
    window.addEventListener("resize", function () { var n = svgNarrow(); if (n !== lastNarrow) { lastNarrow = n; render(); } });

    document.getElementById("cfgSend").addEventListener("click", function () {
      var names = { line: "пряма", corner: "кутова", u: "П-подібна" };
      var dims = "А " + state.a + " мм" + (state.layout !== "line" ? ", Б " + state.b + " мм" : "") + (state.layout === "u" ? ", В " + state.c + " мм" : "");
      var txt = "Ескіз кухні: " + names[state.layout] + "; " + dims + "; фасади — " + state.colorName + "; ≈ " + fmtM(runLength()) + ".";
      var msg = document.getElementById("fMsg"), type = document.getElementById("fType");
      if (msg) msg.value = txt;
      if (type) type.value = "Кухня";
    });
  }

  /* ---------- Графік роботи: відчинено / зачинено (Київ) ---------- */
  (function () {
    var box = document.getElementById("openStatus");
    var rows = document.querySelectorAll(".hours-table tr[data-days]");
    if (!box || !rows.length) return;
    var now;
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      now = parts;
    } catch (e) {
      try { now = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kiev", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()); } catch (e2) { return; }
    }
    var o = {}; now.forEach(function (p) { o[p.type] = p.value; });
    var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday);
    var mins = (+o.hour % 24) * 60 + (+o.minute);
    var open = false, todayRow = null;
    rows.forEach(function (r) {
      var days = r.getAttribute("data-days").split(",").map(Number);
      if (days.indexOf(day) === -1) return;
      todayRow = r; r.classList.add("today");
      var m = r.querySelector("td").textContent.match(/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/);
      if (m) { var a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4]; open = mins >= a && mins < b; }
    });
    box.classList.add(open ? "is-open" : "is-closed");
    box.querySelector("span").textContent = open ? "Зараз відчинено" : "Зараз зачинено";
  })();

  /* ---------- Форма ---------- */
  var form = document.getElementById("leadForm");
  if (form) {
    var ok = document.getElementById("formOk");
    var fe = form.elements;
    var setErr = function (input, text) {
      var f = input.closest(".field");
      f.classList.toggle("invalid", !!text);
      f.querySelector(".err").textContent = text || "";
      input.setAttribute("aria-invalid", text ? "true" : "false");
    };
    form.addEventListener("input", function (e) { if (e.target.closest(".field.invalid")) setErr(e.target, ""); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = fe.name.value.trim(), phone = fe.phone.value.trim();
      var good = true, first = null;
      if (name.length < 2) { setErr(fe.name, "Вкажіть, як до вас звертатися"); good = false; first = first || fe.name; } else setErr(fe.name, "");
      var digits = phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 13) { setErr(fe.phone, "Перевірте номер: потрібно 10–12 цифр"); good = false; first = first || fe.phone; } else setErr(fe.phone, "");
      if (!good) { first.focus(); return; }

      var text = "Заявка на замір\n" +
        "Ім'я: " + name + "\n" +
        "Телефон: " + phone + "\n" +
        "Що замовити: " + fe.type.value +
        (fe.msg.value.trim() ? "\nКоментар: " + fe.msg.value.trim() : "");
      var via = (form.querySelector('input[name="via"]:checked') || {}).value || VIA_DEFAULT;
      try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (err) {}
      var enc = encodeURIComponent(text);
      if (via === "viber") window.location.href = LINK_VIBER + "&draft=" + enc;
      else if (via === "mail") window.location.href = LINK_MAIL + "?subject=" + encodeURIComponent("Заявка на замір меблів") + "&body=" + enc;
      else if (via === "sms") window.location.href = LINK_SMS + "?&body=" + enc;
      else if (via === "ig") window.open(LINK_IG, "_blank", "noopener");
      else window.open(LINK_TG + "?text=" + enc, "_blank", "noopener");

      form.hidden = true; ok.hidden = false; ok.focus();
    });
    document.getElementById("formAgain").addEventListener("click", function () { form.reset(); ok.hidden = true; form.hidden = false; fe.name.focus(); });
  }

  var y = document.getElementById("yearNow");
  if (y) y.textContent = new Date().getFullYear();
})();
