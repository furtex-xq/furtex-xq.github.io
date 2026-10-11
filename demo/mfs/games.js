'use strict';

/* =========================================================
   Игровое: мини-игры, босс дня, питомец, сезонный пропуск,
   рецепты крафта, серия дуэлей и карта Пути.
   ========================================================= */

/* ---------- Мини-игры: общий экран ---------- */

const MINIGAMES = [
  { id: 'g24', icon: 'puzzle', name: () => tr('Собери 24'), desc: () => tr('Из четырёх чисел получить 24') },
  { id: 'chain', icon: 'link', name: () => tr('Цепочка до числа'), desc: () => tr('Дойти до цели за несколько шагов') },
  { id: 'magic', icon: 'grid', name: () => tr('Магический квадрат'), desc: () => tr('Все строки и столбцы с одной суммой') },
];

const miniBest = d => (d.mini ||= {});

function renderMinigames() {
  const d = data;
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="training">‹ ${tr('Тренировка')}</button>
    <h1 class="page-title">${tr('Мини-игры')}</h1>
    <p class="hint">${tr('Короткие головоломки на счёт. За каждую — монеты и опыт.')}</p>
    <div class="learn-list">
      ${MINIGAMES.map(g => `
        <button class="row-card learn-row" data-action="mini-open" data-id="${g.id}">
          <span class="icon-sq sm">${ico(g.icon)}</span>
          <span class="row-main"><b>${escH(g.name())}</b><small>${escH(g.desc())}</small></span>
          <span class="mini-best">${miniBest(d)[g.id] ? tr('Решено: {0}', miniBest(d)[g.id]) : ''}</span>
          <span class="chev">›</span>
        </button>`).join('')}
    </div>`;
}
Hooks.view('minigames', renderMinigames);

function miniWin(id, coins, xp) {
  miniBest(data)[id] = (miniBest(data)[id] || 0) + 1;
  data.coins = (data.coins || 0) + coins;
  data.xp += xp;
  petFeed(3);
  saveData();
  Sound.record();
  vibrate([0, 40, 40, 60]);
}

/* ---------- Собери 24 ---------- */

let g24 = null;

// Четвёрка чисел, из которой 24 точно собирается
function make24() {
  for (let tries = 0; tries < 400; tries++) {
    const nums = Array.from({ length: 4 }, () => rand(1, 10));
    if (solve24(nums)) return nums;
  }
  return [4, 6, 2, 3];
}

function solve24(nums) {
  const eps = 1e-6;
  const go = list => {
    if (list.length === 1) return Math.abs(list[0] - 24) < eps;
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const rest = list.filter((_, k) => k !== i && k !== j);
        const a = list[i];
        const b = list[j];
        const vals = [a + b, a - b, a * b];
        if (Math.abs(b) > eps) vals.push(a / b);
        for (const v of vals) if (go([...rest, v])) return true;
      }
    }
    return false;
  };
  return go(nums.slice());
}

function start24() {
  g24 = { nums: make24(), expr: [], used: [] };
  render24();
}

function render24() {
  const st = g24;
  const value = calc24(st.expr);
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="minigames">‹ ${tr('Мини-игры')}</button>
    <h1 class="page-title">${tr('Собери 24')}</h1>
    <p class="hint">${tr('Нажимай числа и знаки так, чтобы получилось 24. Каждое число — один раз.')}</p>
    <section class="card g24-card">
      <div class="g24-expr ${value === 24 ? 'ok' : ''}">${st.expr.length ? st.expr.join(' ') : '…'}</div>
      <div class="g24-value">${value === null ? tr('Выражение не готово') : tr('Сейчас: {0}', fmtDec(Math.round(value * 100) / 100))}</div>
      <div class="g24-nums">
        ${st.nums.map((n, i) => `<button class="g24-num ${st.used.includes(i) ? 'used' : ''}" data-action="g24-num" data-i="${i}" ${st.used.includes(i) ? 'disabled' : ''}>${n}</button>`).join('')}
      </div>
      <div class="g24-ops">
        ${['+', '−', '×', '÷', '(', ')'].map(o => `<button class="g24-op" data-action="g24-op" data-o="${o}">${o}</button>`).join('')}
      </div>
      <div class="g24-actions">
        <button class="btn ghost" data-action="g24-undo">${tr('Назад')}</button>
        <button class="btn ghost" data-action="g24-new">${tr('Другие числа')}</button>
        <button class="btn primary" data-action="g24-check">${tr('Проверить')}</button>
      </div>
    </section>`;
}
Hooks.view('g24', render24);

