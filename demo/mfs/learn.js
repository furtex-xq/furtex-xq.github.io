'use strict';

/* =========================================================
   Учебник: приёмы устного счёта с тренировкой, уроки по темам,
   шпаргалки, карточки для запоминания и словарь терминов.
   ========================================================= */

/* ---------- Приёмы устного счёта ---------- */

const powProblem = n => ({ op: 'pow', text: `${n}^2`, html: `${n}<sup>2</sup> = ?`, answer: String(n * n), kind: 'int' });

const TRICKS = [
  { id: 'x11', title: tr('Умножение на 11'), icon: 'mul',
    steps: [tr('Раздвинь цифры двузначного числа.'), tr('Посередине напиши их сумму.'), tr('Если сумма больше 9 — прибавь единицу к первой цифре.')],
    ex: '43 × 11 → 4 (4+3) 3 = 473', gen: () => makeProblem('mul', rand(12, 99), 11) },
  { id: 'sq5', title: tr('Квадрат числа на 5'), icon: 'pow',
    steps: [tr('Отбрось пятёрку: останутся десятки.'), tr('Умножь их на следующее число.'), tr('Допиши справа 25.')],
    ex: '65² → 6 × 7 = 42 → 4225', gen: () => powProblem(rand(1, 12) * 10 + 5) },
  { id: 'x5', title: tr('Умножение на 5'), icon: 'mul',
    steps: [tr('Умножь число на 10.'), tr('Раздели результат пополам.')],
    ex: '48 × 5 = 480 ÷ 2 = 240', gen: () => makeProblem('mul', rand(6, 99) * 2, 5) },
  { id: 'x9', title: tr('Умножение на 9'), icon: 'mul',
    steps: [tr('Умножь число на 10.'), tr('Вычти само число.')],
    ex: '37 × 9 = 370 − 37 = 333', gen: () => makeProblem('mul', rand(12, 99), 9) },
  { id: 'x25', title: tr('Умножение на 25'), icon: 'mul',
    steps: [tr('Раздели число на 4.'), tr('Умножь результат на 100.')],
    ex: '36 × 25 = 9 × 100 = 900', gen: () => makeProblem('mul', rand(3, 30) * 4, 25) },
  { id: 'x4', title: tr('×4 и ×8 — удвоением'), icon: 'mul',
    steps: [tr('×4 — удвой два раза.'), tr('×8 — удвой три раза.')],
    ex: '37 × 4 → 74 → 148', gen: () => makeProblem('mul', rand(13, 99), pick([4, 8])) },
  { id: 'near100', title: tr('Числа около 100'), icon: 'mul',
    steps: [tr('Найди, сколько каждому не хватает до 100.'), tr('Вычти из одного числа недостачу другого — это первые цифры.'), tr('Перемножь недостачи — это последние две цифры.')],
    ex: '97 × 96 → 97 − 4 = 93, 3 × 4 = 12 → 9312', gen: () => makeProblem('mul', rand(88, 99), rand(88, 99)) },
  { id: 'diffsq', title: tr('Симметрично вокруг круглого'), icon: 'mul',
    steps: [tr('Найди круглое число посередине.'), tr('Возведи его в квадрат.'), tr('Вычти квадрат расстояния до него.')],
    ex: '48 × 52 = 50² − 2² = 2496', gen: () => { const c = pick([20, 30, 40, 50, 60, 70, 80, 90]); const d = rand(1, 5); return makeProblem('mul', c - d, c + d); } },
  { id: 'sq50', title: tr('Квадраты от 41 до 59'), icon: 'pow',
    steps: [tr('Найди, на сколько число отличается от 50.'), tr('Прибавь (или вычти) это к 25 — получишь сотни.'), tr('Допиши квадрат разницы двумя цифрами.')],
    ex: '53² → 25 + 3 = 28, 3² = 09 → 2809', gen: () => powProblem(rand(41, 59)) },
  { id: 'plus99', title: tr('Прибавить 99, 199, 999'), icon: 'add',
    steps: [tr('Прибавь круглое число: 100, 200, 1000.'), tr('Отними лишнее: 1.')],
    ex: '347 + 99 = 447 − 1 = 446', gen: () => (rnd() < 0.6 ? makeProblem('add', rand(100, 899), pick([99, 199, 98])) : makeProblem('sub', rand(300, 999), pick([99, 199, 98]))) },
  { id: 'div5', title: tr('Деление на 5'), icon: 'div',
    steps: [tr('Умножь число на 2.'), tr('Раздели на 10 — убери ноль.')],
    ex: '340 ÷ 5 = 680 ÷ 10 = 68', gen: () => makeProblem('div', rand(12, 99) * 5, 5) },
  { id: 'pct10', title: tr('10%, 5% и 15%'), icon: 'pct',
    steps: [tr('10% — сдвинь запятую на один знак влево.'), tr('5% — половина от 10%.'), tr('15% = 10% + 5%, 20% = 10% × 2.')],
    ex: tr('15% от 240 = 24 + 12 = 36'),
    gen: () => { const p = pick([5, 10, 15, 20, 30]); const base = 20 * rand(3, 50); return { op: 'pct', text: tr('{0}% от {1}', p, base), html: tr('{0}% от {1} = ?', p, base), answer: String((base * p) / 100), kind: 'int' }; } },
];

