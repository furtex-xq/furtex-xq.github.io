'use strict';

const APP_VERSION = '1.25';

/* Константы, генератор примеров — в gen.js, звук — в sound.js */

/* =========================================================
   Данные и сохранение
   ========================================================= */

function defaultData() {
  return {
    xp: 0,
    totalSolved: 0,
    totalCorrect: 0,
    bestStreak: 0,
    dailyGoal: 50,
    daily: {},
    sessions: [],
    records: {},
    mistakes: [],
    achievements: {},
    opStats: {
      add: { n: 0, c: 0, t: 0 },
      sub: { n: 0, c: 0, t: 0 },
      mul: { n: 0, c: 0, t: 0 },
      div: { n: 0, c: 0, t: 0 },
      pow: { n: 0, c: 0, t: 0 },
      pct: { n: 0, c: 0, t: 0 },
      frac: { n: 0, c: 0, t: 0 },
      order: { n: 0, c: 0, t: 0 },
      cmp: { n: 0, c: 0, t: 0 },
      round: { n: 0, c: 0, t: 0 },
      neg: { n: 0, c: 0, t: 0 },
      rem: { n: 0, c: 0, t: 0 },
      eq: { n: 0, c: 0, t: 0 },
      time: { n: 0, c: 0, t: 0 },
      money: { n: 0, c: 0, t: 0 },
      dvs: { n: 0, c: 0, t: 0 },
      expo: { n: 0, c: 0, t: 0 },
      alg: { n: 0, c: 0, t: 0 },
      word: { n: 0, c: 0, t: 0 },
      geo: { n: 0, c: 0, t: 0 },
      units: { n: 0, c: 0, t: 0 },
      stat: { n: 0, c: 0, t: 0 },
      ratio: { n: 0, c: 0, t: 0 },
      solid: { n: 0, c: 0, t: 0 },
    },
    tableStats: {},
    challenges: {},
    dailyChallenge: { key: null, done: false },
    assignment: null,
    freezes: 2,
    freezeDays: {},
    freezeGrant: 0,
    settings: {
      mode: 'sprint',
      ops: ['add', 'sub'],
      level: 'easy',
      tableNums: [2, 3, 4, 5, 6, 7, 8, 9],
      tableDiv: false,
      autoCheck: true,
      answerMode: 'input',
      sound: true,
      volume: 0.6,
      animations: true,
      adaptive: true,
      shuffle: true,
      vibrate: true,
      tips: true,
      bigText: false,
      leftHand: false,
      fullscreen: false,
    },
    ladder: { level: 0, best: 0 },
    profile: { avatar: null, pos: 'left', crown: 'wood', tg: '', ig: '' },
  };
}

// У каждой темы должна быть своя строка статистики, даже у добавленных позже
function ensureOpStats(d) {
  for (const k of Object.keys(OPS)) d.opStats[k] ||= { n: 0, c: 0, t: 0 };
  return d;
}

function loadData() {
  const base = ensureOpStats(defaultData());
  try {
    const raw = localStorage.getItem(profileKey());
    if (!raw) return base;
    const saved = JSON.parse(raw);
    return ensureOpStats({
      ...base,
      ...saved,
      opStats: { ...base.opStats, ...(saved.opStats || {}) },
      settings: { ...base.settings, ...(saved.settings || {}) },
      tableStats: saved.tableStats || {},
      challenges: saved.challenges || {},
      freezeDays: saved.freezeDays || {},
      dailyChallenge: saved.dailyChallenge || base.dailyChallenge,
    });
  } catch {
    return base;
  }
}

function saveData() {
  try {
    localStorage.setItem(profileKey(), JSON.stringify(data));
  } catch {
    toast(tr('Не удалось сохранить прогресс'));
  }
}

let data = loadData();
let game = null;
let currentView = 'dashboard';

/* =========================================================
   Утилиты
   ========================================================= */

