'use strict';

/* =========================================================
   Разбор после игры, графики и прогноз, сравнение недель,
   время суток, слабые пары таблицы, картинки «Поделиться»,
   вызов другу, таблица лидеров на устройстве, класс учителя.
   ========================================================= */

/* ---------- Разбор после игры ---------- */

function reviewTip(e) {
  if (e.steps?.length) return e.steps.join(' → ');
  if (e.rule === 'prime') return DIV_PRIME.rule;
  if (typeof e.rule === 'number') return divRule(e.rule)?.rule || '';
  const t = tipFor([e.op]);
  return t?.ops?.includes(e.op) ? t.text : (LESSONS[e.op]?.[2] || '');
}

Hooks.on('replacesMistakes', () => true);

Hooks.on('resultsReview', ({ log, session: s }) => {
  if (!log?.length) return '';
  const wrongs = log.filter(e => !e.ok);
  const slow = log.filter(e => e.ok).sort((a, b) => b.ms - a.ms).slice(0, 3).filter(e => e.ms > 3000);
  const byOp = {};
  log.forEach(e => { const o = (byOp[e.op] ||= { n: 0, c: 0, t: 0 }); o.n++; if (e.ok) o.c++; o.t += e.ms; });
  const ops = Object.entries(byOp).filter(([op]) => OPS[op]).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n);
  if (!wrongs.length && !slow.length && ops.length < 2) return '';
  return `
    <div class="section-title"><h2>${tr('Разбор')}</h2><span>${wrongs.length ? tr('Ошибки уже в «Работе над ошибками»') : tr('Без ошибок — отлично!')}</span></div>
    ${ops.length > 1 ? `
    <div class="card review-ops">
      ${ops.map(([op, o]) => `
        <div class="ro-row">
          <span class="emoji-sq">${opIco(op)}</span>
          <span class="ro-name">${OPS[op].name}</span>
          <span class="ro-bar"><i style="width:${Math.round((o.c / o.n) * 100)}%;background:${o.c / o.n >= 0.9 ? 'var(--ok)' : o.c / o.n >= 0.6 ? 'var(--gold)' : 'var(--bad)'}"></i></span>
          <b>${o.c}/${o.n}</b>
          <small>${tr('{0} с', fmtSec(o.t / o.n / 1000))}</small>
        </div>`).join('')}
    </div>` : ''}
    ${wrongs.length ? `<div class="review-list">${wrongs.slice(0, 12).map(e => {
      const tip = reviewTip(e);
      return `
      <div class="review-item">
        <div class="ri-top">
          <span class="emoji-sq">${opIco(e.op)}</span>
          <span class="ri-problem">${problemHtml(e)}</span>
        </div>
        <div class="ri-ans">
          <span class="ri-given">${e.given === null ? tr('время вышло') : `<s>${answerHtml(e.given)}</s>`}</span>
          <span class="ri-right">✓ ${answerHtml(e.answer)}</span>
        </div>
        ${tip ? `<div class="ri-tip">${ico('bulb')}<span>${escH(tip)}</span></div>` : ''}
      </div>`;
    }).join('')}</div>` : ''}
    ${slow.length ? `
    <div class="card review-slow">
      <span class="eyebrow">${tr('Дольше всего думал')}</span>
      ${slow.map(e => `<div class="rs-row"><span>${solvedHtml(e)}</span><b>${tr('{0} с', fmtSec(e.ms / 1000))}</b></div>`).join('')}
      <small class="muted">${tr('Такие примеры стоит решить ещё пару раз — скорость придёт.')}</small>
    </div>` : ''}`;
});

/* ---------- Кнопки на экране результатов ---------- */

Hooks.on('resultsActions', info => `
  <button class="btn big" data-action="share-result">${ico('share')} ${tr('Поделиться')}</button>
  ${['sprint', 'blitz', 'survival', 'practice'].includes(info.session.mode) && !info.session.variant ? `<button class="btn big" data-action="challenge-friend">${ico('users')} ${tr('Вызов другу')}</button>` : ''}`);

