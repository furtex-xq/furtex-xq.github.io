'use strict';

/* =========================================================
   Новые режимы поверх обычных: разминка, цепочка, прикидка,
   «верно или нет», башня, экзамен, на слух, свой набор, турнир недели,
   а также свой диапазон чисел и набор «как во входном тесте».
   ========================================================= */

// Темы, у которых ответ — целое число (подходят для «верно или нет» и дуэлей)
const INT_OPS = ['add', 'sub', 'mul', 'div', 'pow', 'pct', 'neg', 'rem', 'eq', 'round', 'expo', 'units', 'stat', 'geo', 'solid'];
const ARITH_OPS = ['add', 'sub', 'mul', 'div'];

// Набор «как во входном тесте»: темы с весами — чаще то, что чаще встречается в тесте
const TEST_WEIGHTS = { mul: 1, frac: 2, pct: 2, expo: 2, alg: 2, eq: 2, word: 3, geo: 2, units: 1, ratio: 1, stat: 1, dvs: 1 };
const TEST_OPS = Object.keys(TEST_WEIGHTS);

const sig2 = x => {
  if (!x) return 0;
  const p = 10 ** Math.max(0, Math.floor(Math.log10(Math.abs(x))) - 1);
  return Math.round(x / p) * p;
};

const isWeekend = (d = new Date()) => d.getDay() === 0 || d.getDay() === 6;
// Номер недели: одинаковый у всех игроков, чтобы турнир был общим
const weekId = (d = new Date()) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-${Math.ceil(((t - y0) / 864e5 + 1) / 7)}`;
};

/* ---------- Цепочка ---------- */

function genChain(g) {
  const level = g.settings.level;
  const cap = { easy: 60, medium: 200, hard: 999 }[level];
  const mulCap = { easy: 12, medium: 25, hard: 60 }[level];
  let a = g.chainVal ?? rand(3, { easy: 15, medium: 40, hard: 90 }[level]);
  const opts = [];
  const divs = [2, 3, 4, 5, 6, 7, 8, 9].filter(k => a % k === 0 && a / k >= 1);
  if (a < cap) opts.push('add', 'add');
  if (a > 3) opts.push('sub');
  if (a <= mulCap && a > 1) opts.push('mul');
  if (divs.length && a > 10) opts.push('div', 'div');
  if (!opts.length) opts.push('sub');
  const op = pick(opts);
  let b;
  switch (op) {
    case 'add': b = rand(2, Math.max(3, Math.min(cap - a, { easy: 15, medium: 50, hard: 150 }[level]))); break;
    case 'sub': b = rand(1, Math.max(1, Math.min(a - 1, { easy: 15, medium: 60, hard: 200 }[level]))); break;
    case 'mul': b = rand(2, Math.max(2, Math.min(9, Math.floor(cap / a) || 2))); break;
    default: b = pick(divs);
  }
  const p = makeProblem(op, a, b);
  if (g.chainVal != null) p.html = `<span class="chain-prev">${a}</span> ${OPS[op].sym} ${b} = ?`;
  return p;
}

/* ---------- Прикидка ---------- */

function genEstimate(g) {
  const level = g.settings.level;
  const kind = pick(level === 'easy' ? ['mul', 'add'] : ['mul', 'mul', 'add', 'pct']);
  let a, b, exact, html;
  if (kind === 'mul') {
    a = rand(level === 'easy' ? 11 : 21, level === 'hard' ? 999 : 99);
    b = rand(level === 'easy' ? 3 : 11, level === 'easy' ? 9 : 99);
    exact = a * b;
    html = `${a} × ${b} ≈ ?`;
  } else if (kind === 'add') {
    a = rand(120, level === 'hard' ? 9999 : 999);
    b = rand(120, level === 'hard' ? 9999 : 999);
    exact = a + b;
    html = `${a} + ${b} ≈ ?`;
  } else {
    a = pick([12, 18, 23, 35, 47, 62, 78]);
    b = rand(150, 2000);
    exact = (a * b) / 100;
    html = tr('{0}% от {1} ≈ ?', a, b);
  }
  const answer = String(sig2(exact));
  const choices = [answer];
  for (const f of shuffle([0.5, 0.65, 1.45, 1.8, 2.5, 0.35, 3])) {
    const c = String(sig2(exact * f));
    if (!choices.includes(c) && Number(c) > 0) choices.push(c);
    if (choices.length === 4) break;
  }
  return { op: kind === 'pct' ? 'pct' : kind, text: html.replace(' ≈ ?', ''), html, answer, kind: 'int', choices };
}

/* ---------- Верно или нет ---------- */

function genTrueFalse(g) {
  let q = null;
  for (let i = 0; i < 25 && !q; i++) {
    const c = genProblem(g.settings, 'practice');
    if (/^-?\d+$/.test(c.answer) && /= \?\s*$/.test(c.html)) q = c;
  }
  if (!q) q = makeProblem('add', rand(10, 60), rand(10, 60));
  const ans = Number(q.answer);
  const right = rnd() < 0.5;
  let shown = ans;
  if (!right) {
    const deltas = Math.abs(ans) >= 100 ? [-10, 10, -1, 1, -20, 20, -100, 100] : [-1, 1, -2, 2, -10, 10, 3];
    while (shown === ans) shown = ans + pick(deltas);
  }
  return {
    op: q.op,
    text: `${q.text} = ${shown}`,
    html: `${q.html.replace(/= \?\s*$/, `= ${shown}`)}`,
    answer: right ? 'yes' : 'no',
    kind: 'yn',
  };
}

// Свайп по карточке: вправо — «верно», влево — «неверно»
function bindSwipe(el, onSwipe) {
  let x0 = null, y0 = 0;
  el.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointerup', e => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx > 0 ? 'yes' : 'no');
  });
}

/* ---------- На слух ---------- */

const SPOKEN = { add: 'плюс', sub: 'минус', mul: 'умножить на', div: 'разделить на' };

function spokenText(p) {
  const m = /^(-?\d+) (\S) (-?\d+)$/.exec(p.text);
  if (!m) return p.text;
  const op = Object.keys(SPOKEN).find(k => OPS[k].sym === m[2]);
  return op ? `${m[1]} ${tr(SPOKEN[op])} ${m[3]}` : p.text;
}

function sayProblem(g) {
  if (g?.problem?.speak) Native.speak(g.problem.speak, I18N.locale);
}

/* ---------- Свой набор примеров ---------- */

// Разбор выражения: числа, + − × ÷ и скобки. Без eval — только своя простая грамматика.
function evalExpr(src) {
  const s = src.replace(/[×xх*]/gi, '*').replace(/[÷:]/g, '/').replace(/[−–]/g, '-').replace(/,/g, '.').replace(/\s+/g, '');
  let i = 0;
  const num = () => {
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error('num');
    i += m[0].length;
    return Number(m[0]);
  };
  const atom = () => {
    if (s[i] === '(') { i++; const v = sum(); if (s[i++] !== ')') throw new Error(')'); return v; }
    if (s[i] === '-') { i++; return -atom(); }
    return num();
  };
  const prod = () => {
    let v = atom();
    while (s[i] === '*' || s[i] === '/') {
      const o = s[i++];
      const r = atom();
      if (o === '/' && r === 0) throw new Error('div0');
      v = o === '*' ? v * r : v / r;
    }
    return v;
  };
  function sum() {
    let v = prod();
    while (s[i] === '+' || s[i] === '-') v = s[i++] === '+' ? v + prod() : v - prod();
    return v;
  }
  const v = sum();
  if (i !== s.length) throw new Error('tail');
  return v;
}

function parseCustom(text) {
  const items = [];
  const bad = [];
  for (const raw of text.split(/[\n;]+/)) {
    const line = raw.split('=')[0].trim();
    if (!line) continue;
    try {
      const v = evalExpr(line);
      if (!Number.isInteger(v) || Math.abs(v) > 9999999) throw new Error('int');
      const pretty = line.replace(/\*/g, '×').replace(/\//g, '÷').replace(/\s*([+\-×÷])\s*/g, ' $1 ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();
      items.push({ text: pretty, answer: String(v) });
    } catch {
      bad.push(raw.trim());
    }
  }
  return { items: items.slice(0, 100), bad };
}

function renderCustom() {
  const set = data.customSet || [];
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="training">‹ ${tr('Тренировка')}</button>
    <h1 class="page-title">${tr('Свой набор')}</h1>
    <div class="card">
      <p class="muted" style="margin:0 0 10px">${tr('Каждый пример — с новой строки. Можно +, −, ×, ÷ и скобки. Ответ посчитается сам.')}</p>
      <textarea class="custom-area" id="customText" rows="9" spellcheck="false" placeholder="${escH('12 × 13\n144 ÷ 12\n(25 + 17) × 3')}">${escH(set.map(x => x.text).join('\n'))}</textarea>
      <p class="hint" id="customInfo">${set.length ? tr('Сохранено примеров: {0}', set.length) : tr('Пока пусто')}</p>
      <div class="row-buttons">
        <button class="btn" data-action="custom-save">${tr('{0} Сохранить', ico('save'))}</button>
        <button class="btn primary" data-action="custom-play">${tr('{0} Играть', ico('play'))}</button>
      </div>
    </div>
    <p class="hint">${tr('Удобно для учителя: введи примеры из урока, и ученик потренирует именно их.')}</p>`;
}
Hooks.view('custom', renderCustom);