const $ = sel => document.querySelector(sel);
// rnd() живёт в features.js: обычно это Math.random, но может стать
// предсказуемым, когда двум игрокам нужны одинаковые примеры
function dateKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Пропущенный день не рвёт серию, если он закрыт заморозкой
function dayStreak(d) {
  const active = key => (d.daily[key] || 0) > 0 || (d.freezeDays || {})[key];
  const cur = new Date();
  if (!active(dateKey(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (active(dateKey(cur))) {
    n++;
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

const levelFromXp = xp => Math.floor(Math.sqrt(xp / 40)) + 1;
const xpForLevel = lvl => 40 * (lvl - 1) ** 2;

// plural() теперь в i18n.js — он учитывает правила выбранного языка

const fmtSec = s => (Math.round(s * 10) / 10).toFixed(1);

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  FX.toastShow(el);
  clearTimeout(toast.t);
  toast.t = setTimeout(() => FX.toastHide(el, () => { el.hidden = true; }), 2500);
}

// Вибрация на телефоне (в браузере на компьютере просто ничего не делает)
function vibrate(pattern) {
  if (!data.settings.vibrate) return;
  Native.vibrate(pattern);
}

// Во время тренировки экран не гаснет. В приложении Android полный экран включён всегда,
// а в браузере его можно включить в настройках.
function setFullscreen(on) {
  Native.keepAwake(on);
  if (Native.isApp() || !data.settings.fullscreen) return;
  try {
    if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  } catch { /* браузер может запретить */ }
}

function recordKey(mode, level, ops, answerMode) {
  return `${mode}|${level}|${[...ops].sort().join(',')}${answerMode === 'choice' ? '|choice' : ''}`;
}

function recordLabel(key) {
  const [mode, level, ops, answerMode] = key.split('|');
  const syms = ops.split(',').map(o => OPS[o]?.sym).join(' ');
  return `${MODES[mode].name} · ${LEVELS[level].name} · ${syms}${answerMode === 'choice' ? tr(' · варианты') : ''}`;
}

// Пример в красивом виде (степени, дроби): «13² = ?»
const problemHtml = p => p.html || `${p.text} = ?`;

// Пример с подставленным ответом: «13² = 169», «18 от 72 = 25%»
// Вопрос словами («…за сколько часов?») — ответ ставим после стрелки, а не вместо знака вопроса
const isQuestion = p => p.kind === 'yn' || (/\?\s*$/.test(problemHtml(p)) && !/=\s*\?\s*$/.test(problemHtml(p)));
const solvedHtml = p => (isQuestion(p)
  ?`${problemHtml(p)} → <b class="ans">${answerHtml(p.answer)}</b>`
  : problemHtml(p).replace('?', `<b class="ans">${answerHtml(p.answer)}</b>`));

function answerHtml(s) {
  s = String(s);
  if (s === 'yes') return tr('Да');
  if (s === 'no') return tr('Нет');
  if (!s.includes('/')) return s;
  const [n, d] = s.split('/');
  return fracHtml(n, d);
}

const lowerIsBetter = mode => mode === 'blitz';
const formatScore = (mode, score) => (mode === 'blitz' ? `${tr('{0} с', fmtSec(score))}` : String(score));

/* =========================================================
   Навигация
   ========================================================= */

const OP_COLORS = {
  add: '#e5484d',
  sub: '#8b5cf6',
  mul: '#3b6fe0',
  div: '#3fbf73',
  pow: '#d6b25e',
  pct: '#f08a3c',
  frac: '#2cc2c9',
};

const MODE_COLORS = { sprint: 'var(--gold)', blitz: 'var(--bad)', survival: 'var(--ok)' };


const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

function navigate(view) {
  if (game && !game.ended) abortGame();
  currentView = view;
  document.body.classList.remove('in-game', 'fit-game', 'choice-game', 'speedy', 'fx-countdown');
  setActiveNav(view);
  renderLevelChip();
  window.scrollTo(0, 0);
  RENDERERS[view]();
  FX.enterView(view);
  FX.navActivated(view);
  if (view === 'dashboard') FX.dashboard(dashboardFx);
  if (view === 'stats') FX.stats('enter');
  Hooks.run('navigated', view);
}

function rerender() {
  if (RENDERERS[currentView]) RENDERERS[currentView]();
}

function setActiveNav(view) {
  document.querySelectorAll('.nav-item').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  FX.moveNavIndicator();
}

// Данные для анимаций главной (заполняются при отрисовке)
let dashboardFx = { xp: 0, level: 1, goalPct: 0, streak: 0 };

function renderLevelChip() {
  const lvl = levelFromXp(data.xp);
  $('#levelChip').innerHTML = `${ico('star')} <b>${lvl}</b><span class="sep"></span><span class="muted">${data.xp} XP</span>`;
  renderSoundBtn();
}

function renderSoundBtn() {
  const btn = $('#soundBtn');
  btn.innerHTML = icoInline(data.settings.sound ? 'speaker' : 'mute');
  btn.title = data.settings.sound ? tr('Выключить звук') : tr('Включить звук');
}

/* =========================================================
   Главная
   ========================================================= */

function renderDashboard() {
  const d = data;
  const lvl = levelFromXp(d.xp);
  const lvlStart = xpForLevel(lvl);
  const lvlEnd = xpForLevel(lvl + 1);
  const lvlPct = Math.round(((d.xp - lvlStart) / (lvlEnd - lvlStart)) * 100);

  const today = d.daily[dateKey()] || 0;
  const goalPct = Math.min(100, Math.round((today / d.dailyGoal) * 100));
  const streak = dayStreak(d);

  const accuracy = d.totalSolved ? Math.round((d.totalCorrect / d.totalSolved) * 100) : 0;
  const totals = Object.values(d.opStats).reduce((acc, s) => ({ n: acc.n + s.n, t: acc.t + s.t }), { n: 0, t: 0 });
  const avgTime = totals.n ? `${tr('{0} с', fmtSec(totals.t / totals.n / 1000))}` : '—';

  const hour = new Date().getHours();
  const greet = hour < 6 ? tr('Доброй ночи') : hour < 12 ? tr('Доброе утро') : hour < 18 ? tr('Добрый день') : tr('Добрый вечер');
  const dateStr = capitalize(new Date().toLocaleDateString(I18N.locale, { weekday: 'long', day: 'numeric', month: 'long' }));

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    days.push({ label: dt.toLocaleDateString(I18N.locale, { weekday: 'short' }), val: d.daily[dateKey(dt)] || 0, today: i === 0 });
  }
  const maxDay = Math.max(d.dailyGoal, ...days.map(x => x.val));
  const weekTotal = days.reduce((acc, x) => acc + x.val, 0);

  const records = Object.entries(d.records).sort((a, b) => b[1].date - a[1].date).slice(0, 5);
  const top = d.mistakes[0];
  achInit(d);
  const allAchieved = achTotal(d) >= ACH_TRACKS.length * 10;
  dashboardFx = { xp: d.xp, level: lvl, goalPct, streak };

  $('#app').innerHTML = `
    <section class="greet pos-${profileData(d).pos || 'left'}">
      <button class="greet-avatar" data-action="nav" data-view="profile" aria-label="${tr('Профиль')}">${avatarHtml(d)}<span class="lvl-badge">${lvl}</span></button>
      <div class="greet-text">
        <h1>${escH(profileName())}</h1>
        ${Hooks.html('greetUnder', d)}
        <p>${greet} · ${dateStr}</p>
        <div class="pf-socials">${socialChips(d, true)}</div>
      </div>
    </section>
    ${Hooks.html('dashTop', d)}
    ${ladderCard(d)}

    <section class="card glow">
      <div class="hero-top">
        <span class="eyebrow">${tr('Общий опыт')}</span>
        <button class="icon-sq sm" data-action="nav" data-view="stats" aria-label="${tr('Статистика')}">›</button>
      </div>
      <div class="hero-value"><span class="num">${d.xp.toLocaleString(I18N.locale)}</span><span class="unit">XP</span></div>
      <div class="pills">
        <span class="pill-stat"><i>${ico('star')}</i>${tr('Уровень {0}', lvl)}</span>
        <span class="pill-stat"><i>${ico('fire')}</i>${tr('{0} {1} подряд', streak, plural(streak, 'день', 'дня', 'дней'))}</span>
      </div>
      <div class="xp-line">
        <div class="bar"><div style="width:${lvlPct}%"></div></div>
        <small>${tr('{0} / {1} XP до уровня {2}', d.xp - lvlStart, lvlEnd - lvlStart, lvl + 1)}</small>
      </div>
      <div class="tiles">
        <div class="tile"><span class="tile-ico">${ico('calc')}</span><small>${tr('Решено')}</small><b>${d.totalSolved}</b><em>${d.sessions.length} ${plural(d.sessions.length, 'тренировка', 'тренировки', 'тренировок')}</em></div>
        <div class="tile"><span class="tile-ico">${ico('target')}</span><small>${tr('Точность')}</small><b>${accuracy}%</b><em>${tr('{0} верных', d.totalCorrect)}</em></div>
        <div class="tile"><span class="tile-ico">${ico('stopwatch')}</span><small>${tr('Ср. время')}</small><b>${avgTime}</b><em>${tr('серия {0}', d.bestStreak)}</em></div>
      </div>
    </section>

    <div class="stack" style="margin-top:12px">
      ${Hooks.html('dashStack', d)}
      ${UI.dailyCard()}
      ${UI.assignmentCard()}
      ${UI.reviewCard()}
      <button class="row-card goal-row" data-action="nav" data-view="settings">
        <span class="icon-sq sm">${ico('target')}</span>
        <span class="row-main">
          <b><span class="goal-title">${goalPct >= 100 ? tr('Цель дня выполнена!') : `${tr('Цель дня: {0} из {1} верных ответов', today, d.dailyGoal)}`}</span></b>
          <span class="bar"><span style="width:${goalPct}%"></span></span>
        </span>
        <span class="chev">›</span>
      </button>

      <div class="card" style="padding:16px 20px">
        <div class="row-head">
          <span class="icon-sq sm">${ico('chart')}</span>
          <span class="gold">${tr('Активность')}</span>
          <span class="muted">${tr('· 7 дней · {0} верных', weekTotal)}</span>
        </div>
        <div class="week">
          ${days.map(x => `
            <div class="week-col">
              <div class="week-bar-wrap">
                <div class="week-bar ${x.today ? 'today' : x.val ? 'filled' : ''}" style="height:${Math.max(3, (x.val / maxDay) * 100)}%">
                  ${x.val ? `<span class="val">${x.val}</span>` : ''}
                </div>
              </div>
              <small>${x.label}</small>
            </div>`).join('')}
        </div>
      </div>

      ${top ? `
        <button class="row-card big-row" data-action="quick" data-mode="mistakes">
          <span class="row-head">${ico('fire')} <span>${tr('Больше всего ошибок')}</span></span>
          <span class="row-body">
            <span class="emoji-sq">${opIco(top.op)}</span>
            <span class="row-main">
              <b>${solvedHtml(top)}</b>
              <small>${tr('{0} {1} на повторение', d.mistakes.length, plural(d.mistakes.length, 'пример', 'примера', 'примеров'))}</small>
            </span>
            <span class="chev">›</span>
          </span>
        </button>` : ''}

      ${UI.tipCard()}
      ${Hooks.html('dashAfterTip', d)}

      <div class="actions3">
        <button class="action-tile" data-action="quick" data-mode="sprint"><span class="orb">${ico('bolt')}</span>${tr('Спринт')}</button>
        <button class="action-tile" data-action="quick" data-mode="blitz"><span class="orb">${ico('stopwatch')}</span>${tr('Блиц 20')}</button>
        <button class="action-tile" data-action="quick" data-mode="survival"><span class="orb">${ico('heart')}</span>${tr('Выживание')}</button>
      </div>
    </div>

    <div class="section-title"><h2>${tr('Другие режимы')}</h2><span>${tr('С последними настройками')}</span></div>
    <div class="mode-cards four">
      ${['table', 'practice', 'mistakes', 'duel'].map(m => {
        const disabled = m === 'mistakes' && !d.mistakes.length;
        return `
        <button class="mode-card" data-action="quick" data-mode="${m}" ${disabled ? 'disabled style="opacity:.45;cursor:not-allowed"' : ''}>
          <span class="ico">${ico(MODES[m].icon)}</span>
          <b>${MODES[m].name}</b>
          <span>${m === 'mistakes' ? (disabled ? tr('Ошибок пока нет') : `${tr('{0} на повторение', d.mistakes.length)}`) : MODES[m].desc}</span>
          ${m === 'mistakes' && dueMistakes().length ? `<span class="tag">${tr('{0} к повторению', dueMistakes().length)}</span>` : ''}
        </button>`;
      }).join('')}
    </div>

    ${Hooks.html('dashModes', d)}

    <div class="section-title"><h2>${tr('Рекорды')}</h2><span>${tr('Нажми, чтобы побить')}</span></div>
    <div class="card" style="padding:4px 20px">
      ${records.length ? `<div class="list">${records.map(([key, r]) => {
        const mode = key.split('|')[0];
        return `
          <button class="list-row" data-action="record" data-key="${key}">
            <span class="dot" style="background:${MODE_COLORS[mode]};color:${MODE_COLORS[mode]}"></span>
            <span class="grow">${recordLabel(key)}</span>
            <b class="gold">${formatScore(mode, r.score)}</b>
            <span class="chev">›</span>
          </button>`;
      }).join('')}</div>`
        : `<div class="empty">${tr('Пройди Спринт, Блиц или Выживание до конца, чтобы установить рекорд')}</div>`}
    </div>

    <div class="section-title"><h2>${tr('Достижения')}</h2><span>${tr('{0} из {1}', achTotal(d), ACH_TRACKS.length * 10)}</span></div>
    <div class="row-card ach-bonus">
      <span class="icon-sq sm">${ico('medal')}</span>
      <span class="row-main">
        <b>${tr('Слава за достижения')}</b>
        <small class="muted">${tr('Каждая ступень даёт монеты и опыт, а за ступени IV, VII и X дают ключ от сундука')}</small>
      </span>
      <b class="gold ach-pct">+${fmtDec(Math.round(achXpBonus(d) * 1000) / 10)}%<em>XP</em></b>
    </div>
    <div class="ach-grid twelve ${allAchieved ? 'all-done' : ''}">
      ${ACH_TRACKS.map(t => {
        const tier = d.achTiers[t.id] || 0;
        const r = tier ? RARITIES[tier - 1] : null;
        const [frac, ptext] = achProgress(t, d, tier);
        return `
        <button class="ach tier-${tier} ${tier ? '' : 'locked'}" data-action="ach" data-ach="${t.id}" style="--rc:${r ? r.color : '#555'}">
          ${tier ? `<span class="ach-tier">${ROMAN[tier - 1]}</span>` : `<span class="ach-lock">${ico('lock')}</span>`}
          <span class="ico">${ico(t.icon)}</span><b>${t.name}</b>
          <small class="ach-rarity">${r ? r.name : tr('Не открыто')}</small>
          <small>${t.goal(t.tiers[Math.min(tier, 9)])}</small>
          <div class="ach-progress"><div style="width:${frac * 100}%"></div></div><span class="ach-progress-text">${ptext}</span>
        </button>`;
      }).join('')}
    </div>
    ${Hooks.html('dashBottom', d)}
  `;
}

/* =========================================================
   Тренировка — настройка
   ========================================================= */

function renderTraining() {
  const s = data.settings;
  if (s.mode === 'mistakes' && !data.mistakes.length) s.mode = 'sprint';
  const mode = s.mode;
  const usesOps = mode !== 'table' && mode !== 'mistakes';
  const rec = ['sprint', 'blitz', 'survival'].includes(mode) ? data.records[recordKey(mode, s.level, s.ops, s.answerMode)] : null;

  $('#app').innerHTML = `
    <h1 class="page-title">${tr('Тренировка')}</h1>
    ${ladderCard(data)}
    ${Hooks.html('trainingTop', s)}
    <div class="mode-cards">
      ${Object.keys(MODES).filter(m => m !== 'duel' && m !== 'ladder').map(m => {
        const disabled = m === 'mistakes' && !data.mistakes.length;
        return `
        <button class="mode-card ${m === mode ? 'selected' : ''}" data-action="mode" data-mode="${m}" ${disabled ? 'disabled style="opacity:.45;cursor:not-allowed"' : ''}>
          <span class="ico">${ico(MODES[m].icon)}</span>
          <b>${MODES[m].name}</b>
          <span>${disabled ? tr('Ошибок пока нет') : MODES[m].desc}</span>
        </button>`;
      }).join('')}
    </div>

    <div class="setup">
      <div class="card">
        ${usesOps ? `
          <div class="field">
            <span class="eyebrow field-label">${tr('Действия')}</span>
            <div class="chips ops-grid">
              ${Object.entries(OPS).map(([k, o]) => `
                <button class="chip ${s.ops.includes(k) ? 'on' : ''}" data-action="op" data-op="${k}">${opIco(k)}${o.name}${Hooks.html('opBadge', k)}</button>`).join('')}
            </div>
            ${UI.divRulesCard()}
            ${UI.testPresetCard()}
          </div>
          <div class="field">
            <span class="eyebrow field-label">${tr('Сложность')}</span>
            <div class="segmented">
              ${Object.entries(LEVELS).map(([k, l]) => `
                <button class="${s.level === k ? 'on' : ''}" data-action="level" data-level="${k}"><i class="lvl-bars n${Object.keys(LEVELS).indexOf(k) + 1}"><b></b><b></b><b></b></i>${l.name}<small class="lvl-mult">×${l.mult}</small></button>`).join('')}
            </div>
          </div>
          <div class="field toggle-row">
            <div>
              <label>${tr('Вперемешку')}</label>
              <span class="muted" style="font-size:13px">${s.shuffle !== false ? tr('Темы идут в случайном порядке') : tr('Темы по очереди, по 5 примеров подряд')}</span>
            </div>
            <button class="switch ${s.shuffle !== false ? 'on' : ''}" data-action="shuffle" aria-label="${tr('Вперемешку')}"></button>
          </div>
          <div class="field toggle-row">
            <div>
              <label>${tr('Умная сложность')}</label>
              <span class="muted" style="font-size:13px">${s.adaptive ? tr('Уровень меняется по твоим ответам') : tr('Уровень не меняется во время игры')}</span>
            </div>
            <button class="switch ${s.adaptive ? 'on' : ''}" data-action="adaptive-toggle" aria-label="${tr('Умная сложность')}"></button>
          </div>
          ${Hooks.html('trainingFields', s)}` : ''}
        ${mode === 'table' ? `
          <div class="field">
            <span class="eyebrow field-label">${tr('Числа для отработки')}</span>
            <div class="chips nums-grid">
              ${Array.from({ length: 20 }, (_, i) => i + 1).map(n => `
                <button class="chip ${s.tableNums.includes(n) ? 'on' : ''}" data-action="tnum" data-n="${n}">${n}</button>`).join('')}
            </div>
          </div>
          <div class="field toggle-row">
            <label>${tr('Добавить деление')}</label>
            <button class="switch ${s.tableDiv ? 'on' : ''}" data-action="tdiv" aria-label="${tr('Добавить деление')}"></button>
          </div>` : ''}
        ${mode === 'mistakes' ? `
          <div class="field">
            <span class="eyebrow field-label">${tr('Примеры на повторение')}</span>
            <div class="chips">
              ${data.mistakes.slice(0, 20).map(m => `<span class="chip">${m.text}</span>`).join('')}
            </div>
            <p class="hint">${tr('Верно решённый пример постепенно уходит из списка.')}</p>
          </div>` : ''}
        <div class="field">
          <span class="eyebrow field-label">${tr('Формат ответа')}</span>
          <div class="segmented">
            <button class="${s.answerMode === 'input' ? 'on' : ''}" data-action="answermode" data-am="input">${tr('{0} Ввод числа', ico('keyboard'))}</button>
            <button class="${s.answerMode === 'choice' ? 'on' : ''}" data-action="answermode" data-am="choice">${tr('{0} 4 варианта', ico('choice'))}</button>
          </div>
          ${usesOps && s.answerMode === 'input' && s.ops.some(o => ['frac', 'cmp', 'alg', 'dvs'].includes(o)) ? `<p class="hint">${tr('Ввод числа: сравнение и раскрытие скобок пропускаются, а дроби и делимость даются с числовым ответом. Чтобы они были как есть — выбери «4 варианта».')}</p>` : ''}
        </div>
        <div class="field toggle-row" ${s.answerMode === 'choice' ? 'hidden' : ''}>
          <div>
            <label>${tr('Автопроверка')}</label>
            <span class="muted" style="font-size:13px">${tr('Ответ засчитывается сразу, без Enter')}</span>
          </div>
          <button class="switch ${s.autoCheck ? 'on' : ''}" data-action="autocheck" aria-label="${tr('Автопроверка')}"></button>
        </div>
      </div>

      <div class="card glow summary">
        <span class="ico">${ico(MODES[mode].icon)}</span>
        <h3>${MODES[mode].name}</h3>
        <p>${MODES[mode].desc}</p>
        ${rec ? `<div class="record"><span class="muted">${tr('Твой рекорд')}</span><b>${formatScore(mode, rec.score)}</b></div>` : ''}
        <button class="btn primary big block" data-action="start">${tr('▶&#xFE0E; Старт')}</button>
        ${UI.trainingTip(usesOps ? s.ops : ['mul'])}
        <div class="hint">
          ${s.answerMode === 'choice'
            ? `${tr('Жми на правильный вариант или клавиши')} <kbd>1</kbd>–<kbd>4</kbd>.`
            : `${tr('Вводи ответ с клавиатуры,')} <kbd>Enter</kbd> ${tr('— проверить.')}`}
          <kbd>Esc</kbd> ${tr('— завершить тренировку.')}
        </div>
      </div>
    </div>

    ${Hooks.html('trainingModes', s)}
    ${UI.matchBlock()}
    ${UI.challengesBlock()}
  `;
}

/* =========================================================
   Игра
   ========================================================= */

/* =========================================================
   Азарт: комбо-множитель, золотые примеры, погоня за рекордом, сундук
   ========================================================= */

const GOLDEN_CHANCE = 0.07;
const comboMult = streak => (streak >= 10 ? Math.floor(streak / 10) + 1 : 1);

const CHESTS = [
  { id: 'common', name: tr('Обычный сундук'), color: '#a3a3a3', xp: 5, w: 55 },
  { id: 'rare', name: tr('Редкий сундук'), color: '#4d8dff', xp: 15, w: 27 },
  { id: 'epic', name: tr('Эпический сундук'), color: '#ac6bff', xp: 30, w: 12 },
  { id: 'legendary', name: tr('Легендарный сундук'), color: '#e6bd5c', xp: 75, w: 5 },
  { id: 'mythic', name: tr('Мифический сундук'), color: '#ff7ab8', xp: 150, w: 1, freeze: true },
];

// Чем лучше тренировка, тем выше шанс на редкий сундук
const chestWeights = luck => CHESTS.map((c, i) => c.w * (i ? 1 + 0.6 * luck : 1));
const PITY_LIMIT = 30;

function rollChest(g) {
  const answered = g.correct + g.wrong;
  const clover = artLevel(data, 'a_clover');
  const B = g.bonuses || lootBonuses(data);
  const luck = Math.min(5, Math.min(3, (g.correct / answered >= 0.9 ? 1 : 0) + (g.maxStreak >= 15 ? 1 : 0) + (g.goldenHits || 0)) + (clover ? (clover >= 4 ? 2 : 1) : 0) + B.luck);
  const weights = chestWeights(luck);
  let r = Math.random() * weights.reduce((x, y) => x + y, 0);
  let i = weights.findIndex(w => (r -= w) < 0);
  if (i < 0) i = 0;
  // Гарантия: после 30 сундуков без легендарного следующий точно легендарный
  data.pity = (data.pity || 0) + 1;
  let pity = false;
  if (i < 3 && data.pity >= PITY_LIMIT) { i = 3; pity = true; }
  if (i >= 3) data.pity = 0;
  // «Аврора»: сундук не бывает обычным. «Бездна»: иногда в сундуке ещё и ключ
  if (B.floor && i === 0) i = 1;
  const chest = { ...CHESTS[i], luck, pity };
  if (B.chestkey && Math.random() < 0.2) chest.key = 1;
  return chest;
}

let lastChest = null;

function openChest(el) {
  if (!lastChest || el.classList.contains('opened') || el.classList.contains('shaking')) return;
  const c = lastChest;
  el.classList.add('shaking');
  chestReveal(c, () => {
    el.classList.remove('shaking');
    el.classList.add('opened');
    el.style.setProperty('--rc', c.color);
    el.classList.toggle('mythic', c.id === 'mythic');
    el.querySelector('.chest-name').textContent = c.name;
    el.querySelector('.chest-reward').innerHTML = `+${c.xp} XP${c.freeze ? ` · ${tr('+1 заморозка серии')}` : ''}${c.key ? ` · +${c.key} ${ico('key')}` : ''}${c.loot ? ` · ${escH(lootName(c.loot))}${c.loot.copy ? ` (${tr('копия')})` : ''}${c.loot.coins ? ` (+${c.loot.coins} ${ico('coin')})` : ''}` : ''}${c.parts ? ` · ${tr('Часть ×{0}', c.parts.n)}: ${escH(c.parts.item.name)} ${c.parts.have}/${c.parts.need}` : ''}`;
    renderLevelChip();
  });
}

// Название режима в игре и в результатах: у вариантов режимов — своё
const gameTitle = g => (g.variant && VARIANTS[g.variant] ? VARIANTS[g.variant].name : MODES[g.mode].name);
const gameIcon = g => (g.variant && VARIANTS[g.variant] ? VARIANTS[g.variant].icon : MODES[g.mode].icon);

function startGame(mode, opts = {}) {
  const s = data.settings;
  if (mode === 'duel') { UI.duelStart(); return; }
  // Варианты режимов (цепочка, прикидка, экзамен…) работают поверх обычных
  const variant = VARIANTS[mode] ? mode : opts.variant || null;
  if (VARIANTS[mode]) {
    const v = VARIANTS[mode];
    if (v.canStart && !v.canStart()) return;
    mode = v.base;
  }
  const ownOps = variant && VARIANTS[variant].ownOps;
  if (!ownOps && mode !== 'table' && mode !== 'mistakes' && mode !== 'ladder' && !s.ops.length) {
    toast(tr('Выбери хотя бы одно действие'));
    return;
  }
  if (mode === 'table' && !s.tableNums.length) {
    toast(tr('Выбери хотя бы одно число'));
    return;
  }
  if (mode === 'mistakes' && !data.mistakes.length) {
    toast(tr('Список ошибок пуст'));
    return;
  }
  // Модули могут не пустить в игру (закончились попытки Лестницы)
  if (Hooks.any('blockStart', mode, variant)) return;

  if (mode !== 'ladder' && !variant) s.mode = mode;
  saveData();

  // В работе над ошибками первыми идут примеры, которым «пора» повториться
  const queue = mode === 'mistakes'
    ? srsQueue(20).map(m => ({
        op: m.op,
        text: m.text,
        html: m.html || `${m.text} = ?`,
        answer: String(m.answer),
        kind: m.kind || 'int',
        choices: m.choices,
      }))
    : null;

  game = {
    mode,
    level: s.level,
    ops: [...s.ops],
    settings: JSON.parse(JSON.stringify(s)),
    queue,
    total: mode === 'blitz' ? BLITZ_COUNT : mode === 'table' ? TABLE_COUNT : queue ? queue.length : null,
    correct: 0,
    wrong: 0,
    streak: 0,
    maxStreak: 0,
    lives: SURVIVAL_LIVES,
    limit: SURVIVAL_START_LIMIT,
    penalty: 0,
    log: [],
    xpEarned: 0,
    goldenHits: 0,
    recordTarget: ['sprint', 'survival'].includes(mode) && !variant ? (data.records[recordKey(mode, s.level, s.ops, s.answerMode)]?.score || 0) : 0,
    problem: null,
    started: false,
    ended: false,
    timer: null,
    variant,
    hints: 3,
  };
  if (opts.settings) Object.assign(game.settings, opts.settings);

  // Лестница: темы, сложность и время зависят только от уровня
  if (mode === 'ladder') {
    const n = ladderState(data).level;
    const cfg = ladderCfg(n);
    Object.assign(game, {
      ops: cfg.ops, level: cfg.tier, total: LADDER_TASKS, lives: 1, limit: cfg.limit, ladderLevel: n,
      settings: { ...game.settings, ops: cfg.ops, level: cfg.tier, adaptive: false, shuffle: true },
    });
  }

  // Артефакты
  {
    const L = id => artLevel(data, id);
    const B = lootBonuses(data); // короны, рамки и артефакты
    game.bonuses = B;
    if (['survival', 'ladder'].includes(mode)) game.limit *= 1 + 0.05 * L('a_hourglass') + B.time / 100;
    const heart = L('a_heart');
    game.maxLives = SURVIVAL_LIVES + (mode === 'survival' && heart ? (heart >= 5 ? 2 : 1) : 0) + (mode === 'survival' ? B.life : 0);
    if (mode === 'survival') game.lives = game.maxLives;
    const shield = L('a_shield');
    game.shields = (shield ? (shield >= 5 ? 3 : shield >= 3 ? 2 : 1) : 0) + B.shield;
    const feather = L('a_feather');
    game.feathers = mode === 'ladder' && feather ? (feather >= 5 ? 2 : 1) : 0;
    game.penaltyStep = Math.max(2.5, BLITZ_PENALTY - 0.5 * L('a_hammer') - B.blitz);
    game.xpBoost = 1 + 0.04 * L('a_magnet') + B.xp / 100 + achXpBonus(data);
    game.goldenChance = GOLDEN_CHANCE * (1 + 0.2 * L('a_coin') + B.gold / 100);
    game.hints += B.hint;
    game.revives = B.revive;   // второе дыхание
    game.lifeGuards = B.guard; // первая ошибка прощается
    game.arts = [...profileData(data).arts];
    game.crown = LOOT_CROWNS.find(c => c.id === profileData(data).crown) || null;
  }

  // Вариант режима и модули дополняют настройки игры
  if (variant) VARIANTS[variant].setup?.(game, opts);
  Hooks.run('gameSetup', game, opts);
  // Формат ответа один на всю игру: либо везде варианты, либо везде ввод цифрами.
  // Если выбраны только темы, где ответ не число (сравнение, алгебра), игра идёт вариантами.
  {
    const gs = game.settings;
    const ops = game.queue ? [] : (mode === 'table' ? ['mul'] : gs.ops);
    game.answerChoice = gs.answerMode === 'choice'
      || !!(variant && VARIANTS[variant].choice)
      || (!!ops.length && ops.every(o => CHOICE_ONLY_OPS.includes(o)));
    if (!game.answerChoice && game.queue) {
      const typed = game.queue.filter(p => !CHOICE_KINDS.includes(p.kind));
      if (typed.length) { game.queue = typed; game.total = typed.length; }
      else game.answerChoice = true;
    }
    gs.intOnly = !game.answerChoice;
  }
  game.ops = [...game.settings.ops];
  game.level = mode === 'ladder' ? game.level : game.settings.level;

  currentView = 'game';
  document.body.classList.add('in-game', 'fit-game');
  setFullscreen(true);
  setActiveNav(null);
  window.scrollTo(0, 0);
  renderGame();
  FX.enterView('game');
  countdown();
}

function renderGame() {
  const g = game;
  const showLives = g.mode === 'survival';
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const crownRar = g.crown && ['legendary', 'mythic'].includes(g.crown.chest) ? g.crown.chest : '';
  $('#app').innerHTML = `
    <div class="game ${crownRar ? `crowned ${crownRar}` : ''}" ${g.crown ? `style="--crown:${g.crown.color}"` : ''}>
      <div class="game-top">
        <button class="icon-sq sm game-pause" data-action="game-pause" aria-label="${tr('Пауза')}">${ico('pause')}</button>
        <div class="pill">${icoInline(gameIcon(g))} ${gameTitle(g)}${g.crown ? `<span class="game-crown" style="--ac:${g.crown.color}">${ico('crown')}</span>` : ''}${g.arts?.length ? `<span class="game-arts">${g.arts.map(id => ARTIFACTS.find(z => z.id === id)).filter(Boolean).map(z => `<i style="--ac:${z.color}">${ico(z.icon)}</i>`).join('')}</span>` : ''}${g.mode === 'ladder' ? `<em class="level-badge ladder">${tr('Ур. {0}', g.ladderLevel)}</em>` : g.settings.adaptive && g.mode !== 'mistakes' ? `<em id="gLevel" class="level-badge">${LEVELS[g.settings.level].name}</em>` : ''}</div>
        <div class="game-stats">
          <div><b id="gCorrect">0</b><small>${tr('верно')}</small></div>
          <div class="streak-box">
            <span class="streak-line"><span id="gFire" class="streak-fire">${ico('fire')}</span><b id="gStreak">0</b><em id="gMult" class="mult"></em><span id="gBest" class="best-badge" hidden>${ico('trophy')}</span></span>
            <small>${tr('серия')}</small>
          </div>
          ${showLives ? `<div><b id="gLives">${livesHtml(g.lives)}</b><small>${tr('жизни')}</small></div>` : ''}
          <div><b id="gTime">${g.mode === 'sprint' ? SPRINT_SECONDS.toFixed(1) : '0.0'}</b><small>${tr('сек')}</small></div>
        </div>
      </div>
      <div class="bar" id="gBarWrap"><div id="gBar" style="width:${['sprint', 'survival', 'ladder'].includes(g.mode) ? 100 : 0}%"></div></div>
      ${g.recordTarget ? `<div class="rec-chase" id="gRec">${ico('trophy')}<span>${tr('до рекорда')}</span><b>${g.recordTarget + 1}</b></div>` : ''}
      ${g.mode === 'blitz' || g.mode === 'ladder' ? `<div class="blitz-dots ${g.mode}">${'<i></i>'.repeat(g.total)}</div>` : ''}

      ${Hooks.html('gameTop', g)}
      <div class="problem-card fx-drop" id="gCard">
        <div class="progress-count" id="gCount"></div>
        ${g.noHints ? '' : `<button class="hint-btn" id="gHint" data-action="game-hint" aria-label="${tr('Подсказка')}">${ico('bulb')}<b id="gHints">${g.hints}</b></button>`}
        <div class="golden-tag" id="gGolden" hidden>✦ ${tr('Золотой пример')} · XP ×10</div>
        <div class="problem" id="gProblem"></div>
        <div class="answer-wrap empty" id="gAnswerWrap" ${g.answerChoice ? 'hidden' : ''}>
          <input class="answer" id="gInput" type="text" inputmode="${coarse ? 'none' : 'numeric'}" autocomplete="off" aria-label="${tr('Ответ')}" disabled>
          <div class="answer-digits" id="gDigits" aria-hidden="true"></div>
        </div>
        <div class="choices" id="gChoices" hidden></div>
        <div class="feedback" id="gFeedback" aria-live="polite">&nbsp;</div>
        <div class="combo" aria-hidden="true"><div id="gCombo"></div></div>
      </div>

      <div class="numpad" id="numpad" ${g.answerChoice ? 'hidden' : ''}>
        ${(data.settings.padLayout === 'calc' ? [7, 8, 9, 4, 5, 6, 1, 2, 3] : [1, 2, 3, 4, 5, 6, 7, 8, 9]).map(n => `<button data-key="${n}" aria-label="${n}">${n}</button>`).join('')}
        <button data-key="minus" aria-label="${tr('Минус')}">−</button>
        <button data-key="0">0</button>
        <button data-key="back" aria-label="${tr('Стереть')}">${ico('backspace')}</button>
        <button data-key="enter" class="np-ok" aria-label="${tr('Проверить')}">OK</button>
      </div>
      ${Hooks.html('gameBottom', g)}

      ${coarse ? '' : `<div class="game-end-row">
        <button class="btn ghost" data-action="end">${tr('Завершить (Esc)')}</button>
      </div>`}
    </div>
  `;

  const input = $('#gInput');
  input.addEventListener('input', onAnswerInput);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submitAnswer(); }
  });
  input.addEventListener('blur', () => {
    if (game && game.started && !game.ended && !coarse && !game.choiceMode) setTimeout(() => input.focus(), 0);
  });

  const numpad = $('#numpad');
  // Одно касание = одна цифра: Android иногда присылает касание дважды
  const held = new Set();
  let lastKey = '', lastAt = 0;
  numpad.addEventListener('pointerdown', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    e.preventDefault();
    if (held.has(e.pointerId)) return;
    held.add(e.pointerId);
    const key = btn.dataset.key;
    if (key === lastKey && e.timeStamp - lastAt < 60) return;
    lastKey = key;
    lastAt = e.timeStamp;
    pressKey(key);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type =>
    numpad.addEventListener(type, e => held.delete(e.pointerId)));
  window.addEventListener('pointerup', e => held.delete(e.pointerId));

  $('#gChoices').addEventListener('pointerdown', e => {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    chooseAnswer(btn.dataset.choice);
  });
}

