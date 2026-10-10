'use strict';

/* =========================================================
   Лестница (уровни 0–9999), короны, профиль игрока, соцсети
   ========================================================= */

const escH = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Лестница ---------- */

// Темы открываются по мере подъёма: сначала простые, выше — всё сразу
const LADDER_OPS = ['add', 'sub', 'mul', 'div', 'neg', 'order', 'pow', 'pct', 'frac', 'eq', 'round', 'rem',
  'expo', 'dvs', 'cmp', 'units', 'geo', 'word', 'stat', 'ratio', 'solid', 'alg', 'time', 'money',
  'digit', 'sets', 'lcm', 'fred', 'fcmp'];
const LADDER_TASKS = 5;
const LADDER_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 9999];

// Каждый уровень чуть сложнее: больше тем, выше сложность, меньше времени на ответ.
// К сотому уровню остаётся около 3 секунд на любой пример из всех 24 тем — без права на ошибку.
// Ничего не появляется внезапно: новая тема открывается раз в три уровня, и о ней предупреждают.
const ladderOpCount = n => Math.min(LADDER_OPS.length, 2 + Math.floor(Math.max(0, n) / 3));
const ladderTier = n => (n < 5 ? 'easy' : n < 20 ? 'medium' : 'hard');

function ladderCfg(n) {
  const tier = ladderTier(n);
  const cnt = ladderOpCount(n);
  const ops = LADDER_OPS.slice(0, cnt);
  const limit = Math.max(3, Math.round(15 * Math.pow(0.985, n) * 10) / 10);
  // Что нового именно на этом уровне
  const newOp = n > 0 && cnt > ladderOpCount(n - 1) ? LADDER_OPS[cnt - 1] : null;
  const newTier = n > 0 && tier !== ladderTier(n - 1) ? tier : null;
  return { tier, ops, limit, newOp, newTier };
}

// Всё новое на уровне: тема, сложность, особенность. Видно до старта и в игре.
function ladderNews(n) {
  const cfg = ladderCfg(n);
  const out = [];
  if (cfg.newOp) out.push({ kind: 'op', icon: 'bulb', text: tr('Новая тема: {0}', OPS[cfg.newOp].name), sub: tr('Первый пример — на новую тему') });
  if (cfg.newTier) out.push({ kind: 'tier', icon: 'mountain', text: tr('Числа стали больше: {0}', LEVELS[cfg.newTier].name) });
  const mod = typeof ladderMod === 'function' && !isBoss(n) ? ladderMod(n) : null;
  if (mod) out.push({ kind: 'mod', icon: 'sparkle', text: tr('Особенность: {0}', mod.name), sub: mod.desc, id: mod.id });
  return out;
}

const ladderState = d => (d.ladder ||= { level: 0, best: 0 });
const ladderNextMilestone = n => LADDER_MILESTONES.find(m => m > n) || 9999;

function ladderCard(d) {
  const L = ladderState(d);
  const cfg = ladderCfg(L.level);
  const next = ladderNextMilestone(L.level);
  const prev = [...LADDER_MILESTONES].reverse().find(m => m <= L.level) || 0;
  const pct = Math.min(100, ((L.level - prev) / (next - prev)) * 100);
  return `
    <button class="ladder-card" data-action="quick" data-mode="ladder">
      <span class="ld-ico">${ico('mountain')}</span>
      <span class="ld-main">
        <small>${tr('Лестница')}</small>
        <b>${tr('Уровень {0}', L.level.toLocaleString(I18N.locale))}</b>
        <span>${tr('{0} примеров · {1} с на ответ · без ошибок', LADDER_TASKS, fmtDec(cfg.limit))}</span>
        <span class="ld-ops">${tr('Темы')}: ${cfg.ops.slice(-7).map(o => `<i>${escH(OPS[o].sym)}</i>`).join('')}${cfg.ops.length > 7 ? `<i class="more">+${cfg.ops.length - 7}</i>` : ''}</span>
        ${ladderNews(L.level).map(x => `<em class="ld-news">${ico(x.icon)}${escH(x.text)}</em>`).join('')}
        <span class="ld-bar"><i style="width:${pct}%"></i></span>
        <em>${tr('До короны {0}: ещё {1}', next, next - L.level)}</em>
      </span>
      <span class="ld-go">${ico('play')}</span>
    </button>
    ${Hooks.html('ladderCard', d)}`;
}


/* ---------- Добыча из сундуков ---------- */

// Короны, которые можно только выбить из сундука. Чем реже сундук, тем красивее корона.
const LOOT_CROWNS = [
  { id: 'c_leaf', name: tr('Листва'), color: '#5fd391', chest: 'common', eff: { k: 'xp', v: 2 } },
  { id: 'c_sun', name: tr('Солнце'), color: '#ffcf3f', chest: 'common', eff: { k: 'gold', v: 8 } },
  { id: 'c_frost', name: tr('Иней'), color: '#bfe9ff', chest: 'common', eff: { k: 'blitz', v: 0.15 } },
  { id: 'c_ocean', name: tr('Океан'), color: '#2fa4ff', gem: '#bff4ff', chest: 'rare', eff: { k: 'time', v: 2 } },
  { id: 'c_ember', name: tr('Уголёк'), color: '#ff7a3d', gem: '#ffe08a', chest: 'rare', eff: { k: 'xp', v: 2.5 } },
  { id: 'c_mint', name: tr('Мята'), color: '#3fe0c0', gem: '#eafff9', chest: 'rare', eff: { k: 'hint', at: [4, 9] } },
  { id: 'c_nebula', name: tr('Туманность'), color: '#9d6bff', gem: '#ff9ae8', chest: 'epic', shimmer: true, eff: { k: 'xp', v: 3 } },
  { id: 'c_neon', name: tr('Неон'), color: '#ff4fd8', gem: '#7ff', chest: 'epic', shimmer: true, eff: { k: 'gold', v: 12 } },
  { id: 'c_royal', name: tr('Королевская'), color: '#d0213c', gem: '#ffd66e', chest: 'epic', shimmer: true, eff: { k: 'time', v: 3 } },
  { id: 'c_phoenix', name: tr('Феникс'), color: '#ff8a00', gem: '#fff08a', chest: 'legendary', shimmer: true, eff: { k: 'xp', v: 4 }, pas: { k: 'xp', v: 2 } },
  { id: 'c_dragon', name: tr('Дракон'), color: '#18b56b', gem: '#ff3b3b', chest: 'legendary', shimmer: true, eff: { k: 'life', at: [2, 7] }, pas: { k: 'time', v: 1.5 } },
  { id: 'c_sigma', name: tr('Корона Σ'), color: '#ffd66e', chest: 'mythic', sigma: true, legend: true, eff: { k: 'xp', v: 6 }, pas: { k: 'xp', v: 3 }, perk: 'revive' },
  { id: 'c_infinity', name: tr('Бесконечность'), color: '#ffffff', chest: 'mythic', infinity: true, legend: true, ultra: true, eff: { k: 'xp', v: 8 }, pas: { k: 'xp', v: 4 }, perk: 'guard' },
  // Сезонные: выпадают только в своё время года
  { id: 'c_winter', name: tr('Зимняя'), color: '#a8e4ff', gem: '#ffffff', chest: 'epic', season: 'winter', noDrop: true, shimmer: true, eff: { k: 'shield', at: [3, 8] } },
  { id: 'c_spring', name: tr('Весенняя'), color: '#9be07a', gem: '#ffb3d9', chest: 'epic', season: 'spring', noDrop: true, shimmer: true, eff: { k: 'xp', v: 3 } },
  { id: 'c_summer', name: tr('Летняя'), color: '#ffc93c', gem: '#ff7a3d', chest: 'epic', season: 'summer', noDrop: true, shimmer: true, eff: { k: 'gold', v: 12 } },
  { id: 'c_autumn', name: tr('Осенняя'), color: '#e0762c', gem: '#ffd66e', chest: 'epic', season: 'autumn', noDrop: true, shimmer: true, eff: { k: 'time', v: 3 } },
  // Награды за коллекции
  { id: 'c_blaze', name: tr('Пламя'), color: '#ff5a1f', gem: '#ffe08a', chest: 'legendary', collection: true, noDrop: true, shimmer: true, eff: { k: 'gold', v: 15 }, pas: { k: 'gold', v: 8 } },
  { id: 'c_emperor', name: tr('Императорская'), color: '#b01c3a', gem: '#fff1b8', chest: 'legendary', collection: true, noDrop: true, legend: true, eff: { k: 'xp', v: 5 }, pas: { k: 'coins', v: 2 } },
];

// Время года по месяцу: зима — декабрь–февраль
const SEASONS = { winter: [11, 0, 1], spring: [2, 3, 4], summer: [5, 6, 7], autumn: [8, 9, 10] };
const SEASON_NAMES = { winter: tr('Зима'), spring: tr('Весна'), summer: tr('Лето'), autumn: tr('Осень') };
const currentSeason = (d = new Date()) => Object.keys(SEASONS).find(k => SEASONS[k].includes(d.getMonth()));

// Шанс, что в сундуке окажется корона, и сколько опыта даёт повтор
const CHEST_NAMES = {
  common: tr('Обычный сундук'), rare: tr('Редкий сундук'), epic: tr('Эпический сундук'),
  legendary: tr('Легендарный сундук'), mythic: tr('Мифический сундук'),
};
const LOOT_CHANCE = { common: 0.1, rare: 0.2, epic: 0.35, legendary: 0.6, mythic: 1 };


const ownsCrown = (d, id) => !!d.inventory?.crowns?.[id];

/* ---------- Рамки для аватара (только из сундуков) ---------- */