// Считает выражение из кнопок тем же разборщиком, что и «Свой набор»; null — если запись неполная
function calc24(tokens) {
  if (!tokens.length) return null;
  try {
    const v = evalExpr(tokens.join(' '));
    return Number.isFinite(v) ? v : null;
  } catch { return null; }
}

function check24() {
  const st = g24;
  const v = calc24(st.expr);
  if (st.used.length < 4) { toast(tr('Нужно использовать все четыре числа')); return; }
  if (v !== null && Math.abs(v - 24) < 1e-6) {
    miniWin('g24', 60, 25);
    Dialog.open({ icon: 'trophy', title: tr('Получилось 24!'), text: st.expr.join(' '), buttons: [{ label: tr('Ещё'), kind: 'primary', value: 'more' }] })
      .then(() => start24());
  } else {
    Sound.wrong();
    toast(v === null ? tr('Выражение не считается') : tr('Получилось {0}, а нужно 24', fmtDec(Math.round(v * 100) / 100)));
  }
}

/* ---------- Цепочка до числа ---------- */

let chainGame = null;

function startChain() {
  const level = data.settings.level;
  const steps = { easy: 3, medium: 4, hard: 5 }[level] || 4;
  const ops = [];
  let cur = rand(2, 20);
  const start = cur;
  for (let i = 0; i < steps; i++) {
    const kind = pick(['add', 'sub', 'mul']);
    if (kind === 'mul' && cur <= 12) { const k = rand(2, 4); ops.push(['×', k]); cur *= k; }
    else if (kind === 'sub' && cur > 12) { const k = rand(2, 12); ops.push(['−', k]); cur -= k; }
    else { const k = rand(2, 15); ops.push(['+', k]); cur += k; }
  }
  const pool = shuffle([...ops, ...Array.from({ length: 4 }, () => pick([['+', rand(2, 15)], ['−', rand(2, 12)], ['×', rand(2, 4)]]))]);
  chainGame = { start, target: cur, pool, used: [], cur: start };
  renderChain();
}

