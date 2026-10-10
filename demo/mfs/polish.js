'use strict';

/* =========================================================
   Оформление и надёжность: знакомство, «Что нового», журнал
   ошибок, автокопия, возврат после сброса, лёгкий режим для
   слабых телефонов, темы, шрифт цифр, раскладка клавиатуры,
   масштаб, контраст, звуковые темы, музыка, свайпы между
   вкладками, переходы, пустые экраны, виджет и ярлык.
   ========================================================= */

/* ---------- Журнал ошибок ---------- */

const ERR_KEY = 'mfs-errors';

window.mfsLogError = (err, where = '') => {
  try {
    const list = JSON.parse(localStorage.getItem(ERR_KEY) || '[]');
    list.push({ t: Date.now(), v: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?', w: where, m: String(err?.message || err).slice(0, 300), s: String(err?.stack || '').split('\n').slice(0, 3).join(' | ').slice(0, 400) });
    localStorage.setItem(ERR_KEY, JSON.stringify(list.slice(-30)));
  } catch { /* память переполнена — не страшно */ }
};
window.addEventListener('error', e => window.mfsLogError(e.error || e.message, `${e.filename?.split('/').pop() || ''}:${e.lineno || ''}`));
window.addEventListener('unhandledrejection', e => window.mfsLogError(e.reason, 'promise'));

function showErrors() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(ERR_KEY) || '[]'); } catch { list = []; }
  const text = list.map(x => `${new Date(x.t).toLocaleString(I18N.locale)} · v${x.v} · ${x.w}\n${x.m}${x.s ? `\n${x.s}` : ''}`).join('\n\n');
  Dialog.open({
    icon: 'bandage',
    title: tr('Журнал ошибок'),
    text: list.length ? tr('Если что-то сломалось — скопируй журнал и отправь разработчику.') : tr('Ошибок не было. Всё работает как надо.'),
    html: list.length ? `<pre class="err-log">${escH(text)}</pre>` : '',
    buttons: list.length
      ? [{ label: tr('Очистить'), value: 'clear', kind: 'ghost' }, { label: tr('Скопировать'), value: 'copy', kind: 'primary' }]
      : [{ label: tr('Понятно'), value: false, kind: 'primary' }],
    dismiss: { button: false },
  }).then(res => {
    if (res?.button === 'copy') Native.copy(text).then(() => toast(tr('Скопировано')));
    if (res?.button === 'clear') { localStorage.removeItem(ERR_KEY); toast(tr('Журнал очищен')); }
  });
}

/* ---------- «Что нового» ---------- */

const WHATS_NEW = [
  tr('9 новых режимов: разминка, цепочка, прикидка, «верно или нет», башня, экзамен, на слух, свой набор, турнир недели'),
  tr('Пауза, подсказки и разбор ошибок с пошаговыми решениями'),
  tr('Учебник: 12 приёмов счёта, уроки, шпаргалки, карточки и словарь'),
  tr('Задания дня и недели, награда за вход, ключи и гарантия легендарного сундука'),
  tr('Магазин, коллекции, комплекты, титулы, секреты и эффекты аватара'),
  tr('Боссы, попытки, модификаторы, сезоны и карта Лестницы'),
  tr('Графики скорости, прогноз, итоги года и картинки «Поделиться»'),
  tr('Темы оформления, шрифты цифр, музыка, масштаб и автокопия прогресса'),
];
const SEEN_KEY = 'mfs-seen-version';

function maybeWhatsNew() {
  let seen = null;
  try { seen = localStorage.getItem(SEEN_KEY); } catch { return; }
  try { localStorage.setItem(SEEN_KEY, APP_VERSION); } catch { /* нет памяти */ }
  if (seen === APP_VERSION || !data.sessions.length) return;
  showWhatsNew();
}

function showWhatsNew() {
  Dialog.open({
    icon: 'sparkle',
    title: tr('Что нового в версии {0}', APP_VERSION),
    html: `<ul class="whats-new">${WHATS_NEW.map(x => `<li>${escH(x)}</li>`).join('')}</ul>`,
    buttons: [{ label: tr('Круто!'), value: true, kind: 'primary' }],
    dismiss: { button: true },
  });
}

/* ---------- Знакомство при первом запуске ---------- */