const FRAMES = [
  { id: 'f_oak', name: tr('Дубовая'), chest: 'common', c1: '#8b5a2b', c2: '#c48a4f', eff: { k: 'parts', v: 3 } },
  { id: 'f_steel', name: tr('Сталь'), chest: 'common', c1: '#7d8790', c2: '#dfe6ec', eff: { k: 'coins', v: 2 } },
  { id: 'f_mint', name: tr('Мятная'), chest: 'common', c1: '#2bbf8e', c2: '#b8ffe6', eff: { k: 'salv', v: 3 } },
  { id: 'f_ink', name: tr('Чернила'), chest: 'common', c1: '#1d2b53', c2: '#8aa2ff', eff: { k: 'parts', v: 3 } },
  { id: 'f_wave', name: tr('Волна'), chest: 'rare', c1: '#1c6dff', c2: '#7ad7ff', eff: { k: 'parts', v: 4 } },
  { id: 'f_rose', name: tr('Роза'), chest: 'rare', c1: '#ff4f8b', c2: '#ffc2d6', eff: { k: 'coins', v: 3 } },
  { id: 'f_lime', name: tr('Лайм'), chest: 'rare', c1: '#7bd600', c2: '#eaffa3', eff: { k: 'quest', v: 5 } },
  { id: 'f_ice', name: tr('Лёд'), chest: 'rare', c1: '#8fe3ff', c2: '#ffffff', eff: { k: 'luck', at: [4, 9] } },
  { id: 'f_cosmos', name: tr('Космос'), chest: 'epic', c1: '#6a3dff', c2: '#ff6ad5', anim: true, eff: { k: 'loot', v: 6 } },
  { id: 'f_lava', name: tr('Лава'), chest: 'epic', c1: '#ff3d00', c2: '#ffcc33', anim: true, eff: { k: 'parts', v: 5 } },
  { id: 'f_royal', name: tr('Королевское золото'), chest: 'legendary', c1: '#b8780f', c2: '#fff1b8', anim: true, thick: true, eff: { k: 'coins', v: 6 }, pas: { k: 'coins', v: 3 } },
  { id: 'f_emerald', name: tr('Изумрудный венец'), chest: 'legendary', c1: '#0c8f55', c2: '#9dffd0', anim: true, thick: true, eff: { k: 'parts', v: 6 }, pas: { k: 'parts', v: 3 } },
  { id: 'f_aurora', name: tr('Аврора'), chest: 'mythic', rainbow: true, thick: true, eff: { k: 'luck', at: [2, 7] }, pas: { k: 'parts', v: 2 }, perk: 'floor' },
  { id: 'f_void', name: tr('Бездна'), chest: 'mythic', rainbow: true, thick: true, void: true, ultra: true, eff: { k: 'loot', v: 10 }, pas: { k: 'loot', v: 5 }, perk: 'chestkey' },
  { id: 'f_winter', name: tr('Иней'), chest: 'epic', c1: '#6fc8ff', c2: '#ffffff', anim: true, season: 'winter', noDrop: true, eff: { k: 'coins', v: 4 } },
  { id: 'f_spring', name: tr('Цветение'), chest: 'epic', c1: '#ff8fc8', c2: '#c8ff9b', anim: true, season: 'spring', noDrop: true, eff: { k: 'quest', v: 6 } },
  { id: 'f_summer', name: tr('Солнцестояние'), chest: 'epic', c1: '#ffb300', c2: '#fff27a', anim: true, season: 'summer', noDrop: true, eff: { k: 'salv', v: 6 } },
  { id: 'f_autumn', name: tr('Листопад'), chest: 'epic', c1: '#c4471b', c2: '#ffc15e', anim: true, season: 'autumn', noDrop: true, eff: { k: 'parts', v: 5 } },
  { id: 'f_galaxy', name: tr('Галактика'), chest: 'legendary', c1: '#3a1aff', c2: '#ff4fd8', anim: true, thick: true, collection: true, noDrop: true, eff: { k: 'loot', v: 8 }, pas: { k: 'loot', v: 4 } },
  { id: 'f_collector', name: tr('Коллекционер'), chest: 'legendary', c1: '#8a8f98', c2: '#ffe08a', anim: true, thick: true, collection: true, noDrop: true, eff: { k: 'quest', v: 8 }, pas: { k: 'quest', v: 4 } },
];

const frameStyle = f => (f.rainbow ? '' : `--f1:${f.c1};--f2:${f.c2}`);
const frameCls = f => (f ? `has-frame fr-${f.id} ${f.anim ? 'fr-anim' : ''} ${f.rainbow ? 'fr-rainbow' : ''} ${f.thick ? 'fr-thick' : ''} ${f.void ? 'fr-void' : ''}` : '');

/* ---------- Артефакты: надеваются в слоты и усиливают игру ---------- */

const ART_MAX = 5;
const ARTIFACTS = [
  { id: 'a_magnet', name: tr('Магнит опыта'), icon: 'magnet', chest: 'common', color: '#ff6b6b',
    effect: l => tr('+{0}% опыта за тренировку', 4 * l) },
  { id: 'a_hammer', name: tr('Молот Блица'), icon: 'hammer', chest: 'common', color: '#c9a36b',
    effect: l => tr('Штраф в Блице −{0} с', fmtDec(0.5 * l)) },
  { id: 'a_coin', name: tr('Золотая монета'), icon: 'coin', chest: 'rare', color: '#ffcf3f',
    effect: l => tr('Золотые примеры чаще на {0}%', 20 * l) },
  { id: 'a_clover', name: tr('Клевер удачи'), icon: 'clover', chest: 'rare', color: '#3fd07a',
    effect: l => tr('+{0} к удаче сундука', l >= 4 ? 2 : 1) },
  { id: 'a_hourglass', name: tr('Песочные часы'), icon: 'hourglass', chest: 'epic', color: '#7ad7ff',
    effect: l => tr('+{0}% времени в Выживании и Лестнице', 5 * l) },
  { id: 'a_shield', name: tr('Щит серии'), icon: 'shield', chest: 'epic', color: '#8ea2ff',
    effect: l => tr('Ошибка не обнуляет серию: {0} раз за игру', l >= 5 ? 3 : l >= 3 ? 2 : 1) },
  { id: 'a_heart', pas: { k: 'time', v: 2 }, name: tr('Второе сердце'), icon: 'heart', chest: 'legendary', color: '#ff4d6d',
    effect: l => tr('+{0} к жизням в Выживании', l >= 5 ? 2 : 1) },
  { id: 'a_crystal', pas: { k: 'loot', v: 2 }, name: tr('Кристалл добычи'), icon: 'gem', chest: 'legendary', color: '#b98cff',
    effect: l => tr('Предметы из сундуков чаще на {0}%', 10 * l) },
  { id: 'a_feather', pas: { k: 'xp', v: 2 }, name: tr('Перо феникса'), icon: 'feather', chest: 'mythic', color: '#ff8a00', ultra: true,
    effect: l => tr('Лестница: прощается ошибок за уровень — {0}', l >= 5 ? 2 : 1) },
];

const artSlots = d => 2 + (levelFromXp(d.xp) >= 20 ? 1 : 0);
const invOf = d => {
  d.inventory ||= {};
  d.inventory.crowns ||= {};
  d.inventory.frames ||= {};
  d.inventory.arts ||= {};
  d.inventory.copies ||= {};
  d.inventory.lv ||= {};
  // Раньше повторы корон и рамок копились счётчиком — превращаем их в копии для прокачки
  if (!d.inventory.v2) {
    for (const [type, bag] of [['crown', d.inventory.crowns], ['frame', d.inventory.frames]]) {
      for (const [id, n] of Object.entries(bag)) {
        if (n > 1) d.inventory.copies[`${type}:${id}`] = (d.inventory.copies[`${type}:${id}`] || 0) + n - 1;
        if (n) bag[id] = 1;
      }
    }
    d.inventory.v2 = 1;
  }
  return d.inventory;
};
const artLevelOwned = (d, id) => Math.min(ART_MAX, d.inventory?.arts?.[id] || 0);
// Уровень артефакта, только если он надет
const artLevel = (d, id) => ((profileData(d).arts || []).includes(id) ? artLevelOwned(d, id) : 0);
const ownsFrame = (d, id) => !!d.inventory?.frames?.[id];

function currentFrame(d) {
  const f = FRAMES.find(x => x.id === profileData(d).frame);
  return f && ownsFrame(d, f.id) ? f : null;
}

/* ---------- Что выпадает из сундука ---------- */

const ULTRA_CHANCE = 0.04; // «Бесконечность», «Бездна» и «Перо феникса» — внутри мифического сундука

function rollLoot(chestId, d = data) {
  const chance = (LOOT_CHANCE[chestId] || 0) * (1 + 0.1 * artLevel(d, 'a_crystal') + lootBonuses(d).loot / 100);
  if (Math.random() >= chance) return null;
  const r = Math.random();
  const type = r < 0.4 ? 'crown' : r < 0.7 ? 'frame' : 'art';
  const lists = { crown: LOOT_CROWNS, frame: FRAMES, art: ARTIFACTS };
  let pool = lists[type].filter(x => x.chest === chestId && !x.noDrop);
  if (chestId === 'mythic') {
    const ultra = Math.random() < ULTRA_CHANCE;
    pool = pool.filter(x => !!x.ultra === ultra);
    if (!pool.length) pool = lists[type].filter(x => x.chest === 'mythic');
  }
  let item = pool[Math.floor(Math.random() * pool.length)];
  // Каждый седьмой предмет из эпического и выше — сезонный
  const seasonal = type !== 'art' && ['epic', 'legendary', 'mythic'].includes(chestId) && Math.random() < 0.15
    ? lists[type].find(x => x.season === currentSeason()) : null;
  if (seasonal) item = seasonal;
  return item ? { type, item, crown: type === 'crown' ? item : null } : null;
}

