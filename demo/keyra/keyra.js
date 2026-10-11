/* Веб-демо Keyra. Повторяет экраны и логику Android-приложения по его исходникам:
   палитры, генератор паролей, оценка надёжности, аудит и коды 2FA считаются так же, как в приложении.
   Данные демонстрационные и лежат только в этом браузере (localStorage, ключ keyra-demo-v1). */
(function () {
  'use strict';
  const STR = window.KEYRA_STR, BD = window.KEYRA_BRANDS, WORDS = window.KEYRA_WORDS.split(' ');
  const DEMO = {
    ru: { pinHint: 'Демо: подойдут любые 4 цифры', na: 'В онлайн-демо недоступно. Работает в приложении' },
    uk: { pinHint: 'Демо: підійдуть будь-які 4 цифри', na: 'В онлайн-демо недоступно. Працює в застосунку' },
    en: { pinHint: 'Demo: any 4 digits will do', na: 'Not available in the online demo. Works in the app' },
  };
  const KEY = 'keyra-demo-v1', DAY = 864e5;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => 'e' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const ic = (name, size, color) => `<i class="mi" style="${size ? 'font-size:' + size + 'px;' : ''}${color ? 'color:' + color : ''}">${name}</i>`;

  /* ---------- состояние ---------- */
  const CATS = ['email', 'social', 'finance', 'work', 'shopping', 'games', 'other'];
  const CAT_ICON = { email: 'email', social: 'people', finance: 'account_balance', work: 'work', shopping: 'shopping_bag', games: 'sports_esports', other: 'category' };
  const CAT_STR = { email: 'catEmail', social: 'catSocial', finance: 'catFinance', work: 'catWork', shopping: 'catShopping', games: 'catGames', other: 'catOther' };
  const blank = o => Object.assign({ id: uid(), type: 'LOGIN', title: '', brand: '', username: '', password: '', totp: '', cardNumber: '', cardHolder: '', cardExpiry: '', cardCvv: '', cardPin: '',
    note: '', category: 'other', favorite: false, createdAt: Date.now(), updatedAt: Date.now(), passwordChangedAt: Date.now(), usedCount: 0, history: [], deletedAt: null }, o);
  function seed() {
    const n = Date.now(), at = d => ({ createdAt: n - d * DAY, updatedAt: n - d * DAY + 36e5, passwordChangedAt: n - d * DAY });
    return [
      blank({ title: 'Gmail', brand: 'gmail', username: 'alex.demo@gmail.com', password: 'v7#Kq2!mZp9@Lx4$', category: 'email', favorite: true, usedCount: 9, ...at(21) }),
      blank({ title: 'Discord', brand: 'discord', username: 'alex#0420', password: 'Tg5&nW8*rB1^yU3!', category: 'social', favorite: true, usedCount: 6, ...at(14) }),
      blank({ title: 'Instagram', brand: 'instagram', username: 'alex.demo', password: 'pL9$dF2@hJ6!kS4%', category: 'social', usedCount: 4, ...at(40) }),
      blank({ title: 'Steam', brand: 'steam', username: 'alex_gamer', password: 'Qz3!xC7#vB5$nM1&', category: 'games', usedCount: 3, ...at(9) }),
      blank({ title: 'GitHub', brand: 'github', username: 'alexdemo', password: 'wE8@rT4%yU2^iO6*', totp: 'JBSWY3DPEHPK3PXP', category: 'work', usedCount: 2, ...at(3) }),
      blank({ type: 'CARD', title: 'Demo Card', cardNumber: '4111 1111 1111 1111', cardHolder: 'Alex Demo', cardExpiry: '12/29', cardCvv: '123', category: 'finance', ...at(5) }),
    ];
  }
  const urlLang = (new URLSearchParams(location.search).get('lang') || '').toLowerCase();
  const sysLang = () => { const l = (navigator.language || 'en').slice(0, 2).toLowerCase(); return l === 'ru' ? 'ru' : l === 'uk' ? 'uk' : 'en'; };
  let store;
  try { store = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!store || !Array.isArray(store.entries)) store = { entries: seed(), settings: {}, gen: {} };
  const settings = Object.assign({ theme: 'DARK', lang: '', langSet: false, accent: 'VIOLET', sort: 'NAME', haptics: true }, store.settings);
  if (!settings.langSet) settings.lang = STR[urlLang] ? urlLang : (settings.lang || sysLang());
  let entries = store.entries;
  let gen = Object.assign({ passphrase: false, length: 20, upper: true, lower: true, digits: true, symbols: true, noAmbiguous: false, words: 5, separator: '-', capitalize: true, addNumber: true }, store.gen);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ entries, settings, gen })); } catch (e) {} };
  // корзина хранит записи 30 дней
  entries = entries.filter(e => !e.deletedAt || Date.now() - e.deletedAt < 30 * DAY);

  const ui = { lock: 'splash', pin: '', tab: 0, stack: [], query: '', filter: 'all', sortOpen: false, addOpen: false, dialog: null, genPw: '', open: {} };
  let S = STR[settings.lang] || STR.en;
  const D = () => DEMO[settings.lang] || DEMO.en;
  const fmt = (tpl, v) => tpl.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

  /* ---------- тема ---------- */
  const ACCENTS = {
    VIOLET: ['#9B6BFF', '#3B82F6', '#22B4F2', '#7C4DFF'], OCEAN: ['#38BDF8', '#6366F1', '#8B5CF6', '#0EA5E9'], EMERALD: ['#10B981', '#06B6D4', '#3B82F6', '#059669'],
    SUNSET: ['#FF6B6B', '#F59E0B', '#EC4899', '#F2545B'], ROSE: ['#EC4899', '#A855F7', '#6366F1', '#DB2777'], GOLD: ['#E8B64C', '#C8862A', '#8A5A1C', '#C08A1E'],
  };
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgba = (h, a) => `rgba(${rgb(h).join(',')},${a})`;
  const mix = (h1, h2, t) => '#' + rgb(h1).map((v, i) => Math.round(v + (rgb(h2)[i] - v) * t).toString(16).padStart(2, '0')).join('');
  const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  let P = {};
  function applyTheme() {
    const dark = settings.theme === 'DARK' || (settings.theme === 'SYSTEM' && matchMedia('(prefers-color-scheme: dark)').matches);
    const c = ACCENTS[settings.accent] || ACCENTS.VIOLET;
    P = dark
      ? { dark, bg: '#07070F', sheet: '#17172B', glass: 'rgba(255,255,255,.06)', glassHi: 'rgba(255,255,255,.13)', stroke: 'rgba(255,255,255,.26)', strokeLo: 'rgba(255,255,255,.06)',
        text: '#F5F4FF', dim: '#ABAAC8', faint: '#6E6D8C', a: c[0], b: c[1], c: c[2], danger: '#FF5C7A', success: '#34D399', warning: '#FBBF24',
        blob: [.5, .45, .32], sheen: 'rgba(255,255,255,.08)', strokeField: 'rgba(255,255,255,.143)', strokePill: 'rgba(255,255,255,.156)', barBg: 'rgba(23,23,43,.86)', barStroke: 'rgba(255,255,255,.042)', scrim: 'rgba(7,7,15,.78)' }
      : { dark, bg: '#EFEEFB', sheet: '#FFFFFF', glass: 'rgba(255,255,255,.55)', glassHi: 'rgba(255,255,255,.85)', stroke: '#FFFFFF', strokeLo: 'rgba(255,255,255,.5)',
        text: '#15142E', dim: '#5C5B7A', faint: '#9897B4', a: c[3], b: c[1], c: c[2], danger: '#E5395B', success: '#0FA873', warning: '#D97706',
        blob: [.42, .38, .28], sheen: 'rgba(255,255,255,.4)', strokeField: 'rgba(255,255,255,.55)', strokePill: 'rgba(255,255,255,.6)', barBg: 'rgba(255,255,255,.94)', barStroke: '#FFFFFF', scrim: 'rgba(239,238,251,.78)' };
    const st = document.documentElement.style;
    for (const k of ['bg', 'sheet', 'glass', 'glassHi', 'stroke', 'strokeLo', 'text', 'dim', 'faint', 'a', 'b', 'c', 'danger', 'success', 'warning', 'sheen', 'strokeField', 'strokePill', 'barBg', 'barStroke', 'scrim']) st.setProperty('--' + k, P[k]);
    st.setProperty('--a16', rgba(P.a, .16));
    [c[0], c[1], c[2]].forEach((col, i) => st.setProperty('--blob' + (i + 1), rgba(col, P.blob[i])));
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    const m = $('meta[name=theme-color]'); if (m) m.content = P.bg;
  }

  /* ---------- каталог сервисов ---------- */
  const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const MULTI = {
    google: ['0 0 48 48', [['#EA4335', 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'], ['#4285F4', 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'], ['#FBBC05', 'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'], ['#34A853', 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z']]],
    gmail: ['52 42 88 66', [['#4285F4', 'M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6'], ['#34A853', 'M120 108h14c3.32 0 6-2.69 6-6V59l-20 15'], ['#FBBC04', 'M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2'], ['#EA4335', 'M72 74V48l24 18 24-18v26L96 92'], ['#C5221F', 'M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2']]],
    microsoft: ['0 0 23 23', [['#F25022', 'M1 1h10v10H1z'], ['#7FBA00', 'M12 1h10v10H12z'], ['#00A4EF', 'M1 12h10v10H1z'], ['#FFB900', 'M12 12h10v10H12z']]],
  };
  const Brands = { all: [], popular: [], bySlug: {}, byName: {}, cache: {}, full: false };
  function buildBrands(rows) {
    const list = rows.map(r => ({ s: r.s, t: r.t, c: '#' + r.c, a: (r.a || []).concat(BD.aliases[r.s] || []), p: r.p, k: BD.cats[r.s] || '' }));
    const slugs = new Set(list.map(b => b.s));
    for (const e of BD.extra) if (!slugs.has(e.s)) list.push({ s: e.s, t: e.t, c: '#' + e.c, a: e.a, m: e.m, k: e.k });
    list.sort((x, y) => (x.t.toLowerCase() < y.t.toLowerCase() ? -1 : x.t.toLowerCase() > y.t.toLowerCase() ? 1 : 0));
    const bySlug = {}, byName = {};
    for (const b of list) bySlug[b.s] = b;
    for (const b of list) for (const a of b.a) byName[norm(a)] = b;
    for (const b of list) byName[norm(b.s)] = b;
    for (const b of list) byName[norm(b.t)] = b;
    delete byName[''];
    Object.assign(Brands, { all: list, bySlug, byName, cache: {}, popular: BD.popular.map(s => bySlug[s]).filter(Boolean) });
  }
  buildBrands(BD.seed);
  function loadAllBrands() {
    if (Brands.full || Brands.loading) return;
    Brands.loading = true;
    fetch('brands.tsv').then(r => (r.ok ? r.text() : Promise.reject())).then(txt => {
      const rows = [];
      for (const line of txt.split('\n')) { const f = line.split('\t'); if (f.length >= 5) rows.push({ s: f[0], t: f[1], c: f[2].toUpperCase(), a: f[3] ? f[3].split('|') : [], p: f[4] }); }
      buildBrands(rows); Brands.full = true;
      const r = route();
      if (r && r.picker) renderPickerList(); else if (ui.lock === 'open') render(true);
    }).catch(() => { Brands.loading = false; });
  }
  function matchBrand(title) {
    const key = norm(title);
    if (key.length < 2 && key !== 'x') return null;
    if (key in Brands.cache) return Brands.cache[key];
    let found = Brands.byName[key];
    if (!found) { const w = title.toLowerCase().split(/[^\p{L}\p{N}]+/u).find(x => x.length >= 3); if (w) found = Brands.byName[w]; }
    if (!found && key.length >= 5) { let best = ''; for (const n in Brands.byName) if (n.length >= 4 && n.length > best.length && key.startsWith(n)) best = n; if (best) found = Brands.byName[best]; }
    return (Brands.cache[key] = found || null);
  }
  const resolveBrand = e => (e.type !== 'LOGIN' ? null : e.brand ? Brands.bySlug[e.brand] || null : matchBrand(e.title));
  function searchBrands(q) {
    q = norm(q);
    if (!q) return Brands.all;
    const starts = [], has = [];
    for (const b of Brands.all) { const t = norm(b.t); if (t.startsWith(q)) starts.push(b); else if (t.includes(q) || b.a.some(a => norm(a).includes(q))) has.push(b); }
    return starts.concat(has);
  }
  function brandAvatar(b, size) {
    const multi = MULTI[b.s], bg = multi ? '#FFFFFF' : b.c, fg = lum(bg) > 0.55 ? '#15142E' : '#FFFFFF';
    const box = `width:${size}px;height:${size}px;border-radius:${size * .32}px;background:${bg};border:1px solid ${P.dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.06)'};color:${fg}`;
    let inner;
    if (multi) { const s = size * .58; inner = `<svg width="${s}" height="${s}" viewBox="${multi[0]}">${multi[1].map(l => `<path fill="${l[0]}" d="${l[1]}"/>`).join('')}</svg>`; }
    else if (b.p) { const s = size * .54; inner = `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path fill="${fg}" d="${b.p}"/></svg>`; }
    else { const t = b.m || b.t.slice(0, 1).toUpperCase(); inner = `<span style="font-size:${size * (t.length > 2 ? .26 : t.length === 2 ? .36 : .44)}px">${esc(t)}</span>`; }
    return `<div class="av" style="${box}">${inner}</div>`;
  }
  const GRADS = [['#9B6BFF', '#3B82F6'], ['#FF6B9D', '#FF8E53'], ['#34D399', '#06B6D4'], ['#FBBF24', '#F97316'], ['#60A5FA', '#22D3EE'], ['#F472B6', '#A855F7'], ['#4ADE80', '#16A34A'], ['#FB7185', '#E11D48']];
  const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h; };
  const gradFor = seedStr => GRADS[Math.abs(hash(seedStr) % GRADS.length)];
  function avatar(e, size) {
    const b = resolveBrand(e);
    if (b) return brandAvatar(b, size);
    const g = gradFor(e.title || e.id);
    const inner = e.type === 'LOGIN' ? `<span style="font-size:${size * .42}px;font-weight:700">${esc((e.title.trim()[0] || '?').toUpperCase())}</span>` : ic(e.type === 'CARD' ? 'credit_card' : 'sticky_note_2', size * .5);
    return `<div class="av" style="width:${size}px;height:${size}px;border-radius:${size * .32}px;background:linear-gradient(135deg,${g[0]},${g[1]});color:#fff">${inner}</div>`;
  }

  /* ---------- пароли: генератор, надёжность, аудит (как в приложении) ---------- */
  const rnd = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  function generate(o) {
    if (o.passphrase) {
      const w = Array.from({ length: o.words }, () => { const x = WORDS[rnd(WORDS.length)]; return o.capitalize ? x[0].toUpperCase() + x.slice(1) : x; });
      if (o.addNumber) { const i = rnd(w.length); w[i] += 10 + rnd(90); }
      return w.join(o.separator);
    }
    let sets = [];
    if (o.upper) sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    if (o.lower) sets.push('abcdefghijklmnopqrstuvwxyz');
    if (o.digits) sets.push('0123456789');
    if (o.symbols) sets.push('!@#$%^&*()-_=+[]{};:,.?/');
    if (!sets.length) sets = ['abcdefghijklmnopqrstuvwxyz'];
    if (o.noAmbiguous) sets = sets.map(s => [...s].filter(c => !'O0oIl1|'.includes(c)).join(''));
    const all = sets.join(''), chars = Array.from({ length: o.length }, () => all[rnd(all.length)]);
    const idx = chars.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = rnd(i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    sets.forEach((s, i) => { if (idx[i] !== undefined) chars[idx[i]] = s[rnd(s.length)]; });
    return chars.join('');
  }
  const COMMON = new Set(['password', '123456', '12345678', '123456789', '1234567890', 'qwerty', 'qwerty123', '111111', '000000', 'abc123', 'password1', 'iloveyou', 'admin', 'letmein', 'welcome', 'monkey', 'dragon', '1q2w3e4r', 'qazwsx', 'пароль', 'йцукен', 'привет', '123123', '654321', '1234', '12345', 'zxcvbnm', 'asdfgh']);
  function bits(pw) {
    if (!pw) return 0;
    if (COMMON.has(pw.toLowerCase())) return 5;
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/\p{Nd}/u.test(pw)) pool += 10;
    if (/[^\p{L}\p{N}]/u.test(pw)) pool += 30;
    if (/[^\P{L}a-zA-Z]/u.test(pw)) pool += 33;
    let eff = 0;
    for (let i = 0; i < pw.length; i++) { const d = i > 0 ? pw.charCodeAt(i) - pw.charCodeAt(i - 1) : 9; eff += i > 0 && (d === 0 || d === 1 || d === -1) ? 0.3 : 1; }
    return eff * Math.log2(Math.max(pool, 2)) * (0.5 + 0.5 * new Set(pw).size / pw.length);
  }
  const score = pw => { const b = bits(pw); return b < 28 ? 0 : b < 42 ? 1 : b < 60 ? 2 : b < 80 ? 3 : 4; };
  const strengthColor = sc => [P.danger, mix(P.danger, P.warning, .6), P.warning, mix(P.warning, P.success, .7), P.success][sc];
  function meter(pw, id) {
    const sc = pw ? score(pw) : -1, col = sc < 0 ? P.faint : strengthColor(sc);
    return `<div class="meter"${id ? ` id="${id}"` : ''}><div><i style="width:${sc < 0 ? 0 : (sc + 1) * 20}%;background:${col}"></i></div><span style="color:${col}">${sc < 0 ? '—' : S.strengthLabels[sc]}</span></div>`;
  }
  function audit(list) {
    const logins = list.filter(e => e.type === 'LOGIN' && !e.deletedAt && e.password);
    const weak = logins.filter(e => score(e.password) <= 1);
    const groups = {}; logins.forEach(e => (groups[e.password] = groups[e.password] || []).push(e));
    const reused = Object.values(groups).filter(g => g.length > 1).flat();
    const old = logins.filter(e => Date.now() - e.passwordChangedAt > 180 * DAY);
    if (!logins.length) return { total: 0, score: 100, weak, reused, old };
    const w = new Set(weak.map(e => e.id)), r = new Set(reused.map(e => e.id)), o = new Set(old.map(e => e.id));
    const pen = logins.reduce((s, e) => s + (w.has(e.id) ? 1 : r.has(e.id) ? .7 : o.has(e.id) ? .3 : 0), 0);
    return { total: logins.length, score: Math.min(100, Math.max(0, Math.round(100 * (1 - pen / logins.length)))), weak, reused, old };
  }

  /* ---------- коды 2FA (TOTP, HMAC-SHA1) ---------- */
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  function totpNormalize(input) {
    let raw = input.trim();
    if (/^otpauth:\/\//i.test(raw)) { try { raw = new URL(raw).searchParams.get('secret') || ''; } catch (e) { return null; } if (!raw) return null; }
    const clean = raw.toUpperCase().replace(/[ \-=]/g, '');
    return clean.length < 8 || [...clean].some(c => !B32.includes(c)) ? null : clean;
  }
  async function totpCode(secret, sec) {
    const s = totpNormalize(secret); if (!s || !crypto.subtle) return null;
    const out = []; let buf = 0, n = 0;
    for (const c of s) { buf = (buf << 5) | B32.indexOf(c); n += 5; if (n >= 8) { n -= 8; out.push((buf >> n) & 255); buf &= (1 << n) - 1; } }
    const msg = new Uint8Array(8); let cnt = Math.floor(sec / 30);
    for (let i = 7; i >= 0; i--) { msg[i] = cnt & 255; cnt = Math.floor(cnt / 256); }
    const key = await crypto.subtle.importKey('raw', new Uint8Array(out), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg)), o = h[19] & 15;
    return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
  }

  /* ---------- мелочи ---------- */
  const haptic = () => { try { if (settings.haptics && navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(8); } catch (e) {} };
  let toastTimer = 0;
  function toast(msg, err) {
    const box = $('#toast');
    box.innerHTML = `<div class="${err ? 'err' : ''}">${ic(err ? 'error_outline' : 'check_circle')}<span>${esc(msg)}</span></div>`;
    requestAnimationFrame(() => box.firstChild && box.firstChild.classList.add('show'));
    setTimeout(() => box.firstChild && box.firstChild.classList.add('show'), 60);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.firstChild && box.firstChild.classList.remove('show'), 2300);
  }
  function copy(value, msg) { try { navigator.clipboard.writeText(value).catch(() => {}); } catch (e) {} toast(msg); }
  const fmtDate = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  const subtitle = e => (e.type === 'LOGIN' ? e.username || '—' : e.type === 'CARD' ? (d => (d ? '•••• ' + d : S.typeCard))(e.cardNumber.replace(/\D/g, '').slice(-4)) : S.secureNote);
  const active = () => entries.filter(e => !e.deletedAt);
  const route = () => ui.stack[ui.stack.length - 1];
  const push = r => { ui.stack.push(r); ui.addOpen = ui.sortOpen = false; render(); };
  const pop = () => { ui.stack.pop(); render(); };
  const ib = (icon, act, o) => { o = o || {}; const sz = o.size || 44; return `<button class="ib${o.glass === false ? '' : ' glass'}" data-act="${act}"${o.arg ? ` data-arg="${esc(o.arg)}"` : ''} style="width:${sz}px;height:${sz}px${o.tint ? ';color:' + o.tint : ''}">${ic(icon, sz * .48)}</button>`; };
  const pill = (text, on, act, arg, icon) => `<button class="pill${on ? ' on' : ''}" data-act="${act}" data-arg="${esc(arg)}">${icon ? ic(icon) : ''}${esc(text)}</button>`;
  const seg = (id, opts, sel) => `<div class="seg glass" data-seg="${id}" style="--n:${opts.length};--s:${sel}"><i></i>${opts.map((o, i) => `<button class="${i === sel ? 'on' : ''}" data-act="seg" data-arg="${i}">${esc(o)}</button>`).join('')}</div>`;
  const sw = (id, on) => `<button class="sw${on ? ' on' : ''}" data-act="sw" data-arg="${id}"><i></i></button>`;
  const topBar = (title, acts) => `<div class="top">${ib('arrow_back', 'back')}<h2 class="ell">${esc(title)}</h2><div class="acts">${acts || ''}</div></div>`;
  const screenTitle = (title, sub, icon) => `<div class="title"><div class="badge" style="width:50px;height:50px;border-radius:17px">${ic(icon, 26)}</div><div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div></div>`;
  const emptyState = (icon, title, text) => `<div class="empty"><div class="big glass">${ic(icon)}</div><b style="font-size:20px">${esc(title)}</b><p class="dim" style="font-size:15px;line-height:21px;margin-top:6px">${esc(text)}</p></div>`;
  function entryRow(e, withCopy) {
    return `<div class="erow glass card row tap appear" data-act="open" data-arg="${e.id}">${avatar(e, 50)}<div class="grow"><div class="row" style="gap:6px"><b class="ell" style="font-size:16px;font-weight:600">${esc(e.title || '—')}</b>${e.favorite ? ic('star', 16, P.warning) : ''}</div>` +
      `<div class="ell dim" style="font-size:14px;margin-top:2px">${esc(subtitle(e))}</div></div>${withCopy && e.type === 'LOGIN' && e.password ? ib('content_copy', 'copyPw', { arg: e.id, size: 42, tint: P.a }) : ''}</div>`;
  }

  /* ---------- экраны ---------- */
  function vScreen() {
    const act = active(), a = audit(act), h = new Date().getHours();
    const greet = h >= 5 && h <= 11 ? S.greetMorning : h >= 12 && h <= 17 ? S.greetDay : h >= 18 && h <= 22 ? S.greetEvening : S.greetNight;
    const cnt = t => act.filter(e => e.type === t).length;
    const C = 2 * Math.PI * 34.5, hstat = (icon, n, label) => `<div class="hstat"><div class="row" style="gap:6px">${ic(icon, 16)}<b style="font-size:19px;font-weight:800">${n}</b></div><div class="ell" style="font-size:12px;opacity:.8">${esc(label)}</div></div>`;
    const usedCats = CATS.filter(c => act.some(e => e.category === c));
    return `<div class="scr tabs in" id="scr" style="gap:14px">
      <div class="row" style="gap:12px;padding:0 4px"><div class="badge" style="width:46px;height:46px;border-radius:16px">${ic('shield')}</div>
        <div class="grow"><div class="dim" style="font-size:13px">${esc(greet)}</div><div style="font-size:26px;font-weight:800;letter-spacing:-.5px;line-height:1.15">Keyra</div></div>${ib('delete_outline', 'trash')}</div>
      <div class="hero appear" data-act="tab" data-arg="2"><div class="row" style="gap:12px"><div class="grow"><div style="font-size:13px;font-weight:500;opacity:.8">${esc(S.heroTitle)}</div>
        <div style="font-size:23px;line-height:28px;font-weight:800;letter-spacing:-.3px;margin-top:4px">${esc(!act.length ? S.heroEmpty : a.score >= 85 ? S.scoreGreat : a.score >= 60 ? S.scoreOk : S.scoreBad)}</div></div>
        <div class="ring"><svg width="76" height="76"><circle cx="38" cy="38" r="34.5" stroke="rgba(255,255,255,.22)" stroke-width="7"/><circle class="prog" data-len="${act.length ? C * a.score / 100 : 0}" cx="38" cy="38" r="34.5" stroke="#fff" stroke-width="7" stroke-dasharray="0 ${C}"/></svg>
        <span>${act.length ? `<b style="font-size:24px;font-weight:800">${a.score}</b>` : ic('shield', 30)}</span></div></div>
        <div class="row" style="gap:8px;margin-top:18px">${hstat('key', cnt('LOGIN'), S.typeLogins)}${hstat('credit_card', cnt('CARD'), S.typeCards)}${hstat('sticky_note_2', cnt('NOTE'), S.typeNotes)}</div></div>
      <div class="row appear" style="--i:1;gap:10px"><div class="search glass row grow">${ic('search', 22, P.dim)}<input id="q" data-in="query" placeholder="${esc(S.search)}" value="${esc(ui.query)}" enterkeyhint="search" autocomplete="off"></div>${ib('sort', 'sortMenu', { size: 52 })}</div>
      ${act.length ? `<div class="pills appear" style="--i:2">${pill(S.all, ui.filter === 'all', 'filter', 'all')}${pill(S.favorites, ui.filter === 'fav', 'filter', 'fav', 'star')}${pill(S.typeLogins, ui.filter === 't:LOGIN', 'filter', 't:LOGIN', 'key')}${pill(S.typeCards, ui.filter === 't:CARD', 'filter', 't:CARD', 'credit_card')}${pill(S.typeNotes, ui.filter === 't:NOTE', 'filter', 't:NOTE', 'sticky_note_2')}${usedCats.map(c => pill(S[CAT_STR[c]], ui.filter === 'c:' + c, 'filter', 'c:' + c, CAT_ICON[c])).join('')}</div>` : ''}
      <div id="vlist" class="col" style="gap:14px">${vList()}</div></div>`;
  }
  function vList() {
    const act = active();
    if (!act.length) {
      const qa = (icon, label, type, g) => `<div class="qa glass tap" data-act="add" data-arg="${type}"><div class="badge" style="width:54px;height:54px;border-radius:18px;background:linear-gradient(135deg,${g[0]},${g[1]});box-shadow:0 6px 18px -4px ${g[0]}">${ic(icon, 26)}</div><b style="font-size:15px;font-weight:600;margin-top:12px">${esc(label)}</b><b style="font-size:18px;color:var(--a)">+</b></div>`;
      return `<div class="label">${esc(S.quickAdd)}</div><div class="row appear" style="--i:2;gap:10px;align-items:stretch">${qa('key', S.typeLogin, 'LOGIN', GRADS[0])}${qa('credit_card', S.typeCard, 'CARD', GRADS[1])}${qa('sticky_note_2', S.typeNote, 'NOTE', GRADS[2])}</div><p class="dim" style="font-size:14px;line-height:20px;text-align:center;padding:8px 24px">${esc(S.emptyVaultText)}</p>`;
    }
    const q = ui.query.trim().toLowerCase(), f = ui.filter;
    let vis = act.filter(e => f === 'all' || (f === 'fav' ? e.favorite : f.startsWith('t:') ? e.type === f.slice(2) : e.category === f.slice(2)))
      .filter(e => !q || e.title.toLowerCase().includes(q) || e.username.toLowerCase().includes(q) || e.cardHolder.toLowerCase().includes(q));
    const byName = (x, y) => (x.title.toLowerCase() < y.title.toLowerCase() ? -1 : x.title.toLowerCase() > y.title.toLowerCase() ? 1 : 0);
    vis.sort(settings.sort === 'NAME' ? byName : settings.sort === 'RECENT' ? (x, y) => y.updatedAt - x.updatedAt : (x, y) => y.usedCount - x.usedCount);
    if (!vis.length) return emptyState('search_off', S.nothingFound, S.nothingFoundText);
    const favs = act.filter(e => e.favorite).sort(byName);
    let html = '';
    if (!q && f === 'all' && favs.length) html += `<div class="label">${esc(S.favorites)}</div><div class="favs">${favs.map(e => `<div class="fav glass tap" data-act="open" data-arg="${e.id}">${avatar(e, 52)}<span class="ell">${esc(e.title)}</span></div>`).join('')}</div>`;
    html += `<div class="row"><div class="label grow">${esc(S.allEntries)}</div><b class="faint" style="font-size:13px;padding-right:6px">${vis.length}</b></div>`;
    return html + vis.map((e, i) => entryRow(e, true).replace('appear"', `appear" style="--i:${Math.min(i, 9)}"`)).join('');
  }
  const pwSpans = pw => [...pw].map(c => (/\p{Nd}/u.test(c) ? `<b>${esc(c)}</b>` : !/\p{L}/u.test(c) ? `<em>${esc(c)}</em>` : esc(c))).join('');
  function gScreen() {
    if (!ui.genPw) ui.genPw = generate(gen);
    return `<div class="scr tabs in" id="scr">${screenTitle(S.tabGenerator, S.generatorSub, 'auto_awesome')}
      <div class="genbox glass appear"><div class="genpw mono${ui.genPw.length > 28 ? ' small' : ''}" id="genpw"><span>${pwSpans(ui.genPw)}</span></div><div style="height:14px"></div>${meter(ui.genPw, 'genmeter')}<div style="height:16px"></div>
        <div class="row" style="gap:12px"><button class="gbtn grow" data-act="genCopy">${ic('content_copy')}${esc(S.copy)}</button>${ib('refresh', 'regen', { size: 56, tint: P.a })}</div></div>
      <div class="appear" style="--i:1">${seg('mode', [S.genPassword, S.genPassphrase], gen.passphrase ? 1 : 0)}</div>
      <div class="glass card appear" id="genopts" style="--i:2;padding:18px">${gOpts()}</div></div>`;
  }
  function gOpts() {
    const slider = (label, key, min, max) => `<div class="row"><span class="grow">${esc(label)}</span><b class="mono" id="sv-${key}" style="font-size:20px;color:var(--a)">${gen[key]}</b></div><input type="range" data-in="slider" data-key="${key}" min="${min}" max="${max}" value="${gen[key]}" style="--p:${(gen[key] - min) / (max - min) * 100}%">`;
    const tog = (label, hint, key) => `<div class="row" style="padding:2px 0;min-height:44px"><div class="grow"><div>${esc(label)}</div><div class="mono faint" style="font-size:12px">${esc(hint)}</div></div>${sw('g:' + key, gen[key])}</div>`;
    if (!gen.passphrase) return slider(S.length, 'length', 6, 64) + tog(S.uppercase, 'A-Z', 'upper') + tog(S.lowercase, 'a-z', 'lower') + tog(S.digits, '0-9', 'digits') + tog(S.symbols, '!@#', 'symbols') + tog(S.noAmbiguous, '0O 1l', 'noAmbiguous');
    return slider(S.words, 'words', 3, 8) + `<div style="padding:4px 0 8px">${esc(S.separator)}</div>` + seg('sep', ['-', '.', '_', S.space], Math.max(0, ['-', '.', '_', ' '].indexOf(gen.separator))) + '<div style="height:8px"></div>' + tog(S.capitalize, 'Word', 'capitalize') + tog(S.addNumber, '42', 'addNumber');
  }
  function aScreen() {
    const r = audit(entries);
    if (!r.total) return `<div class="scr tabs in" id="scr">${screenTitle(S.tabAudit, S.auditSub, 'verified_user')}<div style="height:40px"></div>${emptyState('verified_user', S.auditEmptyTitle, S.auditEmptyText)}</div>`;
    const C = 2 * Math.PI * 78, arc = C * .75;
    const issue = (i, key, icon, color, title, text, items) => {
      const ok = !items.length, col = ok ? P.success : color, open = ui.open[key] && !ok;
      return `<div class="glass fcard issue appear${ok ? '' : ' tap'}" style="--i:${i}"${ok ? '' : ` data-act="toggle" data-arg="${key}"`}><div class="row" style="gap:14px"><div style="width:46px;height:46px;border-radius:15px;display:grid;place-items:center;flex:none;background:${rgba(col, .18)}">${ic(ok ? 'verified_user' : icon, 24, col)}</div>
        <div class="grow"><b style="font-weight:600">${esc(title)}</b><div class="dim" style="font-size:13px;line-height:17px">${esc(text)}</div></div><b style="font-size:22px;font-weight:800;color:${col}">${items.length}</b>${ok ? '' : `<i class="mi dim" style="transform:rotate(${open ? 180 : 0}deg);transition:transform .25s">expand_more</i>`}</div>
        ${open ? `<div class="list">${items.map(e => entryRow(e, false)).join('')}</div>` : ''}</div>`;
    };
    return `<div class="scr tabs in" id="scr">${screenTitle(S.tabAudit, S.auditSub, 'verified_user')}
      <div class="audit appear"><div class="ring" style="width:170px;height:170px"><svg width="170" height="170" style="transform:rotate(135deg)"><circle cx="85" cy="85" r="78" stroke="rgba(255,255,255,.22)" stroke-width="14" stroke-dasharray="${arc} ${C}"/><circle class="prog" data-len="${arc * r.score / 100}" cx="85" cy="85" r="78" stroke="#fff" stroke-width="14" stroke-dasharray="0 ${C}"/></svg>
        <span><span class="col" style="align-items:center"><b style="font-size:52px;font-weight:800;line-height:1.1">${r.score}</b><span style="font-size:14px;opacity:.7">/ 100</span></span></span></div>
        <b style="font-size:20px;margin-top:18px">${esc(r.score >= 85 ? S.scoreGreat : r.score >= 60 ? S.scoreOk : S.scoreBad)}</b><span style="font-size:14px;opacity:.8">${esc(fmt(S.passwordsChecked, { n: r.total }))}</span></div>
      ${issue(1, 'weak', 'gpp_bad', P.danger, S.auditWeak, S.auditWeakText, r.weak)}${issue(2, 'reused', 'content_copy', P.warning, S.auditReused, S.auditReusedText, r.reused)}${issue(3, 'old', 'schedule', P.b, S.auditOld, S.auditOldText, r.old)}</div>`;
  }
  function sScreen() {
    const srow = (icon, title, sub, trail, act) => `<div class="srow${act ? ' tap2' : ''}"${act ? ` data-act="${act}"` : ''}><div class="ibadge">${ic(icon)}</div><div class="grow"><div>${esc(title)}</div>${sub ? `<div class="dim" style="font-size:13px;line-height:17px">${esc(sub)}</div>` : ''}</div>${trail}</div>`;
    const chev = ic('chevron_right', 24, P.faint);
    const sub = t => `<div style="padding-bottom:10px">${esc(t)}</div>`;
    return `<div class="scr tabs in" id="scr" style="gap:10px">${screenTitle(S.tabSettings, null, 'settings')}<div class="label">${esc(S.secAppearance)}</div>
      <div class="glass card appear">${sub(S.theme)}${seg('theme', [S.themeSystem, S.themeLight, S.themeDark], ['SYSTEM', 'LIGHT', 'DARK'].indexOf(settings.theme))}<div style="height:16px"></div>
        ${sub(S.accentColor)}<div class="swatches">${Object.keys(ACCENTS).map(k => `<button class="swatch${settings.accent === k ? ' on' : ''}" data-act="accent" data-arg="${k}"><span style="background:linear-gradient(135deg,${ACCENTS[k][0]},${ACCENTS[k][1]})">${ic('check')}</span></button>`).join('')}</div><div style="height:16px"></div>
        ${sub(S.language)}${seg('lang', ['Русский', 'Українська', 'English'], ['ru', 'uk', 'en'].indexOf(settings.lang))}<div style="height:8px"></div>${srow('vibration', S.haptics, '', sw('haptics', settings.haptics))}</div>
      <div class="label">${esc(S.secSecurity)}</div>
      <div class="glass card appear" style="--i:1">${srow('fingerprint', S.biometricUnlock, S.bioUnavailable, sw('bio', false))}${srow('pin', S.changePin, '', chev, 'na')}${srow('edit_note', S.autofill, S.autofillOff, chev, 'na')}${srow('logout', S.lockNow, '', chev, 'lock')}</div>
      <div class="label">${esc(S.secData)}</div>
      <div class="glass card appear" style="--i:2">${srow('upload', S.exportBackup, S.exportBackupSub, chev, 'na')}${srow('download', S.importBackup, S.importBackupSub, chev, 'na')}${srow('delete_outline', S.trash, '', chev, 'trash')}</div>
      <div class="label">${esc(S.secProtection)}</div>
      <div class="glass card appear" style="--i:3">${srow('key', S.infoEncryption, S.infoEncryptionSub, '')}${srow('timer', S.infoAutoLock, S.infoAutoLockSub, '')}${srow('content_paste', S.infoClipboard, S.infoClipboardSub, '')}${srow('screenshot', S.infoScreenshots, S.infoScreenshotsSub, '')}${srow('wifi_off', S.infoOffline, S.infoOfflineSub, '')}</div>
      <p class="faint" style="font-size:12px;text-align:center;padding-top:8px">Keyra 1.0.0</p></div>`;
  }
  function barHtml() {
    const tab = (i, icon) => `<button class="tab${ui.tab === i ? ' on' : ''}" data-act="tab" data-arg="${i}"><s>${ic(icon)}</s><u></u></button>`;
    const dial = [['NOTE', 'sticky_note_2', S.typeNote], ['CARD', 'credit_card', S.typeCard], ['LOGIN', 'key', S.typeLogin]];
    return (ui.addOpen ? `<div class="scrim" data-act="addToggle"></div><div class="dial">${dial.map((d, i) => `<button style="--i:${i}" data-act="add" data-arg="${d[0]}"><span>${ic(d[1])}</span>${esc(d[2])}</button>`).join('')}</div>` : '') +
      `<div class="bar"><div class="tabs">${tab(0, 'home')}${tab(1, 'auto_awesome')}<div style="width:78px;flex:none"></div>${tab(2, 'verified_user')}${tab(3, 'settings')}</div><button class="fab${ui.addOpen ? ' open' : ''}" data-act="addToggle"><span>${ic('add')}</span></button></div>` +
      (ui.sortOpen ? `<div style="position:absolute;inset:0;z-index:29" data-act="sortMenu"></div><div class="menu" style="top:${ui.sortTop || 300}px">${[['NAME', S.sortName], ['RECENT', S.sortRecent], ['USED', S.sortUsed]].map(m => `<button data-act="sort" data-arg="${m[0]}">${esc(m[1])}${settings.sort === m[0] ? ic('check') : ''}</button>`).join('')}</div>` : '');
  }
  function detailScreen(r) {
    const e = entries.find(x => x.id === r.id && !x.deletedAt); if (!e) return '';
    const b = resolveBrand(e), glow = b && lum(b.c) >= .08 && lum(b.c) <= .85 ? b.c : P.a, rev = r.rev || (r.rev = {});
    const fcard = (i, key, icon, label, value, o) => {
      o = o || {}; const show = !o.secret || rev[key];
      return `<div class="glass fcard tap appear" style="--i:${i}" data-act="copyField" data-arg="${key}"><div class="row" style="gap:14px">${ic(icon, 22, P.a)}<div class="grow"><div class="dim" style="font-size:12px">${esc(label)}</div>
        <div class="${o.mono ? 'mono' : ''}" style="font-size:17px;font-weight:500;word-break:break-all">${esc(show ? value : '•'.repeat(Math.min(14, Math.max(6, value.length))))}</div></div>${o.secret ? ib(show ? 'visibility_off' : 'visibility', 'reveal', { arg: key, size: 40, glass: false, tint: P.dim }) : ''}${ib('content_copy', 'copyField', { arg: key, size: 40, glass: false, tint: P.dim })}</div>${o.strength ? `<div style="height:12px"></div>${meter(value)}` : ''}</div>`;
    };
    let body = '';
    if (e.type === 'LOGIN') {
      if (e.username) body += fcard(1, 'username', 'person', S.fUsername, e.username);
      if (e.password) body += fcard(2, 'password', 'key', S.fPassword, e.password, { secret: true, mono: true, strength: true });
      if (e.totp) body += `<div class="glass fcard tap appear" style="--i:3" data-act="copyTotp"><div class="row"><div class="grow"><div class="dim" style="font-size:12px">${esc(S.twoFactorCode)}</div><div class="mono" id="totp" style="font-size:30px;font-weight:700;letter-spacing:2px">••• •••</div></div>
        <div class="ring" style="width:46px;height:46px"><svg width="46" height="46"><circle cx="23" cy="23" r="21" stroke="var(--glassHi)" stroke-width="4"/><circle id="totpRing" cx="23" cy="23" r="21" stroke="var(--a)" stroke-width="4" style="transition:none"/></svg><span class="dim" id="totpLeft" style="font-size:13px;font-weight:600"></span></div></div></div>`;
      if (e.history.length) body += `<div class="glass fcard tap appear" style="--i:4" data-act="toggle" data-arg="hist"><div class="row" style="gap:14px">${ic('history', 22, P.a)}<span class="grow" style="font-weight:500">${esc(S.passwordHistory)} · ${e.history.length}</span><i class="mi dim" style="transform:rotate(${ui.open.hist ? 180 : 0}deg);transition:transform .25s">expand_more</i></div>
        ${ui.open.hist ? `<div class="col" style="gap:4px;padding-top:10px">${e.history.map((h, i) => `<div class="row"><div class="grow"><div class="mono ell" style="font-size:15px">${esc(h.p)}</div><div class="faint" style="font-size:12px">${fmtDate(h.t)}</div></div>${ib('content_copy', 'copyHist', { arg: String(i), size: 38, glass: false, tint: P.dim })}</div>`).join('')}</div>` : ''}</div>`;
    } else if (e.type === 'CARD') {
      const g = gradFor(e.title || e.id), digits = e.cardNumber.replace(/\D/g, ''), num = rev.card ? (digits.match(/.{1,4}/g) || []).join(' ') : '•••• •••• •••• ' + digits.slice(-4);
      body += `<div class="bank appear" style="--i:1;background:linear-gradient(135deg,${g[0]},${g[1]});box-shadow:0 14px 32px -10px ${g[0]}"><div class="row"><b class="grow ell" style="font-size:18px">${esc(e.title)}</b>${ic('credit_card', 30)}</div><div class="grow"></div>
        <div class="mono ell" style="font-size:21px;font-weight:600;letter-spacing:1px">${esc(num)}</div><div class="row" style="margin-top:14px;font-size:14px;opacity:.9"><span class="grow ell" style="font-weight:500">${esc(e.cardHolder.toUpperCase())}</span><span class="mono">${esc(e.cardExpiry)}</span></div></div>
        <div class="row appear" style="--i:2;gap:10px"><div class="glass fcard tap grow row" style="gap:10px" data-act="reveal" data-arg="card">${ic(rev.card ? 'visibility_off' : 'visibility', 20, P.a)}<b style="font-size:15px;font-weight:600">${esc(rev.card ? S.hide : S.show)}</b></div>
        <div class="glass fcard tap grow row" style="gap:10px" data-act="copyField" data-arg="cardNumber">${ic('content_copy', 20, P.a)}<b class="ell" style="font-size:15px;font-weight:600">${esc(S.fCardNumber)}</b></div></div>`;
      if (e.cardCvv) body += fcard(3, 'cardCvv', 'verified_user', S.fCvv, e.cardCvv, { secret: true, mono: true });
      if (e.cardPin) body += fcard(4, 'cardPin', 'pin', S.fCardPin, e.cardPin, { secret: true, mono: true });
    }
    if (e.note) body += `<div class="glass card appear" style="--i:5"><div class="dim" style="font-size:12px">${esc(S.fNote)}</div><div style="line-height:23px;margin-top:6px;white-space:pre-wrap;user-select:text;-webkit-user-select:text">${esc(e.note)}</div></div>`;
    return topBar('', ib(e.favorite ? 'star' : 'star_border', 'fav', { tint: e.favorite ? P.warning : P.text }) + ib('edit', 'edit') + ib('delete', 'askDelete', { tint: P.danger })) +
      `<div class="scr sub in" id="scr"><div class="dhead appear"><div class="glow" style="--g:${rgba(glow, .5)}">${avatar(e, 92)}</div><b style="font-size:26px;font-weight:800;text-align:center">${esc(e.title)}</b>
        <div class="chip glass" style="margin-top:8px">${ic(CAT_ICON[e.category])}${esc(S[CAT_STR[e.category]])}</div></div>${body}
        <div class="col faint appear" style="--i:6;align-items:center;font-size:12px;padding:6px 0 28px"><span>${esc(S.created)}: ${fmtDate(e.createdAt)}</span><span>${esc(S.updated)}: ${fmtDate(e.updatedAt)}</span></div></div>`;
  }
  function field(key, label, o) {
    o = o || {}; const f = route().f, v = f[key] || '';
    const input = o.lines ? `<textarea data-in="f" data-key="${key}" rows="${o.lines}">${esc(v)}</textarea>`
      : `<input data-in="f" data-key="${key}" value="${esc(v)}" type="${o.secret ? 'password' : 'text'}" ${o.mode ? `inputmode="${o.mode}"` : ''} autocomplete="off" autocapitalize="off" spellcheck="false"${o.max ? ` maxlength="${o.max}"` : ''}>`;
    return `<div class="field${o.lines ? ' top-al' : ''}${o.err ? ' err' : ''}${o.cls ? ' ' + o.cls : ''}" id="fld-${key}">${o.icon ? ic(o.icon) : ''}<div class="grow"><label>${esc(label)}</label><div class="${o.mono ? 'mono' : ''}">${input}</div></div>${o.trail || ''}</div>`;
  }
  function editScreen(r) {
    if (r.picker) return pickerScreen(r);
    const f = r.f, t = r.type, heading = r.id ? S.editEntry : t === 'LOGIN' ? S.newLogin : t === 'CARD' ? S.newCard : S.newNote;
    let body = '';
    if (t === 'LOGIN') {
      const pv = { type: 'LOGIN', title: f.title, brand: f.brand, id: 'preview' }, b = resolveBrand(pv);
      body += `<div class="glass card row tap appear" id="svc" style="border-radius:22px;padding:12px;gap:14px" data-act="picker">${avatar(pv, 46)}<div class="grow"><div class="dim" style="font-size:12px">${esc(S.service)}</div><b class="ell" style="display:block;font-weight:600">${esc(b ? b.t : S.chooseService)}</b></div>${ic('chevron_right', 24, P.faint)}</div>`;
    }
    body += field('title', S.fTitle, { icon: 'title', err: r.titleErr, cls: 'appear' });
    if (t === 'LOGIN') {
      body += field('username', S.fUsername, { icon: 'person', mode: 'email', cls: 'appear' });
      body += `<div class="col appear" style="--i:2;gap:10px">${field('password', S.fPassword, { icon: 'key', mono: true, secret: !r.showPw, trail: ib(r.showPw ? 'visibility_off' : 'visibility', 'showPw', { size: 38, glass: false, tint: P.dim }) + ib('auto_awesome', 'genInto', { size: 38, glass: false, tint: P.a }) })}<div style="padding:0 6px">${meter(f.password, 'editmeter')}</div></div>`;
      body += field('totp', S.fTotp, { icon: 'verified_user', mono: true, err: r.totpErr, cls: 'appear' });
      body += `<p style="font-size:12px;padding:0 8px;color:${r.totpErr ? P.danger : P.faint}">${esc(r.totpErr ? S.totpInvalid : S.totpHint)}</p>`;
    } else if (t === 'CARD') {
      body += field('cardNumber', S.fCardNumber, { icon: 'credit_card', mono: true, mode: 'numeric', max: 23, cls: 'appear' }) + field('cardHolder', S.fCardHolder, { icon: 'person', cls: 'appear' });
      body += `<div class="row appear" style="gap:10px;align-items:stretch"><div class="grow">${field('cardExpiry', S.fExpiry, { icon: 'today', mono: true, mode: 'numeric', max: 7 })}</div><div class="grow">${field('cardCvv', S.fCvv, { mono: true, mode: 'numeric', max: 4, secret: true })}</div></div>`;
      body += field('cardPin', S.fCardPin, { icon: 'pin', mono: true, mode: 'numeric', max: 8, secret: true, cls: 'appear' });
    }
    if (t !== 'LOGIN') body += field('note', S.fNote, { lines: t === 'NOTE' ? 8 : 3, cls: 'appear' });
    body += `<div class="label">${esc(S.fCategory)}</div><div class="pills" id="catpills">${CATS.map(c => pill(S[CAT_STR[c]], f.category === c, 'cat', c, CAT_ICON[c])).join('')}</div><div style="height:4px"></div>`;
    return topBar(heading, ib('check', 'save', { tint: P.a })) + `<div class="scr sub save in" id="scr">${body}</div><div class="savebar"><button class="gbtn" style="width:100%" data-act="save">${ic('check')}${esc(S.save)}</button></div>`;
  }
  let pickRes = [], pickShown = 0;
  function pickerRows(from, to) {
    return pickRes.slice(from, to).map(b => `<div class="glass card row tap" style="border-radius:20px;padding:10px;gap:14px" data-act="pick" data-arg="${esc(b.s)}">${brandAvatar(b, 44)}<b class="ell" style="font-weight:600">${esc(b.t)}</b></div>`).join('');
  }
  function pickerList(r) {
    const q = (r.q || '').trim();
    pickRes = searchBrands(q); pickShown = Math.min(60, pickRes.length);
    let html = `<div class="glass card row tap" style="border-radius:22px;padding:12px;gap:14px" data-act="pick" data-arg=""><div class="badge" style="width:46px;height:46px;border-radius:15px;box-shadow:none">${ic('add')}</div><b class="grow ell" style="font-weight:600">${esc(q ? fmt(S.useCustom, { name: q }) : S.customService)}</b>${ic('chevron_right', 24, P.faint)}</div>`;
    if (!q && Brands.popular.length) html += `<div class="label">${esc(S.popular)}</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${Brands.popular.map(b => `<div class="glass tap col" style="border-radius:22px;padding:10px 3px;align-items:center;gap:6px;min-width:0" data-act="pick" data-arg="${esc(b.s)}">${brandAvatar(b, 46)}<b class="ell" style="font-size:12px;font-weight:600;max-width:100%">${esc(b.t)}</b></div>`).join('')}</div>`;
    html += `<div class="row"><div class="label grow">${esc(q ? S.found : S.allServices)}</div><b class="faint" style="font-size:13px;padding-right:6px">${Brands.full || q ? pickRes.length : BD.total}</b></div><div class="col" id="prows" style="gap:8px">${pickerRows(0, pickShown)}</div>`;
    return html;
  }
  function renderPickerList() { const el = $('#plist'); if (el) el.innerHTML = pickerList(route()); }
  function pickerScreen(r) {
    return topBar(S.chooseService) + `<div style="position:absolute;left:16px;right:16px;top:64px;z-index:4">${`<div class="field">${ic('search')}<div class="grow"><label>${esc(fmt(S.searchServices, { n: BD.total }))}</label><input id="pq" data-in="pq" value="${esc(r.q || '')}" autocomplete="off" enterkeyhint="search"></div></div>`}</div>
      <div class="scr sub in" id="scr" style="top:138px;gap:8px;padding-bottom:16px"><div id="plist" class="col" style="gap:8px">${pickerList(r)}</div></div>`;
  }
  function trashScreen() {
    const tr = entries.filter(e => e.deletedAt).sort((x, y) => y.deletedAt - x.deletedAt);
    if (!tr.length) return topBar(S.trash) + `<div class="scr sub in" id="scr"><div style="height:60px"></div>${emptyState('delete_outline', S.trashEmpty, S.trashHint)}</div>`;
    return topBar(S.trash, ib('delete_forever', 'askEmpty', { tint: P.danger })) + `<div class="scr sub in" id="scr" style="gap:10px;padding-bottom:16px"><p class="dim" style="font-size:13px;padding:0 6px">${esc(S.trashHint)}</p>
      ${tr.map(e => `<div class="glass card row" style="border-radius:22px;padding:12px;gap:14px">${avatar(e, 48)}<div class="grow"><b class="ell" style="display:block;font-weight:600">${esc(e.title)}</b><div class="dim" style="font-size:13px">${esc(fmt(S.daysLeft, { n: Math.max(0, Math.floor((e.deletedAt + 30 * DAY - Date.now()) / DAY)) + 1 }))}</div></div>${ib('restore_from_trash', 'restore', { arg: e.id, size: 40, tint: P.success })}${ib('delete_forever', 'askForever', { arg: e.id, size: 40, tint: P.danger })}</div>`).join('')}</div>`;
  }
  function pinScreen() {
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="glass" data-act="digit" data-arg="${n}">${n}</button>`).join('');
    return `<div class="center in"><div class="halo"><div class="badge">${ic('shield')}</div></div><b style="font-size:26px;text-align:center">${esc(S.enterPin)}</b><p class="dim" style="font-size:15px;text-align:center;margin-top:8px">${esc(S.enterPinSub)}</p>
      <p style="font-size:13px;margin-top:6px;color:var(--a);font-weight:600">${esc(D().pinHint)}</p><div class="dots" id="dots">${[0, 1, 2, 3].map(i => `<i class="${i < ui.pin.length ? 'on' : ''}"></i>`).join('')}</div>
      <div class="pad">${keys}<span></span><button class="glass" data-act="digit" data-arg="0">0</button><button data-act="bksp">${ic('backspace')}</button></div></div>`;
  }
  const splashScreen = () => `<div class="center splash" id="splash"><div class="halo logo" style="width:150px;height:150px"><div class="badge" style="width:104px;height:104px;border-radius:34px">${ic('shield', 56)}</div></div><h1>Keyra</h1><p>${esc(S.tagline)}</p></div>`;
  function dialogHtml() {
    const d = ui.dialog; if (!d) return '';
    return `<div class="dlgwrap" data-act="dlgCancel"><div class="dlg" data-act="noop"><div class="badge" style="width:52px;height:52px;border-radius:18px;box-shadow:none">${ic(d.icon, 26)}</div><h3>${esc(d.title)}</h3><p>${esc(d.text)}</p>
      <div class="btns"><button class="ghost" data-act="dlgCancel">${esc(S.cancel)}</button><button class="gbtn danger" data-act="dlgOk">${esc(S.delete)}</button></div></div></div>`;
  }

  /* ---------- отрисовка ---------- */
  let lastKey = '', totpTimer = 0;
  function render(keep) {
    const r = route();
    const key = ui.lock !== 'open' ? ui.lock : r ? r.name + (r.id || '') + (r.picker ? 'p' : '') : 'tab' + ui.tab;
    const same = keep || key === lastKey, old = $('#scr'), top = same && old ? old.scrollTop : 0;
    lastKey = key;
    let html;
    if (ui.lock === 'splash') html = splashScreen();
    else if (ui.lock === 'pin') html = pinScreen();
    else if (r) html = r.name === 'detail' ? detailScreen(r) : r.name === 'edit' ? editScreen(r) : trashScreen();
    else html = [vScreen, gScreen, aScreen, sScreen][ui.tab]() + barHtml();
    const view = $('#view');
    view.className = same ? 'noanim' : '';
    view.innerHTML = html + dialogHtml();
    const scr = $('#scr'); if (scr && top) scr.scrollTop = top;
    const fill = () => view.querySelectorAll('circle.prog').forEach(c => { c.style.strokeDasharray = c.dataset.len + ' 999'; });
    if (same) { view.querySelectorAll('circle.prog').forEach(c => { c.style.transition = 'none'; }); fill(); } else setTimeout(fill, 60);
    clearInterval(totpTimer);
    if (r && r.name === 'detail' && $('#totp')) { tickTotp(); totpTimer = setInterval(tickTotp, 250); }
    if (r && r.picker && scr) scr.addEventListener('scroll', () => {
      if (pickShown < pickRes.length && scr.scrollTop + scr.clientHeight > scr.scrollHeight - 600) { $('#prows').insertAdjacentHTML('beforeend', pickerRows(pickShown, pickShown + 60)); pickShown += 60; }
    }, { passive: true });
  }
  let totpNow = '';
  function tickTotp() {
    const r = route(), e = r && entries.find(x => x.id === r.id), el = $('#totp'); if (!e || !el) return;
    const now = Date.now(), left = 1 - (now % 30000) / 30000, C = 2 * Math.PI * 21, ring = $('#totpRing');
    ring.style.strokeDasharray = C * left + ' ' + C; ring.style.stroke = left < .2 ? P.danger : P.a;
    $('#totpLeft').textContent = Math.floor((30000 - now % 30000) / 1000) + 1;
    totpCode(e.totp, Math.floor(now / 1000)).then(c => { if (c && $('#totp')) { totpNow = c; $('#totp').textContent = c.slice(0, 3) + ' ' + c.slice(3); } });
  }
  function setGenPw(spin) {
    ui.genPw = generate(gen); save();
    const box = $('#genpw'); if (!box) return;
    box.className = 'genpw mono' + (ui.genPw.length > 28 ? ' small' : '');
    box.innerHTML = `<span>${pwSpans(ui.genPw)}</span>`;
    $('#genmeter').outerHTML = meter(ui.genPw, 'genmeter');
    if (spin) { const b = $('[data-act=regen]'); b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin'); }
  }
  function setLang(l) { settings.lang = l; settings.langSet = true; S = STR[l]; document.documentElement.lang = l; save(); }

  /* ---------- действия ---------- */
  const A = {
    noop() {},
    tab(a) { ui.tab = +a; ui.addOpen = ui.sortOpen = false; ui.open = {}; render(); },
    addToggle() { ui.addOpen = !ui.addOpen; ui.sortOpen = false; render(true); },
    add(type) { push({ name: 'edit', type, f: blank({ type, category: type === 'CARD' ? 'finance' : 'other' }), showPw: true, picker: type === 'LOGIN' }); },
    sortMenu(a, el) { ui.sortOpen = !ui.sortOpen; if (ui.sortOpen && el) ui.sortTop = el.getBoundingClientRect().bottom - $('#app').getBoundingClientRect().top + 4; render(true); },
    sort(m) { settings.sort = m; ui.sortOpen = false; save(); render(true); },
    filter(f) { ui.filter = f; render(true); },
    trash() { push({ name: 'trash' }); },
    open(id) { ui.open = {}; push({ name: 'detail', id }); },
    back() { const r = route(); if (r && r.picker) { r.picker = false; render(); } else pop(); },
    copyPw(id) { const e = entries.find(x => x.id === id); e.usedCount++; save(); copy(e.password, S.passwordCopied); },
    fav() { const e = entries.find(x => x.id === route().id); e.favorite = !e.favorite; save(); render(true); },
    edit() { const e = entries.find(x => x.id === route().id); push({ name: 'edit', id: e.id, type: e.type, f: JSON.parse(JSON.stringify(e)), showPw: false }); },
    reveal(k) { const r = route(); r.rev[k] = !r.rev[k]; render(true); },
    copyField(k) { const e = entries.find(x => x.id === route().id); if (k === 'password') { e.usedCount++; save(); copy(e.password, S.passwordCopied); } else copy(k === 'cardNumber' ? e.cardNumber.replace(/\D/g, '') : e[k], S.copied); },
    copyTotp() { if (totpNow) copy(totpNow, S.copied); },
    copyHist(i) { copy(entries.find(x => x.id === route().id).history[+i].p, S.copied); },
    toggle(k) { ui.open[k] = !ui.open[k]; render(true); },
    askDelete() { ui.dialog = { icon: 'delete', title: S.moveToTrashQ, text: S.trashHint, ok() { const e = entries.find(x => x.id === route().id); e.deletedAt = Date.now(); save(); ui.stack.pop(); toast(S.movedToTrash); } }; render(true); },
    askEmpty() { ui.dialog = { icon: 'delete_forever', title: S.emptyTrashQ, text: S.cannotUndo, ok() { entries = entries.filter(e => !e.deletedAt); save(); } }; render(true); },
    askForever(id) { ui.dialog = { icon: 'delete_forever', title: S.deleteForeverQ, text: S.cannotUndo, ok() { entries = entries.filter(e => e.id !== id); save(); } }; render(true); },
    restore(id) { entries.find(e => e.id === id).deletedAt = null; save(); toast(S.restored); render(true); },
    dlgCancel() { ui.dialog = null; render(true); },
    dlgOk() { const d = ui.dialog; ui.dialog = null; d.ok(); render(); },
    picker() { const r = route(); r.picker = true; r.q = ''; render(); loadAllBrands(); },
    pick(slug) {
      const r = route(), b = slug ? Brands.bySlug[slug] : null, name = b ? b.t : (r.q || '').trim();
      r.f.brand = b ? b.s : '';
      if (name) r.f.title = name;
      r.titleErr = false;
      if (!r.id && b && b.k) r.f.category = b.k;
      r.picker = false; render();
    },
    cat(c) { route().f.category = c; $('#catpills').querySelectorAll('.pill').forEach(p => p.classList.toggle('on', p.dataset.arg === c)); },
    showPw() { const r = route(); r.showPw = !r.showPw; render(true); },
    genInto() { const r = route(); r.f.password = generate(gen); r.showPw = true; render(true); },
    save() {
      const r = route(), f = r.f;
      r.titleErr = !f.title.trim(); r.totpErr = !!f.totp.trim() && !totpNormalize(f.totp);
      if (r.titleErr || r.totpErr) { render(true); const el = $(r.titleErr ? '#fld-title' : '#fld-totp'); el.classList.add('shake'); el.scrollIntoView({ block: 'center' }); return; }
      const now = Date.now(), ex = r.id ? entries.find(e => e.id === r.id) : null, changed = ex && ex.password !== f.password;
      const e = Object.assign(ex || f, { title: f.title.trim(), brand: f.brand, username: f.username.trim(), password: f.password, totp: f.totp.trim() ? totpNormalize(f.totp) : '', cardNumber: f.cardNumber.trim(), cardHolder: f.cardHolder.trim(),
        cardExpiry: f.cardExpiry.trim(), cardCvv: f.cardCvv.trim(), cardPin: f.cardPin.trim(), note: f.note.trim(), category: f.category, updatedAt: now,
        history: changed && ex.password ? [{ p: ex.password, t: now }].concat(ex.history).slice(0, 10) : (ex || f).history, passwordChangedAt: changed ? now : (ex || f).passwordChangedAt });
      if (!ex) { e.createdAt = e.passwordChangedAt = now; entries.push(e); }
      save(); haptic(); ui.stack.pop(); toast(S.saved); render();
    },
    genCopy() { copy(ui.genPw, S.passwordCopied); },
    regen() { setGenPw(true); },
    seg(i, el) {
      const box = el.closest('.seg'), id = box.dataset.seg; i = +i;
      box.style.setProperty('--s', i); box.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === i));
      if (id === 'theme') { settings.theme = ['SYSTEM', 'LIGHT', 'DARK'][i]; save(); applyTheme(); setTimeout(() => render(true), 330); }
      else if (id === 'lang') { setLang(['ru', 'uk', 'en'][i]); setTimeout(() => render(true), 330); }
      else if (id === 'mode') { gen.passphrase = i === 1; $('#genopts').innerHTML = gOpts(); setGenPw(); }
      else if (id === 'sep') { gen.separator = ['-', '.', '_', ' '][i]; setGenPw(); }
    },
    sw(id, el) {
      if (id === 'bio') return toast(S.bioUnavailable, true);
      const on = !el.classList.contains('on'); el.classList.toggle('on', on);
      if (id === 'haptics') { settings.haptics = on; save(); } else { gen[id.slice(2)] = on; setGenPw(); }
    },
    accent(k) { settings.accent = k; save(); applyTheme(); document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('on', s.dataset.arg === k)); setTimeout(() => render(true), 280); },
    na() { toast(D().na, true); },
    lock() { ui.lock = 'pin'; ui.pin = ''; ui.stack = []; ui.tab = 0; render(); },
    digit(n) {
      if (ui.pin.length >= 4) return;
      ui.pin += n; $('#dots').children[ui.pin.length - 1].classList.add('on');
      if (ui.pin.length === 4) setTimeout(() => { $('#view').firstElementChild.classList.add('out'); setTimeout(() => { ui.lock = 'open'; ui.pin = ''; render(); loadAllBrands(); }, 240); }, 160);
    },
    bksp() { if (!ui.pin) return; ui.pin = ui.pin.slice(0, -1); $('#dots').children[ui.pin.length].classList.remove('on'); },
  };
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act; if (act !== 'noop' && act !== 'digit') haptic();
    if (A[act]) A[act](el.dataset.arg, el);
  });
  document.addEventListener('input', ev => {
    const el = ev.target, kind = el.dataset.in; if (!kind) return;
    if (kind === 'query') { ui.query = el.value; $('#vlist').innerHTML = vList(); }
    else if (kind === 'pq') { route().q = el.value; renderPickerList(); $('#scr').scrollTop = 0; }
    else if (kind === 'slider') {
      const k = el.dataset.key; gen[k] = +el.value; $('#sv-' + k).textContent = el.value;
      el.style.setProperty('--p', (el.value - el.min) / (el.max - el.min) * 100 + '%'); setGenPw();
    } else if (kind === 'f') {
      const r = route(), k = el.dataset.key; let v = el.value;
      if (k === 'cardNumber') v = v.replace(/[^\d ]/g, ''); else if (k === 'cardCvv' || k === 'cardPin') v = v.replace(/\D/g, '');
      if (v !== el.value) el.value = v;
      r.f[k] = v;
      if (k === 'password') $('#editmeter').outerHTML = meter(v, 'editmeter');
      if (k === 'title') { r.titleErr = false; $('#fld-title').classList.remove('err'); if (r.type === 'LOGIN' && !r.f.brand) { const pv = { type: 'LOGIN', title: v, brand: '', id: 'preview' }, b = resolveBrand(pv), svc = $('#svc'); svc.querySelector('.av').outerHTML = avatar(pv, 46); svc.querySelector('b').textContent = b ? b.t : S.chooseService; } }
      if (k === 'totp') { r.totpErr = false; $('#fld-totp').classList.remove('err'); }
    }
  });
  document.addEventListener('keydown', ev => {
    if (ui.lock === 'pin') { if (/^\d$/.test(ev.key)) A.digit(ev.key); else if (ev.key === 'Backspace') A.bksp(); }
    else if (ev.key === 'Escape') { if (ui.dialog) A.dlgCancel(); else if (ui.addOpen || ui.sortOpen) { ui.addOpen = ui.sortOpen = false; render(true); } else if (route()) A.back(); }
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (settings.theme === 'SYSTEM') { applyTheme(); render(true); } });

  /* ---------- запуск ---------- */
  document.documentElement.lang = settings.lang;
  applyTheme();
  render();
  setTimeout(() => { const s = $('#splash'); if (s) s.classList.add('out'); setTimeout(() => { if (ui.lock === 'splash') { ui.lock = 'pin'; render(); } }, 280); }, 1500);
  if (document.fonts && document.fonts.load) document.fonts.load('24px "Material Icons Round"').catch(() => {});
})();
