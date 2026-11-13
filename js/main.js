/* Бутик одягу — шаблон. Без бібліотек. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- завантаження обкладинки ---------- */
  function loaded() { requestAnimationFrame(function () { doc.classList.add("is-loaded"); }); }
  if (document.readyState === "complete") loaded(); else window.addEventListener("load", loaded);
  setTimeout(loaded, 1800); // страховка, якщо фото довго вантажиться

  /* ---------- рік у футері ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- мобільне меню ---------- */
  var burger = document.querySelector(".mast__burger");
  var menu = document.getElementById("menu");
  function setMenu(open) {
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
    menu.hidden = !open;
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (burger && menu) {
    burger.addEventListener("click", function () { setMenu(menu.hidden); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setMenu(false); burger.focus(); } });
    window.addEventListener("resize", function () { if (window.innerWidth >= 1024 && !menu.hidden) setMenu(false); });
  }

  /* ---------- поява блоків ---------- */
  var rev = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    rev.forEach(function (el) { io.observe(el); });
  } else {
    rev.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- лукбук: вертикальний скрол → горизонтальний рух ---------- */
  var look = document.querySelector(".look");
  if (look) {
    var track = look.querySelector(".look__track");
    var vp = look.querySelector(".look__viewport");
    var bar = look.querySelector(".look__bar");
    var cur = look.querySelector(".look__cur");
    var cards = track.querySelectorAll(".lk:not(.lk--end)");
    var dist = 0, ticking = false;

    if (reduce) {
      look.classList.add("look--static");
    } else {
      var measure = function () {
        track.style.transform = "";
        dist = Math.max(0, track.scrollWidth - vp.clientWidth);
        look.style.height = (dist + window.innerHeight) + "px";
        update();
      };
      var update = function () {
        ticking = false;
        var top = look.getBoundingClientRect().top;
        var p = dist ? Math.min(1, Math.max(0, -top / dist)) : 0;
        track.style.transform = "translate3d(" + (-p * dist).toFixed(1) + "px,0,0)";
        if (bar) bar.style.setProperty("--p", p.toFixed(4));
        if (cur) {
          var n = Math.min(cards.length, Math.floor(p * cards.length) + 1);
          cur.textContent = (n < 10 ? "0" : "") + n;
        }
      };
      window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
      var rt;
      window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(measure, 150); });
      window.addEventListener("load", measure);
      track.querySelectorAll("img").forEach(function (im) { if (!im.complete) im.addEventListener("load", measure, { once: true }); });
      measure();
    }
  }

  /* ---------- години роботи / «зараз відчинено» за київським часом ---------- */
  var tbl = document.querySelector("[data-hours]");
  var status = document.querySelector("[data-status]");
  function kyivNow() {
    var opts = { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false };
    var fmt;
    try { fmt = new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: "Europe/Kyiv" }, opts)); }
    catch (e) { try { fmt = new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: "Europe/Kiev" }, opts)); } catch (e2) { return null; } }
    var parts = {};
    fmt.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    var h = parseInt(parts.hour, 10) % 24;
    return { day: days[parts.weekday], min: h * 60 + parseInt(parts.minute, 10) };
  }
  function toMin(s) { var a = s.split(":"); return parseInt(a[0], 10) * 60 + parseInt(a[1], 10); }
  function rowFor(day) {
    var rows = tbl.querySelectorAll("tr[data-days]");
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute("data-days").split(",").indexOf(String(day)) > -1) return rows[i];
    }
    return null;
  }
  var dayNames = ["у неділю", "у понеділок", "у вівторок", "у середу", "у четвер", "у п’ятницю", "у суботу"];
  function updateStatus() {
    if (!tbl || !status) return;
    var now = kyivNow(); if (!now) return;
    var row = rowFor(now.day), t = status.querySelector(".status__t");
    tbl.querySelectorAll("tr").forEach(function (r) { r.classList.remove("is-today"); });
    if (row) row.classList.add("is-today");
    var open = row && row.getAttribute("data-open") && now.min >= toMin(row.getAttribute("data-open")) && now.min < toMin(row.getAttribute("data-close"));
    status.classList.toggle("is-open", !!open);
    status.classList.toggle("is-closed", !open);
    if (open) { t.textContent = "Зараз відчинено · до " + row.getAttribute("data-close"); return; }
    // коли відкриємось
    if (row && row.getAttribute("data-open") && now.min < toMin(row.getAttribute("data-open"))) {
      t.textContent = "Зараз зачинено · відкриємось сьогодні о " + row.getAttribute("data-open"); return;
    }
    for (var k = 1; k <= 7; k++) {
      var d = (now.day + k) % 7, r = rowFor(d);
      if (r && r.getAttribute("data-open")) {
        t.textContent = "Зараз зачинено · відкриємось " + (k === 1 ? "завтра" : dayNames[d]) + " о " + r.getAttribute("data-open");
        return;
      }
    }
    t.textContent = "Зараз зачинено";
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- форма запису → Telegram / Viber / Email ---------- */
  var form = document.querySelector(".form");
  var ok = document.querySelector(".form__ok");
  var TG = "https://t.me/username";
  var VIBER = "viber://chat?number=%2B380000000000";
  var MAIL = "mailto:hello@example.com";
  var dateEl = document.getElementById("f-date");
  if (dateEl) {
    var t0 = new Date(); t0.setMinutes(t0.getMinutes() - t0.getTimezoneOffset());
    dateEl.min = t0.toISOString().slice(0, 10);
  }
  function setErr(input, msg) {
    var f = input.closest(".field"), e = f.querySelector(".field__err");
    f.classList.toggle("has-err", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (e) e.textContent = msg || "";
  }
  function validate() {
    var good = true, first = null;
    var name = form.elements.name, phone = form.elements.phone;
    if (name.value.trim().length < 2) { setErr(name, "Напишіть, як до вас звертатися."); good = false; first = first || name; } else setErr(name, "");
    var digits = phone.value.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 12) { setErr(phone, "Перевірте номер: потрібно 10–12 цифр, наприклад +380 67 123 45 67."); good = false; first = first || phone; } else setErr(phone, "");
    if (dateEl && dateEl.value && dateEl.min && dateEl.value < dateEl.min) { setErr(dateEl, "Оберіть сьогоднішню або пізнішу дату."); good = false; first = first || dateEl; } else if (dateEl) setErr(dateEl, "");
    if (first) first.focus();
    return good;
  }
  if (form) {
    ["name", "phone"].forEach(function (n) {
      form.elements[n].addEventListener("input", function () { if (this.closest(".field").classList.contains("has-err")) validate(); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;
      var el = form.elements;
      var date = el.date.value ? el.date.value.split("-").reverse().join(".") : "будь-який день";
      var lines = [
        "Заявка з сайту [НАЗВА]",
        "Ім’я: " + el.name.value.trim(),
        "Телефон: " + el.phone.value.trim(),
        "Мета: " + el.goal.value,
        "Розмір: " + el.size.value,
        "Дата візиту: " + date
      ];
      if (el.msg.value.trim()) lines.push("Коментар: " + el.msg.value.trim());
      var text = lines.join("\n");
      var via = (form.querySelector("input[name=via]:checked") || {}).value;
      var url;
      if (via === "viber") url = VIBER + "&draft=" + encodeURIComponent(text);
      else if (via === "mail") url = MAIL + "?subject=" + encodeURIComponent("Запис на примірку — " + el.name.value.trim()) + "&body=" + encodeURIComponent(text);
      else url = TG + "?text=" + encodeURIComponent(text);
      if (via === "tg") window.open(url, "_blank", "noopener"); else window.location.href = url;
      form.hidden = true; ok.hidden = false; ok.focus();
    });
    var reset = ok && ok.querySelector("[data-reset]");
    if (reset) reset.addEventListener("click", function () { form.reset(); ok.hidden = true; form.hidden = false; form.elements.name.focus(); });
  }
})();