// Кладёт добычу в инвентарь. Повтор — копия для прокачки, а у предмета на максимуме — монеты.
function grantLoot(d, chestId, loot) {
  if (!loot) return null;
  const inv = invOf(d);
  const bag = { crown: inv.crowns, frame: inv.frames, art: inv.arts }[loot.type];
  const id = loot.item.id;
  const key = partKey(loot.type, id);
  if (!bag[id]) {
    bag[id] = 1;
    loot.level = 1;
  } else if (itemLevel(d, loot.type, loot.item) >= itemMax(loot.type)) {
    loot.coins = DUP_COINS[chestId] || 20;
    d.coins = (d.coins || 0) + loot.coins;
  } else {
    inv.copies[key] = (inv.copies[key] || 0) + 1;
    loot.copy = inv.copies[key];
  }
  return loot;
}

/* ---------- Прокачка предметов: копии из сундуков + монеты за уровни ---------- */

const ITEM_MAX = { crown: 10, frame: 10, art: ART_MAX };
const itemMax = type => ITEM_MAX[type] || 10;
const DUP_COINS = { common: 20, rare: 45, epic: 90, legendary: 180, mythic: 400 };
const UP_COINS = { common: 60, rare: 120, epic: 220, legendary: 400, mythic: 700, ultra: 1200 };
const COPY_MUL = { common: 1, rare: 1, epic: 0.75, legendary: 0.5, mythic: 0.34, ultra: 0.25 };
const RAR_COLOR = { common: '#a3a3a3', rare: '#4d8dff', epic: '#ac6bff', legendary: '#e6bd5c', mythic: '#ff7ab8', ultra: '#ffffff' };
const RAR_NAME = {
  common: tr('Обычный'), rare: tr('Редкий'), epic: tr('Эпический'),
  legendary: tr('Легендарный'), mythic: tr('Мифический'), ultra: tr('Сверхредкий'),
};
const rarityOf = item => (item.ultra ? 'ultra' : item.chest);

// Монеты за каждый новый уровень игрока
const coinsForLevel = L => 100 + 25 * L;

function syncCoins(d) {
  d.coins ||= 0;
  d.coinsLvl ||= 1;
  const lvl = levelFromXp(d.xp);
  let got = 0;
  const cb = 1 + lootBonuses(d).coins / 100;
  while (d.coinsLvl < lvl) { d.coinsLvl++; got += Math.round(coinsForLevel(d.coinsLvl) * cb); }
  d.coins += got;
  return got;
}

function itemLevel(d, type, item) {
  const inv = invOf(d);
  if (type === 'art') return artLevelOwned(d, item.id);
  if (!(type === 'crown' ? inv.crowns : inv.frames)[item.id]) return 0;
  return Math.min(itemMax(type), inv.lv[partKey(type, item.id)] || 1);
}

// Цена перехода с уровня L на L+1: чем реже предмет и выше уровень, тем дороже
function upCost(item, L) {
  const r = rarityOf(item);
  return {
    coins: Math.round((UP_COINS[r] * L * (1 + 0.15 * (L - 1))) / 5) * 5,
    copies: Math.max(1, Math.ceil(L * COPY_MUL[r])),
  };
}

function upState(d, type, item) {
  const L = itemLevel(d, type, item);
  const max = L >= itemMax(type);
  const cost = max || !L ? null : upCost(item, L);
  const copies = invOf(d).copies[partKey(type, item.id)] || 0;
  const coins = d.coins || 0;
  return { L, max, cost, copies, coins, ready: !!cost && copies >= cost.copies && coins >= cost.coins };
}

function upgradeItem(d, type, item) {
  const st = upState(d, type, item);
  if (!st.ready) return null;
  const inv = invOf(d);
  const key = partKey(type, item.id);
  inv.copies[key] -= st.cost.copies;
  if (!inv.copies[key]) delete inv.copies[key];
  d.coins -= st.cost.coins;
  // Критическая ковка: 10 % на улучшение сразу на два уровня
  const crit = st.L + 2 <= itemMax(type) && Math.random() < 0.1;
  const to = st.L + (crit ? 2 : 1);
  if (type === 'art') inv.arts[item.id] = to;
  else inv.lv[key] = to;
  return { from: st.L, to, crit };
}

/* ---------- Бонусы предметов ----------
   У каждой короны и рамки свой эффект: он работает, пока предмет надет.
   Легендарные и мифические часть бонуса дают всегда, даже если не надеты,
   а у мифических есть ещё и особое свойство. */

const BONUS_TEXT = {
  xp: v => tr('+{0}% опыта за тренировку', fmtDec(v)),
  gold: v => tr('Золотые примеры чаще на {0}%', fmtDec(v)),
  time: v => tr('+{0}% времени в Выживании и Лестнице', fmtDec(v)),
  blitz: v => tr('Штраф в Блице −{0} с', fmtDec(v)),
  parts: v => tr('+{0}% к шансу частей в сундуке', fmtDec(v)),
  loot: v => tr('Предметы из сундуков чаще на {0}%', fmtDec(v)),
  coins: v => tr('+{0}% монет за новый уровень', fmtDec(v)),
  quest: v => tr('+{0}% к награде за задания', fmtDec(v)),
  salv: v => tr('+{0} монет за разбор копии', fmtDec(v)),
  luck: v => tr('+{0} к удаче сундука', v),
  hint: v => tr('+{0} к подсказкам в игре', v),
  life: v => tr('+{0} к жизням в Выживании', v),
  shield: v => tr('Ошибка не обнуляет серию: {0} раз за игру', v),
};

// Особые свойства мифических предметов — работают всегда
const PERKS = {
  revive: { icon: 'hourglass', text: () => tr('Второе дыхание: когда время кончится, даётся ещё 3 секунды — раз за игру') },
  guard: { icon: 'shield', text: () => tr('Первая ошибка за игру не отнимает жизнь и не обнуляет серию') },
  floor: { icon: 'chest', text: () => tr('Сундук после тренировки не бывает хуже редкого') },
  chestkey: { icon: 'key', text: () => tr('Каждый пятый сундук приносит ещё и ключ') },
};

// Сколько даёт эффект на этом уровне: ровно (v за уровень) или ступенями (at)
const bonusAt = (e, L) => {
  if (!e || L < 1) return 0;
  if (e.at) return e.at.filter(n => L >= n).length;
  return Math.round(e.v * (L - 1) * 100) / 100;
};
const bonusText = (e, L) => { const v = bonusAt(e, L); return v ? BONUS_TEXT[e.k](v) : ''; };
const itemWorn = (d, type, item) => {
  const p = profileData(d);
  if (type === 'crown') return p.crown === item.id;
  if (type === 'frame') return currentFrame(d)?.id === item.id;
  return (p.arts || []).includes(item.id);
};

// Все бонусы сразу: надетые предметы + постоянные бонусы легендарных и мифических
function lootBonuses(d) {
  const b = { xp: 0, gold: 0, time: 0, blitz: 0, parts: 0, loot: 0, coins: 0, quest: 0, salv: 0, luck: 0, hint: 0, life: 0, shield: 0, revive: 0, guard: 0, floor: 0, chestkey: 0 };
  for (const [type, list] of [['crown', LOOT_CROWNS], ['frame', FRAMES], ['art', ARTIFACTS]]) {
    for (const item of list) {
      const L = type === 'art' ? artLevelOwned(d, item.id) : itemLevel(d, type, item);
      if (!L) continue;
      if (item.eff && itemWorn(d, type, item)) b[item.eff.k] += bonusAt(item.eff, L);
      if (item.pas) b[item.pas.k] += bonusAt(item.pas, L);
      if (item.perk) b[item.perk]++;
    }
  }
  for (const k of Object.keys(b)) b[k] = Math.round(b[k] * 100) / 100;
  return b;
}

// Что даёт уровень: у каждого предмета своё, у артефакта — его свойство
function itemEffect(type, item, L) {
  if (type === 'art') return item.effect(Math.max(1, L));
  const e = item.eff;
  if (!e) return tr('Пока без бонуса');
  const txt = bonusText(e, Math.max(1, L));
  if (txt) return txt;
  // Бонуса пока нет — пишем, с какого уровня он будет
  return tr('{0} — с {1} уровня', BONUS_TEXT[e.k](e.at ? 1 : e.v), e.at ? e.at[0] : 2);
}

const framePartBonus = d => lootBonuses(d).parts / 100;

const upgradableCount = d => Object.entries(LOOT_LISTS)
  .reduce((n, [type, list]) => n + list.filter(item => upState(d, type, item).ready).length, 0);

const copyIcon = () => `<svg class="copy-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="12" height="15" rx="2.5"/><rect x="4" y="7" width="12" height="15" rx="2.5"/></svg>`;
const lvPips = (L, max) => `<span class="lv-pips">${Array.from({ length: max }, (_, i) => `<i class="${i < L ? 'on' : ''}"></i>`).join('')}</span>`;

/* ---------- Части предметов: кусочки пазла, из которых собирается предмет ---------- */

const PART_NEED = { common: 4, rare: 6, epic: 8, legendary: 12, mythic: 16, ultra: 40 };
const PART_DROP = { common: [1, 1], rare: [1, 2], epic: [1, 2], legendary: [2, 3], mythic: [2, 4] };
const PART_CHANCE = { common: 0.45, rare: 0.6, epic: 0.75, legendary: 0.9, mythic: 1 };

const LOOT_LISTS = { crown: LOOT_CROWNS, frame: FRAMES, art: ARTIFACTS };

const partKey = (type, id) => `${type}:${id}`;
const partNeed = item => (item.ultra ? PART_NEED.ultra : PART_NEED[item.chest] || 6);
const partsOf = d => (invOf(d).parts ||= {});

// Нужен ли ещё этот предмет: пока его нет или он не прокачан до максимума
const wantsItem = (d, type, item) => itemLevel(d, type, item) < itemMax(type);

