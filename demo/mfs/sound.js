'use strict';

/* =========================================================
   Звуки (синтез через Web Audio, без файлов)
   ========================================================= */

const Sound = (() => {
  let ctx = null;

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Звуковые темы меняют тембр: мягкая — синус тише, 8-бит — квадрат, колокольчики — выше и дольше
  const THEME_TONE = {
    soft: (o) => ({ ...o, type: 'sine', vol: o.vol * 0.75 }),
    retro: (o) => ({ ...o, type: 'square', vol: o.vol * 0.55 }),
    bells: (o) => ({ ...o, type: 'sine', freq: o.freq * 2, dur: o.dur * 1.8, vol: o.vol * 0.8 }),
  };

  function tone(freq0, dur0, opts0 = {}) {
    const th = THEME_TONE[data.settings.soundTheme];
    const o = th ? th({ type: 'sine', vol: 0.2, delay: 0, slide: 0, ...opts0, freq: freq0, dur: dur0 }) : { type: 'sine', vol: 0.2, delay: 0, slide: 0, ...opts0, freq: freq0, dur: dur0 };
    const { type, vol, delay, slide, freq, dur } = o;
    if (!data.settings.sound || data.settings.volume <= 0) return;
    const c = audio();
    if (!c) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol * data.settings.volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  const arp = (notes, step, opts) => notes.forEach((f, i) => tone(f, 0.18, { type: 'triangle', ...opts, delay: (opts?.delay || 0) + i * step }));

  return {
    correct(streak) {
      const base = 660 * Math.pow(2, Math.min(streak, 12) / 24);
      tone(base, 0.08, { type: 'triangle', vol: 0.18 });
      tone(base * 1.5, 0.12, { type: 'triangle', vol: 0.14, delay: 0.05 });
    },
    streak: () => arp([784, 988, 1175, 1568], 0.06, { vol: 0.16 }),
    wrong: () => tone(190, 0.25, { type: 'sawtooth', vol: 0.12, slide: 0.6 }),
    lifeLost: () => { tone(330, 0.15, { type: 'square', vol: 0.1 }); tone(220, 0.3, { type: 'square', vol: 0.1, delay: 0.12, slide: 0.7 }); },
    count: () => tone(520, 0.12, { type: 'square', vol: 0.07 }),
    go: () => tone(1040, 0.28, { type: 'square', vol: 0.09 }),
    tick: () => tone(1250, 0.04, { type: 'square', vol: 0.05 }),
    click: () => tone(460, 0.035, { type: 'triangle', vol: 0.08 }),
    end: () => arp([523, 659, 784], 0.1, {}),
    record: () => { arp([523, 659, 784, 1047], 0.11, { vol: 0.22 }); tone(1319, 0.5, { delay: 0.46, vol: 0.18 }); },
    // Звон монет
    coin: () => { [1568, 2093, 2637, 2093, 3136].forEach((f, i) => tone(f, 0.07, { type: 'triangle', vol: 0.09, delay: i * 0.045 })); },
    achievement: () => arp([988, 1319, 1568], 0.08, { type: 'sine', vol: 0.16, delay: 0.7 }),
  };
})();
