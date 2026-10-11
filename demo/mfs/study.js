'use strict';

/* =========================================================
   Учёба: разбор ошибки на месте, типы ошибок, план на неделю,
   математический диктант, счёт столбиком и печатные листы.
   ========================================================= */

/* ---------- Типы ошибок ---------- */

// Почему ответ неверный: по разнице между ответом и правильным
const ERR_KINDS = {
  time: () => tr('Не успел'),
  sign: () => tr('Перепутан знак'),
  one: () => tr('Ошибка на единицу'),
  place: () => tr('Потерян разряд'),
  swap: () => tr('Переставлены цифры'),
  size: () => tr('Не тот порядок числа'),
  other: () => tr('Посчитано неверно'),
};

function errorKind(p, given) {
  if (given === null || given === undefined) return 'time';
  const a = Number(p.answer);
  const g = Number(given);
  if (!Number.isFinite(a) || !Number.isFinite(g)) return 'other';
  if (a !== 0 && g === -a) return 'sign';
  const d = Math.abs(g - a);
  if (d === 1) return 'one';
  if ([10, 100, 1000, 10000].includes(d)) return 'place';
  const digits = x => String(Math.abs(x)).split('').sort().join('');
  if (g !== a && digits(g) === digits(a)) return 'swap';
  if (String(Math.abs(g)).length !== String(Math.abs(a)).length) return 'size';
  return 'other';
}

const errStats = d => (d.errKinds ||= {});

// Подпись под неверным ответом и подсчёт за всё время
Hooks.on('afterAnswer', (g, ok, ms, p, given) => {
  if (ok) { g.lastWrong = null; return; }
  const kind = errorKind(p, given);
  g.lastWrong = { kind, p, given };
  errStats(data)[kind] = (errStats(data)[kind] || 0) + 1;
  const fb = document.getElementById('gFeedback');
  if (!fb) return;
  fb.insertAdjacentHTML('beforeend', `<span class="fb-rule err-kind">${ico('bulb')}${escH(ERR_KINDS[kind]())}</span>`);
  FX.drawIcons(fb);
});

// Разбор ошибки прямо в игре: там, где нет общего таймера, игра ждёт, пока разберёшься
const REVIEW_MODES = ['practice', 'mistakes', 'table'];
const reviewOn = g => data.settings.wrongReview !== false && !g.silent && !g.timeLimit
  && (REVIEW_MODES.includes(g.mode) || g.pathLevel || g.chapter);

Hooks.on('holdAfter', g => {
  const w = g.lastWrong;
  if (!w || !reviewOn(g)) return false;
  g.lastWrong = null;
  g.locked = true;
  const card = document.getElementById('gCard');
  if (!card) return false;
  card.insertAdjacentHTML('beforeend', `
    <div class="why-sheet">
      <b>${escH(ERR_KINDS[w.kind]())}</b>
      ${whyBody(w.p)}
      <p class="why-hint">${escH(ERR_HINTS[w.kind]())}</p>
      <button class="btn primary big block" data-action="why-next">${tr('Дальше')} ›</button>
    </div>`);
  FX.drawIcons(card.querySelector('.why-sheet'));
  return true;
});

function whyBody(p) {
  const lesson = LESSONS[p.op];
  const steps = p.steps?.length ? p.steps : null;
  const rule = p.rule === 'prime' ? DIV_PRIME : p.rule ? divRule(p.rule) : null;
  return `
    <div class="why-task">${p.html.replace(/\?/g, '')} <b>${answerHtml(p.answer)}</b></div>
    ${steps ? `<div class="why-steps">${steps.map(s => `<span>${escH(s)}</span>`).join('')}</div>` : ''}
    ${rule ? `<div class="why-rule">${escH(rule.rule)}</div>` : ''}
    ${!steps && lesson ? `<div class="why-rule">${escH(lesson[0])}</div>` : ''}`;
}

function whyNext() {
  const g = game;
  document.querySelector('.why-sheet')?.remove();
  if (!g || g.ended) return;
  g.locked = false;
  nextProblem();
}

