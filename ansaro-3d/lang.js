// Языки сайта: английский по умолчанию, русский по кнопке RU (или ?lang=ru). Выбор запоминается.
const saved = (() => { try { return localStorage.getItem('ansaro-lang'); } catch (e) { return null; } })();
const q = location.search.match(/[?&]lang=(en|ru)/);
export const LANG = q ? q[1] : (saved === 'ru' || saved === 'en' ? saved : 'en');
export const EN = LANG === 'en';

export function setLang(l) {
  try { localStorage.setItem('ansaro-lang', l); } catch (e) {}
  const u = new URL(location.href); u.searchParams.delete('lang');
  location.replace(u.pathname + u.search + u.hash);
}

/* ---------- тексты интерфейса ---------- */
const UI = {
  title: ['Ansaro — 3D models for Roblox', 'Ansaro — 3D-модели для Roblox'],
  eyebrow: ['Roblox development studio', 'Студия разработки для Roblox'],
  developer: ['Developer', 'Разработчик'],
  clientsTitle: ['Our clients', 'Наши клиенты'],
  clients: ['Clients', 'Клиенты'],
  order: ['Order', 'Заказ'],
  review: ['Review', 'Отзыв'],
  catalog: ['Catalog', 'Каталог'],
  reviewSoon: ['The review will appear here soon.', 'Отзыв скоро появится здесь.'],
  orderTotal: ['order', 'заказ'],
  tagline: ['3D models for Roblox', '3D-модели для Roblox'],
  lead: ['3D models, maps and scripts for Roblox games. Below are our clients: open an order, read the review and browse every model in live 3D.',
         '3D-модели, карты и скрипты для игр Roblox. Ниже наши клиенты: открой заказ, почитай отзыв и посмотри каждую модель в живом 3D.'],
  ctaPrice: ['Order a model · from $10', 'Заказать модель · от $10'],
  ctaOrders: ['Order catalog', 'Каталог заказов'],
  freeTest: ['Free mini test before you pay', 'Бесплатный мини-тест до оплаты'],
  brandSub: ['3D showcase', '3D-презентация'],
  cats: ['Categories', 'Категории'],
  renders: ['Renders', 'Рендеры'],
  orders: ['Orders', 'Заказы'],
  pricing: ['Pricing', 'Цены'],
  full: ['Fullscreen', 'Во весь экран'],
  autoplay: ['Autoplay', 'Автопоказ'],
  spin: ['Rotate', 'Вращение'],
  hint: ['Drag to rotate · scroll to zoom · ← → to browse', 'Крути мышкой или пальцем · колесо — приблизить · ← → — листать'],
  all: ['All', 'Все'],
  soon: ['soon', 'скоро'],
  close: ['Close', 'Закрыть'],
  back: ['Back', 'Назад'],
  // каталог заказов
  ordTitle: ['Order catalog', 'Каталог заказов'],
  ordLead: ['Orders and projects we have made. Open any of them to see what was ordered and look at its 3D models.',
            'Заказы и проекты, которые мы сделали. Открой любой, чтобы увидеть, что заказали, и посмотреть его 3D-модели.'],
  details: ['Details', 'Подробнее'],
  kind_client: ['Client order', 'Заказ клиента'],
  kind_studio: ['Studio project', 'Проект студии'],
  kind_pack: ['Model pack', 'Набор моделей'],
  st_done: ['Done', 'Готово'],
  st_work: ['In progress', 'В работе'],
  ordered: ['What was ordered', 'Что заказали'],
  models3d: ['3D models', '3D-модели'],
  view3d: ['View in 3D', 'Смотреть в 3D'],
  rendersOnly: ['Renders only', 'Только рендеры'],
  watermark: ['Client work: renders carry the ANSARO watermark, the model files belong to the client.',
              'Работа для клиента: рендеры с водяным знаком ANSARO, файлы модели принадлежат клиенту.'],
  fTotal: ['Order total', 'Сумма заказа'],
  fType: ['Type', 'Тип'], fCount: ['Models', 'Моделей'], fStatus: ['Status', 'Статус'], fFormat: ['Delivered as', 'Формат'],
  orderSame: ['Order something similar', 'Заказать похожее'],
  // цены
  prTitle: ['Pricing', 'Цены'],
  prLead: ['Cheap and fast. You see renders before paying, and you can start with a free mini test.',
           'Дёшево и быстро. Рендеры видно до оплаты, можно начать с бесплатного мини-теста.'],
  prNote: ['Bulk orders get a discount. Not sure what it costs? Just message us, we answer within a few hours.',
           'На большие заказы скидка. Не знаешь, сколько выйдет? Просто напиши, отвечаем в течение пары часов.'],
  howTitle: ['How it works', 'Как это работает'],
  pay: ['Payment', 'Оплата'],
  contact: ['Contact', 'Связаться'],
  copy: ['Copy', 'Скопировать'],
  copied: ['Copied', 'Скопировано'],
  foot: ['3D models for Roblox · Ansaro', 'Сайт-презентация 3D-моделей · Ansaro'],
};
export const t = k => (UI[k] ? UI[k][EN ? 0 : 1] : k);
// выбор по паре { en, ru } или строке
export const tr = v => (v && typeof v === 'object' ? (EN ? v.en : v.ru) : v);

