/* Іграшки та подарунки — шаблон. Без бібліотек. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ---------- mobile menu ---------- */
  var burger = $("[data-burger]"), nav = $("#nav");
  function closeNav() { burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Відкрити меню"); nav.classList.remove("is-open"); }
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      if (open) { closeNav(); return; }
      burger.setAttribute("aria-expanded", "true"); burger.setAttribute("aria-label", "Закрити меню"); nav.classList.add("is-open");
    });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", closeNav); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
  }

  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- open / closed by Kyiv time (reads the hours table) ---------- */
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
    var rows = $$("[data-hours] tr[data-day]");
    if (!rows.length) return;
    var now = kyivNow(), sched = {};
    rows.forEach(function (tr) {
      var d = parseInt(tr.getAttribute("data-day"), 10), td = $("td", tr);
      sched[d] = td && td.getAttribute("data-open") ? { o: toMin(td.getAttribute("data-open")), c: toMin(td.getAttribute("data-close")), label: td.getAttribute("data-open") } : null;
      if (d === now.day) tr.classList.add("is-today");
    });
    var t = sched[now.day], open = !!(t && now.min >= t.o && now.min < t.c), text;
    if (open) {
      var left = t.c - now.min;
      text = left <= 60 ? "Відчинено ще " + left + " хв" : "Зараз відчинено";
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
      var tx = $("[data-status-text]", s); if (tx) tx.textContent = s.classList.contains("status--top") ? (open ? "Відчинено" : "Зачинено") : text;
      s.hidden = false;
    });
  })();

  /* ---------- signature: the ribbon unties as you scroll ---------- */
  (function gift() {
    var g = $("[data-gift]"), box = g && $(".gift__box", g), bow = g && $("[data-untie]", g);
    if (!g) return;
    var done = false;
    function set(p) {
      var e = function (x) { return x * x * (3 - 2 * x); };
      g.style.setProperty("--rb", e(clamp(p / 0.45)).toFixed(3));
      g.style.setProperty("--bw", e(clamp((p - 0.2) / 0.4)).toFixed(3));
      g.style.setProperty("--fl", e(clamp((p - 0.45) / 0.55)).toFixed(3));
    }
    function untie() { done = true; g.classList.add("is-auto"); set(1); }
    if (bow) bow.addEventListener("click", untie);
    if (reduce) { set(1); return; }
    var ticking = false;
    function update() {
      ticking = false;
      if (done) return;
      var r = box.getBoundingClientRect(), y = window.pageYOffset, vh = window.innerHeight;
      var docTop = r.top + y, start = Math.max(0, docTop - Math.min(docTop, vh * 0.3));
      var p = clamp((y - start) / Math.max(260, r.height * 0.75));
      set(p);
      if (p >= 1) done = true;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();

  /* ---------- gift finder ---------- */
  var IDEAS = {
    "0-2": [["Сортер або пірамідка", "дерев'яні, з великими деталями", "sm"], ["М'яка іграшка-обіймашка", "можна прати, без дрібних деталей", "smb"], ["Бізіборд", "замочки, кнопки, шестерні", "mb"], ["Книжка-картонка", "з віконцями й тваринками", "s"], ["Каталка або толокар", "для тих, хто вже ходить", "b"]],
    "3-5": [["Рольовий набір", "кухня, лікар, інструменти", "mb"], ["Конструктор з великими деталями", "будинки, ферма, машини", "mb"], ["Творчий набір", "пластилін, тісто, фарби", "sm"], ["Залізниця або паркінг", "з машинками в комплекті", "b"], ["Перша настільна гра", "на кмітливість і кольори", "s"]],
    "6-9": [["Тематичний конструктор", "з інструкцією на кілька вечорів", "mb"], ["Сімейна настільна гра", "щоб грати всією родиною", "sm"], ["Набір для експериментів", "кристали, вулкан, мікроскоп", "sm"], ["Лялька з аксесуарами або фігурки", "для довгих сюжетних ігор", "smb"], ["Радіокерована машина", "із запасним акумулятором", "b"]],
    "10+": [["Технічний конструктор", "модель з механікою чи моторчиком", "b"], ["Стратегія чи детективна гра", "для компанії друзів", "mb"], ["Пазл на 500–1000 деталей", "або 3D-головоломка", "sm"], ["Набір для творчості", "розпис, епоксидка, вишивка", "sm"], ["Колекційні фігурки", "для тих, хто збирає серію", "smb"]],
    her: [["Подарунковий бокс", "свічка, какао, плед — під її смак", "mb"], ["Велика м'яка іграшка", "обіймашка, яку не передарують", "b"], ["Ароматична свічка", "у гарній коробці з листівкою", "sm"], ["Пазл або розмальовка-антистрес", "для спокійних вечорів", "sm"], ["Кухоль з листівкою", "і вашим підписом", "s"]],
    him: [["Настільна гра для компанії", "весела «на швидкість» або стратегія", "smb"], ["Технічний конструктор", "авто, корабель, техніка", "b"], ["Головоломка чи 3D-пазл", "збирати на вихідних", "sm"], ["Подарунковий бокс", "чай чи кава, кухоль, дрібниці", "mb"], ["Радіокерована модель", "машина, катер чи дрон", "b"]],
    work: [["Кухоль і солодощі", "нейтрально й приємно", "sm"], ["Свічка в подарунковій коробці", "підходить майже всім", "sm"], ["Блокнот і листівка", "з підписом від команди", "s"], ["Настільна гра для офісу", "на перерву чи корпоратив", "mb"], ["Подарунковий сертифікат", "людина обере сама", "mb"]]
  };
  var WHO = { kid: "Дитині", her: "Дівчині", him: "Чоловікові", work: "Колезі" };
  var AGE = { "0-2": "0–2 роки", "3-5": "3–5 років", "6-9": "6–9 років", "10+": "10+ років", u25: "до 25 років", "25-40": "25–40 років", "40+": "40+ років" };
  var BUDGET = { small: ["s", "символічний бюджет"], mid: ["m", "середній бюджет"], big: ["b", "щедрий бюджет"] };
  var NOTE = {
    small: "Навіть невеликий подарунок у гарному пакуванні виглядає святково — запакуємо й додамо листівку.",
    mid: "Покажемо кілька варіантів на полиці й допоможемо обрати один.",
    big: "Можемо зібрати бокс із 2–3 речей і запакувати все разом."
  };
  var finder = $("#finder"), current = null;
  function val(name) { var i = $('input[name="' + name + '"]:checked', finder); return i ? i.value : null; }
  function renderFinder(animate) {
    var who = val("who"), kid = who === "kid";
    var kidBox = $("[data-ages-kid]", finder), adBox = $("[data-ages-adult]", finder);
    kidBox.hidden = !kid; adBox.hidden = kid;
    var age = val("age");
    var valid = kid ? ["0-2", "3-5", "6-9", "10+"] : ["u25", "25-40", "40+"];
    if (valid.indexOf(age) < 0) { age = kid ? "3-5" : "25-40"; $('input[name="age"][value="' + age + '"]', finder).checked = true; }
    var b = val("budget") || "mid", list = IDEAS[kid ? age : who], tag = BUDGET[b][0];
    var pick = list.filter(function (x) { return x[2].indexOf(tag) >= 0; });
    list.forEach(function (x) { if (pick.indexOf(x) < 0) pick.push(x); });
    pick = pick.slice(0, 3);
    var title = WHO[who] + " " + AGE[age] + ", " + BUDGET[b][1];
    $("[data-finder-title]", finder).textContent = title;
    var ul = $("[data-ideas]", finder);
    ul.innerHTML = "";
    pick.forEach(function (x) {
      var li = document.createElement("li"); li.className = "idea";
      var h = document.createElement("span"); h.className = "idea__hole";
      var t = document.createElement("b"); t.textContent = x[0];
      var s = document.createElement("span"); s.textContent = x[1];
      li.appendChild(h); li.appendChild(t); li.appendChild(s); ul.appendChild(li);
    });
    if (animate && !reduce) { ul.classList.remove("is-swap"); void ul.offsetWidth; ul.classList.add("is-swap"); }
    $("[data-finder-note]", finder).textContent = NOTE[b];
    current = { title: title, ideas: pick.map(function (x) { return x[0].toLowerCase(); }) };
  }
  if (finder) {
    finder.addEventListener("change", function () { renderFinder(true); });
    renderFinder(false);
    var go = $("[data-finder-go]", finder);
    if (go) go.addEventListener("click", function () {
      var ta = $("#f-msg");
      if (ta && current) ta.value = "Шукаю подарунок: " + current.title.charAt(0).toLowerCase() + current.title.slice(1) + ". Цікавлять ідеї: " + current.ideas.join(", ") + ".";
    });
  }

  /* ---------- contact channels → form send options ---------- */
  var MOBILE = ["39", "50", "63", "66", "67", "68", "73", "77", "91", "92", "93", "94", "95", "96", "97", "98", "99"];
  var links = {};
  $$("[data-links] [data-ch]").forEach(function (a) { links[a.getAttribute("data-ch")] = a.getAttribute("href"); });
  var telDigits = links.tel ? links.tel.replace(/\D/g, "") : "";
  var isMobile = telDigits.length === 12 && telDigits.indexOf("380") === 0 && MOBILE.indexOf(telDigits.substr(3, 2)) >= 0;
  var igHandle = null;
  if (links.instagram) { var m = links.instagram.match(/instagram\.com\/([^\/?#]+)/); igHandle = m ? m[1] : null; }
  var CH = [
    ["sms", "SMS", isMobile],
    ["telegram", "Telegram", !!links.telegram],
    ["viber", "Viber", !!links.viber],
    ["whatsapp", "WhatsApp", !!links.whatsapp],
    ["instagram", "Instagram", !!igHandle],
    ["email", "Email", !!links.email]
  ].filter(function (c) { return c[2]; });
  if (!CH.length && links.facebook) CH.push(["facebook", "Facebook", true]);
  var HINT = {
    sms: "Відкриється SMS з готовим текстом — залишиться натиснути «Надіслати».",
    telegram: "Текст заявки скопіюється, і відкриється Telegram — вставте його в чат.",
    viber: "Текст заявки скопіюється, і відкриється Viber — вставте його в чат.",
    whatsapp: "Відкриється WhatsApp з готовим текстом — залишиться натиснути «Надіслати».",
    instagram: "Текст заявки скопіюється, і відкриється Instagram Direct — вставте його й надішліть.",
    email: "Відкриється пошта з готовим листом — залишиться натиснути «Надіслати».",
    facebook: "Текст заявки скопіюється, і відкриється Facebook — надішліть його нам."
  };
  var DONE = {
    sms: "Надішліть SMS, що відкрилось, — і ми відповімо з варіантами.",
    telegram: "Текст уже в буфері обміну: вставте його в чат Telegram і надішліть.",
    viber: "Текст уже в буфері обміну: вставте його в чат Viber і надішліть.",
    whatsapp: "Надішліть повідомлення у WhatsApp — і ми відповімо з варіантами.",
    instagram: "Текст уже в буфері обміну: вставте його в Direct і надішліть.",
    email: "Надішліть лист, що відкрився, — і ми відповімо з варіантами.",
    facebook: "Текст уже в буфері обміну: надішліть його нам у Facebook."
  };
  var sendBox = $("[data-send-box]"), sendWrap = $("[data-send]"), hint = $("[data-send-hint]");
  if (sendWrap) {
    CH.forEach(function (c, i) {
      var l = document.createElement("label"), inp = document.createElement("input"), sp = document.createElement("span");
      inp.type = "radio"; inp.name = "via"; inp.value = c[0]; if (i === 0) inp.checked = true;
      sp.textContent = c[1]; l.appendChild(inp); l.appendChild(sp); sendWrap.appendChild(l);
    });
    if (CH.length < 2) sendBox.hidden = true;
    var setHint = function () {
      var v = $('input[name="via"]:checked');
      hint.textContent = v ? HINT[v.value] : (links.tel ? "Ми підготуємо текст заявки — зателефонуйте нам, і ми все оформимо." : "Ми підготуємо текст заявки, який можна надіслати нам будь-яким зручним способом.");
    };
    sendWrap.addEventListener("change", setHint); setHint();
  }

  function copy(text) {
    try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text); return; } } catch (e) { /* fallback */ }
    try {
      var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    } catch (e) { /* ignore */ }
  }
  function openNew(url) { var w = window.open(url, "_blank", "noopener"); if (!w) location.href = url; }

  var form = $("[data-order]");
  if (form) {
    var shop = form.getAttribute("data-shop") || "";
    var body = $("[data-form-body]", form), doneBox = $("[data-form-done]", form);
    var check = function (id, ok) { var f = $("#" + id).closest(".field"); f.classList.toggle("is-bad", !ok); $("#" + id).setAttribute("aria-invalid", String(!ok)); if (!ok) $("#" + id).setAttribute("aria-describedby", id + "-err"); return ok; };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#f-name").value.trim(), phone = $("#f-phone").value.trim(), msg = $("#f-msg").value.trim();
      var digits = phone.replace(/\D/g, "");
      var ok = [check("f-name", name.length >= 2), check("f-phone", /^(380\d{9}|0\d{9})$/.test(digits)), check("f-msg", msg.length >= 5)];
      if (ok.indexOf(false) >= 0) { var bad = $(".field.is-bad input, .field.is-bad textarea", form); if (bad) bad.focus(); return; }
      var get = $('input[name="get"]:checked', form);
      var text = "Заявка з сайту" + (shop ? " «" + shop + "»" : "") + "\nІм'я: " + name + "\nТелефон: " + phone + "\nШукаю: " + msg + "\nОтримання: " + (get ? get.value : "—");
      var via = $('input[name="via"]:checked', form), v = via ? via.value : null, enc = encodeURIComponent(text);
      var doneText = $("[data-done-text]", form);
      if (v === "sms") location.href = "sms:+" + telDigits + "?&body=" + enc;
      else if (v === "whatsapp") openNew(links.whatsapp.split("?")[0] + "?text=" + enc);
      else if (v === "email") location.href = links.email.split("?")[0] + "?subject=" + encodeURIComponent("Заявка на подарунок") + "&body=" + enc;
      else if (v === "telegram") { copy(text); openNew(links.telegram); }
      else if (v === "viber") { copy(text); location.href = links.viber; }
      else if (v === "instagram") { copy(text); openNew("https://ig.me/m/" + igHandle); }
      else if (v === "facebook") { copy(text); openNew(links.facebook); }
      else { copy(text); }
      if (v) doneText.textContent = DONE[v];
      else if (links.tel) {
        doneText.textContent = "Текст заявки скопійовано. Зателефонуйте нам — і ми все оформимо: ";
        var a = document.createElement("a"); a.href = links.tel; a.textContent = $("[data-ch=tel]").textContent.replace(/^\s*Телефон\s*/, ""); doneText.appendChild(a);
      } else doneText.textContent = "Текст заявки скопійовано — надішліть його нам будь-яким зручним способом.";
      body.hidden = true; doneBox.hidden = false; doneBox.focus();
    });
    $("[data-form-again]", form).addEventListener("click", function () { form.reset(); body.hidden = false; doneBox.hidden = true; $$(".field", form).forEach(function (f) { f.classList.remove("is-bad"); }); if (CH.length) $('input[name="via"]', form).checked = true; });
    $$("input, textarea", form).forEach(function (el) { el.addEventListener("input", function () { var f = el.closest(".field"); if (f) f.classList.remove("is-bad"); }); });
  }

  /* ---------- reveal on scroll ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    var targets = $$(".head, .shelf > li, .finder__card, .wrapsec__media, .wrapsec__body, .about__body, .about__photo, .flow > li, .cards > .card, .faq__list, .contacts__info, .order, .map");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    targets.forEach(function (el) {
      var sib = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
      el.classList.add("rv"); el.style.transitionDelay = Math.min(sib, 3) * 70 + "ms"; io.observe(el);
    });
  }
})();
