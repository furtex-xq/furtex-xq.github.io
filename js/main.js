/* Кав'ярня — template scripts. No dependencies. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Contacts (one place to edit) ---------- */
  /* one line on purpose: tools/personalize.py rewrites it */
  var CONTACT = {"email": "", "sms": "", "instagram": "https://ig.me/m/merci_frankivsk", "facebook": "", "business": "Merci!"};

  /* ---------- Mobile menu ---------- */
  var burger = $(".burger"), nav = $("#nav");
  function setMenu(open) {
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
    burger.classList.toggle("on-dark", open);
    nav.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
  $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-open")) setMenu(false); });

  /* ---------- Opening hours by Kyiv time ---------- */
  var DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
  var hoursEl = $("[data-hours]");
  var HOURS = {};
  try { HOURS = JSON.parse(hoursEl.getAttribute("data-hours")); } catch (e) { HOURS = {}; }

  function kyivNow() {
    var zones = ["Europe/Kyiv", "Europe/Kiev"];
    for (var i = 0; i < zones.length; i++) {
      try {
        var parts = new Intl.DateTimeFormat("en-US", { timeZone: zones[i], weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
        var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
        var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday);
        return { day: wd, min: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10), iso: o.year + "-" + o.month + "-" + o.day };
      } catch (e) { /* try next zone */ }
    }
    var d = new Date();
    return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes(), iso: d.toISOString().slice(0, 10) };
  }
  function toMin(t) { var a = t.split(":"); return +a[0] * 60 + +a[1]; }

  var now = kyivNow();
  if (hoursEl) {
    [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
      var li = document.createElement("li");
      var h = HOURS[d];
      li.innerHTML = "<span>" + DAYS[d] + "</span><span>" + (h ? h[0] + " – " + h[1] : "вихідний") + "</span>";
      if (d === now.day) li.className = "is-today";
      hoursEl.appendChild(li);
    });
  }
  function statusText() {
    if (!Object.keys(HOURS).length) return null;
    function span(d) { var t = HOURS[d]; if (!t) return null; var o = toMin(t[0]), c = toMin(t[1]); if (c <= o) c += 1440; return [o, c]; }
    var t = span(now.day), yd = (now.day + 6) % 7, y = span(yd);
    if (y && y[1] > 1440 && now.min < y[1] - 1440) return { open: true, text: "Зараз відчинено · до " + HOURS[yd][1] };
    if (t && now.min >= t[0] && now.min < t[1]) return { open: true, text: "Зараз відчинено · до " + HOURS[now.day][1] };
    if (t && now.min < t[0]) return { open: false, text: "Зараз зачинено · відчиняємось о " + HOURS[now.day][0] };
    var ON = ["в неділю", "в понеділок", "у вівторок", "в середу", "в четвер", "в п'ятницю", "в суботу"];
    for (var i = 1; i <= 7; i++) {
      var d = (now.day + i) % 7;
      if (HOURS[d]) return { open: false, text: "Зараз зачинено · відчиняємось " + (i === 1 ? "завтра" : ON[d]) + " о " + HOURS[d][0] };
    }
    return null;
  }
  var st = statusText();
  if (st) $$("[data-status]").forEach(function (el) {
    el.classList.add(st.open ? "is-open" : "is-closed");
    $("[data-status-text]", el).textContent = st.text;
  });

  /* ---------- Brew meter (signature) ---------- */
  var DRINKS = {
    espresso: { name: "Еспресо", acc: "еспресо", note: "Коротко й насичено: 30 мл з густою горіховою кремою.",
      layers: [{ k: "Еспресо", ml: 30, c: "#4a2513", crema: true }] },
    americano: { name: "Американо", acc: "американо", note: "Гаряча вода, а зверху — еспресо, щоб крема залишилась у чашці.",
      layers: [{ k: "Гаряча вода", ml: 150, c: "#6b3c22" }, { k: "Еспресо", ml: 30, c: "#4a2513", crema: true }] },
    cappuccino: { name: "Капучино", acc: "капучино", note: "Класика: еспресо, молоко та щільна оксамитова піна.",
      layers: [{ k: "Еспресо", ml: 30, c: "#4a2513", crema: true }, { k: "Молоко", ml: 90, c: "#c99f78" }, { k: "Молочна піна", ml: 60, c: "#f6eee1", foam: true }] },
    flatwhite: { name: "Флет вайт", acc: "флет вайт", note: "Подвійний еспресо і тонка мікропіна — більше кави, менше молока.",
      layers: [{ k: "Подвійний еспресо", ml: 60, c: "#4a2513", crema: true }, { k: "Молоко", ml: 110, c: "#b88a62" }, { k: "Мікропіна", ml: 10, c: "#efe2cc", foam: true }] },
    latte: { name: "Лате", acc: "лате", note: "Багато ніжного молока і м'який смак кави. Сироп — за бажанням.",
      layers: [{ k: "Еспресо", ml: 30, c: "#4a2513", crema: true }, { k: "Молоко", ml: 200, c: "#ddc3a0" }, { k: "Молочна піна", ml: 20, c: "#f6eee1", foam: true }] },
    raf: { name: "Раф", acc: "раф", note: "Еспресо, збитий з вершками й ванільним цукром. Десерт у чашці.",
      layers: [{ k: "Еспресо", ml: 30, c: "#4a2513" }, { k: "Вершки з ваніллю", ml: 150, c: "#e8d2ad" }, { k: "Ніжна піна", ml: 20, c: "#f8f0e2", foam: true }] }
  };
  var SVGNS = "http://www.w3.org/2000/svg";
  var TOP = 44, BOTTOM = 276, CAP = 300, PX = (BOTTOM - TOP) / CAP;
  var brew = $(".brew"), glass = $(".glass"), layersG = $("#layers");
  var nameEl = $("[data-name]"), noteEl = $("[data-note]"), stepsEl = $("[data-steps]"), mlEl = $("[data-ml]"), totalEl = $("[data-total]"), orderBtn = $("[data-order-drink]");
  var drink, cur = [], nodes = [], surface, raf = 0, total = 0;

  function halfWidthAt(y) { var t = (y - TOP) / (262 - TOP); return 73 - 15 * Math.max(0, Math.min(1, t)); }
  function el(tag, attrs) { var n = document.createElementNS(SVGNS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); return n; }

  function selectDrink(key) {
    drink = DRINKS[key];
    total = drink.layers.reduce(function (s, l) { return s + l.ml; }, 0);
    $$(".chip").forEach(function (c) { var on = c.getAttribute("data-drink") === key; c.classList.toggle("is-on", on); c.setAttribute("aria-selected", on ? "true" : "false"); });
    nameEl.textContent = drink.name; noteEl.textContent = drink.note; totalEl.textContent = total;
    orderBtn.textContent = "Замовити " + drink.acc;
    orderBtn.setAttribute("data-drink-name", drink.name);
    stepsEl.innerHTML = "";
    drink.layers.forEach(function (l) {
      var li = document.createElement("li");
      li.innerHTML = '<span class="recipe__sw" style="background:' + l.c + '"></span><b>' + l.k + '</b><span class="ml">' + l.ml + " мл</span>";
      stepsEl.appendChild(li);
    });
    while (layersG.firstChild) layersG.removeChild(layersG.firstChild);
    nodes = drink.layers.map(function (l) {
      var g = el("g", {});
      var r = el("rect", { x: 20, width: 180, y: BOTTOM, height: 0, fill: l.c });
      g.appendChild(r);
      var dots = null, cr = null;
      if (l.foam) { dots = el("rect", { x: 20, width: 180, y: BOTTOM, height: 0, fill: "url(#foamDots)" }); g.appendChild(dots); }
      if (l.crema) { cr = el("rect", { x: 20, width: 180, y: BOTTOM, height: 0, fill: "#a86a3c" }); g.appendChild(cr); }
      layersG.appendChild(g);
      return { r: r, dots: dots, cr: cr };
    });
    surface = el("ellipse", { cx: 110, cy: BOTTOM, rx: 0, ry: 0, fill: "#fff", opacity: ".0" });
    layersG.appendChild(surface);
    cur = drink.layers.map(function () { return 0; });
    tick();
  }

  function progress() {
    if (reduce) return 1;
    var r = brew.getBoundingClientRect();
    var span = r.height - window.innerHeight;
    if (span <= 0) return 1;
    var p = -r.top / span;
    return Math.max(0, Math.min(1, (p - 0.04) / 0.72));
  }

  function draw() {
    var y = BOTTOM, level = 0, topLayer = -1;
    drink.layers.forEach(function (l, i) {
      var h = cur[i] * PX;
      var n = nodes[i];
      y -= h;
      n.r.setAttribute("y", y); n.r.setAttribute("height", h + (h > 0 ? 0.6 : 0));
      if (n.dots) { n.dots.setAttribute("y", y); n.dots.setAttribute("height", h); }
      if (n.cr) { var ch = Math.min(5, h); n.cr.setAttribute("y", y); n.cr.setAttribute("height", ch); }
      level += cur[i];
      if (cur[i] > 0.5) topLayer = i;
    });
    if (topLayer >= 0) {
      var tl = drink.layers[topLayer];
      surface.setAttribute("cy", y); surface.setAttribute("rx", halfWidthAt(y)); surface.setAttribute("ry", 5);
      surface.setAttribute("fill", tl.crema ? "#b67846" : tl.foam ? "#fffdf8" : tl.c);
      surface.setAttribute("opacity", "1");
    } else surface.setAttribute("opacity", "0");
    mlEl.textContent = Math.round(level);
    $$("li", stepsEl).forEach(function (li, i) {
      var l = drink.layers[i];
      li.classList.toggle("is-done", cur[i] >= l.ml - 0.5);
      li.classList.toggle("is-on", cur[i] > 0.5 && cur[i] < l.ml - 0.5);
    });
    glass.classList.toggle("is-full", level >= total - 1 && !drink.cold);
  }

  function targets() {
    var lvl = progress() * total, out = [];
    drink.layers.forEach(function (l) { var v = Math.max(0, Math.min(l.ml, lvl)); out.push(v); lvl -= l.ml; });
    return out;
  }

  function tick() {
    raf = 0;
    var t = targets(), moving = false;
    for (var i = 0; i < t.length; i++) {
      if (reduce) { cur[i] = t[i]; continue; }
      var d = t[i] - cur[i];
      // pour sequentially: a layer only grows once the one below is (almost) at its target
      if (d > 0 && i > 0 && cur[i - 1] < t[i - 1] - 1) d = 0;
      if (Math.abs(d) > 0.3) { cur[i] += d * 0.16; moving = true; } else cur[i] = t[i];
    }
    draw();
    if (moving) raf = requestAnimationFrame(tick);
  }
  function req() { if (!raf) raf = requestAnimationFrame(tick); }

  if (brew) {
    $$(".chip").forEach(function (c) { c.addEventListener("click", function () { selectDrink(c.getAttribute("data-drink")); }); });
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    selectDrink("cappuccino");
  }

  /* ---------- Reveal on scroll + doodle drawing ---------- */
  $$(".doodle, .step__d").forEach(function (svg) {
    if (svg.closest(".glass") || svg.closest(".order__ok")) return;
    svg.classList.add("draw");
    $$("path", svg).forEach(function (p) { try { p.style.setProperty("--len", Math.ceil(p.getTotalLength()) + 1); } catch (e) {} });
  });
  var revealTargets = $$(".hero__text > *, .hero__photo, .perks, .menu__aside, .sheet, .bake__img, .bake__text, .about__photos, .about__text, .process h2, .step, .rev__card, .faq__list, .contacts__info, .order, .draw");
  if (!reduce && "IntersectionObserver" in window) {
    revealTargets.forEach(function (n) { if (!n.classList.contains("draw")) n.classList.add("rv"); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealTargets.forEach(function (n) { io.observe(n); });
  } else revealTargets.forEach(function (n) { n.classList.add("is-in"); });

  /* ---------- Order form ---------- */
  var form = $("#zamovyty");
  var guestsField = form.elements.guests.closest(".f");
  form.elements.date.value = now.iso;
  form.elements.date.min = now.iso;
  function syncType() {
    var isTable = form.elements.type.value === "Столик";
    guestsField.hidden = !isTable;
    form.classList.toggle("is-table", isTable);
  }
  $$("input[name=type]", form).forEach(function (r) { r.addEventListener("change", syncType); });
  syncType();

  function presetType(v, msg) {
    $$("input[name=type]", form).forEach(function (r) { r.checked = r.value === v; });
    syncType();
    if (msg && !form.elements.msg.value) form.elements.msg.value = msg;
  }
  $$("[data-preset]").forEach(function (a) { a.addEventListener("click", function () { presetType(a.getAttribute("data-preset")); }); });
  if (orderBtn) orderBtn.addEventListener("click", function () {
    presetType("Кава з собою");
    form.elements.msg.value = "1 × " + orderBtn.getAttribute("data-drink-name");
  });

  function mark(input, bad) { var f = input.closest(".f"); if (f) f.classList.toggle("is-bad", bad); return !bad; }
  function validate() {
    var e = form.elements, ok = true;
    ok = mark(e.name, e.name.value.trim().length < 2) && ok;
    ok = mark(e.phone, e.phone.value.replace(/\D/g, "").length < 10) && ok;
    ok = mark(e.date, !e.date.value) && ok;
    ok = mark(e.time, !e.time.value) && ok;
    return ok;
  }
  $$("input", form).forEach(function (i) { i.addEventListener("input", function () { var f = i.closest(".f"); if (f && f.classList.contains("is-bad")) validate(); }); });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!validate()) { var bad = $(".is-bad input", form); if (bad) bad.focus(); return; }
    var e = form.elements, type = e.type.value;
    var d = e.date.value.split("-").reverse().join(".");
    var lines = [
      "Заявка з сайту " + CONTACT.business,
      "Що потрібно: " + type,
      "Ім'я: " + e.name.value.trim(),
      "Телефон: " + e.phone.value.trim(),
      "Коли: " + d + " о " + e.time.value
    ];
    if (type === "Столик") lines.push("Гостей: " + (e.guests.value || "—"));
    if (e.msg.value.trim()) lines.push("Побажання: " + e.msg.value.trim());
    var text = lines.join("\n");
    var via = e.via.value, okText;
    var DM = { telegram: "Telegram", instagram: "Instagram", facebook: "Messenger" };
    if (DM[via]) {
      window.open(CONTACT[via], "_blank", "noopener");
      try { navigator.clipboard.writeText(text); } catch (err) {}
      okText = "Відкрили " + DM[via] + ", а текст заявки скопіювали — вставте його в чат і натисніть «Надіслати».";
    } else if (via === "viber") {
      window.location.href = CONTACT.viber + "&draft=" + encodeURIComponent(text);
      okText = "Відкрили Viber з готовим текстом — залишилось натиснути «Надіслати».";
    } else if (via === "sms") {
      window.location.href = CONTACT.sms + "?&body=" + encodeURIComponent(text);
      okText = "Відкрили SMS з готовим текстом — залишилось натиснути «Надіслати».";
    } else {
      window.location.href = "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent("Заявка з сайту: " + type) + "&body=" + encodeURIComponent(text);
      okText = "Відкрили поштову програму з готовим листом — залишилось натиснути «Надіслати».";
    }
    var ok = $(".order__ok", form);
    $("[data-ok-text]", ok).textContent = okText;
    ok.hidden = false;
    ok.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  });

  /* ---------- Footer year ---------- */
  var y = $("[data-year]"); if (y) y.textContent = String(new Date().getFullYear());
})();