let lastResultInfo = null;
Hooks.on('gameEnd', (g, session) => { lastResultInfo = { session, name: g.variant && VARIANTS[g.variant] ? VARIANTS[g.variant].name : MODES[g.mode].name }; });

/* ---------- Картинки для «Поделиться» ---------- */

async function svgToImage(svg, w, h) {
  const img = new Image();
  img.width = w;
  img.height = h;
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}`;
  await new Promise(res => { img.onload = res; img.onerror = res; img.src = src; });
  return img;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Общая рамка карточки: чёрный фон, золото, аватар с короной, ник
async function drawCardBase(ctx, W, H, subtitle) {
  await document.fonts?.ready;
  const bg = ctx.createRadialGradient(W / 2, H * 0.35, 40, W / 2, H * 0.4, H * 0.8);
  bg.addColorStop(0, '#2a200c');
  bg.addColorStop(0.55, '#0e0c08');
  bg.addColorStop(1, '#050505');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const gold = ctx.createLinearGradient(0, 0, W, H);
  gold.addColorStop(0, '#fff1b8');
  gold.addColorStop(0.4, '#ffd25a');
  gold.addColorStop(1, '#b87a12');
  ctx.strokeStyle = gold;
  ctx.lineWidth = 6;
  roundRect(ctx, 30, 30, W - 60, H - 60, 48);
  ctx.stroke();

  // Аватар
  const cx = 150, cy = 170;
  ctx.fillStyle = profileColor();
  ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = gold; ctx.stroke();
  ctx.fillStyle = '#1a1206';
  ctx.font = '800 72px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(profileName().slice(0, 1).toUpperCase(), cx, cy + 4);
  const crown = currentCrown(data);
  if (crown && crown.id !== 'none') {
    const img = await svgToImage(crownSvg(crown), 128, 88);
    try { ctx.drawImage(img, cx - 64, cy - 128, 128, 88); } catch { /* без короны */ }
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f3f3f3';
  ctx.font = '800 56px Outfit, sans-serif';
  ctx.fillText(profileName(), 250, 150);
  ctx.fillStyle = '#c9c9c9';
  ctx.font = '400 32px Inter, sans-serif';
  ctx.fillText(subtitle, 250, 205);
  return gold;
}

function drawFooter(ctx, W, H, gold) {
  ctx.textAlign = 'center';
  ctx.fillStyle = gold;
  ctx.font = '800 44px Outfit, sans-serif';
  ctx.fillText('Math for Speed', W / 2, H - 110);
  ctx.fillStyle = '#8a8a8a';
  ctx.font = '400 28px Inter, sans-serif';
  ctx.fillText(tr('Считай быстрее'), W / 2, H - 66);
}

async function resultImage(s, name) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const gold = await drawCardBase(ctx, W, H, tr('Уровень {0} · {1}', levelFromXp(data.xp), name));
  ctx.textAlign = 'center';
  ctx.fillStyle = gold;
  ctx.font = '900 300px Outfit, sans-serif';
  ctx.fillText(formatScore(s.mode, s.score), W / 2, 520);
  ctx.fillStyle = '#c9c9c9';
  ctx.font = '400 40px Inter, sans-serif';
  ctx.fillText(s.mode === 'blitz' ? tr('итоговое время') : plural(s.correct, 'верный ответ', 'верных ответа', 'верных ответов'), W / 2, 700);
  const n = s.correct + s.wrong;
  const stats = [
    [tr('Точность'), `${Math.round((s.correct / n) * 100)}%`],
    [tr('Ср. время'), tr('{0} с', fmtSec(s.avgMs / 1000))],
    [tr('Серия'), String(s.maxStreak)],
  ];
  stats.forEach(([label, value], i) => {
    const x = 90 + i * 310;
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    roundRect(ctx, x, 800, 280, 200, 32);
    ctx.fill();
    ctx.fillStyle = '#8a8a8a';
    ctx.font = '400 30px Inter, sans-serif';
    ctx.fillText(label, x + 140, 860);
    ctx.fillStyle = '#ffd66e';
    ctx.font = '800 70px Outfit, sans-serif';
    ctx.fillText(value, x + 140, 950);
  });
  ctx.fillStyle = '#c9c9c9';
  ctx.font = '400 32px Inter, sans-serif';
  ctx.fillText(tr('{0} дней подряд · {1} XP', dayStreak(data), data.xp.toLocaleString(I18N.locale)), W / 2, 1090);
  drawFooter(ctx, W, H, gold);
  return c.toDataURL('image/png').split(',')[1];
}

async function statsImage() {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const gold = await drawCardBase(ctx, W, H, tr('Уровень {0} · {1} XP', levelFromXp(data.xp), data.xp.toLocaleString(I18N.locale)));
  const acc = data.totalSolved ? Math.round((data.totalCorrect / data.totalSolved) * 100) : 0;
  const rows = [
    [tr('Решено примеров'), data.totalSolved.toLocaleString(I18N.locale)],
    [tr('Точность'), `${acc}%`],
    [tr('Лучшая серия'), String(data.bestStreak)],
    [tr('Дней подряд'), String(dayStreak(data))],
    [tr('Лестница'), String(ladderState(data).best)],
    [tr('Рекорд Спринта'), String(recordBest(data, 'sprint') || '—')],
  ];
  rows.forEach(([label, value], i) => {
    const x = 90 + (i % 2) * 460;
    const y = 320 + Math.floor(i / 2) * 250;
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    roundRect(ctx, x, y, 440, 220, 32);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8a8a8a';
    ctx.font = '400 32px Inter, sans-serif';
    ctx.fillText(label, x + 36, y + 60);
    ctx.fillStyle = '#ffd66e';
    ctx.font = '800 90px Outfit, sans-serif';
    ctx.fillText(value, x + 36, y + 160);
  });
  drawFooter(ctx, W, H, gold);
  return c.toDataURL('image/png').split(',')[1];
}

async function recapImage() {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const year = new Date().getFullYear();
  const y = yearStats(year);
  const gold = await drawCardBase(ctx, W, H, tr('Твой год в Math for Speed'));
  ctx.textAlign = 'center';
  ctx.fillStyle = gold;
  ctx.font = '900 220px Outfit, sans-serif';
  ctx.fillText(String(year), W / 2, 430);
  const rows = [[tr('Верных ответов'), y.correct.toLocaleString(I18N.locale)], [tr('Дней с тренировкой'), String(y.activeDays)], [tr('Самая длинная серия'), tr('{0} дн.', y.longest)], [tr('Любимая тема'), y.fav && OPS[y.fav] ? OPS[y.fav].name : '—']];
  rows.forEach(([label, value], i) => {
    const yy = 560 + i * 140;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8a8a8a';
    ctx.font = '400 36px Inter, sans-serif';
    ctx.fillText(label, 110, yy);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd66e';
    ctx.font = '800 64px Outfit, sans-serif';
    ctx.fillText(value, W - 110, yy + 6);
  });
  drawFooter(ctx, W, H, gold);
  return c.toDataURL('image/png').split(',')[1];
}

async function shareImage(make, name, text) {
  toast(tr('Готовлю картинку…'));
  try {
    const b64 = await make();
    const ok = await Native.shareImage(b64, name, text);
    if (!ok) toast(tr('Не удалось поделиться'));
  } catch (e) {
    window.mfsLogError?.(e, 'share');
    toast(tr('Не удалось поделиться'));
  }
}

/* ---------- Вызов другу: матч с кодом ---------- */

async function challengeFriend() {
  const s = lastResultInfo?.session;
  if (!s) return;
  const cfg = { mode: s.mode, level: s.level, ops: s.ops, seed: Math.floor(Math.random() * 1e6) };
  const code = matchCode(cfg);
  const text = tr('Вызов в Math for Speed! Реши те же примеры, что и я: Тренировка → «Матч по коду» → «Ввести код» → {0}. Потом пришли мне код результата.', code);
  await Native.shareText(text);
  const go = await Dialog.confirm({ icon: 'users', title: tr('Код отправлен'), text: tr('Сыграй этот матч сам — потом сравните коды результатов.'), ok: tr('Играть') });
  if (!go) return;
  Object.assign(data.settings, { ops: cfg.ops, level: cfg.level, mode: cfg.mode });
  saveData();
  startGame(cfg.mode);
  if (game) { game.matchSeed = cfg.seed; game.rng = seededRandom(cfg.seed); game.settings.adaptive = false; }
}

/* ---------- Статистика: скорость по темам и прогноз ---------- */

let speedOp = null;

function dailySpeed(op, days = 30) {
  const out = [];
  const byDay = {};
  for (const s of data.sessions) {
    const st = op === 'all'
      ? Object.values(s.opCounts || {}).reduce((a, x) => ({ n: a.n + x.n, t: a.t + x.t }), { n: 0, t: 0 })
      : s.opCounts?.[op];
    if (!st?.n) continue;
    const k = dateKey(new Date(s.date));
    const d = (byDay[k] ||= { n: 0, t: 0 });
    d.n += st.n;
    d.t += st.t;
  }
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const d = byDay[dateKey(dt)];
    out.push(d && d.n ? d.t / d.n / 1000 : null);
  }
  return out;
}

// Линейный тренд по дням, где есть данные: сколько секунд будет через 14 дней
function forecast(points) {
  const xs = [], ys = [];
  points.forEach((v, i) => { if (v != null) { xs.push(i); ys.push(v); } });
  if (xs.length < 4) return null;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const k = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / Math.max(1e-9, xs.reduce((a, x) => a + (x - mx) ** 2, 0));
  const now = my + k * (points.length - 1 - mx);
  const later = Math.max(0.4, my + k * (points.length - 1 + 14 - mx));
  return { now: Math.max(0.4, now), later, k };
}

function speedChart(points) {
  const W = 320, H = 130, P = 12;
  const vals = points.filter(v => v != null);
  if (vals.length < 2) return `<div class="empty">${tr('Нужно хотя бы два дня тренировок')}</div>`;
  const max = Math.max(...vals) * 1.1;
  const min = Math.max(0, Math.min(...vals) * 0.8);
  const x = i => P + (i / (points.length - 1)) * (W - 2 * P);
  const y = v => H - P - ((v - min) / Math.max(0.01, max - min)) * (H - 2 * P);
  let d = '';
  let area = '';
  let first = null;
  let lastX = 0;
  points.forEach((v, i) => {
    if (v == null) return;
    d += `${first === null ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    if (first === null) first = x(i);
    lastX = x(i);
  });
  area = `${d}L${lastX.toFixed(1)} ${H - P}L${first.toFixed(1)} ${H - P}Z`;
  const dots = points.map((v, i) => (v == null ? '' : `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3"/>`)).join('');
  return `
    <svg class="speed-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="${tr('Скорость по дням')}">
      <defs><linearGradient id="spd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ebb53d" stop-opacity=".35"/><stop offset="1" stop-color="#ebb53d" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#spd)"/>
      <path d="${d}" fill="none" stroke="#ffd66e" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <g fill="#ffd66e">${dots}</g>
    </svg>
    <div class="chart-axis"><span>${tr('30 дней назад')}</span><span>${tr('сегодня')}</span></div>`;
}