const ERR_HINTS = {
  time: () => tr('Считай вслух по частям — так быстрее, чем «в уме целиком».'),
  sign: () => tr('Сначала посчитай без знаков, потом поставь знак результата.'),
  one: () => tr('Чаще всего это сбой на границе десятка. Проверь последнюю цифру.'),
  place: () => tr('Потерялся перенос в следующий разряд. Складывай разряды по очереди.'),
  swap: () => tr('Цифры верные, порядок нет. Проговаривай ответ вслух, прежде чем вводить.'),
  size: () => tr('Прикинь порядок: примерно сколько должно получиться?'),
  other: () => tr('Разбери решение по шагам — ниже видно каждый шаг.'),
};

// Разбор типов ошибок на экране статистики
Hooks.on('statsMid', () => {
  const e = errStats(data);
  const list = Object.entries(e).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (!list.length) return '';
  const total = list.reduce((a, [, n]) => a + n, 0);
  return `
    <section class="card err-card">
      <div class="row-head"><span class="icon-sq sm">${ico('bandage')}</span><span class="gold">${tr('Какие ошибки чаще')}</span></div>
      ${list.map(([k, n]) => `
        <div class="err-row">
          <span class="err-name">${escH(ERR_KINDS[k]())}</span>
          <span class="part-bar"><i style="width:${Math.round((n / total) * 100)}%"></i></span>
          <b>${n}</b>
        </div>`).join('')}
      <p class="hint">${escH(ERR_HINTS[list[0][0]]())}</p>
    </section>`;
});

/* ---------- План на неделю ---------- */

// Самые слабые темы: мало верных и медленно
function weakOps(d, n = 7) {
  const stats = Object.entries(d.opStats || {}).filter(([op]) => OPS[op]);
  const scored = stats.map(([op, s]) => {
    const acc = s.n ? s.c / s.n : 0;
    const speed = s.c ? s.t / s.c : 9000;
    const seen = Math.min(1, (s.n || 0) / 60);
    // чем меньше, тем слабее тема; незнакомые темы идут сразу после слабых
    return { op, score: s.n < 10 ? 0.35 : acc * 0.7 + (1 - Math.min(1, speed / 9000)) * 0.3 * seen };
  }).sort((a, b) => a.score - b.score);
  const out = [];
  for (const x of scored) { if (!out.includes(x.op)) out.push(x.op); if (out.length >= n) break; }
  return out.length ? out : ['add', 'sub', 'mul', 'div', 'pct', 'frac', 'order'];
}

function planState(d) {
  const w = weekId();
  if (!d.plan || d.plan.w !== w) {
    const ops = weakOps(d, 7);
    d.plan = { w, days: Array.from({ length: 7 }, (_, i) => ({ op: ops[i % ops.length], done: false })) };
  }
  return d.plan;
}

const planToday = () => (new Date().getDay() + 6) % 7; // понедельник = 0

Hooks.on('dashStack', d => {
  const pl = planState(d);
  const i = planToday();
  const day = pl.days[i];
  const doneN = pl.days.filter(x => x.done).length;
  return `
    <button class="row-card plan-card ${day.done ? 'done' : ''}" data-action="plan-go">
      <span class="icon-sq sm">${ico('clipboard')}</span>
      <span class="row-main">
        <b>${day.done ? tr('План на сегодня выполнен') : tr('План на сегодня: {0}', OPS[day.op].name)}</b>
        <small>${tr('Неделя: {0} из 7 дней', doneN)}</small>
        <span class="plan-week">${pl.days.map((x, k) => `<i class="${x.done ? 'on' : ''} ${k === i ? 'now' : ''}"></i>`).join('')}</span>
      </span>
      <span class="chev">›</span>
    </button>`;
});

// План выполнен, если в тренировке была нужная тема
Hooks.on('gameEnd', (g, session) => {
  const pl = planState(data);
  const day = pl.days[planToday()];
  if (!day.done && session.correct >= 10 && (g.settings.ops || []).includes(day.op)) {
    day.done = true;
    data.coins = (data.coins || 0) + 25;
  }
});

/* ---------- Математический диктант ---------- */

const DICT_COUNT = 10;
let dictation = null;