export const PRICES = [
  { name: { en: 'Simple prop or item', ru: 'Простой предмет' }, note: { en: 'Weapons, tools, food, furniture, decor', ru: 'Оружие, инструменты, еда, мебель, декор' }, price: { en: 'from $10', ru: 'от $10' }, robux: '500 R$' },
  { name: { en: 'Detailed or animated model', ru: 'Детальная или анимированная модель' }, note: { en: 'Pet eggs with stand, effects and script, potions, chests', ru: 'Яйца питомцев с подставкой, эффектами и скриптом, зелья, сундуки' }, price: { en: 'from $14', ru: 'от $14' }, robux: '700 R$' },
  { name: { en: 'Building, vehicle or map zone', ru: 'Здание, транспорт или зона карты' }, note: { en: 'Houses, cars, planes, gym or lobby zones', ru: 'Дома, машины, самолёты, зоны спортзала или лобби' }, price: { en: 'from $28', ru: 'от $28' }, robux: '1 400 R$' },
];
export const STEPS = [
  { en: 'Send what you need: a description, references or a sketch.', ru: 'Пришли, что нужно: описание, референсы или набросок.' },
  { en: 'We agree on the price. A small free test piece is possible.', ru: 'Договариваемся о цене. Можно маленький бесплатный тест.' },
  { en: 'We send progress renders and fix what you want changed.', ru: 'Присылаем рендеры по ходу работы и правим, что скажешь.' },
  { en: 'You pay, we send the files: FBX/OBJ or ready in Roblox Studio.', ru: 'Ты платишь, мы отдаём файлы: FBX/OBJ или готовое в Roblox Studio.' },
];
export const PAYMENT = { en: 'USD (PayPal) or Robux (gamepass or group payout). Files are sent after payment.', ru: 'USD (PayPal) или Robux (геймпасс или выплата из группы). Файлы отдаём после оплаты.' };
export const CONTACTS = [
  { k: 'Discord', v: 'nochevvsky', copy: true },
  { k: 'Telegram', v: '@VoxyG', href: 'https://t.me/VoxyG' },
];

