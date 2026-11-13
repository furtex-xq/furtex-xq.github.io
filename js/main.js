(function () {
  "use strict";

  /* Дані, які змінюються під конкретного клієнта (tools/personalize.py переписує цей блок) */
  /*CONFIG-START*/
  var CONFIG = {"hours": {"0": ["11:00", "18:00"], "1": ["10:00", "19:00"], "2": ["10:00", "19:00"], "3": ["10:00", "19:00"], "4": ["10:00", "19:00"], "5": ["10:00", "19:00"], "6": ["10:00", "19:00"]}, "demoHours": false, "channels": [{"id": "sms", "label": "SMS", "url": "sms:+380995551066"}], "brand": "Кульки від Юльки"};
  /*CONFIG-END*/

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- шапка й меню ---------- */
  var top = $("#top"), burger = $("#burger"), nav = $("#nav");
  function onScrollHead() { top.classList.toggle("scrolled", window.scrollY > 8); }
  onScrollHead();
  window.addEventListener("scroll", onScrollHead, { passive: true });
  function closeMenu() { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Відкрити меню"); }
  burger.addEventListener("click", function () {
    var open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
  });
  $$("a", nav).forEach(function (a) { a.addEventListener("click", closeMenu); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  /* ---------- малюнки сетів ---------- */
  var NS = "http://www.w3.org/2000/svg";
  function balloon(cx, cy, r, c, extra) {
    var ry = r * 1.16;
    return '<g' + (extra || "") + '>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r + '" ry="' + ry + '" fill="' + c + '"/>' +
      '<path d="M' + (cx - r * 0.16) + ' ' + (cy + ry + r * 0.12) + 'h' + (r * 0.32) + 'l-' + (r * 0.16) + ' -' + (r * 0.2) + 'z" fill="' + c + '"/>' +
      '<ellipse cx="' + (cx - r * 0.38) + '" cy="' + (cy - r * 0.42) + '" rx="' + (r * 0.17) + '" ry="' + (r * 0.3) + '" transform="rotate(28 ' + (cx - r * 0.38) + ' ' + (cy - r * 0.42) + ')" fill="#fff" fill-opacity=".5"/>' +
      '</g>';
  }
  function string(x1, y1, x2, y2) {
    var mx = (x1 + x2) / 2 + (x1 > x2 ? 6 : -6);
    return '<path d="M' + x1 + ' ' + y1 + 'Q' + mx + ' ' + ((y1 + y2) / 2) + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="#2E2530" stroke-opacity=".32" stroke-width="1"/>';
  }
  function edge(c) { return c.toUpperCase() === "#FBF7F2" ? ' stroke="#2E2530" stroke-opacity=".12"' : ""; }
  function bob(i) { return ' class="bob" style="animation-delay:-' + (i * 0.7).toFixed(1) + 's"'; }
  function confetti(cx, cy, r, n, colors) {
    var out = "", k;
    for (k = 0; k < n; k++) {
      var a = k * 2.399, d = r * Math.sqrt((k + 0.5) / n);
      out += '<circle cx="' + (cx + Math.cos(a) * d).toFixed(1) + '" cy="' + (cy + Math.sin(a) * d).toFixed(1) + '" r="1.8" fill="' + colors[k % colors.length] + '"/>';
    }
    return out;
  }

  function drawSet(type, P, label) {
    var s = "", i, pts, c;
    var col = function (k) { return P[k % P.length]; };
    if (type === "bouquet" || type === "number") {
      var ax = type === "number" ? 140 : 100;
      pts = type === "number" ? [[140, 40, 16], [118, 62, 14], [160, 66, 14], [138, 84, 12]] : [[100, 34, 17], [72, 46, 15], [128, 46, 15], [86, 70, 15], [116, 72, 15], [60, 74, 12], [142, 76, 12]];
      pts.forEach(function (p) { s += string(p[0], p[1] + p[2] * 1.3, ax, 150); });
      s += '<path d="M' + (ax - 7) + ' 150h14l-3 10h-8z" fill="' + col(1) + '"/>';
      pts.forEach(function (p, k) { c = col(k); s += balloon(p[0], p[1], p[2], c, bob(k)); });
      if (type === "number") s += '<text x="62" y="140" text-anchor="middle" font-family="Kurale, Georgia, serif" font-size="130" fill="url(#foil)" stroke="#9C7432" stroke-width=".6">' + (label || "1") + "</text>";
    } else if (type === "arch") {
      for (i = 0; i <= 14; i++) {
        var a = Math.PI - (Math.PI * i / 14);
        var r = i % 3 === 0 ? 13 : (i % 3 === 1 ? 10 : 8);
        s += balloon(100 + Math.cos(a) * 78, 144 - Math.sin(a) * 108, r, col(i), edge(col(i)));
        if (i % 2 === 0 && i > 0 && i < 14) s += balloon(100 + Math.cos(a) * 64, 146 - Math.sin(a) * 92, 6, col(i + 2), edge(col(i + 2)));
      }
      s += '<path d="M74 156h52" stroke="#2E2530" stroke-opacity=".25" stroke-width="1.2"/>';
    } else if (type === "box") {
      pts = [[100, 30, 15], [76, 46, 13], [124, 44, 13], [90, 66, 11], [114, 68, 11]];
      pts.forEach(function (p) { s += string(p[0], p[1] + p[2] * 1.3, 100, 116); });
      pts.forEach(function (p, k) { s += balloon(p[0], p[1], p[2], col(k), bob(k)); });
      s += '<rect x="62" y="114" width="76" height="40" rx="3" fill="' + col(3) + '" stroke="#2E2530" stroke-opacity=".15"/>';
      s += '<path d="M56 106l84-12 4 10-84 12z" fill="' + col(3) + '" stroke="#2E2530" stroke-opacity=".15"/>';
      s += '<rect x="95" y="114" width="10" height="40" fill="' + col(0) + '"/>';
    } else if (type === "bubble") {
      s += string(100, 128, 100, 158);
      s += '<g class="bob"><circle cx="100" cy="70" r="56" fill="#fff" fill-opacity=".45" stroke="#2E2530" stroke-opacity=".18"/>';
      for (i = 0; i < 6; i++) s += balloon(70 + (i % 3) * 30, 100 + Math.floor(i / 3) * -62 + (i % 2) * 6, 8, col(i), edge(col(i)));
      s += '<ellipse cx="78" cy="38" rx="9" ry="16" transform="rotate(35 78 38)" fill="#fff" fill-opacity=".7"/>';
      s += '<text x="100" y="78" text-anchor="middle" font-family="Kurale, Georgia, serif" font-size="22" fill="#B08640">' + (label || "") + "</text></g>";
    } else if (type === "garland") {
      for (i = 0; i <= 16; i++) {
        var x = 12 + i * 11, yy = 70 + Math.sin(i / 16 * Math.PI) * 42;
        s += balloon(x, yy + (i % 2 ? -7 : 5), i % 3 === 0 ? 11 : 8, col(i), edge(col(i)));
      }
      s += '<path d="M10 70Q100 150 190 70" fill="none" stroke="#B08640" stroke-opacity=".5" stroke-width="1.2" stroke-dasharray="2 4"/>';
    } else if (type === "table") {
      s += '<rect x="34" y="122" width="132" height="6" rx="2" fill="#2E2530" fill-opacity=".7"/><path d="M44 128v28M156 128v28" stroke="#2E2530" stroke-opacity=".6" stroke-width="3"/>';
      [[30, 112], [170, 112]].forEach(function (b, j) {
        for (i = 0; i < 6; i++) s += balloon(b[0] + (i % 3 - 1) * 13 * (j ? -1 : 1), b[1] - Math.floor(i / 3) * 22 - (i % 3) * 6, 10 - (i % 3), col(i + j), edge(col(i + j)));
      });
      [[78, 50], [100, 36], [122, 50]].forEach(function (p, k) {
        s += string(p[0], p[1] + 16, 100, 120);
        s += '<g' + bob(k) + '><circle cx="' + p[0] + '" cy="' + p[1] + '" r="14" fill="#fff" fill-opacity=".55" stroke="#2E2530" stroke-opacity=".15"/>' + confetti(p[0], p[1], 10, 9, ["#D9B97A", "#B08640", "#E9B7B0"]) + "</g>";
      });
    } else if (type === "big") {
      s += string(100, 136, 100, 160);
      s += '<g class="bob">' + balloon(100, 72, 52, "#2E2530") + '<text x="100" y="94" text-anchor="middle" font-family="Kurale, Georgia, serif" font-size="66" fill="url(#foil)">' + (label || "?") + "</text></g>";
      s += confetti(36, 40, 26, 14, [col(0), col(1), col(3)]) + confetti(164, 104, 24, 12, [col(0), col(1), col(3)]);
    }
    return '<svg xmlns="' + NS + '" viewBox="0 0 200 165" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + s + "</svg>";
  }
  $$(".ev-panel").forEach(function (panel) {
    var P = (panel.getAttribute("data-palette") || "#E9B7B0,#D9B97A,#BFD5E6").split(",");
    $$(".set-art", panel).forEach(function (el) {
      el.innerHTML = drawSet(el.getAttribute("data-type"), P, el.getAttribute("data-label"));
    });
  });

  /* ---------- вкладки подій ---------- */
  var tabs = $$(".ev-tab");
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
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

  /* ---------- кульки, що злітають під час прокрутки ---------- */
  var floaters = $$(".sky-layer .fb");
  if (floaters.length && !reduce) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      floaters.forEach(function (el) {
        var sec = el.parentNode.parentNode.getBoundingClientRect();
        if (sec.bottom < -200 || sec.top > vh + 200) return;
        var p = Math.min(1, Math.max(0, (vh - sec.top) / (vh + sec.height)));
        var sp = +el.getAttribute("data-speed") || 300;
        el.style.translate = "0 " + (-p * sp).toFixed(1) + "px";
      });
    };
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- плавна поява ---------- */
  if ("IntersectionObserver" in window && !reduce) {
    var items = $$(".sec-head, .set, .price-col, .steps li, .rev, .faq-list details, .about-photo, .mosaic figure, .hours, .order");
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add("rv"); io.observe(el);
    });
  }

  /* ---------- графік за київським часом ---------- */
  var DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця", "Субота"];
  function kyivNow() {
    var fmt;
    try { fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }); }
    catch (e) { try { fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kiev", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }); } catch (e2) { return null; } }
    var parts = {}; fmt.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var d = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
    return { day: d, min: (+parts.hour % 24) * 60 + (+parts.minute) };
  }
  function toMin(t) { var a = t.split(":"); return +a[0] * 60 + (+a[1]); }
  var H = CONFIG.hours;
  if (H) {
    var tb = $("#hoursTable"), now = kyivNow(), rows = "";
    [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
      var h = H[String(d)];
      rows += '<tr' + (now && now.day === d ? ' class="today"' : "") + "><td>" + DAYS[d] + "</td><td>" + (h ? h[0] + "–" + h[1] : "вихідний") + "</td></tr>";
    });
    tb.tBodies[0].innerHTML = rows;
    tb.hidden = false;
    if (CONFIG.demoHours) tb.classList.add("demo");
    if (now) {
      var today = H[String(now.day)], open = false, txt;
      if (today) {
        var o = toMin(today[0]), c = toMin(today[1]);
        if (c <= o) c += 1440;
        open = now.min >= o && now.min < c;
      }
      if (open) txt = "Зараз відчинено · до " + today[1];
      else {
        var next = null, k;
        for (k = 0; k < 8; k++) {
          var dd = (now.day + k) % 7, hh = H[String(dd)];
          if (hh && (k > 0 || now.min < toMin(hh[0]))) { next = { k: k, d: dd, t: hh[0] }; break; }
        }
        txt = "Зараз зачинено" + (next ? " · відчинимося " + (next.k === 0 ? "сьогодні" : next.k === 1 ? "завтра" : DAYS[next.d].toLowerCase()) + " о " + next.t : "");
      }
      var st = $("#openStatus");
      st.innerHTML = '<span class="dot' + (open ? "" : " off") + '"></span>' + txt;
      st.hidden = false;
      var hs = $("#heroStatus");
      if (hs) {
        hs.innerHTML = '<span class="dot' + (open ? "" : " off") + '"></span>' + (open ? "Сьогодні працюємо до " + today[1] + " — встигнемо зібрати ваш сет" : txt + ". Заявку можна залишити будь-коли");
        hs.hidden = false;
      }
    }
  }

  /* ---------- форма заявки ---------- */
  var form = $("#orderForm"), success = $("#success");
  var chans = CONFIG.channels || [];
  var chips = $("#chanChips"), chanField = $("#chanField");
  if (chans.length > 1) {
    chips.innerHTML = chans.map(function (c, i) {
      return '<label class="chip"><input type="radio" name="channel" value="' + c.id + '"' + (i === 0 ? " checked" : "") + "><span>" + c.label + "</span></label>";
    }).join("");
  } else if (chans.length === 1) {
    chanField.innerHTML = '<p class="chan-one">' + (chans[0].id === "instagram" ? "Скопіюємо текст заявки й відкриємо Instagram Direct — залишиться вставити й надіслати." : "Заявка відкриється в " + (chans[0].id === "email" ? "поштовому застосунку" : chans[0].id === "sms" ? "SMS" : chans[0].label) + " з уже готовим текстом.") + "</p>";
    if (chans[0].id === "instagram") $("#formNote").hidden = true;
  } else {
    chanField.hidden = true;
    $("#sendLabel").textContent = "Підготувати заявку";
    $("#formNote").textContent = "Покажемо готовий текст заявки й номер, за яким її можна продиктувати.";
  }
  var dateIn = form.elements.date;
  try { var t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); dateIn.min = t.toISOString().slice(0, 10); } catch (e) {}
  var addrField = $("#addrField");
  $$('input[name="delivery"]', form).forEach(function (r) {
    r.addEventListener("change", function () { addrField.hidden = form.elements.delivery.value === "Самовивіз"; });
  });

  $$(".set-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var panel = b.closest(".ev-panel");
      var ev = panel.getAttribute("data-event");
      var sel = form.elements.event;
      $$("option", sel).forEach(function (o) { if (o.textContent === ev) sel.value = o.textContent; });
      var msg = form.elements.msg;
      var line = "Сет «" + b.getAttribute("data-set") + "»";
      if (msg.value.indexOf(line) === -1) msg.value = line + (msg.value ? "\n" + msg.value : ". ");
      $("#order").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      setTimeout(function () { form.elements.name.focus({ preventScroll: true }); }, reduce ? 0 : 600);
    });
  });

  function setBad(name, bad) { form.elements[name].closest(".field").classList.toggle("bad", bad); }
  ["name", "phone", "date"].forEach(function (n) { form.elements[n].addEventListener("input", function () { setBad(n, false); }); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements;
    var name = f.name.value.trim(), phone = f.phone.value.trim(), date = f.date.value;
    var okName = name.length >= 2, okPhone = phone.replace(/\D/g, "").length >= 10, okDate = !!date;
    setBad("name", !okName); setBad("phone", !okPhone); setBad("date", !okDate);
    if (!okName || !okPhone || !okDate) { (okName ? okPhone ? f.date : f.phone : f.name).focus(); return; }
    var dl = f.delivery.value;
    var d = date.split("-");
    var lines = [
      "Заявка з сайту " + CONFIG.brand,
      "Ім’я: " + name,
      "Телефон: " + phone,
      "Свято: " + f.event.value,
      "Дата: " + d[2] + "." + d[1] + "." + d[0],
      "Отримання: " + dl
    ];
    if (dl !== "Самовивіз" && f.address.value.trim()) lines.push("Адреса/час: " + f.address.value.trim());
    if (f.msg.value.trim()) lines.push("Побажання: " + f.msg.value.trim());
    var text = lines.join("\n"), enc = encodeURIComponent(text);
    var id = f.channel ? f.channel.value : (chans[0] && chans[0].id);
    var ch = null; chans.forEach(function (c) { if (c.id === id) ch = c; });
    var url = null, copied = false;
    if (ch) {
      if (ch.id === "telegram" || ch.id === "whatsapp") url = ch.url + "?text=" + enc;
      else if (ch.id === "viber") url = ch.url + "&draft=" + enc;
      else if (ch.id === "email") url = ch.url + "?subject=" + encodeURIComponent("Заявка на оформлення — " + f.event.value) + "&body=" + enc;
      else if (ch.id === "sms") url = ch.url + "?&body=" + enc;
      else if (ch.id === "instagram") {
        url = ch.url;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            copied = true;
            navigator.clipboard.writeText(text).catch(function () {
              var ex = $("#successExtra"); if (ex) ex.textContent = "Надішліть цей текст у Direct: " + text.replace(/\n/g, "; ");
            });
          }
        } catch (err) { copied = false; }
      }
    }
    if (url) {
      if (/^https?:/.test(url)) window.open(url, "_blank", "noopener");
      else window.location.href = url;
    }
    var extra = $("#successExtra");
    if (!extra) { extra = document.createElement("p"); extra.id = "successExtra"; $("#successText").after(extra); }
    extra.textContent = ch && ch.id === "instagram" ? (copied ? "Текст заявки скопійовано — вставте його в Direct і надішліть." : "Надішліть цей текст у Direct: " + text.replace(/\n/g, "; ")) : (!ch ? "Текст заявки: " + text.replace(/\n/g, "; ") : "");
    form.hidden = true;
    success.hidden = false;
    success.focus();
  });
  $("#again").addEventListener("click", function () {
    form.reset(); addrField.hidden = false;
    success.hidden = true; form.hidden = false;
    form.elements.name.focus();
  });
})();