const ONB_KEY = 'mfs-onboarded';
const ONB = [
  { icon: 'bolt', title: tr('Считай быстрее'), text: tr('Короткие тренировки по 1–2 минуты каждый день — и скорость счёта растёт на глазах.') },
  { icon: 'target', title: tr('Режимы на любой вкус'), text: tr('Спринт, Блиц, Выживание, экзамен как во входном тесте, цепочка и ещё десяток режимов.') },
  { icon: 'chest', title: tr('Сундуки и награды'), text: tr('За каждую тренировку — сундук. Внутри короны, рамки и артефакты, которые можно прокачивать.') },
  { icon: 'mountain', title: tr('Лестница до 9999'), text: tr('5 примеров без ошибок — следующий уровень. Каждые 10 уровней — босс. До 100 дойдут немногие.') },
];

function showOnboarding() {
  let i = 0;
  const ov = document.createElement('div');
  ov.className = 'onb';
  const draw = () => {
    const s = ONB[i];
    const last = i === ONB.length - 1;
    ov.innerHTML = `
      <div class="onb-card">
        <button class="onb-skip" data-onb="skip">${tr('Пропустить')}</button>
        <span class="onb-ico">${ico(s.icon)}</span>
        <h2>${escH(s.title)}</h2>
        <p>${escH(s.text)}</p>
        <div class="onb-dots">${ONB.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        ${last ? `
          <div class="onb-start">
            <button class="btn primary big block" data-onb="warmup">${ico('sun')} ${tr('Начать с разминки')}</button>
            <button class="btn big ghost block" data-onb="done">${tr('Сначала осмотрюсь')}</button>
          </div>` : `<button class="btn primary big block" data-onb="next">${tr('Далее')}</button>`}
      </div>`;
    FX.drawIcons(ov);
  };
  const close = then => {
    try { localStorage.setItem(ONB_KEY, '1'); } catch { /* нет памяти */ }
    ov.classList.add('out');
    setTimeout(() => ov.remove(), 250);
    then?.();
  };
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-onb]');
    if (!b) return;
    const a = b.dataset.onb;
    if (a === 'next') { i++; Sound.click(); draw(); }
    if (a === 'skip' || a === 'done') close();
    if (a === 'warmup') close(() => startGame('warmup'));
  });
  bindSwipe(ov, dir => { if (dir === 'no' && i < ONB.length - 1) { i++; draw(); } if (dir === 'yes' && i > 0) { i--; draw(); } });
  document.body.appendChild(ov);
  draw();
}

Hooks.on('back', () => {
  const onb = document.querySelector('.onb');
  if (!onb) return false;
  onb.querySelector('[data-onb="skip"]')?.click();
  return true;
});

/* ---------- Автокопия и возврат после сброса ---------- */

const BACKUP_DAY_KEY = 'mfs-backup-day';

function autoBackup(force = false) {
  if (!Native.isApp()) return false;
  let last = null;
  try { last = localStorage.getItem(BACKUP_DAY_KEY); } catch { /* нет памяти */ }
  if (!force && last === dateKey()) return true;
  const ok = Native.autoBackup(`math-for-speed-${profileName().replace(/[^\p{L}\p{N}_-]+/gu, '_')}.json`, exportPayload());
  if (ok) try { localStorage.setItem(BACKUP_DAY_KEY, dateKey()); } catch { /* нет памяти */ }
  return ok;
}

const UNDO_KEY = () => `mfs-undo:${profiles.active}`;

function undoInfo() {
  try {
    const u = JSON.parse(localStorage.getItem(UNDO_KEY()) || 'null');
    return u && Date.now() - u.t < 7 * 864e5 ? u : null;
  } catch {
    return null;
  }
}

async function undoReset() {
  const u = undoInfo();
  if (!u) return;
  const ok = await Dialog.confirm({ icon: 'undo', title: tr('Вернуть прогресс?'), text: tr('Вернётся всё, что было до сброса {0}: {1} XP.', new Date(u.t).toLocaleDateString(I18N.locale), u.d.xp), ok: tr('Вернуть') });
  if (!ok) return;
  data = { ...defaultData(), ...u.d };
  ensureOpStats(data);
  saveData();
  localStorage.removeItem(UNDO_KEY());
  navigate('dashboard');
  toast(tr('Прогресс возвращён'));
}

