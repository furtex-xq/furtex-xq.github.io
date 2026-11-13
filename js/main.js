/* [НАЗВА] — туристична агенція. Без бібліотек. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- year ---------- */
  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  /* ---------- header, burger, dock ---------- */
  var top = $(".top"), dock = $(".dock"), burger = $(".burger"), nav = $("#nav");
  function setMenu(open) {
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
    nav.classList.toggle("is-open", open);
  }
  if (burger && nav) {
    burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  /* ---------- reveal ---------- */
  var rv = $$(".rv");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    rv.forEach(function (el) { io.observe(el); });
  } else { rv.forEach(function (el) { el.classList.add("is-in"); }); }

  /* ---------- signature: route line drawing through tours ---------- */
  var route = $("#route");
  var R = null;
  var NS = "http://www.w3.org/2000/svg";
  function buildRoute() {
    if (!route) return;
    var svg = $(".route__svg", route), ghost = $(".route__ghost", route), line = $(".route__line", route), plane = $(".route__plane", route);
    var tours = $$(".tour", route);
    var rr = route.getBoundingClientRect(), W = rr.width, H = rr.height;
    if (!W || !H) return;
    var desk = window.matchMedia("(min-width: 900px)").matches;
    var spine = desk ? W / 2 : 12, amp = desk ? 54 : 8;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);

    var pts = [{ x: spine, y: 0 }], pins = [];
    tours.forEach(function (t) {
      var tr = t.getBoundingClientRect();
      var py = tr.top - rr.top + (desk ? 90 : 46);
      var left = tr.left - rr.left, right = tr.right - rr.left;
      var edge = desk ? (left < W / 2 ? right : left) : left;
      var p = { x: spine, y: py, edge: edge, card: t };
      pts.push(p); pins.push(p);
    });
    pts.push({ x: spine, y: H });

    var d = "M" + pts[0].x + " " + pts[0].y;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], dy = b.y - a.y, s = (i % 2 ? 1 : -1) * (i === 1 || i === pts.length - 1 ? 0.35 : 1);
      d += " C" + (a.x + amp * s) + " " + (a.y + dy * 0.38) + " " + (b.x + amp * s) + " " + (b.y - dy * 0.38) + " " + b.x + " " + b.y;
    }
    ghost.setAttribute("d", d); line.setAttribute("d", d);

    var old = $(".route__pins", svg); if (old) old.parentNode.removeChild(old);
    var g = document.createElementNS(NS, "g"); g.setAttribute("class", "route__pins");
    pins.forEach(function (p) {
      var st = document.createElementNS(NS, "line");
      st.setAttribute("class", "route__stub");
      st.setAttribute("x1", p.x); st.setAttribute("y1", p.y); st.setAttribute("x2", p.edge); st.setAttribute("y2", p.y);
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("class", "route__pin"); c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", desk ? 7 : 6);
      g.appendChild(st); g.appendChild(c); p.el = c;
    });
    svg.insertBefore(g, plane);

    var len = line.getTotalLength();
    line.style.strokeDasharray = len + " " + len;
    R = { line: line, plane: plane, len: len, pins: pins, desk: desk, max: R ? R.max : 0 };
    updateRoute();
  }
  function updateRoute() {
    if (!R) return;
    var rr = route.getBoundingClientRect();
    var p = reduce ? 1 : Math.max(0, Math.min(1, (window.innerHeight * 0.62 - rr.top) / rr.height));
    p = R.max = Math.max(R.max || 0, p);
    var L = R.len * p;
    R.line.style.strokeDashoffset = String(R.len - L);
    var pt = R.line.getPointAtLength(L);
    var pa = R.line.getPointAtLength(Math.max(0, L - 2)), pb = R.line.getPointAtLength(Math.min(R.len, L + 2));
    var ang = Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180 / Math.PI;
    var sc = R.desk ? 1.5 : 1.15;
    R.plane.setAttribute("transform", "translate(" + pt.x + " " + pt.y + ") rotate(" + ang + ") scale(" + sc + ")");
    R.plane.style.opacity = p > 0.001 && p < 0.999 ? "1" : "0";
    R.pins.forEach(function (pin) {
      if (pt.y >= pin.y - 1 && !pin.on) { pin.on = true; pin.el.classList.add("is-on"); pin.card.classList.add("is-stamped"); }
    });
  }
  if (route) {
    buildRoute();
    if ("ResizeObserver" in window) { new ResizeObserver(function () { buildRoute(); }).observe(route); }
    else window.addEventListener("resize", buildRoute);
    window.addEventListener("load", buildRoute);
  }

  /* ---------- scroll handler ---------- */
  var ticking = false;
  function onScroll() {
    var sy = window.scrollY || window.pageYOffset;
    if (top) top.classList.toggle("is-scrolled", sy > 8);
    if (dock) dock.classList.toggle("is-shown", sy > 380);
    updateRoute();
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- quiz ---------- */
  var quiz = $("#quiz");
  if (quiz) {
    var qs = $$(".pass__q", quiz), res = $(".pass__result", quiz), stepEl = $("#quiz-step");
    var back = $("#quiz-back"), reset = $("#quiz-reset"), sum = $("#quiz-summary");
    var step = 0, answers = {};
    var show = function (i) {
      step = i;
      qs.forEach(function (q, k) { q.classList.toggle("is-active", k === i); });
      res.hidden = i < qs.length;
      stepEl.textContent = Math.min(i + 1, qs.length);
      back.disabled = i === 0;
      back.hidden = i >= qs.length;
      reset.hidden = i < qs.length;
    };
    qs.forEach(function (q, k) {
      q.addEventListener("change", function (e) {
        answers[q.getAttribute("data-q")] = e.target.value;
        setTimeout(function () {
          if (k + 1 >= qs.length) {
            sum.textContent = answers.type + " · бюджет " + answers.budget + " · " + answers.when;
          }
          show(k + 1);
        }, reduce ? 0 : 260);
      });
    });
    back.addEventListener("click", function () { if (step > 0) show(step - 1); });
    reset.addEventListener("click", function () { quiz.reset(); answers = {}; show(0); });
    $("#quiz-apply").addEventListener("click", function () {
      var dest = $("#f-dest"), when = $("#f-when"), msg = $("#f-msg");
      for (var i = 0; i < dest.options.length; i++) if (dest.options[i].text === answers.type) dest.selectedIndex = i;
      when.value = answers.when || "";
      var line = "Бюджет на особу: " + (answers.budget || "—");
      if (msg.value.indexOf("Бюджет на особу") === -1) msg.value = line + (msg.value ? "\n" + msg.value : "");
      var form = $("#zaiavka");
      form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      setTimeout(function () { $("#f-name").focus({ preventScroll: true }); }, reduce ? 0 : 600);
    });
    quiz.addEventListener("submit", function (e) { e.preventDefault(); });
  }

  /* ---------- request form → Telegram / Viber / email ---------- */
  var form = $("#zaiavka");
  if (form) {
    var body = $(".form__body", form), ok = $(".form__ok", form), okText = $("#ok-text");
    var nameF = $("#f-name"), phoneF = $("#f-phone");
    var check = function (input, valid) { input.closest(".field").classList.toggle("is-invalid", !valid); return valid; };
    var vName = function () { return check(nameF, nameF.value.trim().length >= 2); };
    var vPhone = function () { var n = phoneF.value.replace(/\D/g, ""); return check(phoneF, n.length >= 10 && n.length <= 13); };
    nameF.addEventListener("blur", vName); phoneF.addEventListener("blur", vPhone);
    nameF.addEventListener("input", function () { if (nameF.closest(".field").classList.contains("is-invalid")) vName(); });
    phoneF.addEventListener("input", function () { if (phoneF.closest(".field").classList.contains("is-invalid")) vPhone(); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = vName(), b = vPhone();
      if (!a) { nameF.focus(); return; }
      if (!b) { phoneF.focus(); return; }
      var f = form.elements;
      var lines = [
        "Заявка на підбір туру",
        "Ім’я: " + f.name.value.trim(),
        "Телефон: " + f.phone.value.trim(),
        "Напрямок: " + (f.dest.value || "ще не вирішили"),
        "Хто їде: " + f.people.value,
        f.when.value.trim() ? "Дати: " + f.when.value.trim() : "",
        f.msg.value.trim() ? "Побажання: " + f.msg.value.trim() : ""
      ].filter(Boolean);
      var text = lines.join("\n"), enc = encodeURIComponent(text);
      var ch = (form.querySelector("input[name=channel]:checked") || {}).value || form.getAttribute("data-channel") || "telegram";
      var url;
      if (ch === "sms") {
        url = form.getAttribute("data-sms") + "?&body=" + enc;
        okText.textContent = "Ми відкрили SMS з готовим текстом заявки — залишилось натиснути «Надіслати».";
        window.location.href = url;
      } else if (ch === "call") {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {});
        okText.textContent = "Ми скопіювали вашу заявку. Зателефонуйте нам — менеджер підбере тур під ці побажання.";
        window.location.href = form.getAttribute("data-tel");
      } else if (ch === "instagram") {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {});
        okText.textContent = "Ми відкрили Instagram і скопіювали текст заявки — вставте його в повідомлення й надішліть.";
        window.open(form.getAttribute("data-ig"), "_blank", "noopener");
      } else if (ch === "viber") {
        url = form.getAttribute("data-viber") + "&draft=" + enc;
        okText.textContent = "Ми відкрили Viber з готовим текстом заявки — залишилось натиснути «Надіслати».";
        window.location.href = url;
      } else if (ch === "email") {
        url = form.getAttribute("data-mail") + "?subject=" + encodeURIComponent("Заявка на підбір туру") + "&body=" + enc;
        okText.textContent = "Ми відкрили поштову програму з готовим листом — залишилось натиснути «Надіслати».";
        window.location.href = url;
      } else {
        url = form.getAttribute("data-tg") + "?text=" + enc;
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {});
        okText.textContent = "Ми відкрили Telegram і скопіювали текст заявки — вставте його в чат і надішліть.";
        window.open(url, "_blank", "noopener");
      }
      body.hidden = true; ok.hidden = false; ok.focus();
    });
    $("#ok-again").addEventListener("click", function () { form.reset(); ok.hidden = true; body.hidden = false; nameF.focus(); });
  }

  /* ---------- opening hours (Kyiv time) ---------- */
  var hours = $("#hours"), status = $("#status");
  if (hours && status) {
    var sched; try { sched = JSON.parse(hours.getAttribute("data-hours")); } catch (e) { sched = null; }
    var kyivNow = function () {
      var zones = ["Europe/Kyiv", "Europe/Kiev"];
      for (var i = 0; i < zones.length; i++) {
        try {
          var parts = new Intl.DateTimeFormat("en-US", { timeZone: zones[i], weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
          var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
          var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday);
          return { day: wd, min: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
        } catch (e) { /* try next */ }
      }
      return null;
    };
    var toMin = function (s) { var p = s.split(":"); return +p[0] * 60 + +p[1]; };
    var paint = function () {
      var now = kyivNow(); if (!now || !sched) return;
      $$("tr[data-day]", hours).forEach(function (tr) { tr.classList.toggle("is-today", +tr.getAttribute("data-day") === now.day); });
      var today = sched[String(now.day)];
      var open = today && now.min >= toMin(today[0]) && now.min < toMin(today[1]);
      status.hidden = false;
      status.classList.toggle("is-open", !!open);
      status.classList.toggle("is-closed", !open);
      status.textContent = open ? "Зараз відчинено · до " + today[1] : "Зараз зачинено";
    };
    paint(); setInterval(paint, 60000);
  }
})();