function chooseAnswer(value) {
  const g = game;
  if (!g || !g.started || g.ended || !g.choiceMode || g.locked || g.paused) return;
  registerAnswer(value === g.problem.answer, value);
}

function countdown() {
  const el = $('#gProblem');
  let n = 3;
  FX.countdownBegin();
  const step = () => {
    if (!game || game.ended || currentView !== 'game') return;
    if (n === 0) {
      el.classList.remove('count');
      el.textContent = '';
      beginGame();
      return;
    }
    FX.countDigit(el, n);
    Sound.count();
    el.classList.remove('count');
    void el.offsetWidth;
    el.classList.add('count');
    n--;
    setTimeout(step, 650);
  };
  step();
}

function beginGame() {
  game.started = true;
  game.startTime = performance.now();
  $('#gInput').disabled = false;
  Sound.go();
  FX.gameStart($('#gCard'));
  nextProblem();
  game.timer = setInterval(tick, 50);
}

// «По порядку»: темы идут блоками по 5 примеров в порядке списка, без перемешивания
const SEQ_BLOCK = 5;
function seqOp(g, answered) {
  if (g.settings.shuffle !== false || g.mode === 'table') return null;
  const list = Object.keys(OPS).filter(k => g.settings.ops.includes(k));
  return list.length ? list[Math.floor(answered / SEQ_BLOCK) % list.length] : null;
}