function renderDictation() {
  const st = dictation;
  const body = !st ? `
      <p class="hint">${tr('Примеры читаются вслух по одному. Запиши ответы на бумаге или сразу в поля ниже, а потом проверь себя.')}</p>
      <div class="dict-start">
        <button class="btn primary big block" data-action="dict-go">${ico('ear')} ${tr('Начать диктант')}</button>
      </div>`
    : st.phase === 'speak' ? `
      <div class="dict-speak">
        <div class="dict-num">${st.i + 1} / ${DICT_COUNT}</div>
        <span class="dict-ear">${ico('ear')}</span>
        <p class="hint">${tr('Слушай и записывай. Повтор — кнопкой.')}</p>
        <button class="btn big block" data-action="dict-again">${tr('Повторить')}</button>
        <button class="btn ghost block" data-action="dict-stop">${tr('Остановить')}</button>
      </div>`
    : `
      <div class="dict-check">
        ${st.items.map((p, k) => `
          <label class="dict-row ${st.res ? (st.res[k] ? 'ok' : 'bad') : ''}">
            <span class="dict-i">${k + 1}</span>
            <span class="dict-task">${st.res ? p.html : ''}</span>
            <input class="dict-input" inputmode="numeric" data-k="${k}" value="${escH(st.ans[k] || '')}" ${st.res ? 'disabled' : ''}>
            ${st.res && !st.res[k] ? `<b class="dict-right">${answerHtml(p.answer)}</b>` : ''}
          </label>`).join('')}
        ${st.res
          ? `<div class="dict-done">${tr('Верно: {0} из {1}', st.res.filter(Boolean).length, DICT_COUNT)}</div>
             <button class="btn primary big block" data-action="dict-new">${tr('Ещё диктант')}</button>`
          : `<button class="btn primary big block" data-action="dict-check">${tr('Проверить')}</button>`}
      </div>`;
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="learn">‹ ${tr('Учебник')}</button>
    <h1 class="page-title">${tr('Диктант')}</h1>
    ${body}`;
  FX.drawIcons($('#app'));
}
Hooks.view('dictation', renderDictation);

function dictStart() {
  const s = data.settings;
  const ops = (s.ops || []).filter(o => !['cmp', 'alg', 'sets', 'fcmp', 'frac', 'fred'].includes(o));
  const settings = { ...s, ops: ops.length ? ops : ['add', 'sub', 'mul', 'div'], intOnly: true, adaptive: false };
  const items = [];
  for (let i = 0; i < DICT_COUNT; i++) items.push(genProblem(settings, 'practice'));
  dictation = { phase: 'speak', i: 0, items, ans: Array(DICT_COUNT).fill(''), res: null, timer: null };
  renderDictation();
  dictSpeak();
}

function dictSpeak() {
  const st = dictation;
  if (!st || st.phase !== 'speak') return;
  Native.speak(spokenText(st.items[st.i]));
  clearTimeout(st.timer);
  st.timer = setTimeout(() => {
    if (!dictation || dictation !== st) return;
    st.i++;
    if (st.i >= DICT_COUNT) { st.phase = 'check'; renderDictation(); return; }
    renderDictation();
    dictSpeak();
  }, 5200);
}

function dictCheck() {
  const st = dictation;
  st.res = st.items.map((p, k) => String(st.ans[k] ?? '').trim() === String(p.answer));
  const right = st.res.filter(Boolean).length;
  data.xp += right * 3;
  data.coins = (data.coins || 0) + right * 2;
  saveData();
  Sound.end();
  renderDictation();
}

document.addEventListener('input', e => {
  const k = e.target?.dataset?.k;
  if (k === undefined || !e.target.classList.contains('dict-input') || !dictation) return;
  dictation.ans[Number(k)] = e.target.value;
});

/* ---------- Счёт столбиком ---------- */

const COLUMN_TASKS = 6;
let column = null;

function makeColumnTask(level) {
  const kind = pick(['add', 'add', 'sub', 'mul']);
  const big = { easy: [10, 99], medium: [100, 999], hard: [1000, 9999] }[level] || [100, 999];
  if (kind === 'mul') {
    const a = rand(big[0], big[1]);
    const b = rand(2, 9);
    return { kind, a, b, sign: '×', answer: String(a * b) };
  }
  let a = rand(big[0], big[1]);
  let b = rand(big[0], big[1]);
  if (kind === 'sub' && a < b) [a, b] = [b, a];
  return { kind, a, b, sign: kind === 'add' ? '+' : '−', answer: String(kind === 'add' ? a + b : a - b) };
}

function renderColumn() {
  const st = column;
  if (!st) { $('#app').innerHTML = ''; return; }
  if (st.done) {
    $('#app').innerHTML = `
      <button class="back-link" data-action="nav" data-view="learn">‹ ${tr('Учебник')}</button>
      <h1 class="page-title">${tr('Столбиком')}</h1>
      <section class="card glow col-done">
        <b class="big-score">${st.right}</b>
        <p>${tr('Верно: {0} из {1}', st.right, COLUMN_TASKS)}</p>
        <button class="btn primary big block" data-action="col-new">${tr('Ещё раз')}</button>
      </section>`;
    return;
  }
  const t = st.task;
  const w = Math.max(String(t.a).length, String(t.b).length, t.answer.length) + 1;
  const cells = (text, cls = '') => {
    const pad = ' '.repeat(w - String(text).length) + String(text);
    return pad.split('').map(ch => `<span class="col-cell ${cls}">${ch === ' ' ? '' : ch}</span>`).join('');
  };
  const ansCells = Array.from({ length: w }, (_, i) => {
    const pos = w - 1 - i;                      // 0 — единицы
    const idx = t.answer.length - 1 - pos;
    const need = idx >= 0;
    const v = st.input[pos] || '';
    const bad = st.checked && need && v !== t.answer[idx];
    const good = st.checked && need && v === t.answer[idx];
    return `<button class="col-cell in ${st.pos === pos ? 'now' : ''} ${bad ? 'bad' : ''} ${good ? 'ok' : ''}" data-action="col-pos" data-p="${pos}">${v}</button>`;
  }).join('');
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="learn">‹ ${tr('Учебник')}</button>
    <h1 class="page-title">${tr('Столбиком')}</h1>
    <div class="col-head"><span>${tr('Пример {0} из {1}', st.n + 1, COLUMN_TASKS)}</span><span class="gold">${tr('Верно: {0}', st.right)}</span></div>
    <section class="card col-card">
      <div class="col-grid" style="--w:${w}">
        <div class="col-line">${cells(t.a)}</div>
        <div class="col-line"><span class="col-sign">${t.sign}</span>${cells(t.b)}</div>
        <div class="col-rule"></div>
        <div class="col-line ans">${ansCells}</div>
      </div>
      <p class="hint">${tr('Заполняй справа налево: сначала единицы, потом десятки.')}</p>
    </section>
    <div class="numpad col-pad">
      ${(data.settings.padLayout === 'calc' ? [7, 8, 9, 4, 5, 6, 1, 2, 3] : [1, 2, 3, 4, 5, 6, 7, 8, 9]).map(n => `<button data-action="col-key" data-k="${n}">${n}</button>`).join('')}
      <button data-action="col-key" data-k="back">${ico('backspace')}</button>
      <button data-action="col-key" data-k="0">0</button>
      <button class="np-ok" data-action="col-check">${st.checked ? tr('Дальше') : 'OK'}</button>
    </div>`;
  FX.drawIcons($('#app'));
}
Hooks.view('column', renderColumn);