Hooks.on('statsTop', () => {
  const withData = Object.entries(data.opStats).filter(([op, s]) => OPS[op] && s.n >= 10).map(([op]) => op);
  if (speedOp && speedOp !== 'all' && !withData.includes(speedOp)) speedOp = null;
  const op = speedOp || 'all';
  const pts = dailySpeed(op);
  const f = forecast(pts);
  const change = f ? Math.round(((f.later - f.now) / f.now) * 100) : 0;
  return `
    <div class="section-title"><h2>${tr('Скорость')}</h2><span>${tr('секунд на пример, по дням')}</span></div>
    <div class="card speed-card">
      <div class="chips speed-ops">
        <button class="chip ${op === 'all' ? 'on' : ''}" data-action="speed-op" data-op="all">${tr('Все темы')}</button>
        ${withData.map(o => `<button class="chip ${op === o ? 'on' : ''}" data-action="speed-op" data-op="${o}">${opIco(o)}${OPS[o].name}</button>`).join('')}
      </div>
      ${speedChart(pts)}
      ${f ? `<div class="forecast ${change <= 0 ? 'good' : 'bad'}">${ico('comet')}<span>${change < -1
        ? tr('Прогноз: через 2 недели ~{0} с на пример — на {1}% быстрее.', fmtSec(f.later), Math.abs(change))
        : change > 1 ? tr('Скорость немного упала. Короткие тренировки каждый день вернут темп.') : tr('Скорость держится ровно: ~{0} с на пример.', fmtSec(f.now))}</span></div>` : ''}
    </div>`;
});

