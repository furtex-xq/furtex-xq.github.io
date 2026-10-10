'use strict';

/* =========================================================
   Рисованные иконки — «карандашом», как банка в Monko:
   неровный двойной контур + штриховка цветными карандашами.
   Контур рисуется цветом currentColor (светлый грифель на тёмном фоне),
   штриховка — через общие маски, дрожание линий — через SVG-фильтр.
   ========================================================= */

const PENCIL = {
  gold: '#e3bf6b',
  red: '#f06a6e',
  green: '#5fd391',
  blue: '#779bf3',
  purple: '#a98afa',
  orange: '#f5a25c',
  teal: '#55d7dc',
  ink: 'currentColor',
};

/* Штриховка цветом рисуется узором-заливкой: это дешевле маски,
   для которой браузер заводит отдельный буфер на каждую иконку. */
const HATCH_FILLS = Object.entries(PENCIL)
  .filter(([name]) => name !== 'ink')
  .map(([name, color]) => `
    <pattern id="mfs-fill-${name}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
      <line x1="1" y1="0" x2="1" y2="4" stroke="${color}" stroke-width="1.8"/>
    </pattern>
    <pattern id="mfs-fill-${name}-d" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
      <rect width="4" height="4" fill="${color}" fill-opacity=".14"/>
      <line x1="1" y1="0" x2="1" y2="4" stroke="${color}" stroke-width="2.1"/>
    </pattern>`).join('');

(function injectPencilDefs() {
  const defs = HATCH_FILLS + `
    <filter id="mfs-pencil" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="7" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.9" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <pattern id="mfs-hatch-a" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
      <line x1="1" y1="0" x2="1" y2="4" stroke="#fff" stroke-width="1.8"/>
    </pattern>
    <pattern id="mfs-hatch-b" width="5.5" height="5.5" patternUnits="userSpaceOnUse" patternTransform="rotate(48)">
      <line x1="1" y1="0" x2="1" y2="5.5" stroke="#fff" stroke-opacity=".7" stroke-width="1.1"/>
    </pattern>
    <mask id="mfs-hatch" maskUnits="userSpaceOnUse" x="-20" y="-20" width="104" height="104">
      <rect x="-20" y="-20" width="104" height="104" fill="url(#mfs-hatch-a)"/>
    </mask>
    <mask id="mfs-cross" maskUnits="userSpaceOnUse" x="-20" y="-20" width="104" height="104">
      <rect x="-20" y="-20" width="104" height="104" fill="url(#mfs-hatch-a)"/>
      <rect x="-20" y="-20" width="104" height="104" fill="url(#mfs-hatch-b)"/>
    </mask>`;
  document.body.insertAdjacentHTML('afterbegin',
    `<svg id="mfs-sprite" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${defs}</defs></svg>`);
})();

/* ---------- Карандашные примитивы ---------- */

/* Неровность линий раньше делал SVG-фильтр, но он пересчитывался на каждый кадр
   для каждой иконки и сильно тормозил. Теперь дрожание один раз «запекается»
   в координаты пути: рисунок такой же живой, а на отрисовку уходит втрое меньше. */
let jitterSeed = 12345;
const jitter = amp => {
  jitterSeed = (jitterSeed * 1103515245 + 12345) & 0x7fffffff;
  return ((jitterSeed / 0x7fffffff) * 2 - 1) * amp;
};

const PATH_ARGS = { m: 2, l: 2, t: 2, c: 6, s: 4, q: 4, a: 7, h: 1, v: 1, z: 0 };

function wobble(d, amp = 0.55) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/gi);
  if (!tokens) return d;
  const out = [];
  let cmd = 'M';
  let i = 0;
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) { cmd = tokens[i]; out.push(tokens[i]); i++; continue; }
    const key = cmd.toLowerCase();
    const n = PATH_ARGS[key] ?? 2;
    const args = tokens.slice(i, i + n).map(Number);
    i += n;
    if (key === 'a') {
      // у дуги трогаем только радиусы и конечную точку, флаги оставляем как есть
      args[0] += jitter(amp * 0.4);
      args[1] += jitter(amp * 0.4);
      args[5] += jitter(amp);
      args[6] += jitter(amp);
    } else if (key === 'h' || key === 'v') {
      args[0] += jitter(amp);
    } else {
      for (let k = 0; k < args.length; k++) args[k] += jitter(amp);
    }
    out.push(args.map(v => Math.round(v * 100) / 100).join(' '));
  }
  return out.join(' ');
}

// Контур: основной штрих + второй, чуть смещённый — как повторный проход карандаша
function stroke(d, color = PENCIL.ink, w = 2.4) {
  const common = `fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round"`;
  // pathLength нужен анимации «рисования карандашом»
  return `<path d="${wobble(d)}" ${common} stroke-width="${w}" pathLength="100"/>`
    + `<path d="${wobble(d, 0.8)}" ${common} stroke-width="${(w * 0.45).toFixed(2)}" opacity=".5" pathLength="100" transform="translate(.7 -.5)"/>`;
}

// Штриховка области цветным карандашом
const COLOR_NAME = Object.fromEntries(Object.entries(PENCIL).map(([name, value]) => [value, name]));

function hatch(d, color, { dense = false, opacity = 1 } = {}) {
  const name = COLOR_NAME[color];
  // Цветная штриховка — заливка узором; серая (цветом текста) — по-прежнему маска,
  // потому что узор не умеет подхватывать currentColor
  const fill = name && name !== 'ink'
    ? `fill="url(#mfs-fill-${name}${dense ? '-d' : ''})"`
    : `fill="${color}" mask="url(#mfs-${dense ? 'cross' : 'hatch'})"`;
  return `<path d="${wobble(d, 0.35)}" ${fill} fill-rule="evenodd" opacity="${opacity}"/>`;
}

const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;

const rrect = (x, y, w, h, r) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;

const polar = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [(cx + r * Math.sin(a)).toFixed(2), (cy - r * Math.cos(a)).toFixed(2)];
};