function renderChain() {
  const st = chainGame;
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="minigames">‹ ${tr('Мини-игры')}</button>
    <h1 class="page-title">${tr('Цепочка до числа')}</h1>
    <p class="hint">${tr('Собери цепочку действий так, чтобы из первого числа получить второе.')}</p>
    <section class="card chain-card">
      <div class="chain-line"><b>${st.start}</b><span>→</span><b class="gold">${st.target}</b></div>
      <div class="chain-now ${st.cur === st.target ? 'ok' : ''}">${tr('Сейчас: {0}', st.cur)}</div>
      <div class="chain-used">${st.used.length ? st.used.map(i => `<span>${st.pool[i][0]} ${st.pool[i][1]}</span>`).join('') : `<span class="muted">${tr('Шагов пока нет')}</span>`}</div>
      <div class="chain-pool">
        ${st.pool.map((o, i) => `<button class="chain-op ${st.used.includes(i) ? 'used' : ''}" data-action="chain-op" data-i="${i}" ${st.used.includes(i) ? 'disabled' : ''}>${o[0]} ${o[1]}</button>`).join('')}
      </div>
      <div class="g24-actions">
        <button class="btn ghost" data-action="chain-undo">${tr('Назад')}</button>
        <button class="btn ghost" data-action="chain-new">${tr('Другая цепочка')}</button>
      </div>
    </section>`;
}
Hooks.view('chain-game', renderChain);

function chainStep(i) {
  const st = chainGame;
  const [op, k] = st.pool[i];
  st.used.push(i);
  st.cur = op === '+' ? st.cur + k : op === '−' ? st.cur - k : st.cur * k;
  Sound.click();
  if (st.cur === st.target) {
    miniWin('chain', 50, 20);
    renderChain();
    Dialog.open({ icon: 'trophy', title: tr('Цепочка сошлась!'), text: tr('{0} шага до цели', st.used.length), buttons: [{ label: tr('Ещё'), kind: 'primary', value: 'more' }] })
      .then(() => startChain());
    return;
  }
  renderChain();
}

/* ---------- Магический квадрат ---------- */

let magic = null;

function startMagic() {
  // Базовый квадрат 3×3 с суммой 15, затем сдвиг и умножение
  const base = [[2, 7, 6], [9, 5, 1], [4, 3, 8]];
  const add = rand(0, 9);
  const mul = pick([1, 1, 2, 3]);
  const grid = base.map(row => row.map(v => v * mul + add));
  const hide = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, { easy: 3, medium: 4, hard: 5 }[data.settings.level] || 4);
  magic = { grid, hide, input: {}, sum: grid[0][0] + grid[0][1] + grid[0][2] };
  renderMagic();
}

function renderMagic() {
  const st = magic;
  const cells = st.grid.flat().map((v, i) => {
    if (!st.hide.includes(i)) return `<span class="mq-cell">${v}</span>`;
    const val = st.input[i] ?? '';
    const ok = String(val) === String(v);
    return `<input class="mq-cell in ${val !== '' ? (ok ? 'ok' : 'bad') : ''}" inputmode="numeric" data-mq="${i}" value="${escH(String(val))}">`;
  }).join('');
  const solved = st.hide.every(i => String(st.input[i] ?? '') === String(st.grid.flat()[i]));
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="minigames">‹ ${tr('Мини-игры')}</button>
    <h1 class="page-title">${tr('Магический квадрат')}</h1>
    <p class="hint">${tr('Сумма каждой строки, столбца и диагонали — {0}.', st.sum)}</p>
    <section class="card mq-card">
      <div class="mq-grid">${cells}</div>
      ${solved ? `<div class="mq-done">${tr('Квадрат сошёлся!')}</div>` : ''}
      <div class="g24-actions">
        <button class="btn ghost" data-action="magic-new">${tr('Другой квадрат')}</button>
      </div>
    </section>`;
}
Hooks.view('magic', renderMagic);

document.addEventListener('input', e => {
  const i = e.target?.dataset?.mq;
  if (i === undefined || !magic) return;
  magic.input[Number(i)] = e.target.value.replace(/\D/g, '');
  const flat = magic.grid.flat();
  const solved = magic.hide.every(k => String(magic.input[k] ?? '') === String(flat[k]));
  if (solved) {
    miniWin('magic', 55, 22);
    renderMagic();
    Dialog.open({ icon: 'trophy', title: tr('Квадрат сошёлся!'), buttons: [{ label: tr('Ещё'), kind: 'primary', value: 'more' }] }).then(() => startMagic());
  } else {
    e.target.classList.toggle('ok', String(magic.input[Number(i)]) === String(flat[Number(i)]));
  }
});

/* ---------- Босс дня ---------- */

// Один длинный пример в день: четыре действия подряд, одна попытка
function bossTask() {
  const rng = meRng(`boss-${dateKey()}`);
  const r = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const a = r(12, 40);
  const b = r(3, 9);
  const c = r(10, 60);
  const d = r(2, 9);
  const text = `(${a} × ${b} − ${c}) ÷ ${d}`;
  const value = (a * b - c) / d;
  if (!Number.isInteger(value) || value < 0) {
    const c2 = a * b - d * r(3, 20);
    return { text: `(${a} × ${b} − ${c2}) ÷ ${d}`, answer: String((a * b - c2) / d) };
  }
  return { text, answer: String(value) };
}