/* ---------- Сравнение недель, время суток, слабые пары, поделиться ---------- */

function weekCompare() {
  const r = weekReport();
  const bar = (label, a, b, fmt = v => v, lowerBetter = false) => {
    const max = Math.max(a, b, 0.0001);
    const better = lowerBetter ? a < b : a > b;
    return `
      <div class="wc-row">
        <span class="wc-label">${label}</span>
        <div class="wc-bars">
          <span class="wc-bar now ${better ? 'up' : ''}"><i style="width:${(a / max) * 100}%"></i><b>${fmt(a)}</b></span>
          <span class="wc-bar prev"><i style="width:${(b / max) * 100}%"></i><b>${fmt(b)}</b></span>
        </div>
      </div>`;
  };
  return `
    <div class="section-title"><h2>${tr('Эта неделя и прошлая')}</h2><span class="wc-legend"><i class="now"></i>${tr('эта')} <i class="prev"></i>${tr('прошлая')}</span></div>
    <div class="card week-compare">
      ${bar(tr('Решено'), r.cur.n, r.old.n)}
      ${bar(tr('Точность'), r.accuracy, r.accuracyPrev || 0, v => `${Math.round(v)}%`)}
      ${bar(tr('Ср. время'), r.avgSec, r.avgSecPrev || 0, v => tr('{0} с', fmtSec(v)), true)}
      ${bar(tr('Тренировок'), r.cur.sessions, r.old.sessions)}
    </div>`;
}

