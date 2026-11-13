/* Думасик — дитячий розвивальний центр. Vanilla JS, без бібліотек. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Контакти для форми (замініть разом із посиланнями в HTML) ----
     Канали форми: telegram, viber, email, sms, instagram, facebook.
     Для instagram/facebook текст копіюється в буфер і відкривається профіль. */
  var CONTACT = {
    sms: "+380671423592",
    facebook: "https://www.facebook.com/pages/category/Preschool/%D0%94%D1%83%D0%BC%D0%B0%D1%81%D0%B8%D0%BA-%D0%86%D0%A4-1149432738467152/"
  };

  /* ---- Header shadow + mobile menu ---- */
  var header = document.querySelector(".site-header");
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  function onScrollHeader() { header.classList.toggle("is-scrolled", window.scrollY > 8); }
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
    burger.querySelector("use").setAttribute("href", open ? "#i-x" : "#i-menu");
  }
  burger.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* ---- Reveal on scroll ---- */
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

  /* ---- Floating paper shapes: gentle parallax ---- */
  var shapes = Array.prototype.slice.call(document.querySelectorAll(".pshape[data-depth]"));
  if (shapes.length && !reduce) {
    var ticking = false;
    var paint = function () {
      var vh = window.innerHeight;
      shapes.forEach(function (s) {
        var box = s.parentNode.getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) return;
        var d = parseFloat(s.getAttribute("data-depth")) || 0;
        var offset = (box.top + box.height / 2 - vh / 2) * d;
        s.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0) rotate(" + (offset * 0.08).toFixed(1) + "deg)";
      });
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
    paint();
  }

  /* ---- Schedule board: age filter with FLIP reshuffle ---- */
  var board = document.getElementById("board");
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".af"));
  var countEl = document.getElementById("sch-count");
  var cards = board ? Array.prototype.slice.call(board.querySelectorAll(".cc")) : [];

  function plural(n) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return "заняття";
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "заняття";
    return "занять";
  }
  var AGE_LABEL = { "1-3": "1–3 роки", "3-5": "3–5 років", "5-7": "5–7 років", "7+": "7+ років" };

  function applyFilter(age, animate) {
    if (!board) return;
    var first = new Map();
    if (animate) cards.forEach(function (c) { if (!c.classList.contains("is-hidden")) first.set(c, c.getBoundingClientRect()); });

    var shown = 0;
    cards.forEach(function (c) {
      var ok = age === "all" || (" " + c.getAttribute("data-ages") + " ").indexOf(" " + age + " ") > -1;
      c.classList.toggle("is-hidden", !ok);
      if (ok) shown++;
    });
    board.querySelectorAll(".day").forEach(function (d) {
      d.classList.toggle("is-empty", !d.querySelector(".cc:not(.is-hidden)"));
    });
    buttons.forEach(function (b) {
      var on = b.getAttribute("data-age") === age;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    countEl.innerHTML = (age === "all" ? "Усього на тижні: " : "Для віку " + AGE_LABEL[age] + ": ") +
      "<strong>" + shown + "</strong> " + plural(shown);

    if (!animate || reduce || !cards[0].animate) return;
    cards.forEach(function (c, i) {
      if (c.classList.contains("is-hidden")) return;
      var last = c.getBoundingClientRect();
      var f = first.get(c);
      if (f) {
        var dx = f.left - last.left, dy = f.top - last.top;
        if (Math.abs(dx) + Math.abs(dy) < 1) return;
        c.animate([{ translate: dx + "px " + dy + "px" }, { translate: "0px 0px" }],
          { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
      } else {
        c.animate([
          { opacity: 0, translate: "0px -18px", scale: "0.9", rotate: (i % 2 ? 6 : -6) + "deg" },
          { opacity: 1, translate: "0px 0px", scale: "1", rotate: "0deg" }
        ], { duration: 480, delay: 40 + (i % 6) * 35, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
      }
    });
  }
  buttons.forEach(function (b) {
    b.addEventListener("click", function () { applyFilter(b.getAttribute("data-age"), true); });
  });
  document.querySelectorAll("[data-age-jump]").forEach(function (a) {
    a.addEventListener("click", function () { applyFilter(a.getAttribute("data-age-jump"), false); });
  });
  if (board) applyFilter("all", false);

  /* ---- Card "Записатися" prefills form ---- */
  var form = document.getElementById("book-form");
  var fClass = document.getElementById("f-class");
  var fAge = document.getElementById("f-age");
  document.querySelectorAll("[data-class]").forEach(function (a) {
    a.addEventListener("click", function () {
      var v = a.getAttribute("data-class");
      Array.prototype.forEach.call(fClass.options, function (o) { if (o.text === v) fClass.value = o.value || o.text; });
      var on = document.querySelector(".af.is-on");
      var age = on && on.getAttribute("data-age");
      if (age && AGE_LABEL[age]) fAge.value = AGE_LABEL[age];
    });
  });

  /* ---- Opening hours: open/closed by Kyiv time ---- */
  (function hours() {
    var status = document.getElementById("open-status");
    if (!status) return;
    var parts;
    try {
      parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    } catch (e) { return; }
    var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ""; };
    var dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    var now = (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10);
    var toMin = function (s) { var a = s.split(":"); return +a[0] * 60 + +a[1]; };
    var rows = Array.prototype.slice.call(document.querySelectorAll("#hours tr[data-days]"));
    var row = rows.filter(function (r) { return +r.getAttribute("data-days") === dayIdx; })[0];
    if (row) row.classList.add("is-today");
    var td = row && row.querySelector("td[data-open]");
    var text = status.querySelector(".status-text");
    if (td) {
      var o = toMin(td.getAttribute("data-open")), c = toMin(td.getAttribute("data-close"));
      if (now >= o && now < c) {
        status.setAttribute("data-state", "open");
        text.textContent = "Зараз відчинено · до " + td.getAttribute("data-close");
        return;
      }
      if (now < o) {
        status.setAttribute("data-state", "closed");
        text.textContent = "Зараз зачинено · відкриємося о " + td.getAttribute("data-open");
        return;
      }
    }
    status.setAttribute("data-state", "closed");
    for (var k = 1; k <= 7; k++) {
      var di = (dayIdx + k) % 7;
      var r = rows.filter(function (x) { return +x.getAttribute("data-days") === di; })[0];
      var t = r && r.querySelector("td[data-open]");
      if (t) {
        var name = k === 1 ? "завтра" : r.querySelector("th").textContent.toLowerCase();
        text.textContent = "Зараз зачинено · відкриємося " + name + " о " + t.getAttribute("data-open");
        return;
      }
    }
    text.textContent = "Зараз зачинено";
  })();

  /* ---- Booking form → Telegram / Viber / Email ---- */
  if (form) {
    var done = document.getElementById("form-done");
    var doneText = document.getElementById("done-text");
    var fields = {
      name: document.getElementById("f-name"),
      phone: document.getElementById("f-phone"),
      age: fAge
    };
    var checks = {
      name: function (v) { return v.trim().length >= 2; },
      phone: function (v) { return v.replace(/\D/g, "").length >= 10; },
      age: function (v) { return v !== ""; }
    };
    Object.keys(fields).forEach(function (k) {
      var el = fields[k];
      el.setAttribute("aria-describedby", "e-" + k);
      el.addEventListener(k === "age" ? "change" : "input", function () {
        if (checks[k](el.value)) { el.closest(".field").classList.remove("has-err"); el.removeAttribute("aria-invalid"); }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = null;
      Object.keys(fields).forEach(function (k) {
        var ok = checks[k](fields[k].value);
        fields[k].closest(".field").classList.toggle("has-err", !ok);
        if (!ok) { fields[k].setAttribute("aria-invalid", "true"); if (!firstBad) firstBad = fields[k]; }
        else fields[k].removeAttribute("aria-invalid");
      });
      if (firstBad) { firstBad.focus(); return; }

      var data = new FormData(form);
      var lines = [
        "Вітаю! Хочу записати дитину на пробне заняття.",
        "Ім’я: " + data.get("name").trim(),
        "Телефон: " + data.get("phone").trim(),
        "Вік дитини: " + data.get("age"),
        "Напрям: " + (data.get("class") || "ще не знаю, порадьте")
      ];
      var msg = String(data.get("msg") || "").trim();
      if (msg) lines.push("Коментар: " + msg);
      var text = lines.join("\n");
      var channel = data.get("channel");
      var url;

      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {});

      var copied = " Текст заявки скопійовано — вставте його в повідомлення, якщо поле порожнє.";
      if (channel === "viber" && CONTACT.viber) {
        window.location.href = CONTACT.viber + "&draft=" + encodeURIComponent(text);
        doneText.textContent = "Відкриваємо Viber з готовим текстом." + copied;
      } else if (channel === "email" && CONTACT.email) {
        window.location.href = "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent("Запис на пробне заняття") + "&body=" + encodeURIComponent(text);
        doneText.textContent = "Відкриваємо поштову програму з готовим листом — залишилося натиснути «Надіслати».";
      } else if (channel === "sms" && CONTACT.sms) {
        window.location.href = "sms:" + CONTACT.sms + "?&body=" + encodeURIComponent(text);
        doneText.textContent = "Відкриваємо SMS з готовим текстом — залишилося натиснути «Надіслати».";
      } else if ((channel === "instagram" || channel === "facebook") && CONTACT[channel]) {
        var wi = window.open(CONTACT[channel], "_blank", "noopener");
        if (!wi) window.location.href = CONTACT[channel];
        doneText.textContent = "Відкриваємо " + (channel === "instagram" ? "Instagram" : "Facebook") + ". Текст заявки скопійовано — вставте його в особисте повідомлення й надішліть.";
      } else if (CONTACT.telegram) {
        url = CONTACT.telegram + "?text=" + encodeURIComponent(text);
        var w = window.open(url, "_blank", "noopener");
        if (!w) window.location.href = url;
        doneText.textContent = "Відкриваємо Telegram." + copied;
      }
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });

    document.getElementById("form-again").addEventListener("click", function () {
      form.reset();
      done.hidden = true;
      form.hidden = false;
      fields.name.focus();
    });
  }

  var y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();