function saveCustom() {
  const area = $('#customText');
  if (!area) return false;
  const { items, bad } = parseCustom(area.value);
  data.customSet = items;
  saveData();
  $('#customInfo').textContent = bad.length
    ? tr('Сохранено: {0}. Не понял строки: {1}', items.length, bad.slice(0, 3).join(' · '))
    : tr('Сохранено примеров: {0}', items.length);
  return items.length > 0;
}

/* ---------- Сами варианты ---------- */

const VARIANTS = {
  warmup: {
    base: 'sprint', name: tr('Разминка'), icon: 'sun', ownOps: true,
    desc: tr('60 секунд лёгких примеров, чтобы разогнаться'),
    setup(g) {
      const mine = g.settings.ops.filter(o => ARITH_OPS.includes(o));
      Object.assign(g.settings, { level: 'easy', ops: mine.length ? mine : ['add', 'sub', 'mul'], adaptive: false });
    },
  },
  chain: {
    base: 'practice', name: tr('Цепочка'), icon: 'link', ownOps: true,
    desc: tr('Ответ становится началом следующего примера. Одна ошибка — конец'),
    setup(g) { g.total = 25; g.settings.answerMode = 'input'; g.settings.adaptive = false; g.chainVal = null; },
    gen: g => genChain(g),
    onAnswer(g, ok, p) {
      if (!ok) return 'end';
      g.chainVal = Number(p.answer);
      return null;
    },
  },
  estimate: {
    base: 'survival', name: tr('Прикидка'), icon: 'eye', ownOps: true, choice: true,
    desc: tr('Выбери ближайший ответ, пока не вышло время'),
    setup(g) { g.limit = 6 * (1 + 0.05 * artLevel(data, 'a_hourglass')); g.settings.adaptive = false; },
    gen: g => genEstimate(g),
  },
  tf: {
    base: 'sprint', name: tr('Верно или нет'), icon: 'choice', choice: true,
    desc: tr('60 секунд: верно ли равенство? Можно свайпать'),
    setup(g) {
      const ops = g.settings.ops.filter(o => INT_OPS.includes(o));
      g.settings.ops = ops.length ? ops : ['add', 'sub', 'mul'];
    },
    gen: g => genTrueFalse(g),
    onProblem(g) {
      if (g.swipeBound) return;
      g.swipeBound = true;
      bindSwipe($('#gCard'), v => chooseAnswer(v));
    },
  },
  tower: {
    base: 'survival', name: tr('Башня'), icon: 'grid',
    desc: tr('Примеры падают сверху. Пять пропущенных — и башня рухнула'),
    setup(g) { g.maxLives = 5; g.lives = 5; g.limit = 9 * (1 + 0.05 * artLevel(data, 'a_hourglass')); },
    onProblem(g) {
      const card = $('#gCard');
      card.style.setProperty('--fall', `${g.limit}s`);
      card.classList.remove('tw-fall');
      void card.offsetWidth;
      card.classList.add('tw-fall');
    },
  },
  exam: {
    base: 'practice', name: tr('Экзамен'), icon: 'clipboard', ownOps: true,
    desc: tr('30 заданий как во входном тесте, 20 минут, оценка в конце'),
    setup(g) {
      Object.assign(g, { total: 30, timeLimit: 20 * 60, silent: true, noHints: true, noGolden: true });
      Object.assign(g.settings, { ops: [...TEST_OPS], opWeights: TEST_WEIGHTS, level: 'medium', adaptive: false, answerMode: 'input', shuffle: true });
    },
  },
  audio: {
    base: 'practice', name: tr('На слух'), icon: 'ear', ownOps: true,
    desc: tr('Пример звучит вслух — считай в уме'),
    setup(g) {
      const ops = g.settings.ops.filter(o => ARITH_OPS.includes(o));
      Object.assign(g.settings, { ops: ops.length ? ops : ['add', 'sub', 'mul'], answerMode: 'input', adaptive: false });
      g.total = 20;
    },
    gen(g) {
      const p = genProblem(g.settings, 'practice');
      p.speak = spokenText(p);
      p.shown = `<button class="say-again" data-action="say-again" aria-label="${tr('Повторить')}">${ico('ear')}<small>${tr('Нажми, чтобы повторить')}</small></button>`;
      return p;
    },
    onProblem: g => setTimeout(() => sayProblem(g), 150),
  },
  custom: {
    base: 'practice', name: tr('Свой набор'), icon: 'scroll', ownOps: true,
    desc: tr('Твои примеры: учитель или ты сам вводишь список'),
    canStart() {
      if (data.customSet?.length) return true;
      navigate('custom');
      return false;
    },
    setup(g) {
      g.queue = shuffle([...data.customSet]).slice(0, 50).map(x => ({
        op: /÷/.test(x.text) ? 'div' : /×/.test(x.text) ? 'mul' : /−|-/.test(x.text) ? 'sub' : 'add',
        text: x.text, html: `${x.text} = ?`, answer: x.answer, kind: 'int',
      }));
      g.total = g.queue.length;
      g.settings.answerMode = 'input';
    },
  },
  trick: {
    base: 'practice', name: tr('Приём'), icon: 'bulb', ownOps: true, hidden: true,
    desc: '',
    setup(g, opts) { g.trick = opts.trick; g.total = 10; g.settings.adaptive = false; g.settings.answerMode = 'input'; },
    gen: g => (TRICKS.find(t => t.id === g.trick) || TRICKS[0]).gen(),
  },
  tournament: {
    base: 'sprint', name: tr('Турнир недели'), icon: 'trophy', ownOps: true,
    desc: tr('Суббота и воскресенье: у всех одинаковые примеры'),
    canStart() {
      if (isWeekend()) return true;
      toast(tr('Турнир открыт в субботу и воскресенье'));
      return false;
    },
    setup(g) {
      const w = weekId();
      const seed = hashString(`tournament-${w}`);
      const sets = [['add', 'sub', 'mul', 'div'], ['mul', 'div', 'pow'], ['pct', 'frac', 'mul'], ['add', 'sub', 'neg', 'eq']];
      Object.assign(g.settings, { ops: sets[seed % sets.length], level: 'medium', adaptive: false, shuffle: true, answerMode: 'input' });
      Object.assign(g, { rng: seededRandom(seed), matchSeed: seed, noGolden: true, noHints: true, tournament: w });
    },
  },
  school: {
    base: 'practice', name: tr('Глава учебника'), icon: 'book', ownOps: true,
    desc: tr('20 заданий по темам одной главы'),
    setup(g, opts) {
      const ch = SCHOOL_CHAPTERS.find(c => c.id === opts.chapter) || SCHOOL_CHAPTERS[0];
      g.chapter = ch.id;
      g.total = 20;
      Object.assign(g.settings, { ops: [...ch.ops], level: opts.level || 'medium', adaptive: false, shuffle: true });
    },
  },
};