// Сектор кольца (углы в градусах от верха по часовой)
function ringSector(cx, cy, r1, r2, a0, a1) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = polar(cx, cy, r2, a0);
  const [x1, y1] = polar(cx, cy, r2, a1);
  const [x2, y2] = polar(cx, cy, r1, a1);
  const [x3, y3] = polar(cx, cy, r1, a0);
  return `M${x0} ${y0}A${r2} ${r2} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r1} ${r1} 0 ${large} 0 ${x3} ${y3}z`;
}

function gearPath(cx, cy, rIn, rOut, teeth) {
  const step = 360 / teeth;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(polar(cx, cy, rIn, a - step * 0.36), polar(cx, cy, rOut, a - step * 0.2),
      polar(cx, cy, rOut, a + step * 0.2), polar(cx, cy, rIn, a + step * 0.36));
  }
  return `M${pts.map(p => p.join(' ')).join('L')}z`;
}

const TEXT = (x, y, size, str, color = PENCIL.ink) =>
  `<text x="${x}" y="${y}" font-family="Caveat,'Segoe Print','Comic Sans MS',cursive" font-weight="700" font-size="${size}" text-anchor="middle" fill="${color}">${str}</text>`;

const STAR = 'M32 5l8 17 18.5 2.2-13.7 12.7 3.6 18.4L32 46.2 15.6 55.3l3.6-18.4L5.5 24.2 24 22z';
const HEART = 'M32 56S7 41 7 23C7 13 13.5 7 21.5 7c4.8 0 8.4 2.8 10.5 6.5C34.1 9.8 37.7 7 42.5 7 50.5 7 57 13 57 23c0 18-25 33-25 33z';

/* ---------- Иконки ---------- */

