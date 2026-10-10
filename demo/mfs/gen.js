'use strict';

/* =========================================================
   Темы, режимы и генератор примеров.
   Вынесено из app.js: этот файл не зависит от интерфейса,
   поэтому его же проверяют автотесты перед сборкой.
   ========================================================= */

const OPS = {
  add: { sym: '+', name: tr('Сложение') },
  sub: { sym: '−', name: tr('Вычитание') },
  mul: { sym: '×', name: tr('Умножение') },
  div: { sym: '÷', name: tr('Деление') },
  pow: { sym: 'x²', name: tr('Степени') },
  pct: { sym: '%', name: tr('Проценты') },
  frac: { sym: '½', name: tr('Дроби') },
};

// Новые типы задач из features.js
Object.assign(OPS, NEW_OPS);

const LEVELS = {
  easy:   { name: tr('Лёгкий'),  mult: 1 },
  medium: { name: tr('Средний'), mult: 2 },
  hard:   { name: tr('Сложный'), mult: 3 },
};

const MODES = {
  sprint:   { name: tr('Спринт'),             icon: 'bolt', desc: tr('Максимум верных ответов за 60 секунд') },
  blitz:    { name: tr('Блиц 20'),            icon: 'stopwatch', desc: tr('20 примеров на время. Ошибка = +5 секунд') },
  survival: { name: tr('Выживание'),          icon: 'heart', desc: tr('3 жизни, а времени на ответ всё меньше') },
  table:    { name: tr('Таблица умножения'),  icon: 'grid', desc: tr('30 примеров на выбранные числа') },
  practice: { name: tr('Практика'),           icon: 'target', desc: tr('Без таймера, в своём темпе') },
  mistakes: { name: tr('Работа над ошибками'), icon: 'bandage', desc: tr('Примеры, в которых ты ошибался') },
  duel: { name: tr('Дуэль'), icon: 'shield', desc: tr('Двое на одном телефоне: экран пополам') },
  ladder: { name: tr('Лестница'), icon: 'mountain', desc: tr('Уровни от 0 до 9999: 5 примеров без права на ошибку') },
};

const SPRINT_SECONDS = 60;
const BLITZ_COUNT = 20;
const BLITZ_PENALTY = 5;
const TABLE_COUNT = 30;
const SURVIVAL_LIVES = 3;
const SURVIVAL_START_LIMIT = 10;
const SURVIVAL_MIN_LIMIT = 2.5;

const RANGES = {
  easy:   { add: [[1, 20], [1, 20]],     mul: [[2, 10], [2, 10]], div: [[2, 10], [1, 10]] },
  medium: { add: [[10, 99], [10, 99]],   mul: [[3, 12], [3, 20]], div: [[2, 12], [2, 15]] },
  hard:   { add: [[100, 999], [10, 999]], mul: [[12, 99], [3, 15]], div: [[3, 20], [5, 50]] },
};

const rand = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = arr => arr[Math.floor(rnd() * arr.length)];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

function fracStr(n, d) {
  const g = gcd(n, d);
  n /= g;
  d /= g;
  return d === 1 ? String(n) : `${n}/${d}`;
}

const fracHtml = (n, d) => `<span class="frac"><span>${n}</span><span>${d}</span></span>`;

/* =========================================================
   Генератор примеров
   ========================================================= */

// Задача: { op, text — простой текст, html — отображение, answer — строка, kind: 'int' | 'frac' }
function makeProblem(op, a, b) {
  const answer = op === 'add' ? a + b : op === 'sub' ? a - b : op === 'mul' ? a * b : a / b;
  const text = `${a} ${OPS[op].sym} ${b}`;
  return { op, text, html: `${text} = ?`, answer: String(answer), kind: 'int' };
}

function genPow(level) {
  const r = rnd();
  const power = (a, n) => ({ op: 'pow', text: `${a}^${n}`, html: `${a}<sup>${n}</sup> = ?`, answer: String(a ** n), kind: 'int' });
  const root = a => ({ op: 'pow', text: `√${a * a}`, html: `√${a * a} = ?`, answer: String(a), kind: 'int' });

  if (level === 'easy') {
    if (r < 0.65) return power(rand(2, 12), 2);
    if (r < 0.85) return power(rand(2, 5), 3);
    return root(rand(2, 10));
  }
  if (level === 'medium') {
    if (r < 0.4) return power(rand(11, 20), 2);
    if (r < 0.6) return power(rand(2, 7), 3);
    if (r < 0.8) return power(2, rand(4, 10));
    return root(rand(4, 15));
  }
  if (r < 0.3) return power(rand(15, 35), 2);
  if (r < 0.5) return power(rand(5, 10), 3);
  if (r < 0.7) return rnd() < 0.5 ? power(2, rand(8, 14)) : power(3, rand(3, 7));
  return root(rand(12, 30));
}