function nextProblem() {
  const g = game;
  const answered = g.correct + g.wrong;
  if (g.total && answered >= g.total) {
    endGame(true);
    return;
  }

  const v = g.variant ? VARIANTS[g.variant] : null;
  if (g.queue) {
    g.problem = g.queue[answered];
  } else {
    let p;
    let tries = 0;
    // Матч и турнир: у всех игроков одна и та же последовательность примеров
    const prevRandom = randomSource;
    if (g.rng) randomSource = g.rng;
    try {
      do {
        p = v?.gen ? v.gen(g, answered) : genProblem(g.settings, g.mode, (answered === 0 && g.firstOp) || seqOp(g, answered));
        // Не повторяем предыдущий пример; при ответе цифрами пропускаем нечисловые
      } while (((g.problem && p.text === g.problem.text) || (!g.answerChoice && CHOICE_KINDS.includes(p.kind))) && ++tries < 12);
    } finally {
      randomSource = prevRandom;
    }
    g.problem = p;
  }

  g.problemStart = performance.now();
  g.lastTick = null;
  g.hinted = false;
  g.golden = !g.queue && !g.noGolden && answered >= 2 && Math.random() < (g.goldenChance || GOLDEN_CHANCE);
  $('#gCard').classList.toggle('golden', g.golden);
  $('#gGolden').hidden = !g.golden;
  if (g.golden) { Sound.tick(); vibrate(15); }

  // Дроби всегда решаются выбором — их неудобно вводить цифрами
  g.choiceMode = g.answerChoice || CHOICE_KINDS.includes(g.problem.kind);
  FX.problemIn($('#gProblem'), g.problem.shown || g.problem.html, { style: g.choiceMode ? 'flip' : 'slide', first: answered === 0 });
  $('#gCount').textContent = g.total ? `${answered + 1} / ${g.total}` : `№ ${answered + 1}`;
  FX.pulse($('#gCount'), 'fx-flip', 320);
  if (g.mode === 'table') FX.tableCell(g.problem);
  document.body.classList.toggle('speedy', g.mode === 'survival' && g.limit < 6);

  // Длинные текстовые задачи — шрифтом поменьше, чтобы уместились
  $('#gProblem').classList.toggle('long', g.problem.html.replace(/<[^>]+>/g, '').length > 20);
  const input = $('#gInput');
  const choices = $('#gChoices');
  document.body.classList.toggle('choice-game', g.choiceMode);
  $('#gAnswerWrap').hidden = g.choiceMode;
  $('#numpad').hidden = g.choiceMode;
  choices.hidden = !g.choiceMode;
  input.value = '';
  g.prevInput = '';
  FX.digits('', '');

  if (g.choiceMode) {
    choices.classList.toggle('expr', g.problem.kind === 'expr');
    choices.innerHTML = makeChoices(g.problem)
      .map((c, i) => `<button data-choice="${c}"><small>${i + 1}</small>${answerHtml(c)}</button>`)
      .join('');
    FX.choicesIn(choices, !g.choicesShown);
    g.choicesShown = true;
  } else if (!window.matchMedia('(pointer: coarse)').matches) {
    input.focus();
  }
  const hintBtn = $('#gHint');
  if (hintBtn) hintBtn.disabled = g.hints <= 0;
  v?.onProblem?.(g);
  Hooks.run('problemShown', g);
}

// Подсказка: первая цифра ответа или убрать два неверных варианта. Опыт за такой пример — вдвое меньше.
function useHint() {
  const g = game;
  if (!g || !g.started || g.ended || g.locked || g.paused || g.hinted || g.hints <= 0) return;
  g.hints--;
  g.hinted = true;
  $('#gHints').textContent = g.hints;
  $('#gHint').disabled = true;
  const p = g.problem;
  if (g.choiceMode) {
    const wrong = [...$('#gChoices').children].filter(b => b.dataset.choice !== p.answer);
    shuffle(wrong).slice(0, Math.max(1, wrong.length - 1)).forEach(b => { b.disabled = true; b.classList.add('hint-off'); });
  } else {
    const input = $('#gInput');
    const first = p.answer.startsWith('-') ? p.answer.slice(0, 2) : p.answer.slice(0, 1);
    input.value = first;
    onAnswerInput();
  }
  Sound.click();
  FX.pulse($('#gCard'), 'fx-hint', 500);
}

