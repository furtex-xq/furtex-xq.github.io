/* Масажний кабінет — шаблон. Без бібліотек. */
(function () {
  "use strict";

  /* ---------- НАЛАШТУВАННЯ ДЛЯ КЛІЄНТА ---------- */
  // Графік: [відкриття, закриття] у годинах (можна 9.5 = 09:30), null — вихідний. 0 = неділя.
  // Якщо графік невідомий — HOURS = null: статус «відчинено» і таблиця ховаються.
  var HOURS = null;
  var CONTACT = {
    telegram: "",          
    viber: "",      
    email: "",
    sms: "+380989202946",                       // "+380..." — варіант «SMS» у формі
    instagram: "massage_ivanka_if"                  // нік — варіант «Instagram» у формі (ig.me)
  };

  var doc = document.documentElement;
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

  /* ---------- Шапка й нижня панель ---------- */
  var top = document.querySelector(".top");
  var dock = document.querySelector(".dock");
  var hero = document.querySelector(".hero");
  function onScroll() {
    var y = window.scrollY;
    top.classList.toggle("is-scrolled", y > 8);
    dock.classList.toggle("is-on", y > hero.offsetHeight * 0.55);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Поява блоків ---------- */
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Графік і статус «відчинено» за київським часом ---------- */
  var DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
  function fmt(h) { var m = Math.round((h % 1) * 60); return String(Math.floor(h)).padStart(2, "0") + ":" + String(m).padStart(2, "0"); }
  function kyivNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday);
      return { day: wd, h: parseInt(o.hour, 10) + parseInt(o.minute, 10) / 60 };
    } catch (e) { var d = new Date(); return { day: d.getDay(), h: d.getHours() + d.getMinutes() / 60 }; }
  }
  function nextOpen(now) {
    for (var i = 0; i < 8; i++) {
      var d = (now.day + i) % 7, s = HOURS[d];
      if (!s) continue;
      if (i === 0 && now.h >= s[0]) continue;
      return (i === 0 ? "сьогодні" : i === 1 ? "завтра" : DAYS[d].toLowerCase()) + " о " + fmt(s[0]);
    }
    return "";
  }
  function allDay(s) { return s && s[0] === 0 && s[1] >= 24; }
  function renderHours() {
    if (!HOURS) {
      document.querySelectorAll("[data-status],[data-hours]").forEach(function (el) { el.remove(); });
      return false;
    }
    var now = kyivNow(), today = HOURS[now.day];
    var open = !!today && now.h >= today[0] && now.h < today[1];
    var text = open ? (allDay(today) ? "Відчинено цілодобово" : "Зараз відчинено · до " + fmt(today[1])) : "Зараз зачинено · відкриємось " + nextOpen(now);
    document.querySelectorAll("[data-status]").forEach(function (el) {
      el.classList.toggle("is-open", open); el.classList.toggle("is-closed", !open);
      el.querySelector("span").textContent = text;
    });
    var tb = document.querySelector("[data-hours] tbody");
    if (tb) {
      var order = [1, 2, 3, 4, 5, 6, 0], html = "";
      order.forEach(function (d) {
        var s = HOURS[d];
        html += '<tr' + (d === now.day ? ' class="is-today"' : "") + "><td>" + DAYS[d] + "</td><td>" + (s ? (allDay(s) ? "цілодобово" : fmt(s[0]) + " – " + fmt(s[1])) : "вихідний") + "</td></tr>";
      });
      tb.innerHTML = html;
    }
    return true;
  }
  if (renderHours() !== false) setInterval(renderHours, 60000);

  /* ---------- Карта тіла ---------- */
  var ZONES = {
    head: { name: "Голова", at: [120, 38], why: "Стискає скроні, важка голова ввечері, погано засинаєте — часто це напруга шкіри голови й потилиці.",
      svc: [["head", "Масаж голови", "скроні, потилиця, шкіра голови", "30 хв"], ["face", "Ручний масаж обличчя", "жувальні м'язи, лоб, вилиці", "40 хв"], ["aroma", "Релакс-масаж з аромаолією", "якщо голова «гуде» від утоми", "60 хв"]] },
    neck: { name: "Шия і плечі", at: [120, 96], why: "Плечі підтягнуті до вух, шия не повертається до кінця — класика для тих, хто довго сидить за екраном чи кермом.",
      svc: [["collar", "Шийно-комірцева зона", "найшвидший спосіб відпустити плечі", "30 хв"], ["classic", "Класичний масаж спини", "шия, плечі та вся спина разом", "40 хв"], ["stones", "Масаж гарячим камінням", "глибокий прогрів трапецієподібних м'язів", "75 хв"]] },
    back: { name: "Спина", at: [120, 158], why: "Ниє між лопатками, важко випрямитися після робочого дня, затерпає спина у вимушеній позі.",
      svc: [["classic", "Класичний масаж спини", "розминання вздовж хребта", "40 хв"], ["therapy", "Лікувальний масаж спини", "коли болить регулярно — краще курсом", "50 хв"], ["stones", "Масаж гарячим камінням", "якщо хочеться і зняти біль, і відпочити", "75 хв"]] },
    lower: { name: "Поперек", at: [120, 224], why: "Тягне поперек після сидіння, спортзалу чи роботи на городі. Гострий біль — спершу до лікаря.",
      svc: [["therapy", "Лікувальний масаж спини", "акцент на поперековому відділі", "50 хв"], ["herbal", "Масаж трав'яними мішечками", "теплом розслабляє глибокі м'язи", "60 хв"], ["sport", "Спортивний масаж", "після навантажень і тренувань", "60 хв"]] },
    arms: { name: "Руки", at: [54, 205], why: "Ниють передпліччя від мишки й клавіатури, втомлюються кисті, затерпають пальці.",
      svc: [["hands", "Масаж рук і передпліч", "кисті, зап'ястя, передпліччя", "30 хв"], ["collar", "Шийно-комірцева зона", "часто затерпання рук іде від шиї", "30 хв"], ["full", "Загальний масаж тіла", "коли втомлене все одразу", "90 хв"]] },
    hips: { name: "Стегна і сідниці", at: [120, 278], why: "Хочете підтягнути силует, позбутися відчуття важкості, підготуватися до сезону.",
      svc: [["cellulite", "Антицелюлітний масаж", "результат помітний курсом", "45 хв"], ["lymph", "Лімфодренажний масаж", "менше набряків і важкості", "60 хв"], ["sport", "Спортивний масаж", "сідничні м'язи після тренувань", "60 хв"]] },
    legs: { name: "Ноги", at: [100, 365], why: "Набрякають і гудуть ноги до вечора, важкість після перельоту чи цілого дня на ногах.",
      svc: [["lymph", "Лімфодренажний масаж", "м'які ритмічні рухи знизу вгору", "60 хв"], ["sport", "Спортивний масаж", "литки й стегна після бігу та залу", "60 хв"], ["feet", "Масаж стоп і гомілок", "коротко й дуже приємно", "40 хв"]] },
    feet: { name: "Стопи", at: [101, 443], why: "Цілий день на ногах, незручне взуття, хочеться просто полегшення.",
      svc: [["feet", "Масаж стоп і гомілок", "тепла ванночка і масаж", "40 хв"], ["aroma", "Релакс-масаж з аромаолією", "від стоп до плечей, повільно", "60 хв"], ["lymph", "Лімфодренажний масаж", "якщо до вечора набрякають ноги", "60 хв"]] }
  };
  var advice = document.querySelector(".advice");
  var zoneBtns = document.querySelectorAll(".zones button");
  var shapes = document.querySelectorAll(".figure__zones [data-zone]");
  var pulse = document.querySelector(".figure__pulse");
  var current = "neck";
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function setZone(key, animate) {
    var z = ZONES[key]; if (!z) return;
    current = key;
    zoneBtns.forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.zone === key)); b.tabIndex = b.dataset.zone === key ? 0 : -1; });
    shapes.forEach(function (s) { s.classList.toggle("is-active", s.dataset.zone === key); });
    pulse.setAttribute("cx", z.at[0]); pulse.setAttribute("cy", z.at[1]);
    advice.querySelector("[data-advice-zone]").textContent = z.name;
    advice.querySelector("[data-advice-why]").textContent = z.why;
    advice.querySelector("[data-advice-list]").innerHTML = z.svc.map(function (s) {
      return '<li><b>' + esc(s[1]) + '</b><em>' + esc(s[3]) + ' · від <span class="ph">[ЦІНА]</span> грн</em><small>' + esc(s[2]) + "</small></li>";
    }).join("");
    if (animate && !reduce) { advice.classList.remove("is-swap"); void advice.offsetWidth; advice.classList.add("is-swap"); }
  }
  zoneBtns.forEach(function (b, i) {
    b.addEventListener("click", function () { setZone(b.dataset.zone, true); });
    b.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!d) return; e.preventDefault();
      var n = zoneBtns[(i + d + zoneBtns.length) % zoneBtns.length]; n.focus(); setZone(n.dataset.zone, true);
    });
  });
  shapes.forEach(function (s) { s.addEventListener("click", function () { setZone(s.dataset.zone, true); }); });
  setZone("neck", false);

  /* ---------- Форма ---------- */
  var form = document.getElementById("book");
  var sel = form.elements.service;
  function pick(svc) {
    if (!svc) return;
    sel.value = svc;
    var li = document.querySelector('.plist li[data-svc="' + svc + '"]');
    document.querySelectorAll(".plist li.is-hl").forEach(function (x) { x.classList.remove("is-hl"); });
    if (li) li.classList.add("is-hl");
  }
  document.querySelector("[data-advice-book]").addEventListener("click", function () {
    pick(ZONES[current].svc[0][0]);
    var note = form.elements.note;
    if (!note.value) note.value = "Зона: " + ZONES[current].name.toLowerCase();
  });
  document.querySelectorAll("[data-pick]").forEach(function (a) { a.addEventListener("click", function () { pick(a.dataset.pick); }); });
  document.querySelectorAll(".plist li[data-svc]").forEach(function (li) {
    li.style.cursor = "pointer";
    li.title = "Записатися на цей масаж";
    li.addEventListener("click", function () { pick(li.dataset.svc); form.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); });
  });

  var date = form.elements.date;
  try { date.min = new Date().toISOString().slice(0, 10); } catch (e) {}

  function check(name) {
    var el = form.elements[name], ok = true;
    if (name === "name") ok = el.value.trim().length >= 2;
    if (name === "phone") ok = el.value.replace(/\D/g, "").length >= 10;
    el.closest(".fld").classList.toggle("is-bad", !ok);
    el.setAttribute("aria-invalid", String(!ok));
    return ok;
  }
  ["name", "phone"].forEach(function (n) {
    form.elements[n].addEventListener("blur", function () { if (this.value) check(n); });
    form.elements[n].addEventListener("input", function () { if (this.closest(".is-bad")) check(n); });
  });

  var ok = form.querySelector(".book__ok");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var a = check("name"), b = check("phone");
    if (!a || !b) { form.querySelector(".is-bad input").focus(); return; }
    var f = form.elements;
    var svcText = sel.value ? sel.options[sel.selectedIndex].text : "підкажіть, будь ласка";
    var d = f.date.value ? f.date.value.split("-").reverse().join(".") : "будь-який";
    var lines = [
      "Добрий день! Хочу записатися на масаж.",
      "Ім'я: " + f.name.value.trim(),
      "Телефон: " + f.phone.value.trim(),
      "Масаж: " + svcText,
      "Бажаний день: " + d + (f.time.value ? ", " + f.time.value.toLowerCase() : ""),
    ];
    if (f.note.value.trim()) lines.push("Коментар: " + f.note.value.trim());
    var msg = lines.join("\n");
    var via = form.querySelector('input[name="via"]:checked').value;
    var url = via === "sms" ? "sms:" + CONTACT.sms + "?&body=" + encodeURIComponent(msg)
      : via === "ig" ? "https://ig.me/m/" + CONTACT.instagram
      : via === "viber" ? "viber://chat?number=" + CONTACT.viber + "&draft=" + encodeURIComponent(msg)
      : via === "mail" ? "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent("Запис на масаж") + "&body=" + encodeURIComponent(msg)
      : "https://t.me/" + CONTACT.telegram + "?text=" + encodeURIComponent(msg);
    try { if (navigator.clipboard) navigator.clipboard.writeText(msg).catch(function () {}); } catch (err) {}
    ok.hidden = false; ok.focus();
    if (via === "tg" || via === "ig") { window.open(url, "_blank", "noopener"); } else { window.location.href = url; }
  });
  form.querySelector("[data-again]").addEventListener("click", function () { ok.hidden = true; form.reset(); form.elements.name.focus(); });

  /* ---------- Рік ---------- */
  var y = document.querySelector("[data-year]"); if (y) y.textContent = new Date().getFullYear();
})();
