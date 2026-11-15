// Студийный свет-окружение и «живые» материалы: микрорельеф, стекло, камни, перламутр.
import * as THREE from 'three';

/* ---------- студийное окружение: софтбоксы дают чистые длинные блики ---------- */
export function studioEnvironment(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x07060b, side: THREE.BackSide })));
  const panel = (w, h, pos, k, hex) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(10, 4, [0, 11, 1], 5.5, '#ffffff');      // верхний софтбокс
  panel(2.2, 11, [-11, 1.5, 3], 7, '#ffeedd');    // левый стрип (тёплый)
  panel(2.2, 11, [11, 1.5, -1], 5, '#dde8ff');    // правый стрип (холодный)
  panel(7, 4.5, [-5, 4, 11], 3.2, '#ffffff');     // фронтальный ключ
  panel(5, 3, [6, 2, 10], 1.2, '#ffffff');        // мягкая заливка
  panel(26, 26, [0, -12, 0], 0.08, '#ffffff');    // отражённый от пола
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.015).texture; pm.dispose();
  return tex;
}

/* ---------- текстуры деталей (8 рисунков в двух RGBA-картах) ---------- */
const tl = new THREE.TextureLoader();
function detailTex(url) {
  const t = tl.load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.colorSpace = THREE.NoColorSpace; return t;
}
const TEX = { A: detailTex('detail/detailA.webp?v=1'), B: detailTex('detail/detailB.webp?v=1') };
const CH = { dimples: ['A', 0], wood: ['A', 1], stone: ['A', 2], micro: ['A', 3], weave: ['B', 0], fiber: ['B', 1], cells: ['B', 2], folds: ['B', 3] };

// общая матрица «мир → система модели» (обновляется каждый кадр)
export const detailSpace = { value: new THREE.Matrix4() };
export const detailToView = { value: new THREE.Matrix3() };

/* ---------- что делать с каждым материалом (по имени из Blender) ---------- */
const RULES = [
  // эффекты и свечение — без рельефа, ярче
  [/Spark|Flame|Ember|Glow|Bolt|Lightning|Mote|Speck|Flare|SunRay|Halo|Swirl|Plasma|Neon|Firefly|Star(?!fish)|Arc\d|Rune|Eye$|Lava|Icon/i, { fx: true }],
  [/Bubble/i, { bubble: true }],
  [/Glass/i, { glass: true }],
  [/Diamond|Ruby|Sapphire|Emerald|Amethyst|Crystal|Topaz|Shard|Gem|Sunstone|Carnelian|Lapis|Turquoise|BloodCrystal|FireCrystal|^Ice|IceNeon|VoidFragment|Obsidian/i, { gem: true }],
  [/Liquid/i, { liquid: true }],
  [/Pearl|MoonStone|Moonstone/i, { pearl: true, pat: 'micro', f: 3, b: 0.4, r: 0.1 }],
  [/Gold|Brass|Copper|Silver|Iron|Chrome|Gunmetal|Coin|Metal|SunRay|Crescent|MoonSilver/i, { metal: true, pat: 'dimples', f: 1.6, b: 1.1, r: 0.45 }],
  [/Wood|Bark|Branch|Stick|Stem|Vine/i, { pat: 'wood', f: 1.2, b: 2.2, r: 0.35 }],
  [/Cork/i, { pat: 'stone', f: 4, b: 2.0, r: 0.3 }],
  [/Stone|Rock|Sand|Slate|Crater|Basalt|Marble|Bone|Waffle/i, { pat: 'stone', f: 1.1, b: 2.4, r: 0.4 }],
  [/Velvet|Label|String|Ribbon|Wax|Gift/i, { pat: 'weave', f: 2.2, b: 0.9, r: 0.25, sheen: true }],
  [/Feather|Wing|Leaf|Petal|Seaweed|Holly|Clover|Horn|Claw/i, { pat: 'fiber', f: 1.3, b: 1.2, r: 0.3, sheen: true }],
  [/Snow|Frost|Cloud|Ice/i, { pat: 'cells', f: 1.8, b: 0.9, r: 0.3, sheen: true }],
  [/Coral|Moss|Slime|Mushroom|Shroom|Seashell|Starfish|Rain/i, { pat: 'folds', f: 1.5, b: 1.6, r: 0.35 }],
  [/Candy|Cane|Gumdrop|Cherry|Berry|Lolly|Sprinkle|Frosting|Heart|Charm|Bulb/i, { candy: true, pat: 'micro', f: 3, b: 0.3, r: 0.1 }],
  [/ShellTex/i, { shell: true, pat: 'cells', f: 1.7, b: 0.55, r: 0.25 }],
];
const METAL = RULES.find(([, r]) => r.metal)[1];
function ruleFor(src) {
  const name = src.name || '';
  const glowing = src.emissive && src.emissive.getHex() !== 0 && src.emissiveIntensity > 0;
  for (const [re, r] of RULES) {
    if (!re.test(name)) continue;
    if (r.fx && !glowing) continue;
    if (!r.fx && !r.glass && !r.gem && !r.bubble && !r.liquid && src.metalness >= 0.8) return METAL;
    return r;
  }
  return src.metalness >= 0.8 ? METAL : { pat: 'micro', f: 2.5, b: 0.6, r: 0.2 };
}

const VERT_PARS = `varying vec3 vDP; varying vec3 vDN; uniform mat4 uDSpace;`;
const VERT_MAIN = `
  vec4 dWorld = modelMatrix * vec4(transformed, 1.0);
  vDP = (uDSpace * dWorld).xyz;
  vDN = normalize(mat3(uDSpace) * mat3(modelMatrix) * objectNormal);`;
