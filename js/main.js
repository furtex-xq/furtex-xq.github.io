(function () {
  "use strict";
  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- contact sentinels (replace when adapting) ---- */
  var TG = "https://t.me/username";
  var VIBER = "viber://chat?number=%2B380000000000";
  var MAIL = "mailto:hello@example.com";
  var SMS = "";      /* e.g. "sms:+380XXXXXXXXX" — used when the form offers an SMS option */
  var FALLBACK = ""; /* social URL opened when the form has no send options */

  requestAnimationFrame(function () { doc.body.classList.add("is-ready"); });
  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  /* ---- mobile menu ---- */
  var burger = $("#burger"), nav = $("#nav");
  function closeNav() { nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Відкрити меню"); }
  burger.addEventListener("click", function () {
    var open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
  });
  $$("a", nav).forEach(function (a) { a.addEventListener("click", closeNav); });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });

  /* ---- floor plans (signature) ---- */
  var PLANS = {
    1: [["Кімната", 0, 0, 180, 120, "18 м²"], ["Кухня", 180, 0, 120, 110, "10 м²"], ["Коридор", 0, 120, 180, 80], ["С/в", 180, 110, 120, 90]],
    2: [["Кімната", 0, 0, 150, 110, "17 м²"], ["Спальня", 150, 0, 150, 110, "15 м²"], ["Кухня", 0, 110, 110, 90, "11 м²"], ["Коридор", 110, 110, 110, 90], ["С/в", 220, 110, 80, 90]],
    3: [["Вітальня", 0, 0, 130, 110, "21 м²"], ["Спальня", 130, 0, 90, 110, "14 м²"], ["Дитяча", 220, 0, 80, 110, "12 м²"], ["Кухня", 0, 110, 100, 90, "12 м²"], ["Коридор", 100, 110, 120, 90], ["С/в", 220, 110, 80, 90]]
  };
  var NS = "http://www.w3.org/2000/svg";
  function el(n, a) { var e = doc.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }
  function buildPlan(type) {
    var svg = el("svg", { viewBox: "-8 -8 316 216", preserveAspectRatio: "xMidYMid meet" });
    PLANS[type].forEach(function (r, i) {
      var x = r[1], yy = r[2], w = r[3], h = r[4];
      var p = el("path", { d: "M" + x + " " + yy + "h" + w + "v" + h + "h" + -w + "z", pathLength: "1", "class": "w" });
      p.style.transitionDelay = (i * 0.08) + "s";
      svg.appendChild(p);
      var t = el("text", { x: x + w / 2, y: yy + h / 2 + (r[5] ? -2 : 3), "text-anchor": "middle" });
      t.textContent = r[0]; svg.appendChild(t);
      if (r[5]) { var a = el("text", { x: x + w / 2, y: yy + h / 2 + 11, "text-anchor": "middle", "class": "a" }); a.textContent = r[5]; svg.appendChild(a); }
      if (yy === 0 && w > 70) svg.appendChild(el("path", { d: "M" + (x + w * 0.3) + " 0h" + (w * 0.4), "class": "win" }));
    });
    return svg;
  }
  $$(".card").forEach(function (card) {
    var holder = $(".plan", card), btn = $(".card__plan", card), built = false;
    btn.addEventListener("click", function () {
      if (!built) { holder.appendChild(buildPlan(card.getAttribute("data-plan") || "1")); built = true; holder.getBoundingClientRect(); }
      var on = !card.classList.contains("is-plan");
      requestAnimationFrame(function () { card.classList.toggle("is-plan", on); });
      btn.setAttribute("aria-pressed", String(on));
      btn.textContent = on ? "Фото" : "План";
    });
  });

  /* ---- listings filter ---- */
  var state = { deal: "all", rooms: "all", district: "all" };
  var cards = $$("#cards .card"), countEl = $("#count"), empty = $("#empty");
  function plural(n) { var m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return "об’єкт"; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "об’єкти"; return "об’єктів"; }
  function match(c) {
    if (state.deal !== "all" && c.dataset.deal !== state.deal) return false;
    if (state.rooms !== "all") { var r = +c.dataset.rooms; if (state.rooms === "3" ? r < 3 : r !== +state.rooms) return false; }
    if (state.district !== "all" && c.dataset.district !== state.district) return false;
    return true;
  }
  function apply() {
    var n = 0;
    cards.forEach(function (c) {
      var ok = match(c); if (ok) n++;
      if (ok && c.hidden) { c.hidden = false; c.classList.add("is-hiding"); requestAnimationFrame(function () { requestAnimationFrame(function () { c.classList.remove("is-hiding"); }); }); }
      else if (!ok && !c.hidden) { c.hidden = true; }
    });
    countEl.textContent = n;
    countEl.parentNode.lastChild.textContent = " " + plural(n);
    empty.hidden = n !== 0;
  }
  function syncChips() {
    $$("#filters .chips").forEach(function (g) {
      var k = g.dataset.key;
      $$(".chip", g).forEach(function (b) { var on = b.dataset.v === state[k]; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
    });
    $("#f-district").value = state.district;
  }
  $$("#filters .chips").forEach(function (g) {
    g.addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      state[g.dataset.key] = b.dataset.v; syncChips(); apply();
    });
  });
  $("#f-district").addEventListener("change", function () { state.district = this.value; apply(); });
  syncChips();

  /* hero finder → filter */
  $("#finder").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, deal = f.deal.value;
    if (deal === "sell") { $("#sell").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); return; }
    state.deal = deal; state.rooms = f.rooms.value; state.district = f.district.value;
    syncChips(); apply();
    $("#objects").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });

  /* ---- mortgage calculator ---- */
  var fmt = function (n) { return Math.round(n).toLocaleString("uk-UA").replace(/ | /g, " "); };
  var ci = { price: $("#c-price"), down: $("#c-down"), years: $("#c-years"), rate: $("#c-rate") };
  var budget = "";
  function yearsWord(n) { var m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return "рік"; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "роки"; return "років"; }
  function calc() {
    var price = +ci.price.value, downP = +ci.down.value, years = +ci.years.value, rate = +ci.rate.value;
    var down = price * downP / 100, loan = price - down, n = years * 12, i = rate / 1200;
    var m = i ? loan * i / (1 - Math.pow(1 + i, -n)) : loan / n;
    var interest = m * n - loan, total = down + loan + interest;
    $("#o-price").textContent = fmt(price) + " грн";
    $("#o-down").textContent = downP + " %";
    $("#o-years").textContent = years + " " + yearsWord(years);
    $("#o-rate").textContent = String(rate).replace(".", ",") + " %";
    $("#r-month").textContent = fmt(m);
    $("#r-down").textContent = fmt(down) + " грн";
    $("#r-loan").textContent = fmt(loan) + " грн";
    $("#r-int").textContent = fmt(interest) + " грн";
    $("#b-down").style.width = (down / total * 100) + "%";
    $("#b-loan").style.width = (loan / total * 100) + "%";
    $("#b-int").style.width = (interest / total * 100) + "%";
    Object.keys(ci).forEach(function (k) { var r = ci[k]; r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min) * 100) + "%"); });
    budget = "Бюджет за калькулятором: житло до " + fmt(price) + " грн, внесок " + downP + " %, строк " + years + " " + yearsWord(years) + ", платіж ≈ " + fmt(m) + " грн/міс.";
  }
  Object.keys(ci).forEach(function (k) { ci[k].addEventListener("input", calc); });
  calc();
  $("#calcCta").addEventListener("click", function () { var t = $("#contact textarea"); if (t) t.value = budget; });
  $$("[data-fill]").forEach(function (a) { a.addEventListener("click", function () { var t = $("#contact textarea"); if (t) t.value = a.getAttribute("data-fill"); }); });

  /* ---- forms → messenger ---- */
  $$("form.form").forEach(function (form) {
    var err = $(".form__err", form), ok = $(".form__ok", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = [];
      $$("[required]", form).forEach(function (f) {
        var v = (f.value || "").trim(), wrong = !v;
        if (f.type === "tel" && v && v.replace(/\D/g, "").length < 10) wrong = true;
        f.closest(".fld").classList.toggle("is-bad", wrong);
        f.setAttribute("aria-invalid", String(wrong));
        if (wrong) bad.push(f);
      });
      if (bad.length) {
        err.textContent = bad.some(function (f) { return f.type === "tel" && f.value.trim(); }) ? "Перевірте номер телефону — потрібно щонайменше 10 цифр." : "Заповніть позначені поля, щоб ми могли з вами зв’язатися.";
        err.hidden = false; bad[0].focus(); return;
      }
      err.hidden = true;
      var lines = [form.getAttribute("data-kind") + " — [НАЗВА]"];
      $$("input, select, textarea", form).forEach(function (f) {
        if (!f.name || f.name === "via" || f.type === "range") return;
        if (f.type === "radio" && !f.checked) return;
        var v = (f.value || "").trim(); if (v) lines.push(f.name + ": " + v);
      });
      var text = lines.join("\n"), via = (form.querySelector("[name=via]:checked") || {}).value, url;
      if (!via) url = FALLBACK;
      else if (via === "sms") url = SMS + "?&body=" + encodeURIComponent(text);
      else if (via === "viber") url = VIBER + "&draft=" + encodeURIComponent(text);
      else if (via === "mail") url = MAIL + "?subject=" + encodeURIComponent(form.getAttribute("data-kind")) + "&body=" + encodeURIComponent(text);
      else url = TG + "?text=" + encodeURIComponent(text);
      try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (x) {}
      if (url) { if (via === "tg" || !via) window.open(url, "_blank", "noopener"); else window.location.href = url; }
      form.classList.add("is-sent"); ok.hidden = false;
    });
    $$("input, select, textarea", form).forEach(function (f) {
      f.addEventListener("input", function () { var w = f.closest(".fld"); if (w) w.classList.remove("is-bad"); });
    });
    $("[data-reset]", form).addEventListener("click", function () { form.reset(); form.classList.remove("is-sent"); ok.hidden = true; });
  });

  /* ---- opening hours, Kyiv time ---- */
  var hoursEl = $("#hours"), st = $("#status");
  if (hoursEl && st) {
    var H = JSON.parse(hoursEl.getAttribute("data-hours") || "{}");
    var toMin = function (s) { var p = String(s).split(":"); return (+p[0]) * 60 + (+(p[1] || 0)); };
    var DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    var ON = ["у неділю","у понеділок","у вівторок","у середу","у четвер","у п’ятницю","у суботу"];
    var tick = function () {
      var parts = {};
      try {
        new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
          .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
      } catch (x) { var d = new Date(); parts = { weekday: DAYS[d.getDay()], hour: d.getHours(), minute: d.getMinutes() }; }
      var day = DAYS.indexOf(parts.weekday), now = (+parts.hour % 24) * 60 + (+parts.minute), today = H[day];
      var open = !!today && now >= toMin(today[0]) && now < toMin(today[1]);
      st.classList.toggle("is-open", open); st.classList.toggle("is-closed", !open);
      if (open) st.textContent = "Зараз відчинено до " + today[1].replace(/^0/, "");
      else {
        var txt = "";
        for (var k = 0; k < 8; k++) {
          var cand = (day + k) % 7, h = H[cand];
          if (h && (k > 0 || now < toMin(h[0]))) { txt = (k === 0 ? "сьогодні" : k === 1 ? "завтра" : ON[cand]) + " о " + h[0].replace(/^0/, ""); break; }
        }
        st.textContent = txt ? "Зараз зачинено · відкриємо " + txt : "Зараз зачинено";
      }
      $$("li", hoursEl).forEach(function (li) { li.classList.toggle("is-today", +li.dataset.d === day); });
    };
    tick(); setInterval(tick, 60000);
  }

  /* ---- reveal on scroll ---- */
  if (!reduce && "IntersectionObserver" in window) {
    var targets = $$(".sec__head, .card, .pricelist__group, .calc__result, .sell__copy, .sell__form, .about__text, .why li, .steps li, .rev__card, .faq__list, .contacts__info, .contact__form");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach(function (t, i) {
      t.classList.add("rv");
      var sib = t.parentNode ? Array.prototype.indexOf.call(t.parentNode.children, t) : 0;
      t.style.transitionDelay = Math.min(sib, 4) * 70 + "ms";
      io.observe(t);
    });
  }
})();
