(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- header: menu + scrolled state ---------- */
  var top = $(".top"), burger = $(".burger"), nav = $("#nav");
  function closeMenu() { nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Відкрити меню"); }
  burger.addEventListener("click", function () {
    var open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
  });
  $$("a", nav).forEach(function (a) { a.addEventListener("click", closeMenu); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  function onScroll() { top.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- open / closed by Kyiv time (reads the hours table) ---------- */
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: days[o.weekday], min: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
    } catch (e) { var d = new Date(); return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() }; }
  }
  function toMin(t) { if (!t) return null; var p = t.split(":"); return +p[0] * 60 + +p[1]; }
  var dayNames = ["у неділю", "у понеділок", "у вівторок", "у середу", "у четвер", "у п'ятницю", "у суботу"];
  function updateStatus() {
    var rows = $$(".hours__t tr[data-day]"); if (!rows.length) return;
    var sched = {}; rows.forEach(function (r) { sched[r.dataset.day] = { o: toMin(r.dataset.open), c: toMin(r.dataset.close), el: r }; });
    var now = kyivNow(), today = sched[now.day];
    rows.forEach(function (r) { r.classList.toggle("is-today", +r.dataset.day === now.day); });
    var open = today && today.o !== null && now.min >= today.o && now.min < today.c, text;
    if (open) { text = "Зараз відчинено · до " + today.el.dataset.close; }
    else {
      text = "Зараз зачинено";
      for (var i = 0; i < 8; i++) {
        var d = (now.day + i) % 7, s = sched[d];
        if (!s || s.o === null) continue;
        if (i === 0 && now.min >= s.o) continue;
        text += " · відкриємось " + (i === 0 ? "сьогодні" : i === 1 ? "завтра" : dayNames[d]) + " о " + s.el.dataset.open; break;
      }
    }
    $$("[data-status]").forEach(function (el) {
      el.classList.toggle("is-open", !!open); el.classList.toggle("is-closed", !open);
      $("[data-status-text]", el).textContent = text;
    });
  }
  updateStatus(); setInterval(updateStatus, 60000);

  /* ---------- pet picker (signature) ---------- */
  var SIZES = {
    dog: [
      { v: "xs", t: "Міні", s: "до 5 кг", w: 120, k: 0 },
      { v: "s", t: "Малий", s: "5–10 кг", w: 150, k: 0 },
      { v: "m", t: "Середній", s: "10–25 кг", w: 185, k: 1 },
      { v: "l", t: "Великий", s: "25+ кг", w: 220, k: 2 }
    ],
    cat: [
      { v: "s", t: "Мініатюрний", s: "до 4 кг", w: 130, k: 0 },
      { v: "m", t: "Звичайний", s: "4–6 кг", w: 160, k: 0 },
      { v: "l", t: "Великий", s: "мейн-кун та ін.", w: 195, k: 1 }
    ]
  };
  var COATS = {
    dog: [
      { v: "smooth", t: "Коротка", s: "мопс, лабрадор, такса" },
      { v: "long", t: "Довга", s: "шпіц, йорк, ши-тцу" },
      { v: "curly", t: "Кучерява", s: "пудель, бішон, мальтипу" },
      { v: "wire", t: "Жорстка", s: "шнауцер, тер'єри" }
    ],
    cat: [
      { v: "short", t: "Коротка", s: "британці, шотландці" },
      { v: "long", t: "Довга", s: "перси, мейн-куни" }
    ]
  };
  var PACKS = {
    "dog-smooth": { n: "Купання + експрес-линька", l: ["Купання шампунем під тип шерсті", "Вичісування мертвого підшерстку", "Сушка компресором", "Кігті та чистка вух"], t: [1, 1.5] },
    "dog-long": { n: "Комплекс для довгої шерсті", l: ["Купання, маска від колтунів", "Сушка з витягуванням шерсті", "Гігієнічна стрижка лап, паху й морди", "Розчісування та легке оформлення силуету", "Кігті та чистка вух"], t: [1.5, 2] },
    "dog-curly": { n: "Модельна стрижка", l: ["Купання й кондиціонер для кучерів", "Сушка «на пух»", "Стрижка за стандартом породи або за вашим фото", "Кігті та чистка вух"], t: [2, 2.5] },
    "dog-wire": { n: "Тримінг + купання", l: ["Вищипування відмерлої остьової шерсті", "Оформлення бороди й брів", "Купання та сушка", "Кігті та чистка вух"], t: [2, 3] },
    "cat-short": { n: "Експрес-линька для кота", l: ["Вичісування підшерстку", "Купання спеціальним шампунем для котів", "Сушка тихим феном", "Кігті та чистка вух"], t: [1, 1.5] },
    "cat-long": { n: "Комплекс для пухнастого кота", l: ["Розчісування колтунів або стрижка «під лева» на вибір", "Купання й сушка", "Гігієнічна зона", "Кігті та чистка вух"], t: [1.5, 2.5] }
  };
  var pf = $("#pickerForm");
  if (pf) {
    var sizesBox = $("[data-sizes]", pf), coatsBox = $("[data-coats]", pf);
    var petSvg = $(".pet--pick"), petUse = $("[data-pet-use]");
    var rName = $("[data-r-name]"), rList = $("[data-r-list]"), rTime = $("[data-r-time]"), rSize = $("[data-r-sizelabel]"), rBook = $("[data-r-book]");
    var chip = function (name, o, checked) {
      return '<label class="chip"><input type="radio" name="' + name + '" value="' + o.v + '"' + (checked ? " checked" : "") + '><span>' + o.t + "<small>" + o.s + "</small></span></label>";
    };
    var fmt = function (h) { return String(h).replace(".", ","); };
    var current = {};
    var renderOptions = function (sp) {
      var keepSize = pf.elements.size ? pf.elements.size.value : "s";
      var sizes = SIZES[sp], coats = COATS[sp];
      var sizeIdx = sizes.map(function (x) { return x.v; }).indexOf(keepSize); if (sizeIdx < 0) sizeIdx = 1;
      sizesBox.innerHTML = sizes.map(function (o, i) { return chip("size", o, i === sizeIdx); }).join("");
      coatsBox.innerHTML = coats.map(function (o, i) { return chip("coat", o, i === 1); }).join("");
    };
    var wag = function () {
      if (reduce) return;
      petSvg.classList.add("is-happy");
      clearTimeout(wag.t); wag.t = setTimeout(function () { petSvg.classList.remove("is-happy"); }, 1300);
    };
    var update = function () {
      var sp = pf.elements.species.value;
      var size = SIZES[sp].filter(function (x) { return x.v === pf.elements.size.value; })[0] || SIZES[sp][0];
      var coat = pf.elements.coat.value;
      var p = PACKS[sp + "-" + coat];
      var vetEl = $("#addVet"), vet = !!(vetEl && vetEl.checked);
      petUse.setAttribute("href", sp === "cat" ? "#cat" : "#dog");
      petSvg.style.setProperty("--pet-w", size.w + "px");
      rSize.textContent = size.t + " · " + size.s;
      rName.textContent = p.n;
      var items = p.l.map(function (x) { return '<li><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg><span>' + x + "</span></li>"; });
      if (vet) items.unshift('<li class="is-vet"><svg class="ic" aria-hidden="true"><use href="#i-steth"/></svg><span>Огляд ветеринара: шкіра, вуха, очі, зуби</span></li>');
      rList.innerHTML = items.join("");
      var t0 = p.t[0] + size.k * 0.5 + (vet ? 0.5 : 0), t1 = p.t[1] + size.k * 0.5 + (vet ? 0.5 : 0);
      rTime.textContent = fmt(t0) + "–" + fmt(t1) + " год";
      current = { sp: sp, size: size, coat: (COATS[sp].filter(function (x) { return x.v === coat; })[0] || {}).t, pack: p.n, vet: vet };
      wag();
    };
    pf.addEventListener("change", function (e) {
      if (e.target.name === "species") renderOptions(e.target.value);
      update();
    });
    renderOptions("dog"); update();
    rBook.addEventListener("click", function () {
      var f = $("#bookForm"); if (!f) return;
      f.elements.pet.value = current.sp === "cat" ? "Кіт або кішка" : "Собака";
      var svc = current.sp === "cat" ? "Грумінг кота" : ({ "Тримінг + купання": "Тримінг", "Купання + експрес-линька": "Експрес-линька" }[current.pack] || "Комплексний грумінг");
      f.elements.service.value = svc;
      f.elements.note.value = "Пакет: " + current.pack + " (" + current.size.t.toLowerCase() + ", " + current.size.s + ", шерсть: " + String(current.coat).toLowerCase() + ")" + (current.vet ? ". Додати огляд ветеринара." : ".");
    });
  }

  /* ---------- price tabs ---------- */
  var tabs = $$(".tab");
  function selectTab(t) {
    tabs.forEach(function (x) {
      var on = x === t; x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var n = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length]; selectTab(n); n.focus();
    });
  });

  /* ---------- booking form → Telegram / Viber / e-mail ---------- */
  var form = $("#bookForm"), done = $("#bookDone");
  if (form) {
    var dateIn = form.elements.date;
    var todayISO = (function () { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); })();
    dateIn.min = todayISO;
    var setBad = function (el, bad) { el.closest(".field").classList.toggle("is-bad", bad); el.setAttribute("aria-invalid", String(bad)); };
    var checks = {
      name: function (v) { return v.trim().length >= 2; },
      phone: function (v) { return v.replace(/\D/g, "").length >= 10; },
      pet: function (v) { return !!v; },
      service: function (v) { return !!v; },
      date: function (v) { return !v || v >= todayISO; }
    };
    Object.keys(checks).forEach(function (k) {
      form.elements[k].addEventListener("input", function () { if (this.closest(".field").classList.contains("is-bad")) setBad(this, !checks[k](this.value)); });
      form.elements[k].addEventListener("change", function () { if (this.closest(".field").classList.contains("is-bad")) setBad(this, !checks[k](this.value)); });
    });
    var lastMsg = "";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = null;
      Object.keys(checks).forEach(function (k) {
        var el = form.elements[k], bad = !checks[k](el.value); setBad(el, bad); if (bad && !firstBad) firstBad = el;
      });
      if (firstBad) { firstBad.focus(); return; }
      var v = function (k) { return form.elements[k].value.trim(); };
      var dateTxt = v("date") ? v("date").split("-").reverse().join(".") : "домовимось";
      var lines = [
        "Добрий день! Хочу записатися.",
        "Ім'я: " + v("name"),
        "Телефон: " + v("phone"),
        "Тварина: " + v("pet") + (v("breed") ? " — " + v("breed") : ""),
        "Послуга: " + v("service"),
        "Бажана дата: " + dateTxt
      ];
      if (v("note")) lines.push("Коментар: " + v("note"));
      lastMsg = lines.join("\n");
      var chIn = form.querySelector("input[name=channel]:checked") || form.querySelector("input[name=channel]");
      var ch = chIn ? chIn.value : "copy", href = chIn ? chIn.getAttribute("data-href") : "", enc = encodeURIComponent(lastMsg), url = "", info;
      if (ch === "viber") { url = href + "&draft=" + enc; info = "Відкриваємо Viber із готовим текстом. Якщо він не відкрився — скопіюйте текст нижче й надішліть нам."; }
      else if (ch === "email") { url = href + "?subject=" + encodeURIComponent("Запис на грумінг") + "&body=" + enc; info = "Відкриваємо поштову програму з готовим листом — залишилось натиснути «Надіслати»."; }
      else if (ch === "sms") { url = href + "?&body=" + enc; info = "Відкриваємо SMS із готовим текстом — залишилось натиснути «Надіслати»."; }
      else if (ch === "telegram" || ch === "instagram") { url = href; info = "Текст заявки скопійовано. У " + (ch === "telegram" ? "Telegram" : "Instagram") + ", що відкрився, вставте його в чат і надішліть."; copy(lastMsg); }
      else { info = "Скопіюйте текст заявки нижче й надішліть нам у зручний спосіб."; copy(lastMsg); }
      if (url) { if (ch === "telegram" || ch === "instagram") window.open(url, "_blank", "noopener"); else window.location.href = url; }
      $("[data-done-msg]").textContent = lastMsg;
      $("[data-done-text]").textContent = info;
      form.hidden = true; done.hidden = false; done.focus();
    });
    var copy = function (txt) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt).catch(function () {});
      var ta = document.createElement("textarea"); ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta);
    };
    $("[data-copy]").addEventListener("click", function () { copy(lastMsg); this.lastChild.textContent = "Скопійовано"; });
    $("[data-again]").addEventListener("click", function () { form.reset(); dateIn.min = todayISO; done.hidden = true; form.hidden = false; $("[data-copy]").lastChild.textContent = "Скопіювати текст"; form.elements.name.focus(); });
  }

  /* ---------- reveal on scroll ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    var targets = $$(".sec-head, .picker__box, .plist, .panel__img, .about__photos, .promises li, .steps li, .rev__card, .faq__list, .form, .contacts__info, .map");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach(function (t) { t.classList.add("rv"); io.observe(t); });
  }

  var y = $("[data-year]"); if (y) y.textContent = new Date().getFullYear();
})();