function rollParts(chestId, d = data) {
  if (Math.random() >= (PART_CHANCE[chestId] || 0) * (1 + framePartBonus(d))) return null;
  const parts = partsOf(d);
  const ultraOk = chestId === 'mythic' && Math.random() < ULTRA_CHANCE * 3;
  const pool = [];
  for (const [type, list] of Object.entries(LOOT_LISTS)) {
    for (const item of list) {
      if (item.chest !== chestId || item.noDrop || (item.ultra && !ultraOk) || !wantsItem(d, type, item)) continue;
      // Начатый пазл выпадает чаще, чтобы части не размазывались по всем предметам
      const w = parts[partKey(type, item.id)] ? 3 : itemLevel(d, type, item) ? 1 : 2;
      for (let i = 0; i < w; i++) pool.push({ type, item });
    }
  }
  if (!pool.length) return null;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const [lo, hi] = PART_DROP[chestId] || [1, 1];
  return { ...pick, n: lo + Math.floor(Math.random() * (hi - lo + 1)) };
}

function grantParts(d, pr) {
  if (!pr) return null;
  const parts = partsOf(d);
  const key = partKey(pr.type, pr.item.id);
  const need = partNeed(pr.item);
  pr.before = Math.min(need, parts[key] || 0);
  parts[key] = Math.min(need, pr.before + pr.n);
  pr.have = parts[key];
  pr.need = need;
  pr.ready = pr.have >= need;
  return pr;
}

// Все начатые пазлы профиля: сначала готовые к сборке, потом ближе к концу
function partList(d) {
  const out = [];
  for (const [key, have] of Object.entries(partsOf(d))) {
    const [type, id] = key.split(':');
    const item = LOOT_LISTS[type]?.find(x => x.id === id);
    if (!item || !have) continue;
    out.push({ type, item, have, need: partNeed(item) });
  }
  return out.sort((a, b) => b.have / b.need - a.have / a.need);
}

function craftPart(d, type, id) {
  const item = LOOT_LISTS[type]?.find(x => x.id === id);
  const parts = partsOf(d);
  const key = partKey(type, id);
  if (!item || (parts[key] || 0) < partNeed(item)) return null;
  delete parts[key];
  const loot = grantLoot(d, item.ultra ? 'mythic' : item.chest, { type, item, crown: type === 'crown' ? item : null });
  loot.crafted = true;
  return loot;
}

// Пазл 2×2: у каждого кусочка свои выступы и выемки, стыки совпадают
const PUZZLE_PIECES = [
  'M0 0H50V17C62 15 62 35 50 33V50H33C35 62 15 62 17 50H0Z',
  'M50 0H100V50H83C85 38 65 38 67 50H50V33C62 35 62 15 50 17Z',
  'M50 50H67C65 38 85 38 83 50H100V100H50V83C38 85 38 65 50 67Z',
  'M0 50H17C15 62 35 62 33 50H50V67C38 65 38 85 50 83V100H0Z',
];
const PIECE_OFF = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

// Сколько кусочков из 4 уже на месте
const piecesOn = (have, need) => (have >= need ? 4 : Math.min(3, Math.floor((have / need) * 4)));

function partPuzzle(type, item, have, need, prev = have, cls = '') {
  const on = piecesOn(have, need);
  const was = piecesOn(prev, need);
  const color = type === 'frame' ? item.c1 || '#ff7ab8' : item.color || '#ffd66e';
  const pic = lootPic({ type, item });
  const uid = `pz${Math.random().toString(36).slice(2, 8)}`;
  return `<span class="puzzle ${cls} ${have >= need ? 'done' : ''} ${item.ultra ? 'ultra' : ''}" style="--pz:${color}">
    <span class="pz-pic">${pic}</span>
    <svg class="pz-svg" viewBox="-4 -4 108 108" aria-hidden="true">
      <defs>
        <pattern id="${uid}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="7" height="7" fill="#141414"/><path d="M0 0v7" stroke="#2a2a2a" stroke-width="2.4"/>
        </pattern>
        <filter id="${uid}-r" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.6"/></filter>
      </defs>
      <g filter="url(#${uid}-r)">
      ${PUZZLE_PIECES.map((d, i) => {
        const fresh = i < on && i >= was;
        const [dx, dy] = PIECE_OFF[i];
        const st = `--dx:${dx * 22}px;--dy:${dy * 22}px;--i:${i - was}`;
        if (fresh) return `<path class="pz-fog fading" d="${d}" fill="url(#${uid})" style="${st}"/><path class="pz-seam fresh" d="${d}" style="${st}"/>`;
        return i < on
          ? `<path class="pz-seam" d="${d}"/>`
          : `<path class="pz-fog" d="${d}" fill="url(#${uid})"/><path class="pz-hole" d="${d}"/>`;
      }).join('')}
      </g>
    </svg>
  </span>`;
}

// Маленький кусочек пазла — значок «часть»
const pieceIcon = (color = 'var(--gold)') => `<svg class="piece-ico" viewBox="-2 -2 70 70" aria-hidden="true" style="--pz:${color}">
  <path d="M0 0H50V17C62 15 62 35 50 33V50H33C35 62 15 62 17 50H0Z" transform="translate(8 6)"/></svg>`;

const typeName = type => ({ crown: tr('Корона'), frame: tr('Рамка'), art: tr('Артефакт') })[type];

const lootName = loot => loot.item.name;

function lootPic(loot) {
  if (loot.type === 'crown') return `<span class="crown-pic">${crownSvg(loot.item)}</span>`;
  if (loot.type === 'frame') return `<span class="frame-pic"><span class="pf-avatar sm ${frameCls(loot.item)}" style="${frameStyle(loot.item)}"><span class="pf-face">★</span></span></span>`;
  return `<span class="art-pic" style="--ac:${loot.item.color}">${ico(loot.item.icon)}</span>`;
}

function lootNote(loot) {
  if (loot.coins) return tr('Уже на максимуме → +{0} монет', loot.coins);
  if (loot.copy) return tr('Копия для прокачки · всего {0}', loot.copy);
  if (loot.type === 'art') return tr('Новый артефакт!');
  return loot.type === 'frame' ? tr('Новая рамка!') : tr('Новая корона!');
}

const lootColor = loot => (loot.type === 'frame' ? (loot.item.c1 || '#ff7ab8') : loot.item.color || '#ffd66e');

/* ---------- Анимация открытия сундука ---------- */

function chestSvg() {
  return `<svg class="co-chest" viewBox="0 0 140 120" aria-hidden="true">
    <defs>
      <linearGradient id="coBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--rc)"/><stop offset="1" stop-color="#1a1206"/></linearGradient>
      <linearGradient id="coGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".5" stop-color="#ffc83d"/><stop offset="1" stop-color="#a86a0c"/></linearGradient>
      <radialGradient id="coGlow"><stop offset="0" stop-color="#fff"/><stop offset=".4" style="stop-color:var(--rc)"/><stop offset="1" style="stop-color:var(--rc);stop-opacity:0"/></radialGradient>
    </defs>
    <ellipse class="co-light" cx="70" cy="58" rx="58" ry="26" fill="url(#coGlow)"/>
    <g class="co-body">
      <rect x="14" y="58" width="112" height="52" rx="9" fill="url(#coBody)" stroke="#120c03" stroke-width="3"/>
      <rect x="32" y="58" width="12" height="52" fill="url(#coGold)" stroke="#120c03" stroke-width="2"/>
      <rect x="96" y="58" width="12" height="52" fill="url(#coGold)" stroke="#120c03" stroke-width="2"/>
      <rect x="58" y="62" width="24" height="26" rx="5" fill="url(#coGold)" stroke="#120c03" stroke-width="2.4"/>
      <circle cx="70" cy="72" r="3.6" fill="#120c03"/><path d="M70 74v7" stroke="#120c03" stroke-width="3" stroke-linecap="round"/>
    </g>
    <g class="co-lid">
      <path d="M14 60V42C14 16 126 16 126 42v18Z" fill="url(#coBody)" stroke="#120c03" stroke-width="3" stroke-linejoin="round"/>
      <path d="M32 60V24.5c3.5-1.2 7.5-2.2 12-3V60Z" fill="url(#coGold)" stroke="#120c03" stroke-width="2"/>
      <path d="M96 60V21.5c4.5.8 8.5 1.8 12 3V60Z" fill="url(#coGold)" stroke="#120c03" stroke-width="2"/>
      <path d="M22 36c10-10 86-10 96 0" stroke="#fff" stroke-opacity=".35" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`;
}

