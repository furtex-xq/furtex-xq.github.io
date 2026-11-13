/* Готель — шаблон. Без бібліотек. */
(function () {
  "use strict";

  /* ---------- НАЛАШТУВАННЯ ДЛЯ КЛІЄНТА ---------- */
  // Графік рецепції: [відкриття, закриття] у годинах (9.5 = 09:30; [0, 24] = цілодобово), null — зачинено. 0 = неділя.
  // Якщо графік невідомий — HOURS = null: статус і таблиця ховаються.
  var HOURS = null;
  var CONTACT = {
    telegram: "",
    viber: "",
    email: "",
    sms: "+380967013297",                       // "+380..." (лише мобільний) — варіант «SMS» у формі
    instagram: "",                 // нік — варіант «Instagram» у формі (ig.me)
    messenger: ""                  // ім'я сторінки Facebook — варіант «Messenger» (m.me)
  };
  // Ціни номерів: впишіть число в data-price="1800" у картці номера — тоді сума за всі ночі порахується сама.

  var y = document.querySelector("[data-year]"); if (y) y.textContent = new Date().getFullYear();
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
  window.addEventListener("resize", function () { if (window.innerWidth >= 1000 && nav.classList.contains("is-open")) closeNav(); });

  /* ---------- Шапка й нижня панель ---------- */
  var top = document.querySelector(".top");
  var dock = document.querySelector(".dock");
  var hero = document.querySelector(".hero");
  function onScroll() {
    var y = window.scrollY;
    top.classList.toggle("is-scrolled", y > 8);
    if (dock) dock.classList.toggle("is-on", y > hero.offsetHeight * 0.5);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Поява блоків ---------- */
  var revealSel = ".head, .room, .ledger, .about__media, .about__copy, .extras__grid, .around__card, .steps__list li, .review, .faq__list, .book-sec__in > *, .contacts > *";
  var items = document.querySelectorAll(revealSel);
  if ("IntersectionObserver" in window && !reduce) {
    items.forEach(function (el) { el.classList.add("reveal"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Київський час ---------- */
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday), h: parseInt(o.hour, 10) + parseInt(o.minute, 10) / 60, iso: o.year + "-" + o.month + "-" + o.day };
    } catch (e) { var d = new Date(); return { day: d.getDay(), h: d.getHours() + d.getMinutes() / 60, iso: d.toISOString().slice(0, 10) }; }
  }

  /* ---------- Графік і статус рецепції ---------- */
  var DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
  function fmt(h) { var m = Math.round((h % 1) * 60); return String(Math.floor(h)).padStart(2, "0") + ":" + String(m).padStart(2, "0"); }
  function allDay(s) { return s && s[0] === 0 && s[1] >= 24; }
  function nextOpen(now) {
    for (var i = 0; i < 8; i++) {
      var d = (now.day + i) % 7, s = HOURS[d];
      if (!s) continue;
      if (i === 0 && now.h >= s[0]) continue;
      return (i === 0 ? "сьогодні" : i === 1 ? "завтра" : DAYS[d].toLowerCase()) + " о " + fmt(s[0]);
    }
    return "";
  }
  function renderHours() {
    if (!HOURS) { document.querySelectorAll("[data-status],[data-hours]").forEach(function (el) { el.remove(); }); return false; }
    var now = kyivNow(), today = HOURS[now.day];
    var every = [0, 1, 2, 3, 4, 5, 6].every(function (d) { return allDay(HOURS[d]); });
    var open = !!today && now.h >= today[0] && now.h < today[1];
    var text = every ? "Рецепція працює цілодобово" : open ? (allDay(today) ? "Рецепція працює цілодобово" : "Рецепція зараз працює · до " + fmt(today[1])) : "Рецепція зараз зачинена · відкриється " + nextOpen(now);
    document.querySelectorAll("[data-status]").forEach(function (el) {
      el.classList.toggle("is-open", open); el.classList.toggle("is-closed", !open);
      el.querySelector("span").textContent = text;
    });
    var tb = document.querySelector("[data-hours] tbody");
    if (tb) {
      if (every) { tb.closest("table").remove(); return true; }
      var html = "";
      [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
        var s = HOURS[d];
        html += "<tr" + (d === now.day ? ' class="is-today"' : "") + "><td>" + DAYS[d] + "</td><td>" + (s ? (allDay(s) ? "цілодобово" : fmt(s[0]) + " – " + fmt(s[1])) : "зачинено") + "</td></tr>";
      });
      tb.innerHTML = html;
    }
    return true;
  }
  if (renderHours() !== false) setInterval(renderHours, 60000);

  /* ---------- Підбір номера ---------- */
  function plural(n, one, few, many) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; }
  function addDays(iso, n) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function nightsBetween(a, b) { if (!a || !b) return 0; return Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 864e5); }
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function dmy(iso) { return iso ? iso.split("-").reverse().join(".") : ""; }

  var picker = document.getElementById("picker");
  var pIn = picker.elements["in"], pOut = picker.elements.out;
  var gOut = document.getElementById("p-g");
  var guests = 2, MAXG = 8;
  var rooms = Array.prototype.slice.call(document.querySelectorAll(".room"));
  var maxCap = Math.max.apply(null, rooms.map(function (r) { return +r.dataset.cap; }));
  var biggest = rooms.filter(function (r) { return +r.dataset.cap === maxCap; })[0];
  var today = kyivNow().iso;

  pIn.min = today; pIn.value = today;
  pOut.min = addDays(today, 1); pOut.value = addDays(today, 1);

  function fixDates(src) {
    if (pIn.value && pIn.value < today) pIn.value = today;
    if (pIn.value) pOut.min = addDays(pIn.value, 1);
    if (pIn.value && (!pOut.value || pOut.value <= pIn.value)) pOut.value = addDays(pIn.value, src === "out" ? 1 : Math.max(1, lastNights));
  }
  var lastNights = 1;
  function update() {
    var n = nightsBetween(pIn.value, pOut.value);
    if (n > 0) lastNights = n;
    gOut.textContent = guests;
    picker.querySelector('[data-step="-1"]').disabled = guests <= 1;
    picker.querySelector('[data-step="1"]').disabled = guests >= MAXG;
    var moons = picker.querySelector(".moons");
    var shown = Math.min(n, 10);
    moons.innerHTML = new Array(shown + 1).join('<svg><use href="#i-moon"/></svg>') + (n > 10 ? "<span>+</span>" : "");
    picker.querySelector(".picker__n").textContent = n > 0 ? n + " " + plural(n, "ніч", "ночі", "ночей") : "оберіть дати";

    var fit = 0;
    rooms.forEach(function (r) {
      var cap = +r.dataset.cap, ok = cap >= guests;
      if (ok) fit++;
      r.classList.toggle("is-off", !ok);
      r.classList.toggle("is-fit", ok && guests > 1 && cap - guests <= 1);
      var t = r.querySelector("[data-total]"), price = parseInt(r.dataset.price, 10);
      t.textContent = n > 1 ? (price ? "за " + n + " " + plural(n, "ніч", "ночі", "ночей") + " — від " + money(price * n) + " грн" : "× " + n + " " + plural(n, "ніч", "ночі", "ночей")) : "";
      var f = r.querySelector("[data-fit]");
      f.textContent = ok ? "" : guests > maxCap ? "Для " + guests + " гостей підберемо два сусідні номери." : "Для " + guests + " " + plural(guests, "гостя", "гостей", "гостей") + " замало місця — подивіться номер «" + biggest.dataset.room + "».";
    });
    var sum = document.querySelector("[data-sum]");
    sum.innerHTML = n > 0 ? dmy(pIn.value) + " — " + dmy(pOut.value) + ", " + guests + " " + plural(guests, "гість", "гості", "гостей") + ": " +
      (fit ? "<b>" + fit + " " + plural(fit, "тип номера підходить", "типи номерів підходять", "типів номерів підходять") + "</b>" : "<b>напишіть нам — розселимо в кількох номерах</b>") : "";
  }
  picker.addEventListener("click", function (e) {
    var b = e.target.closest("[data-step]"); if (!b) return;
    guests = Math.min(MAXG, Math.max(1, guests + +b.dataset.step)); update();
  });
  pIn.addEventListener("change", function () { fixDates("in"); update(); });
  pOut.addEventListener("change", function () { fixDates("out"); update(); });
  picker.addEventListener("submit", function (e) {
    e.preventDefault(); fixDates(); update();
    document.getElementById("rooms").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    if (!reduce) setTimeout(function () {
      rooms.forEach(function (r) { r.classList.remove("is-swing"); if (!r.classList.contains("is-off")) { void r.offsetWidth; r.classList.add("is-swing"); } });
    }, 500);
  });
  update();

  /* ---------- Форма ---------- */
  var form = document.getElementById("book-form");
  if (!form) return;
  var fIn = form.elements["in"], fOut = form.elements.out;
  fIn.min = today; fOut.min = addDays(today, 1);
  fIn.addEventListener("change", function () { if (fIn.value) { fOut.min = addDays(fIn.value, 1); if (!fOut.value || fOut.value <= fIn.value) fOut.value = addDays(fIn.value, 1); } });

  document.querySelectorAll("[data-ask]").forEach(function (a) {
    a.addEventListener("click", function () {
      var r = a.closest(".room");
      form.elements.room.value = r.dataset.room;
      fIn.value = pIn.value; fOut.value = pOut.value;
      var g = form.elements.guests; g.value = guests > 4 ? "5+" : String(guests);
    });
  });

  function check(name) {
    var el = form.elements[name], ok = true;
    if (name === "name") ok = el.value.trim().length >= 2;
    if (name === "phone") ok = el.value.replace(/\D/g, "").length >= 10;
    if (name === "in") ok = !!el.value;
    if (name === "out") ok = !!el.value && (!fIn.value || el.value > fIn.value);
    el.closest(".fld").classList.toggle("is-bad", !ok);
    el.setAttribute("aria-invalid", String(!ok));
    return ok;
  }
  ["name", "phone", "in", "out"].forEach(function (n) {
    form.elements[n].addEventListener("blur", function () { if (this.value) check(n); });
    form.elements[n].addEventListener("input", function () { if (this.closest(".is-bad")) check(n); });
  });

  var ok = form.querySelector(".book__ok");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var res = ["name", "phone", "in", "out"].map(check);
    if (res.indexOf(false) !== -1) { form.querySelector(".is-bad input").focus(); return; }
    var f = form.elements, n = nightsBetween(f["in"].value, f.out.value);
    var lines = [
      "Добрий день! Хочу забронювати номер.",
      "Ім'я: " + f.name.value.trim(),
      "Телефон: " + f.phone.value.trim(),
      "Дати: " + dmy(f["in"].value) + " — " + dmy(f.out.value) + " (" + n + " " + plural(n, "ніч", "ночі", "ночей") + ")",
      "Гостей: " + f.guests.value,
      "Номер: " + (f.room.value || "порадьте, будь ласка")
    ];
    if (f.note.value.trim()) lines.push("Побажання: " + f.note.value.trim());
    var msg = lines.join("\n");
    var checked = form.querySelector('input[name="via"]:checked');
    var via = checked ? checked.value : "mail";
    var url = via === "sms" ? "sms:" + CONTACT.sms + "?&body=" + encodeURIComponent(msg)
      : via === "ig" ? "https://ig.me/m/" + CONTACT.instagram
      : via === "fb" ? "https://m.me/" + CONTACT.messenger
      : via === "viber" ? "viber://chat?number=" + CONTACT.viber + "&draft=" + encodeURIComponent(msg)
      : via === "mail" ? "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent("Бронювання номера " + dmy(f["in"].value)) + "&body=" + encodeURIComponent(msg)
      : "https://t.me/" + CONTACT.telegram + "?text=" + encodeURIComponent(msg);
    try { if (navigator.clipboard) navigator.clipboard.writeText(msg).catch(function () {}); } catch (err) {}
    ok.hidden = false; ok.focus();
    if (via === "tg" || via === "ig" || via === "fb") { window.open(url, "_blank", "noopener"); } else { window.location.href = url; }
  });
  form.querySelector("[data-again]").addEventListener("click", function () { ok.hidden = true; form.reset(); form.elements.name.focus(); });
})();
