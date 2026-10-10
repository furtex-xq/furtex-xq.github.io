'use strict';

/* =========================================================
   Native — мост к Android и замены для браузера.
   Dialog — собственные окна в стиле приложения вместо
   системных alert / confirm / prompt.
   ========================================================= */

const Native = (() => {
  const bridge = () => window.MFSAndroid || null;
  const pending = new Map();
  let seq = 0;

  // Android отвечает на асинхронные вызовы сюда
  window.mfsNative = (id, ok, payload) => {
    const resolve = pending.get(id);
    if (!resolve) return;
    pending.delete(id);
    resolve({ ok: !!ok, payload });
  };

  const call = (method, ...args) => new Promise(resolve => {
    const id = `n${++seq}`;
    pending.set(id, resolve);
    try {
      bridge()[method](id, ...args);
    } catch {
      pending.delete(id);
      resolve({ ok: false });
    }
  });

  return {
    isApp: () => !!bridge(),

    async copy(text) {
      if (bridge()?.copy) {
        bridge().copy(String(text));
        return true;
      }
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    },

    // Сохранение файла: в приложении — системное окно «Сохранить как», в браузере — загрузка
    async saveFile(name, text) {
      if (bridge()?.saveFile) {
        const res = await call('saveFile', name, String(text));
        return res.ok;
      }
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return true;
    },

    // Выбор файла: работает и в браузере, и в приложении (там откроется системный проводник)
    pickFile(accept = 'application/json,.json') {
      return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';
        input.onchange = () => {
          const file = input.files[0];
          input.remove();
          if (!file) { resolve(null); return; }
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => resolve(null);
          reader.readAsText(file);
        };
        document.body.appendChild(input);
        input.click();
      });
    },

    print(html) {
      if (bridge()?.print) { bridge().print(html || ''); return; }
      window.print();
    },

    vibrate(pattern) {
      const list = Array.isArray(pattern) ? pattern : [pattern];
      if (bridge()?.vibrate) { bridge().vibrate(JSON.stringify(list)); return; }
      try { navigator.vibrate?.(list); } catch { /* не поддерживается */ }
    },

    // Экран не гаснет во время тренировки
    keepAwake(on) {
      bridge()?.keepAwake?.(!!on);
    },

    getReminder() {
      try {
        return JSON.parse(bridge()?.getReminder?.() || 'null');
      } catch {
        return null;
      }
    },

    async setReminder(enabled, hour) {
      if (!bridge()?.setReminder) return { ok: false };
      return call('setReminder', !!enabled, hour);
    },

    // Текст напоминания на языке приложения (Android хранит его у себя)
    setReminderText(text, channelName) {
      try { bridge()?.setReminderText?.(String(text), String(channelName)); } catch { /* старая версия приложения */ }
    },

    exitApp() {
      bridge()?.exit?.();
    },

    // Озвучка примера: в приложении — системный синтез речи Android, в браузере — Web Speech
    speak(text, locale) {
      try {
        if (bridge()?.speak) { bridge().speak(String(text), String(locale || '')); return true; }
        if (!window.speechSynthesis) return false;
        const u = new SpeechSynthesisUtterance(String(text));
        u.lang = locale || 'ru-RU';
        u.rate = 0.95;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
        return true;
      } catch {
        return false;
      }
    },

    // Поделиться текстом через системное меню (Telegram, WhatsApp, почта…)
    async shareText(text) {
      if (bridge()?.shareText) { bridge().shareText(String(text)); return true; }
      try {
        if (navigator.share) { await navigator.share({ text }); return true; }
      } catch { return false; }
      return this.copy(text);
    },

    // Поделиться картинкой (PNG в base64 без префикса)
    async shareImage(base64, name, text = '') {
      if (bridge()?.shareImage) { bridge().shareImage(String(base64), String(name), String(text)); return true; }
      try {
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const file = new File([bytes], name, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text }); return true; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return true;
      } catch {
        return false;
      }
    },

    // Поделиться файлом копии (например, отправить себе в Telegram или на Google Диск)
    async shareFile(name, text) {
      if (bridge()?.shareFile) { bridge().shareFile(String(name), String(text)); return true; }
      return this.saveFile(name, text);
    },

    // Автокопия в папку «Загрузки/MathForSpeed» — переживает переустановку приложения
    autoBackup(name, text) {
      try { return bridge()?.autoBackup ? !!bridge().autoBackup(String(name), String(text)) : false; } catch { return false; }
    },

    // Виджет на рабочем столе и ярлык с серией
    updateWidget(json) {
      try { bridge()?.updateWidget?.(JSON.stringify(json)); } catch { /* старая версия приложения */ }
    },
    setShortcut(label) {
      try { bridge()?.setShortcut?.(String(label)); } catch { /* старая версия приложения */ }
    },

    // Вечернее «спаси серию»: Android знает, занимался ли человек сегодня
    setStreakGuard(json) {
      try { bridge()?.setStreakGuard?.(JSON.stringify(json)); } catch { /* старая версия приложения */ }
    },

    haptic(kind) {
      try { bridge()?.haptic?.(String(kind)); } catch { /* нет */ }
    },
  };
})();

