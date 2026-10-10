'use strict';

/* =========================================================
   Мотивация и награды: задания дня и недели, ключи, награда
   за вход, гарантия и шансы сундука, магазин, коллекции,
   разбор копий, обмен частей, эффекты аватара, комплекты,
   витрина, титулы, секреты, мастерство тем, итоги года,
   цель на экзамен и всё про Лестницу: боссы, попытки, карта,
   модификаторы и сезоны.
   ========================================================= */

const meRng = key => seededRandom(hashString(`${key}|${profiles.active}`));
const lvlTier = d => { const l = levelFromXp(d.xp); return l < 5 ? 0 : l < 15 ? 1 : 2; };

function giveCoins(n, sound = true) {
  data.coins = (data.coins || 0) + n;
  if (sound) Sound.coin();
}
const giveKeys = n => { data.keys = (data.keys || 0) + n; };
const lifeOf = d => (d.life ||= {});

// Предмет, который игроку ещё нужен, из сундука данной редкости
function pickWanted(chestId, rng = Math.random, types = ['crown', 'frame', 'art']) {
  const pool = [];
  for (const type of types) {
    for (const item of LOOT_LISTS[type]) {
      if (item.chest === chestId && !item.noDrop && !item.ultra && wantsItem(data, type, item)) pool.push({ type, item });
    }
  }
  return pool.length ? pool[Math.floor(rng() * pool.length)] : null;
}

// Сундук в подарок (за вход, задания, из магазина): открывается сразу с анимацией
function openBonusChest(id, then) {
  const base = CHESTS.find(x => x.id === id) || CHESTS[0];
  const c = { ...base, luck: 0 };
  data.xp += c.xp;
  if (c.freeze) data.freezes = (data.freezes || 0) + 1;
  c.loot = grantLoot(data, c.id, rollLoot(c.id));
  if (!c.loot) c.parts = grantParts(data, rollParts(c.id));
  lifeOf(data).chests = (data.life.chests || 0) + 1;
  syncCoins(data);
  saveData();
  const done = () => { renderLevelChip(); then?.(); if (!then) rerender(); };
  if (FX.on()) chestReveal(c, done);
  else {
    toast(`${c.name}: +${c.xp} XP${c.loot ? ` · ${lootName(c.loot)}` : ''}`);
    done();
  }
}

/* =========================================================
   Задания дня и недели
   ========================================================= */

const QUEST_TYPES = {
  correct: { title: n => tr('Реши верно {0} примеров', n), prog: s => s.correct, d: [30, 60, 100], w: [300, 500, 800] },
  op: { title: (n, q) => tr('{0}: {1} верных', OPS[q.op]?.name || '', n), prog: (s, q) => s.opCounts?.[q.op]?.c || 0, d: [10, 20, 30], w: [80, 150, 250] },
  streak: { title: n => tr('Серия {0} без ошибок', n), max: true, prog: s => s.maxStreak, d: [10, 15, 25], w: [25, 35, 50] },
  games: { title: n => tr('Заверши тренировок: {0}', n), prog: s => (s.completed && s.correct + s.wrong >= 5 ? 1 : 0), d: [2, 3, 4], w: [10, 15, 20] },
  fast: { title: n => tr('Ответов быстрее 2 секунд: {0}', n), prog: s => s.fast || 0, d: [15, 30, 50], w: [150, 250, 400] },
  golden: { title: n => tr('Поймай золотых примеров: {0}', n), prog: s => s.golden || 0, d: [1, 2, 3], w: [8, 12, 20] },
  accurate: { title: n => tr('Тренировок с точностью 90%+ (от 20 ответов): {0}', n), prog: s => (s.correct + s.wrong >= 20 && s.correct / (s.correct + s.wrong) >= 0.9 ? 1 : 0), d: [1, 1, 2], w: [5, 7, 10] },
  ladder: { title: n => tr('Пройди уровней Лестницы: {0}', n), prog: (s, q, ctx) => (ctx.ladder?.passed ? 1 : 0), d: [1, 2, 3], w: [5, 10, 15] },
  variant: { title: n => tr('Сыграй в новые режимы: {0}', n), prog: s => (s.variant ? 1 : 0), d: [1, 2, 3], w: [5, 8, 12] },
};
const DAILY_REWARD = [40, 60, 80];
const WEEKLY_REWARD = 250;

function makeQuests(key, weekly) {
  const rng = meRng(`${weekly ? 'wq' : 'dq'}-${key}`);
  const tier = lvlTier(data);
  const types = Object.keys(QUEST_TYPES).filter(t => !(weekly && t === 'op'));
  const chosen = [];
  while (chosen.length < 3) {
    const t = types[Math.floor(rng() * types.length)];
    if (!chosen.includes(t)) chosen.push(t);
  }
  const myOps = data.settings.ops.filter(o => OPS[o]);
  return chosen.map((type, i) => {
    const q = { type, p: 0, done: false };
    if (type === 'op') q.op = myOps.length ? myOps[Math.floor(rng() * myOps.length)] : pick(['add', 'mul']);
    q.n = QUEST_TYPES[type][weekly ? 'w' : 'd'][tier];
    q.reward = weekly ? WEEKLY_REWARD : DAILY_REWARD[i];
    return q;
  });
}

function questState() {
  const q = (data.quests ||= {});
  const day = dateKey();
  const week = weekId();
  if (q.day !== day) { q.day = day; q.list = makeQuests(day, false); q.bonus = false; }
  if (q.week !== week) { q.week = week; q.wlist = makeQuests(week, true); q.wbonus = false; }
  return q;
}

const questTitle = q => QUEST_TYPES[q.type].title(q.n, q);

function progressQuests(session, ctx, banners) {
  const st = questState();
  let coins = 0;
  const done = [];
  for (const [list, weekly] of [[st.list, false], [st.wlist, true]]) {
    for (const q of list) {
      if (q.done) continue;
      const v = QUEST_TYPES[q.type].prog(session, q, ctx) || 0;
      q.p = QUEST_TYPES[q.type].max ? Math.max(q.p, v) : q.p + v;
      if (q.p >= q.n) {
        q.p = q.n;
        q.done = true;
        q.got = Math.round(q.reward * (1 + lootBonuses(data).quest / 100));
        coins += q.got;
        done.push({ q, weekly });
      }
    }
  }
  if (!coins) return;
  giveCoins(coins, false);
  setTimeout(() => Sound.coin(), 700);
  done.forEach(({ q, weekly }) => banners.push(`<div class="banner gold quest-banner">${ico(weekly ? 'calendar' : 'target')}<span>${weekly ? tr('Задание недели:') : tr('Задание дня:')} <b>${escH(questTitle(q))}</b> · +${q.got || q.reward} ${ico('coin')}</span></div>`));
  if (!st.bonus && st.list.every(q => q.done)) {
    st.bonus = true;
    giveKeys(1);
    banners.push(`<div class="banner gold">${ico('key')}<span>${tr('Все задания дня выполнены!')} <b>+1 ${tr('ключ')}</b></span></div>`);
  }
  if (!st.wbonus && st.wlist.every(q => q.done)) {
    st.wbonus = true;
    giveKeys(1);
    data.pendingChest = 'epic';
    banners.push(`<div class="banner gold">${ico('chest')}<span>${tr('Все задания недели выполнены!')} <b>+1 ${tr('ключ')} · ${tr('Эпический сундук')}</b></span></div>`);
  }
}

function questRow(q) {
  const pct = Math.round((q.p / q.n) * 100);
  return `
    <div class="quest ${q.done ? 'done' : ''}">
      <span class="q-check">${q.done ? '✓' : ''}</span>
      <span class="q-main">
        <b>${escH(questTitle(q))}</b>
        <span class="part-bar"><i style="width:${pct}%"></i></span>
      </span>
      <span class="q-rew">${q.done ? `<s>${q.reward}</s>` : q.reward}${ico('coin')}</span>
    </div>`;
}

function questsCard() {
  const st = questState();
  const doneN = st.list.filter(q => q.done).length;
  const wDone = st.wlist.filter(q => q.done).length;
  return `
    <section class="card quests-card">
      <div class="row-head">
        <span class="icon-sq sm">${ico('target')}</span>
        <span class="gold">${tr('Задания дня')}</span>
        <span class="muted">${doneN} / 3</span>
        <span class="keys-chip" title="${tr('Ключи')}">${ico('key')}<b>${data.keys || 0}</b></span>
      </div>
      ${st.list.map(questRow).join('')}
      <button class="quest-week" data-action="quests-week">
        ${ico('calendar')}<span>${tr('Задания недели')}</span><b>${wDone} / 3</b><span class="chev">›</span>
      </button>
    </section>`;
}

function showWeekly() {
  const st = questState();
  Dialog.open({
    icon: 'calendar',
    title: tr('Задания недели'),
    text: tr('По {0} монет за каждое. Все три — ключ и эпический сундук.', WEEKLY_REWARD),
    html: `<div class="quests-dlg">${st.wlist.map(questRow).join('')}</div>`,
    buttons: [{ label: tr('Закрыть'), value: false, kind: 'ghost' }],
    dismiss: { button: false },
  });
}

/* =========================================================
   Ключи: улучшить сундук на ступень перед открытием
   ========================================================= */

// Отменяет выданную добычу сундука — чтобы выдать добычу сундука повыше
function revertChest(c) {
  data.xp -= c.xp;
  if (c.freeze) data.freezes = Math.max(0, (data.freezes || 0) - 1);
  const inv = invOf(data);
  if (c.loot) {
    const { type, item } = c.loot;
    const bag = { crown: inv.crowns, frame: inv.frames, art: inv.arts }[type];
    const key = partKey(type, item.id);
    if (c.loot.coins) data.coins = Math.max(0, (data.coins || 0) - c.loot.coins);
    else if (c.loot.copy) { inv.copies[key] = Math.max(0, (inv.copies[key] || 1) - 1); if (!inv.copies[key]) delete inv.copies[key]; }
    else if (c.loot.level === 1) delete bag[item.id];
  }
  if (c.parts) {
    const parts = partsOf(data);
    const key = partKey(c.parts.type, c.parts.item.id);
    if (c.parts.before) parts[key] = c.parts.before;
    else delete parts[key];
  }
}