function genPct(level) {
  const sets = {
    easy: [10, 20, 25, 50, 100],
    medium: [5, 10, 15, 20, 25, 30, 40, 50, 60, 75],
    hard: [5, 12, 15, 35, 45, 60, 75, 80, 120, 150],
  };
  const maxBase = { easy: 200, medium: 500, hard: 1000 }[level];
  const pickBase = p => {
    const step = 100 / gcd(p, 100);
    return step * rand(Math.max(1, Math.ceil(10 / step)), Math.floor(maxBase / step));
  };

  const reverseChance = { easy: 0, medium: 0.2, hard: 0.4 }[level];
  if (rnd() < reverseChance) {
    const p = pick(sets[level].filter(x => x < 100));
    const base = pickBase(p);
    const part = (base * p) / 100;
    return { op: 'pct', text: `${tr('{0} от {1} в %', part, base)}`, html: `${tr('{0} от {1} = ?%', part, base)}`, answer: String(p), kind: 'int' };
  }

  const p = pick(sets[level]);
  const base = pickBase(p);
  return { op: 'pct', text: `${tr('{0}% от {1}', p, base)}`, html: `${tr('{0}% от {1} = ?', p, base)}`, answer: String((base * p) / 100), kind: 'int', steps: [tr('{0}% — это {0}/100 числа.', p), `${base} × ${p} ÷ 100 = ${(base * p) / 100}`] };
}

function genFrac(level, intOnly) {
  const maxDen = { easy: 5, medium: 9, hard: 12 }[level];

  // Дробь от числа — ответ целый. При ответе цифрами других дробей не бывает
  if (intOnly || rnd() < 0.3) {
    const d = rand(2, maxDen);
    let n = rand(1, d - 1);
    while (gcd(n, d) !== 1) n = rand(1, d - 1);
    const base = d * rand(2, { easy: 10, medium: 15, hard: 25 }[level]);
    return { op: 'frac', text: `${tr('{0}/{1} от {2}', n, d, base)}`, html: `${tr('{0} от {1} = ?', fracHtml(n, d), base)}`, answer: String((base * n) / d), kind: 'int' };
  }

  let n1, d1, n2, d2, sign;
  if (level === 'easy') {
    d1 = d2 = rand(3, 10);
    n1 = rand(1, d1 - 1);
    n2 = rand(1, d1 - 1);
    sign = pick(['+', '−']);
  } else if (level === 'medium') {
    d1 = rand(2, 6); d2 = rand(2, 6);
    n1 = rand(1, d1 - 1); n2 = rand(1, d2 - 1);
    sign = pick(['+', '−']);
  } else {
    d1 = rand(2, 9); d2 = rand(2, 9);
    n1 = rand(1, d1); n2 = rand(1, d2);
    sign = pick(['+', '−', '×', '÷']);
  }

  if (sign === '−') {
    if (n1 * d2 === n2 * d1) sign = '+';
    else if (n1 * d2 < n2 * d1) [n1, d1, n2, d2] = [n2, d2, n1, d1];
  }

  let n, d;
  switch (sign) {
    case '+': n = n1 * d2 + n2 * d1; d = d1 * d2; break;
    case '−': n = n1 * d2 - n2 * d1; d = d1 * d2; break;
    case '×': n = n1 * n2; d = d1 * d2; break;
    case '÷': n = n1 * d2; d = d1 * n2; break;
  }

  return {
    op: 'frac',
    text: `${n1}/${d1} ${sign} ${n2}/${d2}`,
    html: `${fracHtml(n1, d1)} ${sign} ${fracHtml(n2, d2)} = ?`,
    answer: fracStr(n, d),
    kind: 'frac',
  };
}

// Ответ в этих примерах — не число: их нельзя набрать на клавиатуре
const CHOICE_KINDS = ['frac', 'cmp', 'yn', 'expr', 'set'];
// Темы, где так всегда
const CHOICE_ONLY_OPS = ['cmp', 'alg', 'sets', 'fcmp'];