const bossState = d => (d.boss ||= { day: null, ok: false, tries: 0 });

function bossCard(d) {
  const st = bossState(d);
  const done = st.day === dateKey();
  return `
    <button class="row-card boss-card ${done ? 'done' : ''}" data-action="boss-go">
      <span class="icon-sq sm">${ico('skull')}</span>
      <span class="row-main">
        <b>${tr('Босс дня')}</b>
        <small>${done ? (st.ok ? tr('Побеждён сегодня') : tr('Сегодня не вышло — завтра новый')) : tr('Один большой пример, одна попытка')}</small>
      </span>
      <span class="chev">›</span>
    </button>`;
}

async function bossGo() {
  const st = bossState(data);
  if (st.day === dateKey()) { toast(st.ok ? tr('Босс уже побеждён. Приходи завтра!') : tr('Попытка на сегодня потрачена')); return; }
  const t = bossTask();
  const res = await Dialog.open({
    icon: 'skull',
    title: tr('Босс дня'),
    text: tr('Одна попытка. Победишь — 150 монет и ключ.'),
    html: `<div class="boss-task">${escH(t.text)} = ?</div>`,
    input: { placeholder: tr('Ответ'), maxLength: 10 },
    buttons: [{ label: tr('Отмена'), value: 'no' }, { label: tr('Ответить'), kind: 'primary', value: 'yes' }],
  });
  if (!res || res.button !== 'yes') return;
  st.day = dateKey();
  st.ok = String(res.value || '').trim() === t.answer;
  if (st.ok) {
    data.coins = (data.coins || 0) + 150;
    data.keys = (data.keys || 0) + 1;
    data.xp += 60;
    Sound.record();
    Dialog.open({ icon: 'trophy', title: tr('Босс повержен!'), text: tr('+150 монет, +1 ключ, +60 XP'), buttons: [{ label: tr('Отлично'), kind: 'primary', value: 'ok' }] });
  } else {
    Sound.wrong();
    Dialog.open({ icon: 'skull', title: tr('Мимо'), text: tr('Правильный ответ: {0}. Завтра будет новый босс.', t.answer), buttons: [{ label: tr('Ладно'), kind: 'primary', value: 'ok' }] });
  }
  saveData();
  if (currentView === 'dashboard') renderDashboard();
}

/* ---------- Питомец ---------- */

const PET_STAGES = [
  { name: () => tr('Яйцо'), need: 0, icon: 'gem' },
  { name: () => tr('Малыш'), need: 150, icon: 'heart' },
  { name: () => tr('Подросток'), need: 600, icon: 'star' },
  { name: () => tr('Взрослый'), need: 1800, icon: 'crown' },
];

const petState = d => (d.pet ||= { xp: 0, name: '' });
const petStage = d => PET_STAGES.reduce((acc, s, i) => (petState(d).xp >= s.need ? i : acc), 0);
// Взрослый питомец немного ускоряет рост опыта
const petXpBonus = d => petStage(d) * 0.02;

function petFeed(n) {
  const p = petState(data);
  const was = petStage(data);
  p.xp += n;
  if (petStage(data) > was) {
    toast(tr('Питомец подрос: {0}', PET_STAGES[petStage(data)].name()));
    Sound.achievement();
  }
}

Hooks.on('gameEnd', (g, session) => petFeed(session.correct));

function petCard(d) {
  const st = petStage(d);
  const p = petState(d);
  const next = PET_STAGES[st + 1];
  const pct = next ? Math.min(100, ((p.xp - PET_STAGES[st].need) / (next.need - PET_STAGES[st].need)) * 100) : 100;
  return `
    <button class="row-card pet-card" data-action="pet-open">
      <span class="icon-sq sm pet-ico stage-${st}">${ico(PET_STAGES[st].icon)}</span>
      <span class="row-main">
        <b>${escH(p.name || tr('Питомец'))} · ${escH(PET_STAGES[st].name())}</b>
        <small>${next ? tr('До следующей ступени: {0}', next.need - p.xp) : tr('Вырос полностью')} · ${tr('+{0}% опыта', Math.round(petXpBonus(d) * 100))}</small>
        <span class="part-bar"><i style="width:${pct}%"></i></span>
      </span>
      <span class="chev">›</span>
    </button>`;
}

