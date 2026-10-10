'use strict';

/* =========================================================
   Дополнительные возможности Math for Speed:
   новые типы задач, умная сложность, повторение по расписанию,
   испытания, задание дня, профили, коды матчей и заданий, отчёты.
   ========================================================= */

/* ---------- Случайные числа с зерном (для одинаковых задач у двоих) ---------- */

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hashString = str => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// Подменяет генератор случайных чисел на предсказуемый и возвращает всё обратно
let randomSource = Math.random;
const rnd = () => randomSource();
function withSeed(seed, fn) {
  const prev = randomSource;
  randomSource = seededRandom(seed);
  try { return fn(); } finally { randomSource = prev; }
}

/* =========================================================
   Новые типы задач
   ========================================================= */

const CURRENCY_SYM = () => ({ ru: '₽', uk: '₴', cs: 'Kč', en: '£', pl: 'zł', de: '€' })[I18N.lang] || 'Kč';
const NEW_OPS = {
  order: { sym: '( )', name: tr('Порядок действий') },
  cmp: { sym: '<>', name: tr('Сравнение') },
  round: { sym: '≈', name: tr('Округление') },
  neg: { sym: '±', name: tr('Отрицательные') },
  rem: { sym: tr('ост'), name: tr('Остаток') },
  eq: { sym: 'x=', name: tr('Уравнения') },
  time: { sym: tr('ч:м'), name: tr('Время') },
  money: { sym: CURRENCY_SYM(), name: tr('Деньги') },
  dvs: { sym: '⋮', name: tr('Делимость') },
  expo: { sym: 'aⁿ', name: tr('Правила степеней') },
  alg: { sym: '(a+b)²', name: tr('Алгебра') },
  word: { sym: '?', name: tr('Задачи') },
  geo: { sym: '△', name: tr('Геометрия') },
  units: { sym: 'km', name: tr('Единицы') },
  stat: { sym: '⌀', name: tr('Среднее') },
  ratio: { sym: 'a:b', name: tr('Отношения') },
  solid: { sym: 'V', name: tr('Объём') },
  // Темы из учебника
  sets: { sym: '∈', name: tr('Числовые области') },
  digit: { sym: '123', name: tr('Цифры и разряды') },
  lcm: { sym: tr('НОД'), name: tr('НОД и НОК') },
  fred: { sym: '²⁄₄', name: tr('Сокращение дробей') },
  fcmp: { sym: '½<⅔', name: tr('Сравнение дробей') },
};

const problem = (op, text, html, answer, kind = 'int') => ({ op, text, html, answer: String(answer), kind });
// Пошаговое решение: показывается после ошибки и в разборе
const withSteps = (p, ...steps) => { p.steps = steps.filter(Boolean); return p; };

// Валюта в задачах — по языку приложения
const money = str => {
  const c = CURRENCY_SYM();
  if (c === 'Kč') return str;
  return c === '£' ? str.replace(/(\d[\d\s]*?)\s?Kč/g, '£$1') : str.replace(/Kč/g, c);
};

// Порядок действий и скобки
function genOrder(level) {
  const r = (a, b) => rand(a, b);
  const forms = {
    easy: [
      () => { const a = r(2, 9), b = r(2, 9), c = r(2, 9); return [`${a} + ${b} × ${c}`, a + b * c]; },
      () => { const a = r(2, 9), b = r(2, 9), c = r(1, 20); return [`${a} × ${b} − ${c}`, a * b - c]; },
    ],
    medium: [
      () => { const a = r(2, 12), b = r(2, 9), c = r(2, 9); return [`(${a} + ${b}) × ${c}`, (a + b) * c]; },
      () => { const a = r(2, 12), b = r(2, 9), c = r(2, 9), d = r(1, 20); return [`${a} + ${b} × ${c} − ${d}`, a + b * c - d]; },
      () => { const b = r(2, 9), q = r(2, 9), c = r(2, 15); return [`${b * q} ÷ ${b} + ${c}`, q + c]; },
    ],
    hard: [
      () => { const a = r(3, 12), b = r(3, 9), c = r(2, 9), d = r(2, 9); return [`${a} × ${b} − ${c} × ${d}`, a * b - c * d]; },
      () => { const a = r(5, 20), b = r(2, 12), c = r(2, 9), d = r(2, 30); return [`(${a} + ${b}) × ${c} − ${d}`, (a + b) * c - d]; },
      () => { const b = r(3, 12), q = r(3, 12), c = r(2, 12), d = r(2, 9); return [`${b * q} ÷ ${b} + ${c} × ${d}`, q + c * d]; },
    ],
  }[level];
  const [text, answer] = pick(forms)();
  return problem('order', text, `${text} = ?`, answer);
}

// Сравнение: ответ выбирается из <, =, >
function genCmp(level) {
  const side = () => {
    if (level === 'easy') {
      const kind = rnd();
      if (kind < 0.4) { const a = rand(2, 10), b = rand(2, 10); return [`${a} × ${b}`, a * b]; }
      if (kind < 0.7) { const a = rand(10, 60), b = rand(2, 30); return [`${a} + ${b}`, a + b]; }
      const a = rand(10, 90); return [`${a}`, a];
    }
    if (level === 'medium') {
      const kind = rnd();
      if (kind < 0.35) { const a = rand(3, 12), b = rand(3, 15); return [`${a} × ${b}`, a * b]; }
      if (kind < 0.6) { const b = rand(2, 12), q = rand(2, 12); return [`${b * q} ÷ ${b}`, q]; }
      if (kind < 0.8) { const a = rand(20, 99), b = rand(10, 60); return [`${a} − ${b}`, a - b]; }
      const a = rand(10, 150); return [`${a}`, a];
    }
    const kind = rnd();
    if (kind < 0.3) { const a = rand(11, 30), b = rand(4, 15); return [`${a} × ${b}`, a * b]; }
    if (kind < 0.55) { const a = rand(2, 12); return [`${a}²`, a * a]; }
    if (kind < 0.75) { const p = pick([10, 20, 25, 50]), base = rand(2, 20) * 20; return [`${tr('{0}% от {1}', p, base)}`, (base * p) / 100]; }
    const a = rand(50, 400); return [`${a}`, a];
  };

  let [t1, v1] = side();
  let [t2, v2] = side();
  // Иногда специально делаем равенство, иначе оно почти не встречается
  if (rnd() < 0.15) { t2 = `${v1}`; v2 = v1; }
  const answer = v1 < v2 ? '<' : v1 > v2 ? '>' : '=';
  return problem('cmp', `${t1} ? ${t2}`, `${t1} <span class="cmp-gap">?</span> ${t2}`, answer, 'cmp');
}

// Округление
function genRound(level) {
  const opts = {
    easy: [[10, tr('десятков'), [12, 99]]],
    medium: [[10, tr('десятков'), [101, 999]], [100, tr('сотен'), [120, 999]]],
    hard: [[100, tr('сотен'), [1050, 9999]], [1000, tr('тысяч'), [1100, 9999]], [10, tr('десятков'), [1001, 9999]]],
  }[level];
  const [step, word, range] = pick(opts);
  let n = rand(range[0], range[1]);
  if (n % step === 0) n += rand(1, step - 1);
  const answer = Math.round(n / step) * step;
  return problem('round', `${tr('{0} до {1}', n, word)}`, `${tr('Округли')} <b>${n}</b> ${tr('до {0} = ?', word)}`, answer);
}

// Отрицательные числа
function genNeg(level) {
  const r = (a, b) => rand(a, b);
  const forms = {
    easy: [
      () => { const a = r(2, 20), b = r(1, 30); return [`−${a} + ${b}`, b - a]; },
      () => { const a = r(1, 15), b = r(a + 1, 30); return [`${a} − ${b}`, a - b]; },
    ],
    medium: [
      () => { const a = r(5, 40), b = r(5, 40); return [`−${a} − ${b}`, -a - b]; },
      () => { const a = r(5, 40), b = r(5, 40); return [`${a} − (−${b})`, a + b]; },
      () => { const a = r(10, 60), b = r(10, 90); return [`−${a} + ${b}`, b - a]; },
    ],
    hard: [
      () => { const a = r(2, 12), b = r(2, 12); return [`−${a} × ${b}`, -a * b]; },
      () => { const a = r(2, 12), b = r(2, 12); return [`−${a} × (−${b})`, a * b]; },
      () => { const a = r(10, 50), b = r(10, 50), c = r(10, 50); return [`−${a} + ${b} − ${c}`, -a + b - c]; },
      () => { const b = r(2, 12), q = r(2, 12); return [`−${b * q} ÷ ${b}`, -q]; },
    ],
  }[level];
  const [text, answer] = pick(forms)();
  return problem('neg', text, `${text} = ?`, answer);
}

// Деление с остатком
function genRem(level) {
  const [dRange, maxQ] = { easy: [[2, 9], 9], medium: [[2, 12], 12], hard: [[3, 20], 25] }[level];
  const d = rand(...dRange);
  const q = rand(2, maxQ);
  const rest = rand(1, d - 1);
  const n = d * q + rest;
  return problem('rem', `${tr('{0} ÷ {1} ост', n, d)}`, `${tr('{0} ÷ {1} = {2} и ещё ? в остатке', n, d, q)}`, rest);
}

// Простые уравнения
function genEq(level) {
  if (level !== 'easy' && rnd() < (level === 'hard' ? 0.45 : 0.2)) {
    const p = genEqBrackets();
    if (p) return p;
  }
  const r = (a, b) => rand(a, b);
  const forms = {
    easy: [
      () => { const x = r(2, 20), a = r(2, 20); return [`x + ${a} = ${x + a}`, x]; },
      () => { const x = r(2, 20), a = r(2, 20); return [`x − ${a} = ${x - a}`, x]; },
    ],
    medium: [
      () => { const x = r(2, 12), a = r(2, 12); return [`${a} · x = ${a * x}`, x]; },
      () => { const x = r(2, 40), a = r(x + 1, 90); return [`${a} − x = ${a - x}`, x]; },
      () => { const x = r(2, 30), a = r(10, 60); return [`x + ${a} = ${x + a}`, x]; },
    ],
    hard: [
      () => { const x = r(2, 15), a = r(2, 12), b = r(2, 40); return [`${a} · x + ${b} = ${a * x + b}`, x]; },
      () => { const x = r(2, 15), a = r(2, 12), b = r(2, 20); return [`(x + ${a}) · ${b} = ${(x + a) * b}`, x]; },
      () => { const x = r(2, 20), a = r(2, 12); return [`x ÷ ${a} = ${x}`, x * a]; },
    ],
  }[level];
  const [text, answer] = pick(forms)();
  return withSteps(problem('eq', text, `${text.replace(/x/g, '<i>x</i>')}, &nbsp;<i>x</i> = ?`, answer),
    tr('Оставь x с одной стороны: переноси числа с обратным знаком.'),
    tr('Проверка: подставь x = {0} в уравнение — обе части равны.', answer));
}