function upgradeChest() {
  const c = lastChest;
  if (!c || (data.keys || 0) <= 0) return;
  const idx = CHESTS.findIndex(x => x.id === c.id);
  if (idx < 0 || idx >= CHESTS.length - 1) return;
  const card = document.querySelector('.chest-card');
  if (card?.classList.contains('opened')) return;
  revertChest(c);
  data.keys--;
  const next = { ...CHESTS[idx + 1], luck: c.luck };
  data.xp += next.xp;
  if (next.freeze) data.freezes = (data.freezes || 0) + 1;
  next.loot = grantLoot(data, next.id, rollLoot(next.id));
  if (!next.loot) next.parts = grantParts(data, rollParts(next.id));
  if (idx + 1 >= 3) data.pity = 0;
  lastChest = next;
  saveData();
  Sound.streak();
  vibrate([0, 30, 30, 50]);
  if (card) {
    card.style.setProperty('--rc', next.color);
    FX.pulse(card, 'fx-pop', 500);
    FX.burstAt(card, { count: 18, spread: 110, kind: 'confetti' });
  }
  const box = document.querySelector('.chest-extra');
  if (box) box.outerHTML = chestExtraHtml(next);
  toast(tr('Сундук улучшен: {0}', next.name));
}

function chestExtraHtml(c) {
  const idx = CHESTS.findIndex(x => x.id === c.id);
  const canUp = (data.keys || 0) > 0 && idx < CHESTS.length - 1;
  const left = Math.max(0, PITY_LIMIT - (data.pity || 0));
  return `
    <div class="chest-extra">
      <button class="btn ghost sm" data-action="chest-odds">${ico('chart')} ${tr('Шансы')}</button>
      ${canUp ? `<button class="btn sm key-btn" data-action="chest-upgrade">${ico('key')} ${tr('Улучшить ключом')} <b>${data.keys}</b></button>` : `<span class="muted pity-note">${c.pity ? tr('Сработала гарантия!') : tr('Легендарный гарантирован через {0}', left)}</span>`}
    </div>`;
}

function showOdds() {
  const c = lastChest;
  const w = chestWeights(c?.luck || 0);
  const sum = w.reduce((a, b) => a + b, 0);
  const rows = CHESTS.map((ch, i) => `
    <div class="odds-row" style="--rc:${ch.color}">
      <span class="odds-dot"></span><b>${escH(ch.name)}</b>
      <span>${((w[i] / sum) * 100).toFixed(1)}%</span>
      <small>${tr('предмет {0}%', Math.round(LOOT_CHANCE[ch.id] * 100))}</small>
    </div>`).join('');
  Dialog.open({
    icon: 'chest',
    title: tr('Шансы сундука'),
    text: tr('Удача этой тренировки: {0}. Точность, серия и золотые примеры повышают шанс на редкий сундук.', '✦'.repeat(c?.luck || 0) || '—'),
    html: `<div class="odds">${rows}</div><p class="hint">${tr('Если сундук без предмета — может выпасть часть предмета. После {0} сундуков без легендарного следующий будет легендарным.', PITY_LIMIT)}</p>`,
    buttons: [{ label: tr('Понятно'), value: false, kind: 'primary' }],
    dismiss: { button: false },
  });
}

Hooks.on('chestExtra', c => chestExtraHtml(c));
Hooks.on('chestRolled', () => { lifeOf(data).chests = (data.life.chests || 0) + 1; });

/* =========================================================
   Награда за вход: календарь на 7 дней
   ========================================================= */

const LOGIN_REWARDS = [
  { kind: 'coins', n: 50, icon: 'coin' },
  { kind: 'key', n: 1, icon: 'key' },
  { kind: 'coins', n: 100, icon: 'coins' },
  { kind: 'parts', n: 2, icon: 'puzzle' },
  { kind: 'chest', id: 'rare', icon: 'chest' },
  { kind: 'coins', n: 150, key: 1, icon: 'coins' },
  { kind: 'chest', id: 'epic', icon: 'gift' },
];

const loginState = () => (data.login ||= { last: null, day: 0 });

function loginDue() {
  const st = loginState();
  return st.last !== dateKey();
}

function loginNextDay() {
  const st = loginState();
  if (!st.last) return 0;
  const gap = Math.round((new Date(dateKey()) - new Date(st.last)) / 864e5);
  if (gap > 2) return 0; // долгий перерыв — календарь сначала
  return st.day % 7;
}

const rewardLabel = r => (r.kind === 'coins' ? `${r.n}${r.key ? ' + 🔑' : ''}` : r.kind === 'key' ? tr('Ключ') : r.kind === 'parts' ? tr('Части ×{0}', r.n) : r.id === 'epic' ? tr('Эпический') : tr('Редкий'));

function loginCard() {
  if (!loginDue()) return '';
  const next = loginNextDay();
  return `
    <section class="card login-card">
      <div class="row-head"><span class="icon-sq sm">${ico('gift')}</span><span class="gold">${tr('Награда за вход')}</span><span class="muted">${tr('день {0} из 7', next + 1)}</span></div>
      <div class="login-days">
        ${LOGIN_REWARDS.map((r, i) => `
          <div class="lday ${i < next ? 'got' : i === next ? 'now' : ''}">
            <small>${i + 1}</small>
            <span class="lday-ico">${ico(r.icon)}</span>
            <b>${escH(rewardLabel(r))}</b>
          </div>`).join('')}
      </div>
      <button class="btn primary block" data-action="login-claim">${tr('Забрать')}</button>
    </section>`;
}

function claimLogin() {
  if (!loginDue()) return;
  const st = loginState();
  const i = loginNextDay();
  const r = LOGIN_REWARDS[i];
  st.last = dateKey();
  st.day = i + 1;
  const after = () => { saveData(); navigate('dashboard'); };
  if (r.kind === 'coins') { giveCoins(r.n); if (r.key) giveKeys(r.key); toast(tr('+{0} монет', r.n)); after(); return; }
  if (r.kind === 'key') { giveKeys(1); Sound.streak(); toast(tr('+1 ключ')); after(); return; }
  if (r.kind === 'parts') {
    const w = pickWanted('rare') || pickWanted('common');
    if (w) {
      const pr = grantParts(data, { ...w, n: r.n });
      toast(tr('Части: {0} ({1}/{2})', w.item.name, pr.have, pr.need));
    } else { giveCoins(100); toast(tr('+{0} монет', 100)); }
    Sound.achievement();
    after();
    return;
  }
  saveData();
  openBonusChest(r.id, () => navigate('dashboard'));
}

/* =========================================================
   Магазин: 4–5 предложений, меняются каждый час
   ========================================================= */

const COPY_PRICE = { common: 80, rare: 160, epic: 300, legendary: 550, mythic: 1100, ultra: 2000 };
const PARTS_PRICE = { rare: 150, epic: 280, legendary: 500 };