async function petOpen() {
  const p = petState(data);
  const res = await Dialog.open({
    icon: PET_STAGES[petStage(data)].icon,
    title: p.name || tr('Питомец'),
    text: tr('Питомец растёт от верных ответов: каждый ответ — одно зёрнышко. Чем он взрослее, тем больше опыта приносит тренировка.'),
    input: { value: p.name, placeholder: tr('Имя питомца'), maxLength: 16 },
    buttons: [{ label: tr('Закрыть'), value: 'no' }, { label: tr('Назвать'), kind: 'primary', value: 'yes' }],
  });
  if (res?.button === 'yes') { p.name = String(res.value || '').slice(0, 16); saveData(); }
  if (currentView === 'dashboard') renderDashboard();
}

/* ---------- Сезонный пропуск ---------- */

const PASS_TIERS = 30;
const PASS_STEP = 250;           // опыта за ступень

const passState = d => {
  const m = dateKey().slice(0, 7);
  d.pass ||= { m, xp: 0, taken: [] };
  if (d.pass.m !== m) d.pass = { m, xp: 0, taken: [] };
  return d.pass;
};

function passReward(i) {
  const n = i + 1;
  if (n % 10 === 0) return { kind: 'chest', label: tr('Эпический сундук'), icon: 'chest' };
  if (n % 5 === 0) return { kind: 'key', label: tr('Ключ'), icon: 'key' };
  if (n % 3 === 0) return { kind: 'parts', label: tr('Части ×2'), icon: 'puzzle' };
  return { kind: 'coins', n: 40 + n * 5, label: tr('{0} монет', 40 + n * 5), icon: 'coin' };
}

Hooks.on('gameEnd', (g, session) => { passState(data).xp += session.xp || 0; });

const passTier = d => Math.min(PASS_TIERS, Math.floor(passState(d).xp / PASS_STEP));