// Главы как в учебнике: от числовых областей к дробям
const SCHOOL_CHAPTERS = [
  { id: 'c11', num: '1.1', name: tr('Числовые области'), icon: 'sets', ops: ['sets', 'digit', 'cmp', 'round'] },
  { id: 'c12', num: '1.2', name: tr('Делитель и кратное'), icon: 'dvs', ops: ['dvs', 'lcm', 'rem', 'div'] },
  { id: 'c13', num: '1.3', name: tr('Действия с целыми числами'), icon: 'neg', ops: ['neg', 'order', 'add', 'sub', 'mul'] },
  { id: 'c14', num: '1.4', name: tr('Дроби'), icon: 'fred', ops: ['fred', 'fcmp', 'frac'] },
];

// В игре видно, какая глава идёт
Hooks.on('gameTop', g => {
  const ch = g.chapter && SCHOOL_CHAPTERS.find(c => c.id === g.chapter);
  return ch ? `<div class="ladder-flag"><b>${ch.num} ${escH(ch.name)}</b><span>${ch.ops.map(o => OPS[o].name).join(' · ')}</span></div>` : '';
});

const VARIANT_LIST = ['warmup', 'chain', 'estimate', 'tf', 'tower', 'exam', 'audio', 'custom', 'tournament'];

