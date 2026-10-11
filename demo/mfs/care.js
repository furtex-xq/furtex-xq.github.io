'use strict';

/* =========================================================
   Забота: родительский контроль, задания с дедлайном,
   быстрое переключение детей, одноручный режим, таймер занятий,
   спокойный режим и доступность.
   ========================================================= */

/* ---------- Родительский контроль ---------- */

const guardState = d => (d.guard ||= { pin: '', limit: 0, used: 0, day: null });

function guardToday(d) {
  const g = guardState(d);
  if (g.day !== dateKey()) { g.day = dateKey(); g.used = 0; }
  return g;
}

// Минуты за сегодня считаем по длительности тренировок
Hooks.on('gameEnd', (g, session) => {
  const gu = guardToday(data);
  gu.used += (session.duration || 0) / 60;
});

const guardLeft = d => {
  const g = guardToday(d);
  return g.limit ? Math.max(0, g.limit - Math.round(g.used)) : null;
};

// Лимит исчерпан — в игру не пускаем
Hooks.on('blockStart', () => {
  const left = guardLeft(data);
  if (left === null || left > 0) return false;
  Dialog.open({
    icon: 'stopwatch',
    title: tr('Время на сегодня вышло'),
    text: tr('Родитель поставил лимит {0} мин в день. Завтра можно снова.', guardState(data).limit),
    buttons: [{ label: tr('Понятно'), kind: 'primary', value: 'ok' }],
  });
  return true;
});

async function askPin(title) {
  const g = guardState(data);
  if (!g.pin) return true;
  const res = await Dialog.prompt({ icon: 'lock', title, text: tr('Введи родительский код из четырёх цифр.'), placeholder: '••••', ok: tr('Дальше'), maxLength: 4 });
  if (String(res || '').trim() !== g.pin) { toast(tr('Код не подошёл')); return false; }
  return true;
}

async function guardOpen() {
  if (!(await askPin(tr('Родительский контроль')))) return;
  const g = guardState(data);
  const res = await Dialog.open({
    icon: 'lock',
    title: tr('Родительский контроль'),
    text: tr('Лимит времени на день и код, без которого настройки не поменять.'),
    options: [
      { label: tr('Без лимита'), value: 0 },
      { label: tr('{0} мин в день', 15), value: 15 },
      { label: tr('{0} мин в день', 30), value: 30 },
      { label: tr('{0} мин в день', 45), value: 45 },
      { label: tr('{0} мин в день', 60), value: 60 },
      { label: g.pin ? tr('Убрать код') : tr('Поставить код'), value: 'pin' },
    ],
    value: g.limit,
  });
  if (!res) return;
  if (res.value === 'pin') {
    if (g.pin) { g.pin = ''; toast(tr('Код убран')); }
    else {
      const pin = await Dialog.prompt({ icon: 'lock', title: tr('Новый код'), text: tr('Четыре цифры. Запомни их — без кода настройки не открыть.'), placeholder: '1234', ok: tr('Поставить'), maxLength: 4 });
      if (/^\d{4}$/.test(String(pin || '').trim())) { g.pin = String(pin).trim(); toast(tr('Код поставлен')); }
      else toast(tr('Нужны четыре цифры'));
    }
  } else {
    g.limit = Number(res.value) || 0;
    toast(g.limit ? tr('Лимит: {0} мин в день', g.limit) : tr('Лимит убран'));
  }
  saveData();
  if (currentView === 'settings') RENDERERS.settings();
}

/* ---------- Быстрое переключение детей ---------- */

Hooks.on('greetUnder', () => {
  if (!profiles || profiles.list.length < 2) return '';
  return `
    <div class="kid-switch">
      ${profiles.list.map(p => `
        <button class="kid ${p.id === profiles.active ? 'on' : ''}" data-action="profile-switch" data-id="${p.id}">
          <span class="kid-face" style="--pc:${p.color || 'var(--gold)'}">${escH((p.name || '?').slice(0, 1).toUpperCase())}</span>
          <small>${escH(p.name)}</small>
        </button>`).join('')}
    </div>`;
});

/* ---------- Таймер занятий ---------- */

let pomo = null;