/* ---------- Уроки по темам: идея, пример, совет ---------- */

const LESSONS = {
  add: [tr('Складывай по разрядам слева направо: сначала десятки, потом единицы.'), '47 + 38 = 70 + 15 = 85', tr('Округляй удобно: 47 + 38 = 47 + 40 − 2.')],
  sub: [tr('Вычитай по частям: сначала круглое, потом остаток.'), '83 − 47 = 83 − 40 − 7 = 36', tr('Или считай «сколько добавить»: от 47 до 83 — это 3 + 33 = 36.')],
  mul: [tr('Разложи одно число на удобные части.'), '23 × 7 = 20 × 7 + 3 × 7 = 161', tr('Выучи таблицу до 12 × 12 — дальше всё строится на ней.')],
  div: [tr('Деление — это умножение наоборот: какое число × делитель даст делимое?'), '96 ÷ 8 → 8 × 12 = 96', tr('Дели по частям: 96 = 80 + 16 → 10 + 2.')],
  pow: [tr('Квадрат — число, умноженное на себя. Куб — трижды.'), '13² = 169, 4³ = 64', tr('Запомни квадраты до 25 — они часто встречаются.')],
  pct: [tr('Процент — сотая часть. 1% числа = число ÷ 100.'), tr('25% от 80 = 80 ÷ 4 = 20'), tr('50% — половина, 25% — четверть, 20% — пятая часть.')],
  frac: [tr('Чтобы сложить дроби, приведи их к общему знаменателю.'), '1/3 + 1/4 = 4/12 + 3/12 = 7/12', tr('Умножение: числитель на числитель, знаменатель на знаменатель.')],
  order: [tr('Сначала скобки, потом степени, затем × и ÷, в конце + и −.'), '2 + 3 × 4 = 2 + 12 = 14', tr('Действия одного уровня выполняй слева направо.')],
  neg: [tr('Минус на минус даёт плюс. Вычесть отрицательное — значит прибавить.'), '−3 − (−8) = −3 + 8 = 5', tr('Представь числовую прямую: вправо — плюс, влево — минус.')],
  eq: [tr('Переноси числа на другую сторону с обратным знаком.'), '3x + 5 = 20 → 3x = 15 → x = 5', tr('Проверяй: подставь ответ в уравнение.')],
  dvs: [tr('Признаки делимости помогают не делить столбиком.'), tr('Сумма цифр 2 + 7 + 3 = 12 → 273 делится на 3'), tr('На 6 — если делится и на 2, и на 3.')],
  sets: [tr('N — натуральные, Z — целые, Q — рациональные, I — иррациональные.'), '−7 ∈ Z, 0,5 ∈ Q, √2 ∈ I', tr('Целое — это натуральное, ноль и отрицательные. Дробь — это Q.')],
  digit: [tr('Разряды считаем справа: единицы, десятки, сотни, тысячи.'), tr('В числе 45 678 цифра сотен — 6'), tr('Цифра — это знак, число — то, что она записывает.')],
  lcm: [tr('НОД — наибольшее число, на которое делятся оба; НОК — наименьшее, которое делится на оба.'), 'НОД(12; 18) = 6, НОК(12; 18) = 36', tr('Разложи оба числа на множители: общие дают НОД, все вместе — НОК.')],
  fred: [tr('Числитель и знаменатель делим на общий делитель — значение дроби не меняется.'), '12/18 = 2/3', tr('Расширение — умножаем и числитель, и знаменатель на одно число.')],
  fcmp: [tr('Чтобы сравнить дроби, приведи их к общему знаменателю.'), '5/6 > 3/4, ведь 10/12 > 9/12', tr('Или сравни произведения крест-накрест: 5 · 4 и 3 · 6.')],
  expo: [tr('При умножении показатели складываются, при делении — вычитаются.'), 'a³ · a⁴ = a⁷, (a²)³ = a⁶', tr('Степень в степени — показатели перемножаются.')],
  alg: [tr('Квадрат суммы: (a + b)² = a² + 2ab + b².'), '(x + 3)² = x² + 6x + 9', tr('Не забывай средний член 2ab — это самая частая ошибка.')],
  word: [tr('Выпиши, что известно и что нужно найти.'), tr('3 тетради — 45 → 1 тетрадь — 15 → 7 тетрадей — 105'), tr('Найди «одну часть» — дальше всё просто.')],
  geo: [tr('Периметр — длина границы, площадь — сколько места внутри.'), 'P = 2(a + b), S = a × b', tr('Треугольник 3-4-5 и его кратные — самые частые в задачах.')],
  ratio: [tr('Отношение a : b — это a частей и b частей.'), tr('60 в отношении 1 : 2 → 3 части по 20 → 20 и 40'), tr('Масштаб 1 : 1000 — 1 см на карте = 10 м.')],
  units: [tr('Запомни шаги: мм → см ×10, см → м ×100, м → км ×1000.'), '2,5 km = 2500 m', tr('Для площади шаг возводится в квадрат, для объёма — в куб.')],
  stat: [tr('Среднее = сумма ÷ количество. Медиана — середина упорядоченного ряда.'), tr('Среднее 4, 6, 8 = 18 ÷ 3 = 6'), tr('Пропущенное число: сумма всех минус сумма известных.')],
};