// Время
const hhmm = m => `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, '0')}`;

function genTime(level) {
  const kind = rnd();
  if (level === 'easy' || kind < 0.45) {
    const start = rand(6, 21) * 60 + rand(0, 11) * 5;
    const span = level === 'easy' ? rand(1, 11) * 5 : rand(1, 30) * 5;
    return problem('time', `${tr('с {0} до {1}', hhmm(start), hhmm(start + span))}`, `${tr('С {0} до', hhmm(start))} <b>${hhmm(start + span)}</b> ${tr('= ? мин')}`, span);
  }
  if (kind < 0.75) {
    const h = rand(1, level === 'hard' ? 9 : 4);
    const m = rand(1, 11) * 5;
    return problem('time', `${tr('{0} ч {1} мин в минутах', h, m)}`, `${tr('{0} ч {1} мин = ? мин', h, m)}`, h * 60 + m);
  }
  const total = rand(13, level === 'hard' ? 60 : 30) * 10;
  return problem('time', `${tr('{0} мин в часах', total)}`, `${tr('{0} мин = ? ч {1} мин', total, total % 60)}`, Math.floor(total / 60));
}

// Деньги
function genMoney(level) {
  const kind = rnd();
  if (level === 'easy' || kind < 0.4) {
    const price = level === 'easy' ? rand(11, 95) : rand(101, 480);
    const paid = level === 'easy' ? 100 : pick([500, 1000]);
    return withSteps(problem('money', money(`${tr('сдача с {0} за {1}', paid, price)}`), money(`${tr('Покупка {0} Kč, дал {1} Kč. Сдача = ?', price, paid)}`), paid - price), `${paid} − ${price} = ${paid - price}`);
  }
  if (kind < 0.7) {
    const a = rand(12, 90), b = rand(12, 90), n = rand(2, 4);
    return withSteps(problem('money', `${a} + ${b} × ${n}`, money(`${tr('{0} Kč и {1} шт. по {2} Kč. Всего = ?', a, n, b)}`), a + b * n), `${b} × ${n} = ${b * n}`, `${a} + ${b * n} = ${a + b * n}`);
  }
  const p = pick([10, 20, 25, 50]);
  const price = rand(2, 20) * 20;
  return withSteps(problem('money', `${tr('скидка {0}% на {1}', p, price)}`, money(`${tr('Цена {0} Kč, скидка {1}%. Платим = ?', price, p)}`), price - (price * p) / 100), `${p}% · ${price} = ${(price * p) / 100}`, `${price} − ${(price * p) / 100} = ${price - (price * p) / 100}`);
}

// Признаки делимости: правило для каждого делителя и пример к нему
const DIV_RULES = [
  { d: 2, title: tr('Последняя цифра чётная'), rule: tr('Число оканчивается на 0, 2, 4, 6 или 8.'), ex: tr('568, 472, 54, 60') },
  { d: 3, title: tr('Сумма цифр делится на 3'), rule: tr('Сложи все цифры числа: если сумма делится на 3, делится и число.'), ex: '273 → 2 + 7 + 3 = 12 → 12 : 3 = 4' },
  { d: 4, title: tr('Последние две цифры делятся на 4'), rule: tr('Смотри только на число из двух последних цифр.'), ex: '5 764 → 64 : 4 = 16' },
  { d: 5, title: tr('Оканчивается на 0 или 5'), rule: tr('Последняя цифра — 0 или 5.'), ex: tr('565, 470, 55, 60') },
  { d: 6, title: tr('Делится и на 2, и на 3'), rule: tr('Число чётное, и сумма его цифр делится на 3.'), ex: '168 → 8 ✓ · 1 + 6 + 8 = 15 ✓' },
  { d: 7, title: tr('Простого признака нет'), rule: tr('Проверяй делением: число должно разделиться на 7 без остатка.'), ex: '861 : 7 = 123' },
  { d: 8, title: tr('Последние три цифры делятся на 8'), rule: tr('Смотри только на число из трёх последних цифр.'), ex: '5 864 → 864 : 8 = 108' },
  { d: 9, title: tr('Сумма цифр делится на 9'), rule: tr('Сложи все цифры числа: если сумма делится на 9, делится и число.'), ex: '207 → 2 + 0 + 7 = 9 → 9 : 9 = 1' },
  { d: 10, title: tr('Оканчивается на 0'), rule: tr('Последняя цифра — 0.'), ex: tr('560, 470, 50, 2 760') },
];
const DIV_PRIME = { title: tr('Простое число'), rule: tr('Делится только на 1 и на само себя.'), ex: tr('Простые до 20: 2, 3, 5, 7, 11, 13, 17, 19') };

const divRule = d => DIV_RULES.find(r => r.d === d);
const isPrime = n => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
const fmtNum = n => (n >= 10000 ? n.toLocaleString(I18N.locale) : String(n));

// Делимость: «делится ли?», «простое ли?» и «наименьший делитель»
function genDvs(level, intOnly) {
  const cfg = {
    easy: { divs: [2, 5, 10, 3], range: [12, 999], prime: 40, smallest: 0 },
    medium: { divs: [2, 3, 4, 5, 6, 9, 10], range: [100, 9999], prime: 100, smallest: 0.2 },
    hard: { divs: [3, 4, 6, 7, 8, 9], range: [1000, 99999], prime: 200, smallest: 0.25 },
  }[level];

  // Ответ вводят цифрами: «да/нет» не подходит — спрашиваем делитель, НОД или число делителей
  if (intOnly) {
    if (rnd() < 0.3) {
      const n = rand(12, level === 'easy' ? 60 : level === 'medium' ? 120 : 300);
      let cnt = 0;
      for (let i = 1; i <= n; i++) if (n % i === 0) cnt++;
      const q = tr('Сколько делителей у числа {0}?', n);
      return withSteps(problem('dvs', q, q, cnt), tr('Считаем и единицу, и само число.'));
    }
    if (rnd() < 0.5) {
      let n;
      do { n = rand(21, cfg.prime * 2); } while (isPrime(n) || n % 2 === 0 || n % 5 === 0);
      let d = 3;
      while (n % d) d += 2;
      return problem('dvs', tr('наименьший делитель {0}', n), tr('Наименьший делитель числа <b>{0}</b>, кроме 1 = ?', n), d);
    }
    const k = rand(2, level === 'easy' ? 8 : 12);
    const a = k * rand(2, level === 'hard' ? 12 : 9);
    const b = k * rand(2, level === 'hard' ? 12 : 9);
    return problem('dvs', `${tr('НОД')}(${a}, ${b})`, `${tr('НОД')}(${a}, ${b}) = ?`, gcd(a, b));
  }

  const r = rnd();
  if (r < 0.2) {
    // Простое ли число? Примерно поровну простых и составных
    let n = rand(2, cfg.prime);
    const wantPrime = rnd() < 0.5;
    for (let i = 0; i < 200 && isPrime(n) !== wantPrime; i++) n = rand(2, cfg.prime);
    const p = problem('dvs', tr('{0} простое?', n), tr('Простое ли число <b>{0}</b>?', n), isPrime(n) ? 'yes' : 'no', 'yn');
    p.rule = 'prime';
    return p;
  }
  if (r < 0.2 + cfg.smallest) {
    // Наименьший делитель больше 1 у составного числа
    let n;
    do { n = rand(21, cfg.prime * 2); } while (isPrime(n) || n % 2 === 0 || n % 5 === 0);
    let d = 3;
    while (n % d) d += 2;
    return problem('dvs', tr('наименьший делитель {0}', n), tr('Наименьший делитель числа <b>{0}</b>, кроме 1 = ?', n), d);
  }

  const d = pick(cfg.divs);
  const yes = rnd() < 0.5;
  let n = rand(Math.ceil(cfg.range[0] / d), Math.floor(cfg.range[1] / d)) * d;
  if (!yes) {
    n += rand(1, d - 1);
    // «Ловушки»: для 4 и 8 последняя цифра чётная, для 3 и 9 — число рядом с кратным
    if ((d === 4 || d === 8) && n % 2) n += 1;
    if (n % d === 0) n += 1;
  }
  const p = problem('dvs', tr('{0} делится на {1}?', n, d), tr('Делится ли <b>{0}</b> на {1}?', fmtNum(n), d), n % d === 0 ? 'yes' : 'no', 'yn');
  p.rule = d;
  return p;
}

/* ---------- Задачи как во входном тесте (8–9 класс) ---------- */

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const supText = n => String(n).split('').map(c => SUP[c]).join('');

// Правила степеней: ответ — показатель
function genExpo(level) {
  const v = pick(['a', 'b', 'x', 'y', '2', '3']);
  const pw = (base, n) => `${base}<sup>${n}</sup>`;
  const r = rnd();
  let text, html, answer;
  if (level === 'easy' || (level === 'medium' && r < 0.3)) {
    const m = rand(2, 9), n = rand(2, 9);
    if (rnd() < 0.5) {
      text = `${v}${supText(m)} · ${v}${supText(n)}`;
      html = `${pw(v, m)} · ${pw(v, n)} = ${pw(v, '?')}`;
      answer = m + n;
    } else {
      const big = m + n;
      text = `${v}${supText(big)} : ${v}${supText(n)}`;
      html = `${pw(v, big)} : ${pw(v, n)} = ${pw(v, '?')}`;
      answer = m;
    }
  } else if (level === 'medium') {
    const m = rand(2, 6), n = rand(2, 5);
    if (rnd() < 0.5) {
      text = `(${v}${supText(m)})${supText(n)}`;
      html = `(${pw(v, m)})<sup>${n}</sup> = ${pw(v, '?')}`;
      answer = m * n;
    } else {
      const k = rand(2, 6);
      text = `${v}${supText(m)} · ${v}${supText(n)} · ${v}${supText(k)}`;
      html = `${pw(v, m)} · ${pw(v, n)} · ${pw(v, k)} = ${pw(v, '?')}`;
      answer = m + n + k;
    }
  } else {
    const m = rand(2, 6), n = rand(2, 5), k = rand(2, 9);
    if (rnd() < 0.5) {
      // Как в тесте: (b⁵)³ · b² = b¹⁷
      text = `(${v}${supText(m)})${supText(n)} · ${v}${supText(k)}`;
      html = `(${pw(v, m)})<sup>${n}</sup> · ${pw(v, k)} = ${pw(v, '?')}`;
      answer = m * n + k;
    } else {
      const kk = rand(2, m * n - 1);
      text = `(${v}${supText(m)})${supText(n)} : ${v}${supText(kk)}`;
      html = `(${pw(v, m)})<sup>${n}</sup> : ${pw(v, kk)} = ${pw(v, '?')}`;
      answer = m * n - kk;
    }
  }
  return problem('expo', text, html, answer);
}