// Пауза: таймер стоит, пример скрыт. Рекорд после паузы не засчитывается.
function pauseGame() {
  const g = game;
  if (!g || !g.started || g.ended || g.paused) return;
  g.paused = true;
  g.pausedUsed = true;
  g.pauseAt = performance.now();
  document.body.classList.add('game-paused');
  const ov = document.createElement('div');
  ov.className = 'pause-ov';
  ov.innerHTML = `
    <div class="pause-box">
      <span class="pause-ico">${ico('pause')}</span>
      <h2>${tr('Пауза')}</h2>
      <p class="muted">${tr('Таймер остановлен. Рекорд за эту игру не засчитается.')}</p>
      <button class="btn primary big block" data-action="game-resume">${tr('Продолжить')}</button>
      <button class="btn big ghost block" data-action="end">${tr('Завершить')}</button>
    </div>`;
  document.body.appendChild(ov);
  FX.drawIcons(ov);
}

function resumeGame() {
  const g = game;
  document.querySelector('.pause-ov')?.remove();
  document.body.classList.remove('game-paused');
  if (!g || !g.paused) return;
  const d = performance.now() - g.pauseAt;
  g.startTime += d;
  g.problemStart += d;
  g.paused = false;
  if (!g.choiceMode && !window.matchMedia('(pointer: coarse)').matches) $('#gInput')?.focus();
}

// Перк мифической короны: один раз за игру время не кончается, а продлевается
function reviveTime(g, sec = 3) {
  if (!g.revives) return false;
  g.revives--;
  if (g.mode === 'sprint' || g.timeLimit) g.startTime += sec * 1000;
  else g.problemStart += sec * 1000;
  g.lastTick = null;
  Sound.streak();
  vibrate([0, 40, 40, 40]);
  FX.shout(`${ico('hourglass')} ${tr('Второе дыхание')} +${sec} ${tr('с')}`, { at: $('#gCard'), ms: 1000, scatter: true });
  return true;
}

