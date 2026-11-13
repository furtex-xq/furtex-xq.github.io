(function () {
  "use strict";
  var S = window.SITE || {};
  var L = S.links || {};
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(id) { return document.getElementById(id); }
  function fmtNum(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function plural(n, a, b, c) { var m = n % 10, h = n % 100; if (m === 1 && h !== 11) return a; if (m >= 2 && m <= 4 && (h < 10 || h >= 20)) return b; return c; }
  var PH = '<span class="ph">[ЦІНА]</span>';

  /* ---------- Канали, яких немає: прибрати елементи data-need ---------- */
  var have = { phone: !!S.tel, email: !!L.email, instagram: !!L.instagram };
  Array.prototype.forEach.call(document.querySelectorAll("[data-need]"), function (n) {
    if (!have[n.getAttribute("data-need")]) n.parentNode.removeChild(n);
  });
  var mbar = $("mbar");
  if (mbar && mbar.children.length === 2) mbar.classList.add("n2");

  /* ---------- Меню ---------- */
  var burger = $("burger"), nav = $("nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Відкрити меню"); }
    });
  }

  /* ---------- Поява при скролі ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    var targets = document.querySelectorAll(".sec-head, .pgroup, .ba-wrap, .gallery figure, .tape li, .about-photos, .about-copy, .rev, .faq-list, .cont-card, .form-card");
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    Array.prototype.forEach.call(targets, function (t, i) {
      t.classList.add("rv");
      if (t.matches(".tape li, .rev, .pgroup")) t.style.transitionDelay = (Array.prototype.indexOf.call(t.parentNode.children, t) * 70) + "ms";
      io.observe(t);
    });
  }

  /* ---------- Калькулятор ремонту ---------- */
  var KINDS = {
    cosmetic: { name: "Косметичний", msg: "косметичний ремонт", k: 0.045, b: 1.5, fill: 0.10, stages: [["Захист і підготовка", 0, .14], ["Шпаклювання стін", .1, .48], ["Фарбування, шпалери", .42, .82], ["Підлога, плінтус", .6, .9], ["Прибирання і здача", .88, 1]] },
    capital: { name: "Капітальний", msg: "капітальний ремонт", k: 0.1, b: 3, fill: 0.22, stages: [["Демонтаж", 0, .1], ["Електрика, труби", .08, .3], ["Штукатурка, стяжка", .26, .52], ["Плитка", .48, .7], ["Шпаклівка, фарба", .6, .88], ["Підлога і двері", .84, 1]] },
    design: { name: "Дизайнерський", msg: "дизайнерський ремонт", k: 0.11, b: 6, fill: 0.32, stages: [["Проєкт і кошторис", 0, .12], ["Демонтаж", .1, .18], ["Інженерні мережі", .16, .36], ["Чорнові роботи", .32, .54], ["Плитка", .5, .7], ["Оздоблення, стелі", .62, .9], ["Монтаж, меблі", .86, 1]] },
    newbuild: { name: "Новобудова з нуля", msg: "ремонт у новобудові з нуля", k: 0.1, b: 3, fill: 0.18, stages: [["Перегородки", 0, .14], ["Електрика, труби", .1, .32], ["Штукатурка, стяжка", .28, .54], ["Плитка", .5, .72], ["Чистові роботи", .64, .92], ["Двері і світло", .88, 1]] }
  };
  var calc = $("calc");
  var state = { area: 54, kind: "capital", rooms: 2, baths: 1 };

  function svgEl(tag, attrs, parent, text) {
    var n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function m1(v) { return (Math.round(v * 10) / 10).toString().replace(".", ",") + " м"; }

  function drawPlan() {
    var svg = $("plan");
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var A = state.area, W = Math.sqrt(A * 1.55), D = A / W;
    var narrow = window.innerWidth < 600;
    var VW = narrow ? 400 : 520, VH = narrow ? 300 : 340, pad = narrow ? 34 : 44;
    svg.setAttribute("viewBox", "0 0 " + VW + " " + VH);
    svg.classList.toggle("narrow", narrow);
    var s = Math.min((VW - pad * 2) / W, (VH - pad * 2) / D);
    var ox = (VW - W * s) / 2 + 10, oy = (VH - D * s) / 2 + 6;
    function X(v) { return ox + v * s; }
    function Y(v) { return oy + v * s; }
    var op = KINDS[state.kind].fill;
    var botD = Math.min(D * 0.42, 3.4), topD = D - botD;
    var rooms = [];
    var n = state.rooms;
    for (var i = 0; i < n; i++) rooms.push({ x: W * i / n, y: 0, w: W / n, h: topD, label: n === 1 ? "Кімната" : "Кімната " + (i + 1) });
    var bw = Math.min(W * 0.18, 2.2), kw = Math.max(Math.min(W * 0.34, W - bw * state.baths - 1.6), 1.8);
    rooms.push({ x: 0, y: topD, w: kw, h: D - topD, label: "Кухня" });
    var hallW = W - kw - bw * state.baths;
    rooms.push({ x: kw, y: topD, w: hallW, h: D - topD, label: "Коридор", hall: true });
    for (var b = 0; b < state.baths; b++) rooms.push({ x: kw + hallW + bw * b, y: topD, w: bw, h: D - topD, label: "С/в", bath: true });

    rooms.forEach(function (r) {
      svgEl("rect", { x: X(r.x), y: Y(r.y), width: r.w * s, height: r.h * s, fill: "#F25C05", "fill-opacity": r.hall ? op * 0.45 : (r.bath ? Math.min(op * 1.6, 0.5) : op), "class": "room" }, svg);
    });
    // перегородки
    for (var j = 1; j < n; j++) svgEl("path", { d: "M" + X(W * j / n) + " " + Y(0) + "V" + Y(topD), "class": "part" }, svg);
    svgEl("path", { d: "M" + X(0) + " " + Y(topD) + "H" + X(W), "class": "part" }, svg);
    svgEl("path", { d: "M" + X(kw) + " " + Y(topD) + "V" + Y(D), "class": "part" }, svg);
    for (var q = 0; q < state.baths; q++) svgEl("path", { d: "M" + X(kw + hallW + bw * q) + " " + Y(topD) + "V" + Y(D), "class": "part" }, svg);
    // двері (розриви в перегородці коридору)
    var dw = Math.min(0.8, W / n * 0.3) * s;
    for (var d2 = 0; d2 < n; d2++) {
      var cx = X(W * (d2 + 0.5) / n);
      if (cx > X(kw) + 6 && cx < X(kw + hallW) - 6) svgEl("path", { d: "M" + (cx - dw / 2) + " " + Y(topD) + "H" + (cx + dw / 2), "class": "gap" }, svg);
    }
    svgEl("path", { d: "M" + (X(kw) - 0) + " " + (Y(topD) + 8) + "V" + (Y(topD) + 8 + dw), "class": "gap" }, svg);
    // зовнішні стіни + вхід
    svgEl("rect", { x: X(0), y: Y(0), width: W * s, height: D * s, "class": "wall" }, svg);
    var ex = X(kw + hallW * 0.5);
    svgEl("path", { d: "M" + (ex - dw / 2) + " " + Y(D) + "H" + (ex + dw / 2), "class": "gap", "stroke-width": 7 }, svg);
    svgEl("path", { d: "M" + (ex - dw / 2) + " " + Y(D) + "A" + dw + " " + dw + " 0 0 1 " + (ex + dw / 2) + " " + (Y(D) - dw), "class": "door" }, svg);
    // підписи
    rooms.forEach(function (r) {
      var tx = X(r.x + r.w / 2), ty = Y(r.y + r.h * (r.hall ? 0.36 : 0.5));
      var small = r.w * s < (narrow ? 92 : 62);
      svgEl("text", { x: tx, y: ty - 2, "text-anchor": "middle", "class": "rl" }, svg, small && !r.bath ? r.label.replace("Кімната ", "К") : r.label);
      svgEl("text", { x: tx, y: ty + 13, "text-anchor": "middle", "class": "ra" }, svg, (Math.round(r.w * r.h * 10) / 10).toString().replace(".", ",") + " м²");
    });
    // розмірні лінії
    var yt = Y(0) - 18;
    svgEl("path", { d: "M" + X(0) + " " + yt + "H" + X(W) + "M" + X(0) + " " + (yt - 5) + "v10M" + X(W) + " " + (yt - 5) + "v10", "class": "diml" }, svg);
    var t1 = svgEl("text", { x: X(W / 2), y: yt - 6, "text-anchor": "middle", "class": "dimt" }, svg, m1(W));
    var xl = X(0) - 18;
    svgEl("path", { d: "M" + xl + " " + Y(0) + "V" + Y(D) + "M" + (xl - 5) + " " + Y(0) + "h10M" + (xl - 5) + " " + Y(D) + "h10", "class": "diml" }, svg);
    svgEl("text", { x: xl - 6, y: Y(D / 2), "text-anchor": "middle", "class": "dimt", transform: "rotate(-90 " + (xl - 6) + " " + Y(D / 2) + ")" }, svg, m1(D));
  }

  // Обмеження, щоб схема лишалась правдоподібною: ~15 м² на житлову кімнату, другий санвузол від 60 м²
  function limits() {
    if (!calc) return;
    var maxR = Math.max(1, Math.min(4, Math.floor(state.area / 15)));
    Array.prototype.forEach.call(calc.querySelectorAll("input[name=rooms]"), function (i) { i.disabled = +i.value > maxR; });
    if (state.rooms > maxR) { state.rooms = maxR; calc.querySelector("input[name=rooms][value=\"" + maxR + "\"]").checked = true; }
    var b2 = calc.querySelector("input[name=baths][value=\"2\"]");
    b2.disabled = state.area < 60;
    if (b2.disabled && state.baths === 2) { state.baths = 1; calc.querySelector("input[name=baths][value=\"1\"]").checked = true; }
  }

  function weeks() {
    var K = KINDS[state.kind];
    var w = K.b + state.area * K.k;
    if (state.kind !== "cosmetic") w += (state.rooms - 1) * 0.4 + (state.baths - 1) * 1.2;
    var lo = Math.max(1, Math.round(w)), hi = lo + Math.max(1, Math.round(lo * 0.2));
    return [lo, hi];
  }

  function drawGantt(total) {
    var g = $("gantt");
    if (!g) return;
    var K = KINDS[state.kind];
    var html = '<div class="g-head"><span>Етапи · ' + K.name.toLowerCase() + '</span><span>≈ ' + total + " " + plural(total, "тиждень", "тижні", "тижнів") + "</span></div>";
    K.stages.forEach(function (st) {
      html += '<div class="g-row"><span>' + st[0] + '</span><div class="g-track"><i class="g-bar" style="left:' + (st[1] * 100) + "%;width:" + ((st[2] - st[1]) * 100) + '%"></i></div></div>';
    });
    g.innerHTML = html;
  }

  function render() {
    limits();
    var t = weeks();
    $("resTime").textContent = t[0] + "–" + t[1] + " " + plural(t[1], "тиждень", "тижні", "тижнів");
    var rate = (S.rates || {})[state.kind];
    if (rate > 0) {
      $("resPrice").textContent = "від " + fmtNum(rate * state.area) + " грн";
      $("resRate").textContent = "ставка від " + fmtNum(rate) + " грн/м² × " + state.area + " м²";
    } else {
      $("resPrice").innerHTML = "від " + PH + " грн";
      $("resRate").innerHTML = "ставка від " + PH + " грн/м² × " + state.area + " м²";
    }
    drawGantt(t[1]);
    drawPlan();
  }

  if (calc) {
    var area = $("area"), out = $("areaOut");
    function syncArea() {
      state.area = +area.value;
      out.textContent = state.area + " м²";
      area.style.setProperty("--p", ((area.value - area.min) / (area.max - area.min) * 100) + "%");
    }
    area.addEventListener("input", function () { syncArea(); render(); });
    calc.addEventListener("change", function (e) {
      var t = e.target;
      if (t.name === "kind") state.kind = t.value;
      if (t.name === "rooms") state.rooms = +t.value;
      if (t.name === "baths") state.baths = +t.value;
      render();
    });
    calc.addEventListener("submit", function (e) { e.preventDefault(); });
    syncArea();
    render();
    var lastN = window.innerWidth < 600;
    window.addEventListener("resize", function () { var n = window.innerWidth < 600; if (n !== lastN) { lastN = n; drawPlan(); } });

    $("calcSend").addEventListener("click", function () {
      var t = weeks();
      var txt = "Розрахунок із сайту: " + KINDS[state.kind].msg + ", " + state.area + " м², кімнат: " + (state.rooms === 4 ? "4+" : state.rooms) +
        ", санвузлів: " + state.baths + ", орієнтовно " + t[0] + "–" + t[1] + " тиж.";
      var map = { cosmetic: "Косметичний ремонт", capital: "Капітальний ремонт", design: "Ремонт під ключ", newbuild: "Новобудова з нуля" };
      var fT = $("fType"), fA = $("fArea"), fM = $("fMsg");
      if (fT) fT.value = map[state.kind];
      if (fA) fA.value = state.area;
      if (fM) fM.value = txt;
      var target = $("zayavka");
      if (target) target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      var nm = $("fName");
      if (nm) setTimeout(function () { nm.focus({ preventScroll: true }); }, reduce ? 0 : 600);
    });
  }

  /* ---------- До / після ---------- */
  var ba = $("ba"), baR = $("baRange");
  if (ba && baR) {
    var setX = function () { ba.style.setProperty("--x", baR.value + "%"); };
    baR.addEventListener("input", setX);
    setX();
  }

  /* ---------- Графік роботи ---------- */
  var DAYS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  (function () {
    var tbl = $("hoursTable"), box = $("openStatus");
    var H = S.hours;
    if (!tbl || !H) return;
    var groups = [];
    [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
      var v = H[String(d)] ? H[String(d)].join("–") : null;
      if (groups.length && groups[groups.length - 1].v === v) groups[groups.length - 1].d.push(d);
      else groups.push({ d: [d], v: v });
    });
    var rows = "";
    groups.forEach(function (g) {
      var lbl = g.d.length === 1 ? DAYS[g.d[0]] : (g.d.length === 2 ? DAYS[g.d[0]] + ", " + DAYS[g.d[1]] : DAYS[g.d[0]] + "–" + DAYS[g.d[g.d.length - 1]]);
      rows += '<tr data-days="' + g.d.join(",") + '"><th>' + lbl + "</th><td>" + (g.v || "вихідний") + "</td></tr>";
    });
    tbl.innerHTML = rows;
    tbl.hidden = false;
    if (!S.liveStatus || !box) return;
    var parts;
    try { parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()); }
    catch (e) { try { parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kiev", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()); } catch (e2) { return; } }
    var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
    var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday);
    var mins = (+o.hour % 24) * 60 + (+o.minute);
    var today = H[String(day)], open = false;
    if (today) {
      var a = today[0].split(":"), b = today[1].split(":");
      open = mins >= +a[0] * 60 + +a[1] && mins < +b[0] * 60 + +b[1];
    }
    Array.prototype.forEach.call(tbl.querySelectorAll("tr"), function (r) { if (r.getAttribute("data-days").split(",").indexOf(String(day)) > -1) r.classList.add("today"); });
    box.classList.add(open ? "is-open" : "is-closed");
    box.querySelector("span").textContent = open ? "Зараз відчинено" : "Зараз зачинено";
    box.hidden = false;
  })();

  /* ---------- Кнопки зв'язку ---------- */
  var ICONS = {
    call: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    viber: '<path d="M7.9 20.5 3 21l1.4-4.6A9 9 0 1 1 7.9 20.5z"/><path d="M9.5 8.5c.4 2.6 2.4 4.7 5 5.3l.9-1.1 1.8.9-.5 1.6c-3.8.2-8-4-7.9-7.8l1.6-.5.9 1.8z"/>',
    telegram: '<path d="m22 3-20 8 7 2.5L20 6l-8.5 9.5L18 21z"/><path d="M9 13.5V20l3-3.5"/>',
    whatsapp: '<path d="M3 21l1.6-4.8A9 9 0 1 1 8 19.6z"/><path d="M9 8.6c0 3.4 3 6.4 6.4 6.4l1-1.7-2-1-1 .8a5 5 0 0 1-2.5-2.5l.8-1-1-2z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    email: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'
  };
  (function () {
    var box = $("chan");
    if (!box) return;
    var items = [];
    if (S.tel) items.push(["call", S.tel, "Подзвонити"]);
    [["viber", "Viber"], ["telegram", "Telegram"], ["whatsapp", "WhatsApp"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["email", "Написати на пошту"]].forEach(function (c) {
      if (L[c[0]]) items.push([c[0], L[c[0]], c[1]]);
    });
    // Кнопки, що лише дублюють рядки списку вище (одна-дві), не показуємо: блок має сенс від трьох
    if (items.length < 3) { box.parentNode.removeChild(box); return; }
    var html = "";
    items.forEach(function (it, i) {
      var ext = /^https?:/.test(it[1]);
      html += '<a class="' + (it[0] === "call" ? "main" : "") + '" href="' + it[1] + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + '><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[it[0]] + "</svg>" + it[2] + "</a>";
    });
    box.innerHTML = html;
    if (items.length % 2) box.classList.add("odd");
  })();

  /* ---------- Форма ---------- */
  var CH = {
    telegram: { label: "Telegram", link: L.telegram, fine: "відкриється Telegram із готовим текстом заявки" },
    viber: { label: "Viber", link: L.viber, fine: "відкриється Viber із готовим текстом заявки" },
    whatsapp: { label: "WhatsApp", link: L.whatsapp, fine: "відкриється WhatsApp із готовим текстом заявки" },
    sms: { label: "SMS", link: S.sms, fine: "відкриється SMS із готовим текстом заявки" },
    instagram: { label: "Instagram", link: S.igDirect, fine: "відкриється Instagram Direct, а текст заявки скопіюється — просто вставте його" },
    email: { label: "Email", link: L.email, fine: "відкриється пошта з готовим листом" }
  };
  var chans = (S.form || []).filter(function (c) { return CH[c] && CH[c].link; });
  var form = $("leadForm"), via = $("via"), fine = $("formFine");
  if (form && !chans.length) {
    form.hidden = true;
    var call = $("formCall");
    if (call && S.tel) { call.querySelector("a").setAttribute("href", S.tel); call.hidden = false; }
    form = null;
  }
  if (form) {
    if (chans.length === 1) {
      via.parentNode.removeChild(via);
      fine.textContent = "Після натискання " + CH[chans[0]].fine + ".";
    } else {
      chans.forEach(function (c, i) {
        var l = document.createElement("label");
        l.innerHTML = '<input type="radio" name="via" value="' + c + '"' + (i === 0 ? " checked" : "") + "><span>" + CH[c].label + "</span>";
        via.appendChild(l);
      });
    }
    var ok = $("formOk"), fe = form.elements;
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
      if (name.length < 2) { setErr(fe.name, "Вкажіть, як до вас звертатися"); good = false; first = fe.name; } else setErr(fe.name, "");
      var digits = phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 13) { setErr(fe.phone, "Перевірте номер: потрібно 10–12 цифр"); good = false; first = first || fe.phone; } else setErr(fe.phone, "");
      if (!good) { first.focus(); return; }
      var text = "Заявка на замір\nІм'я: " + name + "\nТелефон: " + phone + "\nЩо потрібно: " + fe.type.value +
        (fe.area.value.trim() ? "\nПлоща: " + fe.area.value.trim() + " м²" : "") +
        (fe.msg.value.trim() ? "\nКоментар: " + fe.msg.value.trim() : "");
      var v = (form.querySelector('input[name="via"]:checked') || {}).value || chans[0];
      try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (err) {}
      var enc = encodeURIComponent(text), link = CH[v].link;
      if (v === "viber") window.location.href = link + "&draft=" + enc;
      else if (v === "email") window.location.href = link + "?subject=" + encodeURIComponent("Заявка на замір") + "&body=" + enc;
      else if (v === "sms") window.location.href = link + "?&body=" + enc;
      else if (v === "instagram") window.open(link, "_blank", "noopener");
      else if (v === "whatsapp") window.open(link + "?text=" + enc, "_blank", "noopener");
      else window.open(link + "?text=" + enc, "_blank", "noopener");
      form.hidden = true; ok.hidden = false; ok.focus();
    });
    $("formAgain").addEventListener("click", function () { form.reset(); ok.hidden = true; form.hidden = false; fe.name.focus(); });
  }

  var y = $("yearNow");
  if (y) y.textContent = new Date().getFullYear();
})();
