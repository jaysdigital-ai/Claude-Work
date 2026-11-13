// A different scale model on every page, each with its own piece of direction.
// Click a house (or its "Look inside" tag) to lift the roof and read the details.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const outBack = t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const outCubic = t => 1 - Math.pow(1 - t, 3);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const make = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

const page = document.body.dataset.page || 'home';
const canvas = $('#scene');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) { if (canvas) canvas.remove(); }
if (renderer) start();

function start() {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 1, 400);

  /* ---------- light ---------- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9cfbd, 1.25);
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 70 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5;
  scene.add(hemi, sun, sun.target);
  const dayHemi = new THREE.Color(0xffffff), nightHemi = new THREE.Color(0x5a74b8);
  const daySun = new THREE.Color(0xfff0dc), nightSun = new THREE.Color(0x7d95dd);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ opacity: 0.17 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; ground.receiveShadow = true;
  scene.add(ground);

  /* ---------- shared materials ---------- */
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, ...o });
  const mat = {
    trim: M(0xffffff), lawn: M(0xd4dbc0), earth: M(0xc9bfa9), path: M(0xe9e1d0), deck: M(0xcdb898), brick: M(0xb98a70),
    leafA: M(0x86a873, { flatShading: true }), leafB: M(0x6c9361, { flatShading: true }), trunk: M(0x8a7661),
    tank: M(0x9fb0a4, { roughness: 0.6 }), steel: M(0xb9bec6, { roughness: 0.5 }), inside: M(0xe6dcc8),
    navy: M(0x1d3562, { roughness: 0.7 }), bed: M(0xa9bcd8), sofa: M(0x9db58b), bench: M(0xcfd3d6, { roughness: 0.5 }),
    water: M(0xa9c8d8, { roughness: 0.3 }), dark: M(0x2b3852, { roughness: 0.4 }),
    line: new THREE.MeshBasicMaterial({ color: 0x78b843 }),
  };
  const box = (w, h, d, m, x = 0, y = 0, z = 0, parent) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); o.castShadow = o.receiveShadow = true;
    if (parent) parent.add(o);
    return o;
  };
  const textures = [];
  function textMat(text, bg, fg, size, w = 512, h = 256) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.userData.draw = () => {
      const x = c.getContext('2d');
      x.fillStyle = bg; x.fillRect(0, 0, w, h);
      x.fillStyle = fg; x.font = `600 ${size}px "Instrument Sans", Arial, sans-serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + size * 0.05);
      t.needsUpdate = true;
    };
    t.userData.draw(); textures.push(t);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35 });
  }

  /* ---------- house types ---------- */
  // rooms: [label, x as a fraction of width, z as a fraction of depth, storey, furniture]
  const GROUND = [['Bedroom', -0.31, -0.05, 0, 'bed'], ['Living', 0.2, 0.25, 0, 'sofa'], ['Kitchen', 0.2, -0.3, 0, 'kitchen']];
  const UPPER = [['Main bedroom', 0.31, 0, 1, 'bed'], ['Bedroom 2', -0.2, 0.25, 1, 'bed'], ['Bathroom', -0.2, -0.3, 1, 'bath']];
  const VAR = {
    cottage: {
      W: 5.2, D: 3.6, storeys: 1, wall: 0xf4efe4, roofC: 0x1d3562, doorC: 0x6fae3d, roof: 'gable', rise: 1.55,
      front: 'veranda', boards: true, chimney: true, tank: true, hoist: true, rooms: GROUND,
      spec: { name: 'The weatherboard cottage', sub: 'Single storey · built around 1950',
        facts: [['Bedrooms', '2'], ['Bathrooms', '1'], ['Land', '612 m²'], ['Zoning', 'General Residential']],
        checks: ['Whether the rainwater tank and wood heater were ever approved', 'That the side fence really sits on the title boundary', 'Any easement for the sewer line across the back yard'] },
    },
    family: {
      W: 5.4, D: 4.0, storeys: 2, wall: 0xe9e7dc, roofC: 0x343842, doorC: 0xd2a23e, roof: 'gable', rise: 1.6,
      front: 'porch', boards: true, chimney: true,
      rooms: [['Hall & stairs', -0.31, 0, 0, 'stairs'], ['Living', 0.2, 0.25, 0, 'sofa'], ['Kitchen', 0.2, -0.3, 0, 'kitchen'], ...UPPER],
      spec: { name: 'The family two-storey', sub: 'Two storeys · weatherboard',
        facts: [['Bedrooms', '4'], ['Bathrooms', '2'], ['Land', '780 m²'], ['Zoning', 'General Residential']],
        checks: ['That the second storey has its completion certificate', 'Building and plumbing permits for the upstairs bathroom', 'Whether the driveway crosses a neighbour’s title'] },
    },
    bungalow: {
      W: 6.0, D: 4.0, storeys: 1, wall: 0xdcb9a4, roofC: 0x5d423b, doorC: 0x1d3562, roof: 'hip', rise: 1.5,
      front: 'porch', plinth: 0x9c7462,
      rooms: [['Bedrooms', -0.31, -0.05, 0, 'bed'], ['Living', 0.2, 0.25, 0, 'sofa'], ['Kitchen', 0.2, -0.3, 0, 'kitchen']],
      spec: { name: 'The brick bungalow', sub: 'Single storey · brick veneer, hip roof',
        facts: [['Bedrooms', '3'], ['Bathrooms', '1'], ['Land', '705 m²'], ['Zoning', 'General Residential']],
        checks: ['What stays with the house: blinds, the wood heater, the shed', 'Any mortgage or caveat to be discharged before settlement', 'Rates and land tax, paid up to the day'] },
    },
    townhouse: {
      W: 4.6, D: 4.2, storeys: 2, wall: 0xf1eee6, wall2: 0x2f3d57, roofC: 0x1a2438, doorC: 0x78b843, roof: 'skillion', gap: 0.7,
      front: 'porch', plinth: 0xcfc8b8,
      rooms: [['Entry & stairs', -0.31, 0, 0, 'stairs'], ['Living', 0.2, 0.25, 0, 'sofa'], ['Kitchen', 0.2, -0.3, 0, 'kitchen'], ...UPPER],
      spec: { name: 'The townhouse', sub: 'Two storeys · strata title',
        facts: [['Bedrooms', '3'], ['Bathrooms', '2'], ['Lot', '240 m²'], ['Title', 'Strata']],
        checks: ['Body corporate levies, by-laws and minutes', 'Which walls and which car space are actually yours', 'The insurance the body corporate holds'] },
    },
    modern: {
      W: 6.2, D: 3.8, storeys: 1, wall: 0x3d4350, roofC: 0x23272f, doorC: 0xc98f52, roof: 'skillion', gap: 0.75,
      front: 'none', plinth: 0x2a2e37, bushes: [[2.9, 3.2, 0.4], [3.6, 3.15, 0.3], [4.4, 3.2, 0.36]],
      rooms: [['Bedrooms', -0.31, -0.05, 0, 'bed'], ['Living', 0.2, 0.25, 0, 'sofa'], ['Kitchen', 0.2, -0.3, 0, 'kitchen']],
      spec: { name: 'The new build', sub: 'Single storey · finished last year',
        facts: [['Bedrooms', '3'], ['Bathrooms', '2'], ['Land', '550 m²'], ['Zoning', 'General Residential']],
        checks: ['Certificate of completion and the occupancy permit', 'That the builder’s warranty is still in force', 'Duty and adjustments, worked out to the dollar'] },
    },
    corner: {
      W: 5.6, D: 3.8, storeys: 1, wall: 0xdfe3d3, roofC: 0x8a4a3c, doorC: 0x2f4f7f, roof: 'hip', rise: 1.45,
      front: 'veranda', boards: true, hoist: true, rooms: GROUND,
      spec: { name: 'The corner block', sub: 'Single storey · veranda, hip roof',
        facts: [['Bedrooms', '3'], ['Bathrooms', '1'], ['Land', '830 m²'], ['Zoning', 'General Residential']],
        checks: ['Two street frontages mean two sets of setbacks', 'Whether the veranda was added later, and approved', 'The stormwater easement along the side boundary'] },
    },
    shop: {
      W: 5.6, D: 4.0, storeys: 1, wall: 0xf1ece2, roofC: 0x2a3550, doorC: 0x1d3562, roof: 'flat', front: 'awning', shopfront: true,
      plinth: 0x1d3562, bushes: [],
      rooms: [['Files', -0.31, -0.05, 0, 'shelves'], ['Front desk', 0.2, 0.25, 0, 'desk'], ['Meeting room', 0.2, -0.3, 0, 'table']],
      spec: { name: 'Our shop', sub: 'Shop 1, 12 Sample Street, Lakeview',
        facts: [['Open', 'Mon – Fri, 9 – 5'], ['Phone', '0491 570 156'], ['Parking', 'Out the front'], ['Kettle', 'Usually on']],
        head: 'What happens here', checks: ['Contracts get read before anyone signs them', 'Emily keeps every file on schedule', 'Questions get answered, however small'],
        note: 'Not to scale. The real one has more paperwork.' },
    },
  };

  const PW = 11, PD = 9, H = 2.3, H2 = 2.2, T = 0.12, DW = 0.49, DH = 1.92;
  const fenceZ = PD / 2 - 0.35, FRONT = 0.9;
  const LB = new THREE.Vector3(1.45, 0.86, fenceZ + 0.25);
  const lots = [];

  function furnish(kind, g, x, z) {
    if (kind === 'bed') { box(1.4, 0.35, 0.9, mat.bed, x, 0.28, z, g); box(0.4, 0.12, 0.8, mat.trim, x - 0.48, 0.5, z, g); }
    else if (kind === 'sofa') { box(1.3, 0.4, 0.55, mat.sofa, x, 0.3, z, g); box(1.3, 0.38, 0.14, mat.sofa, x, 0.6, z - 0.2, g); box(0.7, 0.25, 0.45, mat.deck, x, 0.22, z + 0.75, g); }
    else if (kind === 'kitchen') { box(1.7, 0.6, 0.5, mat.bench, x, 0.4, z - 0.25, g); box(0.5, 1.2, 0.5, mat.trim, x + 1.0, 0.7, z - 0.25, g); }
    else if (kind === 'bath') { box(1.2, 0.42, 0.6, mat.trim, x, 0.31, z, g); box(1.0, 0.04, 0.42, mat.water, x, 0.53, z, g); box(0.4, 0.5, 0.35, mat.trim, x + 0.9, 0.35, z, g); }
    else if (kind === 'table') { box(1.2, 0.08, 0.8, mat.deck, x, 0.55, z, g); box(0.1, 0.5, 0.1, mat.deck, x, 0.3, z, g); [-0.8, 0.8].forEach(s => box(0.3, 0.35, 0.3, mat.dark, x + s, 0.27, z, g)); }
    else if (kind === 'desk') { box(1.5, 0.5, 0.6, mat.deck, x, 0.35, z, g); box(0.42, 0.3, 0.04, mat.dark, x, 0.78, z, g); box(0.35, 0.4, 0.35, mat.dark, x, 0.3, z - 0.6, g); }
    else if (kind === 'shelves') { [-0.7, 0, 0.7].forEach(s => { box(0.3, 1.5, 0.9, mat.deck, x - 0.5, 0.85, z + s, g); box(0.31, 0.2, 0.7, mat.sofa, x - 0.5, 0.9, z + s, g); }); }
    else if (kind === 'stairs') { for (let i = 0; i < 7; i++) box(0.26, 0.3 * (i + 1), 0.8, mat.deck, x - 0.6 + i * 0.26, 0.1 + 0.15 * (i + 1), z - 0.6, g); }
  }

  function makeLot(name, o = {}) {
    const v = VAR[name], { W, D } = v, two = v.storeys === 2;
    const hx = 0.4, hz = FRONT - D / 2, fz = D / 2 + 0.01;
    const m = {
      wall: M(v.wall), wall2: M(v.wall2 ?? v.wall), door: M(v.doorC),
      roof: M(v.roofC, { roughness: 0.7, flatShading: v.roof === 'hip' }),
      pane: M(0x34435f, { roughness: 0.25, emissive: 0xffc46a, emissiveIntensity: 0 }),
      boards: M(new THREE.Color(v.wall).multiplyScalar(0.82).getHex()),
    };
    const group = new THREE.Group();
    group.position.x = o.x || 0;
    scene.add(group);
    const pops = [], rooms = [];

    box(PW, 0.5, PD, [mat.earth, mat.earth, mat.lawn, mat.earth, mat.earth, mat.earth], 0, -0.25, 0, group);
    const house = new THREE.Group();
    house.position.set(hx, 0, hz);
    group.add(house);

    const windowAt = (g, x, y, z, w, h, ry = 0) => {
      const n = new THREE.Group();
      box(w + 0.16, h + 0.16, 0.06, mat.trim, 0, 0, 0, n);
      box(w, h, 0.08, m.pane, 0, 0, 0.005, n).castShadow = false;
      box(0.04, h, 0.1, mat.trim, 0, 0, 0.005, n);
      if (h < 1.3) box(w, 0.04, 0.1, mat.trim, 0, 0, 0.005, n);
      box(w + 0.3, 0.06, 0.16, mat.trim, 0, -h / 2 - 0.1, 0.04, n);
      n.position.set(x, y, z); n.rotation.y = ry; g.add(n);
    };

    function storey(g, wm, i) {
      const h = i ? H2 : H, door = i === 0, fw = W / 2 - DW;
      box(W, 0.1, D, mat.inside, 0, 0.05, 0, g);
      if (door) {
        box(fw, h, T, wm, -(DW + fw / 2), h / 2, D / 2 - T / 2, g);
        box(fw, h, T, wm, DW + fw / 2, h / 2, D / 2 - T / 2, g);
        box(DW * 2, h - DH, T, wm, 0, DH + (h - DH) / 2, D / 2 - T / 2, g);
      } else box(W, h, T, wm, 0, h / 2, D / 2 - T / 2, g);
      box(W, h, T, wm, 0, h / 2, -D / 2 + T / 2, g);
      box(T, h, D, wm, -W / 2 + T / 2, h / 2, 0, g);
      box(T, h, D, wm, W / 2 - T / 2, h / 2, 0, g);
      if (v.boards) for (let k = 1; k < 9; k++) {
        const y = k * (h / 9), z = D / 2 + 0.005;
        if (door && y < DH) {
          box(fw, 0.015, 0.02, m.boards, -(DW + fw / 2), y, z, g).castShadow = false;
          box(fw, 0.015, 0.02, m.boards, DW + fw / 2, y, z, g).castShadow = false;
        } else box(W + 0.02, 0.015, 0.02, m.boards, 0, y, z, g).castShadow = false;
        box(0.02, 0.015, D + 0.02, m.boards, W / 2 + 0.005, y, 0, g).castShadow = false;
        box(0.02, 0.015, D + 0.02, m.boards, -W / 2 - 0.005, y, 0, g).castShadow = false;
      }
      if (v.plinth && door) {                                   // a darker base course
        const pm = M(v.plinth);
        box(fw + 0.03, 0.28, 0.06, pm, -(DW + fw / 2), 0.14, D / 2 + 0.02, g);
        box(fw + 0.03, 0.28, 0.06, pm, DW + fw / 2, 0.14, D / 2 + 0.02, g);
        box(W + 0.08, 0.28, 0.06, pm, 0, 0.14, -D / 2 - 0.02, g);
        box(0.06, 0.28, D + 0.08, pm, W / 2 + 0.02, 0.14, 0, g);
        box(0.06, 0.28, D + 0.08, pm, -W / 2 - 0.02, 0.14, 0, g);
      }
      const wx = W * 0.31;
      if (v.shopfront) { windowAt(g, -wx, 1.15, fz, 1.9, 1.5); windowAt(g, wx, 1.15, fz, 1.9, 1.5); }
      else { windowAt(g, -wx, 1.3, fz, 1.0, 1.05); windowAt(g, wx, 1.3, fz, 1.0, 1.05); if (!door) windowAt(g, 0, 1.3, fz, 0.8, 1.05); }
      windowAt(g, W / 2 + 0.01, 1.3, 0.2, 1.2, 1.05, Math.PI / 2);
      windowAt(g, -W / 2 - 0.01, 1.3, -0.5, 0.9, 1.05, -Math.PI / 2);
      // interior: upstairs is the mirror of downstairs
      const s = i ? -1 : 1;
      box(0.08, h - 0.2, D - 0.3, mat.inside, s * -W * 0.115, h / 2, 0, g);
      box(W * 0.56, h - 0.2, 0.08, mat.inside, s * W * 0.19, h / 2, -D * 0.06, g);
      v.rooms.filter(r => r[3] === i).forEach(([label, fx, fzz, , kind]) => {
        furnish(kind, g, fx * W, fzz * D);
        rooms.push({ label, parent: g, pos: new THREE.Vector3(fx * W, 0.9, fzz * D) });
      });
    }
    storey(house, m.wall, 0);

    // door, hung on its left edge so it can open
    box(0.08, DH, 0.16, mat.trim, -DW + 0.04, DH / 2, fz - 0.05, house);
    box(0.08, DH, 0.16, mat.trim, DW - 0.04, DH / 2, fz - 0.05, house);
    box(DW * 2, 0.08, 0.16, mat.trim, 0, DH - 0.04, fz - 0.05, house);
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-DW + 0.08, 0, fz - 0.05);
    house.add(doorPivot);
    box(0.82, 1.78, 0.06, m.door, 0.41, 0.99, 0, doorPivot);
    box(0.06, 0.06, 0.1, mat.steel, 0.7, 0.95, 0.03, doorPivot);

    // what is out the front
    let frontDepth = 0.4;
    if (v.front === 'veranda') {
      const VD = 1.25; frontDepth = VD + 0.35;
      box(W, 0.16, VD, mat.deck, 0, 0.08, D / 2 + VD / 2, house);
      [-W / 2 + 0.1, -0.85, 0.85, W / 2 - 0.1].forEach(x => box(0.1, 1.85, 0.1, mat.trim, x, 1.05, D / 2 + VD - 0.1, house));
      box(W + 0.5, 0.07, VD + 0.35, m.roof, 0, 2.12, D / 2 + VD / 2 + 0.05, house).rotation.x = 0.17;
      box(0.9, 0.1, 0.35, mat.deck, 0, 0.03, D / 2 + VD + 0.17, house);
    } else if (v.front === 'porch') {
      frontDepth = 1.0;
      box(1.9, 0.14, 0.9, mat.deck, 0, 0.07, D / 2 + 0.45, house);
      [-0.8, 0.8].forEach(x => box(0.1, 2.0, 0.1, mat.trim, x, 1.1, D / 2 + 0.78, house));
      box(2.1, 0.09, 1.1, m.roof, 0, 2.14, D / 2 + 0.5, house);
    } else if (v.front === 'awning') {
      frontDepth = 0.3;
      box(W + 0.4, 0.06, 1.2, M(0x78b843), 0, 2.1, D / 2 + 0.55, house).rotation.x = 0.12;
      box(W + 1.2, 0.05, 1.6, mat.path, 0, 0.025, D / 2 + 0.8, house);
    } else box(1.4, 0.1, 0.5, mat.deck, 0, 0.05, D / 2 + 0.25, house);

    // upper storey
    let upper = null;
    if (two) { upper = new THREE.Group(); upper.position.y = H; house.add(upper); storey(upper, m.wall2, 1); }
    const top = upper || house, Ht = two ? H2 : H, topWall = two ? m.wall2 : m.wall;

    // roof
    const roof = new THREE.Group();
    top.add(roof);
    let roofH = 0.2;
    if (v.roof === 'gable') {
      const rise = v.rise, run = D / 2 + 0.38, ang = Math.atan(rise / (D / 2)), slab = run / Math.cos(ang);
      roofH = rise;
      [1, -1].forEach(s => {
        const r = box(W + 0.7, 0.1, slab, m.roof, 0, Ht + rise - (slab / 2) * Math.sin(ang) + 0.05, s * (slab / 2) * Math.cos(ang), roof);
        r.rotation.x = s * ang;
        for (let i = 1; i < 14; i++) box(0.03, 0.03, slab, m.roof, -((W + 0.7) / 2) + i * ((W + 0.7) / 14), 0.06, 0, r).castShadow = false;
      });
      box(W + 0.74, 0.1, 0.16, m.roof, 0, Ht + rise + 0.07, 0, roof);
      const triGeo = new THREE.ExtrudeGeometry(
        new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, rise)]), { depth: T, bevelEnabled: false });
      [-W / 2, W / 2 - T].forEach(x => {
        const g = new THREE.Mesh(triGeo, topWall);
        g.rotation.y = Math.PI / 2; g.position.set(x, Ht, 0); g.castShadow = g.receiveShadow = true; roof.add(g);
      });
    } else if (v.roof === 'hip') {
      roofH = v.rise;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1, v.rise, 4, 1, false, Math.PI / 4), m.roof);
      cone.scale.set((W + 0.8) / Math.SQRT2, 1, (D + 0.8) / Math.SQRT2);
      cone.position.y = Ht + v.rise / 2 + 0.06; cone.castShadow = cone.receiveShadow = true; roof.add(cone);
      box(W + 0.8, 0.08, D + 0.8, mat.trim, 0, Ht + 0.03, 0, roof);
    } else if (v.roof === 'skillion') {
      const gap = v.gap, a = Math.atan(gap / D); roofH = gap;
      box(W + 0.8, 0.1, D / Math.cos(a) + 0.9, m.roof, 0, Ht + gap / 2 + 0.08, 0, roof).rotation.x = -a;
      box(W, gap, T, topWall, 0, Ht + gap / 2, D / 2 - T / 2, roof);
      box(W - 0.7, gap - 0.28, 0.06, m.pane, 0, Ht + gap / 2, D / 2 + 0.01, roof).castShadow = false;
      const triGeo = new THREE.ExtrudeGeometry(
        new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(-D / 2, gap)]), { depth: T, bevelEnabled: false });
      [-W / 2, W / 2 - T].forEach(x => {
        const g = new THREE.Mesh(triGeo, topWall);
        g.rotation.y = Math.PI / 2; g.position.set(x, Ht, 0); g.castShadow = true; roof.add(g);
      });
    } else {
      roofH = 0.6;
      box(W + 0.2, 0.14, D + 0.2, m.roof, 0, Ht + 0.07, 0, roof);
      box(W + 0.2, 0.6, 0.18, m.wall, 0, Ht + 0.3, D / 2, roof);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.36, 0.05),
        [mat.navy, mat.navy, mat.navy, mat.navy, textMat('QUILLMERE CONVEYANCING', '#1b3766', '#f3efe7', 58, 1024, 96), mat.navy]);
      sign.position.set(0, Ht + 0.3, D / 2 + 0.1); roof.add(sign);
    }
    if (v.chimney) {
      box(0.55, 1.5, 0.55, mat.brick, 1.5, Ht + 1.2, -0.75, roof);
      box(0.67, 0.1, 0.67, mat.trim, 1.5, Ht + 1.98, -0.75, roof);
    }
    pops.push({ o: house, delay: 0.15, grow: true });

    // lights
    const porch = new THREE.PointLight(0xffb866, 0, 9, 1.6);
    porch.position.set(hx, 1.9, FRONT + 1.2); group.add(porch);
    const lamp = new THREE.PointLight(0xffd9a8, 0, 12, 1.4);
    lamp.position.set(0, 2.6, 0); house.add(lamp);
    let hall = null;
    if (o.primary) { hall = new THREE.PointLight(0xffc27a, 0, 8, 1.5); hall.position.set(0, 1.6, D / 2 - 1.1); house.add(hall); }

    // path, fence, letterbox
    const p0 = FRONT + frontDepth;
    box(0.95, 0.04, 4.4 - p0, mat.path, hx, 0.02, (4.4 + p0) / 2, group);
    const fence = new THREE.Group(); group.add(fence);
    if (!v.shopfront) {
      for (let x = -PW / 2 + 0.4; x <= PW / 2 - 0.4; x += 0.26) {
        if (Math.abs(x - 0.4) < 0.7) continue;
        box(0.1, 0.62, 0.04, mat.trim, x, 0.33, fenceZ, fence);
      }
      [[-PW / 2 + 0.35, -0.4], [1.2, PW / 2 - 0.35]].forEach(([a, b]) => {
        box(b - a, 0.05, 0.03, mat.trim, (a + b) / 2, 0.2, fenceZ - 0.03, fence);
        box(b - a, 0.05, 0.03, mat.trim, (a + b) / 2, 0.46, fenceZ - 0.03, fence);
      });
    }
    box(0.08, 0.8, 0.08, mat.trim, LB.x, 0.4, LB.z, fence);
    box(0.34, 0.24, 0.5, mat.navy, LB.x, LB.y, LB.z, fence);
    pops.push({ o: fence, delay: 0.75, grow: true });

    // trees and garden
    const tree = (x, z, s, lm) => {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.5, 7), mat.trunk);
      t.position.y = 0.75; t.castShadow = true; g.add(t);
      [[0, 2.0, 0, 0.95], [0.5, 1.65, 0.2, 0.62], [-0.45, 1.75, -0.2, 0.68], [0.1, 2.65, -0.1, 0.6]].forEach(([a, b, c, r]) => {
        const l = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), lm);
        l.position.set(a, b, c); l.rotation.set(a * 3, b, c * 5); l.castShadow = l.receiveShadow = true; g.add(l);
      });
      g.position.set(x, 0, z); g.scale.setScalar(s); group.add(g);
      return g;
    };
    pops.push({ o: tree(W > 5.5 ? 4.75 : 4.5, W > 5.5 ? 2.3 : 1.5, 0.9, mat.leafA), delay: 0.95, s: 0.9 });
    pops.push({ o: tree(4.4, -3.1, 1.25, mat.leafB), delay: 1.1, s: 1.25 });
    pops.push({ o: tree(-4.3, -3.3, 0.8, mat.leafB), delay: 1.2, s: 0.8 });
    const garden = new THREE.Group(); group.add(garden);
    (v.bushes || [[-2.3, 3.2, 0.42], [-1.5, 3.25, 0.34], [2.6, 3.2, 0.4], [3.4, 3.15, 0.3], [4.3, 3.2, 0.36]]).forEach(([x, z, r]) => {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat.leafA);
      b.position.set(x, r * 0.7, z); b.scale.y = 0.8; b.castShadow = true; garden.add(b);
    });
    if (v.tank) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.5, 28), mat.tank);
      tank.position.set(3.85, 0.75, -0.6); tank.castShadow = tank.receiveShadow = true; garden.add(tank);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.06, 28), mat.steel);
      lid.position.set(3.85, 1.52, -0.6); garden.add(lid);
    }
    if (v.hoist) {                                      // rotary clothesline
      const hoist = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 8), mat.steel);
      pole.position.y = 0.95; pole.castShadow = true; hoist.add(pole);
      [0, Math.PI / 2].forEach(r => { box(1.8, 0.03, 0.03, mat.steel, 0, 1.9, 0, hoist).rotation.y = r + Math.PI / 4; });
      [0.85, 0.55].forEach(r => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 4, 4), mat.steel);
        ring.rotation.x = Math.PI / 2; ring.position.y = 1.9; hoist.add(ring);
      });
      hoist.position.set(-3.9, 0, -1.2); garden.add(hoist);
    }
    pops.push({ o: garden, delay: 1.0, grow: true });

    // what you click on
    const total = H + (two ? H2 : 0) + roofH;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, total + 0.4, D + 1.4), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, total / 2, 0.4); hit.castShadow = hit.receiveShadow = false;
    house.add(hit);

    const L = { name, v, W, D, two, hx, hz, group, house, upper, roof, doorPivot, hall, porch, lamp, pane: m.pane, pops, rooms, hit,
      total, insp: 0, on: 1, sx: 1, spec: v.spec };
    hit.userData.lot = L;
    rooms.forEach(r => { r.el = make('span', 'room', r.label); document.body.appendChild(r.el); });

    if (o.primary) {
      // title boundary
      const inset = 0.22, bx = PW / 2 - inset, bz = PD / 2 - inset;
      L.strips = [[-bx, bz, bx, bz], [bx, bz, bx, -bz], [bx, -bz, -bx, -bz], [-bx, -bz, -bx, bz]].map(([x1, z1, x2, z2]) => {
        const len = Math.hypot(x2 - x1, z2 - z1), pivot = new THREE.Group();
        pivot.position.set(x1, 0.03, z1); pivot.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
        const s = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.07), mat.line);
        s.position.x = len / 2; pivot.add(s); pivot.scale.x = 0.0001; group.add(pivot);
        return pivot;
      });
      L.pegs = [[-bx, bz], [bx, bz], [bx, -bz], [-bx, -bz]].map(([x, z]) => {
        const g = new THREE.Group();
        box(0.13, 0.55, 0.13, mat.trim, 0, 0.275, 0, g); box(0.15, 0.12, 0.15, mat.line, 0, 0.6, 0, g);
        g.position.set(x, 0, z); g.scale.setScalar(0.0001); group.add(g);
        return g;
      });
      L.bx = bx;
      // sign board
      const soldMat = textMat('SOLD', '#78b843', '#0d1830', 150);
      const frontMat = page === 'selling' ? textMat('FOR SALE', '#1b3766', '#f3efe7', 92) : soldMat;
      const sold = L.sold = new THREE.Group();
      box(0.09, 1.9, 0.09, mat.trim, 0, 0.95, 0, sold);
      L.board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 0.05), [mat.trim, mat.trim, mat.trim, mat.trim, frontMat, soldMat]);
      L.board.position.set(0, 1.5, 0.07); L.board.castShadow = true; sold.add(L.board);
      sold.position.set(-4.3, 0, fenceZ + 0.35); sold.rotation.y = 0.18; sold.scale.setScalar(0.0001);
      group.add(sold);
    }
    lots.push(L);
    return L;
  }

  /* ------------------------------------------------------------------ */
  /* Direction: every page is a house, a list of camera keys, and extras */
  /* ------------------------------------------------------------------ */
  const BASE = { az: -0.62, el: 0.40, r: 35, tx: 0, ty: 1.1, tz: 0, lift: 0, bound: 0, dusk: 0, sold: 0, door: 0, explode: 0, flip: 0, cx: 0.72, cy: 0.55 };
  const K = o => ({ ...BASE, ...o });
  const V = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  let L0, world, progress = 0, inspected = null, inspectY = 0, ib = 0;
  let vw = 1, vh = 1, mobile = false;

  const PAGES = {
    // pinned sequence: plan view, roof off, street side, dusk
    home: { house: 'cottage', keys: [
      K({}),
      K({ az: -0.12, el: 1.12, r: 33, bound: 1, cx: 0.7, cy: 0.52 }),
      K({ az: 0.62, el: 0.62, r: 30, lift: 1, bound: 1, cx: 0.7, cy: 0.52 }),
      K({ az: -1.02, el: 0.27, r: 27, bound: 1, cx: 0.7, cy: 0.52 }),
      K({ az: -0.42, el: 0.24, r: 26, dusk: 1, sold: 1, cx: 0.7, cy: 0.52 }),
    ] },

    // one slow walk up the garden path; the door opens at the end
    buying: { house: 'family', keys: [
      K({ az: 0.62, el: 0.36, r: 34 }),
      K({ az: 0.38, el: 0.24, r: 27, tz: 1 }),
      K({ az: 0.2, el: 0.15, r: 22, tx: 0.4, tz: 1.5 }),
      K({ az: 0.07, el: 0.1, r: 18, tx: 0.4, ty: 1.2, tz: 1.5, dusk: 0.15 }),
      K({ az: -0.06, el: 0.07, r: 15.5, tx: 0.4, ty: 1.3, tz: 1.2, door: 1, dusk: 1, cx: 0.77 }),
    ] },

    // a turntable, and a board that turns over
    selling: {
      house: 'bungalow',
      keys: [
        K({ az: -1.0, el: 0.3, r: 34, sold: 1 }),
        K({ az: -0.2, el: 0.52, r: 33, sold: 1, bound: 1 }),
        K({ az: 0.9, el: 0.28, r: 32, sold: 1, bound: 1 }),
        K({ az: 0.3, el: 0.22, r: 29, sold: 1 }),
        K({ az: -0.42, el: 0.24, r: 24, sold: 1, flip: 1, tx: -1.6, tz: 1.6 }),
      ],
      update() { L0.board.rotation.y = cur.flip * Math.PI + Math.sin(cur.flip * Math.PI) * 0.5; },
    },

    // exploded drawing: land, boundary, each storey, roof
    conveyancing: {
      house: 'townhouse',
      keys: [
        K({}),
        K({ az: -0.35, el: 0.78, r: 34, bound: 1 }),
        K({ az: -0.1, el: 0.42, r: 40, bound: 1, explode: 0.45, ty: 2.4, cx: 0.64 }),
        K({ az: 0.45, el: 0.3, r: 50, bound: 1, explode: 1, ty: 4.2, cx: 0.6 }),
        K({ az: 0.95, el: 0.28, r: 32, bound: 1 }),
        K({ az: 1.5, el: 0.36, r: 33 }),
      ],
      init() {
        this.tags = $$('.tag').map(e => ({ el: e, at: e.dataset.at }));
        const { W, D, hx, hz } = L0;
        this.pts = {
          roof: e => [hx + W / 2 + 0.5, H + H2 + 0.5 + e * 5.2, hz],
          house: e => [hx + W / 2 + 0.1, 1.3 + e * 1.5, hz + D / 2 - 0.6],
          line: e => [L0.bx, 0.1 + e * 0.75, 2.2],
          land: () => [PW / 2, -0.25, 3.2],
        };
      },
      after() {
        const o = smooth(0.45, 0.95, cur.explode);
        for (const t of this.tags) {
          V.set(...this.pts[t.at](cur.explode)).project(camera);
          t.el.style.opacity = o;
          t.el.style.transform = `translate(${((V.x * 0.5 + 0.5) * vw).toFixed(1)}px, ${((-V.y * 0.5 + 0.5) * vh).toFixed(1)}px) translateY(-50%)`;
        }
      },
    },

    // nothing scrolls here: coins stack up on the lawn as the price moves
    costs: {
      house: 'modern',
      keys: [
        K({ az: -0.6, el: 0.36, r: 33, tx: -1, tz: 1 }),
        K({ az: -0.38, el: 0.34, r: 22, tx: -2.3, ty: 0.9, tz: 1.9 }),
        K({ az: -0.2, el: 0.42, r: 24, tx: -2.3, ty: 0.9, tz: 1.9 }),
      ],
      init() {
        const N = this.N = 64;
        const gold = new THREE.MeshStandardMaterial({ color: 0xe0b85a, roughness: 0.42, metalness: 0.35, emissive: 0x5a3d00, emissiveIntensity: 0.35 });
        this.inst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 28), gold, N);
        this.inst.castShadow = this.inst.receiveShadow = true;
        world.add(this.inst);
        this.v = new Float32Array(N);
        this.j = Array.from({ length: N }, (_, i) => [Math.sin(i * 12.9) * 0.035, Math.cos(i * 7.3) * 0.035, Math.sin(i * 3.1) * 3]);
        this.n = Math.round((window.__duty || 23348) / 1000);
        addEventListener('duty', e => { this.n = Math.min(N, Math.round(e.detail.duty / 1000)); });
        this.o = new THREE.Object3D();
      },
      update(dt) {
        const { v, j, o, N } = this;
        for (let i = 0; i < N; i++) {
          const goal = i < this.n ? 1 : 0;
          const ready = goal ? (i === 0 || v[i - 1] > 0.55) : (i === N - 1 || v[i + 1] < 0.45);
          if (ready) v[i] = lerp(v[i], goal, 1 - Math.exp(-dt * 16));
          const s = Math.floor(i / 16), l = i % 16, e = v[i];
          o.position.set(-4.55 + s * 0.74 + j[i][0], 0.04 + l * 0.074 + (1 - e) * 1.4, 2.45 + (s % 2) * 0.3 + j[i][1]);
          o.rotation.set(0, j[i][2], 0);
          o.scale.setScalar(Math.max(0.0001, e));
          o.updateMatrix(); this.inst.setMatrixAt(i, o.matrix);
        }
        this.inst.instanceMatrix.needsUpdate = true;
      },
    },

    // the mobile conveyancer: a car comes down the street and pulls up outside the shop
    about: {
      house: 'shop',
      keys: [
        K({ az: -1.05, el: 0.24, r: 37, tx: -2, tz: 2.5 }),
        K({ az: -0.8, el: 0.22, r: 32, tx: -1.5, tz: 2.5 }),
        K({ az: -0.5, el: 0.2, r: 28, tx: -0.5, tz: 2.5 }),
        K({ az: -0.2, el: 0.22, r: 25, tx: 0.4, tz: 3 }),
        K({ az: -0.3, el: 0.32, r: 31, tx: 2.5, tz: 2, cx: 0.75 }),
      ],
      init() {
        const rz = PD / 2 + 1.5;
        box(22, 0.5, 3.0, M(0x39425a), 5.5, -0.25, rz, world);
        for (let x = -4; x <= 16; x += 2) box(0.9, 0.02, 0.08, mat.trim, x, 0.005, rz, world).castShadow = false;
        const car = this.car = new THREE.Group();
        box(2.0, 0.46, 0.96, mat.trim, 0, 0.5, 0, car);
        box(2.02, 0.09, 0.98, mat.line, 0, 0.44, 0, car);
        box(1.1, 0.36, 0.86, mat.dark, -0.12, 0.9, 0, car);
        box(1.16, 0.06, 0.9, mat.trim, -0.12, 1.1, 0, car);
        const lampM = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
        [-0.3, 0.3].forEach(z => box(0.04, 0.1, 0.2, lampM, 1.0, 0.56, z, car));
        const tyre = M(0x1b2233, { roughness: 0.8 });
        this.wheels = [[-0.62, 0.5], [0.62, 0.5], [-0.62, -0.5], [0.62, -0.5]].map(([x, z]) => {
          const g = new THREE.Group();
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 16), tyre);
          w.rotation.x = Math.PI / 2; w.castShadow = true; g.add(w);
          box(0.08, 0.3, 0.16, mat.steel, 0, 0, 0, g);
          g.position.set(x, 0.22, z); car.add(g); return g;
        });
        car.position.z = rz + 0.6; car.rotation.y = Math.PI;
        world.add(car);
      },
      update(dt, time) {
        const x = lerp(17.5, 0.5, outCubic(clamp(progress * 1.3)));
        const moving = Math.abs(x - this.car.position.x) > 0.002;
        this.car.position.x = x;
        this.car.position.y = moving ? Math.sin(time * 22) * 0.008 : 0;
        this.wheels.forEach(w => { w.rotation.z = x / 0.22; });
      },
    },

    // the street after dark: four different houses, each lighting up as you read
    reviews: {
      house: 'cottage',
      keys: [
        K({ dusk: 1, az: -0.5, el: 0.3, r: 34 }),
        K({ dusk: 1, az: -0.25, el: 0.26, r: 35, tx: 13, ty: 2.0 }),
        K({ dusk: 1, az: 0.1, el: 0.22, r: 30, tx: 26 }),
        K({ dusk: 1, az: 0.4, el: 0.26, r: 32, tx: 39 }),
        K({ dusk: 1, az: 1.0, el: 0.3, r: 62, tx: 22, tz: 2 }),
      ],
      init() {
        ['family', 'bungalow', 'modern'].forEach((n, k) => {
          const L = makeLot(n, { x: (k + 1) * 13 });
          if (k === 1) L.sx = -1;
        });
      },
      update() {
        lots.forEach((L, i) => {
          const lit = i === 0 ? 1 : smooth(i * 0.2 - 0.07, i * 0.2 + 0.05, progress);
          // only the house you are passing stands up, until the last shot shows the whole street
          const w = L === inspected ? 1 : Math.max(1 - smooth(3, 6.2, Math.abs(cur.tx - i * 13)), smooth(0.8, 0.94, progress));
          const s = Math.max(0.0001, outBack(w));
          L.group.visible = w > 0.01; L.group.scale.set(L.sx * s, s, s);
          L.on = lit * w;
        });
      },
    },

    // send the form and an envelope finds the letterbox
    contact: {
      house: 'corner',
      keys: [
        K({ az: 0.55, el: 0.32, r: 31, tx: 0.8, tz: 2 }),
        K({ az: 0.72, el: 0.22, r: 15, tx: 1.3, ty: 0.8, tz: 4.0 }),
        K({ az: 0.9, el: 0.26, r: 16, tx: 1.3, ty: 0.8, tz: 4.0 }),
      ],
      init() {
        const env = this.env = new THREE.Group();
        box(0.56, 0.03, 0.38, mat.trim, 0, 0, 0, env);
        box(0.1, 0.035, 0.12, mat.line, 0.18, 0, -0.09, env);
        box(0.3, 0.035, 0.02, mat.steel, -0.08, 0, 0.05, env);
        env.visible = false; scene.add(env);
        const fp = this.flag = new THREE.Group();
        box(0.04, 0.28, 0.12, M(0x78b843), 0, 0.14, 0, fp);
        fp.position.set(LB.x + 0.2, LB.y + 0.08, LB.z + 0.1); fp.rotation.x = Math.PI / 2;
        world.add(fp);
        this.sent = -1; this.now = 0;
        addEventListener('enquiry-sent', () => { this.sent = this.now; });
      },
      update(dt, time) {
        this.now = time;
        if (this.sent < 0) return;
        const u = (time - this.sent) / 1.5;
        if (u < 1) {
          const e = u * u * (3 - 2 * u), from = V.copy(camera.position).lerp(camTarget, 0.3);
          from.y += 1.2;
          const mx = (from.x + LB.x) / 2, my = Math.max(from.y, LB.y) + 2.2, mz = (from.z + LB.z) / 2;
          const a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c = e * e;
          this.env.visible = true;
          this.env.position.set(a * from.x + b * mx + c * LB.x, a * from.y + b * my + c * (LB.y + 0.1), a * from.z + b * mz + c * LB.z);
          this.env.rotation.set(e * 7, e * 4, 0.3 * (1 - e));
          this.env.scale.setScalar(lerp(1.5, 0.45, e));
          this.flag.rotation.x = Math.PI / 2;
        } else {
          this.env.visible = false;
          this.flag.rotation.x = (1 - outBack(clamp((u - 1) / 0.5))) * Math.PI / 2;
        }
      },
    },
  };

  const P = PAGES[page] || PAGES.home;
  const KEYS = P.keys;
  const cur = { ...KEYS[0] }, target = { ...KEYS[0] };
  L0 = makeLot(P.house, { primary: true });
  world = L0.group;
  const tallY = L0.two ? 1.0 : 0, tallR = L0.two ? 1.14 : 1;
  cur.ty += tallY; cur.r *= tallR;
  if (P.init) P.init();

  /* ---------- look inside ---------- */
  const peek = make('button', 'peek', '<i></i><span>Look inside</span>');
  peek.type = 'button';
  const spec = make('aside', 'spec');
  spec.setAttribute('aria-live', 'polite');
  document.body.append(peek, spec);

  function closeLot() {
    inspected = null;
    spec.classList.remove('is-on');
    document.documentElement.classList.remove('inspecting');
  }
  function openLot(L) {
    inspected = L; inspectY = scrollY;
    const s = L.spec;
    spec.innerHTML = `
      <button class="spec-x" type="button">Close <span aria-hidden="true">×</span></button>
      <p class="spec-k">Inside</p>
      <h3>${s.name}</h3>
      <p class="spec-sub">${s.sub}</p>
      <dl>${s.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <p class="spec-k">${s.head || 'What we’d check here'}</p>
      <ul>${s.checks.map(c => `<li>${c}</li>`).join('')}</ul>
      <p class="spec-note">${s.note || 'A model, to show what a conveyancer looks at. Not a real listing.'}</p>`;
    spec.classList.add('is-on');
    document.documentElement.classList.add('inspecting');
    $('.spec-x', spec).addEventListener('click', closeLot);
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let shift = 0;
  function pick(x, y) {
    ndc.set((x / vw) * 2 - 1, -((y + shift) / vh) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(lots.filter(L => L.group.visible).map(L => L.hit), false);
    return hits.length ? hits[0].object.userData.lot : null;
  }
  function nearest() {
    let best = null, bd = 1e9;
    for (const L of lots) {
      if (!L.group.visible) continue;
      const d = Math.abs(L.group.position.x - cur.tx);
      if (d < bd) { bd = d; best = L; }
    }
    return best;
  }
  const UI = 'a,button,input,textarea,select,label,.calc,.spec,.peek,.head';
  addEventListener('click', e => {
    if (e.target.closest(UI) || String(getSelection())) return;
    const L = pick(e.clientX, e.clientY);
    if (L) (inspected === L ? closeLot() : openLot(L));
  });
  peek.addEventListener('click', () => { const L = nearest(); if (L) openLot(L); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && inspected) closeLot(); });

  /* ---------- scroll ---------- */
  const zone = $(page === 'home' ? '#process' : '.story');
  const stageBg = $('.stage-bg');
  const steps = $$('#steps .step'), ticks = $$('#ticks li'), figs = $$('#fig span'), stepNo = $('#stepNo');
  let zoneTop = 0, zoneEnd = 1, inZone = 0, activeStep = -1, lastDusk = -1, canHover = false;

  function measure() {
    vw = innerWidth; vh = innerHeight; mobile = vw <= 820;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(vw, vh, false);
    const r = zone.getBoundingClientRect();
    zoneTop = r.top + scrollY; zoneEnd = Math.max(1, zoneTop + r.height - vh);
  }
  addEventListener('resize', measure);
  addEventListener('load', measure);
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); textures.forEach(t => t.userData.draw()); });
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  const pointer = { x: -1, y: -1, ui: true, moved: false };
  addEventListener('pointermove', e => {
    mouse.x = e.clientX / vw - 0.5; mouse.y = e.clientY / vh - 0.5;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.ui = !!e.target.closest(UI); pointer.moved = true;
  }, { passive: true });

  function setTarget(f, a0, a1) {
    const n = KEYS.length - 1, i = Math.min(Math.floor(f), n - 1), t = smooth(a0, a1, f - i);
    const a = KEYS[i], b = KEYS[i + 1];
    for (const k in target) target[k] = lerp(a[k], b[k], t);
    target.ty += tallY; target.r *= tallR;
  }

  function readScroll() {
    const y = scrollY;
    if (page === 'home') {
      const len = zoneEnd - zoneTop;
      const approach = clamp((y - (zoneTop - vh * 0.85)) / (vh * 0.85));
      const g = y < zoneTop ? approach : 1 + Math.min(3, clamp((y - zoneTop) / len) * 3.35);
      setTarget(Math.min(g, 3.9999), 0.18, 0.82);
      inZone = clamp(g); progress = g / 4;
      const s = clamp(Math.round(g) - 1, 0, 3);
      if (s !== activeStep) {
        activeStep = s;
        steps.forEach((e, k) => { e.classList.toggle('is-on', k === s); e.classList.toggle('is-past', k < s); });
        ticks.forEach((e, k) => e.classList.toggle('is-on', k <= s));
        figs.forEach((e, k) => e.classList.toggle('is-on', k === s));
        if (stepNo) stepNo.textContent = '0' + (s + 1);
      }
    } else {
      progress = clamp(y / zoneEnd);
      setTarget(Math.min(progress * (KEYS.length - 1), KEYS.length - 1.0001), 0.08, 0.92);
      inZone = clamp(y / Math.max(1, zoneTop - 0.46 * vh));
    }
    if (inspected) {
      if (Math.abs(y - inspectY) > vh * 0.3) closeLot();
      else {
        const L = inspected;
        Object.assign(target, {
          az: -0.5 * L.sx, el: 0.95, r: L.two ? 40 : 31, tx: L.group.position.x + L.sx * (L.hx + (L.two ? L.W * 0.3 : 0)),
          ty: L.two ? 2.0 : 1.2, tz: L.hz - (L.two ? 1.4 : 1.0), lift: 0, explode: 0, door: 0, cx: 0.45, cy: 0.54,
        });
      }
    }
    // when the zone lets go, the canvas leaves with it
    const over = y - zoneEnd, tf = over > 0 ? `translateY(${-over}px)` : '';
    shift = Math.max(0, over);
    canvas.style.transform = tf;
    if (stageBg) { stageBg.style.transform = tf; stageBg.classList.toggle('is-on', mobile && inZone >= 1 && !inspected); }
    return over < vh;
  }

  /* ---------- frame ---------- */
  const clock = new THREE.Clock();
  let t0 = null;
  const place = (e, x, y) => { e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`; };

  let simTime = 0;
  function frame() {
    requestAnimationFrame(frame);
    tick(Math.min(clock.getDelta(), 0.05));
  }
  function tick(dt) {
    const time = (simTime += dt);
    if (!readScroll()) { peek.classList.remove('is-on'); return; }

    const k = reduced ? 1 : 1 - Math.exp(-dt * 4.2);
    for (const key in cur) cur[key] = lerp(cur[key], target[key], k);
    mouse.sx = lerp(mouse.sx, mouse.x, 1 - Math.exp(-dt * 3));
    mouse.sy = lerp(mouse.sy, mouse.y, 1 - Math.exp(-dt * 3));
    ib = lerp(ib, inspected ? 1 : 0, k);

    if (t0 === null) t0 = time;
    const lt = reduced ? 10 : time - t0;
    const d = cur.dusk;

    if (P.update) P.update(dt, time);

    for (const L of lots) {
      for (const p of L.pops) {
        const u = clamp((lt - p.delay) / 0.9);
        if (p.grow) p.o.scale.y = Math.max(0.0001, outCubic(u));
        else p.o.scale.setScalar(Math.max(0.0001, outBack(u)) * p.s);
      }
      L.insp = lerp(L.insp, L === inspected ? 1 : 0, k);
      const prim = L === L0, i2 = L.insp;
      const lift = prim ? cur.lift : 0, ex = prim ? cur.explode : 0;
      L.house.position.y = ex * 1.5;
      if (L.upper) L.upper.position.set(i2 * L.W * 0.66, H + ex * 1.6 + i2 * 1.3, -i2 * 1.5);
      // scroll lifts the roof a little; looking inside sets it down behind the house
      L.roof.position.set(lift * 0.5 - i2 * 0.3, lift * 2.5 + ex * 2.1 + i2 * 2.6, -lift * 0.7 - i2 * L.D * 1.05);
      L.roof.rotation.z = (lift + i2 * 0.4) * 0.1; L.roof.rotation.x = -(lift + i2 * 0.6) * 0.07;
      L.pane.emissiveIntensity = Math.max(d * d * 2.4 * L.on, prim ? cur.door * 1.6 : 0);
      L.porch.intensity = d * d * 14 * L.on;
      L.lamp.intensity = i2 * (2 + d * 9);
    }
    L0.strips.forEach((s, i) => { s.scale.x = Math.max(0.0001, smooth(i * 0.2, i * 0.2 + 0.4, cur.bound)); s.position.y = 0.03 + cur.explode * 0.75; });
    L0.pegs.forEach((p, i) => { p.scale.setScalar(Math.max(0.0001, outBack(smooth(i * 0.2, i * 0.2 + 0.25, cur.bound)))); });
    L0.doorPivot.rotation.y = cur.door * 1.75;
    L0.hall.intensity = cur.door * 5;
    L0.sold.scale.setScalar(Math.max(0.0001, outBack(smooth(0.55, 0.95, cur.sold))));

    hemi.color.lerpColors(dayHemi, nightHemi, d); hemi.intensity = lerp(1.25, 0.34, d);
    sun.color.lerpColors(daySun, nightSun, d); sun.intensity = lerp(2.7, 0.55, d);
    sun.position.set(cur.tx + 9, 15, 7); sun.target.position.set(cur.tx, 0, 0);
    ground.material.opacity = 0.17 * (1 - d);
    const dq = Math.round(d * 200) / 200;
    if (dq !== lastDusk) { lastDusk = dq; document.documentElement.style.setProperty('--dusk', dq); }

    // camera
    const idle = reduced ? 0 : Math.sin(time * 0.35) * 0.05;
    const az = cur.az + idle + mouse.sx * 0.16;
    const e = clamp(cur.el + mouse.sy * 0.05, 0.04, 1.4);
    const aspect = vw / vh;
    const r = cur.r * (mobile ? Math.max(1, 1.02 / aspect) : Math.max(1, 1.75 / aspect));
    camTarget.set(cur.tx, cur.ty, cur.tz);
    camera.position.set(cur.tx + Math.sin(az) * Math.cos(e) * r, cur.ty + Math.sin(e) * r, cur.tz + Math.cos(az) * Math.cos(e) * r);
    camera.lookAt(camTarget);
    const cx = mobile ? 0.5 : cur.cx;
    const cyM = lerp(page === 'home' ? lerp(0.83, 0.3, inZone) : lerp(0.76, 0.27, inZone), 0.27, ib);
    camera.setViewOffset(vw, vh, (0.5 - cx) * vw, (0.5 - (mobile ? cyM : cur.cy)) * vh, vw, vh);

    renderer.render(scene, camera);
    if (P.after) P.after();

    // hover state, the "Look inside" tag, and room labels
    if (pointer.moved) {
      pointer.moved = false;
      const hov = !pointer.ui && !!pick(pointer.x, pointer.y);
      if (hov !== canHover) { canHover = hov; document.documentElement.classList.toggle('can-inspect', hov); }
    }
    const N = nearest();
    let showPeek = false;
    if (N && !inspected && ib < 0.05 && shift === 0 && cur.lift < 0.25 && cur.explode < 0.03 && lt > 1.6 && N.group.scale.y > 0.9) {
      V.set(N.hx * N.sx, N.total + 0.75, N.hz).add(N.group.position).project(camera);
      const px = (V.x * 0.5 + 0.5) * vw, py = (-V.y * 0.5 + 0.5) * vh;
      if (px > 70 && px < vw - 70 && py > 90 && py < vh - 60) { showPeek = true; place(peek, px, py); }
    }
    peek.classList.toggle('is-on', showPeek);
    for (const L of lots) for (const rm of L.rooms) {
      const o = smooth(0.6, 1, L.insp);
      if (o < 0.01) { if (rm.on) { rm.on = false; rm.el.style.opacity = 0; } continue; }
      rm.on = true;
      V.copy(rm.pos); rm.parent.localToWorld(V); V.project(camera);
      rm.el.style.opacity = o;
      place(rm.el, (V.x * 0.5 + 0.5) * vw, (-V.y * 0.5 + 0.5) * vh);
    }
  }
  frame();
}
