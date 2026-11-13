/* Поліграфія — шаблон. Усі дані клієнта — у CONFIG нижче. */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  /*CONFIG-START*/
  var CONFIG = {"hours": null, "showHoursTable": true, "prices": null, "telegram": "", "viber": "", "email": "", "sms": "sms:+380671020626", "instagramDm": "", "brand": "Лідер друк"};
  /*CONFIG-END*/

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Меню ---------- */
  var burger = $(".burger"), nav = $("#nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
      burger.querySelector("use").setAttribute("href", open ? "#i-x" : "#i-menu");
    });
    $$("a", nav).forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        burger.querySelector("use").setAttribute("href", "#i-menu");
      });
    });
  }

  /* ---------- Рік ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Приводка: заголовок і мітки ---------- */
  var reg = $("[data-reg]");
  var layers = reg ? { c: $(".rl-c", reg), m: $(".rl-m", reg), y: $(".rl-y", reg) } : null;
  var OFF = { c: [-10, -6], m: [9, 5], y: [-5, 9] };
  var aligned = false;
  function setReg(k) {
    if (!layers) return;
    ["c", "m", "y"].forEach(function (n) {
      layers[n].style.transform = "translate(" + (OFF[n][0] * k).toFixed(2) + "px," + (OFF[n][1] * k).toFixed(2) + "px)";
    });
  }
  if (layers && !reduce) {
    setReg(1);
    // друкарський верстат «виходить на приводку»: шрифт завантажився — шари сходяться
    var go = function () {
      if (go.done) return; go.done = true;
      window.setTimeout(function () {
        setReg(0);
        window.setTimeout(function () {
          aligned = true;
          Object.keys(layers).forEach(function (n) { layers[n].style.transition = "transform .25s linear"; });
        }, 1900);
      }, 450);
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    window.setTimeout(go, 1200);
  }

  var markProg = $(".bm-prog");
  var hero = $(".hero");
  var ticking = false;
  function onScroll() {
    ticking = false;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
    if (markProg) markProg.style.strokeDashoffset = String(100 - p * 100);
    if (layers && !reduce && hero) {
      // виходячи з першого екрана, шари трохи «розʼїжджаються», повертаючись — сходяться
      var hp = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.9)));
      if (aligned) setReg(hp * 0.9);
    }
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Поява при прокручуванні ---------- */
  var revealEls = $$(".reveal, [data-mark]");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Графік і статус «відчинено» за київським часом ---------- */
  var DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday);
      return { day: wd, min: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function toMin(t) { var a = t.split(":"); return parseInt(a[0], 10) * 60 + parseInt(a[1], 10); }
  function renderHours() {
    var H = CONFIG.hours;
    if (!H) return;
    var now = kyivNow();
    var table = $("[data-hours-table]");
    if (table && CONFIG.showHoursTable) {
      var body = table.tBodies[0];
      var order = [1, 2, 3, 4, 5, 6, 0];
      body.innerHTML = "";
      order.forEach(function (d) {
        var tr = document.createElement("tr");
        if (d === now.day) tr.className = "today";
        var th = document.createElement("th"); th.scope = "row"; th.textContent = DAYS[d];
        var td = document.createElement("td");
        var h = H[String(d)];
        td.textContent = h ? h[0] + "–" + h[1] : "вихідний";
        tr.appendChild(th); tr.appendChild(td); body.appendChild(tr);
      });
      table.hidden = false;
      var sum = $("[data-hours-sum]");
      if (sum) sum.hidden = true;
    }
    var today = H[String(now.day)];
    var open = !!(today && now.min >= toMin(today[0]) && now.min < toMin(today[1]));
    var label;
    if (open) {
      label = "Відчинено до " + today[1];
    } else {
      label = "Зачинено";
      for (var i = 0; i < 7; i++) {
        var dd = (now.day + i) % 7, hh = H[String(dd)];
        if (!hh) continue;
        if (i === 0 && now.min < toMin(hh[0])) { label = "Зачинено · відкриємось о " + hh[0]; break; }
        if (i > 0) { label = "Зачинено · відкриємось " + (i === 1 ? "завтра" : DAYS[dd].toLowerCase()) + " о " + hh[0]; break; }
      }
    }
    $$("[data-status]").forEach(function (el) {
      el.textContent = label;
      el.className = "status " + (open ? "open" : "closed");
      el.hidden = false;
    });
  }
  renderHours();

  /* ---------- Калькулятор друку ---------- */
  var SRA3 = { w: 320, h: 450, margin: 5 };
  var BLEED = 2;
  var PRODUCTS = [
    { id: "vizytky", name: "Візитки", code: "ВЗ", mode: "sheet", sides: true, unit: "шт", term: "1–2 робочі дні",
      qty: [100, 200, 500, 1000],
      formats: [{ id: "90x50", label: "90×50 мм", w: 90, h: 50, k: 1 }, { id: "85x55", label: "85×55 мм", w: 85, h: 55, k: 1 }] },
    { id: "flyery", name: "Флаєри", code: "ФЛ", mode: "sheet", sides: true, unit: "шт", term: "1–2 робочі дні",
      qty: [100, 250, 500, 1000],
      formats: [{ id: "a6", label: "А6", w: 105, h: 148, k: 1 }, { id: "euro", label: "Євро 99×210", w: 99, h: 210, k: 1.4 }, { id: "a5", label: "А5", w: 148, h: 210, k: 1.8 }, { id: "a4", label: "А4", w: 210, h: 297, k: 3.4 }] },
    { id: "naklejky", name: "Наклейки", code: "НК", mode: "sheet", sides: false, unit: "шт", term: "1–3 робочі дні",
      qty: [50, 100, 250, 500],
      formats: [{ id: "50", label: "50×50 мм", w: 50, h: 50, k: 1 }, { id: "70", label: "70×70 мм", w: 70, h: 70, k: 1.7 }, { id: "100", label: "100×100 мм", w: 100, h: 100, k: 3 }] },
    { id: "baner", name: "Банер", code: "БН", mode: "roll", sides: false, unit: "шт", term: "1–2 робочі дні",
      qty: [1, 2, 5, 10],
      formats: [{ id: "1x1", label: "1×1 м", w: 1000, h: 1000, k: 1 }, { id: "2x1", label: "2×1 м", w: 2000, h: 1000, k: 2 }, { id: "3x1", label: "3×1 м", w: 3000, h: 1000, k: 3 }, { id: "3x2", label: "3×2 м", w: 3000, h: 2000, k: 6 }] }
  ];
  var state = { product: "vizytky", format: "90x50", qty: 100, sides: 1 };
  var calcForm = $("#calcForm");
  var svgNS = "http://www.w3.org/2000/svg";

  function prod() { return PRODUCTS.filter(function (p) { return p.id === state.product; })[0]; }
  function fmt() { var p = prod(); return p.formats.filter(function (f) { return f.id === state.format; })[0] || p.formats[0]; }
  function nf(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

  function segment(group, items) {
    var box = $('[data-group="' + group + '"]', calcForm);
    if (!box) return;
    box.innerHTML = "";
    items.forEach(function (it) {
      var lab = document.createElement("label");
      var inp = document.createElement("input");
      inp.type = "radio"; inp.name = group; inp.value = String(it.value);
      if (String(state[group]) === String(it.value)) inp.checked = true;
      var sp = document.createElement("span"); sp.textContent = it.label;
      lab.appendChild(inp); lab.appendChild(sp); box.appendChild(lab);
    });
  }
  function buildControls() {
    var p = prod();
    segment("product", PRODUCTS.map(function (x) { return { value: x.id, label: x.name }; }));
    segment("format", p.formats.map(function (f) { return { value: f.id, label: f.label }; }));
    segment("qty", p.qty.map(function (q) { return { value: q, label: nf(q) }; }));
    segment("sides", [{ value: 1, label: "Односторонній" }, { value: 2, label: "Двосторонній" }]);
    var sw = $("[data-sides-wrap]", calcForm);
    if (sw) sw.hidden = !p.sides;
  }

  function fitCount(w, h) {
    var aw = SRA3.w - 2 * SRA3.margin, ah = SRA3.h - 2 * SRA3.margin;
    var iw = w + 2 * BLEED, ih = h + 2 * BLEED;
    var a = Math.floor(aw / iw) * Math.floor(ah / ih);
    var b = Math.floor(aw / ih) * Math.floor(ah / iw);
    return a >= b ? { n: a, cols: Math.floor(aw / iw), rows: Math.floor(ah / ih), iw: iw, ih: ih } : { n: b, cols: Math.floor(aw / ih), rows: Math.floor(ah / iw), iw: ih, ih: iw };
  }
  function el(tag, attrs) {
    var e = document.createElementNS(svgNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  var COLORS = ["#00a0dc", "#e5007d", "#ffe600", "#121315"];
  function cropMark(svg, x, y, dx, dy) {
    svg.appendChild(el("path", { d: "M" + (x + dx * 3) + " " + y + "h" + dx * 10 + "M" + x + " " + (y + dy * 3) + "v" + dy * 10, stroke: "#121315", "stroke-width": "1", fill: "none" }));
  }
  function drawSheet(f) {
    var svg = $("#impo");
    var fit = fitCount(f.w, f.h);
    svg.setAttribute("viewBox", "-16 -16 352 482");
    svg.innerHTML = "";
    svg.appendChild(el("rect", { x: 0, y: 0, width: SRA3.w, height: SRA3.h, fill: "#fff", stroke: "#c8ccc7" }));
    var gw = fit.cols * fit.iw, gh = fit.rows * fit.ih;
    var ox = (SRA3.w - gw) / 2, oy = (SRA3.h - gh) / 2;
    var i = 0;
    for (var r = 0; r < fit.rows; r++) {
      for (var c = 0; c < fit.cols; c++) {
        var x = ox + c * fit.iw, y = oy + r * fit.ih;
        var g = el("rect", { x: x + BLEED, y: y + BLEED, width: fit.iw - 2 * BLEED, height: fit.ih - 2 * BLEED, fill: COLORS[(r + c) % 4], "fill-opacity": (r + c) % 4 === 3 ? "0.85" : "0.75" });
        g.style.opacity = "0";
        g.style.transition = reduce ? "none" : "opacity .35s ease " + Math.min(i * 12, 600) + "ms";
        svg.appendChild(g);
        i++;
      }
    }
    // мітки під обріз по кутах сітки
    cropMark(svg, ox, oy, -1, -1); cropMark(svg, ox + gw, oy, 1, -1);
    cropMark(svg, ox, oy + gh, -1, 1); cropMark(svg, ox + gw, oy + gh, 1, 1);
    // мітки приводки
    [[SRA3.w / 2, -8], [SRA3.w / 2, SRA3.h + 8]].forEach(function (pt) {
      svg.appendChild(el("circle", { cx: pt[0], cy: pt[1], r: 4, fill: "none", stroke: "#121315", "stroke-width": "0.8" }));
      svg.appendChild(el("path", { d: "M" + (pt[0] - 7) + " " + pt[1] + "h14M" + pt[0] + " " + (pt[1] - 7) + "v14", stroke: "#121315", "stroke-width": "0.8" }));
    });
    requestAnimationFrame(function () { $$("rect", svg).forEach(function (rc, k) { if (k > 0) rc.style.opacity = "1"; }); });
    return fit;
  }
  function drawRoll(f) {
    var svg = $("#impo");
    var W = 320, scale = W / 3000;
    var w = f.w * scale, h = f.h * scale;
    svg.setAttribute("viewBox", "-16 -16 352 " + (h + 64));
    svg.innerHTML = "";
    var x = (W - w) / 2, y = 8;
    svg.appendChild(el("rect", { x: x, y: y, width: w, height: h, fill: "#e5007d", "fill-opacity": "0.82" }));
    svg.appendChild(el("rect", { x: x + 4, y: y + 4, width: w - 8, height: h - 8, fill: "none", stroke: "#fff", "stroke-dasharray": "3 3", "stroke-width": "0.8" }));
    // люверси приблизно кожні 30 см
    var step = 300 * scale;
    var nx = Math.max(1, Math.round(w / step)), ny = Math.max(1, Math.round(h / step));
    for (var i = 0; i <= nx; i++) {
      [y + 5, y + h - 5].forEach(function (yy) { svg.appendChild(el("circle", { cx: x + 5 + i * (w - 10) / nx, cy: yy, r: 2.2, fill: "#fff", stroke: "#121315", "stroke-width": "0.6" })); });
    }
    for (var j = 1; j < ny; j++) {
      [x + 5, x + w - 5].forEach(function (xx) { svg.appendChild(el("circle", { cx: xx, cy: y + 5 + j * (h - 10) / ny, r: 2.2, fill: "#fff", stroke: "#121315", "stroke-width": "0.6" })); });
    }
    // розмірна лінія
    var ly = y + h + 18;
    svg.appendChild(el("path", { d: "M" + x + " " + (ly - 5) + "v10M" + (x + w) + " " + (ly - 5) + "v10M" + x + " " + ly + "H" + (x + w), stroke: "#121315", "stroke-width": "0.8" }));
    var t = el("text", { x: x + w / 2, y: ly + 16, "text-anchor": "middle", "font-size": "12", "font-family": "Cousine, monospace", fill: "#121315" });
    t.textContent = (f.w / 1000) + " м";
    svg.appendChild(t);
  }
  function priceFor(p, f) {
    var table = CONFIG.prices && CONFIG.prices[p.id];
    if (!table || table[String(state.qty)] == null) return null;
    var v = table[String(state.qty)] * f.k * (p.sides && state.sides === 2 ? 1.6 : 1);
    return Math.round(v / 5) * 5;
  }
  function out(name, html, isText) {
    $$('[data-out="' + name + '"]').forEach(function (e) { if (isText) e.textContent = html; else e.innerHTML = html; });
  }
  function update() {
    var p = prod(), f = fmt();
    state.format = f.id;
    var sides = p.sides ? (state.sides === 2 ? "4+4" : "4+0") : "4+0";
    out("product", p.name, true);
    out("format", f.label + (p.sides ? ", " + sides : ""), true);
    out("qty", nf(state.qty) + " " + p.unit, true);
    out("term", p.term, true);
    out("code", p.code + "-" + f.id.toUpperCase() + "-" + state.qty, true);
    if (p.mode === "sheet") {
      var fit = drawSheet(f);
      var sheets = Math.ceil(state.qty / fit.n);
      out("fitLabel", "На аркуші SRA3", true);
      out("fit", fit.n + " шт · ≈ " + sheets + " " + plural(sheets, "аркуш", "аркуші", "аркушів"), true);
      out("impoCap", "Розкладка на аркуші SRA3 (320×450 мм) з вильотами по 2 мм", true);
    } else {
      drawRoll(f);
      var area = (f.w / 1000) * (f.h / 1000) * state.qty;
      out("fitLabel", "Площа друку", true);
      out("fit", (Math.round(area * 10) / 10) + " м²", true);
      out("impoCap", "Банер із люверсами по периметру, крок ≈ 30 см", true);
    }
    var pr = priceFor(p, f);
    if (pr != null) out("price", "від " + nf(pr) + " грн", true);
    else out("price", 'від <span class="ph">[ЦІНА]</span> грн');
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  if (calcForm) {
    buildControls();
    update();
    calcForm.addEventListener("change", function (e) {
      var t = e.target;
      if (!t || !t.name) return;
      if (t.name === "product") {
        state.product = t.value;
        var p = prod();
        state.format = p.formats[0].id;
        state.qty = p.qty[0];
        state.sides = 1;
        buildControls();
      } else if (t.name === "qty" || t.name === "sides") {
        state[t.name] = parseInt(t.value, 10);
      } else {
        state[t.name] = t.value;
      }
      update();
    });
  }
  var orderBtn = $("[data-calc-order]");
  if (orderBtn) {
    orderBtn.addEventListener("click", function () {
      var p = prod(), f = fmt();
      var map = { vizytky: "Візитки", flyery: "Флаєри або листівки", naklejky: "Наклейки й етикетки", baner: "Банер або плакат" };
      var sel = $("#f-product"); if (sel) sel.value = map[p.id];
      var q = $("#f-qty"); if (q) q.value = nf(state.qty) + " " + p.unit;
      var m = $("#f-msg");
      if (m) m.value = "Формат: " + f.label + (p.sides ? ", друк " + (state.sides === 2 ? "двосторонній" : "односторонній") : "") + ". ";
    });
  }

  /* ---------- Форма заявки ---------- */
  var form = $("#zamovlennia");
  if (form) {
    var success = $("[data-success]", form);
    function fieldOf(name) { return form.elements[name] ? form.elements[name].closest(".field") : null; }
    function validate() {
      var ok = true;
      var name = form.elements.name.value.trim();
      var phone = form.elements.phone.value.replace(/[^\d]/g, "");
      fieldOf("name").classList.toggle("bad", name.length < 2);
      fieldOf("phone").classList.toggle("bad", phone.length < 10 || phone.length > 12);
      if (name.length < 2 || phone.length < 10 || phone.length > 12) ok = false;
      return ok;
    }
    ["name", "phone"].forEach(function (n) {
      form.elements[n].addEventListener("input", function () { if (fieldOf(n).classList.contains("bad")) validate(); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) {
        var bad = $(".field.bad input", form); if (bad) bad.focus();
        return;
      }
      var f = form.elements;
      var lines = [
        "Заявка на друк — " + CONFIG.brand,
        "Ім'я: " + f.name.value.trim(),
        "Телефон: " + f.phone.value.trim(),
        "Виріб: " + f.product.value
      ];
      if (f.qty.value.trim()) lines.push("Тираж: " + f.qty.value.trim());
      if (f.msg.value.trim()) lines.push("Деталі: " + f.msg.value.trim());
      var text = lines.join("\n");
      var chEl = form.querySelector('input[name="channel"]:checked') || form.querySelector('input[name="channel"]');
      var ch = chEl ? chEl.value : "none";
      var url = "";
      if (ch === "telegram" && CONFIG.telegram) url = CONFIG.telegram + "?text=" + encodeURIComponent(text);
      else if (ch === "viber" && CONFIG.viber) url = CONFIG.viber + "&draft=" + encodeURIComponent(text);
      else if (ch === "email" && CONFIG.email) url = CONFIG.email + "?subject=" + encodeURIComponent("Заявка на друк") + "&body=" + encodeURIComponent(text);
      else if (ch === "sms" && CONFIG.sms) url = CONFIG.sms + "?&body=" + encodeURIComponent(text);
      else if (ch === "instagram" && CONFIG.instagramDm) {
        url = CONFIG.instagramDm;
        try { if (navigator.clipboard) navigator.clipboard.writeText(text); } catch (err) { /* без буфера */ }
      }
      if (success) { success.hidden = false; success.focus({ preventScroll: true }); }
      if (url) {
        if (/^https?:/.test(url)) window.open(url, "_blank", "noopener");
        else window.location.href = url;
      }
    });
  }
})();