// Полноэкранное открытие: тряска → вспышка и лучи → карточки добычи
function chestReveal(c, done) {
  if (!FX.on()) { done(); return; }
  const loot = c.loot;
  const parts = c.parts;
  const big = ['epic', 'legendary', 'mythic'].includes(c.id);
  const shakeMs = { common: 800, rare: 1000, epic: 1250, legendary: 1500, mythic: 1900 }[c.id] || 900;
  const ov = document.createElement('div');
  ov.className = `chest-ov r-${c.id}`;
  ov.style.setProperty('--rc', c.color);
  ov.style.setProperty('--shake', `${shakeMs}ms`);
  ov.innerHTML = `
    <div class="co-rays"></div>
    <div class="co-stage">${chestSvg()}</div>
    <div class="co-loot">
      <div class="co-title">${escH(c.name)}</div>
      <div class="co-cards">
        <div class="co-card"><b>+${c.xp}</b><small>XP</small></div>
        ${c.freeze ? `<div class="co-card"><b>+1</b><small>${tr('заморозка серии')}</small></div>` : ''}
        ${loot ? `
          <div class="co-card item t-${loot.type} ${loot.item.ultra ? 'ultra' : ''}" style="--cc:${lootColor(loot)}">
            ${lootPic(loot)}
            <b>${escH(lootName(loot))}</b>
            <small class="art-eff">${escH(itemEffect(loot.type, loot.item, loot.type === 'art' ? artLevelOwned(data, loot.item.id) : itemLevel(data, loot.type, loot.item)))}</small>
            <small>${lootNote(loot)}</small>
          </div>` : ''}
        ${parts ? `
          <div class="co-card item part-card" style="--cc:${lootColor(parts)}">
            ${partPuzzle(parts.type, parts.item, parts.have, parts.need, parts.before, 'lg')}
            <span class="part-tag">${pieceIcon()} ${tr('Часть ×{0}', parts.n)}</span>
            <b>${escH(parts.item.name)}</b>
            <span class="part-bar"><i style="width:${(parts.before / parts.need) * 100}%" data-to="${(parts.have / parts.need) * 100}"></i></span>
            <small>${parts.ready ? tr('Все части собраны! Собери предмет в профиле') : tr('{0}: {1} из {2} частей', typeName(parts.type), parts.have, parts.need)}</small>
          </div>` : ''}
      </div>
      <button class="btn primary big" data-co="close">${tr('Забрать')}</button>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('shake'));

  // Нарастающие щелчки, пока сундук трясётся
  let ticks = 0;
  const tick = setInterval(() => { Sound.tick(); vibrate(12 + ticks * 4); ticks++; }, Math.max(120, shakeMs / 7));

  setTimeout(() => {
    clearInterval(tick);
    ov.classList.remove('shake');
    ov.classList.add('open');
    if (big) Sound.record(); else Sound.correct(5);
    vibrate(big ? [0, 80, 40, 120] : 40);
    const stage = ov.querySelector('.co-stage');
    FX.burstAt(stage, { count: big ? 46 : 22, spread: big ? 260 : 170, kind: 'confetti', ms: 1300 });
    setTimeout(() => {
      ov.classList.add('loot');
      if (loot && !loot.coins) setTimeout(() => { Sound.achievement(); FX.burstAt(ov.querySelector('.co-card.item'), { count: 30, spread: 150, kind: 'confetti' }); }, 450);
      if (parts) partReveal(ov.querySelector('.part-card'), parts);
    }, 520);
  }, shakeMs);

  let closed = false;
  const close = () => {
    if (closed || !ov.classList.contains('loot')) return;
    closed = true;
    ov.classList.add('closing');
    setTimeout(() => ov.remove(), 260);
    done();
  };
  ov.addEventListener('click', e => { if (e.target.closest('[data-co="close"]') || !e.target.closest('.co-loot')) close(); });
}

// Кусочки влетают в пазл, полоска доезжает до нового значения
function partReveal(card, parts) {
  if (!card) return;
  setTimeout(() => {
    card.classList.add('pz-go');
    const bar = card.querySelector('.part-bar i');
    if (bar) bar.style.width = `${bar.dataset.to}%`;
    Sound.tick();
    vibrate(20);
    if (parts.ready) setTimeout(() => { Sound.achievement(); FX.burstAt(card, { count: 26, spread: 140, kind: 'confetti' }); }, 700);
  }, 550);
}

// Сборка предмета из частей: кусочки слетаются, вспышка, карточка предмета
function craftReveal(loot, done) {
  if (!FX.on()) { toast(`${tr('Предмет собран!')} ${lootName(loot)}`); done(); return; }
  const ov = document.createElement('div');
  ov.className = `chest-ov craft-ov r-${loot.item.ultra ? 'mythic' : loot.item.chest}`;
  ov.style.setProperty('--rc', lootColor(loot));
  ov.innerHTML = `
    <div class="co-rays"></div>
    <div class="craft-stage">${partPuzzle(loot.type, loot.item, 1, 1, 0, 'xl')}</div>
    <div class="co-loot">
      <div class="co-title">${tr('Предмет собран!')}</div>
      <div class="co-cards">
        <div class="co-card item t-${loot.type} ${loot.item.ultra ? 'ultra' : ''}" style="--cc:${lootColor(loot)}">
          <b>${escH(lootName(loot))}</b>
          <small class="art-eff">${escH(itemEffect(loot.type, loot.item, loot.type === 'art' ? artLevelOwned(data, loot.item.id) : itemLevel(data, loot.type, loot.item)))}</small>
          <small>${lootNote(loot)}</small>
        </div>
      </div>
      <button class="btn primary big" data-co="close">${tr('Забрать')}</button>
    </div>`;
  document.body.appendChild(ov);
  const pz = ov.querySelector('.puzzle');
  requestAnimationFrame(() => pz.classList.add('pz-go'));
  [0, 1, 2, 3].forEach(i => setTimeout(() => { Sound.tick(); vibrate(15); }, 180 + i * 150));
  setTimeout(() => {
    ov.classList.add('open', 'loot');
    Sound.achievement();
    vibrate([0, 60, 30, 100]);
    FX.burstAt(pz, { count: 40, spread: 220, kind: 'confetti', ms: 1300 });
  }, 1050);
  let closed = false;
  ov.addEventListener('click', e => {
    if (closed || !ov.classList.contains('loot')) return;
    if (!e.target.closest('[data-co="close"]') && e.target.closest('.co-loot')) return;
    closed = true;
    ov.classList.add('closing');
    setTimeout(() => ov.remove(), 260);
    done();
  });
}

/* ---------- Короны ---------- */

const maxAchTier = d => Math.max(0, ...ACH_TRACKS.map(t => d.achTiers?.[t.id] || 0));

const CROWNS = [
  { id: 'none', name: tr('Без короны'), hint: '', req: () => true },
  { id: 'wood', name: tr('Деревянная'), color: '#b07a45', hint: tr('Есть у всех'), req: () => true },
  ...RARITIES.map((r, i) => ({
    id: `r${i + 1}`, name: r.name, color: r.color, legend: i === 9,
    hint: tr('Любое достижение уровня «{0}»', r.name), req: d => maxAchTier(d) >= i + 1,
  })),
  { id: 'a_storm', name: tr('Молниеносная'), color: '#ffe14d', gem: '#fff', hint: tr('50 верных в Спринте'), req: d => recordBest(d, 'sprint') >= 50 },
  { id: 'a_fire', name: tr('Огненная'), color: '#ff6a2a', gem: '#ffe08a', hint: tr('Занимайся 30 дней подряд'), req: d => Math.max(dayStreak(d), d.life?.bestDays || 0) >= 30 },
  { id: 'a_scholar', name: tr('Мудрец'), color: '#7c9cff', gem: '#fff5c2', hint: tr('12 тем, в каждой 50 верных'), req: d => Object.values(d.opStats).filter(s => s.c >= 50).length >= 12 },
  { id: 'a_marathon', name: tr('Марафонская'), color: '#e0e0e0', gem: '#ffd66e', shimmer: true, hint: tr('Проведи в тренировках 50 часов'), req: d => (d.life?.ms || 0) >= 50 * 3.6e6 },
  { id: 'a_crystal', name: tr('Хрустальная'), color: '#cfefff', gem: '#fff', shimmer: true, hint: tr('50 тренировок без ошибок'), req: d => (d.life?.perfect || 0) >= 50 },
  ...[[10, '#7ad7ff'], [25, '#ff9f43'], [50, '#ff5468'], [100, '#ffd37a'], [500, null], [1000, null]].map(([n, c]) => ({
    id: `l${n}`, name: tr('Вершина {0}', n), color: c || '#ffd37a', legend: !c, summit: true,
    hint: tr('Лестница: дойди до уровня {0}', n), req: d => (d.ladder?.best || 0) >= n,
  })),
  ...LOOT_CROWNS.map(c => ({
    ...c, loot: true,
    hint: c.collection ? tr('Награда за коллекцию в Мастерской') : c.season ? tr('Сезонная: {0}. Эпический сундук и выше', SEASON_NAMES[c.season]) : c.ultra ? tr('Мифический сундук · шанс меньше 0,1 %') : tr('Выпадает из сундука: {0}', CHEST_NAMES[c.chest]),
    req: d => ownsCrown(d, c.id),
  })),
];

function crownSvg(c) {
  if (!c || c.id === 'none') return '';
  const gid = `cg-${c.id}`;
  const body = 'M7 36 9.5 13.5l12 11L32 6.5l10.5 18 12-11L57 36Z';
  const fill = c.legend
    ? `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a3"/><stop offset=".35" stop-color="#ff7ab8"/><stop offset=".7" stop-color="#7ad7ff"/><stop offset="1" stop-color="#b98cff"/></linearGradient>`
    : `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="${c.color}"/><stop offset="1" stop-color="${c.color}" stop-opacity=".75"/></linearGradient>`;
  const gem = c.gem || (c.summit ? '#fff' : '#ffffffcc');
  const tip = c.infinity ? '#fff' : c.color;
  const gloss = c.shimmer || c.legend
    ? `<clipPath id="${gid}-c"><path d="${body}"/><path d="M7 36h50v5.5H7z"/></clipPath><g clip-path="url(#${gid}-c)"><rect class="gloss" x="-30" y="0" width="12" height="44" fill="#fff" opacity=".55" transform="skewX(-20)"/></g>`
    : '';
  const center = c.sigma
    ? '<circle cx="32" cy="28" r="6.2" fill="#1d1405"/><text x="32" y="32.2" font-size="11" font-weight="900" text-anchor="middle" fill="#ffd66e" font-family="Outfit, sans-serif">Σ</text>'
    : c.infinity
      ? '<path d="M24 28c0-4 5.5-4 8 0s8 4 8 0-5.5-4-8 0-8 4-8 0Z" fill="none" stroke="#1d1405" stroke-width="3.2"/><path d="M24 28c0-4 5.5-4 8 0s8 4 8 0-5.5-4-8 0-8 4-8 0Z" fill="none" stroke="#fff" stroke-width="1.4"/>'
      : `<circle cx="32" cy="29" r="3.6" fill="${gem}" stroke="#1d1405" stroke-width="1.6"/>`;
  return `<svg class="crown-svg ${c.infinity ? 'ultra' : ''}" viewBox="0 0 64 44" aria-hidden="true"><defs>${fill}</defs>
    <path d="${body}" fill="url(#${gid})" stroke="#1d1405" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M7 36h50v5.5H7z" fill="url(#${gid})" stroke="#1d1405" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M12 16.5l-1.5 17M31.5 10l-2 20M52 16.5l1.5 17" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" stroke-linecap="round"/>
    ${gloss}
    <circle cx="9.5" cy="12.5" r="3" fill="${tip}" stroke="#1d1405" stroke-width="1.8"/>
    <circle cx="32" cy="5.5" r="3.4" fill="${tip}" stroke="#1d1405" stroke-width="1.8"/>
    <circle cx="54.5" cy="12.5" r="3" fill="${tip}" stroke="#1d1405" stroke-width="1.8"/>
    ${center}
    <circle cx="19" cy="31" r="2.2" fill="${gem}" stroke="#1d1405" stroke-width="1.4"/>
    <circle cx="45" cy="31" r="2.2" fill="${gem}" stroke="#1d1405" stroke-width="1.4"/>
  </svg>`;
}