function colStart() {
  column = { n: 0, right: 0, task: makeColumnTask(data.settings.level), input: {}, pos: 0, checked: false, done: false };
  renderColumn();
}

function colKey(k) {
  const st = column;
  if (!st || st.checked) return;
  if (k === 'back') { st.input[st.pos] = ''; st.pos = Math.min(st.pos + 1, 9); }
  else { st.input[st.pos] = k; st.pos++; }
  Sound.click();
  renderColumn();
}

function colCheck() {
  const st = column;
  if (!st) return;
  if (st.checked) {
    st.n++;
    if (st.n >= COLUMN_TASKS) {
      st.done = true;
      data.xp += st.right * 4;
      data.coins = (data.coins || 0) + st.right * 3;
      saveData();
    } else {
      st.task = makeColumnTask(data.settings.level);
      st.input = {};
      st.pos = 0;
      st.checked = false;
    }
    renderColumn();
    return;
  }
  const got = Array.from({ length: st.task.answer.length }, (_, i) => st.input[st.task.answer.length - 1 - i] || '0').join('');
  const ok = Number(got) === Number(st.task.answer);
  st.checked = true;
  if (ok) { st.right++; Sound.correct(st.right); } else Sound.wrong();
  renderColumn();
}

/* ---------- Печатный лист с примерами ---------- */