// Ключ часа: с ним товары меняются каждый час, а не раз в сутки
const shopKey = (t = new Date()) => `${dateKey(t)}-${t.getHours()}`;
// Когда будет следующая смена товаров
function shopNextTime() {
  const t = new Date();
  t.setHours(t.getHours() + 1, 0, 0, 0);
  return t;
}
const shopLeftText = () => tr('Новые товары в {0}', shopNextTime().toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit' }));

function shopOffers() {
  const rng = meRng(`shop-${shopKey()}`);
  const offers = [];
  const pr = ['rare', 'epic', 'legendary'][Math.floor(rng() * 3)];
  const w = pickWanted(pr, rng) || pickWanted('rare', rng);
  if (w) offers.push({ id: 'parts', kind: 'parts', type: w.type, item: w.item, n: 3, price: PARTS_PRICE[w.item.chest] || 200 });
  const owned = [];
  for (const [type, list] of Object.entries(LOOT_LISTS)) {
    for (const item of list) {
      const L = itemLevel(data, type, item);
      if (L > 0 && L < itemMax(type)) owned.push({ type, item });
    }
  }
  if (owned.length) {
    const o = owned[Math.floor(rng() * owned.length)];
    offers.push({ id: 'copy', kind: 'copy', type: o.type, item: o.item, price: COPY_PRICE[rarityOf(o.item)] || 200 });
  }
  offers.push({ id: 'key', kind: 'key', price: 150 });
  const epic = rng() < 0.4;
  offers.push({ id: 'chest', kind: 'chest', chest: epic ? 'epic' : 'rare', price: epic ? 450 : 200 });
  const season = currentSeason();
  const sItems = [...LOOT_CROWNS, ...FRAMES].filter(x => x.season === season);
  const si = sItems[Math.floor(rng() * sItems.length)];
  if (si) {
    const type = LOOT_CROWNS.includes(si) ? 'crown' : 'frame';
    if (wantsItem(data, type, si)) offers.push({ id: 'season', kind: 'parts', type, item: si, n: 2, price: 300, season: true });
  }
  return offers;
}

const shopState = () => {
  const st = (data.shop ||= { key: null, bought: [] });
  if (st.key !== shopKey()) { st.key = shopKey(); st.bought = []; }
  return st;
};

function offerPic(o) {
  if (o.kind === 'key') return `<span class="art-pic" style="--ac:#ffcf3f">${ico('key')}</span>`;
  if (o.kind === 'chest') return `<span class="art-pic" style="--ac:${CHESTS.find(c => c.id === o.chest).color}">${ico('chest')}</span>`;
  return lootPic({ type: o.type, item: o.item });
}

function offerTitle(o) {
  if (o.kind === 'key') return tr('Золотой ключ');
  if (o.kind === 'chest') return CHESTS.find(c => c.id === o.chest).name;
  if (o.kind === 'copy') return tr('Копия: {0}', o.item.name);
  return tr('Части ×{0}: {1}', o.n, o.item.name);
}

function offerNote(o) {
  if (o.kind === 'key') return tr('Улучшает сундук на ступень');
  if (o.kind === 'chest') return tr('Откроется сразу');
  if (o.kind === 'copy') return tr('Для прокачки в Мастерской');
  return o.season ? tr('Сезонный предмет · {0}', SEASON_NAMES[currentSeason()]) : tr('Части пазла для сборки');
}

let shopTimer = null;
Hooks.on('navigated', () => { if (currentView !== 'shop') { clearInterval(shopTimer); shopTimer = null; } });

function renderShop() {
  const st = shopState();
  const offers = shopOffers();
  const shownKey = shopKey();
  clearInterval(shopTimer);
  shopTimer = setInterval(() => {
    if (currentView !== 'shop') { clearInterval(shopTimer); shopTimer = null; return; }
    if (shopKey() !== shownKey) { saveData(); renderShop(); toast(tr('В магазине новые товары')); return; }
    const el = document.querySelector('.shop-left');
    if (el) el.textContent = shopLeftText();
  }, 15000);
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="forge">‹ ${tr('Мастерская')}</button>
    <h1 class="page-title">${tr('Магазин')}</h1>
    <section class="card glow forge-hero">
      <span class="fh-ico">${ico('cart')}</span>
      <div class="fh-main">
        <small>${tr('Монеты')}</small>
        <b class="fh-num">${fmtNum(data.coins || 0)}</b>
        <span class="fh-next">${tr('Товары меняются каждый час')} · <b class="shop-left">${escH(shopLeftText())}</b> · ${ico('key')} ${data.keys || 0}</span>
      </div>
    </section>
    <div class="shop-list">
      ${offers.map(o => {
        const sold = st.bought.includes(o.id);
        const can = !sold && (data.coins || 0) >= o.price;
        return `
        <div class="shop-item ${sold ? 'sold' : ''} ${o.season ? 'season' : ''}">
          <span class="fc-pic">${offerPic(o)}</span>
          <div class="fc-main"><b>${escH(offerTitle(o))}</b><small class="fc-eff">${escH(offerNote(o))}</small></div>
          <button class="shop-buy ${can ? 'ok' : ''}" data-action="shop-buy" data-id="${o.id}" ${sold ? 'disabled' : ''}>${sold ? tr('Куплено') : `${ico('coin')}<b>${fmtNum(o.price)}</b>`}</button>
        </div>`;
      }).join('')}
    </div>
    <p class="hint">${tr('Монеты даются за новые уровни, задания, награды за вход и повторы предметов на максимуме.')}</p>`;
}
Hooks.view('shop', renderShop);

function buyOffer(id) {
  const st = shopState();
  const o = shopOffers().find(x => x.id === id);
  if (!o || st.bought.includes(id)) return;
  if ((data.coins || 0) < o.price) { toast(tr('Не хватает монет: ещё {0}', fmtNum(o.price - (data.coins || 0)))); return; }
  data.coins -= o.price;
  st.bought.push(id);
  Sound.coin();
  if (o.kind === 'key') { giveKeys(1); toast(tr('+1 ключ')); }
  if (o.kind === 'copy') {
    const key = partKey(o.type, o.item.id);
    invOf(data).copies[key] = (invOf(data).copies[key] || 0) + 1;
    toast(tr('Копия получена: {0}', o.item.name));
  }
  if (o.kind === 'parts') {
    const pr = grantParts(data, { type: o.type, item: o.item, n: o.n });
    toast(tr('Части: {0} ({1}/{2})', o.item.name, pr.have, pr.need));
  }
  saveData();
  if (o.kind === 'chest') { openBonusChest(o.chest, () => renderShop()); return; }
  renderShop();
}

Hooks.on('forgeTop', d => `
  <div class="forge-links">
    <button class="row-card" data-action="nav" data-view="shop">
      <span class="icon-sq sm">${ico('cart')}</span>
      <span class="row-main"><b>${tr('Магазин')}</b><small>${tr('Части, копии, ключи и сундуки · новые товары каждый час')}</small></span>
      <span class="keys-chip">${ico('key')}<b>${d.keys || 0}</b></span>
      <span class="chev">›</span>
    </button>
  </div>`);

/* =========================================================
   Коллекции
   ========================================================= */

const own = (type, id) => itemLevel(data, type, (LOOT_LISTS[type] || []).find(x => x.id === id) || { id }) > 0;
const ownedCount = () => Object.entries(LOOT_LISTS).reduce((n, [type, list]) => n + list.filter(i => itemLevel(data, type, i) > 0).length, 0);

const COLLECTIONS = [
  { id: 'elements', name: tr('Три стихии'), items: [['crown', 'c_leaf'], ['crown', 'c_sun'], ['crown', 'c_frost']], reward: { coins: 300 } },
  { id: 'wood', name: tr('Мастерская рамок'), items: [['frame', 'f_oak'], ['frame', 'f_steel'], ['frame', 'f_mint'], ['frame', 'f_ink']], reward: { coins: 400 } },
  { id: 'sea', name: tr('Морская'), items: [['crown', 'c_ocean'], ['frame', 'f_wave'], ['frame', 'f_ice']], reward: { coins: 500, keys: 1 } },
  { id: 'luck', name: tr('Удача'), items: [['art', 'a_clover'], ['art', 'a_coin'], ['art', 'a_magnet']], reward: { coins: 300, keys: 2 } },
  { id: 'fire', name: tr('Огненная'), items: [['crown', 'c_ember'], ['frame', 'f_lava'], ['crown', 'c_phoenix']], reward: { item: ['crown', 'c_blaze'] } },
  { id: 'space', name: tr('Космическая'), items: [['crown', 'c_nebula'], ['frame', 'f_cosmos'], ['crown', 'c_neon']], reward: { item: ['frame', 'f_galaxy'] } },
  { id: 'royal', name: tr('Королевская'), items: [['crown', 'c_royal'], ['frame', 'f_royal'], ['crown', 'c_dragon'], ['frame', 'f_emerald']], reward: { item: ['crown', 'c_emperor'] } },
  { id: 'many', name: tr('Коллекционер'), count: 20, reward: { item: ['frame', 'f_collector'], coins: 500 } },
];

const colProgress = c => (c.count ? [Math.min(c.count, ownedCount()), c.count] : [c.items.filter(([t, id]) => own(t, id)).length, c.items.length]);
const colReady = c => { const [a, b] = colProgress(c); return a >= b && !data.collections?.[c.id]; };

function rewardText(r) {
  const parts = [];
  if (r.item) parts.push(LOOT_LISTS[r.item[0]].find(x => x.id === r.item[1])?.name);
  if (r.coins) parts.push(`${r.coins} ${tr('монет')}`);
  if (r.keys) parts.push(`${r.keys} 🔑`);
  return parts.join(' + ');
}

function renderForgeCollections(d, tabs) {
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="profile">‹ ${tr('Профиль')}</button>
    <h1 class="page-title">${tr('Мастерская')}</h1>
    ${Hooks.html('forgeTop', d)}
    <div class="segmented forge-tabs">
      ${Object.entries(tabs).map(([k, l]) => `<button class="${forgeTab === k ? 'on' : ''}" data-action="forge-tab" data-v="${k}">${l}</button>`).join('')}
    </div>
    <div class="forge-list">
      ${COLLECTIONS.map(c => {
        const [a, b] = colProgress(c);
        const claimed = !!d.collections?.[c.id];
        const ready = a >= b && !claimed;
        const rItem = c.reward.item ? LOOT_LISTS[c.reward.item[0]].find(x => x.id === c.reward.item[1]) : null;
        return `
        <div class="col-card ${ready ? 'ready' : ''} ${claimed ? 'claimed' : ''}">
          <div class="col-head"><b>${escH(c.name)}</b><span>${a} / ${b}</span></div>
          ${c.items ? `<div class="col-items">${c.items.map(([t, id]) => {
            const item = LOOT_LISTS[t].find(x => x.id === id);
            return `<span class="col-item ${own(t, id) ? 'have' : ''}" title="${escH(item?.name || '')}">${item ? lootPic({ type: t, item }) : ''}</span>`;
          }).join('')}</div>` : `<span class="part-bar"><i style="width:${(a / b) * 100}%"></i></span><small class="muted">${tr('Собери {0} любых предметов', b)}</small>`}
          <div class="col-foot">
            <span class="col-rew">${rItem ? `<span class="col-rpic">${lootPic({ type: c.reward.item[0], item: rItem })}</span>` : ico('gift')}${escH(rewardText(c.reward))}</span>
            ${claimed ? `<span class="muted">✓ ${tr('Получено')}</span>` : `<button class="btn sm ${ready ? 'primary' : 'ghost'}" data-action="col-claim" data-id="${c.id}" ${ready ? '' : 'disabled'}>${tr('Забрать')}</button>`}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function claimCollection(id) {
  const c = COLLECTIONS.find(x => x.id === id);
  if (!c || !colReady(c)) return;
  (data.collections ||= {})[id] = true;
  const r = c.reward;
  if (r.coins) giveCoins(r.coins);
  if (r.keys) giveKeys(r.keys);
  if (r.item) {
    const [type, iid] = r.item;
    const item = LOOT_LISTS[type].find(x => x.id === iid);
    grantLoot(data, 'legendary', { type, item, crown: type === 'crown' ? item : null });
  }
  saveData();
  Sound.achievement();
  FX.levelUp?.('★');
  toast(tr('Коллекция «{0}» собрана!', c.name));
  renderForge();
}

Hooks.on('collectionsReady', () => COLLECTIONS.filter(colReady).length);

/* =========================================================
   Разбор копий и обмен частей
   ========================================================= */

const salvageCoins = item => Math.round((DUP_COINS[item.ultra ? 'mythic' : item.chest] || 20) * 0.6) + (lootBonuses(data).salv || 0);

function salvage(type, id) {
  const item = LOOT_LISTS[type]?.find(x => x.id === id);
  const inv = invOf(data);
  const key = partKey(type, id);
  if (!item || !inv.copies[key]) return;
  inv.copies[key]--;
  if (!inv.copies[key]) delete inv.copies[key];
  giveCoins(salvageCoins(item));
  saveData();
  toast(tr('Копия разобрана: +{0} монет', salvageCoins(item)));
  renderForge();
}

async function exchangeParts() {
  const list = partList(data).filter(x => x.have >= 3 && x.have < x.need);
  if (!list.length) { toast(tr('Нужно хотя бы 3 части одного предмета')); return; }
  const src = await Dialog.choose({
    icon: 'swap', title: tr('Обмен частей'), text: tr('3 части одного предмета → 1 часть другого той же редкости.'),
    options: list.map(x => ({ value: partKey(x.type, x.item.id), label: x.item.name, sub: `${typeName(x.type)} · ${x.have} / ${x.need}` })),
  });
  if (!src) return;
  const [st, sid] = src.split(':');
  const from = list.find(x => x.type === st && x.item.id === sid);
  const targets = [];
  for (const [type, items] of Object.entries(LOOT_LISTS)) {
    for (const item of items) {
      if (item.id === sid || item.noDrop || rarityOf(item) !== rarityOf(from.item) || !wantsItem(data, type, item)) continue;
      targets.push({ type, item });
    }
  }
  if (!targets.length) { toast(tr('Нет подходящих предметов для обмена')); return; }
  const dst = await Dialog.choose({
    icon: 'puzzle', title: tr('Что получить?'),
    options: targets.map(x => ({ value: partKey(x.type, x.item.id), label: x.item.name, sub: typeName(x.type) })),
  });
  if (!dst) return;
  const [dt, did] = dst.split(':');
  const t = targets.find(x => x.type === dt && x.item.id === did);
  const parts = partsOf(data);
  parts[src] -= 3;
  if (parts[src] <= 0) delete parts[src];
  const pr = grantParts(data, { type: t.type, item: t.item, n: 1 });
  saveData();
  Sound.correct(3);
  toast(tr('Обмен: {0} ({1}/{2})', t.item.name, pr.have, pr.need));
  renderProfile();
}

/* =========================================================
   Эффекты аватара, комплекты, витрина, титулы
   ========================================================= */

const AVATAR_FX = [
  { id: '', name: tr('Без эффекта'), lvl: 1 },
  { id: 'glow', name: tr('Сияние'), lvl: 5 },
  { id: 'fire', name: tr('Огонь'), lvl: 10 },
  { id: 'stars', name: tr('Звёзды'), lvl: 15 },
  { id: 'bolt', name: tr('Молнии'), lvl: 20 },
  { id: 'snow', name: tr('Снегопад'), lvl: 25 },
  { id: 'aura', name: tr('Радужная аура'), lvl: 35 },
];

const SETS = [
  { id: 'fire', name: tr('Пламя'), crown: 'c_ember', frame: 'f_lava', bonus: tr('+5% опыта'), apply: g => { g.xpBoost += 0.05; } },
  { id: 'ice', name: tr('Холод'), crown: 'c_frost', frame: 'f_ice', bonus: tr('+10% времени в Выживании и Лестнице'), apply: g => { if (['survival', 'ladder'].includes(g.mode)) g.limit *= 1.1; } },
  { id: 'sea', name: tr('Океан'), crown: 'c_ocean', frame: 'f_wave', bonus: tr('+1 щит серии'), apply: g => { g.shields++; } },
  { id: 'nature', name: tr('Природа'), crown: 'c_leaf', frame: 'f_mint', bonus: tr('Золотые примеры чаще на 10%'), apply: g => { g.goldenChance *= 1.1; } },
  { id: 'space', name: tr('Космос'), crown: 'c_nebula', frame: 'f_cosmos', bonus: tr('Золотые примеры чаще на 25%'), apply: g => { g.goldenChance *= 1.25; } },
  { id: 'royal', name: tr('Королевский'), crown: 'c_royal', frame: 'f_royal', bonus: tr('+10% опыта'), apply: g => { g.xpBoost += 0.1; } },
  { id: 'dragon', name: tr('Дракон'), crown: 'c_dragon', frame: 'f_emerald', bonus: tr('+1 жизнь в Выживании'), apply: g => { if (g.mode === 'survival') { g.maxLives++; g.lives++; } } },
  ...['winter', 'spring', 'summer', 'autumn'].map(s => ({ id: s, name: SEASON_NAMES[s], crown: `c_${s}`, frame: `f_${s}`, bonus: tr('+8% опыта'), apply: g => { g.xpBoost += 0.08; } })),
];

function activeSet(d) {
  const p = profileData(d);
  const f = currentFrame(d);
  return SETS.find(s => s.crown === p.crown && f?.id === s.frame && ownsCrown(d, s.crown)) || null;
}

Hooks.on('gameSetup', g => { activeSet(data)?.apply(g); });

const itemByKey = key => {
  const [type, id] = String(key).split(':');
  const item = LOOT_LISTS[type]?.find(x => x.id === id);
  return item ? { type, item } : null;
};

const TITLES = [
  { id: 'rookie', name: tr('Новичок'), hint: '', req: () => true },
  { id: 'frac', name: tr('Гроза дробей'), hint: tr('200 верных дробей, точность 90%'), req: d => opAcc(d, 'frac', 200, 0.9) },
  { id: 'pct', name: tr('Мастер процентов'), hint: tr('200 верных процентов, точность 90%'), req: d => opAcc(d, 'pct', 200, 0.9) },
  { id: 'mul', name: tr('Таблица в голове'), hint: tr('1000 верных умножений, точность 95%'), req: d => opAcc(d, 'mul', 1000, 0.95) },
  { id: 'eq', name: tr('Укротитель иксов'), hint: tr('300 верных уравнений'), req: d => opAcc(d, 'eq', 300, 0) },
  { id: 'fast', name: tr('Молния'), hint: tr('500 ответов, в среднем быстрее 1,5 с'), req: d => { const t = totalsOf(d); return t.n >= 500 && t.t / t.n < 1500; } },
  { id: 'streak', name: tr('Неуязвимый'), hint: tr('Серия 50 без ошибок'), req: d => d.bestStreak >= 50 },
  { id: 'climber', name: tr('Альпинист'), hint: tr('Лестница: уровень 25'), req: d => (d.ladder?.best || 0) >= 25 },
  { id: 'summit', name: tr('Покоритель вершин'), hint: tr('Лестница: уровень 100'), req: d => (d.ladder?.best || 0) >= 100 },
  { id: 'collector', name: tr('Коллекционер'), hint: tr('20 предметов'), req: () => ownedCount() >= 20 },
  { id: 'smith', name: tr('Кузнец'), hint: tr('10 улучшений в Мастерской'), req: d => upgradesDone(d) >= 10 },
  { id: 'marathon', name: tr('Марафонец'), hint: tr('10 часов в тренировках'), req: d => (d.life?.ms || 0) >= 10 * 3.6e6 },
  { id: 'exam', name: tr('Отличник'), hint: tr('Экзамен на 90% и выше'), req: d => (d.exams || []).some(e => e.pct >= 90) },
  { id: 'owl', name: tr('Ночная сова'), hint: tr('Секрет'), req: d => !!d.secrets?.night },
  { id: 'lark', name: tr('Жаворонок'), hint: tr('Секрет'), req: d => !!d.secrets?.early },
  { id: 'machine', name: tr('Счётная машина'), hint: tr('10 000 решённых примеров'), req: d => d.totalSolved >= 10000 },
  { id: 'will', name: tr('Железная воля'), hint: tr('30 дней подряд'), req: d => Math.max(dayStreak(d), d.life?.bestDays || 0) >= 30 },
];

function opAcc(d, op, n, acc) {
  const s = d.opStats[op];
  return !!s && s.c >= n && (!acc || s.c / Math.max(1, s.n) >= acc);
}
const totalsOf = d => Object.values(d.opStats).reduce((a, s) => ({ n: a.n + s.n, t: a.t + s.t }), { n: 0, t: 0 });
function upgradesDone(d) {
  const inv = invOf(d);
  return Object.values(inv.lv).reduce((a, l) => a + Math.max(0, l - 1), 0) + Object.values(inv.arts).reduce((a, l) => a + Math.max(0, l - 1), 0);
}

const currentTitle = d => {
  const t = TITLES.find(x => x.id === profileData(d).title);
  return t && t.req(d) && t.id !== 'rookie' ? t : null;
};
const titleChip = d => { const t = currentTitle(d); return t ? `<span class="title-chip">${ico('scroll')}${escH(t.name)}</span>` : ''; };

Hooks.on('greetUnder', d => titleChip(d));
Hooks.on('nickUnder', d => titleChip(d));

// Витрина: три любимых предмета в профиле
Hooks.on('profileTop', d => {
  const p = profileData(d);
  const sc = p.showcase || [];
  const set = activeSet(d);
  return `
    <div class="showcase">
      ${[0, 1, 2].map(i => {
        const x = itemByKey(sc[i]);
        const ok = x && itemLevel(d, x.type, x.item) > 0;
        return `<button class="sc-slot ${ok ? 'on' : ''}" data-action="showcase-pick" data-i="${i}" aria-label="${tr('Витрина')}">${ok ? lootPic(x) : '+'}${ok ? `<i class="fc-lv">${itemLevel(d, x.type, x.item)}</i>` : ''}</button>`;
      }).join('')}
      <span class="sc-label">${tr('Витрина')}${set ? `<b class="set-chip">${ico('sparkle')}${escH(set.name)}: ${escH(set.bonus)}</b>` : ''}</span>
    </div>`;
});

async function pickShowcase(i) {
  const owned = [];
  for (const [type, list] of Object.entries(LOOT_LISTS)) {
    for (const item of list) if (itemLevel(data, type, item) > 0) owned.push({ type, item });
  }
  if (!owned.length) { toast(tr('Пока нечего показать — открывай сундуки')); return; }
  const v = await Dialog.choose({
    icon: 'star', title: tr('Витрина'),
    options: [{ value: '__none', label: tr('Пусто') }, ...owned.map(x => ({ value: partKey(x.type, x.item.id), label: x.item.name, sub: `${typeName(x.type)} · ${tr('ур. {0}', itemLevel(data, x.type, x.item))}` }))],
  });
  if (!v) return;
  const p = profileData(data);
  p.showcase ||= [];
  p.showcase[i] = v === '__none' ? null : v;
  saveData();
  renderProfile();
}

/* =========================================================
   Секреты — скрытые достижения
   ========================================================= */

const SECRETS = [
  { id: 'night', name: tr('Полуночник'), desc: tr('Тренировка между полуночью и 5 утра'), icon: 'moon' },
  { id: 'early', name: tr('Ранняя пташка'), desc: tr('Тренировка до 7 утра'), icon: 'sun' },
  { id: 'flash', name: tr('Вспышка'), desc: tr('Верный ответ быстрее 0,6 секунды'), icon: 'bolt' },
  { id: 'perfect', name: tr('Идеальный спринт'), desc: tr('30+ верных в Спринте без единой ошибки'), icon: 'target' },
  { id: 'palin', name: tr('Палиндром'), desc: tr('Верных ответов — число-палиндром от 11'), icon: 'swap' },
  { id: 'seven', name: tr('Три семёрки'), desc: tr('Ровно 77 верных за тренировку'), icon: 'sparkle' },
  { id: 'gold3', name: tr('Золотая лихорадка'), desc: tr('3 золотых примера за одну игру'), icon: 'coin' },
  { id: 'comeback', name: tr('На волоске'), desc: tr('25+ верных в Выживании с одной оставшейся жизнью'), icon: 'heart' },
  { id: 'weekend', name: tr('Без выходных'), desc: tr('Тренировки и в субботу, и в воскресенье'), icon: 'calendar' },
  { id: 'marathon10', name: tr('Трудоголик'), desc: tr('10 тренировок за один день'), icon: 'fire' },
  { id: 'silent', name: tr('В тишине'), desc: tr('50+ верных с выключенным звуком'), icon: 'mute' },
  { id: 'chain', name: tr('Несокрушимая цепь'), desc: tr('Цепочка целиком, все 25 звеньев'), icon: 'link' },
];
const SECRET_COINS = 100;

function checkSecrets(g, s) {
  const d = data;
  const got = (d.secrets ||= {});
  const hour = new Date().getHours();
  const answered = g.correct + g.wrong;
  const today = dateKey();
  const todayGames = d.sessions.filter(x => dateKey(new Date(x.date)) === today).length;
  const palindrome = n => n >= 11 && String(n) === String(n).split('').reverse().join('');
  const sat = new Date(); sat.setDate(sat.getDate() - ((sat.getDay() + 1) % 7));
  const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
  const checks = {
    night: hour < 5 && answered >= 10,
    early: hour >= 5 && hour < 7 && answered >= 10,
    flash: g.log.some(e => e.ok && e.ms < 600),
    perfect: g.mode === 'sprint' && !g.variant && g.correct >= 30 && g.wrong === 0,
    palin: palindrome(g.correct),
    seven: g.correct === 77,
    gold3: (g.goldenHits || 0) >= 3,
    comeback: g.mode === 'survival' && !g.variant && g.lives === 1 && g.correct >= 25,
    weekend: (d.daily[dateKey(sat)] || 0) > 0 && (d.daily[dateKey(sun)] || 0) > 0,
    marathon10: todayGames >= 10,
    silent: !d.settings.sound && g.correct >= 50,
    chain: g.variant === 'chain' && g.correct >= 25,
  };
  const fresh = SECRETS.filter(x => checks[x.id] && !got[x.id]);
  fresh.forEach(x => { got[x.id] = Date.now(); giveCoins(SECRET_COINS, false); });
  void s;
  return fresh;
}

/* =========================================================
   Мастерство тем: бронза → серебро → золото → алмаз
   ========================================================= */

const MASTERY = [
  { name: tr('Бронза'), color: '#c07a3d', req: s => s.c >= 50 },
  { name: tr('Серебро'), color: '#c9d1d9', req: s => s.c >= 200 && s.c / s.n >= 0.8 },
  { name: tr('Золото'), color: '#ffd66e', req: s => s.c >= 500 && s.c / s.n >= 0.85 && s.t / s.n < 4000 },
  { name: tr('Алмаз'), color: '#7ad7ff', req: s => s.c >= 1500 && s.c / s.n >= 0.9 && s.t / s.n < 2500 },
];

function masteryTier(op) {
  const s = data.opStats[op];
  if (!s || !s.n) return 0;
  let t = 0;
  while (t < MASTERY.length && MASTERY[t].req(s)) t++;
  return t;
}

Hooks.on('opBadge', op => {
  const t = masteryTier(op);
  return t ? `<i class="mast" style="--mc:${MASTERY[t - 1].color}" title="${escH(MASTERY[t - 1].name)}"></i>` : '';
});

/* =========================================================
   Лестница: попытки, боссы, модификаторы, карта, сезоны
   ========================================================= */

const LADDER_TRIES = 5;
const TRY_PRICE = 40;
const isBoss = n => n > 0 && (n + 1) % 10 === 0;
const LADDER_MODS = [
  { id: 'rush', name: tr('Спешка'), desc: tr('−30% времени, но опыт ×2') },
  { id: 'blind', name: tr('Вслепую'), desc: tr('Введённые цифры не видны') },
  { id: 'choice', name: tr('Варианты'), desc: tr('Ответ выбирается из четырёх') },
  { id: 'mixed', name: tr('Все темы'), desc: tr('Сразу все 24 темы') },
  { id: 'calm', name: tr('Передышка'), desc: tr('+30% времени') },
];
const ladderMod = n => (n >= 15 && !isBoss(n) ? LADDER_MODS[hashString(`mod${n}`) % LADDER_MODS.length] : null);

function ladderTries() {
  const L = ladderState(data);
  if (L.triesDay !== dateKey()) { L.triesDay = dateKey(); L.triesUsed = 0; }
  return LADDER_TRIES + (L.triesBought || 0) - L.triesUsed;
}

Hooks.on('blockStart', mode => {
  if (mode !== 'ladder' || ladderTries() > 0) return false;
  (async () => {
    const ok = await Dialog.confirm({ icon: 'mountain', title: tr('Попытки на сегодня закончились'), text: tr('Новые {0} попыток — завтра. Купить ещё одну за {1} монет? У тебя {2}.', LADDER_TRIES, TRY_PRICE, data.coins || 0), ok: tr('Купить') });
    if (!ok) return;
    if ((data.coins || 0) < TRY_PRICE) { toast(tr('Не хватает монет')); return; }
    data.coins -= TRY_PRICE;
    const L = ladderState(data);
    L.triesUsed = Math.max(0, L.triesUsed - 1);
    saveData();
    Sound.coin();
    startGame('ladder');
  })();
  return true;
});

// Перед уровнем с новой темой или новой сложностью — предупреждение. Один раз на уровень.
Hooks.on('blockStart', mode => {
  if (mode !== 'ladder') return false;
  const L = ladderState(data);
  const n = L.level;
  const news = ladderNews(n);
  if (!news.length) return false;
  const hard = news.filter(x => x.kind !== 'mod');
  const mod = news.find(x => x.kind === 'mod');
  const newMod = mod && !(L.seenMods || []).includes(mod.id);
  // Про тему и сложность предупреждаем один раз на уровень, про особенность — при первой встрече
  if (!(hard.length && (L.seenNew ?? -1) < n) && !newMod) return false;
  (async () => {
    const ok = await Dialog.confirm({
      icon: news[0].icon,
      title: hard.length ? tr('Уровень {0}: стало сложнее', n) : tr('Уровень {0}: особенность', n),
      text: `${news.map(x => x.text + (x.sub && x.kind === 'mod' ? ` — ${x.sub}` : '')).join('. ')}. ${tr('По-прежнему {0} примеров и ошибаться нельзя. Начать?', LADDER_TASKS)}`,
      ok: tr('Начать'),
    });
    if (hard.length) L.seenNew = Math.max(L.seenNew ?? -1, n);
    if (mod) L.seenMods = [...new Set([...(L.seenMods || []), mod.id])];
    saveData();
    if (ok) startGame('ladder');
  })();
  return true;
});

Hooks.on('gameSetup', g => {
  if (g.mode !== 'ladder') return;
  const n = g.ladderLevel;
  // Новая тема идёт первым примером, чтобы она не застала врасплох
  g.firstOp = ladderCfg(n).newOp || null;
  if (isBoss(n)) {
    g.total = 10;
    g.ladderBoss = true;
    g.limit *= 1.15;
    return;
  }
  const mod = ladderMod(n);
  if (!mod) return;
  g.ladderMod = mod.id;
  if (mod.id === 'rush') { g.limit *= 0.7; g.xpMult = 2; }
  if (mod.id === 'calm') g.limit *= 1.3;
  if (mod.id === 'choice') g.settings.answerMode = 'choice';
  if (mod.id === 'mixed') g.settings.ops = [...LADDER_OPS];
  if (mod.id === 'blind') document.body.classList.add('blind-input');
});

Hooks.on('gameTop', g => {
  if (g.mode !== 'ladder') return '';
  if (g.ladderBoss) return `<div class="ladder-flag boss">${ico('skull')}<b>${tr('Босс')}</b><span>${tr('10 примеров без ошибок')}</span></div>`;
  const news = ladderNews(g.ladderLevel);
  return news.map(x => `<div class="ladder-flag ${x.kind === 'mod' ? '' : 'news'}">${ico(x.icon)}<b>${escH(x.text)}</b>${x.sub ? `<span>${escH(x.sub)}</span>` : ''}</div>`).join('');
});

Hooks.on('navigated', () => document.body.classList.remove('blind-input'));

Hooks.on('ladderCard', d => {
  const L = ladderState(d);
  const n = L.level;
  const mod = ladderMod(n);
  const left = ladderTries();
  return `
    <div class="ladder-chips">
      <span class="lchip">${ico('heart')}${tr('Попытки: {0}/{1}', Math.max(0, left), LADDER_TRIES)}</span>
      ${isBoss(n) ? `<span class="lchip boss">${ico('skull')}${tr('Босс!')}</span>` : mod ? `<span class="lchip">${ico('sparkle')}${escH(mod.name)}</span>` : ''}
      <button class="lchip map" data-action="nav" data-view="laddermap">${ico('map')}${tr('Карта')}</button>
    </div>`;
});

function ladderEnd(g, extra, ladder) {
  if (!ladder) return;
  const L = ladderState(data);
  if (!ladder.passed) {
    ladderTries();
    L.triesUsed++;
    extra.banners.push(`<div class="banner blue">${ico('heart')}<span>${tr('Осталось попыток сегодня: {0}', Math.max(0, ladderTries()))}</span></div>`);
    return;
  }
  // Сезон: лучший уровень за месяц
  const sid = dateKey().slice(0, 7);
  if (L.season?.id !== sid) L.season = { id: sid, best: 0 };
  L.season.best = Math.max(L.season.best, L.level);
  if (g.ladderBoss) {
    const coins = 50 + g.ladderLevel * 2;
    giveCoins(coins, false);
    giveKeys(1);
    extra.banners.push(`<div class="banner gold boss-banner">${ico('skull')}<span>${tr('Босс побеждён!')} <b>+${coins} ${ico('coin')} · +1 🔑</b></span></div>`);
  }
}

// Итоги прошлого сезона — при первом запуске в новом месяце
function seasonRollover() {
  const L = ladderState(data);
  const sid = dateKey().slice(0, 7);
  if (!L.season || L.season.id === sid) return;
  const prev = L.season;
  L.season = { id: sid, best: 0 };
  if (prev.best < 3) { saveData(); return; }
  const coins = Math.min(3000, prev.best * 25);
  giveCoins(coins, false);
  const keys = prev.best >= 25 ? 2 : prev.best >= 10 ? 1 : 0;
  giveKeys(keys);
  (L.seasons ||= []).push(prev);
  saveData();
  const month = new Date(`${prev.id}-01`).toLocaleDateString(I18N.locale, { month: 'long', year: 'numeric' });
  Dialog.alert({ icon: 'mountain', title: tr('Сезон окончен: {0}', month), text: tr('Лучший уровень сезона: {0}.\nНаграда: {1} монет{2}.', prev.best, coins, keys ? ` + ${keys} 🔑` : ''), ok: tr('Забрать') }).then(() => Sound.coin());
}

function renderLadderMap() {
  const L = ladderState(data);
  const n = L.level;
  const from = Math.max(0, n - 5);
  const to = from + 20;
  const nodes = [];
  for (let i = to; i >= from; i--) nodes.push(i);
  const W = 320;
  const stepY = 64;
  const H = nodes.length * stepY + 40;
  const xOf = i => W / 2 + Math.sin(i * 0.9) * 110;
  const yOf = k => 30 + k * stepY;
  const path = nodes.map((lv, k) => `${k ? 'L' : 'M'}${xOf(lv).toFixed(1)} ${yOf(k)}`).join('');
  const season = L.season?.id === dateKey().slice(0, 7) ? L.season.best : 0;
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="dashboard">‹ ${tr('Главная')}</button>
    <h1 class="page-title">${tr('Карта Лестницы')}</h1>
    <div class="map-stats">
      <span>${tr('Сейчас: {0}', n)}</span><span>${tr('Рекорд: {0}', L.best)}</span><span>${tr('Сезон: {0}', season)}</span>
    </div>
    <div class="ladder-map">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin meet" aria-hidden="true">
        <path d="${path}" class="lm-path"/>
        <path d="${nodes.map((lv, k) => (lv <= n ? `${k && nodes[k - 1] <= n ? 'L' : 'M'}${xOf(lv).toFixed(1)} ${yOf(k)}` : '')).join('')}" class="lm-path done"/>
      </svg>
      ${nodes.map((lv, k) => {
        const cls = lv < n ? 'done' : lv === n ? 'now' : 'future';
        const boss = isBoss(lv);
        const mile = LADDER_MILESTONES.includes(lv);
        const mod = ladderMod(lv);
        const nOp = ladderCfg(lv).newOp;
        const news = nOp ? `+ ${OPS[nOp].name}` : '';
        return `<div class="lm-node ${news ? 'has-new' : ''} ${cls} ${boss ? 'boss' : ''} ${mile ? 'mile' : ''}" style="left:${(xOf(lv) / W) * 100}%;top:${yOf(k)}px">
          <span>${boss ? ico('skull') : mile ? ico('crown') : lv}</span>
          ${lv === n ? `<em>${tr('Ты здесь')}</em>` : boss ? `<em>${tr('Босс {0}', lv)}</em>` : mile ? `<em>${lv}</em>` : news ? `<em class="new-op">${escH(news)}</em>` : mod && lv > n ? `<em>${escH(mod.name)}</em>` : ''}
        </div>`;
      }).join('')}
    </div>
    <button class="btn primary big block" data-action="quick" data-mode="ladder">${ico('play')} ${tr('Уровень {0}', n)}</button>`;
  const now = document.querySelector('.lm-node.now');
  if (now) setTimeout(() => now.scrollIntoView({ block: 'center' }), 50);
}
Hooks.view('laddermap', renderLadderMap);

/* =========================================================
   Итоги года
   ========================================================= */

function yearStats(year) {
  const d = data;
  const days = Object.entries(d.daily).filter(([k, v]) => k.startsWith(String(year)) && v > 0);
  const correct = days.reduce((a, [, v]) => a + v, 0);
  const best = days.sort((a, b) => b[1] - a[1])[0];
  // Самая длинная серия дней за год
  const set = new Set(days.map(([k]) => k));
  let longest = 0;
  for (const k of set) {
    const prev = new Date(k); prev.setDate(prev.getDate() - 1);
    if (set.has(dateKey(prev))) continue;
    let len = 0;
    const cur = new Date(k);
    while (set.has(dateKey(cur))) { len++; cur.setDate(cur.getDate() + 1); }
    longest = Math.max(longest, len);
  }
  const sess = d.sessions.filter(s => new Date(s.date).getFullYear() === year);
  const opsCount = {};
  sess.forEach(s => Object.entries(s.opCounts || {}).forEach(([op, st]) => { opsCount[op] = (opsCount[op] || 0) + st.n; }));
  const fav = Object.entries(opsCount).sort((a, b) => b[1] - a[1])[0];
  const monthCounts = Array(12).fill(0);
  Object.entries(d.daily).forEach(([k, v]) => { if (k.startsWith(String(year))) monthCounts[Number(k.slice(5, 7)) - 1] += v; });
  return { correct, activeDays: set.size, best, longest, fav: fav?.[0], sessions: sess.length, monthCounts, hours: (d.life?.ms || 0) / 3.6e6 };
}

function renderRecap() {
  const year = new Date().getFullYear();
  const y = yearStats(year);
  const maxM = Math.max(1, ...y.monthCounts);
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1).toLocaleDateString(I18N.locale, { month: 'narrow' }));
  const card = (icon, label, value, sub = '') => `<div class="recap-card"><span class="rc-ico">${ico(icon)}</span><small>${label}</small><b>${value}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="stats">‹ ${tr('Статистика')}</button>
    <div class="recap-hero">
      <small>${tr('Твой год в Math for Speed')}</small>
      <b>${year}</b>
      <span>${escH(profileName())} · ${tr('Уровень {0}', levelFromXp(data.xp))}</span>
    </div>
    <div class="recap-grid">
      ${card('calc', tr('Верных ответов'), fmtNum(y.correct))}
      ${card('calendar', tr('Дней с тренировкой'), y.activeDays)}
      ${card('fire', tr('Самая длинная серия'), tr('{0} дн.', y.longest))}
      ${card('trophy', tr('Лучший день'), y.best ? y.best[1] : '—', y.best ? new Date(y.best[0]).toLocaleDateString(I18N.locale, { day: 'numeric', month: 'long' }) : '')}
      ${card('star', tr('Любимая тема'), y.fav && OPS[y.fav] ? OPS[y.fav].name : '—')}
      ${card('stopwatch', tr('Часов за тренировками'), fmtDec(Math.round(y.hours * 10) / 10))}
      ${card('chest', tr('Открыто сундуков'), data.life?.chests || 0)}
      ${card('mountain', tr('Лестница'), ladderState(data).best)}
    </div>
    <div class="card recap-months">
      <span class="eyebrow">${tr('По месяцам')}</span>
      <div class="rm-bars">${y.monthCounts.map((v, i) => `<div class="rm-col"><i style="height:${Math.max(3, (v / maxM) * 100)}%"></i><small>${months[i]}</small></div>`).join('')}</div>
    </div>
    <button class="btn primary big block" data-action="share-recap">${ico('share')} ${tr('Поделиться итогами')}</button>`;
}
Hooks.view('recap', renderRecap);
Hooks.on('statsHead', () => `
  <button class="row-card recap-entry" data-action="nav" data-view="recap">
    <span class="icon-sq sm">${ico('sparkle')}</span>
    <span class="row-main"><b>${tr('Итоги {0} года', new Date().getFullYear())}</b><small>${tr('Твой год в цифрах — можно поделиться')}</small></span>
    <span class="chev">›</span>
  </button>`);

/* =========================================================
   Цель на экзамен: отсчёт и план на день
   ========================================================= */

const daysLeft = iso => Math.ceil((new Date(`${iso}T00:00:00`) - new Date(`${dateKey()}T00:00:00`)) / 864e5);

function weakTestOps(k = 3) {
  return TEST_OPS
    .map(op => { const s = data.opStats[op] || { n: 0, c: 0, t: 0 }; return { op, score: s.n < 10 ? 0.5 : s.c / s.n - s.t / s.n / 60000 }; })
    .sort((a, b) => a.score - b.score)
    .slice(0, k)
    .map(x => x.op);
}

function examCard() {
  const ex = data.examGoal;
  if (!ex?.date) return '';
  const left = daysLeft(ex.date);
  if (left < 0) return '';
  const weak = weakTestOps();
  const today = data.daily[dateKey()] || 0;
  const target = Math.max(data.dailyGoal, left <= 7 ? 100 : left <= 30 ? 70 : 50);
  return `
    <section class="card exam-card">
      <div class="exam-count"><b>${left}</b><small>${plural(left, 'день', 'дня', 'дней')}</small></div>
      <div class="exam-main">
        <span class="eyebrow">${left === 0 ? tr('Экзамен сегодня — удачи!') : tr('До экзамена')}</span>
        <small>${tr('План на сегодня: {0} верных · сейчас {1}', target, today)}</small>
        <span class="part-bar"><i style="width:${Math.min(100, (today / target) * 100)}%"></i></span>
        <small class="muted">${tr('Подтянуть: {0}', weak.map(o => OPS[o].name.toLowerCase()).join(', '))}</small>
      </div>
      <button class="icon-sq" data-action="exam-train" aria-label="${tr('Тренировать')}">${ico('play')}</button>
    </section>`;
}

async function setExamDate() {
  const cur = data.examGoal?.date;
  const shown = cur ? cur.split('-').reverse().join('.') : '';
  const v = await Dialog.prompt({ icon: 'calendar', title: tr('Дата экзамена'), text: tr('Например, 15.05.2027. Оставь пустым, чтобы убрать отсчёт.'), value: shown, placeholder: tr('ДД.ММ.ГГГГ'), ok: tr('Сохранить'), maxLength: 10 });
  if (v === null) {
    if (cur && await Dialog.confirm({ icon: 'calendar', title: tr('Убрать отсчёт до экзамена?'), ok: tr('Убрать') })) { data.examGoal = null; saveData(); rerender(); }
    return;
  }
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(v.trim());
  if (!m) { toast(tr('Не понял дату — напиши так: 15.05.2027')); return; }
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (Number.isNaN(new Date(iso).getTime()) || daysLeft(iso) < 0) { toast(tr('Дата должна быть в будущем')); return; }
  data.examGoal = { date: iso };
  saveData();
  toast(tr('До экзамена {0} {1}', daysLeft(iso), plural(daysLeft(iso), 'день', 'дня', 'дней')));
  rerender();
}

/* =========================================================
   Профиль: секции модуля
   ========================================================= */

Hooks.on('profileBottom', d => {
  const p = profileData(d);
  const lvl = levelFromXp(d.xp);
  const got = d.secrets || {};
  const titleNow = currentTitle(d)?.id || 'rookie';
  return `
    <div class="set-group">
      <div class="set-title">${tr('Титул')} · ${TITLES.filter(t => t.req(d)).length} / ${TITLES.length}</div>
      <div class="title-grid">
        ${TITLES.map(t => {
          const open = t.req(d);
          return `<button class="title-opt ${open ? '' : 'locked'} ${titleNow === t.id ? 'on' : ''}" data-action="title-pick" data-v="${t.id}">
            <b>${escH(t.name)}</b><small>${open ? (titleNow === t.id ? tr('Выбран') : tr('Нажми, чтобы выбрать')) : escH(t.hint)}</small></button>`;
        }).join('')}
      </div>
    </div>

    <div class="set-group">
      <div class="set-title">${tr('Эффект аватара')}</div>
      <div class="afx-grid">
        ${AVATAR_FX.map(f => {
          const open = lvl >= f.lvl;
          return `<button class="afx-opt ${open ? '' : 'locked'} ${(p.avatarFx || '') === f.id ? 'on' : ''}" data-action="afx-pick" data-v="${f.id}" data-lvl="${f.lvl}">
            <span class="pf-avatar sm ${f.id ? `afx afx-${f.id}` : ''}" style="--pc:${profileColor()}"><span class="pf-face">★</span></span>
            <b>${escH(f.name)}</b><small>${open ? '' : tr('с {0} уровня', f.lvl)}</small></button>`;
        }).join('')}
      </div>
    </div>

    <div class="set-group">
      <div class="set-title">${tr('Комплекты')}</div>
      <p class="hint" style="margin-top:0">${tr('Надень корону и рамку одного комплекта — получишь бонус.')}</p>
      <div class="set-list">
        ${SETS.map(s => {
          const c = LOOT_CROWNS.find(x => x.id === s.crown);
          const f = FRAMES.find(x => x.id === s.frame);
          const on = activeSet(d)?.id === s.id;
          const have = ownsCrown(d, s.crown) && ownsFrame(d, s.frame);
          return `<div class="set-row2 ${on ? 'on' : ''} ${have ? '' : 'locked'}">
            <span class="set-pics"><span class="crown-pic">${crownSvg(c)}</span><span class="frame-pic">${avatarPreview(d, f)}</span></span>
            <span class="set-main"><b>${escH(s.name)}</b><small>${escH(s.bonus)}</small></span>
            ${on ? `<span class="gold">✓</span>` : have ? `<button class="btn sm ghost" data-action="set-wear" data-v="${s.id}">${tr('Надеть')}</button>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="set-group">
      <div class="set-title">${tr('Секреты')} · ${Object.keys(got).length} / ${SECRETS.length}</div>
      <div class="secret-grid">
        ${SECRETS.map(x => `<div class="secret ${got[x.id] ? 'open' : ''}">
          <span class="ico">${got[x.id] ? ico(x.icon) : '?'}</span>
          <b>${got[x.id] ? escH(x.name) : '???'}</b>
          <small>${got[x.id] ? escH(x.desc) : tr('Секретное достижение')}</small>
        </div>`).join('')}
      </div>
    </div>

    <button class="row-card" data-action="parts-exchange" style="margin-bottom:12px">
      <span class="icon-sq sm">${ico('swap')}</span>
      <span class="row-main"><b>${tr('Обмен частей')}</b><small>${tr('3 части одного предмета → 1 часть другого той же редкости')}</small></span>
      <span class="chev">›</span>
    </button>`;
});

/* =========================================================
   Главная: карточки модуля
   ========================================================= */

Hooks.on('dashTop', () => `${loginCard()}${examCard()}`);
Hooks.on('dashStack', () => questsCard());

/* =========================================================
   Конец игры: задания, ключ за серию, секреты, Лестница
   ========================================================= */

Hooks.on('gameEnd', (g, session, completed, extra, ladder) => {
  document.body.classList.remove('blind-input');
  progressQuests(session, { ladder }, extra.banners);

  // Каждые 3 дня серии — ключ (один раз в день)
  const streak = dayStreak(data);
  if (streak > 0 && streak % 3 === 0 && data.keyDay !== dateKey()) {
    data.keyDay = dateKey();
    giveKeys(1);
    extra.banners.push(`<div class="banner gold">${ico('key')}<span>${tr('{0} дней подряд: +1 ключ', streak)}</span></div>`);
  }

  const fresh = checkSecrets(g, session);
  fresh.forEach(x => extra.banners.push(`<div class="banner ach-banner secret-banner" style="--rc:#b98cff">${ico(x.icon)}<span>${tr('Секрет открыт:')} <b>${escH(x.name)}</b> — ${escH(x.desc)} · +${SECRET_COINS} ${ico('coin')}</span></div>`));

  ladderEnd(g, extra, ladder);

  if (data.pendingChest) {
    const id = data.pendingChest;
    data.pendingChest = null;
    setTimeout(() => openBonusChest(id, () => {}), 1600);
  }
});

// Эффекты ответа от надетых артефактов
Hooks.on('afterAnswer', (g, ok) => {
  if (!ok || !FX.on() || g.silent || !g.arts?.length) return;
  const card = $('#gCard');
  const art = ARTIFACTS.find(a => a.id === g.arts[g.correct % g.arts.length]);
  if (!art || !card) return;
  FX.burstAt(card, { count: 5, spread: 60, kind: 'spark', colors: [art.color, '#fff'], ms: 450 });
  if (g.streak && g.streak % 5 === 0) FX.floatUp?.(`<span class="art-float" style="--ac:${art.color}">${ico(art.icon)}</span>`, card, { ms: 900 });
});

/* =========================================================
   Действия
   ========================================================= */


/* =========================================================
   Путь: уровни тренировки от простого к сложному.
   Каждый уровень — свои темы, своя сложность и цель;
   следующий открывается, когда пройден предыдущий.
   ========================================================= */

const TRAIN_LEVELS = [
  { n: 1, ops: ['add', 'sub'], tier: 'easy', count: 12, goal: 10, range: { min: 1, max: 20 } },
  { n: 2, ops: ['mul', 'div'], tier: 'easy', count: 12, goal: 10, range: { min: 2, max: 10 } },
  { n: 3, ops: ['add', 'sub'], tier: 'easy', count: 14, goal: 11, range: { min: 10, max: 100 } },
  { n: 4, ops: ['mul', 'div'], tier: 'easy', count: 14, goal: 11 },
  { n: 5, ops: ['add', 'sub', 'mul', 'div'], tier: 'easy', count: 15, goal: 12 },
  { n: 6, ops: ['order', 'add', 'mul'], tier: 'easy', count: 14, goal: 11 },
  { n: 7, ops: ['round', 'cmp', 'digit'], tier: 'easy', count: 14, goal: 11 },
  { n: 8, ops: ['neg'], tier: 'medium', count: 14, goal: 11 },
  { n: 9, ops: ['dvs', 'rem'], tier: 'medium', count: 14, goal: 11 },
  { n: 10, ops: ['lcm', 'dvs'], tier: 'medium', count: 12, goal: 9 },
  { n: 11, ops: ['pct'], tier: 'medium', count: 14, goal: 11 },
  { n: 12, ops: ['fred', 'fcmp'], tier: 'medium', count: 14, goal: 11 },
  { n: 13, ops: ['frac'], tier: 'medium', count: 12, goal: 9 },
  { n: 14, ops: ['eq', 'order', 'neg'], tier: 'medium', count: 14, goal: 11 },
  { n: 15, ops: ['pow', 'expo'], tier: 'medium', count: 12, goal: 9 },
  { n: 16, ops: ['add', 'sub', 'mul', 'div', 'pct', 'frac', 'order', 'neg'], tier: 'hard', count: 18, goal: 13 },
];

const pathState = d => (d.path ||= { stars: {} });
const pathStars = (d, n) => pathState(d).stars[n] || 0;
const pathOpen = (d, n) => n === 1 || pathStars(d, n - 1) > 0;
const pathCurrent = d => (TRAIN_LEVELS.find(l => !pathStars(d, l.n)) || TRAIN_LEVELS[TRAIN_LEVELS.length - 1]).n;
const pathTotalStars = d => TRAIN_LEVELS.reduce((a, l) => a + pathStars(d, l.n), 0);
const pathTopics = l => l.ops.map(o => OPS[o].name).join(' · ');
const starRow = s => `${'★'.repeat(s)}${'☆'.repeat(3 - s)}`;

// Уровень пути — обычная тренировка с заранее заданными темами и целью
VARIANTS.path = {
  base: 'practice', name: tr('Путь'), icon: 'flag', ownOps: true,
  desc: tr('Уровни от простого к сложному'),
  setup(g, opts) {
    const lv = TRAIN_LEVELS.find(l => l.n === Number(opts.n)) || TRAIN_LEVELS[0];
    g.pathLevel = lv.n;
    g.total = lv.count;
    Object.assign(g.settings, {
      ops: [...lv.ops], level: lv.tier, adaptive: false, shuffle: true,
      range: lv.range ? { on: true, ...lv.range } : { on: false },
    });
  },
};

// В игре видно, какой уровень идёт и какая цель
Hooks.on('gameTop', g => {
  const lv = g.pathLevel && TRAIN_LEVELS.find(l => l.n === g.pathLevel);
  return lv ? `<div class="ladder-flag">${ico('flag')}<b>${tr('Уровень {0}', lv.n)} · ${LEVELS[lv.tier].name}</b><span>${tr('Цель: {0} верных из {1}', lv.goal, lv.count)}</span></div>` : '';
});

// Итог уровня: звёзды и монеты
Hooks.on('gameEnd', (g, session, completed, extra) => {
  const lv = g.pathLevel && TRAIN_LEVELS.find(l => l.n === g.pathLevel);
  if (!lv) return;
  const answered = session.correct + session.wrong;
  const acc = answered ? session.correct / answered : 0;
  const passed = session.correct >= lv.goal;
  const stars = !passed ? 0 : session.wrong === 0 ? 3 : acc >= 0.9 ? 2 : 1;
  const st = pathState(data);
  const was = st.stars[lv.n] || 0;
  if (!passed) {
    extra.banners.push(`<div class="banner blue">${ico('target')}<span>${tr('Цель: {0} верных из {1}', lv.goal, lv.count)} · ${tr('у тебя {0}', session.correct)}</span></div>`);
    return;
  }
  if (stars > was) {
    st.stars[lv.n] = stars;
    const coins = (was ? 0 : 30 + 10 * lv.n) + 20 * (stars - was);
    giveCoins(coins, false);
    extra.banners.push(`<div class="banner gold">${ico('flag')}<span>${tr('Уровень {0} пройден!', lv.n)} ${starRow(stars)} · +${coins} ${ico('coin')}</span></div>`);
    const next = TRAIN_LEVELS.find(l => l.n === lv.n + 1);
    if (next && !was) extra.banners.push(`<div class="banner blue">${ico('play')}<span>${tr('Открыт уровень {0}: {1}', next.n, pathTopics(next))}</span></div>`);
  } else {
    extra.banners.push(`<div class="banner blue">${ico('flag')}<span>${tr('Уровень {0} пройден!', lv.n)} ${starRow(stars)}</span></div>`);
  }
});

// Карточка пути на экране тренировки
Hooks.on('trainingTop', () => {
  const d = data;
  const cur = pathCurrent(d);
  const lv = TRAIN_LEVELS.find(l => l.n === cur);
  const done = TRAIN_LEVELS.filter(l => pathStars(d, l.n)).length;
  return `
    <button class="ladder-card path-card" data-action="nav" data-view="path">
      <span class="ld-ico">${ico('flag')}</span>
      <span class="ld-main">
        <small>${tr('Путь')}</small>
        <b>${tr('Уровень {0}', lv.n)} · ${LEVELS[lv.tier].name}</b>
        <span>${escH(pathTopics(lv))}</span>
        <span class="ld-bar"><i style="width:${(done / TRAIN_LEVELS.length) * 100}%"></i></span>
        <em>${tr('Всего звёзд: {0} из {1}', pathTotalStars(d), TRAIN_LEVELS.length * 3)}</em>
      </span>
      <span class="ld-go">${ico('play')}</span>
    </button>`;
});

function renderPath() {
  const d = data;
  const cur = pathCurrent(d);
  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="training">‹ ${tr('Тренировка')}</button>
    <h1 class="page-title">${tr('Путь')}</h1>
    <p class="hint">${tr('Уровни от простого к сложному. Следующий открывается, когда пройден предыдущий.')}</p>
    <div class="map-stats">
      <span>${tr('Уровень {0}', cur)}</span>
      <span>${tr('Всего звёзд: {0} из {1}', pathTotalStars(d), TRAIN_LEVELS.length * 3)}</span>
    </div>
    <div class="path-list">
      ${TRAIN_LEVELS.map(l => {
        const s = pathStars(d, l.n);
        const open = pathOpen(d, l.n);
        return `
        <button class="path-row ${s ? 'done' : ''} ${open ? '' : 'locked'} ${l.n === cur ? 'now' : ''}" data-action="path-start" data-n="${l.n}">
          <span class="path-num">${open ? l.n : ico('lock')}</span>
          <span class="row-main">
            <b>${tr('Уровень {0}', l.n)} · ${LEVELS[l.tier].name}</b>
            <small>${escH(pathTopics(l))}</small>
            <small class="path-goal">${tr('Цель: {0} верных из {1}', l.goal, l.count)}</small>
          </span>
          <span class="path-stars">${starRow(s)}</span>
        </button>`;
      }).join('')}
    </div>`;
  const now = document.querySelector('.path-row.now');
  if (now) setTimeout(() => now.scrollIntoView({ block: 'center' }), 50);
}
Hooks.view('path', renderPath);

Hooks.on('action', (action, el) => {
  switch (action) {
    case 'path-start': {
      const n = Number(el.dataset.n);
      if (!pathOpen(data, n)) { toast(tr('Сначала пройди уровень {0}', n - 1)); FX.pulse(el, 'fx-wiggle', 500); return true; }
      startGame('path', { n });
      return true;
    }
    case 'quests-week': showWeekly(); return true;
    case 'chest-upgrade': upgradeChest(); return true;
    case 'chest-odds': showOdds(); return true;
    case 'login-claim': claimLogin(); return true;
    case 'shop-buy': buyOffer(el.dataset.id); return true;
    case 'col-claim': claimCollection(el.dataset.id); return true;
    case 'salvage': salvage(el.dataset.type, el.dataset.v); return true;
    case 'parts-exchange': exchangeParts(); return true;
    case 'showcase-pick': pickShowcase(Number(el.dataset.i)); return true;
    case 'exam-date': setExamDate(); return true;
    case 'exam-train': {
      const s = data.settings;
      s.ops = weakTestOps();
      delete s.opWeights;
      if (s.level === 'easy') s.level = 'medium';
      saveData();
      startGame('practice');
      return true;
    }
    case 'title-pick': {
      const t = TITLES.find(x => x.id === el.dataset.v);
      if (!t) return true;
      if (!t.req(data)) { toast(t.hint); FX.pulse(el, 'fx-wiggle', 500); return true; }
      profileData(data).title = t.id;
      saveData();
      renderProfile();
      return true;
    }
    case 'afx-pick': {
      const lvl = Number(el.dataset.lvl);
      if (levelFromXp(data.xp) < lvl) { toast(tr('Откроется на {0} уровне', lvl)); FX.pulse(el, 'fx-wiggle', 500); return true; }
      profileData(data).avatarFx = el.dataset.v || null;
      saveData();
      renderProfile();
      return true;
    }
    case 'set-wear': {
      const s = SETS.find(x => x.id === el.dataset.v);
      if (!s) return true;
      const p = profileData(data);
      p.crown = s.crown;
      p.frame = s.frame;
      saveData();
      renderProfile();
      toast(tr('Комплект «{0}»: {1}', s.name, s.bonus));
      return true;
    }
    default:
      return false;
  }
});

Hooks.on('ready', () => { seasonRollover(); });