/* ---------- Профиль ---------- */

const AVATAR_ICONS = ['rocket', 'star', 'fire', 'bolt', 'gem', 'trophy', 'comet', 'medal', 'shield', 'heart', 'target', 'bulb', 'mountain', 'crown'];
const profileData = d => {
  d.profile ||= { avatar: null, pos: 'left', crown: 'wood', tg: '', ig: '' };
  d.profile.arts ||= [];
  return d.profile;
};

function currentCrown(d) {
  const c = CROWNS.find(x => x.id === profileData(d).crown);
  return c && c.req(d) ? c : null;
}

function avatarHtml(d, cls = '') {
  const p = profileData(d);
  const face = p.avatar ? ico(p.avatar) : escH(profileName().slice(0, 1).toUpperCase());
  const crown = currentCrown(d);
  const frame = currentFrame(d);
  const afx = profileData(d).avatarFx;
  return `<span class="pf-avatar ${cls} ${crown?.legend && !frame ? 'legend' : ''} ${frameCls(frame)} ${afx ? `afx afx-${afx}` : ''}" style="--pc:${profileColor()};${frame ? frameStyle(frame) : ''}">
    <span class="pf-face">${face}</span>
    ${crown && crown.id !== 'none' ? `<span class="pf-crown">${crownSvg(crown)}</span>` : ''}
  </span>`;
}

/* ---------- Соцсети ---------- */

const SOCIALS = {
  tg: { name: 'Telegram', icon: 'tg', url: u => `https://t.me/${u}` },
  ig: { name: 'Instagram', icon: 'ig', url: u => `https://instagram.com/${u}` },
};

// Принимает «@nick», «nick» или ссылку и оставляет только допустимое имя
function cleanHandle(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
  return /^[A-Za-z0-9_.]{3,32}$/.test(s) ? s : null;
}

function socialChips(d, small = false) {
  const p = profileData(d);
  return Object.entries(SOCIALS).filter(([k]) => p[k]).map(([k, s]) =>
    `<button class="pf-social ${small ? 'sm' : ''}" data-action="pf-open" data-net="${k}" aria-label="${s.name}">${ico(s.icon)}<span>@${escH(p[k])}</span></button>`).join('');
}

function openSocial(net) {
  const s = SOCIALS[net];
  const u = profileData(data)[net];
  if (!s || !u) return;
  const url = s.url(u);
  if (window.MFSAndroid?.openUrl) window.MFSAndroid.openUrl(url);
  else window.open(url, '_blank', 'noopener');
}

async function editSocial(net) {
  const s = SOCIALS[net];
  const p = profileData(data);
  const buttons = [{ label: tr('Отмена'), value: 'cancel', kind: 'ghost' }, { label: tr('Сохранить'), value: 'save', kind: 'primary' }];
  if (p[net]) buttons.unshift({ label: tr('Удалить'), value: 'del', kind: 'ghost' });
  const res = await Dialog.open({
    icon: s.icon, title: s.name, text: tr('Ник без @ или ссылка на профиль'),
    input: { value: p[net] ? `@${p[net]}` : '', placeholder: '@nickname', maxLength: 60 },
    buttons, dismiss: { button: 'cancel' },
  });
  if (!res || res.button === 'cancel') return;
  if (res.button === 'del') {
    p[net] = '';
  } else {
    const h = cleanHandle(res.value);
    if (!h) { toast(tr('Такой ник не подходит')); return; }
    p[net] = h;
  }
  saveData();
  renderProfile();
}

/* ---------- Экран профиля ---------- */

function renderProfile() {
  const d = data;
  if (syncCoins(d)) saveData();
  const p = profileData(d);
  const lvl = levelFromXp(d.xp);
  const pos = ['left', 'center', 'right'].includes(p.pos) ? p.pos : 'left';
  const posLabels = { left: tr('Слева'), center: tr('По центру'), right: tr('Справа') };

  $('#app').innerHTML = `
    <h1 class="page-title">${tr('Профиль')}</h1>

    <section class="card glow pf-hero pos-${pos}">
      ${avatarHtml(d, 'xl')}
      <div class="pf-info">
        <b class="pf-nick">${escH(profileName())}</b>
        ${Hooks.html('nickUnder', d)}
        <small>${tr('Уровень {0} · {1} XP', lvl, d.xp.toLocaleString(I18N.locale))} · ${tr('Лестница: {0}', ladderState(d).best)}</small>
        <div class="pf-socials">${socialChips(d)}</div>
      </div>
    </section>

    ${Hooks.html('profileTop', d)}
    ${forgeEntry(d)}

    <div class="set-group">
      <div class="set-title">${tr('Ник')}</div>
      <div class="set-card">
        <button class="set-row" data-action="pf-nick">
          <span class="set-ico">${ico('font')}</span>
          <span class="set-main"><b>${escH(profileName())}</b><small>${tr('Как тебя зовут в приложении')}</small></span>
          <span class="set-value">${tr('Изменить')}</span><span class="chev">›</span>
        </button>
        <button class="set-row" data-action="set-profiles">
          <span class="set-ico">${ico('star')}</span>
          <span class="set-main"><b>${tr('Профили')}</b><small>${tr('У каждого свой прогресс')}</small></span>
          <span class="set-value">${profiles.list.length}</span><span class="chev">›</span>
        </button>
      </div>
    </div>

    <div class="set-group">
      <div class="set-title">${tr('Аватар')}</div>
      <div class="set-card pf-pad">
        <div class="pf-grid">
          <button class="pf-opt ${!p.avatar ? 'on' : ''}" data-action="pf-avatar" data-v=""><span class="pf-letter">${escH(profileName().slice(0, 1).toUpperCase())}</span></button>
          ${AVATAR_ICONS.map(a => `<button class="pf-opt ${p.avatar === a ? 'on' : ''}" data-action="pf-avatar" data-v="${a}">${ico(a)}</button>`).join('')}
        </div>
        <div class="pf-colors">
          ${PROFILE_COLORS.map(c => `<button class="pf-color ${profileColor() === c ? 'on' : ''}" style="--c:${c}" data-action="pf-color" data-v="${c}" aria-label="${c}"></button>`).join('')}
        </div>
      </div>
    </div>

    <div class="set-group">
      <div class="set-title">${tr('Расположение на главной')}</div>
      <div class="segmented pf-pos">
        ${Object.entries(posLabels).map(([k, l]) => `<button class="${pos === k ? 'on' : ''}" data-action="pf-pos" data-v="${k}">${l}</button>`).join('')}
      </div>
    </div>

    <div class="set-group">
      <div class="set-title">${tr('Части предметов')}</div>
      ${(() => {
        const list = partList(d);
        if (!list.length) return `<div class="parts-empty">${pieceIcon()}<span>${tr('Из сундуков выпадают части корон, рамок и артефактов. Собери все кусочки пазла — получишь предмет.')}</span></div>`;
        return `<div class="parts-grid">${list.map(x => {
          const ready = x.have >= x.need;
          return `
          <button class="part-opt ${ready ? 'ready' : ''}" data-action="pf-craft" data-type="${x.type}" data-v="${x.item.id}" style="--cc:${lootColor(x)}">
            ${partPuzzle(x.type, x.item, x.have, x.need)}
            <b>${escH(x.item.name)}</b>
            <span class="part-bar"><i style="width:${(x.have / x.need) * 100}%"></i></span>
            <small>${ready ? tr('Собрать!') : `${typeName(x.type)} · ${x.have} / ${x.need}`}</small>
          </button>`;
        }).join('')}</div>`;
      })()}
    </div>

    <div class="set-group">
      <div class="set-title">${tr('Корона')} · ${CROWNS.filter(c => c.id !== 'none' && c.req(d)).length} / ${CROWNS.length - 1}</div>
      <div class="crown-grid">
        ${CROWNS.map(c => {
          const open = c.req(d);
          const on = (p.crown || 'wood') === c.id;
          return `
          <button class="crown-opt ${open ? '' : 'locked'} ${on ? 'on' : ''} ${c.legend ? 'legend' : ''}" data-action="pf-crown" data-v="${c.id}" style="--cc:${c.color || '#555'}">
            <span class="crown-pic">${c.id === 'none' ? '<span class="crown-none">∅</span>' : crownSvg(c)}</span>${c.loot && open ? `<i class="opt-lv">${tr('ур. {0}', itemLevel(d, 'crown', c))}</i>` : ''}
            <b>${escH(c.name)}</b>
            <small>${open ? (on ? tr('Надета') : tr('Нажми, чтобы надеть')) : escH(c.hint)}</small>
            ${open && c.loot ? `<em class="opt-eff">${escH(itemEffect('crown', c, itemLevel(d, 'crown', c)))}</em>${c.pas ? `<em class="opt-eff pas">${escH(tr('Работает всегда: {0}', bonusText(c.pas, Math.max(1, itemLevel(d, 'crown', c)))))}</em>` : ''}${c.perk ? `<em class="opt-eff perk">${ico(PERKS[c.perk].icon)}${escH(PERKS[c.perk].text())}</em>` : ''}` : ''}
          </button>`;
        }).join('')}
      </div>
    </div>

    <div class="set-group">
      <div class="set-title">${tr('Рамка аватара')} · ${FRAMES.filter(f => ownsFrame(d, f.id)).length} / ${FRAMES.length}</div>
      <div class="crown-grid">
        <button class="crown-opt ${!currentFrame(d) ? 'on' : ''}" data-action="pf-frame" data-v="" style="--cc:var(--gold)">
          <span class="frame-pic">${avatarPreview(d, null)}</span><b>${tr('Обычная')}</b><small>${!currentFrame(d) ? tr('Надета') : tr('Нажми, чтобы надеть')}</small>
        </button>
        ${FRAMES.map(f => {
          const own = ownsFrame(d, f.id);
          const on = currentFrame(d)?.id === f.id;
          return `
          <button class="crown-opt ${own ? '' : 'locked'} ${on ? 'on' : ''}" data-action="pf-frame" data-v="${f.id}" style="--cc:${f.c1 || '#ff7ab8'}">
            <span class="frame-pic">${avatarPreview(d, f)}</span>${own ? `<i class="opt-lv">${tr('ур. {0}', itemLevel(d, 'frame', f))}</i>` : ''}
            <b>${escH(f.name)}</b>
            ${own ? `<em class="opt-eff">${escH(itemEffect('frame', f, itemLevel(d, 'frame', f)))}</em>${f.pas ? `<em class="opt-eff pas">${escH(tr('Работает всегда: {0}', bonusText(f.pas, Math.max(1, itemLevel(d, 'frame', f)))))}</em>` : ''}${f.perk ? `<em class="opt-eff perk">${ico(PERKS[f.perk].icon)}${escH(PERKS[f.perk].text())}</em>` : ''}` : ''}
            <small>${own ? (on ? tr('Надета') : tr('Нажми, чтобы надеть')) : (f.collection ? tr('Награда за коллекцию в Мастерской') : f.season ? escH(tr('Сезонная: {0}. Эпический сундук и выше', SEASON_NAMES[f.season])) : f.ultra ? tr('Мифический сундук · шанс меньше 0,1 %') : escH(tr('Выпадает из сундука: {0}', CHEST_NAMES[f.chest])))}</small>
          </button>`;
        }).join('')}
      </div>
    </div>

    <div class="set-group">
      <div class="set-title">${tr('Артефакты')} · ${tr('слоты {0} / {1}', p.arts.length, artSlots(d))}</div>
      <div class="art-slots">
        ${Array.from({ length: 3 }, (_, i) => {
          const id = p.arts[i];
          const a = ARTIFACTS.find(z => z.id === id);
          if (i >= artSlots(d)) return `<div class="art-slot locked">${ico('lock')}<small>${tr('с 20 уровня')}</small></div>`;
          return a ? `<button class="art-slot on" data-action="pf-art" data-v="${a.id}" style="--ac:${a.color}">${ico(a.icon)}<small>${escH(a.name)}</small></button>`
            : `<div class="art-slot">+<small>${tr('Пусто')}</small></div>`;
        }).join('')}
      </div>
      <div class="art-grid">
        ${ARTIFACTS.map(a => {
          const lvl = artLevelOwned(d, a.id);
          const on = p.arts.includes(a.id);
          return `
          <button class="art-opt ${lvl ? '' : 'locked'} ${on ? 'on' : ''} ${a.ultra ? 'ultra' : ''}" data-action="pf-art" data-v="${a.id}" style="--ac:${a.color}">
            <span class="art-pic">${ico(a.icon)}</span>
            <b>${escH(a.name)}</b>
            <span class="art-lvl">${'★'.repeat(lvl)}${'☆'.repeat(ART_MAX - lvl)}</span>
            <small>${escH(a.effect(Math.max(1, lvl)))}</small>
            <em>${lvl ? (on ? tr('Надет') : tr('Нажми, чтобы надеть')) : (a.ultra ? tr('Мифический сундук · шанс меньше 0,1 %') : escH(tr('Выпадает из сундука: {0}', CHEST_NAMES[a.chest])))}</em>
          </button>`;
        }).join('')}
      </div>
      <p class="hint">${tr('Повторы из сундуков — это копии: улучшай предметы в Мастерской.')}</p>
    </div>

    ${Hooks.html('profileBottom', d)}

    <div class="set-group">
      <div class="set-title">${tr('Соцсети')}</div>
      <div class="set-card">
        ${Object.entries(SOCIALS).map(([k, s]) => `
          <button class="set-row" data-action="pf-social" data-net="${k}">
            <span class="set-ico social-ico ${k}">${ico(s.icon)}</span>
            <span class="set-main"><b>${s.name}</b><small>${p[k] ? `@${escH(p[k])}` : tr('Не указан')}</small></span>
            <span class="set-value">${p[k] ? tr('Изменить') : tr('Добавить')}</span><span class="chev">›</span>
          </button>`).join('')}
      </div>
    </div>`;
}

