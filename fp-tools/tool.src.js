(function () {
  "use strict";
  var ID = "fpt-root";
  if (location.hostname.indexOf("funpay.com") === -1) {
    alert("Откройте funpay.com (войдите в аккаунт) и нажмите закладку там.");
    return;
  }
  var old = document.getElementById(ID);
  if (old) { old.style.display = "flex"; return; }

  var appData = {};
  try { appData = JSON.parse(document.body.getAttribute("data-app-data") || "{}"); } catch (e) {}
  var userId = appData.userId;
  var csrf = appData["csrf-token"] || "";
  var DONE_KEY = "fpt-done-" + (userId || "x");

  // ---------- UI ----------
  var css =
    "#fpt-root{position:fixed;inset:0;z-index:2147483647;background:rgba(10,12,16,.55);display:flex;align-items:flex-end;justify-content:center;font:15px/1.4 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#15171a}" +
    "#fpt-root *{box-sizing:border-box}" +
    "#fpt-box{background:#fff;width:100%;max-width:560px;max-height:92vh;display:flex;flex-direction:column;border-radius:16px 16px 0 0;box-shadow:0 -8px 40px rgba(0,0,0,.25);overflow:hidden}" +
    "@media(min-width:600px){#fpt-root{align-items:center}#fpt-box{border-radius:16px}}" +
    "#fpt-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eceef1}" +
    "#fpt-head b{font-size:16px}" +
    "#fpt-x{border:0;background:#f1f3f5;border-radius:8px;width:32px;height:32px;font-size:18px;cursor:pointer}" +
    "#fpt-body{padding:14px 16px;overflow:auto;display:flex;flex-direction:column;gap:12px}" +
    ".fpt-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}" +
    ".fpt-row label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#5b616b;flex:1;min-width:120px}" +
    ".fpt-row input[type=number]{font-size:16px;padding:8px 10px;border:1px solid #d5d9de;border-radius:8px;width:100%}" +
    "#fpt-file{font-size:15px;width:100%}" +
    ".fpt-btn{flex:1;font-size:16px;font-weight:600;padding:12px;border-radius:10px;border:0;cursor:pointer}" +
    "#fpt-go{background:#1f6feb;color:#fff}#fpt-go:disabled{background:#9db8e6}" +
    "#fpt-stop{background:#f1f3f5;color:#15171a}" +
    "#fpt-stat{font-size:14px;color:#3a3f46}" +
    "#fpt-bar{height:6px;background:#eceef1;border-radius:3px;overflow:hidden}#fpt-bar i{display:block;height:100%;width:0;background:#1f6feb;transition:width .3s}" +
    "#fpt-log{font:12px/1.45 ui-monospace,Menlo,monospace;background:#f7f8fa;border:1px solid #eceef1;border-radius:8px;padding:8px;height:180px;overflow:auto;white-space:pre-wrap;word-break:break-word}" +
    ".fpt-ok{color:#1a7f37}.fpt-err{color:#cf222e}.fpt-dim{color:#7a8089}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var root = document.createElement("div"); root.id = ID;
  root.innerHTML =
    '<div id="fpt-box"><div id="fpt-head"><b>FP Tools · создание лотов</b><button id="fpt-x" title="Закрыть">×</button></div>' +
    '<div id="fpt-body">' +
    '<input id="fpt-file" type="file" accept=".json,application/json">' +
    '<div class="fpt-row"><label>Сколько создать (0 = все)<input id="fpt-limit" type="number" min="0" value="1"></label>' +
    '<label>Пауза между лотами, сек<input id="fpt-delay" type="number" min="1" value="3"></label></div>' +
    '<div class="fpt-row"><button class="fpt-btn" id="fpt-go" disabled>Создать лоты</button><button class="fpt-btn" id="fpt-stop">Стоп</button></div>' +
    '<div id="fpt-stat">Аккаунт: ' + (userId ? "id " + userId : "<span class=fpt-err>не найден — войдите на FunPay</span>") + '. Выберите JSON-файл.</div>' +
    '<div id="fpt-bar"><i></i></div><div id="fpt-log"></div></div></div>';
  document.body.appendChild(root);

  var $ = function (s) { return root.querySelector(s); };
  var logEl = $("#fpt-log");
  function log(msg, cls) {
    var d = document.createElement("div"); if (cls) d.className = cls; d.textContent = msg;
    logEl.appendChild(d); logEl.scrollTop = logEl.scrollHeight;
  }
  function stat(t) { $("#fpt-stat").textContent = t; }
  function bar(p) { $("#fpt-bar i").style.width = Math.round(p * 100) + "%"; }
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  $("#fpt-x").onclick = function () { root.style.display = "none"; };

  // ---------- data ----------
  var lots = null, running = false, stopFlag = false;
  var SIMPLE = { summary_ru: "fields[summary][ru]", summary_en: "fields[summary][en]", desc_ru: "fields[desc][ru]",
    desc_en: "fields[desc][en]", payment_msg_ru: "fields[payment_msg][ru]", payment_msg_en: "fields[payment_msg][en]" };

  function normalize(data) {
    var arr = Array.isArray(data) ? data : (data && data.lots) || [];
    return arr.map(function (lot, i) {
      var f = Object.assign({}, lot.fields || {});
      Object.keys(SIMPLE).forEach(function (k) { if (lot[k] != null && f[SIMPLE[k]] == null) f[SIMPLE[k]] = lot[k]; });
      var node = lot.node_id || f.node_id;
      var price = lot.price != null ? lot.price : f.price;
      var title = String(f["fields[summary][ru]"] || "").trim();
      if (!node || !title || price == null || price === "") throw new Error("Лот №" + (i + 1) + ": нет node_id, названия или цены");
      delete f.node_id; delete f.active; delete f.price;
      Object.assign(f, lot.extra_fields || {});
      return { sku: lot.sku || String(i + 1), node: String(node), price: String(price), title: title, fields: f };
    });
  }

  $("#fpt-file").onchange = function (e) {
    var file = e.target.files[0]; if (!file) return;
    stat("Читаю файл…");
    var r = new FileReader();
    r.onload = function () {
      try {
        lots = normalize(JSON.parse(r.result));
        stat("В файле " + lots.length + " лотов. Для проверки оставьте «1», потом поставьте 0.");
        log("Файл: " + file.name + " · " + lots.length + " лотов", "fpt-dim");
        $("#fpt-go").disabled = !userId;
      } catch (err) { lots = null; stat("Ошибка в файле: " + err.message); }
    };
    r.readAsText(file, "utf-8");
  };

  // ---------- FunPay ----------
  async function getText(url) {
    var r = await fetch(url, { credentials: "include" });
    if (!r.ok) throw new Error("HTTP " + r.status + " на " + url);
    return r.text();
  }

  async function existingTitles() {
    var html = await getText("/users/" + userId + "/");
    var doc = new DOMParser().parseFromString(html, "text/html");
    var s = new Set();
    doc.querySelectorAll(".tc-item .tc-desc-text").forEach(function (el) { s.add(el.textContent.trim()); });
    return s;
  }

  function formFields(form) {
    var out = {};
    form.querySelectorAll("input").forEach(function (el) {
      var n = el.getAttribute("name"), t = (el.getAttribute("type") || "").toLowerCase();
      if (!n || t === "checkbox" || t === "radio" || t === "file") return;
      out[n] = el.getAttribute("value") || "";
    });
    form.querySelectorAll("input[type=checkbox],input[type=radio]").forEach(function (el) {
      var n = el.getAttribute("name");
      if (n && el.hasAttribute("checked")) out[n] = el.type === "radio" ? (el.getAttribute("value") || "on") : "on";
    });
    form.querySelectorAll("textarea").forEach(function (el) { if (el.name) out[el.name] = el.textContent || ""; });
    form.querySelectorAll("select").forEach(function (el) {
      if (!el.name) return;
      var g = el.closest(".form-group");
      if (g && g.classList.contains("hidden")) return;
      var o = el.querySelector("option[selected]") || el.querySelector("option");
      out[el.name] = o ? (o.getAttribute("value") || "") : "";
    });
    return out;
  }

  async function createLot(lot) {
    var html = await getText("/lots/offerEdit?node=" + encodeURIComponent(lot.node));
    var doc = new DOMParser().parseFromString(html, "text/html");
    var lead = doc.querySelector("p.lead");
    if (lead) throw new Error(lead.textContent.trim());
    var form = doc.querySelector("form.form-offer-editor");
    if (!form) throw new Error("нет формы создания лота (раздел " + lot.node + ")");
    var f = formFields(form);
    delete f.auto_delivery; delete f.deactivate_after_sale;
    Object.assign(f, lot.fields);
    f.offer_id = "0"; f.node_id = lot.node; f.price = lot.price; f.active = "on";
    if ("amount" in f) f.amount = "999";
    if (f.csrf_token) csrf = f.csrf_token; else f.csrf_token = csrf;
    var body = new URLSearchParams();
    Object.keys(f).forEach(function (k) { body.append(k, f[k] == null ? "" : String(f[k])); });
    var r = await fetch("/lots/offerSave", {
      method: "POST", credentials: "include",
      headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8", "x-requested-with": "XMLHttpRequest", "accept": "*/*" },
      body: body.toString()
    });
    var txt = await r.text(), js = null;
    try { js = JSON.parse(txt); } catch (e) {}
    if (!r.ok) throw new Error("HTTP " + r.status);
    if (!js) throw new Error("непонятный ответ FunPay");
    var errs = js.errors;
    if (errs && (Array.isArray(errs) ? errs.length : Object.keys(errs).length)) {
      var list = Array.isArray(errs) ? errs.map(function (p) { return Array.isArray(p) ? p.join(": ") : String(p); })
        : Object.keys(errs).map(function (k) { return k + ": " + errs[k]; });
      var e = new Error((js.error || "ошибка полей") + " — " + list.join("; ")); e.fieldErr = true; throw e;
    }
    if (js.error) throw new Error(typeof js.error === "string" ? js.error : JSON.stringify(js));
    return js;
  }

  function loadDone() { try { return new Set(JSON.parse(localStorage.getItem(DONE_KEY) || "[]")); } catch (e) { return new Set(); } }
  function saveDone(s) { try { localStorage.setItem(DONE_KEY, JSON.stringify(Array.from(s))); } catch (e) {} }

  $("#fpt-stop").onclick = function () { if (running) { stopFlag = true; stat("Останавливаю после текущего лота…"); } };

  $("#fpt-go").onclick = async function () {
    if (!lots || running) return;
    running = true; stopFlag = false; this.disabled = true;
    var limit = parseInt($("#fpt-limit").value, 10) || 0;
    var delay = Math.max(1, parseFloat($("#fpt-delay").value) || 3) * 1000;
    var done = loadDone(), have;
    stat("Проверяю, какие лоты уже есть…");
    try { have = await existingTitles(); } catch (e) { have = new Set(); log("Не удалось получить список лотов: " + e.message, "fpt-err"); }
    var todo = lots.filter(function (l) { return !have.has(l.title) && !done.has(l.sku + "|" + l.title); });
    var skipped = lots.length - todo.length;
    if (limit) todo = todo.slice(0, limit);
    log("Уже есть: " + skipped + " · к созданию: " + todo.length, "fpt-dim");
    var ok = 0, fail = 0, failed = [];
    for (var i = 0; i < todo.length; i++) {
      if (stopFlag) { log("Остановлено.", "fpt-dim"); break; }
      var lot = todo[i], err = null;
      stat("Создаю " + (i + 1) + " из " + todo.length + ": " + lot.sku);
      for (var a = 0; a < 3; a++) {
        try { await createLot(lot); err = null; break; }
        catch (e) { err = e; if (e.fieldErr) break; await sleep(delay * (a + 2)); }
      }
      if (err) { fail++; failed.push(lot.sku + " (раздел " + lot.node + "): " + err.message); log("✗ " + lot.sku + " — " + err.message, "fpt-err"); }
      else { ok++; done.add(lot.sku + "|" + lot.title); saveDone(done); log("✓ " + lot.sku, "fpt-ok"); }
      bar((i + 1) / todo.length);
      if (i < todo.length - 1) await sleep(delay);
    }
    stat("Готово. Создано: " + ok + " · ошибок: " + fail + " · пропущено (уже были): " + skipped);
    if (failed.length) log("— Ошибки —\n" + failed.join("\n"), "fpt-err");
    running = false; this.disabled = false;
  };
})();
