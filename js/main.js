/* Автомагазин, Автосервис — автозапчастини. Без бібліотек. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- mobile menu ---------- */
  var burger = $("[data-burger]"), nav = $("#nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      burger.setAttribute("aria-label", open ? "Відкрити меню" : "Закрити меню");
      nav.classList.toggle("is-open", !open);
    });
    $$("a", nav).forEach(function (a) {
      a.addEventListener("click", function () {
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Відкрити меню");
        nav.classList.remove("is-open");
      });
    });
  }

  /* ---------- year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- open / closed by Kyiv time ---------- */
  function kyivNow() {
    var zones = ["Europe/Kyiv", "Europe/Kiev"];
    for (var i = 0; i < zones.length; i++) {
      try {
        var parts = new Intl.DateTimeFormat("en-GB", { timeZone: zones[i], weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
        var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
        var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        return { day: days[o.weekday], min: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
      } catch (e) { /* try next */ }
    }
    var d = new Date(); return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
  }
  function toMin(s) { var p = String(s).split(":"); return parseInt(p[0], 10) * 60 + parseInt(p[1] || "0", 10); }
  (function hours() {
    var rows = $$("[data-hours] tr");
    if (!rows.length) return;
    var now = kyivNow(), sched = {};
    rows.forEach(function (tr) {
      var d = parseInt(tr.getAttribute("data-days"), 10), td = $("td", tr);
      sched[d] = td && td.getAttribute("data-open") ? { o: toMin(td.getAttribute("data-open")), c: toMin(td.getAttribute("data-close")), label: td.getAttribute("data-open") } : null;
      if (d === now.day) tr.classList.add("is-today");
    });
    var t = sched[now.day], open = !!(t && now.min >= t.o && now.min < t.c), text;
    if (open) {
      var left = t.c - now.min;
      text = left <= 60 ? "Відчинено, ще " + left + " хв" : "Зараз відчинено";
    } else {
      var next = "";
      if (t && now.min < t.o) next = " · відкриємось о " + t.label;
      else {
        for (var k = 1; k <= 7; k++) {
          var nd = (now.day + k) % 7;
          if (sched[nd]) { next = " · відкриємось " + (k === 1 ? "завтра" : ["у неділю", "у понеділок", "у вівторок", "у середу", "у четвер", "у п'ятницю", "у суботу"][nd]) + " о " + sched[nd].label; break; }
        }
      }
      text = "Зараз зачинено" + next;
    }
    $$("[data-status]").forEach(function (s) {
      s.classList.add(open ? "is-open" : "is-closed");
      var tx = $("[data-status-text]", s); if (tx) tx.textContent = text;
    });
  })();

  /* ---------- reveal on scroll ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    var targets = $$(".head, .cats > li, .ptable, .services__media, .svc > div, .proc > li, .about__photos, .about__body, .rev, .faq__list, .contacts__info, .contacts__side");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach(function (el, i) {
      el.classList.add("rv");
      var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(sib, 5) * 60 + "ms";
      io.observe(el);
    });
  }

  /* ---------- contact links (one source of truth: hrefs in HTML) ---------- */
  function linkOf(ch) { var a = $('[data-channel="' + ch + '"]'); return a ? a.getAttribute("href") : null; }
  function sendVia(channel, text, subject) {
    var base, url = null;
    if (channel === "viber" && (base = linkOf("viber"))) url = base + "&draft=" + encodeURIComponent(text);
    else if (channel === "email" && (base = linkOf("email"))) url = base + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
    else if (channel === "sms" && (base = linkOf("tel"))) url = base.replace(/^tel:/, "sms:") + "?&body=" + encodeURIComponent(text);
    else if (channel === "telegram" && (base = linkOf("telegram"))) url = base + "?text=" + encodeURIComponent(text);
    copy(text);
    if (!url) return;
    if (/^https?:/.test(url)) {
      var w = window.open(url, "_blank", "noopener");
      if (!w) window.location.href = url;
    } else {
      window.location.href = url;
    }
  }
  function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(function () {});
    } catch (e) {}
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    } catch (e) {}
  }

  /* ---------- part finder ---------- */
  var form = $("[data-finder]");
  if (!form) return;
  var steps = $$("[data-step]", form), stepItems = $$("[data-steps] li"), progress = $("[data-progress]", form),
      stepLabel = $("[data-step-label]", form), done = $("[data-done]", form), cur = 1, mode = "vin";
  var vinInput = $("#pf-vin"), cellsBox = $("[data-vin-cells]"), vinState = $("[data-vin-state]"), vinWrap = $(".vin");

  for (var c = 0; c < 17; c++) cellsBox.appendChild(document.createElement("span"));
  var cells = $$("span", cellsBox);

  function cleanVin(v) { return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17); }
  function renderVin() {
    var v = cleanVin(vinInput.value);
    if (vinInput.value !== v) vinInput.value = v;
    var focused = document.activeElement === vinInput, bad = false;
    cells.forEach(function (cell, i) {
      var ch = v.charAt(i);
      cell.textContent = ch;
      var isBad = /[IOQ]/.test(ch);
      if (isBad) bad = true;
      cell.className = (ch ? (isBad ? "is-bad" : "is-on") : "") + (focused && i === v.length ? " is-cur" : "");
    });
    vinState.className = "vin__state";
    if (bad) { vinState.classList.add("is-bad"); vinState.innerHTML = "Літери <b>I, O, Q</b> у VIN не використовуються — можливо, це цифри 1 або 0"; }
    else if (v.length === 17) { vinState.classList.add("is-ok"); vinState.innerHTML = "<b>17/17</b> — VIN має правильний формат"; }
    else vinState.innerHTML = "<b>" + v.length + "</b>/17 символів" + (v.length ? "" : " · торкніться клітинок, щоб ввести");
    return { v: v, bad: bad };
  }
  vinInput.addEventListener("input", renderVin);
  vinInput.addEventListener("focus", function () { vinWrap.classList.add("is-focus"); renderVin(); });
  vinInput.addEventListener("blur", function () { vinWrap.classList.remove("is-focus"); renderVin(); });
  renderVin();

  $$("[data-mode]", form).forEach(function (b) {
    b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); });
  });
  function setMode(m) {
    mode = m;
    $$("[data-mode]", form).forEach(function (b) { var on = b.getAttribute("data-mode") === m; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    $$("[data-mode-panel]", form).forEach(function (p) { p.classList.toggle("is-active", p.getAttribute("data-mode-panel") === m); });
    err(1, "");
  }

  function err(n, msg) { var e = $('[data-err="' + n + '"]', form); if (e) e.textContent = msg; }
  function val(id) { var el = $(id); return el ? el.value.trim() : ""; }
  function mark(id, bad) { var el = $(id); if (el) el.classList.toggle("is-bad", bad); }

  function validate(n) {
    if (n === 1) {
      if (mode === "vin") {
        var r = renderVin();
        if (r.bad) return err(1, "Перевірте VIN: літер I, O, Q у ньому не буває."), false;
        if (r.v.length !== 17) return err(1, "VIN має 17 символів, зараз " + r.v.length + ". Немає під рукою — оберіть «Марка й модель»."), false;
      } else {
        var y = parseInt(val("#pf-year"), 10), maxY = new Date().getFullYear() + 1;
        mark("#pf-make", !val("#pf-make")); mark("#pf-model", !val("#pf-model")); mark("#pf-year", !(y >= 1960 && y <= maxY));
        if (!val("#pf-make") || !val("#pf-model")) return err(1, "Вкажіть марку і модель авто."), false;
        if (!(y >= 1960 && y <= maxY)) return err(1, "Вкажіть рік випуску чотирма цифрами, наприклад 2014."), false;
      }
    }
    if (n === 2) {
      var any = $$('input[name="cat"]:checked', form).length > 0, txt = val("#pf-part");
      mark("#pf-part", !any && txt.length < 3);
      if (!any && txt.length < 3) return err(2, "Оберіть розділ або напишіть, яка деталь потрібна."), false;
    }
    if (n === 3) {
      var nm = val("#pf-name"), ph = val("#pf-phone").replace(/\D/g, "");
      mark("#pf-name", nm.length < 2); mark("#pf-phone", ph.length < 10 || ph.length > 12);
      if (nm.length < 2) return err(3, "Напишіть, як до вас звертатися."), false;
      if (ph.length < 10 || ph.length > 12) return err(3, "Перевірте номер телефону: потрібно 10–12 цифр."), false;
    }
    err(n, "");
    return true;
  }

  function go(n, focus) {
    cur = n;
    steps.forEach(function (s) { s.classList.toggle("is-active", +s.getAttribute("data-step") === n); });
    stepItems.forEach(function (li, i) { li.classList.toggle("is-active", i + 1 === n); li.classList.toggle("is-done", i + 1 < n); });
    progress.style.width = (n / 3 * 100) + "%";
    stepLabel.textContent = "Крок " + n + " / 3";
    if (focus) {
      var first = $('[data-step="' + n + '"] input:not([type=hidden]), [data-step="' + n + '"] textarea', form);
      var top = form.getBoundingClientRect().top;
      if (top < 60 || top > window.innerHeight * 0.6) form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      if (first && n !== 2) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) {} }, 60);
    }
  }
  $$("[data-next]", form).forEach(function (b) { b.addEventListener("click", function () { if (validate(cur)) go(cur + 1, true); }); });
  $$("[data-prev]", form).forEach(function (b) { b.addEventListener("click", function () { go(cur - 1, true); }); });
  $$("input, textarea", form).forEach(function (el) {
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && el.tagName !== "TEXTAREA" && cur < 3) { e.preventDefault(); if (validate(cur)) go(cur + 1, true); }
    });
    el.addEventListener("input", function () { el.classList.remove("is-bad"); err(cur, ""); });
    el.addEventListener("change", function () { err(cur, ""); });
  });

  function buildMessage() {
    var lines = ["Заявка на підбір запчастини", ""];
    if (mode === "vin") lines.push("VIN: " + cleanVin(vinInput.value));
    else {
      lines.push("Авто: " + [val("#pf-make"), val("#pf-model"), val("#pf-year")].filter(Boolean).join(" "));
      if (val("#pf-engine")) lines.push("Двигун: " + val("#pf-engine"));
    }
    var cats = $$('input[name="cat"]:checked', form).map(function (i) { return i.value; });
    if (cats.length) lines.push("Розділ: " + cats.join(", "));
    if (val("#pf-part")) lines.push("Деталь: " + val("#pf-part"));
    var pref = $('input[name="pref"]:checked', form); if (pref) lines.push("Пропонувати: " + pref.value);
    lines.push("", "Ім'я: " + val("#pf-name"), "Телефон: " + val("#pf-phone"));
    return lines.join("\n");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    for (var n = 1; n <= 3; n++) { if (!validate(n)) { go(n, true); return; } }
    var msg = buildMessage(), ch = ($('input[name="channel"]:checked', form) || {}).value || "telegram";
    $("[data-msg]", form).textContent = msg;
    steps.forEach(function (s) { s.classList.remove("is-active"); });
    stepItems.forEach(function (li) { li.classList.remove("is-active"); li.classList.add("is-done"); });
    progress.style.width = "100%";
    stepLabel.textContent = "Готово";
    done.hidden = false;
    try { done.focus({ preventScroll: true }); } catch (er) {}
    sendVia(ch, msg, "Заявка на підбір запчастини");
  });
  $("[data-copy]", form).addEventListener("click", function (e) {
    copy($("[data-msg]", form).textContent);
    e.currentTarget.textContent = "Скопійовано";
  });
  $("[data-reset]", form).addEventListener("click", function () {
    form.reset(); done.hidden = true; setMode("vin"); renderVin();
    $("[data-copy]", form).textContent = "Скопіювати текст";
    $$(".cat.is-picked").forEach(function (c) { c.classList.remove("is-picked"); });
    go(1, true);
  });

  function toFinder(focusSel) {
    var f = $("#finder");
    f.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (focusSel) setTimeout(function () { var el = $(focusSel); if (el) try { el.focus({ preventScroll: true }); } catch (e) {} }, reduce ? 0 : 600);
  }

  /* hero quick bar → finder */
  var bar = $("[data-vinbar]");
  if (bar) bar.addEventListener("submit", function (e) {
    e.preventDefault();
    var raw = $("#vinbar-input").value.trim(), compact = raw.replace(/[\s-]/g, "").toUpperCase();
    if (!/\s/.test(raw) && /^[A-Z0-9]{11,17}$/.test(compact) && /\d/.test(compact) && /[A-Z]/.test(compact)) {
      setMode("vin"); vinInput.value = compact; renderVin(); go(1); toFinder("#pf-vin");
    } else if (raw) {
      setMode("car");
      var ym = raw.match(/\b(19[6-9]\d|20\d\d)\b/), rest = raw.replace(/\b(19[6-9]\d|20\d\d)\b/, "").trim().split(/\s+/);
      $("#pf-make").value = rest.shift() || ""; $("#pf-model").value = rest.join(" ");
      $("#pf-year").value = ym ? ym[1] : "";
      go(1); toFinder(ym ? "#pf-engine" : "#pf-year");
    } else { toFinder("#pf-vin"); }
  });

  /* catalogue tiles → preselect category */
  $$("[data-cat]").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-cat"), box = $$('input[name="cat"]', form).filter(function (i) { return i.value === v; })[0];
      if (box) box.checked = true;
      b.classList.add("is-picked");
      toFinder(cur === 1 ? (mode === "vin" ? "#pf-vin" : "#pf-make") : null);
    });
  });

  /* ---------- callback form ---------- */
  var cb = $("[data-callback]");
  if (cb) cb.addEventListener("submit", function (e) {
    e.preventDefault();
    var nm = $("#cb-name").value.trim(), ph = $("#cb-phone").value.replace(/\D/g, ""), er = $("[data-cb-err]");
    $("#cb-name").classList.toggle("is-bad", nm.length < 2); $("#cb-phone").classList.toggle("is-bad", ph.length < 10 || ph.length > 12);
    if (nm.length < 2) { er.textContent = "Напишіть ваше ім'я."; return; }
    if (ph.length < 10 || ph.length > 12) { er.textContent = "Перевірте номер: потрібно 10–12 цифр."; return; }
    er.textContent = "";
    $("[data-cb-ok]").hidden = false;
    sendVia(cb.getAttribute("data-channel") || "telegram", "Прошу передзвонити\nІм'я: " + nm + "\nТелефон: " + $("#cb-phone").value.trim(), "Зворотний дзвінок");
  });
})();