async function sheetImage(ops, count, level) {
  const W = 1240, H = 1754;                 // A4 при 150 dpi
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#111';
  ctx.font = '700 46px Outfit, sans-serif';
  ctx.fillText('Math for Speed', 70, 100);
  ctx.font = '400 28px Inter, sans-serif';
  ctx.fillStyle = '#555';
  ctx.fillText(`${ops.map(o => OPS[o].name).join(' · ')} · ${LEVELS[level].name}`, 70, 145);
  ctx.fillText(`${tr('Имя')}: ______________________    ${tr('Дата')}: ____________`, 70, 200);
  ctx.strokeStyle = '#ddd';
  ctx.beginPath(); ctx.moveTo(70, 230); ctx.lineTo(W - 70, 230); ctx.stroke();

  const items = [];
  const settings = { ops, level, intOnly: true, adaptive: false };
  for (let i = 0; i < count; i++) items.push(genProblem(settings, 'practice'));
  const plain = s => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  ctx.font = '500 34px Inter, sans-serif';
  ctx.fillStyle = '#111';
  const cols = 2;
  const rowH = 78;
  items.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 80 + col * ((W - 160) / cols);
    const y = 300 + row * rowH;
    ctx.fillStyle = '#999';
    ctx.font = '400 24px Inter, sans-serif';
    ctx.fillText(`${i + 1}.`, x, y);
    ctx.fillStyle = '#111';
    ctx.font = '500 34px Inter, sans-serif';
    ctx.fillText(plain(p.html), x + 44, y);
  });
  const lastY = 300 + Math.ceil(items.length / cols) * rowH + 40;
  ctx.strokeStyle = '#eee';
  ctx.beginPath(); ctx.moveTo(70, lastY); ctx.lineTo(W - 70, lastY); ctx.stroke();
  ctx.fillStyle = '#888';
  ctx.font = '400 24px Inter, sans-serif';
  ctx.fillText(tr('Ответы'), 70, lastY + 44);
  const ansText = items.map((p, i) => `${i + 1}) ${plain(answerHtml(p.answer))}`).join('   ');
  const words = ansText.split('   ');
  let line = '';
  let y = lastY + 84;
  for (const wd of words) {
    const test = line ? `${line}   ${wd}` : wd;
    if (ctx.measureText(test).width > W - 160) { ctx.fillText(line, 70, y); y += 36; line = wd; }
    else line = test;
  }
  if (line) ctx.fillText(line, 70, y);
  return c.toDataURL('image/png').split(',')[1];
}

async function makeSheet() {
  const s = data.settings;
  const n = await Dialog.choose({
    icon: 'clipboard',
    title: tr('Лист с примерами'),
    text: tr('Темы берутся из тренировки. Лист с ответами внизу — можно распечатать или отправить.'),
    options: [20, 30, 40].map(v => ({ label: tr('{0} примеров', v), value: v })),
    value: 20,
  });
  if (!n) return;
  const ops = (s.ops || []).filter(o => !['cmp', 'alg', 'sets', 'fcmp'].includes(o));
  shareImage(() => sheetImage(ops.length ? ops : ['add', 'sub', 'mul', 'div'], n, s.level), `math-sheet-${dateKey()}.png`, tr('Лист с примерами'));
}

/* ---------- Кнопки ---------- */

Hooks.on('action', (action, el) => {
  switch (action) {
    case 'why-next': whyNext(); return true;
    case 'plan-go': {
      const day = planState(data).days[planToday()];
      startGame('practice', { settings: { ops: [day.op], adaptive: false } });
      return true;
    }
    case 'dict-go': case 'dict-new': dictStart(); return true;
    case 'dict-again': dictSpeak(); return true;
    case 'dict-stop': { clearTimeout(dictation?.timer); if (dictation) dictation.phase = 'check'; renderDictation(); return true; }
    case 'dict-check': dictCheck(); return true;
    case 'col-start': colStart(); return true;
    case 'col-new': colStart(); return true;
    case 'col-key': colKey(el.dataset.k); return true;
    case 'col-pos': { column.pos = Number(el.dataset.p); renderColumn(); return true; }
    case 'col-check': colCheck(); return true;
    case 'make-sheet': makeSheet(); return true;
    default: return false;
  }
});

// Диктант и столбик начинаются с «Учебника», лист печатается оттуда же
Hooks.on('navigated', view => {
  if (view !== 'dictation') { clearTimeout(dictation?.timer); dictation = null; }
  if (view !== 'column') column = null;
});