const ICON_ART = {
  bolt: () => {
    const d = 'M37 5 13 36h15l-5 23 28-33H36l6-21z';
    return hatch(d, PENCIL.gold, { dense: true }) + stroke(d);
  },

  stopwatch: () =>
    hatch(circle(32, 37, 22), PENCIL.gold, { opacity: 0.45 })
    + stroke(rrect(26, 3, 12, 7, 2)) + stroke('M32 10v4M47 14l4-4')
    + stroke(circle(32, 37, 22))
    + stroke('M32 19v4M32 51v4M14 37h4M46 37h4', PENCIL.ink, 1.8)
    + `<g class="hand">${stroke('M32 37l9-9', PENCIL.red, 3)}</g>` + stroke(circle(32, 37, 1.5)),

  heart: () => hatch(HEART, PENCIL.red, { dense: true }) + stroke(HEART),

  heartEmpty: () => `<g opacity=".45">${stroke(HEART)}${stroke('M33 13l-6 13 8 5-7 12', PENCIL.ink, 1.8)}</g>`,

  grid: () =>
    [0, 1, 2].map(r => [0, 1, 2].map(c =>
      `<g class="cell c${r * 3 + c}${r === c ? ' diag' : ''}">${hatch(rrect(11 + c * 14.5, 11 + r * 14.5, 13, 13, 2), PENCIL.gold, { dense: true })}</g>`).join('')).join('')
    + stroke(rrect(6, 6, 52, 52, 10))
    + stroke('M24.5 10v44M39.5 10v44M10 24.5h44M10 39.5h44', PENCIL.ink, 1.6),

  target: () =>
    hatch(`${circle(30, 34, 24)}${circle(30, 34, 16)}`, PENCIL.red, { dense: true })
    + hatch(circle(30, 34, 8), PENCIL.red, { dense: true })
    + stroke(circle(30, 34, 24)) + stroke(circle(30, 34, 16), PENCIL.ink, 1.8) + stroke(circle(30, 34, 8), PENCIL.ink, 1.8)
    + `<g class="arrow">${stroke('M31 33 55 9')}${stroke('M49 6l1.5 6.5L57 14M53 3l1 6 6 1', PENCIL.gold, 2)}</g>`,

  bandage: () => `<g transform="rotate(-40 32 32)">
      ${hatch(rrect(22, 21, 20, 22, 0), PENCIL.orange, { dense: true })}
      ${stroke(rrect(4, 21, 56, 22, 11))}
      ${stroke('M22 22v20M42 22v20', PENCIL.ink, 1.6)}
      ${stroke('M27 27h.1M37 27h.1M32 32h.1M27 37h.1M37 37h.1', PENCIL.ink, 2.6)}
    </g>`,

  calc: () =>
    hatch(rrect(18, 10, 28, 12, 3), PENCIL.gold, { dense: true })
    + stroke(rrect(12, 4, 40, 56, 8)) + stroke(rrect(18, 10, 28, 12, 3), PENCIL.ink, 1.8)
    + [0, 1, 2].map(r => [0, 1, 2].map(c => stroke(rrect(18 + c * 10.5, 27 + r * 10.5, 7, 7, 2), r === 2 && c === 2 ? PENCIL.orange : PENCIL.ink, 1.5)).join('')).join(''),

  fire: () => {
    const outer = 'M32 60c-12 0-21-8-21-19 0-9 6-15 10-21 1 5 4 8 7 9-1-9 4-18 12-24 0 9 6 15 10 20 4 5 6 10 6 16 0 11-10 19-24 19z';
    const inner = 'M32 58c-6 0-11-4.5-11-10.5 0-5 3-8 6-11.5 1 3 3 5 5 5-1-5 2-9.5 6-12.5 1 6 6.5 10 6.5 16.5 0 7.5-5 13-12.5 13z';
    return hatch(outer, PENCIL.orange, { dense: true }) + hatch(inner, PENCIL.gold, { dense: true }) + stroke(outer) + stroke(inner, PENCIL.ink, 1.7);
  },

  star: () => hatch(STAR, PENCIL.gold, { dense: true }) + stroke(STAR),

  chart: () =>
    stroke(rrect(4, 8, 56, 48, 10))
    + hatch('M12 50V42l12-12 10 7 16-17v30z', PENCIL.gold, { opacity: 0.6 })
    + stroke('M12 42 24 30l10 7 16-17', PENCIL.gold, 3.2)
    + stroke('M42 20h8v8', PENCIL.gold, 3.2)
    + stroke('M12 50h40', PENCIL.ink, 1.6),

  hourglass: () => {
    const glass = 'M18 10h28c0 14-10 16-10 22s10 8 10 22H18c0-14 10-16 10-22S18 24 18 10Z';
    return hatch('M22 50h20c-2-7-7-9-10-11-3 2-8 4-10 11Z', PENCIL.gold, { dense: true }) + hatch('M24 16h16c-1 5-5 8-8 10-3-2-7-5-8-10Z', PENCIL.gold, { dense: true })
      + stroke(glass) + stroke('M14 8h36M14 56h36', PENCIL.ink, 3.4);
  },

  magnet: () => {
    const u = 'M14 12h12v22a6 6 0 0 0 12 0V12h12v22a18 18 0 0 1-36 0Z';
    return hatch(u, PENCIL.red, { opacity: 0.6 }) + stroke(u) + stroke('M14 22h12M38 22h12', PENCIL.ink, 2.4)
      + hatch(rrect(14, 12, 12, 10, 1), '#dfe6ec', { dense: true }) + hatch(rrect(38, 12, 12, 10, 1), '#dfe6ec', { dense: true });
  },

  hammer: () => {
    const head = rrect(12, 12, 36, 16, 4);
    return hatch(head, '#c9d1d9', { dense: true }) + stroke(head) + hatch(rrect(27, 28, 7, 26, 3), PENCIL.orange, { opacity: 0.6 })
      + stroke(rrect(27, 28, 7, 26, 3)) + stroke('M48 16l6-3M48 24l6 3', PENCIL.ink, 2);
  },

  pause: () => {
    const a = rrect(16, 12, 11, 40, 4);
    const b = rrect(37, 12, 11, 40, 4);
    return hatch(a + b, PENCIL.gold, { dense: true }) + stroke(a) + stroke(b);
  },

  share: () => {
    const nodes = `${circle(46, 16, 8)}${circle(18, 32, 8)}${circle(46, 48, 8)}`;
    return stroke('M25 28l14-8M25 36l14 8', PENCIL.ink, 2.4) + hatch(nodes, PENCIL.blue, { dense: true }) + stroke(nodes);
  },

  book: () => {
    const l = 'M32 16C24 10 14 10 7 12v38c7-2 17-2 25 4Z';
    const r = 'M32 16c8-6 18-6 25-4v38c-7-2-17-2-25 4Z';
    return hatch(l, PENCIL.blue, { opacity: 0.6 }) + hatch(r, PENCIL.gold, { opacity: 0.6 }) + stroke(l) + stroke(r)
      + stroke('M13 22c5-1 10-1 14 1M13 30c5-1 10-1 14 1M37 23c4-2 9-2 14-1M37 31c4-2 9-2 14-1', PENCIL.ink, 1.4);
  },

  key: () => {
    const ring = circle(20, 32, 11);
    return hatch(ring, PENCIL.gold, { dense: true }) + stroke(ring) + stroke(circle(20, 32, 4), PENCIL.ink, 1.8)
      + hatch('M30 29h26v6H30z', PENCIL.gold, { dense: true }) + stroke('M30 29h26v6H30zM46 35v7M53 35v5', PENCIL.ink, 2.2);
  },

  cards: () => {
    const back = rrect(20, 8, 32, 42, 5);
    const front = rrect(10, 16, 32, 42, 5);
    return hatch(back, PENCIL.purple, { opacity: 0.6 }) + stroke(back) + hatch(front, PENCIL.gold, { dense: true }) + stroke(front)
      + TEXT(26, 44, 20, '?');
  },

  link: () => stroke('M28 36l8-8', PENCIL.ink, 2.6)
    + hatch(rrect(8, 30, 26, 14, 7), PENCIL.teal, { opacity: 0.5 })
    + stroke('M26 26l-4-4a9 9 0 0 0-13 13l6 6a9 9 0 0 0 13 0M38 38l4 4a9 9 0 0 0 13-13l-6-6a9 9 0 0 0-13 0', PENCIL.ink, 2.6),

  ear: () => {
    const e = 'M20 26c0-10 7-17 16-17s16 7 16 16c0 8-6 11-9 15-3 3-2 9-8 12-5 2-10-1-11-5';
    return hatch(e, PENCIL.orange, { opacity: 0.5 }) + stroke(e) + stroke('M29 27c0-5 3-8 7-8s7 3 7 7c0 3-3 4-5 6', PENCIL.ink, 2)
      + stroke('M8 20c-3 7-3 16 0 23M13 24c-2 5-2 11 0 15', PENCIL.blue, 2);
  },

  eye: () => {
    const e = 'M5 32C12 20 21 14 32 14s20 6 27 18c-7 12-16 18-27 18S12 44 5 32Z';
    return stroke(e) + hatch(circle(32, 32, 9), PENCIL.blue, { dense: true }) + stroke(circle(32, 32, 9)) + hatch(circle(32, 32, 3.5), PENCIL.ink);
  },

  sun: () => {
    const c = circle(32, 32, 12);
    const rays = Array.from({ length: 8 }, (_, i) => {
      const [x1, y1] = polar(32, 32, 17, i * 45);
      const [x2, y2] = polar(32, 32, 26, i * 45);
      return `M${x1} ${y1}L${x2} ${y2}`;
    }).join('');
    return hatch(c, PENCIL.gold, { dense: true }) + stroke(c) + stroke(rays, PENCIL.orange, 2.4);
  },

  moon: () => {
    const m = 'M40 8a24 24 0 1 0 16 38A20 20 0 0 1 40 8Z';
    return hatch(m, PENCIL.purple, { dense: true }) + stroke(m) + stroke('M50 14l2 4 4 1-4 2-1 4-2-4-4-1 4-2Z', PENCIL.gold, 1.6);
  },

  palette: () => {
    const p = 'M32 7C17 7 6 18 6 31s10 25 24 25c5 0 6-4 4-7-2-4 0-8 5-8h7c6 0 12-4 12-12C58 16 46 7 32 7Z';
    const dots = `${circle(20, 24, 4)}${circle(31, 17, 4)}${circle(43, 21, 4)}`;
    return hatch(p, PENCIL.gold, { opacity: 0.45 }) + stroke(p) + hatch(dots, PENCIL.red, { dense: true }) + stroke(dots, PENCIL.ink, 1.6);
  },

  music: () => {
    const heads = `${circle(18, 46, 7)}${circle(46, 40, 7)}`;
    return hatch(heads, PENCIL.purple, { dense: true }) + stroke(heads) + stroke('M25 46V14l28-6v32', PENCIL.ink, 2.6)
      + stroke('M25 22l28-6', PENCIL.ink, 3);
  },

  sparkle: () => {
    const s = 'M32 6c2 14 6 18 20 20-14 2-18 6-20 20-2-14-6-18-20-20 14-2 18-6 20-20Z';
    return hatch(s, PENCIL.gold, { dense: true }) + stroke(s) + stroke('M50 44c1 5 2 6 7 7-5 1-6 2-7 7-1-5-2-6-7-7 5-1 6-2 7-7Z', PENCIL.orange, 1.8);
  },

  skull: () => {
    const s = 'M32 7C19 7 10 16 10 28c0 7 3 12 8 15v8h28v-8c5-3 8-8 8-15C54 16 45 7 32 7Z';
    const eyes = `${circle(24, 29, 5)}${circle(40, 29, 5)}`;
    return hatch(s, '#c9d1d9', { opacity: 0.5 }) + stroke(s) + hatch(eyes, PENCIL.red, { dense: true }) + stroke(eyes, PENCIL.ink, 1.8)
      + stroke('M29 39l3-4 3 4M26 51v-6M32 51v-6M38 51v-6', PENCIL.ink, 1.8);
  },

  map: () => {
    const m = 'M6 14l16-6 20 6 16-6v42l-16 6-20-6-16 6Z';
    return hatch(m, PENCIL.green, { opacity: 0.45 }) + stroke(m) + stroke('M22 8v42M42 14v42', PENCIL.ink, 1.6)
      + stroke('M12 40c6-2 8-10 16-12s10 6 18-4', PENCIL.red, 2.2);
  },

  flag: () => {
    const f = 'M16 10c10-4 18 4 28 0 5-2 8-2 10-1v24c-2-1-5-1-10 1-10 4-18-4-28 0Z';
    return hatch(f, PENCIL.red, { dense: true }) + stroke(f) + stroke('M16 8v50', PENCIL.ink, 3);
  },

  gift: () => {
    const box = rrect(10, 26, 44, 30, 4);
    const lid = rrect(7, 18, 50, 10, 3);
    return hatch(box, PENCIL.red, { opacity: 0.6 }) + stroke(box) + hatch(lid, PENCIL.red, { dense: true }) + stroke(lid)
      + hatch('M28 18h8v38h-8z', PENCIL.gold, { dense: true }) + stroke('M28 18v38M36 18v38', PENCIL.ink, 1.6)
      + stroke('M32 18c-8-12-18-6-12 0M32 18c8-12 18-6 12 0', PENCIL.ink, 2.2);
  },

  cart: () => {
    const b = 'M14 16h42l-6 22H20Z';
    return hatch(b, PENCIL.gold, { opacity: 0.6 }) + stroke(b) + stroke('M4 8h8l8 36h30', PENCIL.ink, 2.6)
      + hatch(`${circle(24, 52, 5)}${circle(46, 52, 5)}`, PENCIL.ink) + stroke(`${circle(24, 52, 5)}${circle(46, 52, 5)}`);
  },

  scroll: () => {
    const s = 'M14 10h34c4 0 6 3 6 6v34c0 4-3 6-6 6H18c-4 0-6-3-6-6V16';
    return hatch(s, PENCIL.gold, { opacity: 0.5 }) + stroke(s) + stroke('M12 16c0-4 2-6 5-6s5 2 5 6-2 6-5 6H10', PENCIL.ink, 2.2)
      + stroke('M24 24h22M24 32h22M24 40h14', PENCIL.ink, 1.6);
  },

  users: () => {
    const a = circle(22, 22, 8);
    const b = circle(44, 24, 7);
    return hatch(a, PENCIL.blue, { dense: true }) + stroke(a) + hatch(b, PENCIL.green, { dense: true }) + stroke(b)
      + stroke('M8 52c0-10 6-16 14-16s14 6 14 16M34 38c2-2 6-3 10-3 7 0 12 6 12 15', PENCIL.ink, 2.4);
  },

  puzzle: () => {
    const p = 'M10 14h14c-3-8 13-8 10 0h16v14c8-3 8 13 0 10v16H36c3-8-13-8-10 0H10V40c8 3 8-13 0-10Z';
    return hatch(p, PENCIL.teal, { opacity: 0.6 }) + stroke(p);
  },

  swap: () => stroke('M12 22h36l-8-8M52 42H16l8 8', PENCIL.ink, 2.8) + stroke('M12 22h36M52 42H16', PENCIL.gold, 1.4),

  undo: () => stroke('M18 24h22a14 14 0 0 1 0 28H24', PENCIL.ink, 2.8) + stroke('M26 14 16 24l10 10', PENCIL.ink, 2.8),

  anvil: () => {
    const top = 'M8 20h40c0 6 4 9 10 10v4H44c-4 0-6 3-6 6v4h6v6H18v-6h6v-4c0-3-2-6-6-6h-4c-4-4-6-8-6-14Z';
    return hatch(top, '#9aa4ae', { dense: true }) + stroke(top) + stroke('M14 25h30', PENCIL.ink, 1.6)
      + stroke('M44 12l4-6M50 14l6-3M38 10l-1-6', PENCIL.orange, 2.2);
  },

  coins: () => {
    const a = circle(26, 36, 16);
    const b = circle(40, 26, 16);
    return hatch(a, PENCIL.gold, { dense: true }) + stroke(a) + hatch(b, PENCIL.gold, { dense: true }) + stroke(b)
      + stroke(circle(40, 26, 11), PENCIL.ink, 1.6) + TEXT(40, 32, 15, 'Σ');
  },

  coin: () => {
    const c = circle(32, 32, 22);
    return hatch(c, PENCIL.gold, { dense: true }) + stroke(c) + stroke(circle(32, 32, 16), PENCIL.ink, 1.8) + TEXT(32, 40, 22, 'Σ');
  },

  clover: () => {
    const leaves = `${circle(24, 22, 9)}${circle(40, 22, 9)}${circle(24, 38, 9)}${circle(40, 38, 9)}`;
    return hatch(leaves, PENCIL.green, { opacity: 0.7 }) + stroke(leaves) + stroke('M32 30c4 10 8 16 14 22', PENCIL.ink, 2.6);
  },

  feather: () => {
    const f = 'M50 8C30 12 16 26 14 50l6-4c4-16 14-26 30-38Z';
    const inner = 'M50 8C44 24 34 36 20 46';
    return hatch(f, PENCIL.orange, { dense: true }) + stroke(f) + stroke(inner, PENCIL.ink, 2) + stroke('M14 50l-4 6', PENCIL.ink, 2.6)
      + stroke('M36 22l-8-2M30 30l-8-1M42 16l-6-3', PENCIL.ink, 1.6);
  },

  tg: () => {
    const ring = circle(32, 32, 24);
    const plane = 'M17 31.5 45 20.5c1.6-.6 3 .8 2.5 2.4l-5 22c-.4 1.6-2.2 2.2-3.4 1.2l-8-6.2-4.4 4.2c-.7.7-1.9.3-2-.7l-.6-7.4-7.3-2.6c-1.5-.5-1.5-2.4.2-3Z';
    return hatch(ring, PENCIL.blue, { opacity: 0.55 }) + stroke(ring) + stroke(plane, PENCIL.ink, 2.4) + stroke('M25.5 36.5 41 26', PENCIL.ink, 2);
  },

  ig: () => {
    const box = rrect(10, 10, 44, 44, 13);
    return hatch(box, PENCIL.purple, { opacity: 0.5 }) + stroke(box) + stroke(circle(32, 32, 10.5), PENCIL.ink, 3)
      + stroke(circle(44.5, 19.5, 2.2), PENCIL.ink, 2.6);
  },

  chest: () => {
    const lid = 'M8 30v-6c0-12 48-12 48 0v6z';
    const body = rrect(8, 30, 48, 24, 4);
    return hatch(lid, PENCIL.gold, { dense: true }) + hatch(body, PENCIL.orange, { opacity: 0.55 })
      + stroke(lid) + stroke(body) + stroke('M8 38h48', PENCIL.ink, 2)
      + stroke(rrect(27, 32, 10, 12, 2), PENCIL.ink, 2.6) + stroke('M32 37v3', PENCIL.ink, 2.4);
  },

  trophy: () => {
    const cup = 'M18 8h28v12c0 10-6 18-14 18S18 30 18 20z';
    return hatch(cup, PENCIL.gold, { dense: true }) + hatch(rrect(19, 46, 26, 10, 2), PENCIL.gold)
      + stroke(cup) + stroke('M18 13H9c0 10 4 16 11 17M46 13h9c0 10-4 16-11 17')
      + stroke('M29 38v8M35 38v8') + stroke(rrect(19, 46, 26, 10, 2))
      + '<path class="glint" d="M24 12l-3 14" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>';
  },

  bulb: () => {
    const glass = 'M32 4C21 4 13 12 13 22c0 7 4 11 7 15 2 3 3 5 3 9h18c0-4 1-6 3-9 3-4 7-8 7-15C51 12 43 4 32 4z';
    return `<g class="glass">${hatch(glass, PENCIL.gold, { opacity: 0.7 })}</g>` + stroke(glass)
      + stroke('M27 44V34l3 3 2-4 2 4 3-3v10', PENCIL.orange, 1.8)
      + stroke('M23 50h18M24 55h16M28 60h8')
      + stroke('M21 17c2-5 6-8 11-8', PENCIL.ink, 1.6);
  },

  clipboard: () =>
    hatch(`${rrect(10, 8, 44, 52, 6)}${rrect(16, 15, 32, 40, 2)}`, PENCIL.orange, { dense: true })
    + stroke(rrect(10, 8, 44, 52, 6)) + stroke(rrect(16, 15, 32, 40, 2), PENCIL.ink, 1.8)
    + stroke('M22 26h20M22 34h20M22 42h12', PENCIL.ink, 1.8)
    + hatch(rrect(22, 4, 20, 10, 3), PENCIL.ink, { dense: true, opacity: 0.6 }) + stroke(rrect(22, 4, 20, 10, 3)),

  bell: () => {
    const body = 'M32 10c-10 0-16 8-16 18v9l-5 8h42l-5-8v-9c0-10-6-18-16-18z';
    return hatch(body, PENCIL.gold, { dense: true }) + stroke(body)
      + stroke(circle(32, 7, 3)) + stroke('M26 50a6 6 0 0 0 12 0') + stroke('M22 37v-9c0-5 2.5-9 6.5-11', PENCIL.ink, 1.5);
  },

  speaker: () => {
    const body = 'M8 25h10l13-12v38L18 39H8z';
    return hatch(body, PENCIL.ink, { opacity: 0.55 }) + stroke(body)
      + `<g class="waves">${stroke('M40 25c3 2 4 4.5 4 7s-1 5-4 7', PENCIL.gold, 2.8)}<g class="wave2">${stroke('M46 18c5 4 7 9 7 14s-2 10-7 14', PENCIL.gold, 2.8)}</g></g>`;
  },

  mute: () => {
    const body = 'M8 25h10l13-12v38L18 39H8z';
    return hatch(body, PENCIL.ink, { opacity: 0.4 }) + stroke(body) + stroke('M41 25l14 14M55 25 41 39', PENCIL.red, 3);
  },

  home: () =>
    hatch('M13 26 32 10l19 16v31H13z', PENCIL.gold, { dense: true })
    + hatch(rrect(27, 40, 10, 17, 1), PENCIL.ink, { dense: true, opacity: 0.7 })
    + stroke('M5 31 32 7l27 24', PENCIL.ink, 3) + stroke('M13 25v32h38V25') + stroke(rrect(27, 40, 10, 17, 1), PENCIL.ink, 1.8)
    + stroke('M44 14v-6h5v10', PENCIL.ink, 1.8),

  gear: () => {
    const outline = gearPath(32, 32, 20, 27, 8);
    return hatch(`${outline}${circle(32, 32, 8)}`, PENCIL.ink, { dense: true, opacity: 0.5 })
      + stroke(outline) + stroke(circle(32, 32, 8)) + stroke(circle(32, 32, 14), PENCIL.ink, 1.3);
  },

  donut: () =>
    hatch(ringSector(32, 32, 12, 26, 0, 160), PENCIL.red, { dense: true })
    + hatch(ringSector(32, 32, 12, 26, 160, 280), PENCIL.purple, { dense: true })
    + hatch(ringSector(32, 32, 12, 26, 280, 360), PENCIL.blue, { dense: true })
    + stroke(circle(32, 32, 26)) + stroke(circle(32, 32, 12))
    + stroke(['M32 6v6', `M${polar(32, 32, 12, 160).join(' ')}L${polar(32, 32, 26, 160).join(' ')}`, `M${polar(32, 32, 12, 280).join(' ')}L${polar(32, 32, 26, 280).join(' ')}`].join(''), PENCIL.ink, 1.8),

  rocket: () => {
    const body = 'M32 4c8 7 12 17 12 29v13H20V33c0-12 4-22 12-29z';
    return `<g transform="rotate(45 32 32)">
      ${hatch('M25 47c0 7 3 11 7 15 4-4 7-8 7-15z', PENCIL.orange, { dense: true })}
      ${hatch('M20 36 11 47v6l9-5zM44 36l9 11v6l-9-5z', PENCIL.red, { dense: true })}
      ${hatch(body, PENCIL.ink, { opacity: 0.35 })}
      ${hatch(circle(32, 24, 5), PENCIL.blue, { dense: true })}
      ${stroke(body)} ${stroke(circle(32, 24, 5))}
      ${stroke('M20 36 11 47v6l9-5M44 36l9 11v6l-9-5')}
      ${stroke('M25 47c0 7 3 11 7 15 4-4 7-8 7-15', PENCIL.orange, 2)}
    </g>`;
  },

  medal: () =>
    hatch('M20 4h10l6 20H26z', PENCIL.blue, { dense: true }) + hatch('M44 4H34l-6 20h10z', PENCIL.red, { dense: true })
    + stroke('M20 4h10l6 20M44 4H34l-6 20')
    + hatch(circle(32, 42, 18), PENCIL.gold, { opacity: 0.6 })
    + stroke(circle(32, 42, 18)) + stroke(circle(32, 42, 13), PENCIL.ink, 1.3)
    + TEXT(32, 47.5, 13, '100'),

  mountain: () =>
    hatch('M34 35l8-11 19 34H44z', PENCIL.ink, { dense: true, opacity: 0.5 })
    + hatch('M3 58 24 18l10 17-10 23z', PENCIL.ink, { opacity: 0.35 })
    + stroke('M3 58 24 18l10 17 8-11 19 34z')
    + stroke('M17 31l7-13 7 12-4-2-3 3-3-3', PENCIL.ink, 1.7)
    + stroke('M24 18V5') + hatch('M24 5h11l-3 4 3 4H24z', PENCIL.gold, { dense: true }) + stroke('M24 5h11l-3 4 3 4H24', PENCIL.gold, 2),

  comet: () =>
    stroke('M6 8 32 28M4 20l24 13M16 4l20 20', PENCIL.ink, 1.6)
    + hatch(circle(42, 41, 14), PENCIL.purple, { dense: true })
    + stroke(circle(42, 41, 14))
    + stroke('M12 46v8M8 50h8M53 6v6M50 9h6', PENCIL.gold, 2),

  shield: () => {
    const outer = 'M32 4 8 12v18c0 15 10 25 24 30 14-5 24-15 24-30V12z';
    return hatch(outer, PENCIL.gold, { opacity: 0.6 })
      + stroke(outer) + stroke('M32 11 15 17v13c0 10 7 18 17 22 10-4 17-12 17-22V17z', PENCIL.ink, 1.3)
      + `<g transform="translate(32 31) scale(.42) translate(-32 -32)">${hatch(STAR, PENCIL.gold, { dense: true })}${stroke(STAR, PENCIL.ink, 4.5)}</g>`;
  },

  gem: () =>
    hatch('M18 9 26 24 32 58 6 24z', PENCIL.purple, { dense: true })
    + hatch('M46 9 38 24 32 58 58 24z', PENCIL.purple, { opacity: 0.45 })
    + stroke('M18 9h28l12 15-26 34L6 24z')
    + stroke('M6 24h52M18 9l8 15 6 34M46 9l-8 15-6 34M26 24l6-15 6 15', PENCIL.ink, 1.4),

  calendar: () =>
    hatch('M6 19a8 8 0 0 1 8-8h36a8 8 0 0 1 8 8v5H6z', PENCIL.red, { dense: true })
    + stroke(rrect(6, 11, 52, 47, 8)) + stroke('M6 24h52')
    + stroke('M19 5v11M45 5v11', PENCIL.ink, 3.2)
    + TEXT(32, 51, 22, '7'),

  crown: () => {
    const body = 'M7 21l12 12 13-21 13 21 12-12-5 29H12z';
    return hatch(body, PENCIL.gold, { dense: true }) + stroke(body) + stroke('M12 44h40', PENCIL.ink, 1.8)
      + `<g class="gem g1">${hatch(circle(20, 38, 3), PENCIL.blue, { dense: true })}${stroke(circle(20, 38, 3), PENCIL.ink, 1.5)}</g>`
      + `<g class="gem g2">${hatch(circle(32, 36, 4), PENCIL.red, { dense: true })}${stroke(circle(32, 36, 4), PENCIL.ink, 1.6)}</g>`
      + `<g class="gem g3">${hatch(circle(44, 38, 3), PENCIL.green, { dense: true })}${stroke(circle(44, 38, 3), PENCIL.ink, 1.5)}</g>`
      + stroke(`${circle(7, 20, 3)}${circle(32, 10, 3)}${circle(57, 20, 3)}`, PENCIL.ink, 1.8);
  },

  keyboard: () =>
    stroke(rrect(3, 16, 58, 34, 7))
    + [0, 1, 2, 3, 4].map(i => stroke(rrect(9 + i * 10, 22, 6.5, 6, 1.5), PENCIL.ink, 1.4)).join('')
    + [0, 1, 2, 3].map(i => stroke(rrect(14 + i * 10, 31, 6.5, 6, 1.5), PENCIL.ink, 1.4)).join('')
    + hatch(rrect(17, 40, 30, 5, 2), PENCIL.gold, { dense: true }) + stroke(rrect(17, 40, 30, 5, 2), PENCIL.gold, 1.6),

  choice: () =>
    stroke(rrect(6, 6, 23, 23, 6)) + stroke(rrect(35, 6, 23, 23, 6)) + stroke(rrect(6, 35, 23, 23, 6))
    + hatch(rrect(35, 35, 23, 23, 6), PENCIL.gold, { dense: true }) + stroke(rrect(35, 35, 23, 23, 6), PENCIL.gold)
    + stroke('M40 46.5l4.5 4.5 8.5-9.5', PENCIL.ink, 3),

  backspace: () => {
    const body = 'M22 13h33a5 5 0 0 1 5 5v28a5 5 0 0 1-5 5H22L4 32z';
    return hatch(body, PENCIL.ink, { opacity: 0.3 }) + stroke(body) + stroke('M30 24l16 16M46 24 30 40', PENCIL.red, 3);
  },

  globe: () =>
    hatch(circle(32, 32, 24), PENCIL.blue, { opacity: 0.45 })
    + stroke(circle(32, 32, 24))
    + stroke('M32 8c-8 7-12 15-12 24s4 17 12 24M32 8c8 7 12 15 12 24s-4 17-12 24', PENCIL.ink, 1.8)
    + stroke('M9 24h46M9 40h46M32 8v48', PENCIL.ink, 1.5),

  save: () =>
    hatch(rrect(10, 36, 44, 20, 5), PENCIL.gold, { dense: true })
    + stroke('M10 36v15a5 5 0 0 0 5 5h34a5 5 0 0 0 5-5V36')
    + stroke('M32 8v32M20 28l12 12 12-12', PENCIL.gold, 3.2),

  upload: () =>
    hatch(rrect(10, 36, 44, 20, 5), PENCIL.green, { dense: true })
    + stroke('M10 36v15a5 5 0 0 0 5 5h34a5 5 0 0 0 5-5V36')
    + stroke('M32 40V8M20 20 32 8l12 12', PENCIL.green, 3.2),

  copy: () =>
    hatch(rrect(22, 20, 32, 38, 6), PENCIL.gold, { opacity: 0.55 })
    + stroke(rrect(10, 6, 32, 38, 6), PENCIL.ink, 2)
    + stroke(rrect(22, 20, 32, 38, 6))
    + stroke('M29 32h18M29 40h18M29 48h11', PENCIL.ink, 1.8),

  font: () =>
    TEXT(24, 46, 34, 'A') + TEXT(46, 46, 22, 'a')
    + stroke('M10 54h44', PENCIL.gold, 2.6),

  vibrate: () =>
    hatch(rrect(22, 8, 20, 48, 5), PENCIL.purple, { opacity: 0.5 })
    + stroke(rrect(22, 8, 20, 48, 5))
    + stroke('M29 48h6', PENCIL.ink, 2.4)
    + stroke('M14 22l-4 5 4 5-4 5 4 5M50 22l4 5-4 5 4 5-4 5', PENCIL.gold, 2.4),

  lock: () => {
    const body = rrect(12, 28, 40, 30, 6);
    return hatch(body, PENCIL.gold, { opacity: 0.6 }) + stroke(body)
      + stroke('M20 28v-7a12 12 0 0 1 24 0v7') + stroke('M32 40v8', PENCIL.ink, 3.2);
  },

  play: () => {
    const tri = 'M20 10v44l36-22z';
    return hatch(tri, PENCIL.ink, { dense: true, opacity: 0.75 }) + stroke(tri, PENCIL.ink, 3);
  },
};