/* ---------- Шпаргалки ---------- */

const SHEETS = [
  { id: 'squares', title: tr('Квадраты 1–30'), icon: 'pow',
    rows: () => Array.from({ length: 30 }, (_, i) => [`${i + 1}²`, (i + 1) ** 2]) },
  { id: 'cubes', title: tr('Кубы 1–10'), icon: 'solid',
    rows: () => Array.from({ length: 10 }, (_, i) => [`${i + 1}³`, (i + 1) ** 3]) },
  { id: 'pow2', title: tr('Степени двойки'), icon: 'expo',
    rows: () => Array.from({ length: 13 }, (_, i) => [`2${supText(i)}`, 2 ** i]) },
  { id: 'fracs', title: tr('Дроби, десятичные, проценты'), icon: 'frac',
    rows: () => [['1/2', '0,5 · 50%'], ['1/3', '0,333 · 33⅓%'], ['1/4', '0,25 · 25%'], ['3/4', '0,75 · 75%'], ['1/5', '0,2 · 20%'], ['2/5', '0,4 · 40%'], ['1/8', '0,125 · 12,5%'], ['3/8', '0,375 · 37,5%'], ['1/10', '0,1 · 10%'], ['1/20', '0,05 · 5%'], ['1/25', '0,04 · 4%'], ['1/50', '0,02 · 2%']] },
  { id: 'primes', title: tr('Простые числа до 100'), icon: 'dvs',
    rows: () => [[tr('до 50'), '2 3 5 7 11 13 17 19 23 29 31 37 41 43 47'], [tr('до 100'), '53 59 61 67 71 73 79 83 89 97']] },
  { id: 'formulas', title: tr('Формулы геометрии'), icon: 'geo',
    rows: () => [[tr('Квадрат'), 'P = 4a · S = a²'], [tr('Прямоугольник'), 'P = 2(a + b) · S = ab'], [tr('Треугольник'), 'S = a · h ÷ 2'], [tr('Прямоугольный треугольник'), 'c² = a² + b²'], [tr('Круг'), 'C = 2πr · S = πr²'], [tr('Куб'), 'V = a³ · S = 6a²'], [tr('Параллелепипед'), 'V = abc · S = 2(ab + bc + ac)'], [tr('Сумма углов треугольника'), '180°']] },
  { id: 'algebra', title: tr('Формулы сокращённого умножения'), icon: 'alg',
    rows: () => [['(a + b)²', 'a² + 2ab + b²'], ['(a − b)²', 'a² − 2ab + b²'], ['a² − b²', '(a − b)(a + b)'], ['aᵐ · aⁿ', 'aᵐ⁺ⁿ'], ['aᵐ : aⁿ', 'aᵐ⁻ⁿ'], ['(aᵐ)ⁿ', 'aᵐⁿ'], ['a⁰', '1']] },
  { id: 'units', title: tr('Единицы измерения'), icon: 'units',
    rows: () => [['1 km', '1000 m'], ['1 m', '100 cm = 1000 mm'], ['1 t', '1000 kg'], ['1 kg', '1000 g'], ['1 l', '1000 ml = 1 dm³'], ['1 m³', '1000 l'], ['1 ha', '10 000 m²'], ['1 m²', '10 000 cm²'], ['1 h', '60 min = 3600 s']] },
];