function timeOfDay() {
  const buckets = [
    { name: tr('Утро'), icon: 'sun', from: 5, to: 12 },
    { name: tr('День'), icon: 'sun', from: 12, to: 17 },
    { name: tr('Вечер'), icon: 'moon', from: 17, to: 22 },
    { name: tr('Ночь'), icon: 'moon', from: 22, to: 29 },
  ].map(b => ({ ...b, n: 0, c: 0, ms: 0 }));
  for (const s of data.sessions) {
    let h = new Date(s.date).getHours();
    if (h < 5) h += 24;
    const b = buckets.find(x => h >= x.from && h < x.to);
    if (!b) continue;
    const n = s.correct + s.wrong;
    b.n += n; b.c += s.correct; b.ms += s.avgMs * n;
  }
  const rated = buckets.filter(b => b.n >= 20);
  if (rated.length < 2) return '';
  const score = b => b.c / b.n - b.ms / b.n / 20000;
  const best = rated.slice().sort((a, b) => score(b) - score(a))[0];
  return `
    <div class="section-title"><h2>${tr('Когда ты считаешь лучше')}</h2></div>
    <div class="card tod-card">
      <div class="tod-grid">
        ${buckets.map(b => `
          <div class="tod ${b === best ? 'best' : ''} ${b.n < 20 ? 'few' : ''}">
            <span>${ico(b.icon)}</span><b>${b.name}</b>
            <small>${b.n ? `${Math.round((b.c / b.n) * 100)}% · ${tr('{0} с', fmtSec(b.ms / b.n / 1000))}` : '—'}</small>
          </div>`).join('')}
      </div>
      <p class="hint" style="margin:10px 0 0">${tr('Лучше всего у тебя получается: {0}. Планируй важные тренировки на это время.', best.name.toLowerCase())}</p>
    </div>`;
}

