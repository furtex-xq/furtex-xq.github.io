'use strict';

/* =========================================================
   Блоки интерфейса для новых возможностей и режим «Дуэль».
   ========================================================= */

const UI = (() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Главная: задание дня, задание от родителя, приём, повторение ---------- */

  function dailyCard() {
    const dc = dailyChallenge();
    const done = data.dailyChallenge.key === dc.key && data.dailyChallenge.done;
    return `
      <button class="row-card daily-card ${done ? 'done' : ''}" data-action="daily-start">
        <span class="icon-sq sm">${ico('calendar')}</span>
        <span class="row-main">
          <b>${done ? tr('Задание дня выполнено') : tr('Задание дня')} <span class="tag">+50 XP</span></b>
          <small>${MODES[dc.mode].name} · ${LEVELS[dc.level].name} · ${dc.ops.map(o => OPS[o].sym).join(' ')} · ${dc.goalText}</small>
        </span>
        <span class="chev">${done ? '✓' : '›'}</span>
      </button>`;
  }

  function assignmentCard() {
    const a = data.assignment;
    if (!a) return '';
    return `
      <button class="row-card ${a.done ? 'done' : ''}" data-action="assign-start">
        <span class="icon-sq sm">${ico('clipboard')}</span>
        <span class="row-main">
          <b>${a.done ? tr('Задание выполнено') : tr('Задание')} <span class="tag">+40 XP</span></b>
          <small>${tr('{0} · {1} · {2} · {3} верных', MODES[a.mode].name, LEVELS[a.level].name, a.ops.map(o => OPS[o]?.sym || '').join(' '), a.goal)}</small>
        </span>
        <span class="chev">${a.done ? '✓' : '›'}</span>
      </button>`;
  }

  function tipCard() {
    if (!data.settings.tips) return '';
    const tip = tipOfDay();
    return `
      <div class="row-card tip-card">
        <span class="icon-sq sm">${ico('bulb')}</span>
        <span class="row-main"><b>${tr('Приём дня')}</b><small>${esc(tip.text)}</small></span>
      </div>`;
  }

  function reviewCard() {
    const due = dueMistakes().length;
    if (!due) return '';
    return `
      <button class="row-card" data-action="quick" data-mode="mistakes">
        <span class="icon-sq sm">${ico('bandage')}</span>
        <span class="row-main"><b>${tr('Пора повторить: {0} {1}', due, plural(due, 'пример', 'примера', 'примеров'))}</b><small>${tr('Ошибки возвращаются по расписанию: через день, три дня, неделю')}</small></span>
        <span class="chev">›</span>
      </button>`;
  }

  /* ---------- Тренировка: испытания и приём ---------- */

  function challengesBlock() {
    const doneCount = CHALLENGES.filter(c => data.challenges[c.id]).length;
    return `
      <div class="section-title"><h2>${tr('Испытания')}</h2><span>${tr('{0} из {1}', doneCount, CHALLENGES.length)}</span></div>
      <div class="ach-grid ten">
        ${CHALLENGES.map(c => {
          const done = data.challenges[c.id];
          return `
          <div class="ach ${done ? '' : 'locked'}">
            ${done ? '' : `<span class="ach-lock">${ico('lock')}</span>`}
            <span class="ico">${ico(c.icon)}</span><b>${c.name}</b><small>${c.desc}</small>
          </div>`;
        }).join('')}
      </div>`;
  }

  function trainingTip(ops) {
    if (!data.settings.tips || !ops.length) return '';
    const tip = tipFor(ops);
    return `<div class="hint tip-inline">${ico('bulb')} ${esc(tip.text)}</div>`;
  }

  function matchBlock() {
    return `
      <div class="section-title"><h2>${tr('Матч по коду')}</h2><span>${tr('Одинаковые примеры для двоих')}</span></div>
      <div class="card">
        <p class="muted" style="margin:0 0 14px">${tr('Создай код и передай сопернику. Вы решаете одни и те же примеры на своих телефонах, а потом сравниваете результат по коду.')}</p>
        <div class="row-buttons">
          <button class="btn primary" data-action="match-create">${tr('{0} Создать матч', ico('bolt'))}</button>
          <button class="btn" data-action="match-join">${tr('{0} Ввести код', ico('keyboard'))}</button>
          <button class="btn ghost" data-action="match-result">${tr('{0} Сравнить результат', ico('trophy'))}</button>
        </div>
        ${data.lastMatch ? `<div class="record" style="margin-top:14px"><span class="muted">${tr('Твой результат матча')}</span><b>${data.lastMatch.code}</b></div>` : ''}
      </div>`;
  }

  /* ---------- Статистика: карта таблицы умножения и отчёт ---------- */

  function heatmap() {
    const nums = Array.from({ length: 12 }, (_, i) => i + 1);
    const cells = nums.map(a => `
      <div class="heat-row">
        <button class="heat-head" data-action="heat-row" data-n="${a}">${a}</button>
        ${nums.map(b => {
          const m = tableMastery(a, b);
          const cls = !m ? 'empty' : m > 0.8 ? 'good' : m > 0.55 ? 'ok' : 'weak';
          return `<button class="heat-cell ${cls}" data-action="heat-cell" data-a="${a}" data-b="${b}" style="--m:${m.toFixed(2)}" title="${a} × ${b} = ${a * b}"></button>`;
        }).join('')}
      </div>`).join('');

    const known = Object.keys(data.tableStats).length;
    return `
      <div class="section-title"><h2>${tr('Карта таблицы умножения')}</h2><span>${tr('{0} из 78 пар', known)}</span></div>
      <div class="card heat-card">
        <div class="heat-grid">
          <div class="heat-row heat-top">
            <span class="heat-head corner">×</span>
            ${nums.map(b => `<span class="heat-head">${b}</span>`).join('')}
          </div>
          ${cells}
        </div>
        <div class="heat-legend">
          <span><i class="empty"></i> ${tr('не решал')}</span>
          <span><i class="weak"></i> ${tr('слабо')}</span>
          <span><i class="ok"></i> ${tr('средне')}</span>
          <span><i class="good"></i> ${tr('уверенно')}</span>
        </div>
        <p class="hint">${tr('Нажми на клетку или на число слева, чтобы потренировать именно их.')}</p>
      </div>`;
  }

  function reportBlock() {
    const r = weekReport();
    const arrow = (now, prev, better = 'up') => {
      if (!prev) return '';
      const d = now - prev;
      if (Math.abs(d) < 0.005) return '<span class="muted">—</span>';
      const good = better === 'up' ? d > 0 : d < 0;
      return `<span class="${good ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d) < 1 ? Math.abs(d).toFixed(2) : Math.round(Math.abs(d))}</span>`;
    };
    return `
      <div class="section-title"><h2>${tr('Отчёт за неделю')}</h2><span>${tr('для родителя или учителя')}</span></div>
      <div class="card report-card">
        <div class="report-grid">
          <div><small>${tr('Решено')}</small><b>${r.cur.n}</b>${arrow(r.cur.n, r.old.n)}</div>
          <div><small>${tr('Точность')}</small><b>${r.accuracy}%</b>${arrow(r.accuracy, r.accuracyPrev)}</div>
          <div><small>${tr('Ср. время')}</small><b>${tr('{0} с', r.avgSec.toFixed(2))}</b>${arrow(r.avgSec, r.avgSecPrev, 'down')}</div>
          <div><small>${tr('Тренировок')}</small><b>${r.cur.sessions}</b>${arrow(r.cur.sessions, r.old.sessions)}</div>
          <div><small>${tr('Цель дня')}</small><b>${r.goalDays} / 7</b></div>
          <div><small>${tr('Опыт')}</small><b class="gold">+${r.cur.xp}</b></div>
        </div>
        ${r.weakest ? `<p class="muted" style="margin:14px 0 0">${tr('Слабое место:')} <span class="gold">${OPS[r.weakest.op].name.toLowerCase()}</span>${tr(', точность {0}%.', Math.round(r.weakest.acc * 100))}</p>` : ''}
        <div class="row-buttons" style="margin-top:14px">
          <button class="btn" data-action="report-copy">${tr('{0} Скопировать', ico('clipboard'))}</button>
          <button class="btn ghost" data-action="report-print">${tr('Распечатать')}</button>
        </div>
      </div>`;
  }

  /* ---------- Настройки: единый список по группам ---------- */

  // Строка настроек: иконка, название, пояснение и управление справа
  function setRow({ icon, title, sub = '', action, data: attrs = {}, value = '', toggle = null, danger = false, iconHtml = '' }) {
    const dataAttrs = Object.entries(attrs).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
    const control = toggle !== null
      ? `<span class="switch ${toggle ? 'on' : ''}" aria-hidden="true"></span>`
      : `${value ? `<span class="set-value">${esc(value)}</span>` : ''}<span class="chev">›</span>`;
    return `
      <button class="set-row ${danger ? 'danger' : ''}" data-action="${action}" ${dataAttrs} ${toggle !== null ? `role="switch" aria-checked="${toggle}"` : ''}>
        <span class="set-ico">${iconHtml || ico(icon)}</span>
        <span class="set-main"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>
        ${control}
      </button>`;
  }

  const setGroup = (title, rows) => `
    <section class="set-group">
      <h3 class="set-title">${esc(title)}</h3>
      <div class="set-card">${rows.join('')}</div>
    </section>`;

  const toggleRow = (key, icon, title, sub) => setRow({ icon, title, sub, action: 'toggle', data: { key }, toggle: !!data.settings[key] });

  function settingsView() {
    const s = data.settings;
    const lvl = levelFromXp(data.xp);
    const reminder = Native.isApp() ? (Native.getReminder() || { enabled: false, hour: 18 }) : null;
    const lang = I18N.LANGS[I18N.lang];

    const groups = [
      setGroup(tr('Общие'), [
        setRow({ icon: 'globe', title: tr('Язык'), sub: tr('Язык интерфейса и заданий'), action: 'set-language', value: lang.native }),
        setRow({ icon: 'target', title: tr('Дневная цель'), sub: tr('Сколько верных ответов в день'), action: 'set-goal', value: String(data.dailyGoal) }),
        setRow({ icon: 'star', title: tr('Профили'), sub: tr('У каждого свой прогресс'), action: 'set-profiles', value: String(profiles.list.length) }),
      ]),
      setGroup(tr('Тренировка'), [
        setRow({ icon: 'choice', title: tr('Формат ответа'), sub: tr('Как отвечать на примеры'), action: 'set-answer', value: s.answerMode === 'choice' ? tr('4 варианта') : tr('Ввод числа') }),
        toggleRow('autoCheck', 'keyboard', tr('Автопроверка'), tr('Ответ засчитывается без Enter')),
        toggleRow('adaptive', 'chart', tr('Умная сложность'), tr('Уровень растёт вместе с тобой')),
        toggleRow('tips', 'bulb', tr('Приёмы устного счёта'), tr('Подсказки перед стартом')),
      ]),
      setGroup(tr('Звук и отклик'), [
        toggleRow('sound', 'speaker', tr('Звуки'), tr('Ответы, таймер, рекорды')),
        `<div class="set-row set-slider">
          <span class="set-ico vol-ico" style="--vol:${s.volume}">${icoInline('speaker')}</span>
          <span class="set-main"><b>${esc(tr('Громкость'))}</b></span>
          <input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-action="volume" aria-label="${esc(tr('Громкость'))}">
        </div>`,
        toggleRow('vibrate', 'vibrate', tr('Вибрация'), tr('Отклик на ошибку и рекорд')),
        toggleRow('animations', 'comet', tr('Анимации'), tr('Эффекты, переходы, рисование')),
      ]),
      setGroup(tr('Удобство'), [
        toggleRow('bigText', 'font', tr('Крупный шрифт'), tr('Больше текст и цифры')),
        toggleRow('leftHand', 'keyboard', tr('Клавиатура для левши'), tr('Зеркальная раскладка цифр')),
        ...(Native.isApp() ? [] : [toggleRow('fullscreen', 'grid', tr('Полный экран в игре'), tr('Прячет строку браузера'))]),
      ]),
      ...(reminder ? [setGroup(tr('Напоминание'), [
        setRow({ icon: 'bell', title: tr('Напоминать каждый день'), sub: tr('Чтобы не пропустить тренировку'), action: 'reminder-toggle', toggle: reminder.enabled }),
        setRow({ icon: 'stopwatch', title: tr('Время напоминания'), sub: tr('Когда прислать уведомление'), action: 'reminder-hour', value: `${reminder.hour}:00` }),
      ])] : []),
      setGroup(tr('Родителям и учителям'), [
        setRow({ icon: 'clipboard', title: tr('Создать задание'), sub: tr('Код по текущим настройкам тренировки'), action: 'assign-make' }),
        setRow({ icon: 'keyboard', title: tr('Ввести код задания'), sub: tr('Задание появится на главной'), action: 'assign-code' }),
        setRow({ icon: 'donut', title: tr('Отчёт за неделю'), sub: tr('Точность, скорость, слабые места'), action: 'open-report' }),
      ]),
      setGroup(tr('Данные'), [
        setRow({ icon: 'save', title: tr('Сохранить в файл'), sub: tr('Резервная копия прогресса'), action: 'export-file' }),
        setRow({ icon: 'upload', title: tr('Загрузить из файла'), sub: tr('Восстановить прогресс'), action: 'import-file' }),
        setRow({ icon: 'copy', title: tr('Скопировать прогресс'), sub: tr('Чтобы перенести на другой телефон'), action: 'export-copy' }),
        setRow({ icon: 'clipboard', title: tr('Вставить прогресс'), sub: tr('Из скопированного текста'), action: 'import-paste' }),
        setRow({ icon: 'backspace', title: tr('Сбросить прогресс'), sub: tr('Удалить всё у этого профиля'), action: 'reset', danger: true }),
      ]),
    ];

    const p = profiles.list.find(x => x.id === profiles.active) || profiles.list[0];
    return `
      <h1 class="page-title">${esc(tr('Настройки'))}</h1>
      <button class="card glow set-profile" data-action="nav" data-view="profile">
        ${avatarHtml(data, 'md')}
        <span class="set-main">
          <b>${esc(p.name)}</b>
          <small>${esc(tr('Уровень {0} · {1} XP', lvl, data.xp.toLocaleString(I18N.locale)))}</small>
        </span>
        <span class="set-value">${esc(tr('Профиль'))}</span><span class="chev">›</span>
      </button>
      ${groups.join('')}
      ${Hooks.html('settingsGroups')}
      <p class="set-footer">Math for Speed · ${esc(tr('версия {0}', APP_VERSION))}</p>`;
  }

  /* ---------- Листы выбора для настроек ---------- */

  async function chooseLanguage() {
    const options = Object.entries(I18N.LANGS).map(([code, l]) => ({ value: code, label: l.native, sub: code === I18N.lang ? '' : tr(l.name) }));
    const code = await Dialog.choose({ icon: 'globe', title: tr('Язык'), options, value: I18N.lang });
    if (!code || code === I18N.lang) return;
    I18N.set(code);
    // Перезапуск нужен, чтобы перевести все экраны и названия сразу
    document.body.classList.add('lang-switching');
    setTimeout(() => location.reload(), FX.on() ? 220 : 0);
  }

  async function chooseGoal() {
    const hints = { 20: tr('Спокойный темп'), 50: tr('Обычный день'), 100: tr('Хорошая нагрузка'), 150: tr('Интенсивно'), 200: tr('Для сильных'), 300: tr('Марафон') };
    const options = [20, 50, 100, 150, 200, 300].map(n => ({ value: n, label: tr('{0} верных ответов', n), sub: tr(hints[n]) }));
    const n = await Dialog.choose({ icon: 'target', title: tr('Дневная цель'), options, value: data.dailyGoal });
    if (!n) return;
    data.dailyGoal = n;
    saveData();
    renderSettings();
    toast(tr('Дневная цель: {0}', n));
  }

  async function chooseAnswerMode() {
    const options = [
      { value: 'input', label: tr('Ввод числа'), sub: tr('Набираешь ответ на клавиатуре') },
      { value: 'choice', label: tr('4 варианта'), sub: tr('Выбираешь правильный из четырёх') },
    ];
    const v = await Dialog.choose({ icon: 'choice', title: tr('Формат ответа'), options, value: data.settings.answerMode });
    if (!v) return;
    data.settings.answerMode = v;
    saveData();
    renderSettings();
  }

  async function chooseReminderHour() {
    const r = Native.getReminder() || { enabled: false, hour: 18 };
    const hints = { 8: tr('Утром перед школой'), 12: tr('В обед'), 16: tr('После уроков'), 18: tr('Вечером'), 20: tr('Перед сном') };
    const options = [8, 12, 16, 18, 20].map(h => ({ value: h, label: `${h}:00`, sub: tr(hints[h]) }));
    const hour = await Dialog.choose({ icon: 'stopwatch', title: tr('Время напоминания'), options, value: r.hour });
    if (!hour) return;
    const res = await Native.setReminder(true, hour);
    if (!res.ok) {
      Dialog.alert({ icon: 'bell', title: tr('Уведомления выключены'), text: tr('Разреши приложению показывать уведомления в настройках телефона, и напоминание заработает.') });
    } else {
      toast(tr('Напомню в {0}:00', hour));
    }
    renderSettings();
  }


  async function manageProfiles() {
    const options = profiles.list.map(p => ({
      value: p.id,
      label: p.name,
      sub: p.id === profiles.active ? tr('Сейчас выбран') : '',
      icon: `<span class="set-avatar sm" style="background:${p.color}">${esc(p.name.slice(0, 1).toUpperCase())}</span>`,
    }));
    const buttons = [{ label: tr('Добавить'), value: '__add', kind: 'primary' }];
    if (profiles.list.length > 1) buttons.unshift({ label: tr('Удалить'), value: '__del', kind: 'ghost' });
    const res = await Dialog.choose({ icon: 'star', title: tr('Профили'), options, value: profiles.active, buttons });
    if (!res) return;
    if (res === '__add') { action('profile-add'); return; }
    if (res === '__del') {
      const id = await Dialog.choose({
        icon: 'bandage',
        title: tr('Какой профиль удалить?'),
        options: profiles.list.map(p => ({ value: p.id, label: p.name })),
      });
      if (id) action('profile-del', { dataset: { id } });
      return;
    }
    action('profile-switch', { dataset: { id: res } });
  }

  async function makeAssignment() {
    const s = data.settings;
    const goal = await Dialog.choose({
      icon: 'clipboard',
      title: tr('Сколько верных ответов?'),
      text: tr('{0} · {1} · {2}', tr(MODES[s.mode === 'duel' ? 'practice' : s.mode].name), tr(LEVELS[s.level].name), s.ops.map(o => OPS[o].sym).join(' ')),
      options: [10, 20, 30, 50].map(n => ({ value: n, label: tr('{0} верных ответов', n) })),
      value: data.assignGoal || 20,
    });
    if (!goal) return;
    data.assignGoal = goal;
    saveData();
    const code = assignmentCode({ mode: s.mode === 'duel' ? 'practice' : s.mode, level: s.level, ops: s.ops, goal });
    Dialog.alert({ icon: 'clipboard', title: tr('Код задания готов'), text: tr('Передай его ребёнку — пусть введёт в Настройках → «Ввести код задания».'), code });
  }

  /* ---------- Дуэль на одном телефоне ---------- */

  const DUEL_TARGET = 15;
  let duel = null;

  function duelStart() {
    const s = data.settings;
    // В дуэли ответ вводится цифрами — задачи с выбором ответа не подходят
    const typed = s.ops.filter(o => !['frac', 'cmp', 'dvs', 'alg'].includes(o));
    const ops = typed.length ? typed : ['add', 'mul'];
    duel = {
      target: DUEL_TARGET,
      level: s.level,
      ops,
      players: [0, 1].map(() => ({ score: 0, wrong: 0, value: '', problem: null })),
      startedAt: performance.now(),
      over: false,
    };
    currentView = 'duel';
    document.body.classList.add('in-game');
    setActiveNav(null);
    duel.players.forEach((p, i) => { p.problem = genProblem({ ops, level: s.level, intOnly: true }, 'practice'); void i; });
    renderDuel();
    FX.enterView('game');
  }

  function duelPad(i) {
    return `
      <div class="duel-pad" data-player="${i}">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-duel-key="${n}">${n}</button>`).join('')}
        <button data-duel-key="minus">−</button>
        <button data-duel-key="0">0</button>
        <button data-duel-key="back">⌫</button>
      </div>`;
  }

  function renderDuel() {
    const html = [0, 1].map(i => {
      const p = duel.players[i];
      return `
        <section class="duel-half p${i}">
          <div class="duel-top">
            <span class="duel-name">${tr('Игрок {0}', i + 1)}</span>
            <span class="duel-score" id="duelScore${i}">${p.score}</span>
            <span class="muted">${tr('до {0}', duel.target)}</span>
          </div>
          <div class="duel-problem" id="duelProblem${i}">${p.problem.html}</div>
          <div class="duel-answer" id="duelAnswer${i}">${p.value || '&nbsp;'}</div>
          ${duelPad(i)}
        </section>`;
    }).join('');

    $('#app').innerHTML = `
      <div class="duel" id="duelRoot">
        ${html}
        <button class="btn ghost duel-exit" data-action="duel-exit">${tr('Выйти')}</button>
      </div>`;

    $('#duelRoot').addEventListener('pointerdown', e => {
      const btn = e.target.closest('[data-duel-key]');
      if (!btn) return;
      e.preventDefault();
      duelKey(Number(btn.closest('.duel-pad').dataset.player), btn.dataset.duelKey);
    });
  }

  function duelKey(i, key) {
    if (!duel || duel.over) return;
    const p = duel.players[i];
    if (key === 'back') p.value = p.value.slice(0, -1);
    else if (key === 'minus') p.value = p.value.startsWith('-') ? p.value.slice(1) : `-${p.value}`;
    else if (p.value.length < 8) p.value += key;

    const box = $(`#duelAnswer${i}`);
    box.textContent = p.value || ' ';
    const answer = p.problem.answer;
    if (p.value === answer) duelAnswer(i, true);
    else if (p.value.replace('-', '').length >= answer.replace('-', '').length && p.value.length >= answer.length) duelAnswer(i, false);
  }

  function duelAnswer(i, ok) {
    const p = duel.players[i];
    const half = document.querySelectorAll('.duel-half')[i];
    if (ok) {
      p.score++;
      Sound.correct(p.score);
      FX.pulse(half, 'ok', 400);
      FX.burstAt($(`#duelProblem${i}`), { count: 8, spread: 70, kind: 'stroke' });
    } else {
      p.wrong++;
      Sound.wrong();
      vibrate(30);
      FX.pulse(half, 'bad', 400);
    }
    $(`#duelScore${i}`).textContent = p.score;
    FX.pulse($(`#duelScore${i}`), 'fx-bump', 400);
    p.value = '';
    $(`#duelAnswer${i}`).innerHTML = '&nbsp;';

    if (p.score >= duel.target) { duelFinish(i); return; }
    p.problem = genProblem({ ops: duel.ops, level: duel.level, intOnly: true }, 'practice');
    FX.problemIn($(`#duelProblem${i}`), p.problem.html, { style: 'slide' });
  }

  function duelFinish(winner) {
    duel.over = true;
    currentView = 'results';
    Sound.record();
    vibrate([0, 80, 60, 80]);
    const secs = ((performance.now() - duel.startedAt) / 1000).toFixed(1);
    $('#app').innerHTML = `
      <div class="results duel-results">
        <div class="card glow results-head">
          <span class="eyebrow">${tr('Дуэль')}</span>
          <div class="big-score">${tr('Игрок {0}', winner + 1)}</div>
          <div class="muted">${tr('победил со счётом {0} : {1} за {2} с', duel.players[winner].score, duel.players[1 - winner].score, secs)}</div>
        </div>
        <div class="actions">
          <button class="btn primary big" data-action="duel-again">${tr('↻ Ещё раз')}</button>
          <button class="btn big ghost" data-action="nav" data-view="dashboard">${tr('На главную')}</button>
        </div>
      </div>`;
    document.body.classList.remove('in-game');
    FX.levelUp(`${winner + 1}`);
  }

  function duelKeyboard(e) {
    if (currentView !== 'duel' || !duel || duel.over) return;
    const left = { '1': '1', '2': '2', '3': '3', 'q': '4', 'w': '5', 'e': '6', 'a': '7', 's': '8', 'd': '9', 'z': '0', 'x': 'back' };
    const right = { '7': '1', '8': '2', '9': '3', 'u': '4', 'i': '5', 'o': '6', 'j': '7', 'k': '8', 'l': '9', 'm': '0', ',': 'back' };
    const k = e.key.toLowerCase();
    if (left[k]) { duelKey(0, left[k]); e.preventDefault(); }
    else if (right[k]) { duelKey(1, right[k]); e.preventDefault(); }
  }

  /* ---------- Диалоги с кодами ---------- */

  function startFromConfig(cfg, extra = {}) {
    Object.assign(data.settings, { ops: cfg.ops, level: cfg.level, mode: cfg.mode });
    saveData();
    if (cfg.seed) {
      // Одинаковые примеры у обоих игроков
      withSeed(cfg.seed, () => startGame(cfg.mode));
      if (game) { game.matchSeed = cfg.seed; game.rng = seededRandom(cfg.seed); game.settings.adaptive = false; }
    } else {
      startGame(cfg.mode);
    }
    void extra;
  }

  // Копирование: системный буфер обмена, а если он недоступен — показываем текст в своём окне
  async function copyText(text, title = tr('Скопировано')) {
    const ok = await Native.copy(text);
    if (ok) {
      // Android 13+ сам показывает, что текст скопирован — не дублируем
      if (!Native.isApp()) toast(title);
      return true;
    }
    await Dialog.alert({ icon: 'clipboard', title: tr('Скопируй вручную'), text: tr('Буфер обмена недоступен. Выдели текст ниже.'), code: text.length < 60 ? text : '' });
    return false;
  }

  /* ---------- Действия ---------- */

  function action(name, el) {
    const s = data.settings;
    switch (name) {
      case 'toggle': {
        const key = el.dataset.key;
        s[key] = !s[key];
        saveData();
        // переключатель внутри строки настроек или сам переключатель
        const sw = el.classList.contains('switch') ? el : el.querySelector('.switch');
        sw?.classList.toggle('on', s[key]);
        el.setAttribute('aria-checked', String(s[key]));
        applyPrefs();
        if (key === 'sound') {
          FX.swapIcon($('#soundBtn'), icoInline(s.sound ? 'speaker' : 'mute'));
          if (s.sound) Sound.correct(0);
        }
        if (key === 'animations') FX.apply();
        if (key === 'fullscreen' && s[key]) toast(tr('Полный экран включится на время тренировки'));
        return true;
      }
      case 'test-preset':
        s.ops = ['mul', 'frac', 'pct', 'expo', 'alg', 'eq', 'word', 'geo'];
        if (s.mode === 'table' || s.mode === 'mistakes') s.mode = 'practice';
        if (s.level === 'easy') s.level = 'medium';
        saveData();
        navigate('training');
        toast(tr('Набор «Как во входном тесте» выбран'));
        return true;
      case 'shuffle':
        s.shuffle = s.shuffle === false;
        saveData();
        renderTraining();
        return true;
      case 'adaptive-toggle':
        s.adaptive = !s.adaptive;
        saveData();
        renderTraining();
        return true;
      case 'ach':
        showAchLadder(el.dataset.ach);
        return true;
      case 'div-rules':
        showDivRules();
        return true;
      case 'set-language':
        chooseLanguage();
        return true;
      case 'set-goal':
        chooseGoal();
        return true;
      case 'set-answer':
        chooseAnswerMode();
        return true;
      case 'set-profiles':
        manageProfiles();
        return true;
      case 'open-report':
        navigate('stats');
        requestAnimationFrame(() => document.querySelector('.report-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        return true;
      case 'daily-start': {
        const dc = dailyChallenge();
        startFromConfig(dc);
        return true;
      }
      case 'assign-start': {
        const a = data.assignment;
        if (a) startFromConfig(a);
        return true;
      }
      case 'heat-cell': {
        const a = Number(el.dataset.a);
        const b = Number(el.dataset.b);
        Object.assign(s, { tableNums: [...new Set([a, b])], mode: 'table' });
        saveData();
        startGame('table');
        return true;
      }
      case 'heat-row': {
        const n = Number(el.dataset.n);
        Object.assign(s, { tableNums: [n], mode: 'table' });
        saveData();
        startGame('table');
        return true;
      }
      case 'report-copy':
        copyText(reportText());
        return true;
      case 'report-print':
        Native.print(reportPrintHtml());
        return true;
      case 'profile-switch': {
        const id = el.dataset.id;
        if (id === profiles.active) return true;
        saveData();
        profiles.active = id;
        saveProfiles();
        data = loadData();
        applyPrefs();
        navigate('dashboard');
        toast(`${tr('Профиль: {0}', profileName())}`);
        return true;
      }
      case 'profile-add':
        (async () => {
          const name = await Dialog.prompt({ icon: 'star', title: tr('Новый профиль'), text: tr('Как зовут игрока?'), value: `${tr('Игрок {0}', profiles.list.length + 1)}`, ok: tr('Создать'), maxLength: 20 });
          if (!name) return;
          saveData();
          profiles.active = addProfile(name);
          data = loadData();
          applyPrefs();
          navigate('dashboard');
          toast(`${tr('Профиль «{0}» создан', profileName())}`);
        })();
        return true;
      case 'profile-del':
        (async () => {
          const id = el.dataset.id;
          const p = profiles.list.find(x => x.id === id);
          if (!p) return;
          const ok = await Dialog.confirm({ icon: 'bandage', title: `${tr('Удалить «{0}»?', p.name)}`, text: tr('Весь прогресс этого профиля пропадёт. Отменить это нельзя.'), ok: tr('Удалить'), danger: true });
          if (!ok) return;
          removeProfile(id);
          data = loadData();
          navigate('settings');
          toast(tr('Профиль удалён'));
        })();
        return true;
      case 'export-file':
        (async () => {
          const ok = await Native.saveFile(`math-for-speed-${profileName()}-${dateKey()}.json`, exportPayload());
          if (ok) toast(tr('Файл сохранён'));
        })();
        return true;
      case 'export-copy':
        copyText(exportPayload(), tr('Прогресс скопирован'));
        return true;
      case 'import-file':
        (async () => {
          const text = await Native.pickFile();
          if (text) applyImport(text);
        })();
        return true;
      case 'import-paste':
        (async () => {
          const text = await Dialog.prompt({ icon: 'clipboard', title: tr('Вставь прогресс'), text: tr('Вставь сюда скопированный текст сохранения.'), placeholder: tr('Вставь текст'), ok: tr('Загрузить'), maxLength: 500000 });
          if (text) applyImport(text);
        })();
        return true;
      case 'assign-make':
        makeAssignment();
        return true;
      case 'assign-code':
        (async () => {
          const code = await Dialog.prompt({ icon: 'clipboard', title: tr('Код задания'), text: tr('Введи код, который прислал родитель или учитель.'), placeholder: 'Z-…', ok: tr('Добавить'), upper: true, maxLength: 40 });
          if (!code) return;
          const cfg = unpackCode(code);
          if (!cfg || cfg.kind !== 'Z') { toast(tr('Код не подходит')); return; }
          data.assignment = { ...cfg, done: false, code };
          saveData();
          navigate('dashboard');
          toast(tr('Задание добавлено на главную'));
        })();
        return true;
      case 'match-create':
        (async () => {
          const cfg = { mode: s.mode === 'duel' ? 'sprint' : s.mode, level: s.level, ops: s.ops, seed: Math.floor(Math.random() * 1e6) };
          const code = matchCode(cfg);
          const res = await Dialog.open({
            icon: 'bolt',
            title: tr('Матч создан'),
            text: tr('Передай код сопернику. У вас будут одинаковые примеры.'),
            code,
            buttons: [
              { label: tr('Позже'), value: false, kind: 'ghost' },
              { label: tr('Играть'), value: true, kind: 'primary' },
            ],
            dismiss: { button: false },
          });
          if (res?.button) startFromConfig(cfg);
        })();
        return true;
      case 'match-join':
        (async () => {
          const code = await Dialog.prompt({ icon: 'keyboard', title: tr('Код матча'), text: tr('Введи код, который прислал соперник.'), placeholder: 'M-…', ok: tr('Играть'), upper: true, maxLength: 40 });
          if (!code) return;
          const cfg = unpackCode(code);
          if (!cfg || cfg.kind !== 'M') { toast(tr('Код не подходит')); return; }
          startFromConfig(cfg);
        })();
        return true;
      case 'match-result':
        (async () => {
          if (!data.lastMatch) { toast(tr('Сначала сыграй матч по коду')); return; }
          const code = await Dialog.prompt({ icon: 'trophy', title: tr('Сравнить результат'), text: `${tr('Твой результат: {0}\nВведи код результата соперника.', data.lastMatch.code)}`, placeholder: 'R-…', ok: tr('Сравнить'), upper: true, maxLength: 40 });
          if (!code) return;
          const other = parseResult(code);
          if (!other || other.seed !== data.lastMatch.seed) { toast(tr('Это результат другого матча')); return; }
          const mine = data.lastMatch.score;
          const lower = data.lastMatch.mode === 'blitz';
          const iWin = lower ? mine < other.score : mine > other.score;
          const same = mine === other.score;
          await Dialog.alert({
            icon: same ? 'shield' : iWin ? 'trophy' : 'target',
            title: same ? tr('Ничья') : iWin ? tr('Ты выиграл!') : tr('Соперник выиграл'),
            text: `${tr('Ты: {0}\nСоперник: {1}', formatScore(data.lastMatch.mode, mine), formatScore(data.lastMatch.mode, other.score))}`,
          });
        })();
        return true;
      case 'reminder-toggle':
        (async () => {
          const r = Native.getReminder() || { enabled: false, hour: 18 };
          const res = await Native.setReminder(!r.enabled, r.hour);
          if (!res.ok && !r.enabled) {
            Dialog.alert({ icon: 'bell', title: tr('Уведомления выключены'), text: tr('Разреши приложению показывать уведомления в настройках телефона, и напоминание заработает.') });
          } else {
            toast(!r.enabled ? tr('Напомню в {0}:00', r.hour) : tr('Напоминание выключено'));
          }
          renderSettings();
        })();
        return true;
      case 'reminder-hour':
        chooseReminderHour();
        return true;
      case 'duel-start':
        duelStart();
        return true;
      case 'duel-again':
        duelStart();
        return true;
      case 'duel-exit':
        duel = null;
        navigate('dashboard');
        return true;
      default:
        return false;
    }
  }

  async function applyImport(text) {
    let incoming;
    try {
      incoming = importPayload(text);
    } catch (e) {
      Dialog.alert({ icon: 'bandage', title: tr('Не удалось загрузить'), text: e.message || tr('Файл повреждён или не от этого приложения.') });
      return;
    }
    const ok = await Dialog.confirm({ icon: 'clipboard', title: tr('Загрузить прогресс?'), text: `${tr('Текущий прогресс профиля «{0}» заменится данными из файла: {1} XP, {2} решённых примеров.', profileName(), incoming.xp, incoming.totalSolved)}`, ok: tr('Заменить'), danger: true });
    if (!ok) return;
    data = { ...defaultData(), ...incoming, settings: { ...defaultData().settings, ...incoming.settings } };
    saveData();
    applyPrefs();
    navigate('dashboard');
    toast(tr('Прогресс загружен'));
  }

  // Отчёт для печати — отдельная чистая страница без тёмного оформления
  function reportPrintHtml() {
    const lines = reportText().split('\n');
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${tr('Отчёт — Math for Speed')}</title>
      <style>body{font-family:sans-serif;padding:32px;color:#111;line-height:1.6}h1{font-size:22px;margin:0 0 16px}p{margin:4px 0}</style>
      </head><body><h1>${esc(lines[0])}</h1>${lines.slice(1).map(l => `<p>${esc(l) || '&nbsp;'}</p>`).join('')}</body></html>`;
  }

  // Шпаргалка «Признаки делимости»
  function divRulesCard() {
    return `
      <button class="row-card div-rules-card" data-action="div-rules">
        <span class="div-badges" aria-hidden="true">${[2, 3, 5, 9].map(d => `<i>${d}</i>`).join('')}</span>
        <span class="row-main"><b>${tr('Признаки делимости')}</b><small>${tr('Как за секунду понять, делится ли число')}</small></span>
        <span class="chev">›</span>
      </button>`;
  }

  // Все 10 ступеней достижения
  function showAchLadder(id) {
    const t = ACH_TRACKS.find(x => x.id === id);
    if (!t) return;
    achInit(data);
    const tier = data.achTiers[t.id] || 0;
    const [frac, ptext] = achProgress(t, data, tier);
    const rows = t.tiers.map((th, i) => {
      const r = RARITIES[i];
      const state = i < tier ? 'done' : i === tier ? 'next' : 'locked';
      return `
        <div class="al-row al-${state} ${i === 9 ? 'al-legend' : ''}" style="--rc:${r.color}">
          <span class="al-badge">${ROMAN[i]}</span>
          <span class="al-main"><b>${esc(r.name)}</b><small>${esc(t.goal(th))}</small></span>
          <span class="al-state">${state === 'done' ? '✓' : state === 'next' ? `${Math.round(frac * 100)}%` : ''}</span>
        </div>`;
    }).join('');
    Dialog.open({
      icon: t.icon,
      title: t.name,
      text: tier ? `${RARITIES[tier - 1].name} · ${ROMAN[tier - 1]} — ${ptext}` : ptext,
      html: `<div class="al-list">${rows}</div>`,
      buttons: [{ label: tr('Закрыть'), value: false, kind: 'ghost' }],
      dismiss: { button: false },
    });
  }

  function testPresetCard() {
    return `
      <button class="row-card test-preset-card" data-action="test-preset">
        <span class="icon-sq sm">${ico('clipboard')}</span>
        <span class="row-main"><b>${tr('Как во входном тесте')}</b><small>${tr('Степени, алгебра, уравнения, задачи и геометрия — всё сразу')}</small></span>
        <span class="chev">›</span>
      </button>`;
  }

  function showDivRules() {
    const row = (mark, r) => `
      <div class="dr-row">
        <span class="dr-num">${mark}</span>
        <div class="dr-body">
          <b>${esc(r.title)}</b>
          <p>${esc(r.rule)}</p>
          <code>${esc(r.ex)}</code>
        </div>
      </div>`;
    const html = `<div class="dr-list">${DIV_RULES.map(r => row(r.d, r)).join('')}${row('p', DIV_PRIME)}</div>`;
    Dialog.open({
      icon: 'bulb',
      title: tr('Признаки делимости'),
      text: tr('Число делится на…'),
      html,
      buttons: [
        { label: tr('Закрыть'), value: false, kind: 'ghost' },
        { label: tr('Тренировать'), value: true, kind: 'primary' },
      ],
      dismiss: { button: false },
    }).then(res => {
      if (!res?.button) return;
      data.settings.ops = ['dvs'];
      if (data.settings.mode === 'table' || data.settings.mode === 'mistakes') data.settings.mode = 'practice';
      saveData();
      navigate('training');
    });
  }

  // Крупный шрифт и раскладка для левши
  function applyPrefs() {
    document.body.classList.toggle('big-text', !!data.settings.bigText);
    document.body.classList.toggle('left-hand', !!data.settings.leftHand);
    document.body.classList.toggle('is-app', Native.isApp());
    Hooks.run('prefs');
  }

  return {
    dailyCard, assignmentCard, tipCard, reviewCard, challengesBlock, trainingTip, matchBlock,
    heatmap, reportBlock, settingsView, divRulesCard, testPresetCard,
    action, applyPrefs, duelStart, duelKeyboard, copyText, setRow, setGroup,
  };
})();