// Оценка за экзамен: процент верных → балл
function examGrade(pct) {
  if (pct >= 90) return { mark: 5, name: tr('Отлично'), color: 'var(--ok)' };
  if (pct >= 75) return { mark: 4, name: tr('Хорошо'), color: '#8fd16a' };
  if (pct >= 50) return { mark: 3, name: tr('Удовлетворительно'), color: 'var(--gold)' };
  return { mark: 2, name: tr('Нужно подтянуть'), color: 'var(--bad)' };
}

/* ---------- Блоки интерфейса ---------- */

function variantCards(list, compact = false) {
  return `<div class="mode-cards variant-cards ${compact ? 'compact' : ''}">
    ${list.map(id => {
      const v = VARIANTS[id];
      const locked = id === 'tournament' && !isWeekend();
      const best = id === 'tournament' ? data.tournament?.[weekId()] : null;
      return `
      <button class="mode-card v-${id} ${locked ? 'soft-locked' : ''}" data-action="quick" data-mode="${id}">
        <span class="ico">${ico(v.icon)}</span>
        <b>${v.name}</b>
        <span>${v.desc}</span>
        ${best != null ? `<span class="tag">${tr('Лучший: {0}', best)}</span>` : ''}
        ${locked ? `<span class="tag">${tr('Сб–Вс')}</span>` : ''}
      </button>`;
    }).join('')}
  </div>`;
}

