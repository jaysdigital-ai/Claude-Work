/* ==========================================================================
   The Digital Agila: the desk
   An interactive 3D desk built entirely in code. Every object does something:
   the laptop, tablet and phone fly the camera in and open a real interface on
   their screens; the notebook and the framed eagle photo open our story; the
   business card, the lead printer, the lamp (day / night), the mug and the
   plant all respond to a click. A bald eagle flies loops around the room.
   Content lives in the HTML panels ([data-ui]) so it stays readable and
   indexable.
   ========================================================================== */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.querySelector('[data-desk]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const store = {
  get(k, d) { try { return Number(localStorage.getItem(k)) || d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { /* storage unavailable */ } },
};
const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/* Canvas textures ------------------------------------------------------------ */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.userData.redraw = () => { draw(c.getContext('2d'), w, h); tex.needsUpdate = true; };
  tex.userData.redraw();
  return tex;
}
const rr = (g, x, y, w, h, r, fill) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); };
const font = (size, weight = 500) => `${weight} ${size}px "Instrument Sans", Arial, sans-serif`;

// Oak: long planks with fine grain, colour drift between boards and a few knots
function woodTexture() {
  return canvasTex(2048, 1024, (g, w, h) => {
    const boards = 5, bh = h / boards;
    for (let b = 0; b < boards; b++) {
      const tone = rand(-10, 10);
      g.fillStyle = `rgb(${201 + tone},${166 + tone},${122 + tone})`;
      g.fillRect(0, b * bh, w, bh);
      for (let i = 0; i < 90; i++) {
        const y = b * bh + rand(0, bh), a = rand(0.025, 0.08), amp = rand(2, 9), f = rand(0.002, 0.006);
        g.strokeStyle = `rgba(${Math.random() < 0.55 ? '112,78,44' : '238,214,176'},${a})`;
        g.lineWidth = rand(0.8, 2.6);
        g.beginPath();
        for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * f + i) * amp);
        g.stroke();
      }
      for (let k = 0; k < 2; k++) {
        const kx = rand(100, w - 100), ky = b * bh + rand(20, bh - 20);
        const grd = g.createRadialGradient(kx, ky, 0, kx, ky, 26);
        grd.addColorStop(0, 'rgba(90,60,32,.45)');
        grd.addColorStop(1, 'rgba(90,60,32,0)');
        g.fillStyle = grd;
        g.beginPath(); g.ellipse(kx, ky, 40, 14, 0, 0, 7); g.fill();
      }
      g.fillStyle = 'rgba(80,55,30,.35)';
      g.fillRect(0, b * bh, w, 2);
    }
  });
}
function keyboardTexture() {
  return canvasTex(1024, 384, (g, w, h) => {
    g.fillStyle = '#1d1e21';
    g.fillRect(0, 0, w, h);
    const cols = 14, rows = 5, kw = (w - 40) / cols, kh = (h - 30) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      let x = 20 + c * kw, ww = kw - 8;
      if (r === 4 && c >= 4 && c <= 9) { if (c !== 4) continue; ww = kw * 6 - 8; }
      rr(g, x, 15 + r * kh, ww, kh - 8, 6, '#2b2c30');
    }
  });
}
// Handwritten sticky note
function noteTexture(bg, lines) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, 40);
    grd.addColorStop(0, 'rgba(0,0,0,.08)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, 40);
    g.fillStyle = '#2a2a3a';
    g.font = 'italic 400 34px "Instrument Serif", Georgia, serif';
    lines.forEach((t, i) => g.fillText(t, 22, 78 + i * 46));
  });
}
// Vinyl: grooves plus a centre label
function recordTexture(accent) {
  return canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#0d0d0f'; g.beginPath(); g.arc(c, c, c, 0, 7); g.fill();
    for (let r = 70; r < c - 6; r += 3) {
      g.strokeStyle = `rgba(255,255,255,${r % 9 === 0 ? 0.07 : 0.025})`;
      g.lineWidth = 1; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke();
    }
    const sheen = g.createConicGradient(0.6, c, c);
    sheen.addColorStop(0, 'rgba(255,255,255,0)'); sheen.addColorStop(0.12, 'rgba(255,255,255,.12)');
    sheen.addColorStop(0.25, 'rgba(255,255,255,0)'); sheen.addColorStop(0.62, 'rgba(255,255,255,.08)');
    sheen.addColorStop(0.75, 'rgba(255,255,255,0)');
    g.fillStyle = sheen; g.beginPath(); g.arc(c, c, c - 4, 0, 7); g.fill();
    g.fillStyle = accent; g.beginPath(); g.arc(c, c, 66, 0, 7); g.fill();
    g.fillStyle = '#111'; g.font = font(26, 600); g.textAlign = 'center';
    g.fillText('AGILA', c, c - 12);
    g.font = font(14); g.fillText('See further', c, c + 26);
    g.beginPath(); g.arc(c, c, 6, 0, 7); g.fillStyle = '#ddd'; g.fill();
  });
}
// Print wrapped around the mug: the Agila mark and name
function mugPrint(accent) {
  return canvasTex(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.save();
    g.translate(170, 70); g.scale(2.4, 2.4);
    g.fillStyle = '#1b1b1d'; g.fill(new Path2D('M7 45L6 33 1 27l8 1.5L7 19l7 5.5L15 13l5.5 7 4.5-6.5c4-.5 8 .5 11 2.5l4 1.5-4 10.5-3 3.5-5.5 5.5L24 45z'));
    g.fillStyle = accent; g.fill(new Path2D('M35 15.6l5.5 1q7 2.9 5.9 9.9L44.6 31l-2-3.6q-3.1-1.1-7.2.2L33.6 23z'));
    g.restore();
    g.fillStyle = '#1b1b1d'; g.font = font(44, 600); g.fillText('Agila', 300, 150);
  });
}