// Копия перед сбросом — чтобы случайный сброс можно было отменить
Hooks.on('beforeReset', () => {
  try { localStorage.setItem(UNDO_KEY(), JSON.stringify({ t: Date.now(), d: data })); } catch { /* нет памяти */ }
});

/* ---------- Настройки оформления ---------- */

const THEMES = [
  { id: 'gold', name: tr('Золото'), color: '#ebb53d', lvl: 1 },
  { id: 'sapphire', name: tr('Сапфир'), color: '#4d8dff', lvl: 1 },
  { id: 'emerald', name: tr('Изумруд'), color: '#36d487', lvl: 1 },
  { id: 'ruby', name: tr('Рубин'), color: '#ff5468', lvl: 10 },
  { id: 'amethyst', name: tr('Аметист'), color: '#ac6bff', lvl: 20 },
  { id: 'platinum', name: tr('Платина'), color: '#dfe6ec', lvl: 30 },
];
const NUM_FONTS = [
  { id: '', name: tr('Обычный'), sample: 'font-family:var(--font-brand)' },
  { id: 'hand', name: tr('Рукописный'), sample: "font-family:Caveat,cursive" },
  { id: 'mono', name: tr('Моноширинный'), sample: 'font-family:ui-monospace,monospace' },
  { id: 'classic', name: tr('Строгий'), sample: 'font-family:Inter,sans-serif' },
];
const SOUND_THEMES = [
  { id: '', name: tr('Классика') },
  { id: 'soft', name: tr('Мягкая') },
  { id: 'retro', name: tr('8-бит') },
  { id: 'bells', name: tr('Колокольчики') },
];

function applyPlusPrefs() {
  const s = data.settings;
  const b = document.body;
  THEMES.forEach(t => b.classList.toggle(`theme-${t.id}`, s.theme === t.id && t.id !== 'gold'));
  NUM_FONTS.forEach(f => f.id && b.classList.toggle(`num-${f.id}`, s.numFont === f.id));
  b.classList.toggle('hc', !!s.contrast);
  document.documentElement.style.setProperty('--ui-zoom', String(s.uiScale || 1));
  const lite = s.lite === 'on' || (s.lite !== 'off' && autoLite);
  b.classList.toggle('fx-lite', lite);
  window.FX_LITE = lite;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = '#0a0a0a';
}
Hooks.on('prefs', applyPlusPrefs);

async function chooseFrom(title, icon, list, key, lockLevel) {
  const lvl = levelFromXp(data.xp);
  const v = await Dialog.choose({
    icon, title,
    options: list.map(x => ({
      value: x.id || '__', label: x.name,
      sub: lockLevel && x.lvl > lvl ? tr('Откроется на {0} уровне', x.lvl) : '',
      icon: x.color ? `<span class="theme-dot" style="--c:${x.color}"></span>` : x.sample ? `<span class="font-sample" style="${x.sample}">123</span>` : '',
    })),
    value: data.settings[key] || '__',
  });
  if (v == null) return;
  const item = list.find(x => (x.id || '__') === v);
  if (lockLevel && item.lvl > lvl) { toast(tr('Откроется на {0} уровне', item.lvl)); return; }
  data.settings[key] = v === '__' ? '' : v;
  saveData();
  applyPlusPrefs();
  if (key === 'soundTheme') Sound.correct(3);
  renderSettings();
}