Hooks.on('trainingModes', () => `
  <div class="section-title"><h2>${tr('Ещё режимы')}</h2><span>${tr('Новые способы тренироваться')}</span></div>
  ${variantCards(VARIANT_LIST)}`);

Hooks.on('dashModes', () => `
  <div class="section-title"><h2>${tr('Ещё режимы')}</h2><span>${tr('Разминка, цепочка, экзамен…')}</span></div>
  ${variantCards(['chain', 'estimate', 'tf', 'tower', 'exam', 'audio'], true)}`);

// Разминка — одной кнопкой с главной
Hooks.on('dashStack', () => `
  <button class="row-card warmup-row" data-action="quick" data-mode="warmup">
    <span class="icon-sq sm">${ico('sun')}</span>
    <span class="row-main"><b>${tr('Разминка на 60 секунд')}</b><small>${tr('Лёгкие примеры, чтобы включиться')}</small></span>
    <span class="chev">›</span>
  </button>
  ${isWeekend() ? `
  <button class="row-card tourney-row" data-action="quick" data-mode="tournament">
    <span class="icon-sq sm">${ico('trophy')}</span>
    <span class="row-main"><b>${tr('Турнир недели открыт')}</b><small>${data.tournament?.[weekId()] != null ? tr('Твой лучший результат: {0}. Поделись кодом с друзьями', data.tournament[weekId()]) : tr('Одинаковые примеры у всех — сравни результат с друзьями')}</small></span>
    <span class="chev">›</span>
  </button>` : ''}`);