// Многочлен из слагаемых [коэффициент, степень] → «45 − 26m − 8m²»
function polyText(terms, v) {
  const parts = terms.filter(([c]) => c !== 0).map(([c, p]) => {
    const abs = Math.abs(c);
    const body = p === 0 ? String(abs) : `${abs === 1 ? '' : abs}${v}${p === 2 ? '²' : ''}`;
    return [c < 0 ? '−' : '+', body];
  });
  if (!parts.length) return '0';
  return parts.map(([s, b], i) => (i === 0 ? (s === '−' ? `−${b}` : b) : ` ${s} ${b}`)).join('');
}

const binom = (a, b, v) => polyText([[a, 0], [b, 1]], v); // «5 − 4m»

// Алгебра: раскрыть скобки, квадрат суммы/разности, сократить дробь. Ответ выбирается из вариантов.
function genAlg(level) {
  const v = pick(['x', 'y', 'a', 'm']);
  const nz = (lo, hi) => { let n = 0; while (!n) n = rand(lo, hi) * (rnd() < 0.5 ? -1 : 1); return n; };
  const make = (text, html, right, wrong) => {
    const choices = [...new Set([right, ...wrong])].filter(Boolean).slice(0, 4);
    const p = problem('alg', text, html, right, 'expr');
    p.choices = choices;
    return p;
  };
  const kind = level === 'easy' ? pick(['dist', 'dist', 'sq'])
    : level === 'medium' ? pick(['dist', 'sq', 'sq', 'prod'])
    : pick(['sq', 'prod', 'prod', 'frac']);

  if (kind === 'dist') {
    // 3(x − 4) = 3x − 12
    const k = rand(2, 9), c = nz(1, 9);
    const inside = polyText([[1, 1], [c, 0]], v);
    const right = polyText([[k, 1], [k * c, 0]], v);
    const wrong = [polyText([[k, 1], [c, 0]], v), polyText([[1, 1], [k * c, 0]], v), polyText([[k, 1], [-k * c, 0]], v)];
    return make(`${k}(${inside})`, `${k}(${inside}) = ?`, right, wrong);
  }
  if (kind === 'sq') {
    // (6 − 2y)² = 36 − 24y + 4y²
    const a = rand(1, 9), b = nz(1, level === 'easy' ? 1 : 5);
    const base = binom(a, b, v);
    const right = polyText([[a * a, 0], [2 * a * b, 1], [b * b, 2]], v);
    const wrong = [
      polyText([[a * a, 0], [b * b, 2]], v),
      polyText([[a * a, 0], [a * b, 1], [b * b, 2]], v),
      polyText([[a * a, 0], [-2 * a * b, 1], [b * b, 2]], v),
      polyText([[a * a, 0], [2 * a * b, 1], [-b * b, 2]], v),
    ];
    return make(`(${base})²`, `(${base})<sup>2</sup> = ?`, right, shuffle(wrong));
  }
  if (kind === 'prod') {
    // (5 − 4m)(9 + 2m) = 45 − 26m − 8m²
    let a, b, c, d, x1;
    do {
      a = rand(1, 9); b = nz(1, 5); c = rand(1, 9); d = nz(1, 5);
      x1 = a * d + b * c;
    } while (x1 === 0 || x1 === a * d);
    const right = polyText([[a * c, 0], [x1, 1], [b * d, 2]], v);
    const wrong = [
      polyText([[a * c, 0], [b * d, 2]], v),
      polyText([[a * c, 0], [-x1, 1], [b * d, 2]], v),
      polyText([[a * c, 0], [x1, 1], [-b * d, 2]], v),
      polyText([[a * c, 0], [a * d, 1], [b * d, 2]], v),
      polyText([[a * c, 0], [b * c, 1], [b * d, 2]], v),
      polyText([[a + c, 0], [x1, 1], [b * d, 2]], v),
    ].filter(w => w !== right);
    return make(`(${binom(a, b, v)})(${binom(c, d, v)})`, `(${binom(a, b, v)}) · (${binom(c, d, v)}) = ?`, right, shuffle(wrong));
  }
  // Сократить дробь: (x² − 16)/(2x + 8) = (x − 4)/2
  const k = rand(2, 9), m = rand(2, 4);
  const num = `${v}² − ${k * k}`;
  const den = `${m}${v} + ${m * k}`;
  const right = `(${v} − ${k})/${m}`;
  const wrong = [`(${v} + ${k})/${m}`, `${v} − ${k}`, `(${v} − ${k})/${m * k}`];
  return make(`(${num})/(${den})`, `${tr('Сократи')}: ${fracHtml(num, den)} = ?`, right, wrong);
}

// Текстовые задачи: пропорции, проценты, движение
function genWord(level) {
  const kinds = {
    easy: ['ratio', 'speed', 'ratio'],
    medium: ['ratio', 'speed', 'pctchange', 'workers'],
    hard: ['workers', 'pctchange', 'pctchange', 'speed'],
  }[level];
  const kind = pick(kinds);

  if (kind === 'workers') {
    // 8 рабочих — 6 часов, 3 рабочих — ? (обратная пропорция)
    let w1, h1, w2;
    do {
      w1 = rand(2, 12); h1 = rand(2, 12); w2 = rand(2, 12);
    } while (w2 === w1 || (w1 * h1) % w2);
    return withSteps(problem('word', tr('{0} раб. {1} ч → {2} раб.', w1, h1, w2), tr('{0} рабочих выполнят задание за {1} ч. За сколько часов его выполнят {2} рабочих?', w1, h1, w2), (w1 * h1) / w2),
      tr('Вся работа: {0} × {1} = {2} человеко-часов.', w1, h1, w1 * h1), tr('Делим на {0} рабочих: {1} ÷ {0} = {2} ч.', w2, w1 * h1, (w1 * h1) / w2), tr('Меньше рабочих — больше времени: это обратная пропорция.'));
  }
  if (kind === 'pctchange') {
    // Сумму 650 Kč уменьшить на 12 %
    const p = pick(level === 'hard' ? [12, 15, 8, 35, 45, 6] : [10, 20, 25, 50, 5]);
    let base;
    do { base = rand(2, 40) * 25; } while ((base * p) % 100);
    const up = rnd() < 0.4;
    const answer = up ? base + (base * p) / 100 : base - (base * p) / 100;
    return withSteps(problem('word',
      money(up ? tr('{0} Kč +{1}%', base, p) : tr('{0} Kč −{1}%', base, p)),
      money(up ? tr('Сумму {0} Kč увеличь на {1} %. Сколько получится?', base, p) : tr('Сумму {0} Kč уменьши на {1} %. Сколько получится?', base, p)),
      answer),
      tr('{0}% от {1} = {1} × {0} ÷ 100 = {2}.', p, base, (base * p) / 100), `${base} ${up ? '+' : '−'} ${(base * p) / 100} = ${answer}`);
  }
  if (kind === 'speed') {
    const t = rand(2, 6), vv = rand(4, 18) * 5;
    if (rnd() < 0.5) return withSteps(problem('word', tr('{0} км/ч × {1} ч', vv, t), tr('Машина едет {0} км/ч. Сколько километров она проедет за {1} ч?', vv, t), vv * t), tr('Путь = скорость × время.'), `${vv} × ${t} = ${vv * t}`);
    return withSteps(problem('word', tr('{0} км за {1} ч', vv * t, t), tr('Поезд проехал {0} км за {1} ч. Какова его скорость в км/ч?', vv * t, t), vv), tr('Скорость = путь ÷ время.'), `${vv * t} ÷ ${t} = ${vv}`);
  }
  // 3 тетради стоят 45 Kč — сколько стоят 7?
  const n1 = rand(2, 6), price = rand(3, 25), n2 = rand(2, 12);
  return withSteps(problem('word', money(tr('{0} шт. = {1} Kč → {2} шт.', n1, n1 * price, n2)), money(tr('{0} тетради стоят {1} Kč. Сколько стоят {2} таких тетрадей?', n1, n1 * price, n2)), n2 * price),
    tr('Цена одной: {0} ÷ {1} = {2}.', n1 * price, n1, price), `${price} × ${n2} = ${n2 * price}`);
}

// Геометрия: периметр и площадь, теорема Пифагора
const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [12, 16, 20], [7, 24, 25], [20, 21, 29]];
function genGeo(level) {
  const kinds = {
    easy: ['rect', 'rectP', 'square'],
    medium: ['fence', 'tri', 'hyp', 'rect', 'angle'],
    hard: ['fence', 'leg', 'hyp', 'rectFromP', 'angle'],
  }[level];
  const kind = pick(kinds);
  if (kind === 'angle') return genAngle();
  const s = rand(3, 25);

  if (kind === 'square') return withSteps(problem('geo', tr('квадрат {0} см, S', s), tr('Сторона квадрата {0} см. Площадь = ? см²', s), s * s), tr('Площадь квадрата = сторона².'), `${s} × ${s} = ${s * s}`);
  if (kind === 'rect') {
    const a = rand(3, 20), b = rand(2, 15);
    return withSteps(problem('geo', tr('прямоугольник {0}×{1}, S', a, b), tr('Прямоугольник {0} см × {1} см. Площадь = ? см²', a, b), a * b), tr('Площадь прямоугольника = длина × ширина.'), `${a} × ${b} = ${a * b}`);
  }
  if (kind === 'rectP') {
    const a = rand(3, 30), b = rand(2, 25);
    return withSteps(problem('geo', tr('прямоугольник {0}×{1}, P', a, b), tr('Прямоугольник {0} см × {1} см. Периметр = ? см', a, b), 2 * (a + b)), tr('Периметр = 2 × (длина + ширина).'), `2 × (${a} + ${b}) = ${2 * (a + b)}`);
  }
  if (kind === 'fence') {
    // Квадратная сада: забор 48 м → площадь 144 м²
    return withSteps(problem('geo', tr('забор {0} м → S', 4 * s), tr('Квадратный сад обнесён забором длиной {0} м. Площадь сада = ? м²', 4 * s), s * s), tr('Сторона = периметр ÷ 4: {0} ÷ 4 = {1}.', 4 * s, s), `${s} × ${s} = ${s * s}`);
  }
  if (kind === 'tri') {
    const a = rand(2, 12) * 2, b = rand(2, 15);
    return withSteps(problem('geo', tr('треугольник {0}·{1}/2', a, b), tr('Прямоугольный треугольник с катетами {0} см и {1} см. Площадь = ? см²', a, b), (a * b) / 2), tr('Площадь прямоугольного треугольника = катет × катет ÷ 2.'), `${a} × ${b} ÷ 2 = ${(a * b) / 2}`);
  }
  if (kind === 'rectFromP') {
    const a = rand(3, 20), b = rand(2, 15);
    return withSteps(problem('geo', tr('P = {0}, a = {1} → S', 2 * (a + b), a), tr('Периметр прямоугольника {0} см, одна сторона {1} см. Площадь = ? см²', 2 * (a + b), a), a * b), tr('Вторая сторона: {0} ÷ 2 − {1} = {2}.', 2 * (a + b), a, b), `${a} × ${b} = ${a * b}`);
  }
  const [a, b, c] = pick(TRIPLES);
  if (kind === 'hyp') return withSteps(problem('geo', tr('катеты {0} и {1} → c', a, b), tr('Катеты прямоугольного треугольника {0} см и {1} см. Гипотенуза = ? см', a, b), c), tr('Теорема Пифагора: c² = a² + b².'), `${a * a} + ${b * b} = ${c * c} → √${c * c} = ${c}`);
  // Как в тесте: гипотенуза 10, катет 8 → второй катет 6
  const [known, other] = rnd() < 0.5 ? [a, b] : [b, a];
  return withSteps(problem('geo', tr('c = {0}, a = {1} → b', c, known), tr('Гипотенуза прямоугольного треугольника {0} см, один катет {1} см. Второй катет = ? см', c, known), other), tr('По Пифагору: b² = c² − a².'), `${c * c} − ${known * known} = ${other * other} → √${other * other} = ${other}`);
}

