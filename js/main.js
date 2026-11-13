(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.remove("no-js");
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* year */
  var y = $("#year"); if (y) y.textContent = String(new Date().getFullYear());

  /* menu */
  var burger = $("#burger"), nav = $("#nav");
  function closeNav() { if (!nav) return; nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); }
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", closeNav); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
  }

  /* reveal on scroll */
  var rev = $$(".reveal");
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-vis"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    rev.forEach(function (el) { io.observe(el); });
  } else { rev.forEach(function (el) { el.classList.add("is-vis"); }); }

  /* flash sheet filter */
  var cells = $$("#sheet .fl");
  $$(".filters .chip").forEach(function (b) {
    b.addEventListener("click", function () {
      var f = b.getAttribute("data-filter");
      $$(".filters .chip").forEach(function (o) { var on = o === b; o.classList.toggle("is-on", on); o.setAttribute("aria-pressed", on ? "true" : "false"); });
      cells.forEach(function (c) {
        var show = f === "all" || c.getAttribute("data-style") === f;
        c.classList.toggle("is-out", !show);
        c.classList.remove("is-in");
        if (show && !reduce) { void c.offsetWidth; c.classList.add("is-in"); }
      });
    });
  });

  var idea = $("#f-idea"), fZone = $("#f-zone"), fSize = $("#f-size");
  function goForm(focusEl) {
    var t = $("#zapys"); if (!t) return;
    t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (focusEl) setTimeout(function () { try { focusEl.focus({ preventScroll: true }); } catch (e) { focusEl.focus(); } }, reduce ? 0 : 600);
  }
  $$(".fl__pick").forEach(function (b) {
    b.addEventListener("click", function () {
      if (idea) idea.value = "Флеш " + b.getAttribute("data-pick") + ". " + (idea.value.indexOf("Флеш ") === 0 ? "" : idea.value);
      var n = $("#f-name"); goForm(n && !n.value ? n : idea);
    });
  });

  /* estimator */
  var PRICE = { mini: null, small: null, mid: null, large: null, xl: null }; // fill with numbers (грн) to show real "від" prices
  var calc = $("#calc");
  if (calc) {
    var size = $("#c-size"), out = $("#c-size-out");
    var tiers = [
      { max: 5, key: "mini", name: "міні", time: "до 1 год, один сеанс" },
      { max: 10, key: "small", name: "малий", time: "1–2 год, один сеанс" },
      { max: 20, key: "mid", name: "середній", time: "2–4 год, один сеанс" },
      { max: 30, key: "large", name: "великий", time: "2–3 сеанси" },
      { max: 99, key: "xl", name: "масштабний", time: "від 3 сеансів, погодинно" }
    ];
    var realTime = { mini: "1–2 год, один сеанс", small: "2–3 год, один сеанс", mid: "1–2 сеанси", large: "3–4 сеанси", xl: "від 4 сеансів, погодинно" };
    function val(name) { var i = $('input[name="' + name + '"]:checked', calc); return i; }
    function upd() {
      var s = +size.value, st = val("c-style"), z = val("c-zone");
      out.textContent = s + " см";
      var t = tiers.filter(function (x) { return s <= x.max; })[0];
      $("#c-tier").textContent = t.name;
      $("#c-time").textContent = st && st.value === "Реалізм" ? realTime[t.key] : (st && st.value === "Мінімалізм" && t.key === "mini" ? "до 40 хв, один сеанс" : t.time);
      var p = +(z ? z.getAttribute("data-pain") : 2);
      $$("#c-pain i").forEach(function (i, k) { i.classList.toggle("on", k < p); });
      $("#c-pain").setAttribute("aria-label", "Чутливість " + p + " з 5");
      $("#c-note").textContent = z ? z.getAttribute("data-note") : "";
      var pr = PRICE[t.key];
      $("#c-price").innerHTML = pr ? "від " + Number(pr).toLocaleString("uk-UA") + " грн" : 'від <span class="ph">[ЦІНА]</span> грн';
    }
    calc.addEventListener("input", upd); calc.addEventListener("change", upd); upd();
    var cb = $("#c-book");
    if (cb) cb.addEventListener("click", function () {
      var st = val("c-style"), z = val("c-zone");
      if (fZone && z) fZone.value = z.value;
      if (fSize) fSize.value = size.value;
      if (idea && !idea.value && st) idea.value = "Стиль: " + st.value.toLowerCase() + ". ";
      var n = $("#f-name"); goForm(n && !n.value ? n : idea);
    });
  }

  /* opening hours, Kyiv time */
  var DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
  var tbl = $("#hours");
  if (tbl) {
    var H = {};
    try { H = JSON.parse(tbl.getAttribute("data-hours") || "{}"); } catch (e) { H = {}; }
    var now = new Date(), kd = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
      var g = function (t) { return (parts.filter(function (p) { return p.type === t; })[0] || {}).value; };
      kd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
      mins = (+g("hour")) * 60 + (+g("minute"));
    } catch (e) {}
    var body = $("tbody", tbl), html = "";
    [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
      var h = H[String(d)];
      html += '<tr' + (d === kd ? ' class="is-today"' : "") + "><td>" + DAYS[d] + "</td><td>" + (h ? h[0] + "–" + h[1] : "вихідний") + "</td></tr>";
    });
    body.innerHTML = html;
    var st = $("#status");
    if (st) {
      var toM = function (s) { var a = s.split(":"); return (+a[0]) * 60 + (+a[1]); };
      var today = H[String(kd)], open = false, txt;
      if (today) { var o = toM(today[0]), c = toM(today[1]); if (c <= o) c += 1440; open = mins >= o && mins < c; }
      if (open) txt = "Зараз відчинено до " + today[1];
      else {
        txt = "Зараз зачинено";
        for (var i = 0; i < 8; i++) {
          var d2 = (kd + i) % 7, h2 = H[String(d2)];
          if (h2 && (i > 0 || mins < toM(h2[0]))) { txt += " · відкриємось " + (i === 0 ? "сьогодні" : i === 1 ? "завтра" : DAYS[d2].toLowerCase()) + " о " + h2[0]; break; }
        }
      }
      st.textContent = txt; st.classList.toggle("is-closed", !open); st.hidden = false;
    }
  }

  /* booking form */
  var form = $("#form");
  if (form) {
    var ok = $("#form-ok");
    function bad(el, isBad) { el.closest(".field").classList.toggle("is-bad", isBad); return isBad; }
    function copy(text) {
      try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).catch(function () {}); return; } } catch (e) {}
      try { var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch (e) {}
    }
    $$("input, textarea", form).forEach(function (el) { el.addEventListener("input", function () { var f = el.closest(".field"); if (f) f.classList.remove("is-bad"); }); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#f-name"), phone = $("#f-phone");
      var errs = [bad(name, name.value.trim().length < 2), bad(phone, phone.value.replace(/\D/g, "").length < 10), bad(idea, idea.value.trim().length < 3)];
      if (errs.some(Boolean)) { var first = $(".is-bad input, .is-bad textarea", form); if (first) first.focus(); return; }
      var biz = form.getAttribute("data-biz") || "";
      var lines = ["Заявка на тату" + (biz ? " — " + biz : ""), "Ім'я: " + name.value.trim(), "Телефон: " + phone.value.trim(), "Ідея: " + idea.value.trim()];
      if (fZone && fZone.value) lines.push("Місце: " + fZone.value);
      if (fSize && fSize.value.trim()) lines.push("Розмір: " + fSize.value.trim() + " см");
      var msg = lines.join("\n"), enc = encodeURIComponent(msg);
      var via = $('input[name="via"]:checked', form);
      var ch = via ? via.value : "", href = via ? via.getAttribute("data-href") : "";
      var okText = "Надішліть повідомлення у відкритому вікні — і ми відповімо протягом робочого дня.";
      if (ch === "viber") location.href = href + "&draft=" + enc;
      else if (ch === "whatsapp") window.open(href + "?text=" + enc, "_blank", "noopener");
      else if (ch === "email") location.href = href + "?subject=" + encodeURIComponent("Заявка на тату") + "&body=" + enc;
      else if (ch === "sms") location.href = href + "?&body=" + enc;
      else if (ch === "telegram" || ch === "instagram") {
        copy(msg); window.open(href, "_blank", "noopener");
        okText = "Текст заявки скопійовано. Вставте його в чат, що відкрився, і надішліть — ми відповімо протягом робочого дня.";
      }
      $("#form-ok-text").textContent = okText;
      form.hidden = true; ok.hidden = false; ok.focus();
    });
    var again = $("#form-again");
    if (again) again.addEventListener("click", function () { form.reset(); ok.hidden = true; form.hidden = false; $("#f-name").focus(); });
  }
})();