function pomoTick() {
  if (!pomo) return;
  const left = Math.max(0, Math.round((pomo.until - Date.now()) / 1000));
  const el = document.querySelector('.pomo-left');
  if (el) el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  if (left > 0) return;
  const rest = !pomo.rest;
  pomo = { rest, until: Date.now() + (rest ? 5 : 20) * 60000 };
  Sound.achievement();
  vibrate([0, 80, 60, 80]);
  toast(rest ? tr('Перерыв 5 минут') : tr('Снова за работу: 20 минут'));
  if (currentView === 'dashboard') renderDashboard();
}

setInterval(pomoTick, 1000);

function pomoToggle() {
  if (pomo) { pomo = null; toast(tr('Таймер выключен')); }
  else { pomo = { rest: false, until: Date.now() + 20 * 60000 }; toast(tr('20 минут занятий, потом перерыв')); }
  if (currentView === 'dashboard') renderDashboard();
}

Hooks.on('dashStack', () => {
  if (!pomo) return '';
  const left = Math.max(0, Math.round((pomo.until - Date.now()) / 1000));
  return `
    <button class="row-card pomo-card ${pomo.rest ? 'rest' : ''}" data-action="pomo">
      <span class="icon-sq sm">${ico('stopwatch')}</span>
      <span class="row-main">
        <b>${pomo.rest ? tr('Перерыв') : tr('Занятие')}</b>
        <small>${tr('Нажми, чтобы выключить таймер')}</small>
      </span>
      <b class="pomo-left gold">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b>
    </button>`;
});

/* ---------- Спокойный режим ---------- */

// Без таймера, без штрафов, без спешки. Режимы на время заменяем практикой.
const TIMED_MODES = ['sprint', 'blitz', 'survival'];

Hooks.on('blockStart', (mode, variant) => {
  if (!data.settings.calm || variant || !TIMED_MODES.includes(mode)) return false;
  toast(tr('Спокойный режим: без таймера'));
  startGame('practice');
  return true;
});

Hooks.on('gameSetup', g => {
  if (!data.settings.calm) return;
  g.calm = true;
  g.noGolden = true;
  g.penaltyStep = 0;
  g.limit = 999;
  g.lives = 99;
  g.maxLives = 99;
});

Hooks.on('prefs', () => {
  document.body.classList.toggle('calm', !!data.settings.calm);
  document.body.classList.toggle('one-hand', !!data.settings.oneHand);
  document.body.classList.toggle('cb-safe', !!data.settings.colorBlind);
});

// В спокойном режиме спринт и выживание не торопят
Hooks.on('gameTop', g => (data.settings.calm && !g.silent
  ? `<div class="ladder-flag calm-flag">${ico('heart')}<b>${tr('Спокойный режим')}</b><span>${tr('Без таймера и штрафов')}</span></div>`
  : ''));

/* ---------- Озвучка примеров во всех режимах ---------- */

Hooks.on('problemShown', g => {
  if (!data.settings.speakAll || g.variant === 'audio') return;
  const p = g.problem;
  if (p && typeof spokenText === 'function') Native.speak(spokenText(p));
});

/* ---------- Задания с дедлайном ---------- */

const homework = d => (d.homework ||= []);

function hwAdd(cfg, days) {
  homework(data).push({ id: `h${Date.now().toString(36)}`, cfg, due: Date.now() + days * 86400000, done: false });
  saveData();
}

function hwCard(d) {
  const list = homework(d).filter(h => !h.done);
  if (!list.length) return '';
  const h = list[0];
  const leftMs = h.due - Date.now();
  const days = Math.ceil(leftMs / 86400000);
  return `
    <button class="row-card hw-card ${leftMs < 0 ? 'late' : ''}" data-action="hw-go" data-id="${h.id}">
      <span class="icon-sq sm">${ico('clipboard')}</span>
      <span class="row-main">
        <b>${tr('Задание: {0} верных', h.cfg.goal || 20)}</b>
        <small>${leftMs < 0 ? tr('Срок вышел') : tr('Осталось дней: {0}', days)} · ${h.cfg.ops.map(o => OPS[o]?.name).filter(Boolean).join(' · ')}</small>
      </span>
      <span class="chev">›</span>
    </button>`;
}

Hooks.on('dashStack', d => hwCard(d));

