(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header + dock */
  var hdr = document.querySelector(".hdr");
  var dock = document.querySelector(".dock");
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    hdr.classList.toggle("is-solid", y > 40);
    if (dock) dock.classList.toggle("is-on", y > 420);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  var burger = document.querySelector(".burger");
  var nav = document.getElementById("nav");
  function setMenu(open) {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    hdr.classList.toggle("is-solid", open || (window.scrollY > 40));
  }
  burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); burger.focus(); } });

  /* Reveal */
  var rev = document.querySelectorAll(".reveal");
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    rev.forEach(function (el) { io.observe(el); });
  } else {
    rev.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* Service tabs */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  function selectTab(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute("aria-selected", String(on));
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) t.focus();
    if (t.scrollIntoView && t.parentNode.scrollWidth > t.parentNode.clientWidth) {
      t.parentNode.scrollTo({ left: t.offsetLeft - 16, behavior: reduce ? "auto" : "smooth" });
    }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      var k = e.key, n = null;
      if (k === "ArrowRight") n = tabs[(i + 1) % tabs.length];
      if (k === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (k === "Home") n = tabs[0];
      if (k === "End") n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });

  /* Prefill category from service buttons */
  var catSel = document.getElementById("f-cat");
  document.querySelectorAll("[data-cat]").forEach(function (a) {
    a.addEventListener("click", function () { catSel.value = a.getAttribute("data-cat"); });
  });

  /* Before / after slider */
  var frame = document.getElementById("ba");
  if (frame) {
    var range = frame.querySelector(".ba__range");
    var imgB = frame.querySelector(".ba__img--before");
    var imgA = frame.querySelector(".ba__img--after");
    var base = imgA.getAttribute("src").replace(/[^/]+$/, "");
    var sets = [
      { f: "nails3.jpg", w: 1100, h: 1755, b: "До процедури: нігті до манікюру", a: "Після процедури: доглянуті нігті з нюдовим покриттям" },
      { f: "face.jpg", w: 1100, h: 731, b: "До процедури: шкіра обличчя до чистки", a: "Після процедури: рівна, зволожена шкіра обличчя після чистки" },
      { f: "lashes.jpg", w: 1100, h: 1650, b: "До процедури: вії до нарощування", a: "Після процедури: нарощені вії з природним ефектом" }
    ];
    var setPos = function (p) {
      p = Math.max(0, Math.min(100, p));
      frame.style.setProperty("--pos", p + "%");
      range.value = Math.round(p);
    };
    var fromEvent = function (e) {
      var r = frame.getBoundingClientRect();
      setPos(((e.clientX - r.left) / r.width) * 100);
    };
    var dragging = false;
    frame.addEventListener("pointerdown", function (e) {
      dragging = true; frame.classList.add("is-drag");
      if (frame.setPointerCapture) frame.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    frame.addEventListener("pointermove", function (e) { if (dragging) fromEvent(e); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) {
      frame.addEventListener(ev, function () { dragging = false; frame.classList.remove("is-drag"); });
    });
    range.addEventListener("input", function () { setPos(+range.value); });
    frame.tabIndex = -1;

    document.querySelectorAll("[data-ba]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = sets[+b.getAttribute("data-ba")];
        document.querySelectorAll("[data-ba]").forEach(function (x) {
          x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", String(x === b));
        });
        [imgB, imgA].forEach(function (im) { im.src = base + s.f; im.width = s.w; im.height = s.h; });
        imgB.alt = s.b; imgA.alt = s.a;
        setPos(50);
      });
    });

    /* gentle hint once visible */
    if (!reduce && "IntersectionObserver" in window) {
      var hinted = false;
      var bio = new IntersectionObserver(function (ents) {
        if (ents[0].isIntersecting && !hinted) {
          hinted = true; bio.disconnect();
          var t0 = null;
          var step = function (ts) {
            if (dragging) return;
            if (!t0) t0 = ts;
            var k = Math.min(1, (ts - t0) / 1600);
            setPos(50 + Math.sin(k * Math.PI * 2) * 18 * (1 - k));
            if (k < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      }, { threshold: 0.6 });
      bio.observe(frame);
    }
  }

  /* Open / closed status (Kyiv time) */
  var st = document.getElementById("status");
  if (st) {
    try {
      var hours = JSON.parse(st.getAttribute("data-hours"));
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var get = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parts[i].value; return ""; };
      var wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get("weekday")];
      var mins = (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10);
      var toM = function (s) { var p = s.split(":"); return +p[0] * 60 + +p[1]; };
      var today = hours[wd];
      var txt = st.querySelector(".status__t");
      if (today && mins >= toM(today[0]) && mins < toM(today[1])) {
        st.classList.add("is-open"); txt.textContent = "Зараз відчинено · до " + today[1];
      } else {
        st.classList.add("is-closed");
        var next = null;
        for (var d = 0; d < 8; d++) {
          var day = (wd + d) % 7, h = hours[day];
          if (!h) continue;
          if (d === 0 && mins >= toM(h[0])) continue;
          next = { d: d, t: h[0] }; break;
        }
        var label = !next ? "" : next.d === 0 ? " · відкриємося о " + next.t : next.d === 1 ? " · завтра з " + next.t : " · відкриємося о " + next.t;
        txt.textContent = "Зараз зачинено" + label;
      }
    } catch (e) { /* keep default text */ }
  }

  /* Booking form */
  var form = document.getElementById("form");
  var ok = document.getElementById("form-ok");
  var dateIn = document.getElementById("f-date");
  if (dateIn) {
    var now = new Date();
    dateIn.min = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }
  function setErr(input, msg) {
    var f = input.closest(".field");
    f.classList.toggle("is-bad", !!msg);
    f.querySelector(".field__err").textContent = msg || "";
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  function validate() {
    var good = true, first = null;
    var name = form.elements.name, phone = form.elements.phone, cat = form.elements.cat;
    var digits = phone.value.replace(/\D/g, "");
    var checks = [
      [name, name.value.trim().length < 2 ? "Вкажіть, будь ласка, ім'я" : ""],
      [phone, digits.length < 9 || digits.length > 13 ? "Перевірте номер: наприклад, +380 67 123 45 67" : ""],
      [cat, !cat.value ? "Оберіть напрям або «потрібна консультація»" : ""]
    ];
    if (dateIn.value && dateIn.min && dateIn.value < dateIn.min) checks.push([dateIn, "Оберіть сьогоднішню або майбутню дату"]);
    else setErr(dateIn, "");
    checks.forEach(function (c) { setErr(c[0], c[1]); if (c[1]) { good = false; if (!first) first = c[0]; } });
    if (first) first.focus();
    return good;
  }
  ["name", "phone", "cat"].forEach(function (n) {
    form.elements[n].addEventListener("input", function () { if (this.closest(".field").classList.contains("is-bad")) setErr(this, ""); });
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;
    var el = form.elements;
    var dateTxt = el.date.value ? el.date.value.split("-").reverse().join(".") : "будь-яка";
    var lines = [
      "Заявка на запис з сайту",
      "Ім'я: " + el.name.value.trim(),
      "Телефон: " + el.phone.value.trim(),
      "Напрям: " + el.cat.value,
      "Дата: " + dateTxt + ", " + form.querySelector("input[name=time]:checked").value
    ];
    if (el.msg.value.trim()) lines.push("Коментар: " + el.msg.value.trim());
    var text = lines.join("\n");
    var via = form.querySelector("input[name=via]:checked").value;
    var url, newTab = false, copyOnly = false;
    if (via === "tg") { url = form.getAttribute("data-tg") + "?text=" + encodeURIComponent(text); newTab = true; }
    else if (via === "viber") url = form.getAttribute("data-viber") + "&draft=" + encodeURIComponent(text);
    else if (via === "sms") url = form.getAttribute("data-sms") + "?&body=" + encodeURIComponent(text);
    else if (via === "ig" || via === "fb") { url = form.getAttribute("data-" + via); newTab = true; copyOnly = true; }
    else url = form.getAttribute("data-mail") + "?subject=" + encodeURIComponent("Запис у FineLine") + "&body=" + encodeURIComponent(text);
    try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (err) {}
    var okMain = ok.querySelector(".form-ok__main");
    if (okMain) okMain.textContent = copyOnly
      ? "Текст заявки скопійовано. Вставте його в повідомлення " + (via === "ig" ? "в Instagram" : "у Facebook") + " і надішліть — ми підтвердимо запис."
      : "Ми відкрили " + (via === "mail" ? "пошту" : via === "sms" ? "SMS" : "месенджер") + " з текстом заявки. Надішліть повідомлення — і ми підтвердимо запис.";
    if (newTab) window.open(url, "_blank", "noopener"); else window.location.href = url;
    form.hidden = true; ok.hidden = false; ok.focus();
  });
  document.getElementById("form-again").addEventListener("click", function () {
    form.reset(); ok.hidden = true; form.hidden = false; form.elements.name.focus();
  });

  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