/* ---------- Карточки для запоминания (система Лейтнера) ---------- */

const DECKS = {
  squares: { title: tr('Квадраты 11–30'), cards: () => Array.from({ length: 20 }, (_, i) => [`${i + 11}²`, String((i + 11) ** 2)]) },
  cubes: { title: tr('Кубы 2–10'), cards: () => Array.from({ length: 9 }, (_, i) => [`${i + 2}³`, String((i + 2) ** 3)]) },
  pow2: { title: tr('Степени двойки'), cards: () => Array.from({ length: 12 }, (_, i) => [`2${supText(i + 1)}`, String(2 ** (i + 1))]) },
  fracs: { title: tr('Дроби → проценты'), cards: () => SHEETS.find(s => s.id === 'fracs').rows().map(([a, b]) => [a, b.split(' · ')[1]]) },
  table: { title: tr('Трудные из таблицы'), cards: () => [[6, 7], [6, 8], [7, 8], [7, 9], [8, 9], [6, 9], [7, 7], [8, 8], [12, 7], [12, 8], [12, 9], [11, 12], [12, 12], [13, 7], [14, 6], [15, 8]].map(([a, b]) => [`${a} × ${b}`, String(a * b)]) },
  formulas: { title: tr('Формулы'), cards: () => [...SHEETS.find(s => s.id === 'algebra').rows(), ...SHEETS.find(s => s.id === 'formulas').rows()].map(([a, b]) => [a, b]) },
};

const BOX_DAYS = [0, 1, 3, 7, 14];

function deckState(id) {
  data.cards ||= {};
  return (data.cards[id] ||= {});
}

function deckDue(id) {
  const st = deckState(id);
  const now = Date.now();
  return DECKS[id].cards().map((c, i) => ({ c, i, box: st[i]?.box || 0, due: st[i]?.due || 0 })).filter(x => x.due <= now);
}

let flash = null;

function startDeck(id) {
  const due = shuffle(deckDue(id)).slice(0, 12);
  if (!due.length) { toast(tr('На сегодня всё повторено — загляни завтра')); return; }
  flash = { id, queue: due, i: 0, known: 0, flipped: false };
  navigate('flash');
}