Hooks.on('gameEnd', (g, session) => {
  const list = homework(data).filter(h => !h.done);
  for (const h of list) {
    if (session.correct >= (h.cfg.goal || 20) && (h.cfg.ops || []).some(o => (g.settings.ops || []).includes(o))) {
      h.done = true;
      h.at = Date.now();
      data.coins = (data.coins || 0) + 60;
    }
  }
});

async function hwNew() {
  const s = data.settings;
  const days = await Dialog.choose({
    icon: 'calendar',
    title: tr('Задание с дедлайном'),
    text: tr('Темы и сложность берутся из тренировки. Ученик вводит код, задание появится у него на главной.'),
    options: [1, 2, 3, 7].map(v => ({ label: tr('Срок: {0} дн.', v), value: v })),
    value: 3,
  });
  if (!days) return;
  const cfg = { mode: s.mode === 'duel' ? 'sprint' : s.mode, level: s.level, ops: s.ops, goal: 20 };
  const code = `${assignmentCode(cfg)}-D${days}`;
  Dialog.open({
    icon: 'clipboard',
    title: tr('Код задания'),
    text: tr('Передай код ученику. Срок: {0} дн.', days),
    code,
    buttons: [{ label: tr('Готово'), kind: 'primary', value: 'ok' }],
  });
}

// Код с хвостом «-D3» — задание со сроком
function hwTake(code) {
  const m = /^(.*)-D(\d+)$/.exec(String(code).trim().toUpperCase());
  if (!m) return false;
  const cfg = unpackCode(m[1]);
  if (!cfg || cfg.kind !== 'Z') return false;
  hwAdd(cfg, Number(m[2]));
  toast(tr('Задание добавлено. Срок: {0} дн.', m[2]));
  return true;
}

/* ---------- Настройки ---------- */

Hooks.on('settingsGroups', () => {
  const s = data.settings;
  const { setRow, setGroup } = UI;
  const tog = (key, icon, title, sub) => setRow({ icon, title, sub, action: 'toggle', data: { key }, toggle: !!s[key] });
  const left = guardLeft(data);
  return [
    setGroup(tr('Как заниматься'), [
      tog('calm', 'heart', tr('Спокойный режим'), tr('Без таймера, штрафов и резких звуков')),
      setRow({ icon: 'bulb', title: tr('Разбор после ошибки'), sub: tr('В практике игра ждёт, пока разберёшься'), action: 'toggle', data: { key: 'wrongReview' }, toggle: s.wrongReview !== false }),
      setRow({ icon: 'stopwatch', title: tr('Таймер занятий'), sub: tr('20 минут работы, 5 перерыв'), action: 'pomo', value: pomo ? tr('Идёт') : tr('Выключен') }),
      tog('speakAll', 'speaker', tr('Читать примеры вслух'), tr('Во всех режимах, не только «На слух»')),
    ]),
    setGroup(tr('Доступность'), [
      tog('oneHand', 'keyboard', tr('Одной рукой'), tr('Клавиатура ниже и крупнее, под большой палец')),
      tog('colorBlind', 'eye', tr('Для дальтоников'), tr('Вместо красного и зелёного — синий и оранжевый')),
    ]),
    setGroup(tr('Родительский контроль'), [
      setRow({ icon: 'lock', title: tr('Родительский контроль'), sub: tr('Лимит времени и код от настроек'), action: 'guard', value: guardState(data).limit ? tr('{0} мин', guardState(data).limit) : tr('Выключен') }),
      ...(left !== null ? [setRow({ icon: 'stopwatch', title: tr('Осталось сегодня'), sub: tr('Лимит обновится завтра'), action: 'guard', value: tr('{0} мин', left) })] : []),
      setRow({ icon: 'calendar', title: tr('Задание с дедлайном'), sub: tr('Код для ученика со сроком сдачи'), action: 'hw-new' }),
    ]),
  ].join('');
});

/* ---------- Кнопки ---------- */

Hooks.on('action', (action, el) => {
  switch (action) {
    case 'guard': guardOpen(); return true;
    case 'pomo': pomoToggle(); return true;
    case 'hw-new': hwNew(); return true;
    case 'hw-go': {
      const h = homework(data).find(x => x.id === el.dataset.id);
      if (h) startGame(h.cfg.mode, { settings: { ops: [...h.cfg.ops], level: h.cfg.level, adaptive: false } });
      return true;
    }
    default: return false;
  }
});
