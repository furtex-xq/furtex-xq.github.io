/* Фотостудія — template script. No dependencies. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  /* ---- client data: edit these when adapting the template ---- */
  var CONFIG = {
    name: "Фотостудія Ірина",
    telegram: "",
    viber: "",
    whatsapp: "",
    sms: "+380685629282",
    instagram: "",
    messenger: "",
    email: ""
  };
  /* Opening hours, Kyiv time. 0 = Sunday ... 6 = Saturday; [open, close] in hours (10.5 = 10:30); null = closed.
     Set HOURS = null to hide the table and the live "open now" status. */
  var HOURS = { 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: [10, 16], 0: null };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- year ---- */
  $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---- menu ---- */
  var burger = $(".burger"), nav = $("#nav");
  function closeMenu() { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Відкрити меню"); }
  burger.addEventListener("click", function () {
    var open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
  });
  $$("a", nav).forEach(function (a) { a.addEventListener("click", closeMenu); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  /* ---- hero: the print develops ---- */
  var dev = $("[data-develop]");
  if (dev) {
    var box = dev.parentNode;
    var go = function () { setTimeout(function () { box.classList.add("dev"); }, reduce ? 0 : 250); };
    if (dev.complete && dev.naturalWidth) go(); else { dev.addEventListener("load", go); dev.addEventListener("error", go); }
    setTimeout(function () { box.classList.add("dev"); }, 4000);
  }

  /* ---- package tabs ---- */
  var tabs = $$(".tab");
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab, panel = document.getElementById(t.getAttribute("aria-controls"));
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      panel.hidden = !on;
      if (on && !reduce) { panel.classList.remove("in"); void panel.offsetWidth; panel.classList.add("in"); }
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });
  $$("[data-goto]").forEach(function (a) {
    a.addEventListener("click", function () {
      var t = $('.tab[data-pkg="' + a.getAttribute("data-goto") + '"]');
      if (t) selectTab(t);
    });
  });
  var pkgSelect = $("#f-pkg");
  $$("[data-choose]").forEach(function (a) {
    a.addEventListener("click", function () { pkgSelect.value = a.getAttribute("data-choose"); });
  });

  /* ---- contact sheet loupe ---- */
  var sheet = $("[data-sheet]"), loupe = $("[data-loupe]");
  if (sheet && loupe) {
    var active = null, touching = false;
    var place = function (frame, cx, cy, isTouch) {
      var img = $("img", frame);
      if (!img || !img.naturalWidth) return;
      var ir = img.getBoundingClientRect(), sr = sheet.getBoundingClientRect();
      var L = loupe.offsetWidth || 180, Z = isTouch ? 3.2 : 2.6;
      var px = Math.min(Math.max(cx - ir.left, 0), ir.width), py = Math.min(Math.max(cy - ir.top, 0), ir.height);
      // object-fit: cover maths
      var s = Math.max(ir.width / img.naturalWidth, ir.height / img.naturalHeight);
      var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      var ox = (ir.width - dw) / 2, oy = (ir.height - dh) * 0.3; // matches object-position 50% 30%
      var ix = px - ox, iy = py - oy;
      var url = img.currentSrc || img.src;
      if (loupe.getAttribute("data-src") !== url) { loupe.style.backgroundImage = 'url("' + url + '")'; loupe.setAttribute("data-src", url); }
      loupe.style.backgroundSize = (dw * Z) + "px " + (dh * Z) + "px";
      loupe.style.backgroundPosition = (L / 2 - ix * Z) + "px " + (L / 2 - iy * Z) + "px";
      var lx = cx - sr.left - L / 2, ly = cy - sr.top - L / 2 - (isTouch ? L * 0.7 : 0);
      lx = Math.min(Math.max(lx, 0), sr.width - L); ly = Math.max(ly, -L * 0.4);
      loupe.style.transform = "";
      loupe.style.left = lx + "px"; loupe.style.top = ly + "px";
      loupe.classList.add("on");
    };
    var hide = function () {
      loupe.classList.remove("on");
      if (active) active.classList.remove("is-looking");
      active = null;
    };
    $$(".frame", sheet).forEach(function (f) {
      f.addEventListener("pointermove", function (e) {
        if (e.pointerType === "mouse") place(f, e.clientX, e.clientY, false);
        else if (touching && active === f) { e.preventDefault(); place(f, e.clientX, e.clientY, true); }
      });
      f.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") hide(); });
      f.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse") return;
        if (active && active !== f) active.classList.remove("is-looking");
        active = f; f.classList.add("is-looking"); touching = true;
        place(f, e.clientX, e.clientY, true);
      });
      f.addEventListener("focus", function () {
        var r = f.getBoundingClientRect(); active = f; place(f, r.left + r.width / 2, r.top + r.height * 0.4, false);
      });
      f.addEventListener("blur", hide);
    });
    document.addEventListener("pointerup", function () { touching = false; });
    document.addEventListener("pointercancel", function () { touching = false; });
    document.addEventListener("pointerdown", function (e) { if (active && !e.target.closest(".frame")) hide(); });
    window.addEventListener("resize", hide);
  }

  /* ---- opening hours, Kyiv time ---- */
  var DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
  var statuses = $$("[data-status]"), lamp = $("[data-lamp]"), table = $("[data-hours-table]");
  function fmt(h) { var m = Math.round((h % 1) * 60); return (Math.floor(h) < 10 ? "0" : "") + Math.floor(h) + ":" + (m < 10 ? "0" : "") + m; }
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var d = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday);
      return { d: d, h: (parseInt(o.hour, 10) % 24) + parseInt(o.minute, 10) / 60 };
    } catch (e) { var n = new Date(); return { d: n.getDay(), h: n.getHours() + n.getMinutes() / 60 }; }
  }
  function renderHours() {
    if (!HOURS) return;
    var now = kyivNow(), today = HOURS[now.d];
    var open = !!(today && now.h >= today[0] && now.h < today[1]);
    var text;
    if (open) text = "Зараз відчинено · до " + fmt(today[1]);
    else {
      if (today && now.h < today[0]) text = "Зараз зачинено · відкриємося о " + fmt(today[0]);
      else {
        var k = 1, nd;
        while (k < 8 && !HOURS[(now.d + k) % 7]) k++;
        nd = (now.d + k) % 7;
        text = k < 8 ? "Зараз зачинено · відкриємося " + (k === 1 ? "завтра" : "у " + DAYS[nd].toLowerCase().replace("середа", "середу").replace("п'ятниця", "п'ятницю").replace("субота", "суботу").replace("неділя", "неділю")) + " о " + fmt(HOURS[nd][0]) : "Зараз зачинено";
      }
    }
    statuses.forEach(function (s) { s.hidden = false; s.textContent = text; s.classList.toggle("is-open", open); });
    if (lamp) { lamp.classList.toggle("on", open); lamp.title = open ? "Студія відчинена" : "Студія зачинена"; }
    if (table) {
      var rows = "";
      [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
        var h = HOURS[d];
        rows += '<tr class="' + (d === now.d ? "today" : "") + (h ? "" : " off") + '"><td>' + DAYS[d] + "</td><td>" + (h ? fmt(h[0]) + "–" + fmt(h[1]) : "вихідний") + "</td></tr>";
      });
      table.tBodies[0].innerHTML = rows;
      table.hidden = false;
    }
  }
  renderHours();
  setInterval(renderHours, 60000);

  /* ---- reveal on scroll ---- */
  var rev = $$(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    rev.forEach(function (el) { io.observe(el); });
  } else rev.forEach(function (el) { el.classList.add("seen"); });

  /* ---- booking form → messenger / SMS / Instagram / email ---- */
  var form = $("#book");
  if (form) {
    var ok = $("[data-ok]", form), okText = $("[data-ok-text]", form);
    var setBad = function (name, bad) { var f = form.elements[name].closest(".field"); f.classList.toggle("bad", bad); };
    form.addEventListener("input", function (e) { if (e.target.name === "name" || e.target.name === "phone") setBad(e.target.name, false); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim(), phone = form.elements.phone.value.trim();
      var digits = phone.replace(/\D/g, "");
      var badName = name.length < 2, badPhone = digits.length < 9 || digits.length > 13;
      setBad("name", badName); setBad("phone", badPhone);
      if (badName) { form.elements.name.focus(); return; }
      if (badPhone) { form.elements.phone.focus(); return; }
      var date = form.elements.date.value, msg = form.elements.msg.value.trim();
      if (date) { var p = date.split("-"); date = p[2] + "." + p[1] + "." + p[0]; }
      var via = (form.querySelector('input[name="via"]:checked') || {}).value;
      var text = "Вітаю! Хочу записатися у фотостудію Ірина.\n" +
        "Зйомка: " + form.elements.pkg.value + "\n" +
        (date ? "Бажана дата: " + date + "\n" : "") +
        "Ім'я: " + name + "\nТелефон: " + phone +
        (msg ? "\nКоментар: " + msg : "");
      var t = encodeURIComponent(text), url = "", note = "Надішліть повідомлення у вікні, що відкрилося, — ми відповімо і підтвердимо час.";
      if (via === "tg") url = "https://t.me/" + CONFIG.telegram + "?text=" + t;
      else if (via === "viber") url = "viber://chat?number=" + CONFIG.viber + "&draft=" + t;
      else if (via === "wa") url = "https://wa.me/" + CONFIG.whatsapp + "?text=" + t;
      else if (via === "sms") url = "sms:" + CONFIG.sms + "?&body=" + t;
      else if (via === "mail") url = "mailto:" + CONFIG.email + "?subject=" + encodeURIComponent("Запис на фотозйомку") + "&body=" + t;
      else if (via === "ig") {
        url = "https://ig.me/m/" + CONFIG.instagram;
        note = "Текст заявки скопійовано. Вставте його в чат Instagram, що відкрився, і надішліть.";
        try { navigator.clipboard.writeText(text); } catch (err) { /* clipboard unavailable */ }
      } else if (via === "fb") {
        url = "https://m.me/" + CONFIG.messenger;
        note = "Текст заявки скопійовано. Вставте його в чат Messenger, що відкрився, і надішліть.";
        try { navigator.clipboard.writeText(text); } catch (err) { /* clipboard unavailable */ }
      }
      if (url) {
        if (/^https:/.test(url)) window.open(url, "_blank", "noopener"); else window.location.href = url;
      }
      okText.textContent = note;
      ok.hidden = false;
    });
  }
})();