// Уравнения со скобками, как 2(a − 7) = 3(2a + 4)
function genEqBrackets() {
  for (let i = 0; i < 200; i++) {
    const x = rand(-9, 9), a = rand(2, 5), b = rand(1, 9), c = rand(2, 4), d = rand(1, 3);
    if (a === c * d || x === 0) continue;
    const lhs = a * (x - b);
    if ((lhs - c * d * x) % c) continue;
    const e = (lhs - c * d * x) / c;
    if (e === 0) continue;
    const v = pick(['x', 'a', 'y']);
    const right = `${c}(${d === 1 ? '' : d}${v} ${e < 0 ? '−' : '+'} ${Math.abs(e)})`;
    const text = `${a}(${v} − ${b}) = ${right}`;
    return problem('eq', text, `${text}, ${v} = ?`, x);
  }
  return null;
}

/* ---------- Ещё задачи из вступительных тестов ---------- */

const fmtDec = n => Number(n).toLocaleString(I18N.locale, { maximumFractionDigits: 3 });

// Единицы измерения: ответ всегда целый
function genUnits(level) {
  const U = k => tr(k);
  const easy = [
    () => { const n = rand(1, 9); return [`${n} ${U('км')}`, U('м'), n * 1000]; },
    () => { const n = rand(1, 9); return [`${n} ${U('м')}`, U('см'), n * 100]; },
    () => { const n = rand(1, 9); return [`${n} ${U('кг')}`, U('г'), n * 1000]; },
    () => { const n = rand(1, 9); return [`${n} ${U('л')}`, U('мл'), n * 1000]; },
    () => { const n = rand(1, 9); return [`${n * 1000} ${U('м')}`, U('км'), n]; },
    () => { const n = rand(2, 9); return [`${n * 10} ${U('мм')}`, U('см'), n]; },
  ];
  const medium = [
    () => { const n = rand(11, 99) / 10; return [`${fmtDec(n)} ${U('км')}`, U('м'), Math.round(n * 1000)]; },
    () => { const n = rand(101, 999) / 100; return [`${fmtDec(n)} ${U('м')}`, U('см'), Math.round(n * 100)]; },
    () => { const n = rand(11, 99) / 10; return [`${fmtDec(n)} ${U('т')}`, U('кг'), Math.round(n * 1000)]; },
    () => { const n = rand(11, 99) / 10; return [`${fmtDec(n)} ${U('л')}`, U('мл'), Math.round(n * 1000)]; },
    () => { const n = rand(2, 40) * 50; return [`${n} ${U('см')}`, U('мм'), n * 10]; },
    () => { const n = rand(2, 9) * 1000; return [`${n} ${U('г')}`, U('кг'), n / 1000]; },
  ];
  const hard = [
    () => { const n = rand(2, 9); return [`${n} ${U('м')}²`, `${U('см')}²`, n * 10000]; },
    () => { const n = rand(2, 9); return [`${n} ${U('см')}²`, `${U('мм')}²`, n * 100]; },
    () => { const n = rand(2, 9); return [`${n} ${U('га')}`, `${U('м')}²`, n * 10000]; },
    () => { const n = rand(2, 9); return [`${n} ${U('м')}³`, U('л'), n * 1000]; },
    () => { const n = rand(2, 20); return [`${n} ${U('дм')}³`, U('л'), n]; },
    () => { const n = rand(2, 9) * 1000; return [`${n} ${U('см')}³`, U('л'), n / 1000]; },
    () => { const n = rand(11, 99) / 10; return [`${fmtDec(n)} ${U('ч')}`, U('мин'), Math.round(n * 60)]; },
  ];
  const [from, to, answer] = pick({ easy, medium, hard }[level])();
  return problem('units', `${from} → ${to}`, `${from} = ? ${to}`, answer);
}

// Среднее, медиана, пропущенное число
function genStat(level) {
  const list = (n, lo, hi) => Array.from({ length: n }, () => rand(lo, hi));
  const withMean = (n, lo, hi) => {
    for (;;) {
      const xs = list(n, lo, hi);
      const sum = xs.reduce((a, b) => a + b, 0);
      if (sum % n === 0) return [xs, sum / n];
    }
  };
  const kind = level === 'easy' ? 'mean3' : level === 'medium' ? pick(['mean', 'mean', 'missing']) : pick(['mean', 'missing', 'median', 'grades']);

  if (kind === 'mean3' || kind === 'mean') {
    const [xs, mean] = withMean(kind === 'mean3' ? 3 : rand(4, 5), 1, kind === 'mean3' ? 20 : 60);
    return withSteps(problem('stat', `⌀ ${xs.join(', ')}`, tr('Среднее чисел {0} = ?', xs.join(', ')), mean), tr('Сложи все числа и раздели на их количество.'), `${xs.join(' + ')} = ${mean * xs.length}; ${mean * xs.length} ÷ ${xs.length} = ${mean}`);
  }
  if (kind === 'missing') {
    const n = rand(3, 4);
    const [xs, mean] = withMean(n, 5, 40);
    const shown = xs.slice(0, -1);
    return withSteps(problem('stat', `⌀ ${mean}: ${shown.join(', ')}, ?`, tr('Среднее {0} чисел равно {1}. Известны {2}. Последнее число = ?', n, mean, shown.join(', ')), xs[n - 1]), tr('Сумма всех: {0} × {1} = {2}.', mean, n, mean * n), `${mean * n} − (${shown.join(' + ')}) = ${xs[n - 1]}`);
  }
  if (kind === 'median') {
    const xs = list(pick([5, 7]), 1, 50);
    const med = [...xs].sort((a, b) => a - b)[(xs.length - 1) / 2];
    return withSteps(problem('stat', `Me ${xs.join(', ')}`, tr('Медиана чисел {0} = ?', xs.join(', ')), med), tr('Расставь по возрастанию и возьми среднее по счёту.'), [...xs].sort((a, b) => a - b).join(', '));
  }
  // Средняя оценка: ответ — сумма оценок
  const [marks, mean] = withMean(rand(4, 6), 1, 5);
  return problem('stat', tr('оценки {0}', marks.join(', ')), tr('Оценки: {0}. Средняя оценка = ?', marks.join(', ')), mean);
}

// Отношения и масштаб
function genRatio(level) {
  const kind = level === 'easy' ? 'split2' : level === 'medium' ? pick(['split2', 'scale', 'split2']) : pick(['split3', 'scale', 'scaleKm']);

  if (kind === 'split2') {
    let a = rand(1, 5), b = rand(2, 7);
    if (a === b) b++;
    const part = rand(2, level === 'easy' ? 10 : 30);
    const total = (a + b) * part;
    const big = rnd() < 0.5;
    return withSteps(problem('ratio', `${total} = ${a} : ${b}`,
      big ? tr('Раздели {0} в отношении {1} : {2}. Большая часть = ?', total, a, b) : tr('Раздели {0} в отношении {1} : {2}. Меньшая часть = ?', total, a, b),
      (big ? Math.max(a, b) : Math.min(a, b)) * part),
      tr('Всего частей: {0} + {1} = {2}. Одна часть: {3} ÷ {2} = {4}.', a, b, a + b, total, part), `${big ? Math.max(a, b) : Math.min(a, b)} × ${part} = ${(big ? Math.max(a, b) : Math.min(a, b)) * part}`);
  }
  if (kind === 'split3') {
    const a = rand(1, 4), b = rand(a + 1, 6), c = rand(b + 1, 9);
    const part = rand(2, 20);
    const total = (a + b + c) * part;
    return withSteps(problem('ratio', `${total} = ${a} : ${b} : ${c}`, tr('Раздели {0} в отношении {1} : {2} : {3}. Средняя часть = ?', total, a, b, c), b * part), tr('Всего частей: {0}. Одна часть: {1} ÷ {0} = {2}.', a + b + c, total, part), `${b} × ${part} = ${b * part}`);
  }
  if (kind === 'scale') {
    // 1 : 50 000, 4 см на карте → 2000 м
    const s = pick([1000, 5000, 10000, 25000, 50000]);
    const cm = rand(2, 12);
    return problem('ratio', `1 : ${s}, ${cm} cm → m`, tr('Масштаб карты 1 : {0}. {1} см на карте = ? м на самом деле', s.toLocaleString(I18N.locale), cm), (cm * s) / 100);
  }
  const s = pick([100000, 200000, 500000]);
  const cm = rand(2, 15);
  return problem('ratio', `1 : ${s}, ${cm} cm → km`, tr('Масштаб карты 1 : {0}. {1} см на карте = ? км на самом деле', s.toLocaleString(I18N.locale), cm), (cm * s) / 100000);
}