function renderPass() {
  const d = data;
  const st = passState(d);
  const cur = passTier(d);
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="profile">‹ ${tr('Профиль')}</button>
    <h1 class="page-title">${tr('Пропуск месяца')}</h1>
    <p class="hint">${tr('Опыт за месяц открывает ступени. В начале месяца пропуск начинается заново.')}</p>
    <div class="map-stats"><span>${tr('Ступень {0} из {1}', cur, PASS_TIERS)}</span><span>${tr('{0} XP за месяц', fmtNum(st.xp))}</span></div>
    <div class="pass-list">
      ${Array.from({ length: PASS_TIERS }, (_, i) => {
        const r = passReward(i);
        const open = i < cur;
        const taken = st.taken.includes(i);
        return `
        <button class="pass-row ${open ? 'open' : ''} ${taken ? 'taken' : ''}" data-action="pass-take" data-i="${i}" ${!open || taken ? 'disabled' : ''}>
          <span class="pass-num">${i + 1}</span>
          <span class="pass-ico">${ico(r.icon)}</span>
          <span class="row-main"><b>${escH(r.label)}</b><small>${(i + 1) * PASS_STEP} XP</small></span>
          <span class="pass-state">${taken ? ico('star') : open ? tr('Забрать') : ico('lock')}</span>
        </button>`;
      }).join('')}
    </div>`;
  FX.drawIcons($('#app'));
}
Hooks.view('pass', renderPass);

function passTake(i) {
  const st = passState(data);
  if (st.taken.includes(i) || i >= passTier(data)) return;
  st.taken.push(i);
  const r = passReward(i);
  if (r.kind === 'coins') { data.coins = (data.coins || 0) + r.n; toast(tr('+{0} монет', r.n)); }
  if (r.kind === 'key') { data.keys = (data.keys || 0) + 1; toast(tr('+1 ключ')); }
  if (r.kind === 'parts') {
    const want = partList(data).find(x => x.have < x.need);
    if (want) { const pr = grantParts(data, { type: want.type, item: want.item, n: 2 }); toast(tr('Части: {0} ({1}/{2})', want.item.name, pr.have, pr.need)); }
    else { data.coins = (data.coins || 0) + 100; toast(tr('+{0} монет', 100)); }
  }
  saveData();
  Sound.coin();
  if (r.kind === 'chest') { openBonusChest('epic', () => renderPass()); return; }
  renderPass();
}

/* ---------- Рецепты крафта ---------- */

// Из частей одного предмета можно собрать другой — по рецепту
const RECIPES = [
  { id: 'r1', from: ['crown', 'c_leaf'], to: ['crown', 'c_ocean'], parts: 3, coins: 200 },
  { id: 'r2', from: ['crown', 'c_sun'], to: ['crown', 'c_ember'], parts: 3, coins: 200 },
  { id: 'r3', from: ['frame', 'f_oak'], to: ['frame', 'f_wave'], parts: 3, coins: 200 },
  { id: 'r4', from: ['frame', 'f_steel'], to: ['frame', 'f_ice'], parts: 3, coins: 200 },
  { id: 'r5', from: ['crown', 'c_ocean'], to: ['crown', 'c_nebula'], parts: 4, coins: 450 },
  { id: 'r6', from: ['frame', 'f_wave'], to: ['frame', 'f_cosmos'], parts: 4, coins: 450 },
];

const recipeItem = ([type, id]) => LOOT_LISTS[type].find(x => x.id === id);

function recipeReady(r) {
  const [ft, fid] = r.from;
  const have = partsOf(data)[partKey(ft, fid)] || 0;
  return have >= r.parts && (data.coins || 0) >= r.coins;
}

Hooks.on('forgeTop', d => {
  void d;
  return `
    <button class="row-card" data-action="nav" data-view="recipes">
      <span class="icon-sq sm">${ico('swap')}</span>
      <span class="row-main"><b>${tr('Рецепты')}</b><small>${tr('Обменять части одного предмета на другой')}</small></span>
      <span class="chev">›</span>
    </button>`;
});

function renderRecipes() {
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="forge">‹ ${tr('Мастерская')}</button>
    <h1 class="page-title">${tr('Рецепты')}</h1>
    <p class="hint">${tr('Лишние части можно переплавить в части предмета пореже.')}</p>
    <div class="learn-list">
      ${RECIPES.map(r => {
        const a = recipeItem(r.from);
        const b = recipeItem(r.to);
        const have = partsOf(data)[partKey(r.from[0], r.from[1])] || 0;
        const ok = recipeReady(r);
        return `
        <div class="row-card recipe ${ok ? 'ready' : ''}">
          <span class="fc-pic">${lootPic({ type: r.from[0], item: a })}</span>
          <span class="row-main">
            <b>${escH(a.name)} → ${escH(b.name)}</b>
            <small>${tr('Нужно частей: {0}', r.parts)} · ${tr('есть {0}', have)} · ${ico('coin')} ${fmtNum(r.coins)}</small>
          </span>
          <button class="btn sm ${ok ? 'primary' : ''}" data-action="recipe-make" data-id="${r.id}" ${ok ? '' : 'disabled'}>${tr('Собрать')}</button>
        </div>`;
      }).join('')}
    </div>`;
  FX.drawIcons($('#app'));
}
Hooks.view('recipes', renderRecipes);

function recipeMake(id) {
  const r = RECIPES.find(x => x.id === id);
  if (!r || !recipeReady(r)) { toast(tr('Не хватает частей или монет')); return; }
  const key = partKey(r.from[0], r.from[1]);
  partsOf(data)[key] -= r.parts;
  data.coins -= r.coins;
  const item = recipeItem(r.to);
  const pr = grantParts(data, { type: r.to[0], item, n: 2 });
  saveData();
  Sound.coin();
  toast(tr('Части: {0} ({1}/{2})', item.name, pr.have, pr.need));
  renderRecipes();
}