const OP_SYMBOL = {
  add: () => stroke('M32 19v26M19 32h26', PENCIL.ink, 4),
  sub: () => stroke('M19 32h26', PENCIL.ink, 4),
  mul: () => stroke('M22 22l20 20M42 22 22 42', PENCIL.ink, 4),
  div: () => stroke('M19 32h26', PENCIL.ink, 3.6) + stroke(`${circle(32, 21, 2.2)}${circle(32, 43, 2.2)}`, PENCIL.ink, 2.6),
  pow: () => TEXT(28, 43, 26, 'x') + TEXT(44, 29, 15, '2'),
  pct: () => TEXT(32, 43, 28, '%'),
  frac: () => TEXT(32, 28, 16, '1') + stroke('M22 33.5h20', PENCIL.ink, 2.6) + TEXT(32, 51, 16, '2'),
  order: () => stroke('M24 18c-6 5-6 23 0 28M40 18c6 5 6 23 0 28', PENCIL.ink, 3.4) + stroke(circle(32, 32, 3.5), PENCIL.ink, 2.6),
  cmp: () => stroke('M40 16L20 27L40 38', PENCIL.ink, 3.6) + stroke('M23 44h18', PENCIL.ink, 3.6),
  round: () => stroke('M16 27c5-6 11-6 16 0s11 6 16 0M16 41c5-6 11-6 16 0s11 6 16 0', PENCIL.ink, 3.4),
  neg: () => stroke('M32 14v18M22 23h20M22 44h20', PENCIL.ink, 3.6),
  rem: () => TEXT(32, 30, 15, tr('ост')) + stroke('M20 38h24', PENCIL.ink, 2.4) + TEXT(32, 54, 15, '2'),
  eq: () => TEXT(25, 42, 24, 'x') + stroke('M38 27h14M38 37h14', PENCIL.ink, 3),
  time: () => stroke(circle(32, 34, 20)) + stroke('M32 20v4M32 44v4M18 34h4M46 34h4', PENCIL.ink, 1.8)
    + stroke('M32 34V22M32 34l10 7', PENCIL.ink, 3) + stroke('M24 8h16', PENCIL.ink, 3),
  money: () => stroke(rrect(8, 18, 48, 28, 5)) + stroke(circle(32, 32, 9), PENCIL.ink, 2.6) + TEXT(32, 37, 12, 'Kč'),
  expo: () => TEXT(26, 44, 26, 'a') + TEXT(44, 28, 16, 'n'),
  alg: () => stroke('M16 20c-5 5-5 19 0 24M36 20c5 5 5 19 0 24', PENCIL.ink, 3) + TEXT(26, 38, 13, 'a+b') + TEXT(46, 22, 12, '2'),
  word: () => stroke(rrect(12, 14, 40, 36, 6), PENCIL.ink, 2.6) + stroke('M19 25h26M19 32h26M19 39h14', PENCIL.ink, 2.2),
  geo: () => stroke('M32 13L52 49H12Z', PENCIL.ink, 3) + stroke('M12 49h10v-9', PENCIL.ink, 1.8),
  units: () => stroke('M10 40h44', PENCIL.ink, 2.6) + stroke('M14 40v-8M24 40v-5M34 40v-8M44 40v-5M50 40v-8', PENCIL.ink, 2) + TEXT(32, 28, 13, 'km'),
  stat: () => stroke('M14 48V34M26 48V22M38 48V28M50 48V16', PENCIL.ink, 5) + stroke('M10 30h46', PENCIL.ink, 1.6),
  ratio: () => TEXT(20, 42, 22, 'a') + stroke(`${circle(32, 27, 2.4)}${circle(32, 39, 2.4)}`, PENCIL.ink, 2.6) + TEXT(44, 42, 22, 'b'),
  solid: () => stroke('M16 24l14-8h18v24l-14 8H16z', PENCIL.ink, 2.6) + stroke('M16 24h18v24M34 24l14-8', PENCIL.ink, 2),
  dvs: () => TEXT(25, 42, 24, 'n') + stroke(`${circle(44, 21, 2.4)}${circle(44, 32, 2.4)}${circle(44, 43, 2.4)}`, PENCIL.ink, 2.8),
  sets: () => TEXT(32, 43, 30, '∈'),
  digit: () => TEXT(32, 43, 22, '123'),
  lcm: () => TEXT(32, 41, 17, tr('НОД')),
  fred: () => TEXT(23, 29, 15, '2') + stroke('M13 34h20', PENCIL.ink, 2.4) + TEXT(23, 52, 15, '4')
    + stroke('M38 38h12M45 33l5 5-5 5', PENCIL.ink, 2.4),
  fcmp: () => TEXT(19, 29, 14, '1') + stroke('M10 34h18', PENCIL.ink, 2.2) + TEXT(19, 51, 14, '2') + TEXT(45, 43, 24, '<'),
};

