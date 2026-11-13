(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header + mobile nav ---------- */
  var hdr = document.querySelector(".hdr");
  var burger = document.querySelector(".burger");
  var nav = document.getElementById("nav");
  function onScrollHdr() { hdr.classList.toggle("is-solid", window.scrollY > 40); }
  onScrollHdr();
  window.addEventListener("scroll", onScrollHdr, { passive: true });
  function setNav(open) {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    hdr.classList.toggle("is-solid", open || window.scrollY > 40);
  }
  burger.addEventListener("click", function () { setNav(burger.getAttribute("aria-expanded") !== "true"); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setNav(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setNav(false); });

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Menu: tabs + dish spotlight ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });
  var spotImgs = document.querySelectorAll(".spot__img");
  var spotName = document.querySelector("[data-spot-name]");
  var spotCat = document.querySelector("[data-spot-cat]");
  var menuSec = document.getElementById("menu");
  var current = null;

  function activePanel() { return panels.filter(function (p) { return !p.hidden; })[0]; }

  function light(dish) {
    if (!dish || dish === current) return;
    var list = dish.parentNode;
    list.querySelectorAll(".dish.is-lit").forEach(function (d) { d.classList.remove("is-lit"); });
    list.classList.add("has-lit");
    dish.classList.add("is-lit");
    current = dish;
    var key = dish.getAttribute("data-spot");
    spotImgs.forEach(function (img) { img.classList.toggle("is-on", img.getAttribute("data-key") === key); });
    var name = dish.querySelector(".dish__name").textContent;
    if (spotName.textContent !== name) {
      spotName.classList.add("is-swap");
      setTimeout(function () { spotName.textContent = name; spotName.classList.remove("is-swap"); }, reduce ? 0 : 180);
    }
    spotCat.textContent = activePanel().querySelector(".panel__title").textContent;
  }

  function selectTab(i, focus) {
    tabs.forEach(function (t, j) {
      var on = i === j;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
      panels[j].classList.toggle("is-in", on && !reduce);
    });
    if (focus) tabs[i].focus();
    tabs[i].scrollIntoView({ block: "nearest", inline: "nearest" });
    current = null;
    light(panels[i].querySelector(".dish"));
    // keep the list start in view after switching on small screens
    var top = menuSec.querySelector(".tabs").getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.6) {
      var y = window.scrollY + menuSec.querySelector(".menu__grid").getBoundingClientRect().top - 140;
      if (window.scrollY > y) window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(i, false); });
    t.addEventListener("keydown", function (e) {
      var n = tabs.length, k = e.key, j = null;
      if (k === "ArrowRight") j = (i + 1) % n;
      else if (k === "ArrowLeft") j = (i - 1 + n) % n;
      else if (k === "Home") j = 0;
      else if (k === "End") j = n - 1;
      if (j !== null) { e.preventDefault(); selectTab(j, true); }
    });
  });

  // spotlight follows scroll: the dish nearest to the "candle line" gets lit
  var ticking = false;
  function pickByScroll() {
    ticking = false;
    var p = activePanel(); if (!p) return;
    var r = menuSec.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    var line = window.innerHeight * (window.innerWidth < 900 ? 0.68 : 0.5);
    var best = null, bestD = Infinity;
    p.querySelectorAll(".dish").forEach(function (d) {
      var b = d.getBoundingClientRect();
      var dist = Math.abs(b.top + b.height / 2 - line);
      if (dist < bestD) { bestD = dist; best = d; }
    });
    light(best);
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(pickByScroll); }
  }, { passive: true });
  document.querySelectorAll(".dish").forEach(function (d) {
    d.addEventListener("mouseenter", function () { if (window.matchMedia("(hover:hover)").matches) light(d); });
  });
  light(panels[0].querySelector(".dish"));

  /* ---------- Opening hours (Kyiv time) ---------- */
  var hoursEl = document.getElementById("hours");
  var schedule = {};
  try { schedule = JSON.parse(hoursEl.getAttribute("data-schedule")) || {}; } catch (e) { schedule = {}; }
  var DAYS = ["Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця", "Субота", "Неділя"];
  var DAYS_SHORT = ["нд", "пн", "вт", "ср", "чт", "пт", "сб"];

  function kyivNow() {
    var parts;
    try {
      parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" }).formatToParts(new Date());
    } catch (e) {
      try { parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kiev", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" }).formatToParts(new Date()); }
      catch (e2) { var d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), dow: (d.getDay() + 6) % 7 + 1, min: d.getHours() * 60 + d.getMinutes() }; }
    }
    var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
    var wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(o.weekday) + 1;
    var h = parseInt(o.hour, 10) % 24;
    return { y: +o.year, m: +o.month, d: +o.day, dow: wd, min: h * 60 + parseInt(o.minute, 10) };
  }
  function toMin(s) { var a = s.split(":"); return parseInt(a[0], 10) * 60 + parseInt(a[1], 10); }
  function range(dow) {
    var v = schedule[String(dow)];
    if (!v || !/\d/.test(v)) return null;
    var a = v.split("-"); var o = toMin(a[0]), c = toMin(a[1]);
    if (c <= o) c += 1440; // closes after midnight
    return { o: o, c: c, open: a[0], close: a[1] };
  }

  function renderHours() {
    var now = kyivNow();
    var list = document.querySelector("[data-hours-list]");
    if (list && Object.keys(schedule).length) {
      list.innerHTML = "";
      for (var i = 1; i <= 7; i++) {
        var r = range(i);
        var li = document.createElement("li");
        if (i === now.dow) li.className = "is-today";
        var a = document.createElement("span"); a.textContent = DAYS[i - 1];
        var b = document.createElement("span"); b.className = "ph"; b.textContent = r ? r.open + "–" + r.close : "вихідний";
        li.appendChild(a); li.appendChild(b); list.appendChild(li);
      }
    }
    // status
    var today = range(now.dow);
    var prev = range(now.dow === 1 ? 7 : now.dow - 1);
    var open = false, until = "";
    if (today && now.min >= today.o && now.min < today.c) { open = true; until = today.close; }
    else if (prev && prev.c > 1440 && now.min < prev.c - 1440) { open = true; until = prev.close; }
    var text;
    if (open) text = "Зараз відчинено · до " + until;
    else {
      if (today && now.min < today.o) text = "Зараз зачинено · відкриємо о " + today.open;
      else {
        var nd = now.dow, label = "завтра";
        for (var k = 1; k <= 7; k++) {
          nd = nd % 7 + 1;
          var rr = range(nd);
          if (rr) { text = "Зараз зачинено · відкриємо " + (k === 1 ? label : DAYS[nd - 1].toLowerCase()) + " о " + rr.open; break; }
        }
      }
    }
    if (!text) return;
    document.querySelectorAll("[data-status]").forEach(function (el) {
      el.classList.toggle("is-open", open);
      el.classList.toggle("is-closed", !open);
      el.querySelector("[data-status-text]").textContent = text;
    });
  }
  renderHours();
  setInterval(renderHours, 60000);

  /* ---------- Booking form ---------- */
  var form = document.getElementById("book-form");
  var fDate = document.getElementById("f-date");
  var fTime = document.getElementById("f-time");
  var fGuests = document.getElementById("f-guests");
  var guests = 2;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var now0 = kyivNow();
  var todayStr = now0.y + "-" + pad(now0.m) + "-" + pad(now0.d);
  fDate.min = todayStr;
  fDate.value = todayStr;

  function fillTimes() {
    var v = fDate.value;
    var prevSel = fTime.value;
    fTime.innerHTML = "";
    if (!v) { fTime.add(new Option("Спершу дата", "")); return; }
    var p = v.split("-"); var jsd = new Date(+p[0], +p[1] - 1, +p[2]);
    var dow = (jsd.getDay() + 6) % 7 + 1;
    var r = range(dow) || { o: 720, c: 1380 };
    var start = r.o, end = r.c - 90; // last seating 1.5 h before closing
    if (v === todayStr) { var nm = kyivNow().min + 30; start = Math.max(start, Math.ceil(nm / 30) * 30); }
    var count = 0;
    fTime.add(new Option("Оберіть час", ""));
    for (var m = start; m <= end; m += 30) {
      var t = pad(Math.floor(m / 60) % 24) + ":" + pad(m % 60);
      fTime.add(new Option(t, t)); count++;
    }
    if (!count) { fTime.innerHTML = ""; fTime.add(new Option("На цей день вільного часу вже немає", "")); }
    if (prevSel) fTime.value = prevSel;
  }
  fillTimes();
  fDate.addEventListener("change", fillTimes);

  form.querySelectorAll("[data-step]").forEach(function (b) {
    b.addEventListener("click", function () {
      guests = Math.min(30, Math.max(1, guests + parseInt(b.getAttribute("data-step"), 10)));
      fGuests.textContent = guests + (guests >= 30 ? "+" : "");
    });
  });

  function setBad(name, bad) {
    var err = form.querySelector('[data-err="' + name + '"]');
    if (err) err.parentNode.classList.toggle("is-bad", bad);
    return !bad;
  }
  function validate() {
    var ok = true;
    ok = setBad("date", !fDate.value || fDate.value < todayStr) && ok;
    ok = setBad("time", !fTime.value) && ok;
    ok = setBad("name", document.getElementById("f-name").value.trim().length < 2) && ok;
    ok = setBad("phone", document.getElementById("f-phone").value.replace(/\D/g, "").length < 10) && ok;
    return ok;
  }
  ["f-date", "f-time", "f-name", "f-phone"].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener("input", function () { var f = el.closest(".field"); if (f.classList.contains("is-bad")) validate(); });
    el.addEventListener("change", function () { var f = el.closest(".field"); if (f.classList.contains("is-bad")) validate(); });
  });

  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).catch(function () {});
    try {
      var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    } catch (e) {}
    return Promise.resolve();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) {
      var bad = form.querySelector(".is-bad input, .is-bad select");
      if (bad) bad.focus();
      return;
    }
    var p = fDate.value.split("-");
    var jsd = new Date(+p[0], +p[1] - 1, +p[2]);
    var name = (document.querySelector(".brand__name") || {}).textContent || "";
    var lines = [
      "Бронювання столика" + (name ? " — " + name.trim() : ""),
      "Дата: " + p[2] + "." + p[1] + "." + p[0] + " (" + DAYS_SHORT[jsd.getDay()] + ")",
      "Час: " + fTime.value,
      "Гостей: " + fGuests.textContent,
      "Ім’я: " + document.getElementById("f-name").value.trim(),
      "Телефон: " + document.getElementById("f-phone").value.trim()
    ];
    if (document.getElementById("f-note").value.trim()) lines.push("Побажання: " + document.getElementById("f-note").value.trim());
    var msg = lines.join("\n");
    var enc = encodeURIComponent(msg);
    var via = form.querySelector('input[name="via"]:checked').value;
    var okText = form.querySelector("[data-ok-text]");
    if (via === "tg") {
      copyText(msg);
      window.open(form.getAttribute("data-tg"), "_blank", "noopener");
      okText.textContent = "Текст заявки скопійовано. Вставте його в чат Telegram, що відкрився, і надішліть — ми підтвердимо бронь.";
    } else if (via === "viber") {
      window.location.href = form.getAttribute("data-viber") + "&draft=" + enc;
      okText.textContent = "Відкриваємо Viber з готовим текстом. Натисніть «Надіслати» — ми підтвердимо бронь.";
    } else if (via === "wa") {
      window.open(form.getAttribute("data-wa") + "?text=" + enc, "_blank", "noopener");
      okText.textContent = "Відкриваємо WhatsApp з готовим текстом. Натисніть «Надіслати» — ми підтвердимо бронь.";
    } else {
      window.location.href = form.getAttribute("data-mail") + "?subject=" + encodeURIComponent("Бронювання столика") + "&body=" + enc;
      okText.textContent = "Відкриваємо пошту з готовим листом. Надішліть його — ми відповімо найближчим часом.";
    }
    var ok = form.querySelector(".form__ok");
    ok.hidden = false;
    ok.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  });

  /* ---------- Footer year ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = String(new Date().getFullYear());
})();