/* ---------- Серия дуэлей по коду ---------- */

const seriesState = d => (d.series || null);

function seriesCard() {
  const s = seriesState(data);
  if (!s) return '';
  return `
    <div class="row-card series-card">
      <span class="icon-sq sm">${ico('shield')}</span>
      <span class="row-main">
        <b>${tr('Серия матчей: раунд {0} из 3', Math.min(3, s.round + 1))}</b>
        <small>${tr('Твои очки: {0}', s.mine.join(' · ') || '—')}</small>
      </span>
      <button class="btn sm primary" data-action="series-next">${s.round >= 3 ? tr('Итог') : tr('Играть')}</button>
    </div>`;
}

async function seriesCreate() {
  const s = data.settings;
  const cfg = { mode: 'sprint', level: s.level, ops: s.ops.length ? s.ops : ['add', 'sub', 'mul', 'div'], seed: Math.floor(Math.random() * 1e6) };
  const res = await Dialog.open({
    icon: 'shield',
    title: tr('Серия из 3 матчей'),
    text: tr('Передай код сопернику. Сыграете по три спринта с одинаковыми примерами, победит сумма очков.'),
    code: matchCode(cfg),
    buttons: [{ label: tr('Позже'), value: false }, { label: tr('Играть'), kind: 'primary', value: true }],
  });
  if (res?.button) seriesStart(cfg);
}

async function seriesJoin() {
  const code = await Dialog.prompt({ icon: 'keyboard', title: tr('Код серии'), text: tr('Введи код, который прислал соперник.'), placeholder: 'M-…', ok: tr('Играть'), upper: true, maxLength: 40 });
  if (!code) return;
  const cfg = unpackCode(code);
  if (!cfg || cfg.kind !== 'M') { toast(tr('Код не подходит')); return; }
  seriesStart(cfg);
}

function seriesStart(cfg) {
  data.series = { cfg, round: 0, mine: [] };
  saveData();
  seriesNext();
}

function seriesNext() {
  const s = seriesState(data);
  if (!s) return;
  if (s.round >= 3) { seriesFinish(); return; }
  startGame(s.cfg.mode === 'duel' ? 'sprint' : s.cfg.mode, { settings: { ops: [...s.cfg.ops], level: s.cfg.level, adaptive: false } });
  if (game) {
    game.rng = seededRandom(s.cfg.seed + s.round * 7919);
    game.series = true;
  }
}

Hooks.on('gameEnd', (g, session) => {
  const s = seriesState(data);
  if (!s || !g.series) return;
  s.mine.push(session.correct);
  s.round++;
});

function seriesFinish() {
  const s = seriesState(data);
  const total = s.mine.reduce((a, b) => a + b, 0);
  Dialog.open({
    icon: 'trophy',
    title: tr('Серия окончена'),
    text: tr('Сумма за три раунда: {0}. Отправь код сопернику — у кого больше, тот и выиграл.', total),
    code: resultCode(s.cfg.seed, total),
    buttons: [{ label: tr('Закрыть'), kind: 'primary', value: 'ok' }],
  });
  data.series = null;
  saveData();
}

/* ---------- Путь: сундук за каждые четыре уровня ---------- */

const pathChests = d => (d.pathChests ||= { taken: 0 });
const pathDone = d => TRAIN_LEVELS.filter(l => pathStars(d, l.n)).length;
const pathChestReady = d => Math.floor(pathDone(d) / 4) > pathChests(d).taken;