/* ---------- Мастерская: прокачка предметов ---------- */

let forgeTab = 'crown';

function forgeEntry(d) {
  const n = upgradableCount(d);
  return `
    <button class="forge-entry ${n ? 'hot' : ''}" data-action="nav" data-view="forge">
      <span class="fe-ico">${ico('anvil')}</span>
      <span class="fe-main"><b>${tr('Мастерская')}</b><small>${n ? tr('Можно улучшить: {0}', n) : tr('Прокачка корон, рамок и артефактов')}</small></span>
      <span class="coin-chip">${ico('coin')}<b>${fmtNum(d.coins || 0)}</b></span>
    </button>`;
}

function forgeCard(d, type, item) {
  const st = upState(d, type, item);
  const r = rarityOf(item);
  const max = itemMax(type);
  const effNow = itemEffect(type, item, st.L);
  let effNext = st.max ? '' : itemEffect(type, item, st.L + 1);
  if (effNext === effNow) effNext = ''; // на следующем уровне то же самое — не повторяем
  const pas = item.pas ? bonusText(item.pas, Math.max(1, st.L)) : '';
  const perk = item.perk ? PERKS[item.perk] : null;
  const worn = itemWorn(d, type, item);
  const okCopies = st.cost && st.copies >= st.cost.copies;
  const okCoins = st.cost && st.coins >= st.cost.coins;
  return `
    <div class="forge-card r-${r} ${st.ready ? 'ready' : ''} ${st.max ? 'max' : ''}" style="--cc:${lootColor({ type, item })};--rc:${RAR_COLOR[r]}">
      <span class="fc-pic">${lootPic({ type, item })}<i class="fc-lv">${st.L}</i></span>
      <div class="fc-main">
        <div class="fc-head"><b>${escH(item.name)}</b><span class="fc-rar">${RAR_NAME[r]}</span></div>
        ${lvPips(st.L, max)}
        <small class="fc-eff">${worn || type === 'art' ? '' : `<i class="fc-off">${tr('пока надета')}:</i> `}${escH(effNow)}${effNext ? ` <span class="fc-next">→ ${escH(effNext)}</span>` : ''}</small>
        ${pas ? `<small class="fc-pas">${ico('sparkle')}${tr('Работает всегда: {0}', pas)}</small>` : ''}
        ${perk ? `<small class="fc-perk">${ico(perk.icon)}${escH(perk.text())}</small>` : ''}
        ${st.max ? `<span class="fc-maxed">${ico('crown')} ${tr('Максимальный уровень')}</span>` : `
        <div class="fc-req">
          ${st.copies ? `<button class="req salvage" data-action="salvage" data-type="${type}" data-v="${item.id}" aria-label="${tr('Разобрать копию')}">↯ +${salvageCoins(item)}</button>` : ''}
          <span class="req ${okCopies ? 'ok' : ''}">${copyIcon()}<b>${st.copies}</b>/${st.cost.copies}</span>
          <span class="req ${okCoins ? 'ok' : ''}">${ico('coin')}<b>${fmtNum(st.cost.coins)}</b></span>
        </div>`}
      </div>
      ${st.max ? '' : `<button class="fc-btn" data-action="forge-up" data-type="${type}" data-v="${item.id}" aria-label="${tr('Улучшить')}">${ico('hammer')}<span>${tr('Ур. {0}', st.L + 1)}</span></button>`}
    </div>`;
}

// Что сейчас дают все предметы вместе
function bonusSummary(d) {
  const b = lootBonuses(d);
  const list = Object.keys(BONUS_TEXT).filter(k => b[k]).map(k => `<span>${escH(BONUS_TEXT[k](b[k]))}</span>`);
  const perks = Object.keys(PERKS).filter(k => b[k]).map(k => `<span class="bs-perk">${ico(PERKS[k].icon)}${escH(PERKS[k].text())}</span>`);
  if (!list.length && !perks.length) {
    return `<div class="bonus-sum empty"><b>${tr('Бонусы предметов')}</b><span>${tr('Надень корону и рамку в профиле — их эффекты начнут работать')}</span></div>`;
  }
  return `
    <div class="bonus-sum">
      <b>${ico('sparkle')}${tr('Сейчас действует')}</b>
      ${list.join('')}${perks.join('')}
    </div>`;
}