const Dialog = (() => {
  let current = null;

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function close(result) {
    if (!current) return;
    const { root, resolve, onKey } = current;
    current = null;
    document.removeEventListener('keydown', onKey, true);
    root.classList.add('closing');
    setTimeout(() => root.remove(), FX.on() ? 200 : 0);
    resolve(result);
  }

  function open({ icon = 'bulb', title = '', text = '', code = '', input = null, options = null, html = '', value = null, buttons = [], dismiss = null }) {
    if (current) close(current.dismiss);

    return new Promise(resolve => {
      const root = document.createElement('div');
      root.className = `dlg${html ? ' dlg-wide' : ''}`;
      root.innerHTML = `
        <div class="dlg-backdrop" data-dlg="dismiss"></div>
        <div class="dlg-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <div class="dlg-grip"></div>
          ${icon ? `<div class="dlg-icon">${icoInline(icon)}</div>` : ''}
          ${title ? `<h3 class="dlg-title">${esc(title)}</h3>` : ''}
          ${text ? `<p class="dlg-text">${esc(text).replace(/\n/g, '<br>')}</p>` : ''}
          ${html ? `<div class="dlg-html">${html}</div>` : ''}
          ${code ? `
            <div class="dlg-code">
              <span class="dlg-code-value">${esc(code)}</span>
              <button class="btn ghost" data-dlg="copy">${tr('{0} Скопировать', ico('clipboard'))}</button>
            </div>` : ''}
          ${input ? `
            <input class="dlg-input ${input.upper ? 'upper' : ''}" type="text"
              value="${esc(input.value || '')}" placeholder="${esc(input.placeholder || '')}"
              maxlength="${input.maxLength || 40}" autocomplete="off" autocapitalize="${input.upper ? 'characters' : 'sentences'}" spellcheck="false">` : ''}
          ${options ? `
            <div class="dlg-options">
              ${options.map((o, i) => `
                <button class="dlg-option ${o.value === value ? 'on' : ''}" data-dlg="opt" data-i="${i}">
                  ${o.icon ? `<span class="dlg-option-ico">${o.icon}</span>` : ''}
                  <span class="dlg-option-main"><b>${esc(o.label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span>
                  <span class="dlg-check" aria-hidden="true"></span>
                </button>`).join('')}
            </div>` : ''}
          ${buttons.length ? `
          <div class="dlg-buttons">
            ${buttons.map((b, i) => `<button class="btn ${b.kind || ''}" data-dlg="btn" data-i="${i}">${esc(b.label)}</button>`).join('')}
          </div>` : ''}
        </div>`;

      const onKey = e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(dismiss); }
        if (e.key === 'Enter' && input) {
          e.preventDefault();
          const primary = buttons.findIndex(b => b.kind === 'primary');
          const field = root.querySelector('.dlg-input');
          close({ button: buttons[primary >= 0 ? primary : 0]?.value, value: field.value });
        }
      };

      root.addEventListener('click', async e => {
        const el = e.target.closest('[data-dlg]');
        if (!el) return;
        const kind = el.dataset.dlg;
        if (kind === 'dismiss') { close(dismiss); return; }
        if (kind === 'copy') {
          const ok = await Native.copy(code);
          el.innerHTML = ok ? `${tr('{0} Скопировано', ico('star'))}` : tr('Выдели и скопируй вручную');
          return;
        }
        if (kind === 'btn') {
          const b = buttons[Number(el.dataset.i)];
          const field = root.querySelector('.dlg-input');
          close({ button: b.value, value: field ? field.value : null });
        }
        if (kind === 'opt') {
          const o = options[Number(el.dataset.i)];
          root.querySelectorAll('.dlg-option').forEach(x => x.classList.toggle('on', x === el));
          // короткая пауза, чтобы было видно отметку выбора
          setTimeout(() => close({ button: 'option', value: o.value }), FX.on() ? 140 : 0);
        }
      });

      document.body.appendChild(root);
      document.addEventListener('keydown', onKey, true);
      current = { root, resolve, onKey, dismiss };
      FX.drawIcons(root);

      const field = root.querySelector('.dlg-input');
      if (field) setTimeout(() => { field.focus(); field.select(); }, 60);
    });
  }

  return {
    open,
    isOpen: () => !!current,
    dismiss: () => current && close(current.dismiss),

    async confirm({ icon = 'bulb', title, text = '', ok = tr('Да'), cancel = tr('Отмена'), danger = false }) {
      const res = await open({
        icon, title, text,
        buttons: [
          { label: cancel, value: false, kind: 'ghost' },
          { label: ok, value: true, kind: danger ? 'danger-fill' : 'primary' },
        ],
        dismiss: { button: false },
      });
      return !!res?.button;
    },

    async prompt({ icon = 'keyboard', title, text = '', value = '', placeholder = '', ok = tr('Готово'), upper = false, maxLength }) {
      const res = await open({
        icon, title, text,
        input: { value, placeholder, upper, maxLength },
        buttons: [
          { label: tr('Отмена'), value: false, kind: 'ghost' },
          { label: ok, value: true, kind: 'primary' },
        ],
        dismiss: { button: false },
      });
      if (!res?.button) return null;
      const v = String(res.value || '').trim();
      return v ? (upper ? v.toUpperCase() : v) : null;
    },

    // Выбор из списка: возвращает значение выбранного пункта или null
    async choose({ icon = 'star', title, text = '', options, value = null, buttons = [] }) {
      const res = await open({ icon, title, text, options, value, buttons, dismiss: { button: null } });
      if (res?.button === 'option') return res.value;
      return res?.button ?? null;
    },

    async alert({ icon = 'star', title, text = '', code = '', ok = tr('Понятно') }) {
      await open({ icon, title, text, code, buttons: [{ label: ok, value: true, kind: 'primary' }], dismiss: { button: true } });
    },
  };
})();