Hooks.on('pathTop', d => {
  const done = pathDone(d);
  const ready = pathChestReady(d);
  const next = (pathChests(d).taken + 1) * 4;
  return `
    <button class="row-card path-chest ${ready ? 'ready' : ''}" data-action="path-chest" ${ready ? '' : 'disabled'}>
      <span class="icon-sq sm">${ico('chest')}</span>
      <span class="row-main">
        <b>${ready ? tr('Сундук за уровни готов!') : tr('Сундук за {0} уровней', next)}</b>
        <small>${tr('Пройдено: {0}', done)}</small>
        <span class="part-bar"><i style="width:${Math.min(100, ((done % 4) / 4) * 100 || (ready ? 100 : 0))}%"></i></span>
      </span>
      <span class="chev">${ready ? '' : ico('lock')}</span>
    </button>`;
});

function pathChestOpen() {
  if (!pathChestReady(data)) return;
  pathChests(data).taken++;
  saveData();
  openBonusChest(pathChests(data).taken % 2 ? 'rare' : 'epic', () => renderPath());
}

/* ---------- Кнопки ---------- */

Hooks.on('action', (action, el) => {
  switch (action) {
    case 'mini-open': {
      const id = el.dataset.id;
      if (id === 'g24') { start24(); navigate('g24'); return true; }
      if (id === 'chain') { startChain(); navigate('chain-game'); return true; }
      startMagic();
      navigate('magic');
      return true;
    }
    case 'series-create': seriesCreate(); return true;
    case 'series-join': seriesJoin(); return true;
    case 'path-chest': pathChestOpen(); return true;
    case 'g24-num': { g24.expr.push(String(g24.nums[Number(el.dataset.i)])); g24.used.push(Number(el.dataset.i)); Sound.click(); render24(); return true; }
    case 'g24-op': { g24.expr.push(el.dataset.o); Sound.click(); render24(); return true; }
    case 'g24-undo': {
      const last = g24.expr.pop();
      const i = g24.nums.findIndex((n, k) => String(n) === last && g24.used.includes(k));
      if (i >= 0) g24.used = g24.used.filter(k => k !== i);
      render24();
      return true;
    }
    case 'g24-new': start24(); return true;
    case 'g24-check': check24(); return true;
    case 'chain-op': chainStep(Number(el.dataset.i)); return true;
    case 'chain-undo': {
      const st = chainGame;
      const i = st.used.pop();
      if (i !== undefined) { const [op, k] = st.pool[i]; st.cur = op === '+' ? st.cur - k : op === '−' ? st.cur + k : st.cur / k; }
      renderChain();
      return true;
    }
    case 'chain-new': startChain(); return true;
    case 'magic-new': startMagic(); return true;
    case 'boss-go': bossGo(); return true;
    case 'pet-open': petOpen(); return true;
    case 'pass-take': passTake(Number(el.dataset.i)); return true;
    case 'recipe-make': recipeMake(el.dataset.id); return true;
    case 'series-next': seriesNext(); return true;
    default: return false;
  }
});

/* ---------- Карточки на экранах ---------- */

Hooks.on('dashStack', d => `${bossCard(d)}${petCard(d)}${seriesCard()}`);

Hooks.on('trainingModes', () => `
  <button class="row-card" data-action="nav" data-view="minigames">
    <span class="icon-sq sm">${ico('puzzle')}</span>
    <span class="row-main"><b>${tr('Мини-игры')}</b><small>${MINIGAMES.map(g => g.name()).join(' · ')}</small></span>
    <span class="chev">›</span>
  </button>
  <div class="row-card series-new">
    <span class="icon-sq sm">${ico('shield')}</span>
    <span class="row-main"><b>${tr('Серия из 3 матчей')}</b><small>${tr('Три спринта с одинаковыми примерами')}</small></span>
    <button class="btn sm" data-action="series-join">${tr('По коду')}</button>
    <button class="btn sm primary" data-action="series-create">${tr('Создать')}</button>
  </div>`);

Hooks.on('profileBottom', d => `
  <button class="row-card" data-action="nav" data-view="pass">
    <span class="icon-sq sm">${ico('scroll')}</span>
    <span class="row-main"><b>${tr('Пропуск месяца')}</b><small>${tr('Ступень {0} из {1}', passTier(d), PASS_TIERS)}</small></span>
    <span class="chev">›</span>
  </button>`);