function weakPairs() {
  const pairs = Object.entries(data.tableStats)
    .map(([k, st]) => { const [a, b] = k.split('x').map(Number); return { a, b, m: tableMastery(a, b), n: st.n }; })
    .filter(p => p.n >= 2 && p.m < 0.8)
    .sort((x, y) => x.m - y.m)
    .slice(0, 6);
  if (!pairs.length) return '';
  return `
    <div class="card weak-pairs">
      <span class="eyebrow">${tr('Слабые пары таблицы')}</span>
      <div class="wp-list">${pairs.map(p => `<span class="wp">${p.a} × ${p.b} = ${p.a * p.b}</span>`).join('')}</div>
      <button class="btn primary block" data-action="train-pairs" data-nums="${[...new Set(pairs.flatMap(p => [p.a, p.b]))].join(',')}">${ico('grid')} ${tr('Потренировать эти пары')}</button>
    </div>`;
}

Hooks.on('statsMid', () => `
  ${weakPairs()}
  ${weekCompare()}
  ${timeOfDay()}
  <div class="row-buttons stats-share">
    <button class="btn" data-action="share-stats">${ico('share')} ${tr('Поделиться статистикой')}</button>
    <button class="btn ghost" data-action="nav" data-view="leaders">${ico('users')} ${tr('Лидеры устройства')}</button>
  </div>`);

/* ---------- Главная: сильная и слабая тема ---------- */

Hooks.on('dashAfterTip', d => {
  const rated = Object.entries(d.opStats).filter(([op, s]) => OPS[op] && s.n >= 20)
    .map(([op, s]) => ({ op, score: s.c / s.n - s.t / s.n / 30000 }))
    .sort((a, b) => b.score - a.score);
  if (rated.length < 2) return '';
  const best = rated[0].op;
  const worst = rated[rated.length - 1].op;
  return `
    <div class="card topics-card">
      <div class="tc-half"><small>${tr('Сильная тема')}</small><b>${opIco(best)}${OPS[best].name}</b></div>
      <button class="tc-half weak" data-action="focusop" data-op="${worst}"><small>${tr('Подтянуть')}</small><b>${opIco(worst)}${OPS[worst].name}</b><span class="chev">›</span></button>
    </div>`;
});

/* ---------- Лидеры на этом устройстве (все профили) ---------- */

let leadersBy = 'xp';

function profileSummary(p) {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(profileKey(p.id)) || 'null'); } catch { d = null; }
  if (p.id === profiles.active) d = data;
  if (!d) return { p, xp: 0, ladder: 0, sprint: 0, week: 0, streak: 0 };
  const weekAgo = Date.now() - 7 * 864e5;
  return {
    p,
    xp: d.xp || 0,
    ladder: d.ladder?.best || 0,
    sprint: Math.max(0, ...Object.entries(d.records || {}).filter(([k]) => k.startsWith('sprint|')).map(([, r]) => r.score)),
    week: (d.sessions || []).filter(s => s.date >= weekAgo).reduce((a, s) => a + (s.xp || 0), 0),
    streak: d.bestStreak || 0,
  };
}