/* Screen previews (what the devices show before you open them) -------------- */
function laptopScreen(accent) {
  return canvasTex(1280, 816, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#ece8e0'); bg.addColorStop(1, '#d6d1c7');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, 0, w, 34);
    g.fillStyle = '#111'; g.font = font(18, 600); g.fillText('The Digital Agila', 20, 23);
    g.font = font(17); g.fillStyle = '#444'; ['Services', 'About', 'Contact'].forEach((t, i) => g.fillText(t, 200 + i * 100, 23));
    rr(g, 70, 70, w - 260, h - 180, 16, '#ffffff');
    g.fillStyle = '#e9e6e0'; g.fillRect(70, 70, w - 260, 40);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(96 + i * 22, 90, 7, 0, 7); g.fill(); });
    g.fillStyle = '#111'; g.font = font(40, 600); g.fillText('Seven services, one system.', 110, 175);
    g.fillStyle = '#777'; g.font = font(20); g.fillText('Funnels, automation, CRM, websites, email, SEO and design.', 110, 212);
    for (let i = 0; i < 8; i++) {
      const x = 110 + (i % 4) * 225, y = 250 + Math.floor(i / 4) * 210;
      rr(g, x, y, 205, 130, 10, i % 3 === 0 ? accent : i % 3 === 1 ? '#1d1f24' : '#e8e3da');
      g.fillStyle = '#222'; g.font = font(18, 600); g.fillText(['Funnels', 'Automation', 'Websites', 'CRM', 'Email', 'SEO', 'Design', 'Book a call'][i], x, y + 160);
    }
    ['#2f6df6', '#111', accent, '#28c840', '#ff7a45'].forEach((c, i) => rr(g, w - 140, 90 + i * 110, 70, 70, 16, c));
    rr(g, w / 2 - 230, h - 82, 460, 64, 18, 'rgba(255,255,255,.75)');
    for (let i = 0; i < 7; i++) rr(g, w / 2 - 210 + i * 62, h - 72, 44, 44, 10, i % 2 ? accent : '#2a2b30');
  });
}
function tabletScreen(accent) {
  return canvasTex(1024, 720, (g, w, h) => {
    g.fillStyle = '#111318'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.font = font(34, 600); g.fillText('Growth dashboard', 40, 64);
    g.fillStyle = '#7d8290'; g.font = font(18); g.fillText('Sample data', 40, 94);
    ['Visitors', 'Leads', 'Calls', 'Clients'].forEach((t, i) => {
      rr(g, 40 + i * 240, 120, 220, 110, 14, '#1b1e25');
      g.fillStyle = '#7d8290'; g.font = font(17); g.fillText(t, 60 + i * 240, 154);
      g.fillStyle = '#fff'; g.font = font(36, 600); g.fillText(['12,480', '1,036', '214', '61'][i], 60 + i * 240, 205);
    });
    [1, 0.62, 0.36, 0.18].forEach((f, i) => { rr(g, 40, 270 + i * 64, (w - 480) * f, 46, 10, i ? accent : '#3a3f4b'); });
    g.strokeStyle = accent; g.lineWidth = 5; g.beginPath();
    for (let x = 0; x <= 360; x += 30) g.lineTo(620 + x, 560 - Math.sin(x * 0.02) * 40 - x * 0.5);
    g.stroke();
    rr(g, 600, 270, 380, 320, 14, 'rgba(255,255,255,.03)');
  });
}
function phoneScreen(accent) {
  return canvasTex(420, 880, (g, w, h) => {
    g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, w, h);
    g.fillStyle = accent; g.fillRect(0, 0, w, 120);
    g.fillStyle = '#111'; g.font = font(28, 600); g.fillText('Agila assistant', 30, 84);
    const bubbles = [[0, 'Hi! Want more leads?'], [1, 'Yes, and less admin.'], [0, 'Funnels + automation it is.'], [1, 'How do we start?'], [0, 'Book a free call ↓']];
    bubbles.forEach(([me, t], i) => {
      g.font = font(22);
      const tw = g.measureText(t).width + 40;
      rr(g, me ? w - tw - 24 : 24, 160 + i * 110, tw, 70, 22, me ? '#1d1f24' : '#ffffff');
      g.fillStyle = me ? '#fff' : '#111';
      g.fillText(t, (me ? w - tw - 24 : 24) + 20, 160 + i * 110 + 44);
    });
    rr(g, 24, h - 110, w - 48, 70, 35, accent);
  });
}
function cardTexture(accent) {
  return canvasTex(700, 420, (g, w, h) => {
    g.fillStyle = '#f6f3ec'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#111'; g.font = 'italic 400 46px "Instrument Serif", Georgia, serif';
    g.fillText('The Digital', 50, 120);
    g.font = font(64, 600); g.fillText('Agila', 50, 185);
    g.fillStyle = accent; g.fillRect(50, 215, 80, 6);
    g.fillStyle = '#333'; g.font = font(26, 500); g.fillText('Jayson Perucho', 50, 300);
    g.fillStyle = '#777'; g.font = font(21); g.fillText('Digital Marketing Specialist', 50, 335);
    g.fillText('hello@thedigitalagila.com', 50, 370);
  });
}
function receiptTexture() {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#333';
    for (let y = 30; y < h; y += 26) g.fillRect(24, y, rand(80, w - 48), 6);
  });
}
function glowTexture() {
  return canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,.4)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  });
}

/* Flying bald eagle --------------------------------------------------------
   Built from extruded shapes: body, white head with a hooked yellow beak,
   white fanned tail, and two-part wings (arm + hand) with splayed primary
   feathers. Wings hinge at the shoulder and wrist so the beat looks real. */
function extrudeFlat(shape, depth = 0.05) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
  g.rotateX(Math.PI / 2);          // shape +y (forward) -> world +z
  g.translate(0, depth / 2, 0);
  return g;
}
function innerWingShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.22);
  s.bezierCurveTo(0.4, 0.36, 0.9, 0.36, 1.3, 0.28);
  s.lineTo(1.3, -0.52);
  for (let i = 0; i < 7; i++) {
    const x0 = 1.3 - (i / 7) * 1.3, x1 = 1.3 - ((i + 1) / 7) * 1.3, y = -0.52 + (i / 7) * 0.16;
    s.quadraticCurveTo((x0 + x1) / 2, y - 0.1, x1, y + 0.02);
  }
  s.lineTo(0, 0.22);
  return s;
}
function outerWingShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.28);
  s.bezierCurveTo(0.35, 0.29, 0.65, 0.24, 0.85, 0.17);
  for (let i = 0; i < 6; i++) {
    const t = i / 5, top = 0.17 - t * 0.6, bottom = top - 0.08, bx = 0.85 - t * 0.16;
    const len = 1.0 - t * 0.38, ang = 0.22 - t * 0.62;
    const tx = bx + Math.cos(ang) * len, ty = top - 0.04 + Math.sin(ang) * len;
    s.lineTo(bx, top);
    s.quadraticCurveTo(tx - 0.18, ty + 0.06, tx, ty);
    s.quadraticCurveTo(tx - 0.14, ty - 0.07, bx + 0.02, bottom);
    if (i < 5) s.lineTo(bx - 0.05, bottom - 0.012);
  }
  s.lineTo(0.35, -0.52);
  s.lineTo(0, -0.52);
  s.lineTo(0, 0.28);
  return s;
}
function tailShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.14, 0);
  s.lineTo(-0.38, -0.66);
  for (let i = 0; i < 8; i++) {
    const x0 = -0.38 + (i / 8) * 0.76, x1 = -0.38 + ((i + 1) / 8) * 0.76;
    s.quadraticCurveTo((x0 + x1) / 2, -0.78, x1, -0.66);
  }
  s.lineTo(0.14, 0);
  s.lineTo(-0.14, 0);
  return s;
}
function beakGeometry() {
  const s = new THREE.Shape();      // x forward, y up: deep, hooked
  s.moveTo(0, 0.08);
  s.quadraticCurveTo(0.16, 0.12, 0.26, 0.03);
  s.quadraticCurveTo(0.31, -0.05, 0.24, -0.13);
  s.lineTo(0.21, -0.05);
  s.quadraticCurveTo(0.12, -0.03, 0, -0.06);
  s.lineTo(0, 0.08);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.11, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2 });
  g.translate(0, 0, -0.055);
  g.rotateY(-Math.PI / 2);
  return g;
}
function buildFlyingEagle() {
  const brown = new THREE.MeshStandardMaterial({ color: '#3b2a1f', roughness: 0.75, flatShading: true, side: THREE.DoubleSide });
  const brownDark = new THREE.MeshStandardMaterial({ color: '#2a1d15', roughness: 0.75, flatShading: true, side: THREE.DoubleSide });
  const white = new THREE.MeshStandardMaterial({ color: '#f1eee7', roughness: 0.7, side: THREE.DoubleSide });
  const body = new THREE.MeshStandardMaterial({ color: '#3b2a1f', roughness: 0.75 });
  const yellow = new THREE.MeshStandardMaterial({ color: '#e9b02c', roughness: 0.45, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.3 });
  const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };

  const bird = new THREE.Group();
  const bodyGeo = new THREE.SphereGeometry(0.3, 32, 24);
  bodyGeo.scale(0.95, 0.8, 2.3);
  bird.add(mesh(bodyGeo, body));

  const head = new THREE.Group();
  head.position.set(0, 0.12, 0.72);
  const skull = new THREE.SphereGeometry(0.21, 32, 24);
  skull.scale(0.9, 0.95, 1.2);
  head.add(mesh(skull, white));
  const neck = new THREE.SphereGeometry(0.24, 28, 20);
  neck.scale(1, 0.9, 1);
  const neckMesh = mesh(neck, white);
  neckMesh.position.set(0, -0.06, -0.14);
  head.add(neckMesh);
  const beak = mesh(beakGeometry(), yellow);
  beak.position.set(0, -0.02, 0.2);
  head.add(beak);
  [-1, 1].forEach((s) => {
    const eye = mesh(new THREE.SphereGeometry(0.03, 8, 8), dark);
    eye.position.set(s * 0.13, 0.05, 0.14);
    head.add(eye);
  });
  bird.add(head);

  const tail = new THREE.Group();
  tail.position.set(0, 0.02, -0.58);
  tail.add(mesh(extrudeFlat(tailShape(), 0.04), white));
  bird.add(tail);

  [-1, 1].forEach((s) => {   // tucked yellow feet
    const foot = mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.26, 8), yellow);
    foot.rotation.x = Math.PI / 2 - 0.2;
    foot.position.set(s * 0.09, -0.2, -0.38);
    bird.add(foot);
  });

  const wings = [];
  const innerGeo = extrudeFlat(innerWingShape());
  const outerGeo = extrudeFlat(outerWingShape());
  [1, -1].forEach((side) => {
    const mirror = new THREE.Group();
    mirror.scale.x = side;
    bird.add(mirror);
    const shoulder = new THREE.Group();
    shoulder.position.set(0.2, 0.08, 0.12);
    mirror.add(shoulder);
    shoulder.add(mesh(innerGeo, brown));
    const wrist = new THREE.Group();
    wrist.position.set(1.3, 0, 0);
    shoulder.add(wrist);
    wrist.add(mesh(outerGeo, brownDark));
    wings.push({ shoulder, wrist });
  });
  return { bird, head, tail, wings };
}