function renderForge() {
  const d = data;
  if (syncCoins(d)) saveData();
  const lvl = levelFromXp(d.xp);
  const lvlStart = xpForLevel(lvl);
  const pct = Math.round(((d.xp - lvlStart) / (xpForLevel(lvl + 1) - lvlStart)) * 100);
  const tabs = { crown: tr('Короны'), frame: tr('Рамки'), art: tr('Артефакты'), col: tr('Коллекции') };
  if (forgeTab === 'col') { renderForgeCollections(d, tabs); return; }
  const owned = LOOT_LISTS[forgeTab]
    .filter(item => itemLevel(d, forgeTab, item) > 0)
    .map(item => ({ item, st: upState(d, forgeTab, item) }))
    .sort((a, b) => (b.st.ready - a.st.ready) || (a.st.max - b.st.max) || (b.st.copies - a.st.copies));
  const locked = LOOT_LISTS[forgeTab].length - owned.length;

  $('#app').innerHTML = `
    <button class="back-link" data-action="nav" data-view="profile">‹ ${tr('Профиль')}</button>
    <h1 class="page-title">${tr('Мастерская')}</h1>

    <section class="card glow forge-hero">
      <span class="fh-ico">${ico('coins')}</span>
      <div class="fh-main">
        <small>${tr('Монеты')}</small>
        <b class="fh-num">${fmtNum(d.coins || 0)}</b>
        <span class="fh-next">${tr('Уровень {0} → +{1} монет', lvl + 1, fmtNum(coinsForLevel(lvl + 1)))}</span>
        <span class="ld-bar"><i style="width:${pct}%"></i></span>
      </div>
    </section>

    ${Hooks.html('forgeTop', d)}
    ${bonusSummary(d)}
    <div class="forge-how">
      <span>${copyIcon()} ${tr('Копии — повторы из сундуков')}</span>
      <span>${ico('coin')} ${tr('Монеты — за каждый новый уровень')}</span>
    </div>

    <div class="segmented forge-tabs">
      ${Object.entries(tabs).map(([k, l]) => {
        const n = k === 'col' ? 0 : LOOT_LISTS[k].filter(item => upState(d, k, item).ready).length;
        const n2 = k === 'col' ? Hooks.first('collectionsReady', d) || 0 : n;
        return `<button class="${forgeTab === k ? 'on' : ''}" data-action="forge-tab" data-v="${k}">${l}${n2 ? `<i class="tab-dot">${n2}</i>` : ''}</button>`;
      }).join('')}
    </div>

    <div class="forge-list">
      ${owned.length ? owned.map(x => forgeCard(d, forgeTab, x.item)).join('') : `<div class="parts-empty">${ico('chest')}<span>${tr('Здесь пока пусто. Открывай сундуки после тренировок — предметы и их копии появятся тут.')}</span></div>`}
    </div>
    ${locked ? `<p class="hint">${tr('Ещё не найдено: {0}. Ищи в сундуках или собирай из частей.', locked)}</p>` : ''}
    <p class="hint">${tr('Чем реже предмет и выше его уровень, тем больше копий и монет нужно для улучшения.')}</p>`;
}

// Ковка: молот бьёт три раза, искры, уровень перелистывается
function forgeReveal(type, item, up, done) {
  const L = up.to;
  const r = rarityOf(item);
  const finish = () => { toast(`${item.name}: ${tr('Ур. {0}', L)}`); done(); };
  if (!FX.on()) { finish(); return; }
  const ov = document.createElement('div');
  ov.className = `chest-ov forge-ov r-${r === 'ultra' ? 'mythic' : r}`;
  ov.style.setProperty('--rc', r === 'ultra' ? '#ffd37a' : lootColor({ type, item }));
  ov.innerHTML = `
    <div class="co-rays"></div>
    <div class="fg-stage">
      <span class="fg-glow"></span>
      <span class="fg-item">${lootPic({ type, item })}</span>
      <span class="fg-anvil">${ico('anvil')}</span>
      <span class="fg-hammer"><span>${ico('hammer')}</span></span>
    </div>
    <div class="fg-lv"><span class="from">${up.from}</span><span class="arrow">→</span><span class="to">${L}</span></div>
    <div class="co-loot">
      <div class="co-title">${up.crit ? `${tr('Критическая ковка!')} ` : ''}${tr('Уровень {0}!', L)}</div>
      <div class="co-cards">
        <div class="co-card item" style="--cc:${lootColor({ type, item })}">
          <b>${escH(item.name)}</b>
          ${lvPips(L, itemMax(type))}
          <small class="art-eff">${escH(itemEffect(type, item, L))}</small>
        </div>
      </div>
      <button class="btn primary big" data-co="close">${tr('Отлично')}</button>
    </div>`;
  document.body.appendChild(ov);
  const it = ov.querySelector('.fg-item');
  requestAnimationFrame(() => ov.classList.add('forging'));
  [420, 840, 1260].forEach((t, i) => setTimeout(() => {
    Sound.tick();
    vibrate(20 + i * 15);
    FX.burstAt(it, { count: 10 + i * 5, spread: 70 + i * 20, kind: 'stroke', colors: ['#fff1b8', '#ffc83d', '#ff8a3d'], ms: 500 });
    FX.pulse(it, 'fx-pop', 300);
  }, t));
  setTimeout(() => {
    ov.classList.add('open', 'loot');
    Sound.achievement();
    vibrate([0, 60, 30, 110]);
    FX.burstAt(it, { count: 40, spread: 200, kind: 'confetti', ms: 1300 });
  }, 1650);
  let closed = false;
  ov.addEventListener('click', e => {
    if (closed || !ov.classList.contains('loot')) return;
    if (!e.target.closest('[data-co="close"]') && e.target.closest('.co-loot')) return;
    closed = true;
    ov.classList.add('closing');
    setTimeout(() => ov.remove(), 260);
    done();
  });
}

function avatarPreview(d, f) {
  const p = profileData(d);
  const face = p.avatar ? ico(p.avatar) : escH(profileName().slice(0, 1).toUpperCase());
  return `<span class="pf-avatar sm ${frameCls(f)}" style="--pc:${profileColor()};${f ? frameStyle(f) : ''}"><span class="pf-face">${face}</span></span>`;
}

async function editNick() {
  const name = await Dialog.prompt({ icon: 'font', title: tr('Ник'), value: profileName(), placeholder: tr('Как тебя зовут?'), maxLength: 20, ok: tr('Сохранить') });
  if (!name) return;
  const pr = profiles.list.find(x => x.id === profiles.active);
  if (pr) pr.name = name.slice(0, 20);
  saveProfiles();
  renderProfile();
}

// Действия профиля; возвращает true, если действие обработано
function profileAction(action, el) {
  const p = profileData(data);
  switch (action) {
    case 'pf-nick': editNick(); return true;
    case 'pf-avatar': p.avatar = el.dataset.v || null; break;
    case 'pf-color': {
      const pr = profiles.list.find(x => x.id === profiles.active);
      if (pr) { pr.color = el.dataset.v; saveProfiles(); }
      break;
    }
    case 'pf-pos': p.pos = el.dataset.v; break;
    case 'pf-crown': {
      const c = CROWNS.find(x => x.id === el.dataset.v);
      if (!c) return true;
      if (!c.req(data)) { toast(c.hint); FX.pulse(el, 'fx-wiggle', 500); return true; }
      const was = p.crown;
      p.crown = c.id;
      if (was !== c.id && c.id !== 'none') crownWearFx = true;
      break;
    }
    case 'pf-frame': {
      const f = FRAMES.find(z => z.id === el.dataset.v);
      if (f && !ownsFrame(data, f.id)) { toast(tr('Эту рамку можно найти в сундуке')); return true; }
      p.frame = f ? f.id : null;
      break;
    }
    case 'pf-art': {
      const id = el.dataset.v;
      if (!artLevelOwned(data, id)) { toast(tr('Этот артефакт можно найти в сундуке')); return true; }
      if (p.arts.includes(id)) p.arts = p.arts.filter(z => z !== id);
      else if (p.arts.length >= artSlots(data)) { toast(tr('Все слоты заняты — сними другой артефакт')); return true; }
      else p.arts.push(id);
      break;
    }
    case 'pf-craft': {
      const x = partList(data).find(z => z.type === el.dataset.type && z.item.id === el.dataset.v);
      if (!x) return true;
      if (x.have < x.need) { toast(tr('Нужно ещё {0} из {1} частей', x.need - x.have, x.need)); FX.pulse(el, 'fx-wiggle', 500); return true; }
      const loot = craftPart(data, x.type, x.item.id);
      if (!loot) return true;
      saveData();
      craftReveal(loot, () => { if (currentView === 'profile') renderProfile(); renderLevelChip(); });
      return true;
    }
    case 'forge-tab': forgeTab = el.dataset.v; renderForge(); return true;
    case 'forge-up': {
      const type = el.dataset.type;
      const item = LOOT_LISTS[type]?.find(x => x.id === el.dataset.v);
      if (!item) return true;
      const st = upState(data, type, item);
      if (!st.ready) {
        const miss = [];
        if (st.copies < st.cost.copies) miss.push(tr('копий: ещё {0}', st.cost.copies - st.copies));
        if (st.coins < st.cost.coins) miss.push(tr('монет: ещё {0}', fmtNum(st.cost.coins - st.coins)));
        toast(`${tr('Не хватает')} ${miss.join(', ')}`);
        FX.pulse(el.closest('.forge-card') || el, 'fx-wiggle', 500);
        return true;
      }
      const up = upgradeItem(data, type, item);
      saveData();
      forgeReveal(type, item, up, () => { if (currentView === 'forge') renderForge(); });
      return true;
    }
    case 'pf-social': editSocial(el.dataset.net); return true;
    case 'pf-open': openSocial(el.dataset.net); return true;
    default: return false;
  }
  saveData();
  if (currentView === 'profile') renderProfile();
  const hero = document.querySelector('.pf-hero .pf-avatar');
  if (hero) FX.pulse(hero, 'fx-pop', 500);
  if (crownWearFx) { crownWearFx = false; crownOnFx(); }
  return true;
}

// Корона надевается: падает сверху, подпрыгивает и рассыпает искры
let crownWearFx = false;
function crownOnFx() {
  const crown = document.querySelector('.pf-hero .pf-crown') || document.querySelector('.pf-avatar .pf-crown');
  if (!crown) return;
  crown.classList.remove('crown-drop');
  void crown.offsetWidth; // перезапуск анимации
  crown.classList.add('crown-drop');
  Sound.record();
  vibrate([0, 20, 50, 30]);
  setTimeout(() => {
    FX.burstAt(crown, { count: 18, spread: 110, kind: 'stroke', colors: ['#fff1b8', '#ffc83d', '#ff8a3d'], ms: 650 });
    const opt = document.querySelector('.crown-opt.on .crown-pic');
    if (opt) FX.pulse(opt, 'fx-pop', 500);
  }, 330);
  setTimeout(() => crown.classList.remove('crown-drop'), 1100);
}