// Свой диапазон чисел
Hooks.on('trainingFields', s => {
  const r = s.range || { on: false, min: 2, max: 20 };
  const basic = s.ops.some(o => ARITH_OPS.includes(o));
  if (!basic) return '';
  return `
    <div class="field toggle-row">
      <div>
        <label>${tr('Свой диапазон чисел')}</label>
        <span class="muted" style="font-size:13px">${r.on ? tr('Числа от {0} до {1} в + − × ÷', r.min, r.max) : tr('Числа зависят от сложности')}</span>
      </div>
      <button class="switch ${r.on ? 'on' : ''}" data-action="range-toggle" aria-label="${tr('Свой диапазон чисел')}"></button>
    </div>
    ${r.on ? `
    <div class="field range-fields">
      <label>${tr('от')} <input type="number" inputmode="numeric" min="0" max="9999" value="${r.min}" data-range="min"></label>
      <label>${tr('до')} <input type="number" inputmode="numeric" min="1" max="9999" value="${r.max}" data-range="max"></label>
    </div>` : ''}`;
});

document.addEventListener('change', e => {
  const k = e.target.dataset?.range;
  if (!k) return;
  const s = data.settings;
  s.range ||= { on: true, min: 2, max: 20 };
  const v = Math.max(0, Math.min(9999, Math.round(Number(e.target.value) || 0)));
  s.range[k] = v;
  if (s.range.min > s.range.max) [s.range.min, s.range.max] = [s.range.max, s.range.min];
  if (s.range.max - s.range.min < 1) s.range.max = s.range.min + 1;
  saveData();
  renderTraining();
});

/* ---------- Действия ---------- */

Hooks.on('action', (action, el) => {
  switch (action) {
    case 'say-again':
      sayProblem(game);
      return true;
    case 'range-toggle': {
      const s = data.settings;
      s.range = { ...(s.range || { min: 2, max: 20 }), on: !s.range?.on };
      saveData();
      renderTraining();
      return true;
    }
    case 'test-preset': {
      const s = data.settings;
      s.ops = [...TEST_OPS];
      s.opWeights = { ...TEST_WEIGHTS };
      if (s.mode === 'table' || s.mode === 'mistakes') s.mode = 'practice';
      if (s.level === 'easy') s.level = 'medium';
      saveData();
      navigate('training');
      toast(tr('Набор «Как во входном тесте» выбран: темы в тех же пропорциях'));
      return true;
    }
    case 'custom-save':
      saveCustom();
      return true;
    case 'custom-play':
      if (saveCustom()) startGame('custom');
      else toast(tr('Добавь хотя бы один пример'));
      return true;
    default:
      return false;
  }
});

/* ---------- Итоги вариантов ---------- */

Hooks.on('gameEnd', (g, session, completed, extra) => {
  if (g.variant === 'exam' && completed) {
    const n = g.correct + g.wrong;
    const pct = Math.round((g.correct / 30) * 100);
    const gr = examGrade(pct);
    (data.exams ||= []).push({ date: Date.now(), pct, answered: n });
    if (data.exams.length > 50) data.exams.shift();
    session.examPct = pct;
    extra.banners.push(`
      <div class="banner exam-banner" style="--gc:${gr.color}">
        <span class="exam-mark">${gr.mark}</span>
        <span><b>${gr.name}</b> · ${tr('{0} из 30 верно ({1}%)', g.correct, pct)}${n < 30 ? ` · ${tr('не успел: {0}', 30 - n)}` : ''}</span>
      </div>`);
  }
  if (g.variant === 'chain') {
    extra.banners.push(`<div class="banner blue">${ico('link')}<span>${g.wrong ? tr('Цепочка оборвалась на звене {0}', g.correct + 1) : tr('Цепочка пройдена целиком: {0} звеньев!', g.correct)}</span></div>`);
  }
  if (g.tournament && completed) {
    const t = (data.tournament ||= {});
    const prev = t[g.tournament];
    if (prev == null || g.correct > prev) t[g.tournament] = g.correct;
    const code = resultCode(g.matchSeed, g.correct);
    data.lastMatch = { seed: g.matchSeed, score: g.correct, mode: 'sprint', code };
    extra.banners.push(`<div class="banner gold">${ico('trophy')}<span>${tr('Турнир недели: {0}', g.correct)}${prev != null ? ` · ${tr('лучший: {0}', Math.max(prev, g.correct))}` : ''} · ${tr('код результата')} <b>${code}</b></span></div>`);
  }
});