// 4 варианта ответа: правильный + правдоподобные ошибки
function makeChoices(p) {
  if (p.kind === 'cmp') return ['<', '=', '>'];
  if (p.kind === 'yn') return ['yes', 'no'];
  if (p.choices) return shuffle([...p.choices]);
  const seen = new Set([p.answer]);
  const wrong = [];
  const add = s => {
    if (wrong.length < 3 && !seen.has(s)) {
      seen.add(s);
      wrong.push(s);
    }
  };

  if (p.kind === 'frac') {
    const [n, d = 1] = p.answer.split('/').map(Number);
    const cands = [[n + 1, d], [n - 1, d], [n, d + 1], [n, d - 1], [n + 1, d + 1], [d, n], [n * 2, d], [n, d * 2], [n + d, d]];
    shuffle(cands).forEach(([a, b]) => { if (a > 0 && b > 0) add(fracStr(a, b)); });
    for (let k = 2; wrong.length < 3; k++) add(fracStr(n + k, d));
  } else {
    const ans = Number(p.answer);
    const mag = Math.abs(ans);
    const deltas = mag >= 100 ? [10, 1, 2, 20, 100] : mag >= 20 ? [1, 2, 10, 3, 5] : [1, 2, 3, 4];
    const cands = deltas.flatMap(x => [ans + x, ans - x]);
    const allowNegative = ans < 0;
    shuffle(cands).forEach(v => { if (v >= 0 || allowNegative) add(String(v)); });
    for (let k = 5; wrong.length < 3; k++) add(String(ans + k));
  }

  return shuffle([p.answer, ...wrong]);
}

// Тема примера: по весам (набор «как на тесте») или поровну
function pickOp(settings) {
  const w = settings.opWeights;
  if (!w) return pick(settings.ops);
  const ops = settings.ops.filter(o => w[o] > 0);
  if (!ops.length) return pick(settings.ops);
  let r = rnd() * ops.reduce((a, o) => a + w[o], 0);
  for (const o of ops) if ((r -= w[o]) < 0) return o;
  return ops[ops.length - 1];
}

function genProblem(settings, mode, forcedOp) {
  if (mode === 'table') {
    const n = pick(settings.tableNums);
    const k = rand(2, 10);
    if (settings.tableDiv && rnd() < 0.4) return makeProblem('div', n * k, n);
    return rnd() < 0.5 ? makeProblem('mul', n, k) : makeProblem('mul', k, n);
  }

  let op = forcedOp || pickOp(settings);
  // Ответ вводят цифрами — значит тем, где ответ не число, в этой игре нет
  if (settings.intOnly && CHOICE_ONLY_OPS.includes(op)) {
    const rest = (settings.ops || []).filter(o => !CHOICE_ONLY_OPS.includes(o));
    if (rest.length) op = pickOp({ ...settings, ops: rest });
  }
  if (op === 'pow') return genPow(settings.level);
  if (op === 'pct') return genPct(settings.level);
  if (op === 'frac') return genFrac(settings.level, settings.intOnly);
  if (NEW_GENERATORS[op]) return NEW_GENERATORS[op](settings.level, settings.intOnly);

  // Свой диапазон чисел для четырёх действий
  const cr = settings.range?.on ? settings.range : null;
  const r = cr
    ? { add: [[cr.min, cr.max], [cr.min, cr.max]], mul: [[cr.min, cr.max], [cr.min, cr.max]], div: [[Math.max(2, cr.min), Math.max(2, cr.max)], [Math.max(1, cr.min), Math.max(2, cr.max)]] }
    : RANGES[settings.level];
  let a, b;
  switch (op) {
    case 'add':
      a = rand(...r.add[0]); b = rand(...r.add[1]);
      if (rnd() < 0.5) [a, b] = [b, a];
      break;
    case 'sub':
      a = rand(...r.add[0]); b = rand(...r.add[1]);
      if (a < b) [a, b] = [b, a];
      break;
    case 'mul':
      a = rand(...r.mul[0]); b = rand(...r.mul[1]);
      if (rnd() < 0.5) [a, b] = [b, a];
      break;
    case 'div': {
      const divisor = rand(...r.div[0]);
      const quotient = rand(...r.div[1]);
      a = divisor * quotient; b = divisor;
      break;
    }
  }
  return makeProblem(op, a, b);
}