function tick() {
  const g = game;
  if (!g || g.ended || g.locked || g.paused) return;
  const now = performance.now();
  const elapsed = (now - g.startTime) / 1000;
  const bar = $('#gBar');
  const barWrap = $('#gBarWrap');
  const time = $('#gTime');

  // Общий лимит времени на всю игру (экзамен)
  if (g.timeLimit) {
    const left = Math.max(0, g.timeLimit - elapsed);
    const m = Math.floor(left / 60);
    time.textContent = `${m}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    bar.style.width = `${(left / g.timeLimit) * 100}%`;
    barWrap.classList.toggle('warn', left <= 60);
    if (left <= 0 && !reviveTime(g)) endGame(true);
    return;
  }
  VARIANTS[g.variant]?.onTick?.(g, now);

  switch (g.mode) {
    case 'sprint': {
      const left = Math.max(0, SPRINT_SECONDS - elapsed);
      time.textContent = fmtSec(left);
      bar.style.width = `${(left / SPRINT_SECONDS) * 100}%`;
      barWrap.style.setProperty('--f', left / SPRINT_SECONDS);
      barWrap.classList.toggle('warn', left <= 10);
      time.classList.toggle('time-pulse', left <= 10 && left > 5);
      tickSound(Math.ceil(left), 5);
      if (left <= 0 && !reviveTime(g)) endGame(true);
      break;
    }
    case 'survival':
    case 'ladder': {
      const left = Math.max(0, g.limit - (now - g.problemStart) / 1000);
      time.textContent = fmtSec(left);
      bar.style.width = `${(left / g.limit) * 100}%`;
      barWrap.style.setProperty('--f', left / g.limit);
      barWrap.classList.toggle('warn', left <= 2);
      tickSound(Math.ceil(left), 3);
      if (left <= 0 && !reviveTime(g)) registerAnswer(false, null);
      break;
    }
    case 'blitz':
      time.textContent = fmtSec(elapsed + g.penalty);
      bar.style.width = `${((g.correct + g.wrong) / g.total) * 100}%`;
      break;
    default:
      time.textContent = fmtSec(elapsed);
      bar.style.width = g.total ? `${((g.correct + g.wrong) / g.total) * 100}%` : '0%';
  }
}

// Тиканье на последних секундах — один раз на каждую секунду
function tickSound(secLeft, from) {
  if (secLeft > from || secLeft <= 0 || game.lastTick === secLeft) return;
  game.lastTick = secLeft;
  Sound.tick();
  FX.tickPop($('#gTime'));
}

function pressKey(key) {
  if (!game || !game.started || game.ended || game.locked || game.paused) return;
  const input = $('#gInput');
  if (key === 'enter') { submitAnswer(); return; }
  if (key === 'back') input.value = input.value.slice(0, -1);
  else if (key === 'minus') input.value = input.value.startsWith('-') ? input.value.slice(1) : `-${input.value}`;
  else if (input.value.length < 8) input.value += key;
  onAnswerInput();
}

function onAnswerInput() {
  const g = game;
  if (!g || !g.started || g.ended || g.locked) return;
  const input = $('#gInput');
  // Минус разрешён только первым символом — для отрицательных ответов
  const clean = (input.value.startsWith('-') ? '-' : '') + input.value.replace(/[^\d]/g, '').slice(0, 7);
  if (clean !== input.value) input.value = clean;
  FX.digits(clean, g.prevInput || '');
  g.prevInput = clean;
  if (!clean || !g.settings.autoCheck) return;

  const answer = g.problem.answer;
  if (clean === answer) registerAnswer(true, clean);
  else if (clean.length >= answer.length) registerAnswer(false, clean);
}

function submitAnswer() {
  const g = game;
  if (!g || !g.started || g.ended || g.choiceMode || g.locked || g.paused) return;
  const v = $('#gInput').value.trim();
  if (!v) return;
  registerAnswer(v === g.problem.answer, v);
}

function registerAnswer(ok, given) {
  const g = game;
  const p = g.problem;
  const ms = performance.now() - g.problemStart;
  g.log.push({ op: p.op, text: p.text, html: p.html, kind: p.kind, answer: p.answer, choices: p.choices, steps: p.steps, rule: p.rule, given, ok, ms });

  const card = $('#gCard');
  const fb = $('#gFeedback');
  card.classList.remove('ok', 'bad');
  void card.offsetWidth;

  const prevStreak = g.streak;
  const chosen = g.choiceMode && given !== null
    ? [...$('#gChoices').children].find(b => b.dataset.choice === given)
    : null;
  const answeredIndex = g.correct + g.wrong;

  // Экзамен: без подсказок о верности — ответ просто принимается
  if (g.silent) {
    if (ok) { g.correct++; g.streak++; g.maxStreak = Math.max(g.maxStreak, g.streak); g.xpEarned += LEVELS[g.level].mult; } else { g.wrong++; g.streak = 0; }
    Sound.click();
    fb.className = 'feedback';
    fb.textContent = tr('Ответ принят');
    $('#gCorrect').textContent = answeredIndex + 1;
    Hooks.run('afterAnswer', g, ok, ms, p);
    nextProblem();
    return;
  }

  adaptiveStep(g, ok, ms);
  if (g.levelChanged) {
    g.levelChanged = false;
    const badge = $('#gLevel');
    if (badge) {
      badge.textContent = LEVELS[g.settings.level].name;
      FX.pulse(badge, 'fx-pop', 500);
    }
  }

  if (ok) {
    g.correct++;
    g.streak++;
    g.maxStreak = Math.max(g.maxStreak, g.streak);
    if (g.mode === 'survival') g.limit = Math.max(SURVIVAL_MIN_LIMIT, g.limit * 0.95);
    if (g.streak % 10 === 0) Sound.streak();
    else Sound.correct(g.streak);
    card.classList.add('ok');
    fb.className = 'feedback ok';
    fb.innerHTML = g.streak >= 5 ? `${tr('{0} Серия {1}!', ico('fire'), g.streak)}` : `${tr('✓ {0} с', fmtSec(ms / 1000))}`;
  } else {
    g.wrong++;
    g.shieldSaved = false;
    // «Бесконечность»: первая ошибка за игру не отнимает жизнь и не обнуляет серию
    g.guardUsed = g.lifeGuards > 0;
    if (g.guardUsed) g.lifeGuards--;
    else if (g.shields > 0 && g.streak > 0) { g.shields--; g.shieldSaved = true; } else g.streak = 0;
    if (g.mode === 'blitz') g.penalty += g.penaltyStep || BLITZ_PENALTY;
    if (g.mode === 'survival' && !g.guardUsed) {
      g.lives--;
      Sound.lifeLost();
      vibrate([40, 60, 40]);
    } else {
      Sound.wrong();
      vibrate(35);
    }
    card.classList.add('bad');
    fb.className = 'feedback bad';
    const reason = given === null ? `${tr('{0} Время вышло', ico('stopwatch'))}` : tr('✗ Неверно');
    const rule = p.rule === 'prime' ? DIV_PRIME : p.rule ? divRule(p.rule) : null;
    fb.innerHTML = `${reason}: ${solvedHtml(p)}${given !== null ? ` <span class="fb-given">${tr('(у тебя {0})', `<s>${answerHtml(given)}</s>`)}</span>` : ''}${g.mode === 'blitz' ? ` ${tr('(+{0} с)', g.penaltyStep || BLITZ_PENALTY)}` : ''}${g.shieldSaved ? `<span class="fb-rule">${ico('shield')}${tr('Щит сохранил серию')}</span>` : ''}${g.guardUsed ? `<span class="fb-rule">${ico('crown')}${tr('Корона простила первую ошибку')}</span>` : ''}${g.featherUsed ? `<span class="fb-rule">${ico('feather')}${tr('Перо феникса простило ошибку')}</span>` : ''}${rule ? `<span class="fb-rule">${rule.d ? `<i>${rule.d}</i>` : ''}${rule.rule}</span>` : ''}${!rule && p.steps?.length ? `<span class="fb-steps">${p.steps.slice(-2).join(' → ')}</span>` : ''}`;
  }

  setTimeout(() => card.classList.remove('ok', 'bad'), 350);

  $('#gCorrect').textContent = g.correct;
  $('#gStreak').textContent = g.streak;
  if (g.mode === 'blitz' || g.mode === 'ladder') FX.blitzDot(answeredIndex, ok, g.total);

  if (ok) {
    const base = g.mode === 'table' ? 1 : g.mode === 'mistakes' ? 2 : LEVELS[g.level].mult;
    let xpGain = base * comboMult(g.streak);
    if (g.golden) {
      xpGain += base * 10;
      g.goldenHits++;
      FX.burstAt($('#gCard'), { count: 22, spread: 140, kind: 'confetti' });
    }
    if (g.hinted) xpGain = Math.floor(xpGain / 2);
    if (g.xpMult) xpGain = Math.round(xpGain * g.xpMult);
    g.xpEarned += xpGain;
    // Счётчик до рекорда
    const rec = $('#gRec');
    if (rec) {
      const left = g.recordTarget + 1 - g.correct;
      if (left <= 0 && !g.recordBeaten) {
        g.recordBeaten = true;
        rec.classList.add('beaten');
        rec.querySelector('span').textContent = tr('Новый рекорд!');
        rec.querySelector('b').textContent = '★';
        FX.burstAt(rec, { count: 20, spread: 100, kind: 'confetti' });
        Sound.record();
        vibrate([0, 50, 40, 70]);
      } else if (left > 0) {
        rec.querySelector('b').textContent = left;
        rec.classList.toggle('close', left <= 3);
      }
    }
    FX.correct({ g, ms, xpGain, from: answerHtml(p.answer), chosen });
  } else {
    FX.wrong({ g, given, prevStreak, timeout: given === null, lostLife: g.mode === 'survival' && !g.guardUsed ? g.lives : undefined });
  }

  if (g.mode === 'survival') {
    const livesEl = $('#gLives');
    setTimeout(() => {
      if (!livesEl.isConnected) return;
      livesEl.innerHTML = livesHtml(g.lives);
      livesEl.classList.toggle('last-life', g.lives === 1);
    }, ok ? 0 : 120);
    if (g.lives <= 0) {
      endGame(true);
      return;
    }
  }

  Hooks.run('afterAnswer', g, ok, ms, p);
  // Вариант режима может закончить игру (цепочка рвётся на первой ошибке)
  if (VARIANTS[g.variant]?.onAnswer?.(g, ok, p) === 'end') {
    g.locked = true;
    setTimeout(() => { if (game === g && !g.ended) endGame(true); }, ok ? 300 : 900);
    return;
  }

  g.featherUsed = false;
  if (g.mode === 'ladder' && !ok && g.feathers > 0) {
    g.feathers--;
    g.forgiven = (g.forgiven || 0) + 1;
    g.featherUsed = true;
    const fb2 = $('#gFeedback');
    fb2.insertAdjacentHTML('beforeend', `<span class="fb-rule">${ico('feather')}${tr('Перо феникса простило ошибку')}</span>`);
  } else if (g.mode === 'ladder' && !ok) {
    g.locked = true;
    setTimeout(() => { if (game === g && !g.ended) endGame(true); }, 900);
    return;
  }

  // Неверный вариант: короткая пауза, чтобы увидеть правильный ответ
  if (!ok && g.choiceMode && given !== null && FX.on()) {
    g.locked = true;
    FX.choiceWrong($('#gChoices'), given, p.answer);
    setTimeout(() => {
      if (game !== g || g.ended) return;
      g.locked = false;
      nextProblem();
    }, 480);
    return;
  }

  nextProblem();
}

function abortGame() {
  document.querySelector('.pause-ov')?.remove();
  document.body.classList.remove('game-paused');
  if (!game) return;
  clearInterval(game.timer);
  game.ended = true;
  game = null;
}

function endGame(completed) {
  const g = game;
  if (!g || g.ended) return;
  clearInterval(g.timer);
  g.ended = true;

  const answered = g.correct + g.wrong;
  document.querySelector('.pause-ov')?.remove();
  document.body.classList.remove('game-paused');
  if (!g.started || answered === 0) {
    game = null;
    navigate('training');
    return;
  }

  const duration = (performance.now() - g.startTime) / 1000;
  const levelBefore = levelFromXp(data.xp);
  const xpBefore = data.xp;

  // Итоговый счёт
  let score = g.correct;
  if (g.mode === 'blitz') score = Math.round((duration + g.penalty) * 10) / 10;

  // Опыт
  const mult = g.mode === 'table' ? 1 : g.mode === 'mistakes' ? 2 : LEVELS[g.level].mult;
  void mult;
  const xp = Math.round(((g.xpEarned || 0) + Math.floor(g.maxStreak / 5) * 2 + (completed && g.mode !== 'practice' ? 5 : 0)) * (g.xpBoost || 1));

  // Общая статистика
  data.xp += xp;
  data.totalSolved += answered;
  data.totalCorrect += g.correct;
  data.bestStreak = Math.max(data.bestStreak, g.maxStreak);
  const today = dateKey();
  data.daily[today] = (data.daily[today] || 0) + g.correct;

  const opCounts = {};
  for (const entry of g.log) {
    const ms = Math.min(entry.ms, 30000);
    for (const st of [data.opStats[entry.op], opCounts[entry.op] || (opCounts[entry.op] = { n: 0, c: 0, t: 0 })]) {
      st.n++;
      if (entry.ok) st.c++;
      st.t += ms;
    }
    updateMistakes(entry);
    tableStatsUpdate(entry);
  }

  // Рекорд
  let isRecord = false;
  let prevRecord = null;
  const recordable = ['sprint', 'blitz', 'survival'].includes(g.mode) && completed && !g.variant && !g.pausedUsed;
  if (recordable) {
    const key = recordKey(g.mode, g.level, g.ops, g.settings.answerMode);
    const prev = data.records[key];
    prevRecord = prev ? prev.score : null;
    const better = !prev || (lowerIsBetter(g.mode) ? score < prev.score : score > prev.score);
    if (better && g.correct > 0) {
      data.records[key] = { score, date: Date.now() };
      isRecord = true;
    }
  }

  const session = {
    date: Date.now(),
    mode: g.mode,
    level: g.level,
    ops: g.ops,
    correct: g.correct,
    wrong: g.wrong,
    duration: Math.round(duration * 10) / 10,
    avgMs: Math.round(g.log.reduce((acc, e) => acc + e.ms, 0) / answered),
    maxStreak: g.maxStreak,
    score,
    xp,
    completed,
    answerMode: g.settings.answerMode,
    opCounts,
    variant: g.variant || undefined,
    fast: g.log.filter(e => e.ok && e.ms < 2000).length,
    golden: g.goldenHits || 0,
  };
  data.sessions.push(session);
  if (data.sessions.length > 300) data.sessions = data.sessions.slice(-300);

  // Задание дня
  const dc = dailyChallenge();
  let dailyJustDone = false;
  if (data.dailyChallenge.key !== dc.key) data.dailyChallenge = { key: dc.key, done: false };
  if (!data.dailyChallenge.done && dailyDone(session, dc)) {
    data.dailyChallenge.done = true;
    dailyJustDone = true;
    data.xp += 50;
    session.xp += 50;
  }

  // Задание от родителя
  let assignmentJustDone = false;
  const asg = data.assignment;
  if (asg && !asg.done && session.mode === asg.mode && session.correct >= asg.goal) {
    asg.done = true;
    assignmentJustDone = true;
    data.xp += 40;
    session.xp += 40;
  }

  // Результат матча по коду — чтобы сравнить с соперником
  if (g.matchSeed) data.lastMatch = { seed: g.matchSeed, score, mode: g.mode, code: resultCode(g.matchSeed, score) };

  const challengesDone = checkChallenges(session);
  const streakNow = dayStreak(data);
  const gotFreeze = grantFreeze(streakNow);

  // Достижения
  achInit(data);
  lifeUpdate(data, session);
  const unlocked = achCheck(data);

  // Лестница: 5 из 5 — следующий уровень
  let ladder = null;
  if (g.mode === 'ladder') {
    const L = ladderState(data);
    const passed = completed && g.correct + g.wrong >= g.total && g.wrong <= (g.forgiven || 0);
    if (passed) {
      L.level = g.ladderLevel + 1;
      L.best = Math.max(L.best, L.level);
      const bonus = 5 + Math.floor(g.ladderLevel / 2);
      data.xp += bonus;
      session.xp += bonus;
    }
    ladder = { n: g.ladderLevel, passed, crown: passed && LADDER_MILESTONES.includes(g.ladderLevel + 1) ? g.ladderLevel + 1 : null };
  }

  // Модули: задания, секреты, титулы, лестница, экзамен
  const extra = { banners: [] };
  Hooks.run('gameEnd', g, session, completed, extra, ladder);

  // Сундук: награда выбрана сразу, открывается нажатием на экране результатов
  lastChest = g.correct >= 5 && !g.noChest ? rollChest(g) : null;
  if (lastChest) {
    data.xp += lastChest.xp;
    session.xp += lastChest.xp;
    if (lastChest.freeze) data.freezes = (data.freezes || 0) + 1;
    if (lastChest.key) data.keys = (data.keys || 0) + lastChest.key;
    lastChest.loot = grantLoot(data, lastChest.id, rollLoot(lastChest.id));
    // Без целого предмета — шанс на части пазла
    if (!lastChest.loot) lastChest.parts = grantParts(data, rollParts(lastChest.id));
    Hooks.run('chestRolled', lastChest);
  }

  const coinsGot = syncCoins(data);
  Hooks.run('beforeSave', g, session, extra);
  saveData();
  const levelAfter = levelFromXp(data.xp);
  const log = g.log;
  game = null;

  document.querySelector('.pause-ov')?.remove();
  document.body.classList.remove('game-paused');
  if (isRecord || levelAfter > levelBefore) { Sound.record(); vibrate([0, 60, 50, 60]); }
  else Sound.end();
  if (unlocked.length) Sound.achievement();
  setFullscreen(false);

  const info = {
    session, log, isRecord, prevRecord, unlocked,
    levelUp: levelAfter > levelBefore ? levelAfter : null,
    xpBefore, xpAfter: data.xp,
    challengesDone, dailyJustDone, assignmentJustDone, gotFreeze, ladder, coinsGot, extra, variant: g.variant,
  };
  const show = () => {
    if (currentView !== 'game') return;
    renderResults(info);
    FX.enterView('results');
    FX.results(info);
  };
  const delay = completed && (g.mode === 'sprint' || g.mode === 'blitz') ? FX.finish(g.mode) : 0;
  if (delay) setTimeout(show, delay);
  else show();
}

function updateMistakes(entry) {
  const idx = data.mistakes.findIndex(m => m.text === entry.text);
  if (entry.ok) {
    if (idx < 0) return;
    const m = data.mistakes[idx];
    m.count = Math.max(1, (m.count || 2) - 1);
    // Пример уходит из списка, когда прошёл все ступени повторения
    if (srsUpdate(m, true)) data.mistakes.splice(idx, 1);
    return;
  }
  if (idx >= 0) {
    const [m] = data.mistakes.splice(idx, 1);
    m.count = Math.min((m.count || 2) + 1, 3);
    srsUpdate(m, false);
    data.mistakes.unshift(m);
  } else {
    const m = { op: entry.op, text: entry.text, html: entry.html, kind: entry.kind, answer: entry.answer, choices: entry.choices, count: 2, box: 1 };
    srsUpdate(m, false);
    data.mistakes.unshift(m);
  }
  if (data.mistakes.length > 60) data.mistakes.length = 60;
}

/* =========================================================
   Результаты
   ========================================================= */

function renderResults(info) {
  const { session: s, log, isRecord, prevRecord, unlocked, levelUp, challengesDone = [], dailyJustDone, assignmentJustDone, gotFreeze, ladder, coinsGot, extra } = info;
  const title = s.variant && VARIANTS[s.variant] ? VARIANTS[s.variant].name : MODES[s.mode].name;
  const titleIco = s.variant && VARIANTS[s.variant] ? VARIANTS[s.variant].icon : MODES[s.mode].icon;
  currentView = 'results';
  document.body.classList.remove('in-game', 'fit-game', 'choice-game', 'speedy', 'fx-countdown');
  window.scrollTo(0, 0);
  setActiveNav(null);
  renderLevelChip();
  const answered = s.correct + s.wrong;
  const accuracy = Math.round((s.correct / answered) * 100);
  const wrongs = log.filter(e => !e.ok);
  const scoreLabel = s.mode === 'blitz'
    ? (s.completed ? tr('итоговое время с учётом штрафов') : tr('тренировка прервана'))
    : plural(s.correct, 'верный ответ', 'верных ответа', 'верных ответов');

  const opsLine = s.mode === 'table' || s.mode === 'mistakes'
    ? ''
    : ` · ${LEVELS[s.level].name} · ${s.ops.map(o => OPS[o].sym).join(' ')}${s.answerMode === 'choice' ? tr(' · варианты') : ''}`;

  $('#app').innerHTML = `
    <div class="results">
      <div class="card glow results-head">
        <span class="eyebrow">${title}</span>
        <div class="big-score">${formatScore(s.mode, s.score)}</div>
        <div class="muted">${scoreLabel}</div>
        <div class="muted" style="font-size:13px;margin-top:6px">${ico(titleIco)} ${title}${opsLine}</div>
      </div>

      ${isRecord ? `<div class="banner gold record">${tr('{0} Новый рекорд!{1}', ico('trophy'), prevRecord !== null ? ` ${tr('Прошлый:')} <span class="old-record">${formatScore(s.mode, prevRecord)}</span>` : '')}</div>` : ''}
      ${!isRecord && prevRecord !== null ? `<div class="banner blue">${tr('{0} Твой рекорд: {1}', ico('target'), formatScore(s.mode, prevRecord))}</div>` : ''}
      ${ladder ? (ladder.passed
        ? `<div class="banner gold ladder-banner">${ico('mountain')}<span>${tr('Уровень {0} пройден!', ladder.n)} <b>→ ${ladder.n + 1}</b>${ladder.crown ? ` · ${tr('Новая корона!')}` : ''}</span></div>`
        : `<div class="banner ladder-banner fail">${ico('mountain')}<span>${tr('Уровень {0} не пройден. Нужно 5 из 5 без ошибок.', ladder.n)}</span></div>`) : ''}
      ${lastChest ? `
        <button class="chest-card" data-action="open-chest">
          <span class="chest-ico">${ico('chest')}</span>
          <span class="chest-main"><b class="chest-name">${tr('Сундук')}</b><small class="chest-reward">${tr('Нажми, чтобы открыть')}</small></span>
          <span class="chest-luck">${'✦'.repeat(lastChest.luck)}</span>
        </button>
        ${Hooks.html('chestExtra', lastChest)}` : ''}
      ${levelUp ? `<div class="banner gold">${tr('{0} Новый уровень: {1}!', ico('star'), levelUp)}</div>` : ''}
      ${coinsGot ? (setTimeout(() => Sound.coin(), 900), '') : ''}${coinsGot ? `<button class="banner gold coin-banner" data-action="nav" data-view="forge">${ico('coins')}<span>${tr('+{0} монет за уровень', fmtNum(coinsGot))} · <b>${tr('Мастерская')} ›</b></span></button>` : ''}
      ${unlocked.map(a => `<div class="banner ach-banner" style="--rc:${a.color}">${ico(a.icon)}<span>${tr('{0} Достижение открыто:', '').trim()} <b>${a.name}</b> — ${a.desc}${a.reward ? `<em class="ach-rew">+${a.reward.coins} ${ico('coin')}${a.reward.xp ? ` · +${a.reward.xp} XP` : ''}${a.reward.keys ? ` · +${a.reward.keys} ${ico('key')}` : ''}</em>` : ''}</span></div>`).join('')}
      ${dailyJustDone ? `<div class="banner gold">${ico('calendar')}<span>${tr('{0} Задание дня выполнено!', '').trim()} <b>+50 XP</b></span></div>` : ''}
      ${assignmentJustDone ? `<div class="banner gold">${ico('clipboard')}<span>${tr('{0} Задание выполнено!', '').trim()} <b>+40 XP</b></span></div>` : ''}
      ${challengesDone.map(c => `<div class="banner blue">${ico(c.icon)}<span>${tr('{0} Испытание пройдено:', '').trim()} <b>${c.name}</b> — ${c.desc}</span></div>`).join('')}
      ${gotFreeze ? `<div class="banner blue">${tr('{0} Неделя без пропусков: +1 заморозка серии', ico('shield'))}</div>` : ''}
      ${(extra?.banners || []).join('')}

      <div class="grid grid-3" style="margin-top:12px">
        <div class="card stat"><small>${tr('Верно / ошибок')}</small><b>${s.correct} / ${s.wrong}</b></div>
        <div class="card stat acc-stat">
          <div><small>${tr('Точность')}</small><b>${accuracy}%</b></div>
          <svg class="acc-ring" viewBox="0 0 50 50" aria-hidden="true"><circle class="bg" cx="25" cy="25" r="20"/><circle class="val" cx="25" cy="25" r="20" pathLength="100" style="--off:${100 - accuracy}"/></svg>
        </div>
        <div class="card stat"><small>${tr('Среднее время')}</small><b>${tr('{0} с', fmtSec(s.avgMs / 1000))}</b></div>
        <div class="card stat"><small>${tr('Макс. серия')}</small><b>${s.maxStreak}</b></div>
        <div class="card stat"><small>${tr('Длительность')}</small><b>${tr('{0} с', fmtSec(s.duration))}</b></div>
        <div class="card stat"><small>${tr('Опыт')}</small><b class="gold">+${s.xp} XP</b></div>
      </div>

      <div class="card xp-card" style="margin-top:12px">
        <span class="eyebrow">${tr('Опыт')}</span>
        <div class="bar"><div id="rXpBar"></div></div>
        <small id="rXpText"></small>
      </div>

      ${Hooks.html('resultsReview', info)}
      ${wrongs.length && !Hooks.first('replacesMistakes') ? `
        <div class="section-title"><h2>${tr('Ошибки')}</h2><span>${tr('Добавлены в «Работу над ошибками»')}</span></div>
        <div class="card" style="padding:4px 20px">
          <div class="list">
            ${wrongs.map(e => `
              <div class="list-row mistake-row">
                <span class="emoji-sq">${opIco(e.op)}</span>
                <span class="grow">${problemHtml(e)}</span>
                <span>${e.given === null ? `<span class="given">${tr('время')}</span>` : `<span class="given">${e.given}</span>`}<span class="right">${e.answer}</span></span>
              </div>`).join('')}
          </div>
        </div>` : ''}

      <div class="actions">
        <button class="btn primary big" data-action="quick" data-mode="${s.variant || (s.mode === 'mistakes' && !data.mistakes.length ? 'sprint' : s.mode)}"><span class="spin-ico">↻</span> ${ladder?.passed ? tr('Следующий уровень') : tr('Ещё раз')}</button>
        ${data.mistakes.length && s.mode !== 'mistakes' ? '<button class="btn big" data-action="quick" data-mode="mistakes">' + ico('bandage') + ' ' + tr('Разобрать ошибки') + '</button>' : ''}
        ${Hooks.html('resultsActions', info)}
        <button class="btn big" data-action="nav" data-view="training">${tr('Настройки')}</button>
        <button class="btn big ghost" data-action="nav" data-view="dashboard">${tr('На главную')}</button>
      </div>
    </div>
  `;
}

/* =========================================================
   Статистика
   ========================================================= */

let statsPeriod = 'all';

const PERIODS = { today: tr('Сегодня'), week: tr('Неделя'), month: tr('Месяц'), all: tr('Всё') };

function periodStart(period) {
  const now = new Date();
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (period === 'week') return Date.now() - 7 * 864e5;
  if (period === 'month') return Date.now() - 30 * 864e5;
  return 0;
}

function donutSvg(entries, total) {
  const r = 110;
  const C = 2 * Math.PI * r;
  const gap = entries.length > 1 ? 6 : 0;
  let offset = 0;
  const segs = [];
  const labels = [];

  entries.forEach((e, i) => {
    const len = (e.n / total) * C;
    const drawn = Math.max(0.5, len - gap);
    segs.push(`<circle data-op="${e.op}" cx="0" cy="0" r="${r}" fill="none" stroke="${e.color}" stroke-width="46"
      stroke-dasharray="${drawn} ${C - drawn}" stroke-dashoffset="${-offset}"
      style="--s:${i};filter:drop-shadow(0 0 10px ${e.color}88)"/>`);
    const frac = e.n / total;
    if (frac >= 0.06) {
      const angle = ((offset + drawn / 2) / C) * 2 * Math.PI - Math.PI / 2;
      labels.push(`<text class="donut-label" style="--s:${i}" x="${(r * Math.cos(angle)).toFixed(1)}" y="${(r * Math.sin(angle)).toFixed(1)}" text-anchor="middle" dominant-baseline="central">${Math.round(frac * 100)}%</text>`);
    }
    offset += len;
  });

  return `
    <svg viewBox="-150 -150 300 300" role="img" aria-label="${tr('Решено по действиям')}">
      <circle cx="0" cy="0" r="${r}" fill="none" stroke="rgba(255,255,255,.04)" stroke-width="46"/>
      <g transform="rotate(-90)">${segs.join('')}</g>
      ${labels.join('')}
    </svg>`;
}

function renderStats(reason = 'enter') {
  const d = data;
  const start = periodStart(statsPeriod);
  const sessions = d.sessions.filter(s => s.date >= start);

  let correct, wrong;
  if (statsPeriod === 'all') {
    correct = d.totalCorrect;
    wrong = d.totalSolved - d.totalCorrect;
  } else {
    correct = sessions.reduce((acc, s) => acc + s.correct, 0);
    wrong = sessions.reduce((acc, s) => acc + s.wrong, 0);
  }

  // Распределение по действиям
  let opData;
  if (statsPeriod === 'all') {
    opData = d.opStats;
  } else {
    opData = {};
    for (const s of sessions) {
      for (const [op, st] of Object.entries(s.opCounts || {})) {
        const cur = opData[op] || (opData[op] = { n: 0, c: 0, t: 0 });
        cur.n += st.n; cur.c += st.c; cur.t += st.t;
      }
    }
  }
  const entries = Object.entries(opData)
    .filter(([op, st]) => OPS[op] && st.n > 0)
    .map(([op, st]) => ({ op, ...st, color: OP_COLORS[op] }))
    .sort((a, b) => b.n - a.n);
  const opTotal = entries.reduce((acc, e) => acc + e.n, 0);

  const withData = entries.filter(e => e.n >= 10);
  let tip = '';
  if (withData.length >= 2) {
    const weakest = withData
      .map(e => ({ op: e.op, score: (e.c / e.n) * 1000 - e.t / e.n / 10 }))
      .sort((a, b) => a.score - b.score)[0];
    tip = `
      <button class="row-card tip" data-action="focusop" data-op="${weakest.op}" style="margin-top:12px">
        <span class="icon-sq sm">${ico('bulb')}</span>
        <span class="row-main"><b>${tr('Слабое место:')} <span class="gold">${OPS[weakest.op].name.toLowerCase()}</span></b><small>${tr('Нажми, чтобы потренировать отдельно')}</small></span>
        <span class="chev">›</span>
      </button>`;
  }

  // История по дням
  const recent = sessions.slice(-30).reverse();
  const groups = [];
  for (const s of recent) {
    const key = dateKey(new Date(s.date));
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, date: new Date(s.date), items: [], correct: 0 };
      groups.push(g);
    }
    g.items.push(s);
    g.correct += s.correct;
  }

  $('#app').innerHTML = `
    <h1 class="page-title">${tr('Статистика')}</h1>
    ${Hooks.html('statsHead', statsPeriod)}
    <div class="segmented">
      ${Object.entries(PERIODS).map(([k, name]) => `<button class="${statsPeriod === k ? 'on' : ''}" data-action="period" data-period="${k}">${name}</button>`).join('')}
    </div>

    <div class="flow-cards">
      <div class="flow in"><span class="flow-ico">✓</span><div><small>${tr('Верно')}</small><b>${correct}</b></div></div>
      <div class="flow out"><span class="flow-ico">✗</span><div><small>${tr('Ошибки')}</small><b>${wrong}</b></div></div>
    </div>

    <div class="card donut-card">
      ${opTotal ? `
        <div class="donut">
          ${donutSvg(entries, opTotal)}
          <div class="donut-center"><small>${tr('Решено')}</small><b>${opTotal}</b></div>
        </div>
        <div class="inner-list list">
          ${entries.map(e => `
            <button class="list-row" data-action="focusop" data-op="${e.op}">
              <span class="dot" style="background:${e.color};color:${e.color}"></span>
              <span class="emoji-sq">${opIco(e.op)}</span>
              <span class="grow">${OPS[e.op].name}${Hooks.html('opBadge', e.op)}<span class="sub">${tr('точность {0}% · {1} с', Math.round((e.c / e.n) * 100), fmtSec(e.t / e.n / 1000))}</span></span>
              <span class="pct" style="color:${e.color}">${Math.round((e.n / opTotal) * 100)}%</span>
              <span class="muted count">${e.n}</span>
              <span class="chev">›</span>
            </button>`).join('')}
        </div>` : `<div class="empty">${tr('За этот период ещё нет решённых примеров')}</div>`}
    </div>
    ${tip}

    <div class="row-card" style="margin-top:12px">
      <span class="icon-sq sm">${ico('clipboard')}</span>
      <span class="row-main"><b>${tr('Частые ошибки')}</b></span>
      ${d.mistakes.length ? `<button class="btn ghost gold" data-action="quick" data-mode="mistakes" style="padding:6px 4px">${tr('Разобрать ›')}</button>` : ''}
    </div>
    <div class="card" style="padding:4px 20px;margin-top:10px">
      ${d.mistakes.length ? `
        <div class="list">
          ${d.mistakes.slice(0, 6).map(m => `
            <div class="list-row">
              <span class="emoji-sq">${opIco(m.op)}</span>
              <span class="grow">${problemHtml(m)}<span class="sub">${tr('ответ:')} <span style="color:var(--ok)">${answerHtml(m.answer)}</span></span></span>
              <span class="gold">${'●'.repeat(m.count)}</span>
            </div>`).join('')}
        </div>` : `<div class="empty">${tr('Ошибок нет — отлично!')}</div>`}
    </div>

    ${Hooks.html('statsTop', statsPeriod)}
    ${UI.heatmap()}
    ${Hooks.html('statsMid', statsPeriod)}
    ${UI.reportBlock()}

    <div class="section-title"><h2>${tr('История тренировок')}</h2><span>${PERIODS[statsPeriod]}</span></div>
    ${groups.length ? groups.map(g => `
      <div class="day-head">
        <b>${capitalize(g.date.toLocaleDateString(I18N.locale, { day: 'numeric', month: 'short' }))}</b>
        <span>${tr('+{0} верных', g.correct)}</span>
      </div>
      ${g.items.map(s => {
        const n = s.correct + s.wrong;
        const time = new Date(s.date).toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit' });
        const detail = s.mode === 'table' || s.mode === 'mistakes' ? '' : ` · ${LEVELS[s.level].name}`;
        return `
          <div class="session-card ${s.completed ? '' : 'partial'}">
            <span class="emoji-sq">${ico(MODES[s.mode].icon)}</span>
            <div class="grow">
              <div class="title">${s.variant && VARIANTS[s.variant] ? VARIANTS[s.variant].name : MODES[s.mode].name}</div>
              <div class="meta">${time}${detail} · ${s.correct}/${n} · ${Math.round((s.correct / n) * 100)}%${s.completed ? '' : tr(' · прервано')}</div>
            </div>
            <div class="right">
              <div class="score">${formatScore(s.mode, s.score)}</div>
              <div class="xp">+${s.xp} XP</div>
            </div>
          </div>`;
      }).join('')}`).join('')
      : `<div class="card empty">${tr('Здесь появится история твоих тренировок')}</div>`}
  `;
  if (reason === 'period') FX.stats('period');
}

/* =========================================================
   Настройки
   ========================================================= */

function renderSettings() {
  $('#app').innerHTML = UI.settingsView();
}

const RENDERERS = {
  dashboard: renderDashboard,
  training: renderTraining,
  stats: renderStats,
  settings: renderSettings,
  profile: renderProfile,
  forge: renderForge,
};
Object.assign(RENDERERS, Hooks.views);

/* =========================================================
   События
   ========================================================= */

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const s = data.settings;
  const action = el.dataset.action;
  if (['nav', 'mode', 'op', 'level', 'tnum', 'tdiv', 'autocheck', 'answermode', 'goal', 'period', 'focusop', 'animations'].includes(action)) Sound.click();
  FX.beforeAction();

  switch (action) {
    case 'nav':
      navigate(el.dataset.view);
      break;
    case 'quick':
      startGame(el.dataset.mode);
      break;
    case 'start':
      startGame(s.mode);
      break;
    case 'start-last':
      FX.fabLaunch(() => startGame(s.mode === 'mistakes' && !data.mistakes.length ? 'sprint' : s.mode));
      break;
    case 'record': {
      const [mode, level, ops, answerMode] = el.dataset.key.split('|');
      s.level = level;
      s.ops = ops.split(',');
      s.answerMode = answerMode === 'choice' ? 'choice' : 'input';
      startGame(mode);
      break;
    }
    case 'mode':
      s.mode = el.dataset.mode;
      saveData();
      renderTraining();
      break;
    case 'op': {
      const op = el.dataset.op;
      s.ops = s.ops.includes(op) ? s.ops.filter(o => o !== op) : [...s.ops, op];
      delete s.opWeights;
      saveData();
      renderTraining();
      break;
    }
    case 'focusop':
      s.ops = [el.dataset.op];
      if (s.mode === 'table' || s.mode === 'mistakes') s.mode = 'practice';
      saveData();
      navigate('training');
      toast(`${tr('Выбрано: {0}', OPS[el.dataset.op].name)}`);
      break;
    case 'level':
      s.level = el.dataset.level;
      saveData();
      renderTraining();
      break;
    case 'tnum': {
      const n = Number(el.dataset.n);
      s.tableNums = s.tableNums.includes(n) ? s.tableNums.filter(x => x !== n) : [...s.tableNums, n].sort((a, b) => a - b);
      saveData();
      renderTraining();
      break;
    }
    case 'tdiv':
      s.tableDiv = !s.tableDiv;
      saveData();
      renderTraining();
      break;
    case 'autocheck':
      s.autoCheck = !s.autoCheck;
      saveData();
      el.classList.toggle('on', s.autoCheck);
      break;
    case 'answermode':
      s.answerMode = el.dataset.am;
      saveData();
      rerender();
      break;
    case 'goal':
      data.dailyGoal = Number(el.dataset.n);
      saveData();
      renderSettings();
      toast(`${tr('Дневная цель: {0}', data.dailyGoal)}`);
      break;
    case 'period':
      statsPeriod = el.dataset.period;
      renderStats('period');
      break;
    case 'animations':
      s.animations = s.animations === false;
      saveData();
      el.classList.toggle('on', s.animations);
      FX.apply();
      toast(s.animations ? tr('Анимации включены') : tr('Анимации выключены'));
      break;
    case 'sound':
      s.sound = !s.sound;
      saveData();
      FX.swapIcon($('#soundBtn'), icoInline(s.sound ? 'speaker' : 'mute'));
      document.querySelectorAll('.switch[data-action="sound"]').forEach(sw => sw.classList.toggle('on', s.sound));
      if (s.sound) Sound.correct(0);
      break;
    case 'soundtest':
      if (!s.sound) toast(tr('Звук выключен'));
      Sound.record();
      break;
    case 'open-chest':
      openChest(el);
      break;
    case 'game-pause':
      pauseGame();
      break;
    case 'game-resume':
      resumeGame();
      break;
    case 'game-hint':
      useHint();
      break;
    case 'end':
      endGame(false);
      break;
    case 'reset':
      Dialog.confirm({
        icon: 'backspace',
        title: tr('Сбросить весь прогресс?'),
        text: `${tr('Опыт, рекорды, достижения и история профиля «{0}» удалятся. Отменить это нельзя.', profileName())}`,
        ok: tr('Сбросить'),
        danger: true,
      }).then(ok => {
        if (!ok) return;
        Hooks.run('beforeReset');
        FX.eraseScreen(() => {
          data = defaultData();
          saveData();
          toast(tr('Прогресс сброшен'));
          navigate('dashboard');
        });
      });
      break;
    default:
      if (Hooks.any('action', action, el)) break;
      if (profileAction(action, el)) break;
      if (!UI.action(action, el)) return;
      break;
  }

  FX.afterAction(action, el.dataset);
});

document.addEventListener('input', e => {
  if (e.target.dataset.action === 'volume') {
    data.settings.volume = Number(e.target.value);
    saveData();
    FX.volume(data.settings.volume);
  }
});

document.addEventListener('change', e => {
  if (e.target.dataset.action === 'volume') Sound.correct(0);
});

function livesHtml(lives) {
  return Array.from({ length: game?.maxLives || SURVIVAL_LIVES }, (_, i) => ico(i < lives ? 'heart' : 'heartEmpty')).join('');
}

// Системная кнопка «Назад» в Android-приложении: true — обработано внутри
let lastBackPress = 0;

window.mfsBack = () => {
  if (Dialog.isOpen()) { Dialog.dismiss(); return true; }
  const overlay = document.querySelector('.fx-levelup');
  if (overlay) { overlay.remove(); return true; }
  if (Hooks.any('back')) return true;
  if (currentView === 'game') {
    if (game?.paused) resumeGame();
    else if (game?.started) pauseGame();
    else if (game) endGame(false);
    return true;
  }
  if (currentView === 'duel') { navigate('dashboard'); return true; }
  if (currentView !== 'dashboard') { navigate('dashboard'); return true; }
  // На главной выходим только по второму нажатию — чтобы не закрыть приложение случайно
  const now = Date.now();
  if (now - lastBackPress < 2000) return false;
  lastBackPress = now;
  toast(tr('Нажми «Назад» ещё раз, чтобы выйти'));
  return true;
};

document.querySelectorAll('[data-ico]').forEach(el => { el.innerHTML = ico(el.dataset.ico); });
// Подписи в разметке страницы — на выбранном языке
document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', tr(el.dataset.i18nAria)));
FX.boot();
UI.applyPrefs();
Hooks.run('boot');
applyStreakFreeze();
Native.setReminderText(tr('Пора потренировать счёт — цель дня ещё ждёт'), tr('Ежедневное напоминание'));

// Офлайн-режим и установка приложения на телефон
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

document.addEventListener('keydown', e => {
  UI.duelKeyboard(e);
  if (currentView === 'game' && game) {
    if (e.key === 'Escape') {
      e.preventDefault();
      endGame(false);
    } else if (game.choiceMode && /^[1-4]$/.test(e.key)) {
      e.preventDefault();
      const btn = document.querySelectorAll('#gChoices button')[Number(e.key) - 1];
      if (btn) chooseAnswer(btn.dataset.choice);
    }
  }
});

// Заставка: карандашный знак суммы, золото и название, затем плавный переход на главную
(function playIntro() {
  const intro = document.getElementById('intro');
  const skip = !intro || !FX.on() || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (skip) {
    intro?.remove();
    navigate('dashboard');
    Hooks.run('ready');
    return;
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    navigate('dashboard');
    Hooks.run('ready');
    intro.classList.add('out');
    setTimeout(() => intro.remove(), 480);
  };
  intro.addEventListener('pointerdown', finish);
  intro.querySelector('.intro-tag')?.addEventListener('animationend', () => setTimeout(finish, 150));
  setTimeout(finish, 2200);
})();