// Объём и поверхность тел
function genSolid(level) {
  const kinds = { easy: ['cubeV', 'boxV'], medium: ['cubeS', 'boxV', 'aquarium'], hard: ['boxS', 'cubeEdge', 'aquarium', 'cubeS'] }[level];
  const kind = pick(kinds);
  if (kind === 'cubeV') { const a = rand(2, 9); return withSteps(problem('solid', tr('куб {0} см, V', a), tr('Куб с ребром {0} см. Объём = ? см³', a), a ** 3), tr('Объём куба = ребро³.'), `${a} × ${a} × ${a} = ${a ** 3}`); }
  if (kind === 'cubeS') { const a = rand(2, 12); return withSteps(problem('solid', tr('куб {0} см, S', a), tr('Куб с ребром {0} см. Площадь поверхности = ? см²', a), 6 * a * a), tr('У куба 6 одинаковых квадратных граней.'), `6 × ${a}² = 6 × ${a * a} = ${6 * a * a}`); }
  if (kind === 'boxV') { const a = rand(2, 12), b = rand(2, 10), c = rand(2, 8); return withSteps(problem('solid', tr('квадр {0}×{1}×{2}, V', a, b, c), tr('Прямоугольный параллелепипед {0} × {1} × {2} см. Объём = ? см³', a, b, c), a * b * c), tr('Объём = длина × ширина × высота.'), `${a} × ${b} × ${c} = ${a * b * c}`); }
  if (kind === 'boxS') { const a = rand(2, 12), b = rand(2, 10), c = rand(2, 8); return withSteps(problem('solid', tr('квадр {0}×{1}×{2}, S', a, b, c), tr('Прямоугольный параллелепипед {0} × {1} × {2} см. Площадь поверхности = ? см²', a, b, c), 2 * (a * b + b * c + a * c)), tr('S = 2 × (ab + bc + ac).'), `2 × (${a * b} + ${b * c} + ${a * c}) = ${2 * (a * b + b * c + a * c)}`); }
  if (kind === 'cubeEdge') { const a = rand(2, 10); return problem('solid', tr('куб V = {0}, a', a ** 3), tr('Объём куба {0} см³. Ребро = ? см', a ** 3), a); }
  // Аквариум 50 × 30 × 40 см → 60 л
  const a = rand(2, 8) * 10, b = rand(2, 5) * 10, c = rand(2, 5) * 10;
  return withSteps(problem('solid', tr('аквариум {0}×{1}×{2} см, л', a, b, c), tr('Аквариум {0} × {1} × {2} см. Сколько литров воды в него войдёт?', a, b, c), (a * b * c) / 1000), `${a} × ${b} × ${c} = ${a * b * c} ${tr('см³')}`, tr('1 литр = 1000 см³, поэтому делим на 1000.'));
}

// Углы в треугольнике (добавляются к геометрии)
function genAngle() {
  if (rnd() < 0.5) {
    const a = rand(20, 100), b = rand(20, 150 - a);
    return withSteps(problem('geo', tr('углы {0}°, {1}° → ?', a, b), tr('В треугольнике два угла {0}° и {1}°. Третий угол = ?°', a, b), 180 - a - b), tr('Сумма углов треугольника — 180°.'), `180 − ${a} − ${b} = ${180 - a - b}`);
  }
  const top = rand(10, 80) * 2;
  return withSteps(problem('geo', tr('равнобедр., {0}° → ?', top), tr('В равнобедренном треугольнике угол при вершине {0}°. Угол при основании = ?°', top), (180 - top) / 2), tr('Углы при основании равны, вместе с вершиной — 180°.'), `(180 − ${top}) ÷ 2 = ${(180 - top) / 2}`);
}

/* =========================================================
   Темы из учебника: числовые области, цифры и разряды,
   НОД и НОК, сокращение и сравнение дробей
   ========================================================= */

// К какой области относится число: N — натуральные, Z — целые, Q — рациональные, I — иррациональные
function genSets(level) {
  const big = level === 'easy' ? 999 : level === 'medium' ? 99999 : 999999;
  const forms = [
    () => { const n = rand(1, big); return [fmtNum(n), fmtNum(n), 'N']; },
    () => { const n = rand(1, level === 'easy' ? 99 : 9999); return [`−${fmtNum(n)}`, `−${fmtNum(n)}`, 'Z']; },
    () => ['0', '0', 'Z'],
    () => {
      const d = rand(2, 9);
      let n = rand(1, d * 3);
      while (n % d === 0) n = rand(1, d * 3);
      const s = rnd() < 0.3 ? '−' : '';
      return [`${s}${n}/${d}`, `${s}${fracHtml(n, d)}`, 'Q'];
    },
    () => { const n = rand(11, 999) / 10; return [fmtDec(n), fmtDec(n), Number.isInteger(n) ? 'N' : 'Q']; },
    () => { const k = rand(2, 12); return [`√${k * k}`, `√${k * k}`, 'N']; },
    () => { const n = pick([2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15]); return [`√${n}`, `√${n}`, 'I']; },
    () => ['π', 'π', 'I'],
    () => { const n = rand(2, 9); return [`${n}π`, `${n}π`, 'I']; },
  ];
  const [text, html, ans] = pick(level === 'easy' ? forms.slice(0, 5) : forms)();
  const p = problem('sets', `${text} ∈ ?`, `${html} ∈ ?`, ans, 'set');
  p.choices = ['N', 'Z', 'Q', 'I'];
  return withSteps(p, tr('N — натуральные, Z — целые, Q — рациональные, I — иррациональные.'), tr('Выбирай самую маленькую область, куда число попадает.'));
}

// Цифры и разряды: сколько цифр, сколько раз цифра, какая цифра в разряде
const PLACE_NAMES = () => [tr('единиц'), tr('десятков'), tr('сотен'), tr('тысяч')];
function genDigit(level) {
  const range = { easy: [10, 9999], medium: [100, 999999], hard: [10000, 99999999] }[level];
  const n = rand(range[0], range[1]);
  const s = String(n);
  const r = rnd();
  if (r < 0.34) {
    const q = tr('Сколько цифр в числе {0}?', fmtNum(n));
    return problem('digit', q, q, s.length);
  }
  if (r < 0.67) {
    const d = pick(s.split(''));
    const q = tr('Сколько раз цифра {0} в числе {1}?', d, fmtNum(n));
    return problem('digit', q, q, s.split('').filter(x => x === d).length);
  }
  const pos = rand(0, Math.min(3, s.length - 1));
  const q = tr('Какая цифра в разряде {0} числа {1}?', PLACE_NAMES()[pos], fmtNum(n));
  return withSteps(problem('digit', q, q, s[s.length - 1 - pos]), tr('Разряды считаем справа: единицы, десятки, сотни, тысячи.'));
}

// Наибольший общий делитель и наименьшее общее кратное
function genLcm(level) {
  const [gMax, kMax] = { easy: [8, 6], medium: [12, 9], hard: [18, 12] }[level];
  const g = rand(2, gMax);
  let x = rand(2, kMax);
  let y = rand(2, kMax);
  for (let i = 0; i < 60 && (x === y || gcd(x, y) !== 1); i++) { x = rand(2, kMax); y = rand(2, kMax); }
  if (x === y || gcd(x, y) !== 1) { x = 2; y = 3; }
  const a = g * x;
  const b = g * y;
  if (rnd() < 0.5) {
    return withSteps(problem('lcm', `${tr('НОД')}(${a}; ${b})`, `${tr('НОД')}(${a}; ${b}) = ?`, g),
      tr('Наибольшее число, на которое делятся оба.'), `${a} = ${g} · ${x}, ${b} = ${g} · ${y}`);
  }
  return withSteps(problem('lcm', `${tr('НОК')}(${a}; ${b})`, `${tr('НОК')}(${a}; ${b}) = ?`, g * x * y),
    tr('Наименьшее число, которое делится на оба.'), `${g} · ${x} · ${y} = ${g * x * y}`);
}

// Сокращение дроби до основного вида и расширение дроби
function genFred(level, intOnly) {
  const kMax = { easy: 5, medium: 9, hard: 12 }[level];
  const k = rand(2, kMax);
  let n0 = rand(1, 9);
  let d0 = rand(2, 12);
  for (let i = 0; i < 60 && (n0 === d0 || gcd(n0, d0) !== 1); i++) { n0 = rand(1, 9); d0 = rand(2, 12); }
  if (n0 === d0 || gcd(n0, d0) !== 1) { n0 = 1; d0 = 2; }
  if (intOnly || rnd() < 0.45) {
    // Расширение: дополни числитель
    return withSteps(problem('fred', `${n0}/${d0} = ?/${d0 * k}`, `${fracHtml(n0, d0)} = ${fracHtml('?', d0 * k)}`, n0 * k),
      `${d0} · ${k} = ${d0 * k}`, `${n0} · ${k} = ${n0 * k}`);
  }
  const n = n0 * k;
  const d = d0 * k;
  const ans = fracStr(n, d);
  const wrong = [...new Set([`${n0 * 2}/${d0 * 2}`, `${n0 + 1}/${d0}`, `${n0}/${d0 + 1}`, `${n0 + 1}/${d0 + 1}`, `${n0 * 3}/${d0 * 3}`])].filter(x => x !== ans);
  const p = problem('fred', `${n}/${d}`, `${fracHtml(n, d)} = ?`, ans, 'frac');
  p.choices = [ans, ...shuffle(wrong).slice(0, 3)];
  return withSteps(p, tr('Числитель и знаменатель делим на {0}.', k));
}

// Сравнение дробей: приводим к общему знаменателю
function genFcmp(level) {
  const dMax = { easy: 9, medium: 12, hard: 20 }[level];
  const d1 = rand(2, dMax);
  const d2 = rand(2, dMax);
  const n1 = rand(1, d1 * 2);
  const html = (a, b) => fracHtml(a, b);
  if (rnd() < 0.15) {
    const k = rand(2, 5);
    return withSteps(problem('fcmp', `${n1}/${d1} ? ${n1 * k}/${d1 * k}`, `${html(n1, d1)} <span class="cmp-gap">?</span> ${html(n1 * k, d1 * k)}`, '=', 'cmp'),
      tr('Одна дробь — расширенная другая.'));
  }
  const n2 = rand(1, d2 * 2);
  const v1 = n1 * d2;
  const v2 = n2 * d1;
  return withSteps(problem('fcmp', `${n1}/${d1} ? ${n2}/${d2}`, `${html(n1, d1)} <span class="cmp-gap">?</span> ${html(n2, d2)}`, v1 < v2 ? '<' : v1 > v2 ? '>' : '=', 'cmp'),
    `${n1} · ${d2} = ${v1}, ${n2} · ${d1} = ${v2}`);
}

const NEW_GENERATORS = { order: genOrder, cmp: genCmp, round: genRound, neg: genNeg, rem: genRem, eq: genEq, time: genTime, money: genMoney, dvs: genDvs, expo: genExpo, alg: genAlg, word: genWord, geo: genGeo, units: genUnits, stat: genStat, ratio: genRatio, solid: genSolid,
  sets: genSets, digit: genDigit, lcm: genLcm, fred: genFred, fcmp: genFcmp };

/* =========================================================
   Приёмы устного счёта
   ========================================================= */