function renderLeaders() {
  const metrics = { xp: tr('Опыт'), week: tr('За неделю'), ladder: tr('Лестница'), sprint: tr('Спринт'), streak: tr('Серия') };
  const rows = profiles.list.map(profileSummary).sort((a, b) => b[leadersBy] - a[leadersBy]);
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="stats">‹ ${tr('Статистика')}</button>
    <h1 class="page-title">${tr('Лидеры устройства')}</h1>
    <div class="segmented learn-tabs">${Object.entries(metrics).map(([k, l]) => `<button class="${leadersBy === k ? 'on' : ''}" data-action="leaders-by" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="leaders">
      ${rows.map((r, i) => `
        <div class="leader ${r.p.id === profiles.active ? 'me' : ''}">
          <span class="lead-pos p${i + 1}">${i + 1}</span>
          <span class="set-avatar" style="background:${r.p.color}">${escH(r.p.name.slice(0, 1).toUpperCase())}</span>
          <span class="lead-name">${escH(r.p.name)}<small>${tr('Уровень {0}', levelFromXp(r.xp))}</small></span>
          <b>${fmtNum(r[leadersBy])}</b>
        </div>`).join('')}
    </div>
    <p class="hint">${profiles.list.length < 2 ? tr('Добавь профили для брата, сестры или друзей в Настройках → Профили — и соревнуйтесь на одном телефоне.') : tr('Все профили на этом телефоне. Чтобы соревноваться с друзьями на других телефонах, используй «Матч по коду» и «Турнир недели».')}</p>`;
}
Hooks.view('leaders', renderLeaders);

/* ---------- Класс: учитель собирает коды отчётов учеников ---------- */

const b64enc = s => btoa(unescape(encodeURIComponent(s))).replace(/=+$/, '');
const b64dec = s => decodeURIComponent(escape(atob(s)));

function studentCode() {
  const r = weekReport();
  const payload = {
    n: profileName().slice(0, 20), w: weekId(), l: levelFromXp(data.xp), s: r.cur.n, a: r.accuracy,
    t: Math.round(r.avgSec * 10) / 10, g: r.goalDays, k: dayStreak(data), x: r.cur.xp, wk: r.weakest?.op || '', ld: ladderState(data).best,
  };
  const body = b64enc(JSON.stringify(payload));
  return `C-${body}-${(hashString(body) % 1296).toString(36).toUpperCase().padStart(2, '0')}`;
}

function parseStudent(code) {
  const m = /^C-([A-Za-z0-9+/]+)-([0-9A-Z]{1,2})$/.exec(code.trim());
  if (!m) return null;
  if ((hashString(m[1]) % 1296).toString(36).toUpperCase().padStart(2, '0') !== m[2].padStart(2, '0')) return null;
  try { return JSON.parse(b64dec(m[1])); } catch { return null; }
}

function renderClass() {
  const list = data.classList || [];
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="settings">‹ ${tr('Настройки')}</button>
    <h1 class="page-title">${tr('Класс')}</h1>
    <div class="card">
      <p class="muted" style="margin:0 0 12px">${tr('Ученики присылают код отчёта (Настройки → «Мой код для учителя»). Вставь коды сюда — увидишь всех в одной таблице.')}</p>
      <div class="row-buttons">
        <button class="btn primary" data-action="class-add">${ico('add')} ${tr('Добавить код')}</button>
        ${list.length ? `<button class="btn ghost" data-action="class-copy">${ico('clipboard')} ${tr('Скопировать таблицу')}</button><button class="btn ghost" data-action="class-clear">${tr('Очистить')}</button>` : ''}
      </div>
    </div>
    ${list.length ? `
    <div class="class-table">
      <div class="ct-row head"><span>${tr('Ученик')}</span><span>${tr('Решено')}</span><span>${tr('Точн.')}</span><span>${tr('Время')}</span><span>${tr('Дни')}</span></div>
      ${list.slice().sort((a, b) => b.s - a.s).map(st => `
        <div class="ct-row">
          <span><b>${escH(st.n)}</b><small>${tr('ур. {0}', st.l)} · ${escH(st.w)}${st.wk && OPS[st.wk] ? ` · ${escH(OPS[st.wk].name.toLowerCase())}` : ''}</small></span>
          <span>${st.s}</span><span class="${st.a >= 85 ? 'up' : st.a < 60 ? 'down' : ''}">${st.a}%</span><span>${fmtDec(st.t)}</span><span>${st.g}/7</span>
        </div>`).join('')}
    </div>` : `<div class="parts-empty">${ico('users')}<span>${tr('Пока нет ни одного ученика')}</span></div>`}`;
}
Hooks.view('class', renderClass);

async function classAdd() {
  const code = await Dialog.prompt({ icon: 'users', title: tr('Код ученика'), text: tr('Вставь код, который прислал ученик.'), placeholder: 'C-…', ok: tr('Добавить'), maxLength: 600 });
  if (!code) return;
  const st = parseStudent(code);
  if (!st) { toast(tr('Код не подходит')); return; }
  data.classList ||= [];
  const i = data.classList.findIndex(x => x.n === st.n);
  if (i >= 0) data.classList[i] = st; else data.classList.push(st);
  saveData();
  renderClass();
  toast(tr('Добавлен: {0}', st.n));
}

function classText() {
  return [tr('Ученик'), tr('Решено'), tr('Точность'), tr('Время'), tr('Дни цели')].join('\t') + '\n'
    + (data.classList || []).map(s => [s.n, s.s, `${s.a}%`, fmtDec(s.t), `${s.g}/7`].join('\t')).join('\n');
}

/* ---------- Действия ---------- */

Hooks.on('action', (action, el) => {
  switch (action) {
    case 'share-result': {
      const info = lastResultInfo;
      if (info) shareImage(() => resultImage(info.session, info.name), `math-for-speed-${dateKey()}.png`, tr('Мой результат в Math for Speed'));
      return true;
    }
    case 'share-stats': shareImage(statsImage, `math-for-speed-stats-${dateKey()}.png`, tr('Моя статистика в Math for Speed')); return true;
    case 'share-recap': shareImage(recapImage, `math-for-speed-${new Date().getFullYear()}.png`, tr('Мой год в Math for Speed')); return true;
    case 'challenge-friend': challengeFriend(); return true;
    case 'speed-op': speedOp = el.dataset.op; renderStats('period'); return true;
    case 'train-pairs': {
      const s = data.settings;
      s.tableNums = el.dataset.nums.split(',').map(Number);
      s.mode = 'table';
      saveData();
      startGame('table');
      return true;
    }
    case 'leaders-by': leadersBy = el.dataset.v; renderLeaders(); return true;
    case 'class-add': classAdd(); return true;
    case 'class-copy': UI.copyText ? UI.copyText(classText()) : Native.copy(classText()).then(() => toast(tr('Скопировано'))); return true;
    case 'class-clear':
      Dialog.confirm({ icon: 'users', title: tr('Очистить список класса?'), ok: tr('Очистить'), danger: true }).then(ok => { if (ok) { data.classList = []; saveData(); renderClass(); } });
      return true;
    case 'student-code': {
      const code = studentCode();
      Dialog.open({
        icon: 'users', title: tr('Мой код для учителя'), text: tr('Отправь этот код учителю — он увидит твою неделю: сколько решено, точность и скорость.'), code,
        buttons: [{ label: tr('Закрыть'), value: false, kind: 'ghost' }, { label: tr('Отправить'), value: true, kind: 'primary' }],
        dismiss: { button: false },
      }).then(res => { if (res?.button) Native.shareText(code); });
      return true;
    }
    default:
      return false;
  }
});
