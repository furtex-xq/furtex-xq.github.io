'use strict';

/* =========================================================
   Языки. Исходные фразы написаны по-русски и служат ключами:
   t('Тренировка') → 'Trénink' в чешском словаре.
   Фразы с числами используют метки {0}, {1}.
   Словари лежат в lang-cs.js, lang-en.js, lang-uk.js, lang-pl.js, lang-de.js.
   ========================================================= */

const I18N = (() => {
  const KEY = 'mfs-lang';
  const LANGS = {
    ru: { name: 'Русский', native: 'Русский', locale: 'ru-RU' },
    uk: { name: 'Украинский', native: 'Українська', locale: 'uk-UA' },
    cs: { name: 'Чешский', native: 'Čeština', locale: 'cs-CZ' },
    en: { name: 'Английский', native: 'English', locale: 'en-GB' },
    pl: { name: 'Польский', native: 'Polski', locale: 'pl-PL' },
    de: { name: 'Немецкий', native: 'Deutsch', locale: 'de-DE' },
  };
  const dicts = {};

  function detect() {
    const list = navigator.languages?.length ? navigator.languages : [navigator.language || 'ru'];
    for (const l of list) {
      const code = String(l).slice(0, 2).toLowerCase();
      if (code === 'sk') return 'cs'; // словакам ближе всего чешский
      if (code === 'be') return 'ru';
      if (LANGS[code]) return code;
    }
    return 'ru';
  }

  let lang = 'ru';
  try {
    lang = localStorage.getItem(KEY) || detect();
  } catch {
    lang = detect();
  }
  if (!LANGS[lang]) lang = 'ru';
  document.documentElement.lang = lang;

  return {
    LANGS,
    get lang() { return lang; },
    get locale() { return LANGS[lang].locale; },
    add(code, dict) { dicts[code] = Object.assign(dicts[code] || {}, dict); },
    lookup(src) {
      if (lang === 'ru') return src;
      const d = dicts[lang];
      return (d && d[src] != null) ? d[src] : src;
    },
    set(code) {
      if (!LANGS[code]) return;
      try { localStorage.setItem(KEY, code); } catch { /* без памяти — только до перезапуска */ }
    },
  };
})();

// Перевод фразы (tr, а не t — чтобы не пересекаться с переменными t в коде).
// Метки {0}, {1}… заменяются аргументами по порядку.
function tr(src, ...args) {
  let s = I18N.lookup(src);
  if (args.length) s = s.replace(/\{(\d+)\}/g, (m, i) => (args[i] !== undefined ? args[i] : m));
  return s;
}

// Форма слова по числу. Передаются русские формы (1, 2–4, 5+) — они же ключи перевода.
function plural(n, one, few, many) {
  const lang = I18N.lang;
  const abs = Math.abs(Math.trunc(n));
  let form;
  if (lang === 'ru' || lang === 'uk') {
    const n10 = abs % 10, n100 = abs % 100;
    form = n10 === 1 && n100 !== 11 ? 0 : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? 1 : 2;
  } else if (lang === 'pl') {
    const n10 = abs % 10, n100 = abs % 100;
    form = abs === 1 ? 0 : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? 1 : 2;
  } else if (lang === 'cs') {
    form = abs === 1 ? 0 : abs >= 2 && abs <= 4 ? 1 : 2;
  } else {
    form = abs === 1 ? 0 : 2;
  }
  return I18N.lookup([one, few, many][form]);
}