/* Scene ------------------------------------------------------------------------ */
async function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.body.classList.add('no-webgl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  // Lights: daylight from the window, a warm desk lamp at night
  const hemi = new THREE.HemisphereLight('#fff6ea', '#6a5a4a', 0.4);
  const sunLight = new THREE.DirectionalLight('#fff3e2', 0.3);
  sunLight.position.set(-9, 14, 8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -11, right: 11, top: 8, bottom: -8, near: 1, far: 40 });
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.03;
  const fill = new THREE.DirectionalLight('#9fb2d6', 0.35);
  fill.position.set(8, 6, 10);
  scene.add(hemi, sunLight, fill);

  // Materials
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  const M = {
    wood: new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55 }),
    walnut: new THREE.MeshStandardMaterial({ color: '#5b3b25', roughness: 0.5 }),
    white: phys({ color: '#efede8', roughness: 0.38, clearcoat: 0.3 }),
    alu: phys({ color: '#c7c9cd', roughness: 0.3, metalness: 0.9, clearcoat: 0.2, clearcoatRoughness: 0.3 }),
    aluDark: phys({ color: '#8e9095', roughness: 0.35, metalness: 0.9 }),
    graphite: phys({ color: '#2a2b2f', roughness: 0.35, metalness: 0.6, clearcoat: 0.4 }),
    dark: new THREE.MeshStandardMaterial({ color: '#1c1d21', roughness: 0.5, metalness: 0.3 }),
    key: new THREE.MeshStandardMaterial({ color: '#202124', roughness: 0.55 }),
    felt: new THREE.MeshStandardMaterial({ color: '#29292e', roughness: 0.97 }),
    black: new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.6 }),
    glossBlack: phys({ color: '#0e0e10', roughness: 0.15, clearcoat: 1 }),
    chrome: phys({ color: '#e6e6e6', roughness: 0.08, metalness: 1 }),
    accent: phys({ color: '#e39b2b', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
    ceramic: phys({ color: '#f4f1ea', roughness: 0.22, clearcoat: 0.8 }),
    paper: new THREE.MeshStandardMaterial({ color: '#f3eee2', roughness: 0.95 }),
    leaf: phys({ color: '#3d7a44', roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide }),
    leafDark: phys({ color: '#2c5e35', roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide }),
    soil: new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 1 }),
    coffee: phys({ color: '#2e1a10', roughness: 0.12, clearcoat: 1 }),
    cork: new THREE.MeshStandardMaterial({ color: '#b98d5e', roughness: 0.95 }),
    fabric: phys({ color: '#3a3b40', roughness: 1, sheen: 1, sheenColor: '#777a82', sheenRoughness: 0.6 }),
    acetate: phys({ color: '#1a1412', roughness: 0.2, clearcoat: 1 }),
    lens: phys({ color: '#ffffff', roughness: 0.02, transmission: 0.9, thickness: 0.05, transparent: true, opacity: 0.3 }),
  };
  const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const rbox = (w, h, d, r, mat, seg = 4) => shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), mat));
  const cyl = (rt, rb, h, mat, seg = 40) => shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat));
  const sph = (r, mat, seg = 24) => shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat));
  const screenMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

  const objects = {};                 // id -> group (clickable)
  const desk = new THREE.Group();
  scene.add(desk);
  function addObject(id, group, x, z, rotY = 0) {
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    group.userData = { id, baseY: 0, hover: 0, anim: 0 };
    group.traverse((o) => { o.userData.owner = id; });
    desk.add(group);
    objects[id] = group;
    return group;
  }

  /* Desk: oak top on a two-column standing frame ------------------------------ */
  desk.add(at(rbox(17.5, 0.42, 7.6, 0.18, M.wood), 0, -0.21, 0));
  [-7.2, 7.2].forEach((x) => {
    desk.add(at(rbox(0.6, 9, 0.42, 0.08, M.white), x, -4.9, 0));          // column
    desk.add(at(rbox(0.7, 0.28, 6.4, 0.1, M.white), x, -9.3, 0));         // foot
    desk.add(at(rbox(0.5, 0.18, 6.6, 0.06, M.white), x, -0.55, 0));       // top bracket
  });
  desk.add(at(rbox(14.6, 0.3, 0.32, 0.06, M.white), 0, -0.62, -2.2));      // cross beam
  const panel = at(rbox(0.9, 0.12, 0.34, 0.04, M.graphite), 6.4, -0.47, 3.62);
  const panelLed = at(new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.07), new THREE.MeshBasicMaterial({ color: '#7fd4ff', toneMapped: false })), 6.25, -0.47, 3.795);
  desk.add(panel, panelLed);
  desk.add(at(rbox(8.8, 0.05, 4.7, 0.025, M.felt), 0.3, 0.025, 0.15));     // felt mat

  /* Laptop: individual keys, webcam, hinge ------------------------------------ */
  const laptop = new THREE.Group();
  laptop.add(at(rbox(3.8, 0.13, 2.55, 0.07, M.alu), 0, 0.105, 0));
  const keyWell = at(new THREE.Mesh(new THREE.PlaneGeometry(3.36, 1.24), M.black), 0, 0.172, -0.38);
  keyWell.rotation.x = -Math.PI / 2;
  laptop.add(keyWell);
  {
    const keyGeo = new RoundedBoxGeometry(0.2, 0.04, 0.19, 2, 0.025);
    const rows = [[14, 0.22], [14, 0.22], [13, 0.22], [12, 0.22], [12, 0.22]];
    const keys = new THREE.InstancedMesh(keyGeo, M.key, 80);
    const m4 = new THREE.Matrix4();
    let n = 0;
    rows.forEach(([cols, pitch], r) => {
      const z = -0.86 + r * 0.24, offset = (14 - cols) * pitch / 2;
      for (let c = 0; c < cols; c++) {
        if (r === 4 && c >= 4 && c <= 7) continue;             // space bar gap
        m4.makeTranslation(-1.5 + offset + c * pitch, 0.19, z);
        keys.setMatrixAt(n++, m4);
      }
    });
    keys.count = n;
    keys.castShadow = true;
    laptop.add(keys);
    laptop.add(at(rbox(0.92, 0.04, 0.19, 0.025, M.key, 2), -0.05, 0.19, 0.1));   // space bar
  }
  laptop.add(at(rbox(1.5, 0.008, 0.92, 0.04, M.aluDark, 2), 0, 0.172, 0.68));    // trackpad
  const hingeBar = at(cyl(0.06, 0.06, 3.0, M.graphite, 16), 0, 0.15, -1.24);
  hingeBar.rotation.z = Math.PI / 2;
  laptop.add(hingeBar);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.17, -1.24);
  hinge.rotation.x = -0.24;
  hinge.add(at(rbox(3.8, 2.5, 0.07, 0.06, M.alu), 0, 1.25, -0.035));
  hinge.add(at(new THREE.Mesh(new THREE.PlaneGeometry(3.7, 2.4), new THREE.MeshBasicMaterial({ color: '#09090a' })), 0, 1.26, 0.002));
  const laptopScreenMesh = at(new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.2), screenMat(laptopScreen('#e39b2b'))), 0, 1.24, 0.005);
  hinge.add(laptopScreenMesh);
  hinge.add(at(sph(0.025, M.glossBlack, 12), 0, 2.42, 0.01));                      // webcam
  laptop.add(hinge);
  addObject('laptop', laptop, 0.2, -0.4);

  /* Tablet on a folding stand ----------------------------------------------------- */
  const tablet = new THREE.Group();
  tablet.add(at(rbox(1.2, 0.07, 1.0, 0.05, M.alu), 0, 0.035, 0));
  const tArm = at(rbox(0.5, 1.15, 0.07, 0.03, M.alu), 0, 0.6, -0.28);
  tArm.rotation.x = -0.38;
  tablet.add(tArm);
  const tPivot = new THREE.Group();
  tPivot.position.set(0, 1.12, -0.38);
  tPivot.rotation.x = -0.34;
  tPivot.add(rbox(2.75, 1.98, 0.075, 0.13, M.graphite));
  tPivot.add(at(new THREE.Mesh(new THREE.PlaneGeometry(2.66, 1.89), new THREE.MeshBasicMaterial({ color: '#09090a' })), 0, 0, 0.039));
  const tabletScreenMesh = at(new THREE.Mesh(new THREE.PlaneGeometry(2.56, 1.79), screenMat(tabletScreen('#e39b2b'))), 0, 0, 0.041);
  tPivot.add(tabletScreenMesh);
  tPivot.add(at(sph(0.02, M.glossBlack, 10), 0, 0.93, 0.042));
  tablet.add(at(rbox(1.3, 0.08, 0.12, 0.03, M.alu), 0, 0.42, -0.04));             // lip the tablet rests on
  tablet.add(tPivot);
  addObject('tablet', tablet, -4.3, 0.1, 0.38);

  /* Phone on a charging stand ---------------------------------------------------- */
  const phone = new THREE.Group();
  phone.add(at(cyl(0.48, 0.52, 0.1, M.white), 0, 0.05, 0));
  const pArm = at(rbox(0.32, 1.0, 0.1, 0.05, M.white), 0, 0.52, -0.24);
  pArm.rotation.x = -0.25;
  phone.add(pArm);
  const pPivot = new THREE.Group();
  pPivot.position.set(0, 1.18, -0.16);
  pPivot.rotation.x = -0.25;
  pPivot.add(rbox(1.0, 2.05, 0.085, 0.15, M.aluDark));
  pPivot.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.94, 1.99), new THREE.MeshBasicMaterial({ color: '#09090a' })), 0, 0, 0.043));
  const phoneScreenMesh = at(new THREE.Mesh(new THREE.PlaneGeometry(0.88, 1.92), screenMat(phoneScreen('#e39b2b'))), 0, 0, 0.045);
  pPivot.add(phoneScreenMesh);
  pPivot.add(at(rbox(0.3, 0.07, 0.01, 0.035, M.glossBlack, 2), 0, 0.88, 0.05));     // dynamic island
  [[0.51, 0.45, 0.3], [0.51, 0.1, 0.18], [-0.51, 0.5, 0.36]].forEach(([x, y, h]) => pPivot.add(at(rbox(0.03, h, 0.05, 0.012, M.aluDark, 2), x, y, 0)));
  phone.add(pPivot);
  addObject('phone', phone, 3.6, 0.15, -0.32);

  /* Notebook with page block, ribbon and a pen --------------------------------------- */
  const notebook = new THREE.Group();
  notebook.add(at(rbox(2.32, 0.04, 1.62, 0.03, M.black), 0, 0.02, 0));
  notebook.add(at(rbox(2.22, 0.12, 1.54, 0.01, M.paper, 2), 0.02, 0.1, 0));
  notebook.add(at(rbox(2.32, 0.04, 1.62, 0.03, M.black), 0, 0.18, 0));
  notebook.add(at(rbox(0.06, 0.21, 1.64, 0.02, M.accent, 2), 0.86, 0.1, 0));
  const ribbon = at(new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.5), M.accent), -0.5, 0.06, 0.99);
  ribbon.rotation.x = -1.2;
  notebook.add(ribbon);
  const pen = new THREE.Group();
  pen.add(at(cyl(0.045, 0.045, 1.5, M.glossBlack, 18), 0, 0, 0));
  pen.add(at(cyl(0.046, 0.01, 0.2, M.chrome, 18), 0, -0.85, 0));
  pen.add(at(rbox(0.03, 0.55, 0.05, 0.012, M.chrome, 2), 0.05, 0.42, 0));
  pen.rotation.set(0, 0.35, Math.PI / 2);
  pen.position.set(0.05, 0.25, 0.25);
  notebook.add(pen);
  addObject('notebook', notebook, 2.8, 2.15, -0.18);

  /* Business card on a walnut block ---------------------------------------------- */
  const card = new THREE.Group();
  card.add(at(rbox(1.5, 0.3, 0.5, 0.08, M.walnut), 0, 0.15, 0));
  const cardFront = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.82), new THREE.MeshStandardMaterial({ map: cardTexture('#e39b2b'), roughness: 0.7 }));
  const cardPivot = new THREE.Group();
  cardPivot.position.set(0, 0.26, 0.02);
  cardPivot.rotation.x = -0.28;
  cardPivot.add(at(rbox(1.38, 0.84, 0.02, 0.01, M.white, 2), 0, 0.42, 0));
  cardPivot.add(at(cardFront, 0, 0.42, 0.012));
  [-0.4, 0.4].forEach((x) => cardPivot.add(at(rbox(1.36, 0.84, 0.01, 0.01, M.white, 2), x * 0.02, 0.4, -0.03)));   // a couple more cards behind
  card.add(cardPivot);
  addObject('card', card, -1.7, 2.35, 0.12);

  /* Thermal receipt printer ------------------------------------------------------------ */
  const printer = new THREE.Group();
  printer.add(at(rbox(1.7, 0.95, 1.6, 0.14, M.graphite), 0, 0.475, 0));
  printer.add(at(rbox(1.66, 0.32, 1.1, 0.12, M.dark), 0, 1.02, -0.2));          // lid
  printer.add(at(rbox(1.2, 0.03, 0.08, 0.015, M.glossBlack, 2), 0, 1.0, 0.38)); // paper slot
  const led = at(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), new THREE.MeshBasicMaterial({ color: '#33d17a' })), 0.6, 0.72, 0.81);
  printer.add(led);
  [[-0.55, '#e9e9ea'], [-0.3, '#e9e9ea']].forEach(([x, c]) => {
    const b = at(cyl(0.07, 0.07, 0.05, new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }), 20), x, 0.72, 0.8);
    b.rotation.x = Math.PI / 2;
    printer.add(b);
  });
  const paperPivot = new THREE.Group();
  paperPivot.position.set(0, 1.0, 0.4);
  const paperGeo = new THREE.PlaneGeometry(1.0, 1, 1, 12);
  paperGeo.translate(0, 0.5, 0);
  const pp = paperGeo.attributes.position;
  for (let i = 0; i < pp.count; i++) pp.setZ(i, Math.pow(pp.getY(i), 2) * 0.35);  // receipt curls forward
  paperGeo.computeVertexNormals();
  const paper = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({ map: receiptTexture(), roughness: 0.9, side: THREE.DoubleSide }));
  paper.castShadow = true;
  paper.rotation.x = -0.25;
  paper.scale.y = 0.15;
  paperPivot.add(paper);
  printer.add(paperPivot);
  addObject('printer', printer, -6.9, -0.6, 0.22);

  /* Mushroom desk lamp with a cable ------------------------------------------------------- */
  const lamp = new THREE.Group();
  lamp.add(at(cyl(0.55, 0.6, 0.12, M.accent), 0, 0.06, 0));
  lamp.add(at(cyl(0.045, 0.045, 2.2, M.chrome, 16), 0, 1.2, 0));
  const shade = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.98, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.accent));
  shade.scale.y = 0.6;
  shade.position.y = 2.3;
  shade.castShadow = false;
  const shadeInside = new THREE.Mesh(new THREE.SphereGeometry(0.97, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffe2b0', side: THREE.BackSide }));
  shadeInside.scale.y = 0.59;
  shadeInside.position.y = 2.3;
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#fff1d6' });
  const bulb = at(new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 12), bulbMat), 0, 2.25, 0);
  const lampLight = new THREE.SpotLight('#ffcf8a', 0, 18, 1.15, 0.85, 1.6);
  lampLight.position.set(0, 2.15, 0);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(1024, 1024);
  lampLight.shadow.bias = -0.0006;
  lampLight.target.position.set(-2.4, 0, 1);
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffcf8a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  lampGlow.position.y = 2.1;
  lampGlow.scale.set(3.4, 3.4, 1);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.3, 0.05, -0.4), new THREE.Vector3(0.6, 0.03, -1.2), new THREE.Vector3(0.2, 0.03, -2.0), new THREE.Vector3(0.5, 0.03, -2.6),
  ]), 40, 0.025, 8), M.black);
  cable.castShadow = true;
  lamp.add(shade, shadeInside, bulb, lampLight, lampLight.target, lampGlow, cable);
  addObject('lamp', lamp, 7.2, -1.3);

  /* Mug with the Agila print, on a cork coaster --------------------------------------------- */
  const mug = new THREE.Group();
  mug.add(at(cyl(0.64, 0.64, 0.05, M.cork), 0, 0.025, 0));
  const mugBody = shadowed(new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.42, 0), new THREE.Vector2(0.46, 0.04), new THREE.Vector2(0.47, 0.95),
    new THREE.Vector2(0.43, 0.97), new THREE.Vector2(0.41, 0.12), new THREE.Vector2(0, 0.12),
  ], 48), M.ceramic));
  mugBody.position.y = 0.05;
  const printTex = mugPrint('#e39b2b');
  const mugPrintMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.474, 0.474, 0.42, 48, 1, true, -0.6, 2.6), new THREE.MeshStandardMaterial({ map: printTex, transparent: true, roughness: 0.3 }));
  mugPrintMesh.position.y = 0.55;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.41, 40), M.coffee);
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.86;
  const handle = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.065, 14, 28, Math.PI * 1.3), M.ceramic));
  handle.position.set(0.48, 0.55, 0);
  handle.rotation.z = -Math.PI * 0.65;
  const steam = [];
  const steamTex = glowTexture();
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    s.userData.seed = Math.random() * 10;
    mug.add(s);
    steam.push(s);
  }
  mug.add(mugBody, mugPrintMesh, coffee, handle);
  addObject('mug', mug, 5.4, -1.9, -0.9);

  /* Snake plant: curved blades in a glossy pot on a saucer ----------------------------------- */
  const plant = new THREE.Group();
  plant.add(at(cyl(0.7, 0.62, 0.08, M.ceramic), 0, 0.04, 0));
  const pot = shadowed(new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0.08), new THREE.Vector2(0.46, 0.08), new THREE.Vector2(0.6, 1.0), new THREE.Vector2(0.64, 1.04),
    new THREE.Vector2(0.58, 1.04), new THREE.Vector2(0.45, 0.18), new THREE.Vector2(0, 0.18),
  ], 48), M.ceramic));
  plant.add(pot);
  const soil = at(new THREE.Mesh(new THREE.CircleGeometry(0.57, 32), M.soil), 0, 0.96, 0);
  soil.rotation.x = -Math.PI / 2;
  plant.add(soil);
  for (let i = 0; i < 9; i++) plant.add(at(sph(rand(0.03, 0.06), new THREE.MeshStandardMaterial({ color: '#cfc6b8', roughness: 0.8 }), 8), rand(-0.4, 0.4), 0.97, rand(-0.4, 0.4)));
  const leaves = [];
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2 + rand(-0.25, 0.25);
    const h = rand(1.4, 2.6), wdt = rand(0.2, 0.3), bend = rand(0.1, 0.35), twist = rand(-0.4, 0.4);
    const geo = new THREE.PlaneGeometry(wdt, h, 2, 14);
    geo.translate(0, h / 2, 0);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const t = p.getY(k) / h;
      const x = p.getX(k) * Math.pow(Math.max(0, 1 - t), 0.55) * (t < 0.08 ? 0.6 + t * 5 : 1);
      const tw = twist * t;
      p.setXYZ(k, x * Math.cos(tw), p.getY(k), x * Math.sin(tw) + Math.pow(t, 2) * bend * h + Math.abs(p.getX(k)) * -0.4);
    }
    geo.computeVertexNormals();
    const leaf = shadowed(new THREE.Mesh(geo, i % 3 ? M.leaf : M.leafDark));
    leaf.position.set(Math.cos(a) * 0.15, 0.95, Math.sin(a) * 0.15);
    leaf.rotation.set(0, -a + Math.PI / 2, 0);
    leaf.rotateX(rand(0.08, 0.3));
    leaf.userData.base = leaf.rotation.clone();
    plant.add(leaf);
    leaves.push(leaf);
  }
  const drops = [];
  for (let i = 0; i < 14; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), phys({ color: '#8fd3ff', roughness: 0.05, transparent: true, opacity: 0.85 }));
    d.visible = false;
    plant.add(d);
    drops.push(d);
  }
  addObject('plant', plant, 6.5, -3.0);

  /* Picture frame: our namesake ------------------------------------------------------------- */
  const photoFrame = new THREE.Group();
  const photoTex = new THREE.TextureLoader().load('assets/img/eagle-flight.jpg');
  photoTex.colorSpace = THREE.SRGBColorSpace;
  photoTex.anisotropy = 8;
  const framePivot = new THREE.Group();
  framePivot.position.set(0, 0.74, 0);
  framePivot.rotation.x = -0.16;
  framePivot.add(rbox(2.0, 1.45, 0.12, 0.04, M.walnut));
  framePivot.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.82, 1.27), new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.9 })), 0, 0, 0.061));
  framePivot.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.56, 1.04), new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.35 })), 0, 0, 0.063));
  framePivot.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.82, 1.27), phys({ color: '#ffffff', roughness: 0.04, transparent: true, opacity: 0.08 })), 0, 0, 0.068));
  const strut = at(rbox(0.12, 1.2, 0.05, 0.02, M.walnut), 0, 0.6, -0.34);
  strut.rotation.x = 0.42;
  photoFrame.add(framePivot, strut);
  addObject('frame', photoFrame, -4.4, 2.35, 0.32);

  /* Smart speaker with a glowing top -------------------------------------------------------- */
  const speaker = new THREE.Group();
  const speakerBody = sph(0.6, M.fabric, 40);
  speakerBody.scale.y = 0.8;
  speakerBody.position.y = 0.48;
  const speakerTopMat = new THREE.MeshBasicMaterial({ color: '#e39b2b', toneMapped: false, transparent: true, opacity: 0.9 });
  const speakerTop = at(new THREE.Mesh(new THREE.CircleGeometry(0.28, 40), speakerTopMat), 0, 0.965, 0);
  speakerTop.rotation.x = -Math.PI / 2;
  const speakerLight = new THREE.PointLight('#e39b2b', 0, 4, 2);
  speakerLight.position.y = 1.2;
  speaker.add(speakerBody, speakerTop, speakerLight);
  addObject('speaker', speaker, -6.7, 2.2);

  /* Turntable with a spinning record ----------------------------------------------------------- */
  const turntable = new THREE.Group();
  turntable.add(at(rbox(2.3, 0.3, 1.75, 0.08, M.walnut), 0, 0.15, 0));
  turntable.add(at(rbox(2.24, 0.02, 1.69, 0.06, M.glossBlack, 2), 0, 0.31, 0));
  turntable.add(at(cyl(0.72, 0.72, 0.06, M.aluDark, 48), -0.25, 0.34, 0));
  const recordMat = new THREE.MeshStandardMaterial({ map: recordTexture('#e39b2b'), roughness: 0.25, metalness: 0.2 });
  const record = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.02, 64), [M.glossBlack, recordMat, recordMat]));
  record.position.set(-0.25, 0.38, 0);
  turntable.add(record);
  turntable.add(at(cyl(0.02, 0.02, 0.08, M.chrome, 10), -0.25, 0.42, 0));
  const armBase = at(cyl(0.12, 0.14, 0.12, M.chrome, 20), 0.82, 0.38, -0.5);
  const tonearm = new THREE.Group();
  tonearm.position.set(0.82, 0.48, -0.5);
  const armRod = at(cyl(0.022, 0.022, 1.0, M.chrome, 10), 0, 0, 0.5);
  armRod.rotation.x = Math.PI / 2;
  const armHead = at(rbox(0.1, 0.05, 0.16, 0.02, M.glossBlack, 2), 0, -0.02, 1.0);
  tonearm.add(armRod, armHead);
  tonearm.rotation.y = 0.55;
  turntable.add(armBase, tonearm);
  [[0.75, 0.6], [0.95, 0.6]].forEach(([x, z]) => turntable.add(at(cyl(0.06, 0.06, 0.05, M.chrome, 16), x, 0.33, z)));
  addObject('turntable', turntable, 6.1, 2.0, -0.12);

  /* Reading glasses ------------------------------------------------------------------------------ */
  const glasses = new THREE.Group();
  [-0.28, 0.28].forEach((x) => {
    const rim = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.028, 10, 36), M.acetate));
    rim.position.set(x, 0.2, 0);
    const lens = at(new THREE.Mesh(new THREE.CircleGeometry(0.19, 32), M.lens), x, 0.2, 0);
    const temple = at(rbox(0.03, 0.03, 0.9, 0.012, M.acetate, 2), x * 1.75, 0.04, -0.42);
    temple.rotation.y = x > 0 ? -0.15 : 0.15;
    glasses.add(rim, lens, temple);
  });
  const bridge = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 16, Math.PI), M.acetate));
  bridge.position.set(0, 0.25, 0);
  glasses.add(bridge);
  glasses.rotation.x = -1.25;
  glasses.position.y = 0.05;
  const glassesGroup = new THREE.Group();
  glassesGroup.add(glasses);
  glassesGroup.position.set(0.9, 0, 2.7);
  glassesGroup.rotation.y = 0.4;
  desk.add(glassesGroup);

  /* Pen cup ------------------------------------------------------------------------------------- */
  const cup = new THREE.Group();
  cup.add(shadowed(new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.34, 0), new THREE.Vector2(0.36, 0.9), new THREE.Vector2(0.32, 0.9), new THREE.Vector2(0.31, 0.06), new THREE.Vector2(0, 0.06),
  ], 36), M.walnut)));
  [['#111', 0.08, 0.1, 0.12], ['#e39b2b', -0.1, 0.05, -0.1], ['#e8e2d4', 0.02, -0.12, 0.06], ['#2f6df6', -0.06, -0.04, 0.18]].forEach(([c, x, z, tilt]) => {
    const p = at(cyl(0.035, 0.035, 1.5, phys({ color: c, roughness: 0.3, clearcoat: 0.6 }), 12), x, 0.75, z);
    p.rotation.set(tilt, 0, x * 1.5);
    cup.add(p);
  });
  cup.position.set(-2.4, 0, -2.4);
  desk.add(cup);

  /* Handwritten sticky notes ----------------------------------------------------------------- */
  [['#ffe27a', ['Launch funnel', 'Fri ✓'], -2.6, 1.25, 0.25], ['#ffb3c7', ['SEO audit', 'for Maria'], -2.0, 1.75, -0.18], ['#bfe8d4', ['Follow up', 'leads!'], 4.9, 2.6, 0.12]].forEach(([c, lines, x, z, r]) => {
    const n = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.02, 0.8, 2, 0.008), [
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ map: noteTexture(c, lines), roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }),
    ]);
    n.receiveShadow = true;
    n.position.set(x, 0.06, z);
    n.rotation.y = r;
    desk.add(n);
  });

  /* The eagle that flies around the room ----------------------------------------------------- */
  const flyer = buildFlyingEagle();
  const eagleRig = new THREE.Group();
  eagleRig.add(flyer.bird);
  flyer.bird.scale.setScalar(0.85);
  scene.add(eagleRig);
  // A loop around the room with two swoops right past the camera. The swoop
  // points sit two-thirds of the way from the desk to the camera, so they are
  // rebuilt whenever the camera moves (screen size changes).
  let flightPath = null;
  function buildFlight(camAt, lookAt) {
    const swoop = (t, dx, dy) => lookAt.clone().lerp(camAt, t).add(new THREE.Vector3(dx, dy, 0));
    flightPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-12, 7, -3), new THREE.Vector3(-6, 10, -8), new THREE.Vector3(3, 9, -9),
      new THREE.Vector3(11, 7.5, -4), new THREE.Vector3(13, 6.5, 3), new THREE.Vector3(7, 9.5, 10),
      swoop(0.72, 3.2, -1.2), new THREE.Vector3(-6, 10.5, 11), new THREE.Vector3(-10, 6.5, 5),
      new THREE.Vector3(-4, 4.4, 1.5), new THREE.Vector3(3, 5.6, -2), new THREE.Vector3(9, 8.5, 2),
      new THREE.Vector3(5, 12, 12.5), swoop(0.7, -3, -0.4), new THREE.Vector3(-12, 10, 5),
      new THREE.Vector3(-15, 8, -4),
    ], true, 'catmullrom', 0.5);
  }

  /* Theme: palette accent + day / night --------------------------------------------- */
  let night = true;
  const accentColor = new THREE.Color('#e39b2b');
  function applyPalette() {
    const accent = css('--accent', '#e39b2b');
    accentColor.set(accent);
    M.accent.color.set(accent);
    laptopScreenMesh.material.map = laptopScreen(accent);
    tabletScreenMesh.material.map = tabletScreen(accent);
    phoneScreenMesh.material.map = phoneScreen(accent);
    cardFront.material.map = cardTexture(accent);
    recordMat.map = recordTexture(accent);
    mugPrintMesh.material.map = mugPrint(accent);
    speakerTopMat.color.set(accent);
    [laptopScreenMesh, tabletScreenMesh, phoneScreenMesh, cardFront, mugPrintMesh].forEach((m) => { m.material.needsUpdate = true; });
    recordMat.needsUpdate = true;
  }
  function setNight(on) {
    night = on;
    document.body.classList.toggle('is-day', !on);
    objects.lamp.userData.label = on ? 'Desk lamp · turn it off' : 'Desk lamp · turn it on';
  }
  window.addEventListener('agila:theme', applyPalette);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(applyPalette);

  /* Labels ---------------------------------------------------------------------------- */
  const LABELS = {
    laptop: 'Laptop · our services, click to open',
    tablet: 'Tablet · growth dashboard',
    phone: 'Phone · book a free call',
    notebook: 'Notebook · read our story',
    card: 'Business card · take one',
    printer: () => `Lead printer · ${store.get('agila-leads', 0)} printed, tap to print`,
    lamp: 'Desk lamp · turn it off',
    mug: 'Coffee · take a sip',
    plant: () => `Plant · watered ${store.get('agila-water', 0)} times`,
    frame: 'Picture frame · why we are called Agila',
    speaker: 'Smart speaker · tap for a light show',
    turntable: () => (spinning ? 'Turntable · tap to stop the record' : 'Turntable · tap to drop the needle'),
  };
  Object.entries(objects).forEach(([id, g]) => { g.userData.label = LABELS[id]; });
  setNight(true);

  /* Camera rig ------------------------------------------------------------------------- */
  const view = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const tween = { active: false, t: 0, dur: 1.1, from: { pos: new THREE.Vector3(), look: new THREE.Vector3() }, to: { pos: new THREE.Vector3(), look: new THREE.Vector3() }, done: null };
  function homeView(out) {
    const aspect = camera.aspect;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const deskW = aspect < 0.8 ? 16 : 21;     // on phones, crop to the middle of the desk
    const fitW = (deskW / 2) / (Math.tan(vfov / 2) * aspect);
    const dist = Math.max(fitW, 21);
    const dir = new THREE.Vector3(0, 0.62, 0.78).normalize();
    out.look.set(0, aspect < 1 ? 1.2 : 2.6, 0.2);
    out.pos.copy(out.look).addScaledVector(dir, dist);
    return out;
  }
  function flyTo(target, done) {
    tween.from.pos.copy(view.pos);
    tween.from.look.copy(view.look);
    tween.to.pos.copy(target.pos);
    tween.to.look.copy(target.look);
    tween.t = 0;
    tween.dur = reduce ? 0.01 : 1.15;
    tween.active = true;
    tween.done = done;
  }
  // Frame a screen so it fills most of the viewport, facing it square-on
  function screenView(mesh, fill) {
    mesh.updateMatrixWorld();
    const center = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
    const { width, height } = mesh.geometry.parameters;
    const s = new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld);
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const tanV = Math.tan(vfov / 2);
    const dist = Math.max((height * s.y / fill) / (2 * tanV), (width * s.x / fill) / (2 * tanV * camera.aspect));
    return { pos: center.clone().addScaledVector(normal, dist), look: center };
  }
  function objectView(group, offset, lift = 0) {
    const c = new THREE.Vector3();
    group.getWorldPosition(c);
    c.y += lift;
    return { pos: c.clone().add(offset), look: c };
  }
  function projectRect(mesh) {
    const { width, height } = mesh.geometry.parameters;
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => new THREE.Vector3(x * width / 2, y * height / 2, 0).applyMatrix4(mesh.matrixWorld).project(camera));
    const xs = pts.map((p) => (p.x * 0.5 + 0.5) * window.innerWidth);
    const ys = pts.map((p) => (-p.y * 0.5 + 0.5) * window.innerHeight);
    return { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }

  /* Focus: open a device or an object -------------------------------------------------- */
  const panels = {};
  document.querySelectorAll('[data-ui]').forEach((el) => { panels[el.dataset.ui] = el; });
  const back = document.querySelector('[data-desk-back]');
  let focus = null;
  const FOCUS = {
    laptop:   { ui: 'laptop', screen: laptopScreenMesh, fill: 0.84 },
    tablet:   { ui: 'tablet', screen: tabletScreenMesh, fill: 0.8 },
    phone:    { ui: 'phone', screen: phoneScreenMesh, fill: 0.86 },
    notebook: { ui: 'story', offset: new THREE.Vector3(1.2, 6.5, 5.5) },
    card:     { ui: 'card', offset: new THREE.Vector3(0.4, 3.4, 5.2), lift: 0.6 },
    printer:  { ui: 'receipt', offset: new THREE.Vector3(2.4, 4.6, 6.4), lift: 1, before: printLead },
    frame:    { ui: 'story', offset: new THREE.Vector3(1.4, 2.6, 6), lift: 0.8 },
    founder:  { ui: 'founder', offset: new THREE.Vector3(1.6, 3.2, 7), lift: 1.2 },
  };
  function placePanel() {
    if (!focus) return;
    const f = FOCUS[focus];
    const el = panels[f.ui];
    if (f.screen && window.innerWidth < 640 && f.ui !== 'phone') {
      // landscape screens are too small to read on a phone: open them full size
      Object.assign(el.style, { left: '10px', top: '72px', width: `${window.innerWidth - 20}px`, height: `${window.innerHeight - 84}px` });
    } else if (f.screen) {
      const r = projectRect(f.screen);
      Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    }
  }
  function open(id) {
    const f = FOCUS[id];
    if (!f || focus) return;
    focus = id;
    hideTip();
    document.body.classList.add('is-focused');
    if (f.before) f.before();
    // no 3D object for it (the founder card): open the panel without moving the camera
    const target = f.screen ? screenView(f.screen, f.fill) : objects[id] ? objectView(objects[id], f.offset, f.lift || 0) : { pos: view.pos.clone(), look: view.look.clone() };
    flyTo(target, () => {
      placePanel();
      const el = panels[f.ui];
      el.hidden = false;
      requestAnimationFrame(() => el.classList.add('is-open'));
      el.querySelector('a, button, input')?.focus({ preventScroll: true });
    });
    back.hidden = false;
  }
  function close() {
    if (!focus) return;
    const el = panels[FOCUS[focus].ui];
    el.classList.remove('is-open');
    setTimeout(() => { el.hidden = true; }, 300);
    focus = null;
    document.body.classList.remove('is-focused');
    back.hidden = true;
    flyTo(homeView({ pos: new THREE.Vector3(), look: new THREE.Vector3() }));
  }
  back.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.open;
    if (FOCUS[id]) open(id); else act(id);
  }));

  /* Small object actions ------------------------------------------------------------ */
  let sipT = -1, waterT = -1, printT = -1, partyT = -1, spinning = true, recordSpeed = 1;
  let flightU = 0.08, eBank = 0, eFlap = 0.3, ePhase = 0, eagleHold = false;
  const ePos = new THREE.Vector3(), eTan = new THREE.Vector3(), eLook = new THREE.Vector3(), ePrev = new THREE.Vector3(1, 0, 0);
  function printLead() {
    const n = store.get('agila-leads', 0) + 1;
    store.set('agila-leads', n);
    printT = 0;
    const sources = ['Funnel landing page', 'Google search (SEO)', 'Instagram ad', 'Email newsletter', 'Website contact form'];
    const r = panels.receipt;
    r.querySelector('[data-lead-no]').textContent = String(n).padStart(4, '0');
    r.querySelector('[data-lead-src]').textContent = sources[n % sources.length];
    r.querySelector('[data-lead-time]').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function act(id) {
    if (id === 'lamp') setNight(!night);
    if (id === 'mug') sipT = 0;
    if (id === 'plant') { waterT = 0; store.set('agila-water', store.get('agila-water', 0) + 1); }
    if (id === 'speaker') partyT = 0;
    if (id === 'turntable') spinning = !spinning;
    if (tipTarget === id) showTip(id);
  }

  /* Pointer: hover labels and clicks ---------------------------------------------------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tip = document.querySelector('[data-desk-tip]');
  let hovered = null, tipTarget = null, downAt = null;
  function pick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(Object.values(objects), true);
    return hits.length ? hits[0].object.userData.owner || null : null;
  }
  function showTip(id) {
    const l = objects[id].userData.label;
    tip.textContent = typeof l === 'function' ? l() : l;
    tip.hidden = false;
    tipTarget = id;
  }
  function hideTip() { tip.hidden = true; tipTarget = null; }
  renderer.domElement.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    if (focus) return;
    const id = pick(e);
    hovered = id;
    renderer.domElement.style.cursor = id ? 'pointer' : '';
    if (id) { showTip(id); tip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 18}px)`; } else hideTip();
  });
  renderer.domElement.addEventListener('pointerleave', () => { hovered = null; hideTip(); });
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (focus || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const id = pick(e);
    if (!id) return;
    if (FOCUS[id]) open(id); else act(id);
  });

  /* Layout ---------------------------------------------------------------------------------- */
  function layout() {
    // fall back to the window if the stage hasn't been sized yet (a 0 height breaks the eagle's path)
    const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const home = homeView({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
    buildFlight(home.pos, home.look);
    if (!focus) { view.pos.copy(home.pos); view.look.copy(home.look); }
    else {
      const f = FOCUS[focus];
      const t = f.screen ? screenView(f.screen, f.fill) : objects[focus] ? objectView(objects[focus], f.offset, f.lift || 0) : homeView({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
      view.pos.copy(t.pos); view.look.copy(t.look);
    }
  }
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  layout();
  new ResizeObserver(() => { layout(); placePanel(); }).observe(host);

  /* Loop --------------------------------------------------------------------------------------- */
  let time = 0, last = performance.now(), intro = reduce ? 1 : 0, nightMix = 1;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  function frame() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    intro = Math.min(1, intro + dt / 1.8);

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    // Camera: tween between views, gentle parallax at rest, a slow dolly-in on load
    if (tween.active) {
      tween.t = Math.min(1, tween.t + dt / tween.dur);
      const e = ease(tween.t);
      view.pos.lerpVectors(tween.from.pos, tween.to.pos, e);
      view.look.lerpVectors(tween.from.look, tween.to.look, e);
      if (tween.t >= 1) { tween.active = false; if (tween.done) tween.done(); }
    }
    camPos.copy(view.pos);
    camLook.copy(view.look);
    if (!focus && !tween.active) {
      camPos.x += pointer.x * 0.9;
      camPos.y += -pointer.y * 0.5;
      const d = 1 - ease(intro);
      camPos.addScaledVector(camPos.clone().sub(camLook).normalize(), d * 6);
      camPos.x += d * 3;
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    if (focus && !tween.active) placePanel();

    // Day / night
    nightMix += ((night ? 1 : 0) - nightMix) * Math.min(1, dt * 3);
    hemi.intensity = lerp(1.25, 0.32, nightMix);
    sunLight.intensity = lerp(2.6, 0.18, nightMix);
    fill.intensity = lerp(0.5, 0.25, nightMix);
    lampLight.intensity = lerp(0, 38, nightMix);
    lampGlow.material.opacity = nightMix * 0.75;
    bulbMat.color.setScalar(lerp(0.75, 1, nightMix));
    scene.environmentIntensity = lerp(0.85, 0.22, nightMix);
    renderer.toneMappingExposure = lerp(1.0, 1.1, nightMix);

    // Hover lift
    Object.values(objects).forEach((g) => {
      const target = !focus && hovered === g.userData.id ? 1 : 0;
      g.userData.hover += (target - g.userData.hover) * Math.min(1, dt * 10);
      g.position.y = g.userData.hover * 0.08;
    });

    // Mug: lift, tilt for a sip, put it back; steam always rises a little
    if (sipT >= 0) {
      sipT += dt;
      const t = Math.min(1, sipT / 1.8), arc = Math.sin(t * Math.PI);
      mug.position.y += arc * 0.9;
      mug.rotation.z = -arc * 0.55;
      if (sipT > 1.8) { sipT = -1; mug.rotation.z = 0; }
    }
    steam.forEach((s, i) => {
      const k = (time * 0.35 + s.userData.seed) % 1;
      s.position.set(Math.sin(time + i) * 0.12, 1.0 + k * 1.3, Math.cos(time * 0.8 + i) * 0.1);
      s.scale.setScalar(0.25 + k * 0.5);
      s.material.opacity = Math.sin(k * Math.PI) * 0.22 * lerp(0.6, 1, nightMix);
    });

    // Plant: leaves sway; watering sends drops falling
    leaves.forEach((l, i) => {
      const sway = Math.sin(time * 1.2 + i) * 0.025 + (waterT >= 0 ? Math.sin(waterT * 14 + i) * 0.06 * Math.max(0, 1 - waterT) : 0);
      l.rotation.x = l.userData.base.x + sway;
      l.rotation.z = l.userData.base.z + sway;
    });
    if (waterT >= 0) {
      waterT += dt;
      drops.forEach((d, i) => {
        const t = waterT * 1.6 - i * 0.05;
        d.visible = t > 0 && t < 1;
        d.position.set(Math.sin(i * 2.3) * 0.3, 2.6 - t * 1.8, Math.cos(i * 1.7) * 0.3);
      });
      if (waterT > 1.8) { waterT = -1; drops.forEach((d) => { d.visible = false; }); }
    }

    // Printer: paper feeds out
    if (printT >= 0) {
      printT += dt;
      paper.scale.y = 0.15 + Math.min(1, printT / 1.1) * 0.85;
      led.material.color.set(Math.sin(printT * 20) > 0 ? '#33d17a' : '#0b3d22');
      if (printT > 4) { printT = -1; led.material.color.set('#33d17a'); }
    } else if (!focus) paper.scale.y += (0.15 - paper.scale.y) * Math.min(1, dt * 2);

    // Turntable: the record spins up and down; the arm swings onto the record
    recordSpeed += ((spinning ? 1 : 0) - recordSpeed) * Math.min(1, dt * 1.5);
    record.rotation.y -= dt * 3.5 * recordSpeed;
    tonearm.rotation.y += ((spinning ? 0.05 : 0.55) - tonearm.rotation.y) * Math.min(1, dt * 2);

    // Speaker: a slow breathing glow; tapping runs a light show
    if (partyT >= 0) { partyT += dt; if (partyT > 4) partyT = -1; }
    if (partyT >= 0) speakerTopMat.color.setHSL((time * 0.6) % 1, 0.8, 0.55);
    else speakerTopMat.color.copy(accentColor);
    speakerTopMat.opacity = partyT >= 0 ? 0.6 + 0.4 * Math.abs(Math.sin(time * 8)) : 0.45 + 0.35 * Math.sin(time * 1.6);
    speakerLight.color.copy(speakerTopMat.color);
    speakerLight.intensity = partyT >= 0 ? 6 + 6 * Math.abs(Math.sin(time * 8)) : 0;

    // Eagle: flies the loop, banking into turns; beats its wings when climbing
    // or turning hard, glides when descending
    if (!eagleHold) flightU = (flightU + dt / 24) % 1;
    flightPath.getPointAt(flightU, ePos);
    flightPath.getTangentAt(flightU, eTan);
    eagleRig.position.copy(ePos);
    eagleRig.lookAt(eLook.copy(ePos).add(eTan));
    const turn = (ePrev.x * eTan.z - ePrev.z * eTan.x) / Math.max(dt, 0.001);
    ePrev.copy(eTan);
    eBank += (THREE.MathUtils.clamp(turn * 0.9, -0.85, 0.85) - eBank) * Math.min(1, dt * 2.5);
    eagleRig.rotateZ(eBank);
    const effort = THREE.MathUtils.clamp(eTan.y * 4 + Math.abs(turn) * 0.6, 0, 1);
    eFlap = lerp(eFlap, 0.12 + effort * 0.5, Math.min(1, dt * 2));
    const glideHold = 0.5 + 0.5 * Math.sin(time * 0.6);          // periodic glides
    const amp = eFlap * (effort > 0.35 ? 1 : 0.35 + glideHold * 0.65);
    ePhase += dt * (5.2 + effort * 2.5);
    const beat = Math.sin(ePhase) * amp;
    flyer.wings.forEach(({ shoulder, wrist }) => {
      shoulder.rotation.z = beat + 0.08;
      shoulder.rotation.y = Math.cos(ePhase) * amp * 0.18;
      wrist.rotation.z = Math.sin(ePhase - 0.7) * amp * 0.8 + 0.06;
    });
    flyer.bird.position.y = -Math.cos(ePhase) * amp * 0.12;
    flyer.tail.rotation.x = Math.sin(time * 1.3) * 0.08 - eTan.y * 0.4;
    flyer.head.rotation.y = Math.sin(time * 0.5) * 0.25 - eBank * 0.3;

    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(() => { if (!document.hidden) frame(); });
  document.body.classList.add('desk-ready');

  // Test hook (only with ?debug in the URL): where each object and the eagle sit on screen
  if (location.search.includes('debug')) {
    const toScreen = (v) => { const p = v.clone().project(camera); return [Math.round((p.x + 1) / 2 * innerWidth), Math.round((1 - p.y) / 2 * innerHeight), Number(p.z.toFixed(3))]; };
    window.__desk = {
      screenOf: (id) => { const b = new THREE.Box3().setFromObject(objects[id]); return toScreen(b.getCenter(new THREE.Vector3())); },
      eagle: () => ({ screen: toScreen(eagleRig.position), distance: Number(eagleRig.position.distanceTo(camera.position).toFixed(2)), u: Number(flightU.toFixed(3)) }),
      state: () => ({ spinning, recordSpeed: Number(recordSpeed.toFixed(2)), partyT: Number(partyT.toFixed(2)), night }),
      holdEagle: (u) => { eagleHold = u !== null; if (u !== null) flightU = u; },
    };
  }
}

if (host) init();