const OP_TINT = {
  add: 'red', sub: 'purple', mul: 'blue', div: 'green', pow: 'gold', pct: 'orange', frac: 'teal',
  order: 'blue', cmp: 'purple', round: 'teal', neg: 'red', rem: 'green', eq: 'gold', time: 'orange', money: 'green', dvs: 'purple', expo: 'gold', alg: 'blue', word: 'orange', geo: 'teal', units: 'blue', stat: 'green', ratio: 'red', solid: 'purple',
  sets: 'blue', digit: 'orange', lcm: 'purple', fred: 'teal', fcmp: 'red',
};

// Иконки рисуются один раз и переиспользуются — это заметно экономит время на отрисовку
const iconCache = new Map();

const svgWrap = (body, cls = '') =>
  `<svg class="ill ${cls}" viewBox="0 0 64 64" aria-hidden="true"><g>${body}</g></svg>`;

/* Спрайт: каждая иконка рисуется один раз как <symbol>, а на экран ставится
   лёгкая ссылка <use>. На главной это 90 узлов вместо 450 — вкладки
   переключаются заметно быстрее, особенно на телефоне. */
const spriteSymbols = new Set();

function iconBody(key, build) {
  if (!iconCache.has(key)) iconCache.set(key, build());
  return iconCache.get(key);
}