const FRAG_PARS = `varying vec3 vDP; varying vec3 vDN;
uniform sampler2D uDTex; uniform vec4 uDCh; uniform float uDFreq, uDBump, uDRough; uniform mat3 uDToView;
float dS(vec2 uv) { return dot(texture2D(uDTex, uv), uDCh); }
vec2 dG(vec2 uv) { const float e = 1.5 / 512.0;
  return vec2(dS(uv + vec2(e, 0.)) - dS(uv - vec2(e, 0.)), dS(uv + vec2(0., e)) - dS(uv - vec2(0., e))) / (2.0 * e); }
// высота и наклон рельефа (трипланарно, в системе модели)
float dHeight(vec3 p, vec3 n, out vec3 grad) {
  vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z + 1e-5);
  vec2 gx = dG(p.zy), gy = dG(p.xz), gz = dG(p.xy);
  grad = vec3(0.0, gx.y, gx.x) * w.x + vec3(gy.x, 0.0, gy.y) * w.y + vec3(gz.x, gz.y, 0.0) * w.z;
  return dS(p.zy) * w.x + dS(p.xz) * w.y + dS(p.xy) * w.z;
}`;

function patch(m, rule) {
  const [tk, ci] = CH[rule.pat];
  const chv = new THREE.Vector4(); chv.setComponent(ci, 1);
  const u = {
    uDSpace: detailSpace, uDTex: { value: TEX[tk] }, uDCh: { value: chv },
    uDFreq: { value: rule.f * 0.45 }, uDBump: { value: rule.b * 0.0045 }, uDRough: { value: rule.r },
    uDToView: detailToView,
  };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_PARS)
      .replace('#include <project_vertex>', '#include <project_vertex>' + VERT_MAIN);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_PARS)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        vec3 dGrad; float dH = dHeight(vDP * uDFreq, normalize(vDN), dGrad);
        roughnessFactor = clamp(roughnessFactor * mix(1.0 - uDRough, 1.0 + uDRough, dH), 0.03, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 dn = normalize(vDN); dGrad -= dn * dot(dGrad, dn);
        normal = normalize(normal - uDToView * (dGrad * uDBump * uDFreq));`);
  };
  m.customProgramCacheKey = () => 'detail';
}

/* ---------- перевод материала в «премиальный» ---------- */
export function upgradeMaterial(src) {
  const name = src.name || '';
  const rule = ruleFor(src);
  const m = new THREE.MeshPhysicalMaterial();
  for (const k of ['name', 'color', 'map', 'metalness', 'roughness', 'emissive', 'emissiveMap', 'emissiveIntensity', 'side', 'vertexColors', 'alphaTest', 'opacity', 'transparent', 'aoMap', 'normalMap', 'roughnessMap', 'metalnessMap']) {
    const v = src[k]; if (v === undefined) continue;
    if (v && v.isColor) m[k].copy(v); else m[k] = v;
  }
  m.envMapIntensity = 1.25;
  const base = m.color.clone();
  if (rule.fx) {
    if (m.emissive.getHex() === 0) m.emissive.copy(base);
    m.emissiveIntensity = Math.max(m.emissiveIntensity, 1);
    return m;
  }
  if (rule.glass) {
    Object.assign(m, { transmission: 1, thickness: 0.06, ior: 1.5, roughness: 0.02, metalness: 0, transparent: false, opacity: 1, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
    m.attenuationColor.copy(base); m.attenuationDistance = 1.5; m.color.setRGB(1, 1, 1);
    return m;
  }
  if (rule.bubble) {
    Object.assign(m, { transmission: 1, thickness: 0.01, ior: 1.33, roughness: 0, metalness: 0, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 620], transparent: false, envMapIntensity: 1.8 });
    m.emissiveIntensity *= 0.4;
    return m;
  }
  if (rule.gem) {
    const hsl = {}; base.getHSL(hsl);
    Object.assign(m, { transmission: 0.92, thickness: 0.7, ior: 2.15, dispersion: 4, roughness: 0.0, metalness: 0, clearcoat: 1, clearcoatRoughness: 0, specularIntensity: 1, transparent: false, envMapIntensity: 2.2 });
    m.attenuationColor.copy(base); m.attenuationDistance = 0.35;
    m.color.setHSL(hsl.h, Math.min(1, hsl.s * 0.9), Math.min(0.85, hsl.l * 0.6 + 0.4));
    m.emissiveIntensity *= 0.6;
    m.flatShading = true;
    return m;
  }
  if (rule.liquid) {
    Object.assign(m, { clearcoat: 1, clearcoatRoughness: 0.03, roughness: 0.06, sheen: 0.4, envMapIntensity: 1.5 });
    m.sheenColor.copy(base).lerp(new THREE.Color(1, 1, 1), 0.4);
    return m;
  }
  if (rule.metal) {
    m.metalness = 1; m.roughness = Math.max(0.16, m.roughness); m.envMapIntensity = 1.55;
    m.clearcoat = 0.25; m.clearcoatRoughness = 0.08;
  }
  if (rule.pearl) { Object.assign(m, { iridescence: 0.8, iridescenceIOR: 1.6, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.6 }); m.sheenColor.setRGB(1, 0.92, 0.98); }
  if (rule.candy) { Object.assign(m, { clearcoat: 1, clearcoatRoughness: 0.04, roughness: Math.max(0.25, m.roughness) }); }
  if (rule.sheen) { m.sheen = 1; m.sheenRoughness = 0.45; m.sheenColor.copy(base).lerp(new THREE.Color(1, 1, 1), 0.5); }
  if (rule.shell) { m.clearcoat = 0.7; m.clearcoatRoughness = 0.12; m.roughness = 0.38; }
  patch(m, rule);
  return m;
}