const TIPS = [
  { ops: ['mul'], text: tr('Умножение на 9: возьми ×10 и вычти само число. 7 × 9 = 70 − 7 = 63.') },
  { ops: ['mul'], text: tr('Умножение на 5: половина от ×10. 14 × 5 = 140 ÷ 2 = 70.') },
  { ops: ['mul'], text: tr('Умножение на 4: удвой дважды. 17 × 4 = 34 → 68.') },
  { ops: ['mul'], text: tr('Умножение на 11 (до 9): цифру повтори. 7 × 11 = 77.') },
  { ops: ['mul', 'pow'], text: tr('Квадрат числа с 5 на конце: 25 в конце, а перед ним n × (n + 1). 35² = 3 × 4 = 12 → 1225.') },
  { ops: ['add'], text: tr('Складывай круглыми: 47 + 28 = 47 + 30 − 2 = 75.') },
  { ops: ['sub'], text: tr('Вычитай по частям: 83 − 47 = 83 − 40 − 7 = 36.') },
  { ops: ['sub'], text: tr('Вычитание из круглого: 100 − 63 — считай, сколько до 100: 37.') },
  { ops: ['div'], text: tr('Деление на 5 — это умножение на 2 и деление на 10. 85 ÷ 5 = 170 ÷ 10 = 17.') },
  { ops: ['div'], text: tr('Деление на 4 — раздели пополам дважды. 96 ÷ 4 = 48 → 24.') },
  { ops: ['pct'], text: tr('10% — сдвинь запятую. 10% от 240 = 24. А 20% — это два раза по 10%.') },
  { ops: ['pct'], text: tr('25% — это четверть: раздели на 4. 25% от 160 = 40.') },
  { ops: ['pct'], text: tr('Проценты можно менять местами: 8% от 50 = 50% от 8 = 4.') },
  { ops: ['frac'], text: tr('Чтобы сложить дроби, приведи к общему знаменателю: 1/3 + 1/2 = 2/6 + 3/6 = 5/6.') },
  { ops: ['frac'], text: tr('Деление на дробь — умножение на перевёрнутую: 3/4 ÷ 1/2 = 3/4 × 2 = 3/2.') },
  { ops: ['pow'], text: tr('Квадраты до 20 стоит выучить наизусть — они встречаются чаще всего.') },
  { ops: ['pow'], text: tr('Степени двойки: 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024.') },
  { ops: ['order'], text: tr('Сначала скобки, потом × и ÷, и только потом + и −.') },
  { ops: ['dvs'], text: tr('На 3 и на 9 проверяй суммой цифр: 7 452 → 7 + 4 + 5 + 2 = 18, значит делится и на 3, и на 9.') },
  { ops: ['dvs'], text: tr('На 4 смотри на две последние цифры, на 8 — на три: 9 316 → 16 : 4 = 4.') },
  { ops: ['dvs'], text: tr('На 6 делится только то, что делится и на 2, и на 3 одновременно.') },
  { ops: ['expo'], text: tr('При умножении степеней показатели складывай, при делении — вычитай, а степень в степени — перемножай: (b⁵)³ · b² = b¹⁵⁺² = b¹⁷.') },
  { ops: ['alg'], text: tr('(a − b)² = a² − 2ab + b². Не забывай удвоенное произведение: (6 − 2y)² = 36 − 24y + 4y².') },
  { ops: ['alg'], text: tr('a² − b² = (a − b)(a + b). Поэтому (x² − 16) / (2x + 8) = (x − 4)(x + 4) / 2(x + 4) = (x − 4) / 2.') },
  { ops: ['word'], text: tr('Больше рабочих — меньше времени: 8 рабочих × 6 ч = 48 «рабочих часов», значит 3 рабочих справятся за 48 : 3 = 16 ч.') },
  { ops: ['word', 'pct'], text: tr('Уменьшить на 12 % — значит оставить 88 %: 650 × 0,88 = 572.') },
  { ops: ['geo'], text: tr('Пифагор: c² = a² + b². Катет: b = √(c² − a²). Гипотенуза 10, катет 8 → √(100 − 64) = 6.') },
  { ops: ['geo'], text: tr('Квадрат: периметр 48 → сторона 48 : 4 = 12 → площадь 12 · 12 = 144.') },
  { ops: ['geo'], text: tr('Сумма углов треугольника — 180°. Два угла 50° и 60° → третий 180 − 50 − 60 = 70°.') },
  { ops: ['units'], text: tr('1 м² = 100 × 100 = 10 000 см², а 1 м³ = 1000 л. Квадратные единицы — шаг ×100, кубические — ×1000.') },
  { ops: ['stat'], text: tr('Среднее = сумма : количество. Если среднее 4 чисел равно 10, их сумма 40.') },
  { ops: ['ratio'], text: tr('Раздели 60 в отношении 2 : 3: всего 2 + 3 = 5 частей, одна часть 12, значит 24 и 36.') },
  { ops: ['solid'], text: tr('Объём квадра a · b · c, поверхность 2(ab + bc + ac). 1 дм³ = 1 л, а 1000 см³ = 1 л.') },
  { ops: ['neg'], text: tr('Минус на минус даёт плюс: −6 × (−4) = 24.') },
  { ops: ['round'], text: tr('Смотри на следующую цифру: 5 и больше — округляем вверх, меньше — вниз.') },
  { ops: ['eq'], text: tr('В уравнении переноси число в другую часть с обратным знаком: x + 7 = 12 → x = 12 − 7.') },
  { ops: ['rem'], text: tr('Остаток всегда меньше делителя. 17 ÷ 5: 5 × 3 = 15, остаток 2.') },
  { ops: ['time'], text: tr('В часе 60 минут: 2 ч 40 мин = 160 мин.') },
  { ops: ['money'], text: tr('Сдачу считай «досчитыванием»: 78 → 80 → 100, значит 22.') },
];

const tipFor = ops => {
  const fits = TIPS.filter(t => t.ops.some(o => ops.includes(o)));
  return (fits.length ? fits : TIPS)[Math.floor(rnd() * (fits.length || TIPS.length))];
};

const tipOfDay = () => TIPS[hashString(dateKey()) % TIPS.length];

/* =========================================================
   Умная сложность
   ========================================================= */

const LEVEL_ORDER = ['easy', 'medium', 'hard'];

function adaptiveStep(g, ok, ms) {
  if (!data.settings.adaptive || g.mode === 'mistakes') return;
  g.recent = (g.recent || []).concat({ ok, ms }).slice(-6);
  if (g.recent.length < 4 || (g.adaptCooldown || 0) > performance.now()) return;
  const wrong = g.recent.filter(r => !r.ok).length;
  const avg = g.recent.reduce((s, r) => s + r.ms, 0) / g.recent.length;
  const idx = LEVEL_ORDER.indexOf(g.settings.level);

  if (wrong === 0 && avg < 3500 && idx < 2) {
    g.settings.level = LEVEL_ORDER[idx + 1];
  } else if (wrong >= 2 && idx > 0) {
    g.settings.level = LEVEL_ORDER[idx - 1];
  } else {
    return;
  }
  g.recent = [];
  g.adaptCooldown = performance.now() + 6000;
  g.levelChanged = true;
}

/* =========================================================
   Повторение ошибок по расписанию
   ========================================================= */

const SRS_STEPS = [10 * 60e3, 864e5, 3 * 864e5, 7 * 864e5, 21 * 864e5];

const dueMistakes = () => data.mistakes.filter(m => (m.due || 0) <= Date.now());

function srsUpdate(m, ok) {
  if (ok) {
    m.box = Math.min((m.box || 1) + 1, SRS_STEPS.length + 1);
    m.due = Date.now() + (SRS_STEPS[m.box - 1] || SRS_STEPS[SRS_STEPS.length - 1]);
  } else {
    m.box = 1;
    m.due = Date.now() + SRS_STEPS[0];
  }
  return m.box > SRS_STEPS.length; // выучено — можно убрать из списка
}

// Очередь повторения: сначала то, что уже «созрело»
function srsQueue(limit = 20) {
  return data.mistakes
    .slice()
    .sort((a, b) => (a.due || 0) - (b.due || 0))
    .slice(0, limit);
}

/* =========================================================
   Карта таблицы умножения
   ========================================================= */

function tableStatsUpdate(entry) {
  if (!['mul', 'div'].includes(entry.op)) return;
  const nums = entry.text.match(/\d+/g)?.map(Number) || [];
  let a, b;
  if (entry.op === 'mul') [a, b] = nums;
  else { b = nums[1]; a = Number(entry.answer); }
  if (!a || !b || a > 12 || b > 12) return;
  const key = `${Math.min(a, b)}x${Math.max(a, b)}`;
  const st = data.tableStats[key] || (data.tableStats[key] = { n: 0, c: 0, t: 0 });
  st.n++;
  if (entry.ok) st.c++;
  st.t += Math.min(entry.ms, 20000);
}

// 0 — не решал, иначе от 0.1 (слабо) до 1 (уверенно)
function tableMastery(a, b) {
  const st = data.tableStats[`${Math.min(a, b)}x${Math.max(a, b)}`];
  if (!st || !st.n) return 0;
  const acc = st.c / st.n;
  const speed = Math.max(0, Math.min(1, (6000 - st.t / st.n) / 4500));
  return Math.max(0.1, acc * 0.7 + speed * 0.3);
}

/* =========================================================
   Испытания
   ========================================================= */

const CHALLENGES = [
  { id: 'clean20', icon: 'shield', name: tr('Чисто'), desc: tr('20 ответов без единой ошибки'), check: s => s.correct >= 20 && s.wrong === 0 },
  { id: 'fast30', icon: 'bolt', name: tr('Тридцатка'), desc: tr('30 верных за минуту в Спринте'), check: s => s.mode === 'sprint' && s.correct >= 30 },
  { id: 'blitz45', icon: 'stopwatch', name: tr('Блиц за 45'), desc: tr('Пройти Блиц 20 быстрее 45 секунд'), check: s => s.mode === 'blitz' && s.completed && s.score < 45 },
  { id: 'surv20', icon: 'heart', name: tr('Живучий'), desc: tr('20 верных в Выживании'), check: s => s.mode === 'survival' && s.correct >= 20 },
  { id: 'table100', icon: 'grid', name: tr('Таблица на отлично'), desc: tr('Таблица умножения без ошибок'), check: s => s.mode === 'table' && s.completed && s.wrong === 0 },
  { id: 'hard15', icon: 'gem', name: tr('Сложный путь'), desc: tr('15 верных на сложном уровне'), check: s => s.level === 'hard' && s.correct >= 15 },
  { id: 'streak25', icon: 'fire', name: tr('Серия 25'), desc: tr('Серия из 25 верных подряд'), check: s => s.maxStreak >= 25 },
  { id: 'allops', icon: 'star', name: tr('Мастер на все руки'), desc: tr('Тренировка с 4 и более действиями'), check: s => (s.ops || []).length >= 4 && s.correct >= 15 },
  { id: 'mistakes0', icon: 'bandage', name: tr('Чистая совесть'), desc: tr('Разобрать все накопленные ошибки'), check: (s, d) => s.mode === 'mistakes' && d.mistakes.length === 0 },
  { id: 'speedy', icon: 'comet', name: tr('Реактивный'), desc: tr('Средний ответ быстрее 1,5 секунды'), check: s => s.avgMs < 1500 && s.correct >= 10 },
];

