/* Фітнес-клуб — шаблон Ansaro. Без бібліотек. */
(function () {
  "use strict";

  // ---------- Дані клубу (замінюються під клієнта) ----------
  var CONFIG = {
    name: "Центр розвитку Energy",
    phone: "+380954926664",                          // для SMS
    viber: "",
    telegram: "",
    whatsapp: "",
    instagram: "",
    email: ""
  };

  // Години роботи за київським часом: день тижня (0 = неділя) → [відкриття, закриття] у годинах; null = вихідний.
  // HOURS = null → живий статус ховається, лишається текстовий рядок годин у HTML.
  var HOURS = null;

  // Розклад групових: d — день (1 = Пн … 0 = Нд), type: power | cardio | flex
  var CLASSES = [
    { d: 1, t: "08:00", n: "Функціональний тренінг", type: "power", m: "55 хв · усі рівні" },
    { d: 1, t: "10:00", n: "Здорова спина", type: "flex", m: "50 хв · новачкам" },
    { d: 1, t: "18:30", n: "HIIT-інтервали", type: "cardio", m: "45 хв · середній" },
    { d: 1, t: "19:30", n: "Пілатес", type: "flex", m: "55 хв · усі рівні" },
    { d: 2, t: "09:00", n: "Йога", type: "flex", m: "60 хв · усі рівні" },
    { d: 2, t: "18:00", n: "Жіночі силові", type: "power", m: "55 хв · усі рівні" },
    { d: 2, t: "19:30", n: "Стретчинг", type: "flex", m: "50 хв · усі рівні" },
    { d: 3, t: "08:00", n: "Функціональний тренінг", type: "power", m: "55 хв · усі рівні" },
    { d: 3, t: "10:00", n: "Здорова спина", type: "flex", m: "50 хв · новачкам" },
    { d: 3, t: "18:30", n: "Кардіо-мікс", type: "cardio", m: "45 хв · усі рівні" },
    { d: 3, t: "19:30", n: "Пілатес", type: "flex", m: "55 хв · усі рівні" },
    { d: 4, t: "09:00", n: "Йога", type: "flex", m: "60 хв · усі рівні" },
    { d: 4, t: "18:00", n: "Жіночі силові", type: "power", m: "55 хв · усі рівні" },
    { d: 4, t: "19:30", n: "Стретчинг", type: "flex", m: "50 хв · усі рівні" },
    { d: 5, t: "08:00", n: "Функціональний тренінг", type: "power", m: "55 хв · усі рівні" },
    { d: 5, t: "18:30", n: "HIIT-інтервали", type: "cardio", m: "45 хв · середній" },
    { d: 5, t: "19:30", n: "Йога", type: "flex", m: "60 хв · усі рівні" },
    { d: 6, t: "10:00", n: "Кругове тренування", type: "power", m: "55 хв · усі рівні" },
    { d: 6, t: "11:30", n: "Стретчинг", type: "flex", m: "50 хв · усі рівні" }
  ];

  var DAY_SHORT = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  var DAY_FULL = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
  var ORDER = [1, 2, 3, 4, 5, 6, 0];

  document.documentElement.classList.remove("no-js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // ---------- Київський час ----------
  function kyivNow() {
    var zones = ["Europe/Kyiv", "Europe/Kiev"];
    for (var i = 0; i < zones.length; i++) {
      try {
        var parts = new Intl.DateTimeFormat("en-GB", { timeZone: zones[i], weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
        var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
        var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday);
        if (wd > -1) return { day: wd, h: (parseInt(o.hour, 10) % 24) + parseInt(o.minute, 10) / 60 };
      } catch (e) { /* наступна зона */ }
    }
    var d = new Date(); return { day: d.getDay(), h: d.getHours() + d.getMinutes() / 60 };
  }
  var NOW = kyivNow();

  function fmtH(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (hh === 24 && !mm) return "24:00"; return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm; }
  function toH(t) { var p = t.split(":"); return +p[0] + (+p[1]) / 60; }

  // ---------- Меню ----------
  var burger = $("#burger"), nav = $("#nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
    });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); }); });
  }
  var top = $(".top");
  function onScroll() { if (top) top.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // ---------- Години + статус ----------
  (function hours() {
    var statuses = $$("[data-status]");
    var table = $("[data-hours-table]");
    if (!HOURS) { statuses.forEach(function (s) { s.hidden = true; }); return; }
    // таблиця
    if (table) {
      var tb = table.tBodies[0];
      ORDER.forEach(function (d) {
        var tr = el("tr"), th = el("th", null, DAY_FULL[d]), td = el("td");
        th.scope = "row";
        var h = HOURS[d];
        if (h && h[0] === 0 && h[1] === 24) td.textContent = "цілодобово";
        else td.textContent = h ? fmtH(h[0]) + "–" + fmtH(h[1]) : "вихідний";
        if (!h) tr.className = "is-off";
        if (d === NOW.day) tr.className += " is-today";
        tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr);
      });
      table.hidden = false;
    }
    // статус
    var today = HOURS[NOW.day], open = !!(today && NOW.h >= today[0] && NOW.h < today[1]), text;
    if (open) text = (today[0] === 0 && today[1] === 24) ? "Зараз відчинено · цілодобово" : "Зараз відчинено · до " + fmtH(today[1]);
    else {
      text = "Зараз зачинено";
      for (var i = 0; i < 8; i++) {
        var d = (NOW.day + i) % 7, h = HOURS[d];
        if (!h) continue;
        if (i === 0 && NOW.h >= h[0]) continue;
        text += " · відкриємось " + (i === 0 ? "о " : i === 1 ? "завтра о " : "у " + DAY_SHORT[d].toLowerCase() + " о ") + fmtH(h[0]);
        break;
      }
    }
    statuses.forEach(function (s) {
      s.classList.add(open ? "is-open" : "is-closed");
      $("[data-status-text]", s).textContent = text;
      s.hidden = false;
    });
  })();

  // ---------- Розклад ----------
  var activeFilter = "all";
  (function timetable() {
    var tt = $("[data-timetable]"), tabs = $("[data-daytabs]");
    if (!tt) return;
    ORDER.forEach(function (d) {
      var col = el("div", "tt__col"); col.dataset.day = d;
      col.id = "tt-day-" + d;
      col.setAttribute("role", "tabpanel");
      if (d === NOW.day) col.classList.add("is-today", "is-active");
      col.appendChild(el("h3", "tt__day", DAY_FULL[d]));
      var list = CLASSES.filter(function (c) { return c.d === d; }).sort(function (a, b) { return toH(a.t) - toH(b.t); });
      list.forEach(function (c) {
        var card = el("article", "cls cls--" + c.type); card.dataset.type = c.type;
        var tm = el("time", null, c.t); tm.dateTime = c.t;
        card.appendChild(tm); card.appendChild(el("b", null, c.n)); card.appendChild(el("small", null, c.m));
        col.appendChild(card);
      });
      col.appendChild(el("p", "tt__empty", "У цей день групових занять немає — зал працює за звичайним графіком."));
      tt.appendChild(col);

      var b = el("button", null, DAY_SHORT[d]); b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", col.id); b.setAttribute("aria-selected", d === NOW.day ? "true" : "false");
      b.setAttribute("aria-label", DAY_FULL[d]);
      if (d === NOW.day) b.classList.add("is-today");
      b.addEventListener("click", function () {
        $$("button", tabs).forEach(function (x) { x.setAttribute("aria-selected", "false"); });
        b.setAttribute("aria-selected", "true");
        $$(".tt__col", tt).forEach(function (x) { x.classList.toggle("is-active", x === col); });
      });
      tabs.appendChild(b);
    });
    function applyFilter() {
      $$(".tt__col", tt).forEach(function (col) {
        var shown = 0;
        $$(".cls", col).forEach(function (c) { var ok = activeFilter === "all" || c.dataset.type === activeFilter; c.classList.toggle("is-hidden", !ok); if (ok) shown++; });
        $(".tt__empty", col).hidden = shown > 0;
      });
    }
    $$("[data-filter]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        activeFilter = chip.dataset.filter;
        $$("[data-filter]").forEach(function (x) { var on = x === chip; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
        applyFilter();
      });
    });
    applyFilter();
  })();

  // ---------- «Сьогодні в розкладі» у героі ----------
  (function today() {
    var list = $("[data-today]"), label = $("[data-today-label]");
    if (!list) return;
    for (var i = 0; i < 7; i++) {
      var d = (NOW.day + i) % 7;
      var items = CLASSES.filter(function (c) { return c.d === d && (i > 0 || toH(c.t) > NOW.h); })
        .sort(function (a, b) { return toH(a.t) - toH(b.t); }).slice(0, 3);
      if (!items.length) continue;
      label.textContent = i === 0 ? "Сьогодні в розкладі" : i === 1 ? "Завтра в розкладі" : DAY_FULL[d] + " у розкладі";
      items.forEach(function (c) { var li = el("li"); li.appendChild(el("b", null, c.t)); li.appendChild(document.createTextNode(c.n)); list.appendChild(li); });
      return;
    }
    list.parentNode.hidden = true;
  })();

  // ---------- Конструктор абонемента ----------
  var bldSummary = "";
  (function builder() {
    var form = $("#bld"); if (!form) return;
    var svgNS = "http://www.w3.org/2000/svg";
    var L = $("[data-side='l']"), R = $("[data-side='r']");
    var KIND = { term: { w: 12, h: 104, c: "#ff5a14" }, time: { w: 10, h: 84, c: "#121212" }, group: { w: 10, h: 70, c: "#3b3b39" }, coach: { w: 8, h: 56, c: "#8f8d86" } };
    var shown = {}; // ключ плити → true, щоб анімувати тільки нові
    var timeSet = $("[data-for-period]");

    function val(name) { return form.querySelector("input[name='" + name + "']:checked"); }

    function draw(stack) {
      [L, R].forEach(function (side, si) {
        while (side.firstChild) side.removeChild(side.firstChild);
        var x = si === 0 ? 146 : 254;
        stack.forEach(function (p) {
          var k = KIND[p.kind], r = document.createElementNS(svgNS, "rect");
          var px = si === 0 ? x - k.w : x;
          r.setAttribute("x", px); r.setAttribute("y", 60 - k.h / 2);
          r.setAttribute("width", k.w); r.setAttribute("height", k.h); r.setAttribute("rx", 2);
          r.setAttribute("fill", k.c); r.setAttribute("class", "plate");
          if (!shown[p.key + si] && !reduce) { r.classList.add("is-new"); }
          side.appendChild(r);
          x = si === 0 ? x - k.w - 2 : x + k.w + 2;
        });
      });
      // запускаємо анімацію появи нових плит
      requestAnimationFrame(function () { requestAnimationFrame(function () { $$(".plate.is-new").forEach(function (p) { p.classList.remove("is-new"); }); }); });
      shown = {};
      stack.forEach(function (p) { shown[p.key + 0] = shown[p.key + 1] = true; });
    }

    function update() {
      var term = val("term"), time = val("time"), group = val("group"), coach = val("coach");
      var once = term.value === "once";
      timeSet.classList.toggle("is-off", once);
      $$("input", timeSet).forEach(function (i) { i.disabled = once; });
      var stack = [];
      function add(kind, n) { for (var i = 0; i < n; i++) stack.push({ kind: kind, key: kind + i }); }
      add("term", +term.dataset.plate);
      if (!once) add("time", +time.dataset.plate);
      add("group", +group.dataset.plate);
      add("coach", +coach.dataset.plate);
      draw(stack);
      $("[data-out='days']").textContent = term.dataset.days;
      $("[data-out='sessions']").textContent = coach.dataset.sessions;
      $("[data-out='plates']").textContent = stack.length * 2;
      var parts = [term.dataset.label];
      if (!once) parts.push(time.dataset.label);
      if (group.dataset.label) parts.push(group.dataset.label);
      if (coach.dataset.label) parts.push(coach.dataset.label);
      bldSummary = parts.join(", ");
      $("[data-out='summary']").textContent = bldSummary.charAt(0).toUpperCase() + bldSummary.slice(1);
    }
    form.addEventListener("change", update);
    update();

    var cta = $("[data-bld-cta]");
    if (cta) cta.addEventListener("click", function () {
      var what = $("#f-what"), msg = $("#f-msg");
      if (what) what.value = "Абонемент у зал";
      if (msg) msg.value = "Хочу абонемент: " + bldSummary + ".";
    });
  })();

  // ---------- Форма ----------
  (function booking() {
    var form = $("#book"); if (!form || form.tagName !== "FORM") return; // без форми — лише кнопка дзвінка
    var ok = $("[data-ok]", form), okText = $("[data-ok-text]", form);
    var COPY_NOTE = "Текст заявки скопійовано — вставте його в чат і надішліть.";

    function digits(v) { return (v || "").replace(/\D/g, ""); }
    function validPhone(v) { var d = digits(v); return (d.length === 12 && d.indexOf("380") === 0) || (d.length === 10 && d.charAt(0) === "0"); }
    function setBad(name, bad) { var f = form.elements[name]; if (f) f.closest(".fld").classList.toggle("is-bad", bad); return !bad; }

    ["name", "phone"].forEach(function (n) {
      form.elements[n].addEventListener("input", function () { if (form.elements[n].closest(".fld").classList.contains("is-bad")) check(); });
    });
    function check() {
      var a = setBad("name", form.elements.name.value.trim().length < 2);
      var b = setBad("phone", !validPhone(form.elements.phone.value));
      return a && b;
    }

    function copy(text) {
      try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).catch(function () {}); return true; } } catch (e) {}
      return false;
    }
    function go(url, external) {
      if (external) { var w = window.open(url, "_blank", "noopener"); if (!w) window.location.href = url; }
      else window.location.href = url;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!check()) { var bad = $(".fld.is-bad input", form); if (bad) bad.focus(); return; }
      var f = form.elements;
      var lines = [
        "Заявка з сайту " + CONFIG.name,
        "Ім'я: " + f.name.value.trim(),
        "Телефон: " + f.phone.value.trim(),
        "Цікавить: " + f.what.value,
        "Зручний час: " + f.time.value
      ];
      if (f.msg.value.trim()) lines.push("Коментар: " + f.msg.value.trim());
      var text = lines.join("\n");
      var viaEl = form.querySelector("input[name='via']:checked");
      var via = viaEl ? viaEl.value : "";
      var note = "Якщо застосунок не відкрився, зателефонуйте нам — підберемо час пробного тренування.";
      var enc = encodeURIComponent(text);
      if (via === "wa" && CONFIG.whatsapp) go(CONFIG.whatsapp + "?text=" + enc, true);
      else if (via === "sms" && CONFIG.phone) go("sms:" + CONFIG.phone + "?&body=" + enc, false);
      else if (via === "mail" && CONFIG.email) go("mailto:" + CONFIG.email + "?subject=" + encodeURIComponent("Заявка з сайту — " + f.what.value) + "&body=" + enc, false);
      else if (via === "viber" && CONFIG.viber) { if (copy(text)) note = COPY_NOTE; go(CONFIG.viber, false); }
      else if (via === "tg" && CONFIG.telegram) { if (copy(text)) note = COPY_NOTE; go(CONFIG.telegram, true); }
      else if (via === "ig" && CONFIG.instagram) { if (copy(text)) note = COPY_NOTE + " Відкриваємо Instagram — напишіть нам у Direct."; go(CONFIG.instagram, true); }
      else note = "Зателефонуйте нам, і ми підберемо час пробного тренування.";
      okText.textContent = note;
      ok.hidden = false;
      ok.focus();
    });
  })();

  // ---------- Поява при скролі ----------
  (function reveal() {
    var items = $$(".reveal");
    if (reduce || !("IntersectionObserver" in window)) { items.forEach(function (i) { i.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (i) { io.observe(i); });
  })();

  var y = $("[data-year]"); if (y) y.textContent = new Date().getFullYear();
})();