Hooks.on('settingsGroups', () => {
  const s = data.settings;
  const { setRow, setGroup } = UI;
  const tog = (key, icon, title, sub) => setRow({ icon, title, sub, action: 'toggle', data: { key }, toggle: !!s[key] });
  const lastBackup = (() => { try { return localStorage.getItem(BACKUP_DAY_KEY); } catch { return null; } })();
  const u = undoInfo();
  const lite = { '': tr('Авто'), on: tr('Включён'), off: tr('Выключен') }[s.lite || ''];
  return [
    setGroup(tr('Оформление'), [
      setRow({ icon: 'palette', title: tr('Тема'), sub: tr('Цвет акцентов приложения'), action: 'pick-theme', value: (THEMES.find(t => t.id === (s.theme || 'gold')) || THEMES[0]).name }),
      setRow({ icon: 'font', title: tr('Шрифт цифр'), sub: tr('Как выглядят примеры и ответы'), action: 'pick-numfont', value: (NUM_FONTS.find(f => f.id === (s.numFont || '')) || NUM_FONTS[0]).name }),
      setRow({ icon: 'keyboard', title: tr('Раскладка клавиатуры'), sub: tr('Где стоят цифры 1–9'), action: 'pick-pad', value: s.padLayout === 'calc' ? tr('Как калькулятор: 789 сверху') : tr('Как телефон: 123 сверху') }),
      `<div class="set-row set-slider">
        <span class="set-ico">${ico('eye')}</span>
        <span class="set-main"><b>${tr('Масштаб')}</b><small>${Math.round((s.uiScale || 1) * 100)}%</small></span>
        <input type="range" min="0.85" max="1.3" step="0.05" value="${s.uiScale || 1}" data-action="ui-scale" aria-label="${tr('Масштаб')}">
      </div>`,
      tog('contrast', 'eye', tr('Высокий контраст'), tr('Ярче текст и границы, без свечения')),
      setRow({ icon: 'comet', title: tr('Облегчённые эффекты'), sub: tr('Для слабых телефонов: меньше частиц и теней'), action: 'pick-lite', value: lite }),
    ]),
    setGroup(tr('Звук и музыка'), [
      setRow({ icon: 'bell', title: tr('Звуковая тема'), sub: tr('Как звучат ответы и награды'), action: 'pick-sound', value: (SOUND_THEMES.find(x => x.id === (s.soundTheme || '')) || SOUND_THEMES[0]).name }),
      tog('music', 'music', tr('Музыка в тренировке'), tr('Спокойный фон, чтобы сосредоточиться')),
      tog('hapticOk', 'vibrate', tr('Отклик на верный ответ'), tr('Лёгкая вибрация при каждом верном ответе')),
    ]),
    setGroup(tr('Цели'), [
      setRow({ icon: 'calendar', title: tr('Дата экзамена'), sub: tr('Отсчёт и план на каждый день на главной'), action: 'exam-date', value: data.examGoal?.date ? data.examGoal.date.split('-').reverse().join('.') : tr('Не задана') }),
    ]),
    setGroup(tr('Класс'), [
      setRow({ icon: 'users', title: tr('Мой код для учителя'), sub: tr('Отчёт за неделю одним кодом'), action: 'student-code' }),
      setRow({ icon: 'clipboard', title: tr('Класс (для учителя)'), sub: tr('Собери коды учеников в одну таблицу'), action: 'nav', data: { view: 'class' } }),
      setRow({ icon: 'users', title: tr('Лидеры устройства'), sub: tr('Все профили на этом телефоне'), action: 'nav', data: { view: 'leaders' } }),
    ]),
    setGroup(tr('Надёжность'), [
      ...(Native.isApp() ? [setRow({ icon: 'save', title: tr('Автокопия'), sub: tr('Каждый день в «Загрузки/MathForSpeed» — переживёт переустановку'), action: 'backup-now', value: lastBackup ? new Date(lastBackup).toLocaleDateString(I18N.locale) : tr('Сделать') })] : []),
      setRow({ icon: 'share', title: tr('Отправить копию'), sub: tr('В Telegram, на Google Диск или почту'), action: 'backup-share' }),
      ...(u ? [setRow({ icon: 'undo', title: tr('Вернуть прогресс до сброса'), sub: tr('Сброс был {0}', new Date(u.t).toLocaleDateString(I18N.locale)), action: 'undo-reset' })] : []),
      setRow({ icon: 'sparkle', title: tr('Что нового'), sub: tr('Изменения в версии {0}', APP_VERSION), action: 'whats-new' }),
      setRow({ icon: 'bandage', title: tr('Журнал ошибок'), sub: tr('Если что-то сломалось'), action: 'error-log' }),
    ]),
  ].join('');
});

document.addEventListener('input', e => {
  if (e.target.dataset?.action !== 'ui-scale') return;
  data.settings.uiScale = Number(e.target.value);
  document.documentElement.style.setProperty('--ui-zoom', String(data.settings.uiScale));
  const lbl = e.target.closest('.set-row')?.querySelector('small');
  if (lbl) lbl.textContent = `${Math.round(data.settings.uiScale * 100)}%`;
});
document.addEventListener('change', e => { if (e.target.dataset?.action === 'ui-scale') saveData(); });

