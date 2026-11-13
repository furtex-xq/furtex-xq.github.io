/* Психолог — шаблон. Без бібліотек. */
(function () {
  "use strict";

  /* ---------- НАЛАШТУВАННЯ ДЛЯ КЛІЄНТА ---------- */
  // Години прийому: [початок, кінець] у годинах (9.5 = 09:30), null — вихідний. 0 = неділя.
  // Якщо графік невідомий — HOURS = null: статус і таблиця ховаються.
  var HOURS = null;
  // Канали для форми. Порожній рядок — канал вимкнено.
  var CONTACT = {
    telegram: "",                  // нік без @  → https://t.me/<нік>
    viber: "",      // номер для viber://chat?number=
    email: "",
    sms: "+380997603461",                       // "+380..." — SMS з готовим текстом
    instagram: ""                  // нік — Instagram Direct (ig.me/m/<нік>)
  };

  var doc = document.documentElement;
  doc.classList.remove("no-js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Меню ---------- */
  var burger = document.querySelector(".burger");
  var nav = document.getElementById("nav");
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
  window.addEventListener("resize", function () { if (window.innerWidth > 980 && nav.classList.contains("is-open")) closeNav(); });

  /* ---------- Шапка й нижня панель ---------- */
  var top = document.querySelector(".top");
  var dock = document.querySelector(".dock");
  var hero = document.querySelector(".hero");
  function onScroll() {
    var y = window.scrollY;
    top.classList.toggle("is-scrolled", y > 8);
    if (dock) dock.classList.toggle("is-on", y > hero.offsetHeight * 0.6);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Поява блоків ---------- */
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Години прийому за київським часом ---------- */
  var DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
  function fmt(h) { var m = Math.round((h % 1) * 60); return String(Math.floor(h)).padStart(2, "0") + ":" + String(m).padStart(2, "0"); }
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday), h: parseInt(o.hour, 10) + parseInt(o.minute, 10) / 60 };
    } catch (e) { var d = new Date(); return { day: d.getDay(), h: d.getHours() + d.getMinutes() / 60 }; }
  }
  var ACC = ["у неділю", "у понеділок", "у вівторок", "у середу", "у четвер", "у п'ятницю", "у суботу"];
  function allDay(s) { return s && s[0] === 0 && s[1] >= 24; }
  function nextOpen(now) {
    for (var i = 0; i < 8; i++) {
      var d = (now.day + i) % 7, s = HOURS[d];
      if (!s) continue;
      if (i === 0 && now.h >= s[0]) continue;
      return (i === 0 ? "сьогодні" : i === 1 ? "завтра" : ACC[d]) + " о " + fmt(s[0]);
    }
    return "";
  }
  function renderHours() {
    if (!HOURS) {
      document.querySelectorAll("[data-status],[data-hours]").forEach(function (el) { el.remove(); });
      return false;
    }
    var now = kyivNow(), today = HOURS[now.day];
    var open = !!today && now.h >= today[0] && now.h < today[1];
    var nx = nextOpen(now);
    var text = open ? (allDay(today) ? "Зараз на зв'язку" : "Зараз приймаю · до " + fmt(today[1])) : "Зараз не приймаю" + (nx ? " · наступний прийом " + nx : "");
    document.querySelectorAll("[data-status]").forEach(function (el) {
      el.classList.toggle("is-open", open); el.classList.toggle("is-closed", !open);
      el.querySelector("span").textContent = text;
    });
    var tb = document.querySelector("[data-hours] tbody");
    if (tb) {
      var html = "";
      [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
        var s = HOURS[d];
        html += "<tr" + (d === now.day ? ' class="is-today"' : "") + "><td>" + DAYS[d] + "</td><td>" + (s ? (allDay(s) ? "цілодобово" : fmt(s[0]) + " – " + fmt(s[1])) : "вихідний") + "</td></tr>";
      });
      tb.innerHTML = html;
    }
    return true;
  }
  if (renderHours() !== false) setInterval(renderHours, 60000);

  /* ---------- Самоперевірка «Що вас привело?» ---------- */
  var quiz = document.getElementById("quiz");
  var sky = document.querySelector(".sky");
  var rEmpty = document.querySelector(".result__empty");
  var rCard = document.querySelector(".result__card");
  var picked = "individual";
  var FORMATS = {
    individual: "Індивідуальна консультація",
    pair: "Консультація для пари",
    online: "Онлайн-сесія"
  };
  var MOOD = {
    1: "Добре, що ви помічаєте це вже зараз: що раніше почати, то легше розібратися.",
    2: "Коли «хмарно» триває тижнями, це вагома причина прийти. Почнемо з того, що саме забирає сили.",
    3: "Не обов'язково тримати все самотужки. Підберемо найближчий вільний час.",
    4: "Вам зараз дуже важко — і це не слабкість. Напишіть, що потрібна найближча зустріч."
  };
  function val(name) { var el = quiz.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ""; }
  function updateQuiz() {
    var who = val("who"), where = val("where"), w = val("weather");
    sky.setAttribute("data-weather", w || "0");
    if (!who || !where || !w) return;
    var title, text, fmtKey;
    if (who === "pair") {
      fmtKey = "pair";
      title = where === "online" ? "Консультація для пари — онлайн" : FORMATS.pair;
      text = "Зустріч на 80 хвилин для вас обох. Шукаємо не винного, а спосіб знову чути одне одного." + (where === "online" ? " Можна підключатися з одного ноутбука або кожен зі свого." : "");
    } else if (where === "online") {
      fmtKey = "online";
      title = FORMATS.online;
      text = who === "family" ? "Почнемо з вас — а на першій зустрічі вирішимо, чи варто запрошувати когось із близьких." : "50 хвилин через Zoom чи Google Meet. Потрібні лише навушники і кімната, де вас ніхто не чує.";
    } else {
      fmtKey = "individual";
      title = who === "unsure" ? "Перша зустріч-знайомство" : FORMATS.individual;
      text = who === "unsure" ? "Не обов'язково знати, з чого почати. На першій зустрічі розберемося разом — і ви вирішите, чи продовжувати."
        : who === "family" ? "Почнемо з вас — а на першій зустрічі вирішимо, чи варто запрошувати когось із близьких."
        : "50 хвилин розмови наодинці — про те, що турбує саме вас.";
    }
    picked = fmtKey;
    rCard.querySelector("[data-r-title]").textContent = title;
    rCard.querySelector("[data-r-text]").textContent = text;
    rCard.querySelector("[data-r-meta]").textContent = MOOD[w] || "";
    rCard.querySelector("[data-r-sos]").hidden = w !== "4";
    rEmpty.hidden = true;
    var wasHidden = rCard.hidden;
    rCard.hidden = false;
    if (!wasHidden && !reduce) { rCard.style.animation = "none"; void rCard.offsetWidth; rCard.style.animation = ""; }
  }
  quiz.addEventListener("change", updateQuiz);
  quiz.addEventListener("submit", function (e) { e.preventDefault(); });

  /* ---------- Форма запису ---------- */
  var form = document.getElementById("bform");
  function pick(fmtKey) {
    document.querySelectorAll(".ledger li.is-hl").forEach(function (x) { x.classList.remove("is-hl"); });
    var li = document.querySelector('.ledger li[data-fmt="' + fmtKey + '"]');
    if (li) li.classList.add("is-hl");
    if (form) form.elements.format.value = fmtKey;
  }
  var rBook = document.querySelector("[data-r-book]");
  if (rBook) rBook.addEventListener("click", function () { pick(picked); });
  document.querySelectorAll(".ledger li[data-fmt]").forEach(function (li) {
    if (!form) return;
    li.style.cursor = "pointer";
    li.title = "Записатися на цей формат";
    li.addEventListener("click", function () { pick(li.dataset.fmt); document.getElementById("book").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); });
  });

  if (form) {
    var check = function (name) {
      var el = form.elements[name], ok = true;
      if (name === "name") ok = el.value.trim().length >= 2;
      if (name === "phone") ok = el.value.replace(/\D/g, "").length >= 10;
      el.closest(".fld").classList.toggle("is-bad", !ok);
      el.setAttribute("aria-invalid", String(!ok));
      return ok;
    };
    ["name", "phone"].forEach(function (n) {
      form.elements[n].addEventListener("blur", function () { if (this.value) check(n); });
      form.elements[n].addEventListener("input", function () { if (this.closest(".is-bad")) check(n); });
    });
    var ok = form.querySelector(".bform__ok");
    var okText = ok.querySelector("[data-ok-text]");
    var okDefault = okText.textContent;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = check("name"), b = check("phone");
      if (!a || !b) { form.querySelector(".is-bad input").focus(); return; }
      var f = form.elements;
      var times = Array.prototype.filter.call(form.querySelectorAll('input[name="time"]'), function (x) { return x.checked; }).map(function (x) { return x.value; });
      var lines = [
        "Добрий день! Хочу записатися на консультацію.",
        "Ім'я: " + f.name.value.trim(),
        "Телефон: " + f.phone.value.trim(),
        "Формат: " + (f.format.value ? f.format.options[f.format.selectedIndex].text : "ще не знаю, підкажіть"),
        "Зручний час: " + (times.length ? times.join(", ") : "будь-який")
      ];
      if (f.note.value.trim()) lines.push("Коментар: " + f.note.value.trim());
      var msg = lines.join("\n");
      var chosen = form.querySelector('input[name="via"]:checked');
      var via = chosen ? chosen.value : "";
      var url = via === "sms" ? "sms:" + CONTACT.sms + "?&body=" + encodeURIComponent(msg)
        : via === "ig" ? "https://ig.me/m/" + CONTACT.instagram
        : via === "viber" ? "viber://chat?number=" + CONTACT.viber + "&draft=" + encodeURIComponent(msg)
        : via === "mail" ? "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent("Запис на консультацію") + "&body=" + encodeURIComponent(msg)
        : via === "tg" ? "https://t.me/" + CONTACT.telegram + "?text=" + encodeURIComponent(msg) : "";
      try { if (navigator.clipboard) navigator.clipboard.writeText(msg).catch(function () {}); } catch (err) {}
      okText.textContent = via === "ig" ? "Відкрився Instagram Direct. Текст заявки скопійовано — вставте його в повідомлення і натисніть «Надіслати»." : okDefault;
      ok.hidden = false; ok.focus();
      if (!url) return;
      if (via === "tg" || via === "ig") { window.open(url, "_blank", "noopener"); } else { window.location.href = url; }
    });
    form.querySelector("[data-again]").addEventListener("click", function () { ok.hidden = true; form.reset(); form.elements.name.focus(); });
  }

  /* ---------- Рік ---------- */
  var y = document.querySelector("[data-year]"); if (y) y.textContent = new Date().getFullYear();
})();