function checkChallenges(session) {
  const done = [];
  for (const c of CHALLENGES) {
    if (data.challenges[c.id]) continue;
    try {
      if (c.check(session, data)) {
        data.challenges[c.id] = Date.now();
        done.push(c);
      }
    } catch { /* пропускаем */ }
  }
  return done;
}

/* =========================================================
   Задание дня
   ========================================================= */

function dailyChallenge() {
  const key = dateKey();
  const rng = seededRandom(hashString(`daily-${key}`));
  const modes = ['sprint', 'blitz', 'survival', 'table'];
  const mode = modes[Math.floor(rng() * modes.length)];
  const allOps = ['add', 'sub', 'mul', 'div', 'pow', 'pct'];
  const ops = [allOps[Math.floor(rng() * allOps.length)], allOps[Math.floor(rng() * allOps.length)]];
  const level = LEVEL_ORDER[Math.floor(rng() * 2) + (rng() < 0.3 ? 1 : 0)] || 'medium';
  const goal = { sprint: 18, blitz: 0, survival: 12, table: 25 }[mode];
  const goalText = {
    sprint: `${tr('{0} верных за минуту', goal)}`,
    blitz: tr('пройти все 20 примеров'),
    survival: `${tr('{0} верных подряд с 3 жизнями', goal)}`,
    table: `${tr('{0} верных в таблице умножения', goal)}`,
  }[mode];
  return { key, mode, ops: [...new Set(ops)], level, goal, goalText };
}

function dailyDone(session, dc) {
  if (session.mode !== dc.mode) return false;
  if (dc.mode === 'blitz') return session.completed;
  return session.correct >= dc.goal;
}

/* =========================================================
   Серия дней и заморозки
   ========================================================= */

// Один пропущенный день можно закрыть заморозкой
function applyStreakFreeze() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yKey = dateKey(yesterday);
  const before = new Date(today);
  before.setDate(today.getDate() - 2);

  if (data.daily[yKey] || data.freezeDays[yKey]) return;
  if (!data.daily[dateKey(before)] && !data.freezeDays[dateKey(before)]) return; // серии и не было
  if ((data.freezes || 0) <= 0) return;
  data.freezes--;
  data.freezeDays[yKey] = true;
  saveData();
  return yKey;
}

function grantFreeze(streak) {
  if (streak > 0 && streak % 7 === 0 && data.freezeGrant !== streak) {
    data.freezeGrant = streak;
    data.freezes = Math.min((data.freezes || 0) + 1, 5);
    return true;
  }
  return false;
}

/* =========================================================
   Коды: матч по коду и задание от родителя
   ========================================================= */

const CODE_OPS = ['add', 'sub', 'mul', 'div', 'pow', 'pct', 'frac', 'order', 'cmp', 'round', 'neg', 'rem', 'eq', 'time', 'money', 'dvs', 'expo', 'alg', 'word', 'geo', 'units', 'stat', 'ratio', 'solid', 'sets', 'digit', 'lcm', 'fred', 'fcmp'];
const CODE_MODES = ['sprint', 'blitz', 'survival', 'table', 'practice'];

function packCode(kind, cfg) {
  const opsMask = CODE_OPS.reduce((m, op, i) => (cfg.ops.includes(op) ? m | (1 << i) : m), 0);
  const parts = [
    kind,
    CODE_MODES.indexOf(cfg.mode).toString(36),
    LEVEL_ORDER.indexOf(cfg.level).toString(36),
    opsMask.toString(36),
    (cfg.seed || 0).toString(36),
    (cfg.goal || 0).toString(36),
  ];
  return parts.join('-').toUpperCase();
}

function unpackCode(code) {
  const parts = String(code).trim().toUpperCase().split('-');
  if (parts.length !== 6) return null;
  const [kind, m, l, mask, seed, goal] = parts;
  const mode = CODE_MODES[parseInt(m, 36)];
  const level = LEVEL_ORDER[parseInt(l, 36)];
  const opsMask = parseInt(mask, 36);
  if (!mode || !level || Number.isNaN(opsMask)) return null;
  const ops = CODE_OPS.filter((_, i) => opsMask & (1 << i));
  if (!ops.length) return null;
  return { kind, mode, level, ops, seed: parseInt(seed, 36) || 0, goal: parseInt(goal, 36) || 0 };
}

const matchCode = cfg => packCode('M', { ...cfg, seed: cfg.seed || Math.floor(Math.random() * 1e6) });
const assignmentCode = cfg => packCode('Z', { ...cfg, seed: 0 });

// Код результата: очки и зерно матча, чтобы сравнивать только один и тот же матч
const resultCode = (seed, score) => `R-${seed.toString(36)}-${Math.round(score * 10).toString(36)}`.toUpperCase();

function parseResult(code) {
  const parts = String(code).trim().toUpperCase().split('-');
  if (parts.length !== 3 || parts[0] !== 'R') return null;
  return { seed: parseInt(parts[1], 36), score: parseInt(parts[2], 36) / 10 };
}

/* =========================================================
   Отчёт за неделю
   ========================================================= */

function weekReport() {
  const now = Date.now();
  const week = s => s.date >= now - 7 * 864e5;
  const prev = s => s.date >= now - 14 * 864e5 && s.date < now - 7 * 864e5;
  const sum = list => list.reduce((acc, s) => ({
    correct: acc.correct + s.correct,
    wrong: acc.wrong + s.wrong,
    ms: acc.ms + s.avgMs * (s.correct + s.wrong),
    n: acc.n + s.correct + s.wrong,
    xp: acc.xp + s.xp,
    sessions: acc.sessions + 1,
  }), { correct: 0, wrong: 0, ms: 0, n: 0, xp: 0, sessions: 0 });

  const cur = sum(data.sessions.filter(week));
  const old = sum(data.sessions.filter(prev));
  const acc = t => (t.n ? Math.round((t.correct / t.n) * 100) : 0);
  const avg = t => (t.n ? t.ms / t.n / 1000 : 0);

  // Слабое и сильное действие за неделю
  const ops = {};
  for (const s of data.sessions.filter(week)) {
    for (const [op, st] of Object.entries(s.opCounts || {})) {
      const cell = ops[op] || (ops[op] = { n: 0, c: 0, t: 0 });
      cell.n += st.n; cell.c += st.c; cell.t += st.t;
    }
  }
  const rated = Object.entries(ops).filter(([op, st]) => OPS[op] && st.n >= 5)
    .map(([op, st]) => ({ op, acc: st.c / st.n, avg: st.t / st.n / 1000 }))
    .sort((a, b) => a.acc - b.acc || b.avg - a.avg);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ key: dateKey(d), label: d.toLocaleDateString(I18N.locale, { weekday: 'short' }), val: data.daily[dateKey(d)] || 0 });
  }

  return {
    cur, old, days,
    accuracy: acc(cur), accuracyPrev: acc(old),
    avgSec: avg(cur), avgSecPrev: avg(old),
    weakest: rated[0], strongest: rated[rated.length - 1],
    goalDays: days.filter(d => d.val >= data.dailyGoal).length,
  };
}

function reportText() {
  const r = weekReport();
  const diff = (a, b, unit, better = 'up') => {
    if (!b) return '';
    const d = a - b;
    if (Math.abs(d) < 0.01) return tr(' (без изменений)');
    const good = better === 'up' ? d > 0 : d < 0;
    return ` ${tr('({0}{1}{2}, {3} прошлой недели)', d > 0 ? '+' : '', unit === 'с' ? d.toFixed(2) : Math.round(d), unit === '%' ? '%' : unit === 'с' ? tr(' с') : '', good ? tr('лучше') : tr('хуже'))}`;
  };
  const lines = [
    `${tr('Отчёт за неделю — {0}', profileName())}`,
    ``,
    `${tr('Решено примеров: {0}{1}', r.cur.n, diff(r.cur.n, r.old.n, ''))}`,
    `${tr('Верных ответов: {0}, ошибок: {1}', r.cur.correct, r.cur.wrong)}`,
    `${tr('Точность: {0}%{1}', r.accuracy, diff(r.accuracy, r.accuracyPrev, '%'))}`,
    `${tr('Среднее время ответа: {0} с{1}', r.avgSec.toFixed(2), diff(r.avgSec, r.avgSecPrev, tr('с'), 'down'))}`,
    `${tr('Тренировок: {0}, опыта получено: {1}', r.cur.sessions, r.cur.xp)}`,
    `${tr('Дневная цель выполнена: {0} из 7 дней', r.goalDays)}`,
  ];
  if (r.weakest) lines.push(`${tr('Слабое место: {0} — точность {1}%', OPS[r.weakest.op].name.toLowerCase(), Math.round(r.weakest.acc * 100))}`);
  if (r.strongest && r.strongest !== r.weakest) lines.push(`${tr('Лучше всего: {0} — точность {1}%', OPS[r.strongest.op].name.toLowerCase(), Math.round(r.strongest.acc * 100))}`);
  lines.push('', `${tr('По дням: {0}', r.days.map(d => `${d.label} ${d.val}`).join(', '))}`);
  return lines.join('\n');
}

/* =========================================================
   Профили
   ========================================================= */

const PROFILES_KEY = 'mfs-profiles';
const PROFILE_COLORS = ['#d6b25e', '#5fd391', '#779bf3', '#a98afa', '#f06a6e', '#f5a25c'];

function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.list && p.list.length) {
        // Имя по умолчанию («Игрок», «Hráč»…) показываем на текущем языке
        const defaults = ['Игрок', 'Hráč', 'Player', 'Гравець'];
        p.list.forEach(x => { if (defaults.includes(x.name)) x.name = tr('Игрок'); });
        return p;
      }
    }
  } catch { /* создадим заново */ }
  const fresh = { active: 'p1', list: [{ id: 'p1', name: tr('Игрок'), color: PROFILE_COLORS[0] }] };
  localStorage.setItem(PROFILES_KEY, JSON.stringify(fresh));
  // Прогресс из версии без профилей переносим первому профилю
  const old = localStorage.getItem('mfs-data-v1');
  if (old && !localStorage.getItem('mfs-data-v1:p1')) localStorage.setItem('mfs-data-v1:p1', old);
  return fresh;
}