function useIcon(id, body, cls) {
  if (!spriteSymbols.has(id)) {
    spriteSymbols.add(id);
    document.getElementById('mfs-sprite').insertAdjacentHTML('beforeend', `<symbol id="${id}" viewBox="0 0 64 64">${body}</symbol>`);
  }
  return `<svg class="ill ${cls}" viewBox="0 0 64 64" aria-hidden="true"><use href="#${id}"/></svg>`;
}

const artBody = name => iconBody(`i:${name}`, () => (ICON_ART[name] || ICON_ART.calc)());

// Иконка по имени (лёгкая ссылка на спрайт)
function ico(name, cls = '') {
  return useIcon(`s-${name}`, artBody(name), `ill-${name} ${cls}`);
}

// Иконка целиком внутри страницы — нужна там, где двигаются её детали:
// стрелка секундомера в игре, волны динамика, рисование карандашом в окнах
function icoInline(name, cls = '') {
  return svgWrap(artBody(name), `ill-${name} ${cls}`);
}

// Плитка действия: карандашная рамка со штриховкой цвета действия
function opIco(op, cls = '') {
  const sym = OP_SYMBOL[op];
  if (!sym) return ico('calc', cls);
  const body = iconBody(`op:${op}`, () => {
    const color = PENCIL[OP_TINT[op]];
    const box = rrect(6, 6, 52, 52, 14);
    return hatch(box, color, { opacity: 0.5 }) + stroke(box, color, 2.8) + sym();
  });
  return useIcon(`s-op-${op}`, body, `ill-op ill-op-${op} ${cls}`);
}
