/* Спорттовари / велосипеди / прокат — універсальний шаблон.
   Усе, що треба змінити під клієнта, зібрано в блоці НАЛАШТУВАННЯ нижче. */
(function () {
  "use strict";

  /* ================= НАЛАШТУВАННЯ ================= */
  // Графік: день тижня (0 — неділя, 1 — понеділок…) → [відкриття, закриття] у годинах (10.5 = 10:30), null — вихідний.
  // Закриття 0 або 24 = опівночі. Якщо графік невідомий — var HOURS = null; (живий статус сховається).
  var HOURS = { 1: [10, 18], 2: [10, 18], 3: [10, 18], 4: [10, 18], 5: [10, 18], 6: [10, 16], 0: null };

  // Тарифи прокату, грн. null — ціна ще не відома (калькулятор покаже [ЦІНА]).
  var RENT = {
    city: { hour: null, day: null },
    mtb:  { hour: null, day: null },
    kids: { hour: null, day: null }
  };

  var CONTACT = {
    tel: "+380506720222",
    telegram: "",
    viber: "",
    whatsapp: "",
    email: "",
    sms: "+380506720222",
    instagram: ""
  };
  /* ================================================ */

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var focus = document.body.getAttribute("data-focus") || "velo";
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- Меню ---------- */
  var burger = $(".burger"), nav = $("#nav");
  function closeNav() { nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Відкрити меню"); document.body.style.overflow = ""; }
  burger.addEventListener("click", function () {
    var open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
    document.body.style.overflow = open ? "hidden" : "";
  });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeNav(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-open")) { closeNav(); burger.focus(); } });
  window.addEventListener("resize", function () { if (window.innerWidth >= 1000 && nav.classList.contains("is-open")) closeNav(); });

  /* ---------- Шапка й нижня панель ---------- */
  var top = $(".top"), dock = $(".dock"), hero = $(".hero");
  function onScroll() {
    var y = window.scrollY;
    top.classList.toggle("is-scrolled", y > 8);
    if (dock) dock.classList.toggle("is-on", y > hero.offsetHeight * 0.5);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Поява блоків ---------- */
  var items = $$(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Графік і статус за київським часом ---------- */
  var DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
  var DAYS_ACC = ["у неділю", "у понеділок", "у вівторок", "у середу", "у четвер", "у п'ятницю", "у суботу"];
  function fmt(h) { h = h % 24; var m = Math.round((h % 1) * 60); return String(Math.floor(h)).padStart(2, "0") + ":" + String(m).padStart(2, "0"); }
  function span(d) { var v = HOURS[d]; if (!v) return null; var c = v[1] <= v[0] ? v[1] + 24 : v[1]; return [v[0], c]; }
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday), h: parseInt(o.hour, 10) + parseInt(o.minute, 10) / 60 };
    } catch (e) { var d = new Date(); return { day: d.getDay(), h: d.getHours() + d.getMinutes() / 60 }; }
  }
  function status() {
    var n = kyivNow(), t = span(n.day), y = span((n.day + 6) % 7);
    if (y && y[1] > 24 && n.h < y[1] - 24) return { open: true, text: "Зараз відчинено · до " + fmt(y[1]) };
    if (t && n.h >= t[0] && n.h < t[1]) return { open: true, text: "Зараз відчинено · до " + fmt(t[1]) };
    if (t && n.h < t[0]) return { open: false, text: "Зачинено · відчинимо о " + fmt(t[0]) };
    for (var i = 1; i <= 7; i++) {
      var d = (n.day + i) % 7, s = span(d);
      if (s) return { open: false, text: "Зачинено · відчинимо " + (i === 1 ? "завтра" : DAYS_ACC[d]) + " о " + fmt(s[0]) };
    }
    return { open: false, text: "Зачинено" };
  }
  var hoursBox = $("[data-hours]");
  if (!HOURS) {
    if (hoursBox) hoursBox.classList.add("no-live");
    $$("[data-status]").forEach(function (el) { if (el.closest(".hero")) el.hidden = true; });
  } else {
    var tb = $("[data-hours-table] tbody"), today = kyivNow().day;
    if (tb) {
      [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
        var tr = document.createElement("tr"), a = document.createElement("td"), b = document.createElement("td");
        var s = span(d);
        a.textContent = DAYS[d];
        b.textContent = s ? (s[0] === 0 && s[1] === 24 ? "цілодобово" : fmt(s[0]) + "–" + fmt(s[1])) : "вихідний";
        if (d === today) tr.className = "is-today";
        tr.appendChild(a); tr.appendChild(b); tb.appendChild(tr);
      });
    }
    var paint = function () {
      var st = status();
      $$("[data-status]").forEach(function (el) {
        el.setAttribute("data-state", st.open ? "open" : "closed");
        var t = $("[data-status-text]", el); if (t) t.textContent = st.text;
      });
    };
    paint(); setInterval(paint, 60000);
  }

  /* ---------- Вкладки (каталог і режими велокомп'ютера) ---------- */
  function tabs(list, attr, onChange) {
    var btns = $$('[role="tab"]', list);
    function select(btn, moveFocus) {
      btns.forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        document.getElementById(b.getAttribute("aria-controls")).hidden = !on;
      });
      if (moveFocus) btn.focus();
      if (onChange) onChange(btn.getAttribute(attr));
    }
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () { select(b); });
      b.addEventListener("keydown", function (e) {
        var k = e.key, j = k === "ArrowRight" ? i + 1 : k === "ArrowLeft" ? i - 1 : k === "Home" ? 0 : k === "End" ? btns.length - 1 : null;
        if (j === null) return;
        e.preventDefault(); select(btns[(j + btns.length) % btns.length], true);
      });
    });
    return function (val) { var b = btns.filter(function (x) { return x.getAttribute(attr) === val; })[0]; if (b) select(b); };
  }
  var catTabs = tabs($(".tabs__list"), "data-tab");
  var modeTabs = tabs($(".device__modes"), "data-mode");
  // акцент сторінки: прокат / спорттовари / велосипеди
  if (focus === "rent") { catTabs("rent"); modeTabs("rent"); }
  else if (focus === "sport") { catTabs("sport"); }

  /* ---------- Розмір рами ---------- */
  var SIZES = {
    mtb: { min: 140, max: 205, unit: "″", rows: [[155, "XS", "13–14″", "27,5″"], [165, "S", "15–16″", "27,5″ / 29″"], [175, "M", "17–18″", "29″"], [185, "L", "19–20″", "29″"], [195, "XL", "21–22″", "29″"], [999, "XXL", "23″+", "29″"]] },
    city: { min: 140, max: 205, rows: [[155, "XS", "44–46 см", "28″"], [165, "S", "47–50 см", "28″"], [175, "M", "51–54 см", "28″"], [185, "L", "55–58 см", "28″"], [195, "XL", "59–61 см", "28″"], [999, "XXL", "62 см+", "28″"]] },
    road: { min: 150, max: 205, rows: [[160, "XS", "47–49 см", "700C"], [170, "S", "50–52 см", "700C"], [178, "M", "53–55 см", "700C"], [186, "L", "56–58 см", "700C"], [194, "XL", "58–60 см", "700C"], [999, "XXL", "61 см+", "700C"]] },
    kids: { min: 85, max: 160, rows: [[100, "12″", "2–4 роки", "12″"], [115, "16″", "4–6 років", "16″"], [130, "20″", "6–9 років", "20″"], [145, "24″", "8–12 років", "24″"], [999, "26″", "XS дорослий", "26″ / 27,5″"]] }
  };
  var NOTES = {
    mtb: "Між двома розмірами? Для агресивного катання беріть менший, для довгих маршрутів — більший.",
    city: "Для міста важлива пряма посадка: на примірці підберемо ще й висоту керма.",
    road: "На шосе посадка вирішує все — фінальний розмір визначимо на примірці.",
    kids: "Дитина має доставати до землі носками, сидячи в сідлі. Купувати «на два розміри більше» не варто."
  };
  var TYPE_NAMES = { mtb: "гірський", city: "міський / гібрид", road: "шосе / гравій", kids: "дитячий" };
  var range = $("#height"), hOut = $("#height-out");
  var outSize = $('[data-out="size"]'), outFrame = $('[data-out="frame"]'), outWheel = $('[data-out="wheel"]'), outNote = $('[data-out="note"]');
  var frameKeyEl = outFrame.previousElementSibling;
  var lastSize = "";
  function btype() { return ($('input[name="btype"]:checked') || {}).value || "mtb"; }
  function calcSize() {
    var t = btype(), d = SIZES[t], h = +range.value, row = d.rows[d.rows.length - 1];
    for (var i = 0; i < d.rows.length; i++) { if (h < d.rows[i][0]) { row = d.rows[i]; break; } }
    hOut.textContent = h + " см";
    if (row[1] !== lastSize && !reduce) { outSize.classList.add("is-tick"); void outSize.offsetWidth; outSize.classList.remove("is-tick"); }
    lastSize = row[1];
    outSize.textContent = row[1];
    frameKeyEl.textContent = t === "kids" ? "Вік" : "Рама";
    outFrame.textContent = row[2];
    outWheel.textContent = row[3];
    outNote.textContent = NOTES[t];
    return { type: t, h: h, size: row[1], frame: row[2], wheel: row[3] };
  }
  $$('input[name="btype"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var d = SIZES[btype()];
      range.min = d.min; range.max = d.max;
      if (+range.value < d.min || +range.value > d.max) range.value = btype() === "kids" ? 118 : 176;
      if (btype() !== "kids" && +range.value < 140) range.value = 176;
      $("[data-min]").textContent = d.min; $("[data-max]").textContent = d.max;
      calcSize();
    });
  });
  range.addEventListener("input", calcSize);
  calcSize();

  /* ---------- Калькулятор прокату ---------- */
  var qty = 2, bikes = 1;
  var LIM = { hour: [1, 12], day: [1, 14] };
  var outSum = $('[data-out="sum"]'), outCalc = $('[data-out="calc"]'), outRNote = $('[data-out="rnote"]'), qtyEl = $("[data-qty]"), bikesEl = $("[data-bikes]");
  function rtype() { return ($('input[name="rtype"]:checked') || {}).value || "city"; }
  function runit() { return ($('input[name="runit"]:checked') || {}).value || "hour"; }
  function unitLabel(u, n) { if (u === "hour") return n + " год"; var m10 = n % 10, m100 = n % 100; return n + (m10 === 1 && m100 !== 11 ? " доба" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? " доби" : " діб"); }
  function money(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " грн"; }
  function calcRent() {
    var t = rtype(), u = runit(), p = RENT[t][u], lim = LIM[u];
    qty = Math.min(lim[1], Math.max(lim[0], qty));
    qtyEl.textContent = unitLabel(u, qty);
    bikesEl.textContent = bikes;
    outCalc.textContent = unitLabel(u, qty) + " × " + bikes + " вел.";
    if (typeof p === "number") {
      outSum.textContent = money(p * qty * bikes);
      var day = RENT[t].day;
      outRNote.textContent = u === "hour" && typeof day === "number" && p * qty > day ? "Подобово вийде дешевше: " + money(day * bikes) + " за добу." : "Остаточну суму підтвердимо під час бронювання.";
    } else {
      outSum.innerHTML = '<span class="ph">[ЦІНА]</span> грн';
      outRNote.textContent = "Тарифи вкажемо в прайсі — калькулятор порахує суму автоматично.";
    }
    return { type: t, unit: u, qty: qty, bikes: bikes };
  }
  $$("[data-step]").forEach(function (b) { b.addEventListener("click", function () { qty += +b.getAttribute("data-step"); calcRent(); }); });
  $$("[data-bstep]").forEach(function (b) { b.addEventListener("click", function () { bikes = Math.min(10, Math.max(1, bikes + +b.getAttribute("data-bstep"))); calcRent(); }); });
  $$('input[name="runit"]').forEach(function (r) { r.addEventListener("change", function () { qty = runit() === "hour" ? 2 : 1; calcRent(); }); });
  $$('input[name="rtype"]').forEach(function (r) { r.addEventListener("change", calcRent); });
  calcRent();

  /* ---------- Форма ---------- */
  var form = $("#form"), ok = $("[data-ok]", form);
  var RTYPE_NAMES = { city: "міський", mtb: "гірський", kids: "дитячий" };
  function prefill(kind) {
    if (!form) return;
    if (kind === "size") {
      var s = calcSize();
      form.elements.topic.value = "Купівля велосипеда";
      form.elements.msg.value = "Примірка: " + TYPE_NAMES[s.type] + " велосипед, зріст " + s.h + " см, орієнтовно " + s.size + " (" + s.frame + ").";
    } else {
      var r = calcRent();
      form.elements.topic.value = "Прокат";
      form.elements.msg.value = "Прокат: " + RTYPE_NAMES[r.type] + " × " + r.bikes + ", " + unitLabel(r.unit, r.qty) + ". Дата й час: ";
    }
  }
  $$("[data-prefill]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (!form) return;
      e.preventDefault();
      prefill(a.getAttribute("data-prefill"));
      form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      setTimeout(function () { form.elements.name.focus({ preventScroll: true }); }, reduce ? 0 : 600);
    });
  });

  if (form) {
    var setErr = function (input, msg) {
      var f = input.closest(".field"); f.classList.toggle("is-bad", !!msg);
      $(".field__err", f).textContent = msg || "";
      input.setAttribute("aria-invalid", msg ? "true" : "false");
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements.name, phone = form.elements.phone, bad = null;
      var nv = name.value.trim(), pv = phone.value.trim(), digits = pv.replace(/\D/g, "");
      if (nv.length < 2) { setErr(name, "Вкажіть ім'я, щоб ми знали, як до вас звертатися."); bad = bad || name; } else setErr(name);
      if (digits.length < 10 || digits.length > 13) { setErr(phone, "Перевірте номер: потрібно 10–12 цифр, наприклад +380 67 123 45 67."); bad = bad || phone; } else setErr(phone);
      if (bad) { bad.focus(); return; }
      var biz = ($(".logo__name") || {}).textContent || "";
      var msg = "Заявка з сайту " + biz.trim() + "\nІм'я: " + nv + "\nТелефон: " + pv + "\nТема: " + form.elements.topic.value + (form.elements.msg.value.trim() ? "\nДеталі: " + form.elements.msg.value.trim() : "");
      var viaEl = form.querySelector('input[name="via"]:checked') || form.querySelector('input[name="via"]');
      var via = viaEl ? viaEl.value : "call";
      var url = via === "sms" ? "sms:" + CONTACT.sms + "?&body=" + encodeURIComponent(msg)
        : via === "ig" ? "https://ig.me/m/" + CONTACT.instagram
        : via === "viber" ? "viber://chat?number=" + CONTACT.viber + "&draft=" + encodeURIComponent(msg)
        : via === "wa" ? "https://wa.me/" + CONTACT.whatsapp + "?text=" + encodeURIComponent(msg)
        : via === "mail" ? "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent("Заявка з сайту") + "&body=" + encodeURIComponent(msg)
        : via === "call" ? "tel:" + CONTACT.tel
        : "https://t.me/" + CONTACT.telegram + "?text=" + encodeURIComponent(msg);
      try { if (navigator.clipboard) navigator.clipboard.writeText(msg).catch(function () {}); } catch (err) {}
      ok.hidden = false; ok.focus();
      if (via === "tg" || via === "ig" || via === "wa") { window.open(url, "_blank", "noopener"); } else { window.location.href = url; }
    });
    $("[data-again]", form).addEventListener("click", function () { ok.hidden = true; form.reset(); form.elements.name.focus(); });
  }

  /* ---------- Рік ---------- */
  var yEl = $("[data-year]"); if (yEl) yEl.textContent = new Date().getFullYear();
})();