/* ---------- Лёгкий режим для слабых телефонов ---------- */

let autoLite = false;

function measureFps() {
  let frames = 0;
  let start = 0;
  const step = t => {
    if (!start) start = t;
    frames++;
    if (t - start < 1500) { requestAnimationFrame(step); return; }
    const fps = (frames * 1000) / (t - start);
    autoLite = fps < 38;
    if (autoLite) applyPlusPrefs();
  };
  requestAnimationFrame(step);
}

/* ---------- Музыка в тренировке (синтез, без файлов) ---------- */

const Music = (() => {
  let ctx = null, master = null, timer = null, step = 0;
  const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const hz = m => 440 * 2 ** ((m - 69) / 12);

  function note(freq, t, dur, vol, type = 'sine') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function tick() {
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
    if (step % 8 === 0) chord.forEach(m => note(hz(m - 12), t, 3.6, 0.05, 'triangle'));
    if (step % 2 === 0) note(hz(chord[(step / 2) % 3] + 12), t, 0.6, 0.035);
    step++;
  }

  return {
    start() {
      if (!data.settings.music || !data.settings.sound || timer) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx ||= new AC();
      if (ctx.state === 'suspended') ctx.resume();
      master = ctx.createGain();
      master.gain.value = 0.9 * (data.settings.volume ?? 0.6);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      master.connect(lp).connect(ctx.destination);
      step = 0;
      tick();
      timer = setInterval(tick, 450);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      if (master && ctx) {
        const m = master;
        m.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        setTimeout(() => m.disconnect(), 500);
      }
      master = null;
    },
  };
})();

Hooks.on('problemShown', g => { if ((g.correct + g.wrong) === 0) Music.start(); });
Hooks.on('gameEnd', () => Music.stop());
Hooks.on('navigated', () => Music.stop());

// Лёгкая вибрация на верный ответ
Hooks.on('afterAnswer', (g, ok) => { if (ok && data.settings.hapticOk && !g.silent) vibrate(8); });

/* ---------- Свайпы между вкладками и направление перехода ---------- */

const TAB_ORDER = ['dashboard', 'training', 'stats', 'settings'];
let prevView = 'dashboard';

Hooks.on('navigated', view => {
  const a = TAB_ORDER.indexOf(prevView);
  const b = TAB_ORDER.indexOf(view);
  const app = $('#app');
  app.classList.remove('from-left', 'from-right');
  if (a >= 0 && b >= 0 && a !== b && FX.on()) {
    void app.offsetWidth;
    app.classList.add(b > a ? 'from-right' : 'from-left');
  }
  prevView = view;
  updateOutside();
});

(() => {
  let x0 = null, y0 = 0, t0 = 0, skip = false;
  document.addEventListener('touchstart', e => {
    const t = e.touches[0];
    skip = !TAB_ORDER.includes(currentView) || !!e.target.closest('input, textarea, .speed-ops, .learn-tabs, .segmented, .login-days, .dlg, .chips, .map-wrap');
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (x0 === null || skip) { x0 = null; return; }
    const t = e.changedTouches[0];
    const dx = t.clientX - x0;
    const dy = t.clientY - y0;
    x0 = null;
    if (Date.now() - t0 > 600 || Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2) return;
    const i = TAB_ORDER.indexOf(currentView);
    const j = i + (dx < 0 ? 1 : -1);
    if (j >= 0 && j < TAB_ORDER.length) navigate(TAB_ORDER[j]);
  }, { passive: true });
})();

/* ---------- Пустые экраны с рисунком и плавные числа монет ---------- */

let coinsShown = null;

const appObserver = new MutationObserver(() => {
  document.querySelectorAll('#app div[class="empty"]:not([data-deco]), #app div[class="card empty"]:not([data-deco])').forEach(el => {
    el.dataset.deco = '1';
    el.insertAdjacentHTML('afterbegin', `<span class="empty-ico">${ico('comet')}</span>`);
  });
  const num = document.querySelector('#app .fh-num:not([data-cu])');
  if (num) {
    num.dataset.cu = '1';
    const to = data.coins || 0;
    if (coinsShown !== null && coinsShown !== to && FX.on()) FX.countUp(num, to, { from: coinsShown, ms: 900 });
    coinsShown = to;
  }
});

/* ---------- Виджет, ярлык и «спаси серию» — для Android ---------- */