let profiles = loadProfiles();
const profileKey = id => `mfs-data-v1:${id || profiles.active}`;
const profileName = () => profiles.list.find(p => p.id === profiles.active)?.name || tr('Игрок');
const profileColor = () => profiles.list.find(p => p.id === profiles.active)?.color || PROFILE_COLORS[0];

function saveProfiles() {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function addProfile(name) {
  const id = `p${Date.now().toString(36)}`;
  profiles.list.push({ id, name: name.slice(0, 20) || tr('Игрок'), color: PROFILE_COLORS[profiles.list.length % PROFILE_COLORS.length] });
  saveProfiles();
  return id;
}

function removeProfile(id) {
  if (profiles.list.length <= 1) return false;
  profiles.list = profiles.list.filter(p => p.id !== id);
  localStorage.removeItem(profileKey(id));
  if (profiles.active === id) profiles.active = profiles.list[0].id;
  saveProfiles();
  return true;
}

/* =========================================================
   Перенос прогресса
   ========================================================= */

const SAVE_SALT = 'mfs-sigma-2026';
const saveSig = d => hashString(JSON.stringify(d) + SAVE_SALT).toString(36);

function exportPayload() {
  return JSON.stringify({
    app: 'Math for Speed',
    version: 3,
    exported: new Date().toISOString(),
    profile: profileName(),
    sig: saveSig(data),
    data,
  }, null, 2);
}

function importPayload(text) {
  const parsed = JSON.parse(text);
  const incoming = parsed && parsed.data ? parsed.data : parsed;
  if (!incoming || typeof incoming.xp !== 'number' || !incoming.settings) throw new Error(tr('Не похоже на файл Math for Speed'));
  // Файлы новых версий подписаны: если цифры исправили вручную, подпись не сойдётся
  if (parsed.sig && parsed.sig !== saveSig(incoming)) throw new Error(tr('Файл изменён вручную — загрузить его нельзя.'));
  return incoming;
}

/* =========================================================
   Достижения с уровнями: у каждого 10 ступеней редкости
   ========================================================= */

const RARITIES = [
  { name: tr('Камень'), color: '#9a9a9a' },
  { name: tr('Бронза'), color: '#c8834a' },
  { name: tr('Серебро'), color: '#d5dde6' },
  { name: tr('Золото'), color: '#e6bd5c' },
  { name: tr('Изумруд'), color: '#36d487' },
  { name: tr('Сапфир'), color: '#4d8dff' },
  { name: tr('Аметист'), color: '#ac6bff' },
  { name: tr('Рубин'), color: '#ff5468' },
  { name: tr('Бриллиант'), color: '#9be8ff' },
  { name: tr('Легенда'), color: '#ffd37a' },
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const recordBest = (d, mode, lower) => {
  const vals = Object.entries(d.records).filter(([k]) => k.startsWith(`${mode}|`)).map(([, r]) => r.score);
  if (!vals.length) return lower ? Infinity : 0;
  return lower ? Math.min(...vals) : Math.max(...vals);
};
const hoursText = v => (v < 10 ? fmtDec(Math.floor(v * 10) / 10) : String(Math.floor(v)));

const ACH_TRACKS = [
  { id: 'time', icon: 'stopwatch', name: tr('Марафонец'), goal: n => tr('Проведи в тренировках {0} ч', n),
    tiers: [1, 5, 10, 20, 35, 50, 75, 100, 150, 250], value: d => (d.life?.ms || 0) / 3.6e6, fmt: hoursText, unit: () => tr('ч') },
  { id: 'correct', icon: 'target', name: tr('Снайпер'), goal: n => tr('{0} верных ответов', n.toLocaleString(I18N.locale)),
    tiers: [100, 500, 1000, 2500, 5000, 10000, 20000, 35000, 50000, 100000], value: d => d.totalCorrect },
  { id: 'streak', icon: 'fire', name: tr('В ударе'), goal: n => tr('Серия из {0} верных подряд', n),
    tiers: [10, 20, 30, 50, 75, 100, 150, 200, 300, 500], value: d => d.bestStreak },
  { id: 'days', icon: 'calendar', name: tr('Постоянство'), goal: n => tr('Занимайся {0} {1} подряд', n, plural(n, 'день', 'дня', 'дней')),
    tiers: [3, 7, 14, 30, 50, 75, 100, 150, 200, 365], value: d => Math.max(dayStreak(d), d.life?.bestDays || 0) },
  { id: 'sessions', icon: 'rocket', name: tr('Тренер'), goal: n => tr('Тренировок завершено: {0}', n),
    tiers: [1, 10, 25, 50, 100, 200, 350, 500, 750, 1000], value: d => d.life?.trainings || 0 },
  { id: 'sprint', icon: 'bolt', name: tr('Спринтер'), goal: n => tr('{0} верных в Спринте', n),
    tiers: [10, 15, 20, 25, 30, 35, 40, 45, 50, 60], value: d => recordBest(d, 'sprint') },
  { id: 'blitz', icon: 'comet', name: tr('Блиц-мастер'), goal: n => tr('Блиц 20 быстрее {0} с', n), lower: true,
    tiers: [120, 100, 90, 80, 70, 60, 50, 45, 40, 35], value: d => recordBest(d, 'blitz', true), unit: () => tr('с') },
  { id: 'survival', icon: 'shield', name: tr('Выживший'), goal: n => tr('{0} верных в Выживании', n),
    tiers: [10, 20, 30, 40, 50, 60, 75, 90, 110, 130], value: d => recordBest(d, 'survival') },
  { id: 'level', icon: 'crown', name: tr('Опыт'), goal: n => tr('Достигни {0} уровня', n),
    tiers: [2, 5, 10, 15, 20, 30, 40, 50, 75, 100], value: d => levelFromXp(d.xp) },
  { id: 'goal', icon: 'medal', name: tr('Цель дня'), goal: n => tr('Выполни дневную цель {0} раз', n),
    tiers: [1, 5, 10, 25, 50, 75, 100, 150, 200, 300], value: d => d.life?.goalDays || 0 },
  { id: 'perfect', icon: 'gem', name: tr('Без ошибок'), goal: n => tr('{0} тренировок без ошибок (от 10 ответов)', n),
    tiers: [1, 3, 5, 10, 20, 35, 50, 75, 100, 150], value: d => d.life?.perfect || 0 },
  { id: 'topics', icon: 'star', name: tr('Эрудит'), goal: n => tr('{0} тем, в каждой 50 верных', n),
    tiers: [1, 2, 3, 5, 7, 9, 12, 15, 18, 22], value: d => Object.values(d.opStats).filter(s => s.c >= 50).length },
];

function achTier(t, d) {
  const v = t.value(d);
  let n = 0;
  for (const th of t.tiers) if (t.lower ? v <= th : v >= th) n++; else break;
  return n;
}

// Прогресс к следующей ступени: [доля 0..1, «сейчас / цель»]
function achProgress(t, d, tier) {
  if (tier >= 10) return [1, tr('Максимум')];
  const v = t.value(d);
  const next = t.tiers[tier];
  const unit = t.unit ? ` ${t.unit()}` : '';
  if (t.lower) {
    const start = tier ? t.tiers[tier - 1] : 150;
    const frac = v === Infinity ? 0 : Math.max(0, Math.min(1, (start - v) / (start - next)));
    return [frac, v === Infinity ? `— / ${next}${unit}` : `${fmtDec(Math.round(v * 10) / 10)} / ${next}${unit}`];
  }
  const fmt = t.fmt || (x => Math.floor(x).toLocaleString(I18N.locale));
  return [Math.max(0, Math.min(1, v / next)), `${fmt(v)} / ${next.toLocaleString(I18N.locale)}${unit}`];
}

// Счётчики за всё время. Для старых профилей восстанавливаем из истории.
function lifeInit(d) {
  if (d.life) return;
  const s = d.sessions || [];
  d.life = {
    ms: s.reduce((a, x) => a + (x.duration || 0) * 1000, 0),
    trainings: s.length,
    perfect: s.filter(x => x.wrong === 0 && x.correct >= 10).length,
    goalDays: Object.values(d.daily || {}).filter(v => v >= d.dailyGoal).length,
    goalLast: (d.daily || {})[dateKey()] >= d.dailyGoal ? dateKey() : null,
    bestDays: 0,
  };
}

function lifeUpdate(d, session) {
  lifeInit(d);
  const L = d.life;
  L.ms += session.duration * 1000;
  L.trainings++;
  if (session.wrong === 0 && session.correct >= 10) L.perfect++;
  const today = dateKey();
  if ((d.daily[today] || 0) >= d.dailyGoal && L.goalLast !== today) {
    L.goalDays++;
    L.goalLast = today;
  }
  L.bestDays = Math.max(L.bestDays || 0, dayStreak(d));
}

// Первый запуск новой системы: уже заработанные ступени засчитываем молча
function achInit(d) {
  lifeInit(d);
  if (d.achTiers) return;
  d.achTiers = {};
  for (const t of ACH_TRACKS) d.achTiers[t.id] = achTier(t, d);
}

// Новые ступени после тренировки
// Награда за ступень: монеты и опыт, а за IV, VII и X — ещё и ключ от сундука
const ACH_KEY_TIERS = [4, 7, 10];
const achReward = tier => ({ coins: 20 * (tier + 1), xp: 25 * tier, keys: ACH_KEY_TIERS.includes(tier) ? 1 : 0 });
// Постоянная прибавка к опыту за все открытые ступени: 0,25% за ступень (до +30%)
const achXpBonus = d => (d.achTiers ? achTotal(d) : 0) * 0.0025;

function achCheck(d) {
  achInit(d);
  const out = [];
  for (const t of ACH_TRACKS) {
    const tier = achTier(t, d);
    const was = d.achTiers[t.id] || 0;
    if (tier > was) {
      d.achTiers[t.id] = tier;
      // За каждую пропущенную ступень награда своя
      const rw = { coins: 0, xp: 0, keys: 0 };
      for (let n = was + 1; n <= tier; n++) {
        const one = achReward(n);
        rw.coins += one.coins;
        rw.xp += one.xp;
        rw.keys += one.keys;
      }
      d.coins = (d.coins || 0) + rw.coins;
      d.keys = (d.keys || 0) + rw.keys;
      d.xp += rw.xp;
      const r = RARITIES[tier - 1];
      out.push({ id: t.id, icon: t.icon, tier, name: `${t.name} · ${r.name} ${ROMAN[tier - 1]}`, desc: t.goal(t.tiers[tier - 1]), color: r.color, reward: rw });
    }
  }
  return out;
}

const achTotal = d => ACH_TRACKS.reduce((a, t) => a + (d.achTiers?.[t.id] || 0), 0);
