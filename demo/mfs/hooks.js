'use strict';

/* =========================================================
   Точки расширения: новые модули (режимы, задания, обучение,
   статистика, оформление) подключаются к основному коду здесь.
   Ошибка в одном модуле не ломает весь экран — она пишется в журнал.
   ========================================================= */

const Hooks = (() => {
  const list = {};
  const views = {};

  const safe = (name, fn, args) => {
    try {
      return fn(...args);
    } catch (e) {
      window.mfsLogError?.(e, `hook:${name}`);
      return undefined;
    }
  };

  return {
    views,
    on(name, fn) { (list[name] ||= []).push(fn); },
    // Склеивает HTML от всех модулей
    html(name, ...args) { return (list[name] || []).map(fn => safe(name, fn, args) || '').join(''); },
    // Первый модуль, который обработал событие, возвращает true
    any(name, ...args) { return (list[name] || []).some(fn => safe(name, fn, args)); },
    // Первый непустой результат
    first(name, ...args) {
      for (const fn of list[name] || []) {
        const r = safe(name, fn, args);
        if (r != null) return r;
      }
      return null;
    },
    run(name, ...args) { (list[name] || []).forEach(fn => safe(name, fn, args)); },
    view(name, render) { views[name] = render; },
  };
})();