function renderFlash() {
  if (!flash) { navigate('learn'); return; }
  const cur = flash.queue[flash.i];
  const done = !cur;
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="learn">‹ ${tr('Учебник')}</button>
    <h1 class="page-title">${escH(DECKS[flash.id].title)}</h1>
    ${done ? `
      <div class="card glow flash-done">
        <span class="fh-ico">${ico('trophy')}</span>
        <h2>${tr('Колода пройдена')}</h2>
        <p class="muted">${tr('Знаю: {0} из {1}. Остальные вернутся завтра.', flash.known, flash.queue.length)}</p>
        <button class="btn primary big block" data-action="nav" data-view="learn">${tr('Готово')}</button>
      </div>` : `
      <div class="flash-count">${flash.i + 1} / ${flash.queue.length}</div>
      <button class="flash-card ${flash.flipped ? 'flipped' : ''}" data-action="flash-flip" aria-label="${tr('Перевернуть')}">
        <span class="flash-face front"><b>${escH(cur.c[0])}</b><small>${tr('Нажми, чтобы увидеть ответ')}</small></span>
        <span class="flash-face back"><b>${escH(cur.c[1])}</b><small>${escH(cur.c[0])}</small></span>
      </button>
      <div class="flash-btns ${flash.flipped ? '' : 'hidden'}">
        <button class="btn big" data-action="flash-again">${ico('undo')} ${tr('Ещё раз')}</button>
        <button class="btn primary big" data-action="flash-know">${ico('star')} ${tr('Знаю')}</button>
      </div>`}`;
}
Hooks.view('flash', renderFlash);

function flashAnswer(know) {
  const cur = flash.queue[flash.i];
  const st = deckState(flash.id);
  const box = know ? Math.min(BOX_DAYS.length - 1, (st[cur.i]?.box || 0) + 1) : 0;
  st[cur.i] = { box, due: Date.now() + BOX_DAYS[box] * 864e5 - 3600e3 };
  if (know) { flash.known++; Sound.correct(flash.known); } else { Sound.click(); flash.queue.push({ ...cur }); }
  flash.i++;
  flash.flipped = false;
  saveData();
  renderFlash();
}

/* ---------- Словарь ---------- */

const GLOSSARY = [
  [tr('Сумма'), tr('Результат сложения'), '3 + 4 = 7'],
  [tr('Разность'), tr('Результат вычитания'), '9 − 4 = 5'],
  [tr('Произведение'), tr('Результат умножения'), '3 × 4 = 12'],
  [tr('Частное'), tr('Результат деления'), '12 ÷ 4 = 3'],
  [tr('Делитель'), tr('Число, на которое делится другое без остатка'), tr('3 — делитель 12')],
  [tr('Кратное'), tr('Число, которое делится на данное без остатка'), tr('12 кратно 3')],
  [tr('Простое число'), tr('Делится только на 1 и на себя'), '2, 3, 5, 7, 11'],
  [tr('Составное число'), tr('Имеет делители кроме 1 и себя'), '4, 6, 9, 12'],
  [tr('НОД'), tr('Наибольший общий делитель двух чисел'), tr('НОД(12, 18) = 6')],
  [tr('НОК'), tr('Наименьшее общее кратное двух чисел'), tr('НОК(4, 6) = 12')],
  [tr('Числитель'), tr('Верхнее число дроби — сколько частей взяли'), tr('в 3/4 числитель 3')],
  [tr('Знаменатель'), tr('Нижнее число дроби — на сколько частей делим'), tr('в 3/4 знаменатель 4')],
  [tr('Процент'), tr('Сотая часть числа'), '1% = 1/100'],
  [tr('Степень'), tr('Произведение одинаковых множителей'), '2⁴ = 2 · 2 · 2 · 2 = 16'],
  [tr('Корень'), tr('Число, квадрат которого равен данному'), '√49 = 7'],
  [tr('Уравнение'), tr('Равенство с неизвестным'), 'x + 3 = 8'],
  [tr('Периметр'), tr('Длина границы фигуры'), tr('P квадрата = 4a')],
  [tr('Площадь'), tr('Сколько места занимает фигура'), tr('S квадрата = a²')],
  [tr('Объём'), tr('Сколько места занимает тело'), tr('V куба = a³')],
  [tr('Гипотенуза'), tr('Самая длинная сторона прямоугольного треугольника'), 'c² = a² + b²'],
  [tr('Катет'), tr('Сторона прямоугольного треугольника у прямого угла'), '3, 4 → 5'],
  [tr('Пропорция'), tr('Равенство двух отношений'), '2 : 3 = 4 : 6'],
  [tr('Масштаб'), tr('Во сколько раз уменьшено изображение'), tr('1 : 100 — 1 см = 1 м')],
  [tr('Среднее арифметическое'), tr('Сумма чисел, делённая на их количество'), '(2 + 4 + 9) ÷ 3 = 5'],
  [tr('Медиана'), tr('Среднее число упорядоченного ряда'), tr('1, 3, 8 → 3')],
  [tr('Остаток'), tr('Что осталось после деления нацело'), tr('17 ÷ 5 = 3, остаток 2')],
];

/* ---------- Экран «Учебник» ---------- */

let learnTab = 'tricks';

function renderLearn() {
  const tabs = { chapters: tr('Главы'), tricks: tr('Приёмы'), lessons: tr('Уроки'), sheets: tr('Шпаргалки'), cards: tr('Карточки'), words: tr('Словарь') };
  let body = '';
  if (learnTab === 'chapters') {
    body = `<p class="hint">${tr('Главы как в учебнике: 20 заданий подряд по темам главы.')}</p>
      <div class="learn-list">${SCHOOL_CHAPTERS.map(ch => `
        <button class="row-card learn-row" data-action="school-start" data-id="${ch.id}">
          <span class="icon-sq sm">${opIco(ch.icon)}</span>
          <span class="row-main"><b>${ch.num} ${escH(ch.name)}</b><small>${ch.ops.map(o => OPS[o].name).join(' · ')}</small></span>
          <span class="chev">›</span>
        </button>`).join('')}</div>`;
  } else if (learnTab === 'tricks') {
    body = `<div class="learn-list">${TRICKS.map(t => `
      <button class="row-card learn-row" data-action="trick-open" data-id="${t.id}">
        <span class="icon-sq sm">${opIco(t.icon)}</span>
        <span class="row-main"><b>${escH(t.title)}</b><small>${escH(t.ex)}</small></span>
        <span class="chev">›</span>
      </button>`).join('')}</div>`;
  } else if (learnTab === 'lessons') {
    body = `<div class="learn-list">${Object.keys(LESSONS).filter(op => OPS[op]).map(op => `
      <button class="row-card learn-row" data-action="lesson-open" data-op="${op}">
        <span class="icon-sq sm">${opIco(op)}</span>
        <span class="row-main"><b>${OPS[op].name}</b><small>${escH(LESSONS[op][0])}</small></span>
        <span class="chev">›</span>
      </button>`).join('')}</div>`;
  } else if (learnTab === 'sheets') {
    body = `
      <button class="row-card learn-row" data-action="div-rules">
        <span class="icon-sq sm">${opIco('dvs')}</span>
        <span class="row-main"><b>${tr('Признаки делимости')}</b><small>${tr('Как за секунду понять, делится ли число')}</small></span>
        <span class="chev">›</span>
      </button>
      ${SHEETS.map(sh => `
      <details class="card sheet">
        <summary><span class="icon-sq sm">${opIco(sh.icon)}</span><b>${escH(sh.title)}</b><span class="chev">›</span></summary>
        <div class="sheet-grid ${sh.rows()[0][1].toString().length > 12 ? 'wide' : ''}">
          ${sh.rows().map(([a, b]) => `<span class="sh-a">${escH(a)}</span><span class="sh-b">${escH(b)}</span>`).join('')}
        </div>
      </details>`).join('')}`;
  } else if (learnTab === 'cards') {
    body = `<p class="hint">${tr('Карточки возвращаются по расписанию: через день, три дня, неделю, две недели. Так запоминается надолго.')}</p>
      <div class="deck-grid">${Object.entries(DECKS).map(([id, d]) => {
        const total = d.cards().length;
        const st = deckState(id);
        const learned = Object.values(st).filter(x => x.box >= 3).length;
        const due = deckDue(id).length;
        return `
        <button class="deck ${due ? 'due' : ''}" data-action="deck-start" data-id="${id}">
          <span class="deck-ico">${ico('cards')}</span>
          <b>${escH(d.title)}</b>
          <span class="part-bar"><i style="width:${(learned / total) * 100}%"></i></span>
          <small>${due ? tr('К повторению: {0}', due) : tr('Выучено {0} из {1}', learned, total)}</small>
        </button>`;
      }).join('')}</div>`;
  } else {
    body = `
      <input class="dlg-input glossary-search" type="search" placeholder="${tr('Найти термин')}" data-glossary="1" autocomplete="off">
      <div class="glossary">${GLOSSARY.map(([t, d, ex]) => `
        <div class="gl-row" data-term="${escH(`${t} ${d}`.toLowerCase())}">
          <b>${escH(t)}</b><span>${escH(d)}</span><code>${escH(ex)}</code>
        </div>`).join('')}</div>`;
  }
  $('#app').innerHTML = `
    <h1 class="page-title">${tr('Учебник')}</h1>
    <div class="segmented learn-tabs">
      ${Object.entries(tabs).map(([k, l]) => `<button class="${learnTab === k ? 'on' : ''}" data-action="learn-tab" data-v="${k}">${l}</button>`).join('')}
    </div>
    <div class="learn-body">${body}</div>`;
}
Hooks.view('learn', renderLearn);

document.addEventListener('input', e => {
  if (!e.target.dataset?.glossary) return;
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.gl-row').forEach(r => { r.hidden = q && !r.dataset.term.includes(q); });
});

function openTrick(id) {
  const t = TRICKS.find(x => x.id === id);
  if (!t) return;
  Dialog.open({
    icon: 'bulb',
    title: t.title,
    html: `<ol class="lesson-steps">${t.steps.map(s => `<li>${escH(s)}</li>`).join('')}</ol><div class="lesson-ex">${escH(t.ex)}</div>`,
    buttons: [{ label: tr('Закрыть'), value: false, kind: 'ghost' }, { label: tr('Потренировать'), value: true, kind: 'primary' }],
    dismiss: { button: false },
  }).then(res => { if (res?.button) startGame('trick', { trick: id }); });
}

function openLesson(op) {
  const [idea, ex, tip] = LESSONS[op] || [];
  if (!idea) return;
  Dialog.open({
    icon: 'book',
    title: OPS[op].name,
    html: `<div class="lesson">
      <div class="lesson-part"><small>${tr('Идея')}</small><p>${escH(idea)}</p></div>
      <div class="lesson-part"><small>${tr('Пример')}</small><div class="lesson-ex">${escH(ex)}</div></div>
      <div class="lesson-part"><small>${tr('Совет')}</small><p>${escH(tip)}</p></div>
    </div>`,
    buttons: [{ label: tr('Закрыть'), value: false, kind: 'ghost' }, { label: tr('Потренировать'), value: true, kind: 'primary' }],
    dismiss: { button: false },
  }).then(res => {
    if (!res?.button) return;
    const s = data.settings;
    s.ops = [op];
    delete s.opWeights;
    if (['table', 'mistakes'].includes(s.mode)) s.mode = 'practice';
    saveData();
    startGame(s.mode === 'ladder' ? 'practice' : s.mode);
  });
}

Hooks.on('action', (action, el) => {
  switch (action) {
    case 'learn-tab': learnTab = el.dataset.v; renderLearn(); return true;
    case 'school-start': startGame('school', { chapter: el.dataset.id }); return true;
    case 'trick-open': openTrick(el.dataset.id); return true;
    case 'lesson-open': openLesson(el.dataset.op); return true;
    case 'deck-start': startDeck(el.dataset.id); return true;
    case 'flash-flip':
      flash.flipped = !flash.flipped;
      el.classList.toggle('flipped', flash.flipped);
      document.querySelector('.flash-btns')?.classList.toggle('hidden', !flash.flipped);
      Sound.click();
      return true;
    case 'flash-know': flashAnswer(true); return true;
    case 'flash-again': flashAnswer(false); return true;
    default: return false;
  }
});

// Вход в учебник с главной и из тренировки
Hooks.on('dashAfterTip', () => {
  const started = Object.values(data.cards || {}).some(x => Object.keys(x).length);
  const due = started ? Object.keys(DECKS).reduce((n, id) => n + deckDue(id).length, 0) : 0;
  return `
    <button class="row-card learn-entry" data-action="nav" data-view="learn">
      <span class="icon-sq sm">${ico('book')}</span>
      <span class="row-main"><b>${tr('Учебник')}</b><small>${tr('Приёмы, уроки, шпаргалки, карточки и словарь')}</small></span>
      ${started && due ? `<span class="tag">${due} ${plural(due, 'карточка', 'карточки', 'карточек')}</span>` : ''}
      <span class="chev">›</span>
    </button>`;
});
Hooks.on('trainingTop', () => `
  <button class="row-card learn-entry slim" data-action="nav" data-view="learn">
    <span class="icon-sq sm">${ico('book')}</span>
    <span class="row-main"><b>${tr('Учебник')}</b><small>${tr('12 приёмов устного счёта с тренировкой')}</small></span>
    <span class="chev">›</span>
  </button>`);