/* ---------- данные моделей на английском ---------- */
const COL_EN = { dm_eggs: 'Eggs + Halloween', dm_dumbbells: 'Dumbbells', dm_gym: 'Gym zones', dm_catapults: 'Catapults', legendary: 'Legendary eggs', elemental: 'Elemental eggs', nature: 'Nature eggs', wonder: 'Wonder eggs', potions: 'Potions', props: 'Treasures', japan: 'Sakura location' };
const CAT_EN = {
  eggs: ['Pet eggs', 'Stands, animations, effects'], potions: ['Potions', 'Liquid, bubbles, effects'],
  transport: ['Vehicles', 'Cars, boats, planes'], props: ['Treasures & items', 'Chests, altars, decor'],
  world: ['Buildings & environment', 'Gates, bridges, trees, houses'],
};
const RARITY_EN = { 'Обычное': 'Common', 'Редкое': 'Rare', 'Эпическое': 'Epic', 'Легендарное': 'Legendary', 'Мифическое': 'Mythic', 'Секретное': 'Secret', 'Ивент': 'Event', 'Для портфолио': 'Showcase' };
const EFFECT_EN = { 'лечение': 'healing', 'скорость': 'speed', 'высокий прыжок': 'high jump', 'невидимость': 'invisibility', 'случайный': 'random',
  'событие для вашего кода (монеты)': 'event for your own code (coins)', 'событие для вашего кода (опыт)': 'event for your own code (XP)' };
const DESC_EN = {
  seraphimegg: 'Flapping wings, spinning halo', dragonhoardegg: 'Bobbing on treasure, sparkling gems', infernalegg: 'Pulsing cracks, spinning rune circle',
  voidriftegg: 'Swirling portal, floating shards', royaldiamondegg: 'Shining facets, twinkling sparks', moltencoreegg: 'Rising embers, pulsing lava',
  frostbiteegg: 'Swirling snowflakes, glittering ice', thunderstormegg: 'Flickering lightning, drifting cloud', solarflareegg: 'Spinning crown of rays, glow',
  moonlightegg: 'Floating crescent, twinkling stars', coralreefegg: 'Swaying seaweed, rising bubbles', ancientdruidegg: 'Fireflies, pulsing runes',
  sakuraspiritegg: 'Falling petals, glowing lanterns', toxicwasteegg: 'Bubbling pool, glowing slime', rainbowdreamegg: 'Floating stars and sparkles',
  sugarrushegg: 'Bobbing with a sweet shine', cybercoreegg: 'Orbiting holo rings, flying pixels', clockworkegg: 'Ticking hands, turning gears',
  pharaohegg: 'Flickering torches, glowing scarab', wintergiftegg: 'Blinking garland, falling snow',
  treasurechest: 'Coins, a crown and scattered gems', crystalaltar: 'Clear crystals with inner glow',
};
const pretty = s => s.replace(/([a-z])([A-Z])/g, '$1 $2');
export const colName = (k, COLLECTIONS) => (EN ? COL_EN[k] : COLLECTIONS[k]) || k;
export const catText = c => (EN && CAT_EN[c.id] ? { name: CAT_EN[c.id][0], note: CAT_EN[c.id][1] } : { name: c.name, note: c.note });
export const modelName = m => (EN ? pretty(m.en || m.name) : m.name);
export const modelSub = m => (EN ? '' : (m.en ? pretty(m.en) : ''));
export const rarity = m => (EN ? (m.rarity_en || RARITY_EN[m.rarity] || m.rarity) : m.rarity);
export function modelDesc(m) {
  if (!EN) return m.desc || '';
  if (m.desc_en) return m.desc_en;
  if (DESC_EN[m.id]) return DESC_EN[m.id];
  const e = (m.desc || '').match(/^Эффект: (.+)$/);
  return e ? 'Effect: ' + (EFFECT_EN[e[1]] || e[1]) : (m.desc || '');
}
export const renderName = r => (EN ? r.en || r.name : r.name);
export function plural(n, forms) {
  if (EN) return n === 1 ? forms[0] : forms[1];
  const d = n % 10, h = n % 100;
  return d === 1 && h !== 11 ? forms[2] : d >= 2 && d <= 4 && (h < 12 || h > 14) ? forms[3] : forms[4];
}
export const nModels = n => n + ' ' + plural(n, ['model', 'models', 'модель', 'модели', 'моделей']);
