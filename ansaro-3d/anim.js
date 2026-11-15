// Живые детали моделей: искры мерцают, угольки поднимаются, лепестки падают, нимбы и шестерёнки крутятся.
import * as THREE from 'three';

const TWINKLE = /^(?:.*_)?(Sparkle|Mote|TinyStar|StarSpeck|Pixel|Firefly|FloatStar|Spark|Star(?:Glow)?)[._]?\d*$/i;
const RISE = /^(?:.*_)?(Ember|FloatBubble|FloatHeart|Bubble|SlimeBubble)[._]?\d*$/i;
const FALL = /^(?:.*_)?(FallingPetal|Raindrop|Flake)[._]?\d*$/i;
const SPIN = /^(?:.*_)?(Halo|RuneRing|Gear|GearHub|FloorGear|PortalSwirl|Swirl)[._]?\d*$/i;

const _b = new THREE.Box3(), _s = new THREE.Vector3();
const GLOW = /^(?:.*_)?(Ember|Mote|Firefly)[._]?\d*$/i;
let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,.85)'); gr.addColorStop(0.45, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace; return glowTex;
}
// кубики-угольки заменяем мягкими светящимися точками
function toGlow(o) {
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  const col = (m.emissive && m.emissive.getHex() ? m.emissive : m.color).clone().multiplyScalar(2.2);
  o.geometry.computeBoundingBox(); o.geometry.boundingBox.getSize(_s);
  const size = Math.max(_s.x * o.scale.x, _s.y * o.scale.y, _s.z * o.scale.z) * 3.2;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
  sp.position.copy(o.position); sp.scale.setScalar(size); sp.name = o.name;
  o.parent.add(sp); o.visible = false;
  return sp;
}

// unit — высота модели в её собственных единицах
export function rigModel(obj, unit) {
  const list = [];
  obj.traverse(o => {
    if (!o.isMesh || !o.parent) return;
    const n = o.name || '';
    let type = TWINKLE.test(n) ? 'twinkle' : RISE.test(n) ? 'rise' : FALL.test(n) ? 'fall' : SPIN.test(n) ? 'spin' : null;
    if (!type) return;
    let tgt = o;
    if (GLOW.test(n)) tgt = toGlow(o);
    const e = { o: tgt, type, p: tgt.position.clone(), s: tgt.scale.clone(), q: tgt.quaternion.clone(), ph: Math.random() * 10, sp: 0.6 + Math.random() * 0.8 };
    if (type === 'spin') {
      // ось вращения — самая тонкая сторона детали (кольцо, шестерёнка)
      o.geometry.computeBoundingBox(); o.geometry.boundingBox.getSize(_s);
      const ax = _s.x <= _s.y && _s.x <= _s.z ? 'x' : _s.y <= _s.z ? 'y' : 'z';
      e.axis = new THREE.Vector3(ax === 'x' ? 1 : 0, ax === 'y' ? 1 : 0, ax === 'z' ? 1 : 0);
      e.sp = (/Gear/i.test(n) ? 0.6 : 0.35) * (Math.random() < 0.5 ? -1 : 1);
    }
    list.push(e);
  });
  return { list, unit };
}

const _q = new THREE.Quaternion();
export function animateRig(rig, t) {
  if (!rig) return;
  const u = rig.unit;
  for (const e of rig.list) {
    const o = e.o;
    if (e.type === 'twinkle') {
      const k = 0.55 + 0.45 * Math.sin(t * 3.1 * e.sp + e.ph) * Math.sin(t * 1.7 + e.ph * 2);
      o.scale.copy(e.s).multiplyScalar(0.45 + Math.max(k, 0) * 0.9);
      o.position.set(e.p.x, e.p.y + Math.sin(t * 0.9 * e.sp + e.ph) * u * 0.012, e.p.z);
    } else if (e.type === 'rise' || e.type === 'fall') {
      const range = u * (e.type === 'rise' ? 0.09 : 0.14);
      const f = ((t * 0.12 * e.sp + e.ph) % 1);
      const dir = e.type === 'rise' ? 1 : -1;
      o.position.set(e.p.x + Math.sin(t * 1.3 + e.ph) * u * 0.006, e.p.y + dir * (f - 0.5) * range, e.p.z);
      o.scale.copy(e.s).multiplyScalar(Math.sin(f * Math.PI) * 0.9 + 0.1);
    } else if (e.type === 'spin') {
      _q.setFromAxisAngle(e.axis, t * e.sp);
      o.quaternion.copy(e.q).multiply(_q);
    }
  }
}