function updateOutside() {
  if (!Native.isApp()) return;
  const streak = dayStreak(data);
  const today = data.daily[dateKey()] || 0;
  Native.updateWidget({
    streak, level: levelFromXp(data.xp), today, goal: data.dailyGoal, name: profileName(),
    labels: { streak: tr('дней подряд'), today: tr('сегодня'), level: tr('уровень'), go: tr('Тренировка') },
  });
  Native.setShortcut(streak ? tr('🔥 {0} — продолжить', streak) : tr('Быстрая тренировка'));
  Native.setStreakGuard({
    day: dateKey(), trained: today > 0, streak,
    title: tr('Серия {0} {1} под угрозой', streak, plural(streak, 'день', 'дня', 'дней')),
    text: tr('Реши пару примеров до полуночи, чтобы не потерять серию'),
  });
}

// Ярлык на иконке приложения запускает тренировку сразу
let quickPending = false;
window.mfsQuick = () => {
  if (game) return;
  // Приложение ещё показывает заставку — стартуем сразу после неё
  if (document.getElementById('intro') || document.querySelector('.onb')) { quickPending = true; return; }
  startGame(data.settings.mode === 'mistakes' && !data.mistakes.length ? 'sprint' : data.settings.mode === 'ladder' ? 'sprint' : data.settings.mode);
};

/* ---------- Действия ---------- */

Hooks.on('action', action => {
  switch (action) {
    case 'pick-theme': chooseFrom(tr('Тема'), 'palette', THEMES, 'theme', true); return true;
    case 'pick-numfont': chooseFrom(tr('Шрифт цифр'), 'font', NUM_FONTS, 'numFont'); return true;
    case 'pick-sound': chooseFrom(tr('Звуковая тема'), 'bell', SOUND_THEMES, 'soundTheme'); return true;
    case 'pick-pad':
      Dialog.choose({
        icon: 'keyboard', title: tr('Раскладка клавиатуры'),
        options: [{ value: 'phone', label: tr('Как телефон: 123 сверху') }, { value: 'calc', label: tr('Как калькулятор: 789 сверху') }],
        value: data.settings.padLayout === 'calc' ? 'calc' : 'phone',
      }).then(v => { if (!v) return; data.settings.padLayout = v; saveData(); renderSettings(); });
      return true;
    case 'pick-lite':
      Dialog.choose({
        icon: 'comet', title: tr('Облегчённые эффекты'),
        options: [{ value: 'auto', label: tr('Авто'), sub: tr('Включится сам, если телефон не успевает') }, { value: 'on', label: tr('Включён') }, { value: 'off', label: tr('Выключен') }],
        value: data.settings.lite || 'auto',
      }).then(v => { if (!v) return; data.settings.lite = v === 'auto' ? '' : v; saveData(); applyPlusPrefs(); renderSettings(); });
      return true;
    case 'backup-now':
      toast(autoBackup(true) ? tr('Копия сохранена в «Загрузки/MathForSpeed»') : tr('Не удалось сохранить копию'));
      renderSettings();
      return true;
    case 'backup-share':
      Native.shareFile(`math-for-speed-${profileName()}-${dateKey()}.json`, exportPayload());
      return true;
    case 'undo-reset': undoReset(); return true;
    case 'whats-new': showWhatsNew(); return true;
    case 'error-log': showErrors(); return true;
    default: return false;
  }
});

/* ---------- Запуск ---------- */

Hooks.on('boot', () => {
  applyPlusPrefs();
  appObserver.observe(document.getElementById('app'), { childList: true, subtree: true });
  document.getElementById('toast')?.setAttribute('role', 'status');
});

Hooks.on('ready', () => {
  measureFps();
  if (quickPending || /[?&]quick=1/.test(location.search)) { quickPending = false; setTimeout(() => window.mfsQuick(), 500); }
  setTimeout(() => {
    let onboarded = true;
    try { onboarded = !!localStorage.getItem(ONB_KEY); } catch { /* нет памяти */ }
    if (!onboarded && !data.sessions.length) showOnboarding();
    else maybeWhatsNew();
    autoBackup();
    updateOutside();
  }, 700);
});

Hooks.on('beforeSave', () => { setTimeout(() => { autoBackup(); updateOutside(); }, 1500); });
