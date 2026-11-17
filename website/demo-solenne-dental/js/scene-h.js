import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BONE = 0xF1ECE4, BRASS = 0xD8B98C, SAGE = 0x9DB4D6, TEAL2 = 0x8EA9D1, TEAL = 0xD5E1F0;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = window.innerWidth < 700;

/* ---------- helpers ---------- */
function toothGeometry(roots = true) {
  const g = new THREE.SphereGeometry(1, 120, 120), p = g.attributes.position;
  const cusps = [[0.42, 0.38], [-0.42, 0.38], [0.42, -0.38], [-0.42, -0.38]];
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), sq = 1 + 0.07 * Math.cos(4 * a);
    let nx = x * 1.06 * sq, nz = z * 0.94 * sq, ny = y;
    if (y > 0) {
      ny = y * 0.82;
      if (y > 0.25) {
        const k = (y - 0.25) / 0.75; ny = 0.205 + (y - 0.25) * 0.5;
        let b = 0; for (const c of cusps) b += Math.exp(-((nx - c[0]) ** 2 + (nz - c[1]) ** 2) / 0.1);
        ny += 0.2 * b * k - 0.07 * Math.exp(-(nx * nx) / 0.015) * k;
      }
    } else if (y < -0.15 && !roots) {
      const t = Math.min(1, (-0.15 - y) / 0.85); ny = -0.15 - t * .06; nx *= 1 - .12 * t; nz *= 1 - .12 * t;
    } else if (y < -0.15) {
      const t = Math.min(1, (-0.15 - y) / 0.85), side = x >= 0 ? 1 : -1, s = 1 - 0.62 * t;
      nx = nx * s + side * 0.34 * Math.pow(t, 0.8); nz *= s;
      ny = -0.15 - t * 1.5 * (1 - 0.72 * Math.exp(-(x * x) / 0.02));
    }
    p.setXYZ(i, nx, ny, nz);
  }
  g.computeVertexNormals(); g.translate(0, roots ? 0.45 : 0, 0);
  return g;
}
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dust(n, spread, color = BRASS, size = 0.03) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * spread; pos[i * 3 + 1] = (Math.random() - .5) * spread * .7; pos[i * 3 + 2] = (Math.random() - .5) * spread * .6; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: dotTexture(), transparent: true, opacity: .5, depthWrite: false }));
}
const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/* ---------- scenes ---------- */
const SCENES = {
  /* Home: a tooth that assembles from glowing particles */
  particles(scene, cam) {
    cam.position.set(0, 0.1, 6.2);
    const root = new THREE.Group(); scene.add(root);
    const mesh = new THREE.Mesh(toothGeometry()); mesh.scale.setScalar(1.5);
    mesh.updateMatrixWorld();
    const sampler = new MeshSurfaceSampler(mesh).build();
    const N = small ? 4200 : 9000, v = new THREE.Vector3();
    const target = new Float32Array(N * 3), start = new Float32Array(N * 3), delay = new Float32Array(N);
    const col = new Float32Array(N * 3), cBlue = new THREE.Color(0x3F5F94), cB = new THREE.Color(BONE), cG = new THREE.Color(BRASS), cS = new THREE.Color(SAGE);
    for (let i = 0; i < N; i++) {
      sampler.sample(v); v.multiplyScalar(1.5);
      target.set([v.x, v.y, v.z], i * 3);
      const r = 5 + Math.random() * 4, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      start.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)], i * 3);
      delay[i] = Math.random() * 0.9;
      const c = Math.random() < .16 ? cG : (Math.random() < .25 ? cS : cBlue);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(start); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: small ? 0.065 : 0.055, vertexColors: true, map: dotTexture(), transparent: true, depthWrite: false, opacity: .9 }));
    root.add(pts);
    const halo = dust(small ? 160 : 320, 9, 0xC29A62, 0.04); root.add(halo);
    return (t, c) => {
      const a = pos;
      for (let i = 0; i < N; i++) {
        const k = ease((t - delay[i]) / 2.4), i3 = i * 3, w = Math.sin(t * 1.4 + i) * 0.012 * k;
        a[i3] = start[i3] + (target[i3] - start[i3]) * k + w;
        a[i3 + 1] = start[i3 + 1] + (target[i3 + 1] - start[i3 + 1]) * k + w;
        a[i3 + 2] = start[i3 + 2] + (target[i3 + 2] - start[i3 + 2]) * k;
      }
      geo.attributes.position.needsUpdate = true;
      pts.rotation.y = t * 0.22 + c.px * 0.6; pts.rotation.x = c.py * 0.25;
      root.position.y = -c.scroll * 1.2;
      halo.rotation.y = -t * 0.04;
    };
  },

  /* Services: a tooth cut in half to show enamel, dentin and pulp */
  crosssection(scene, cam, renderer) {
    renderer.localClippingEnabled = true;
    cam.position.set(0, 0.2, 6.6);
    const root = new THREE.Group(); scene.add(root);
    const clip = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
    const layer = (scale, color, rough, roots = true) => {
      const g = toothGeometry(roots);
      const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color, roughness: rough, clearcoat: .6, side: THREE.DoubleSide, clippingPlanes: clip }));
      m.scale.setScalar(scale); return m;
    };
    const enamel = layer(1.45, 0xFBF7F0, .2), dentin = layer(1.2, 0xEAD8AE, .5), pulp = layer(.62, 0xD9828A, .45);
    pulp.scale.set(.5, 1.25, .5); pulp.position.y = -.1;
    const tooth = new THREE.Group(); tooth.add(enamel, dentin, pulp); tooth.position.y = -.35; root.add(tooth);
    // a whole tooth beside it for contrast
    const whole = new THREE.Mesh(toothGeometry(true), new THREE.MeshPhysicalMaterial({ color: 0xFBF7F0, roughness: .2, clearcoat: 1 }));
    whole.scale.setScalar(.55); whole.position.set(2.1, .9, -1); root.add(whole);
    root.add(dust(small ? 120 : 220, 8, BRASS, .025));
    return (t, c) => {
      tooth.rotation.y = -.55 + Math.sin(t * .5) * .45 + c.px * .4;
      tooth.rotation.x = .12 + c.py * .15;
      whole.rotation.y = t * .6; whole.position.y = .9 + Math.sin(t * 1.2) * .1;
      root.position.y = -c.scroll * 1.4;
    };
  },

  /* About: a dental chair that reclines as the lamp switches on */
  chair(scene, cam) {
    cam.position.set(3.1, 2.3, 4.1); cam.lookAt(0, 1.1, 0);
    const root = new THREE.Group(); scene.add(root);
    const frame = new THREE.MeshStandardMaterial({ color: 0xF4EFE6, roughness: .35, metalness: .1 });
    const uph = new THREE.MeshPhysicalMaterial({ color: 0x5B7DB1, roughness: .55, sheen: .6, sheenColor: new THREE.Color(0xE6F0EA) });
    const metal = new THREE.MeshStandardMaterial({ color: 0xC9CDD1, metalness: 1, roughness: .25 });
    const box = (w, h, d, m, r = .06) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.55, .62, .1, 48), frame); base.position.y = .05; root.add(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.14, .18, .62, 32), frame); post.position.y = .4; root.add(post);
    const seat = box(1.25, .2, .72, uph); seat.position.set(0, .8, 0); root.add(seat);
    const legs = new THREE.Group(); legs.position.set(.62, .8, 0); root.add(legs);
    const legRest = box(1.0, .18, .62, uph); legRest.position.set(.45, -.12, 0); legRest.rotation.z = -.32; legs.add(legRest);
    const back = new THREE.Group(); back.position.set(-.6, .85, 0); root.add(back);
    const backRest = box(.2, 1.25, .68, uph); backRest.position.set(-.05, .62, 0); back.add(backRest);
    const head = box(.16, .34, .42, uph); head.position.set(-.08, 1.42, 0); back.add(head);
    const arm = box(.75, .06, .1, frame, .03); arm.position.set(0, 1.02, .43); root.add(arm);
    // lamp on a curved arm
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.6, 16), frame); mast.position.set(-1.2, 1.3, -.7); root.add(mast);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.2, 2.55, -.7), new THREE.Vector3(-.6, 2.85, -.4), new THREE.Vector3(.1, 2.6, -.1)]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .04, 12), frame));
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFE6B8, emissiveIntensity: 0 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.26, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), frame); lamp.position.set(.15, 2.5, -.05); lamp.rotation.x = Math.PI; root.add(lamp);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(.2, 32), lampMat); lens.position.set(.15, 2.49, -.05); lens.rotation.x = Math.PI / 2; root.add(lens);
    const spot = new THREE.SpotLight(0xFFE6B8, 0, 6, .5, .6); spot.position.copy(lens.position); spot.target = seat; root.add(spot);
    // instrument tray on the side
    const trayArm = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .9, 12), frame); trayArm.position.set(.35, 1.2, .95); trayArm.rotation.z = Math.PI / 2; root.add(trayArm);
    const tray = box(.6, .05, .4, new THREE.MeshStandardMaterial({ color: 0x5B7DB1, roughness: .4 }), .02); tray.position.set(.8, 1.25, .95); root.add(tray);
    for (let i = 0; i < 3; i++) { const tool = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .42, 8), metal); tool.rotation.z = Math.PI / 2; tool.position.set(.8, 1.29, .85 + i * .1); root.add(tool); }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.55, 64), new THREE.MeshStandardMaterial({ color: 0xA9BEDB, roughness: .9 })); floor.rotation.x = -Math.PI / 2; root.add(floor);
    return (t, c) => {
      const on = ease((t - .6) / 1.2);
      lampMat.emissiveIntensity = on * 1.6; spot.intensity = on * 7;
      const rec = (Math.sin(t * .6) * .5 + .5) * .35 + c.scroll * .3;
      back.rotation.z = rec; legs.rotation.z = -rec * .25;
      root.rotation.y = -.5 + Math.sin(t * .25) * .35 + c.px * .35;
      cam.position.y = 2.3 - c.scroll * .6; cam.lookAt(0, 1.1, 0);
    };
  },

  /* Team: dental instruments orbiting a tooth */
  instruments(scene, cam) {
    cam.position.set(0, .2, 7);
    const root = new THREE.Group(); scene.add(root);
    const chrome = new THREE.MeshStandardMaterial({ color: 0xDADFE3, metalness: 1, roughness: .18 });
    const grip = new THREE.MeshStandardMaterial({ color: BRASS, metalness: .85, roughness: .3 });
    const tooth = new THREE.Mesh(toothGeometry(true), new THREE.MeshPhysicalMaterial({ color: 0xFBF7F0, roughness: .18, clearcoat: 1 }));
    tooth.scale.setScalar(.95); tooth.position.y = -.3; root.add(tooth);
    const handle = () => { const g = new THREE.Group(); const h = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.5, 24), chrome); g.add(h); for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.052, .008, 8, 24), grip); r.rotation.x = Math.PI / 2; r.position.y = -.3 + i * .08; g.add(r); } return g; };
    // mouth mirror
    const mirror = handle(); const neck = new THREE.Mesh(new THREE.CylinderGeometry(.02, .03, .35, 12), chrome); neck.position.y = .9; neck.rotation.z = .35; mirror.add(neck);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .03, 40), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 1, roughness: .02 })); disc.position.set(-.08, 1.12, 0); disc.rotation.set(Math.PI / 2, 0, .35); mirror.add(disc);
    // explorer probe
    const probe = handle(); const tipCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .75, 0), new THREE.Vector3(0, 1.05, 0), new THREE.Vector3(.12, 1.22, 0), new THREE.Vector3(.2, 1.15, 0)]);
    probe.add(new THREE.Mesh(new THREE.TubeGeometry(tipCurve, 30, .012, 8), chrome));
    // tweezers
    const tw = new THREE.Group(); for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(.05, 1.6, .02), chrome); arm.position.x = s * .05; arm.rotation.z = s * .05; tw.add(arm); }
    // scaler
    const scaler = handle(); const hook = new THREE.Mesh(new THREE.TorusGeometry(.12, .014, 8, 24, Math.PI), chrome); hook.position.set(.12, .8, 0); scaler.add(hook);
    const tools = [mirror, probe, tw, scaler];
    tools.forEach((g, i) => { g.scale.setScalar(.8); g.userData = { a: i * Math.PI / 2, r: 2.1, y: i % 2 ? .45 : -.2 }; root.add(g); });
    root.add(dust(small ? 120 : 220, 8, BRASS, .025));
    return (t, c) => {
      tools.forEach(g => { const d = g.userData, a = d.a + t * .35; g.position.set(Math.cos(a) * d.r, d.y + Math.sin(t + d.a) * .2, Math.sin(a) * d.r * .55); g.rotation.set(Math.sin(t * .7 + d.a) * .5, -a, .6 + Math.cos(t * .5 + d.a) * .3); });
      tooth.rotation.y = t * .4;
      root.rotation.x = .1 + c.py * .2; root.rotation.y = c.px * .4; root.position.y = -c.scroll * 1.2;
    };
  },

  /* Journal: a toothpaste tube squeezing out a striped swirl */
  toothpaste(scene, cam) {
    cam.position.set(0, .3, 7);
    const root = new THREE.Group(); scene.add(root);
    const tube = new THREE.Group(); root.add(tube);
    const prof = []; for (let i = 0; i <= 30; i++) { const y = i / 30 * 2.4; const r = .48 * (1 - Math.pow(Math.max(0, (y - 1.9) / .5), 2) * .15); prof.push(new THREE.Vector2(r, y)); }
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshPhysicalMaterial({ color: 0xF6F2EA, roughness: .35, clearcoat: .6 }));
    body.scale.z = .78; tube.add(body);
    const crimp = new THREE.Mesh(new RoundedBoxGeometry(1.0, .22, .12, 3, .04), new THREE.MeshStandardMaterial({ color: 0xF6F2EA, roughness: .4 })); crimp.position.y = 2.45; tube.add(crimp);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.485, .485, .5, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x5B7DB1, roughness: .4, side: THREE.DoubleSide })); band.scale.z = .78; band.position.y = 1.0; tube.add(band);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.22, .26, .4, 32), new THREE.MeshStandardMaterial({ color: BRASS, metalness: .8, roughness: .3 })); cap.position.y = -.2; tube.add(cap);
    tube.position.set(-1.3, -.4, 0); tube.rotation.z = -2.2;
    // paste swirl: two stripes twisting around a spiral
    const pts = []; for (let i = 0; i <= 160; i++) { const u = i / 160, a = u * Math.PI * 5.2, r = .62 * (1 - u * .8); pts.push(new THREE.Vector3(.9 + Math.cos(a) * r, -1.1 + u * 1.15, Math.sin(a) * r * .9)); }
    const path = new THREE.CatmullRomCurve3(pts);
    const pasteW = new THREE.Mesh(new THREE.TubeGeometry(path, 400, .17, 20), new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: .25, clearcoat: .8 }));
    const stripePts = path.getPoints(400).map((p, i) => { const a = i / 400 * Math.PI * 22; return p.clone().add(new THREE.Vector3(Math.cos(a) * .12, Math.sin(a) * .12, Math.sin(a) * .1)); });
    const pasteG = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stripePts), 600, .07, 10), new THREE.MeshPhysicalMaterial({ color: 0x7FA6D9, roughness: .3, clearcoat: .8 }));
    const paste = new THREE.Group(); paste.add(pasteW, pasteG); paste.scale.setScalar(1.45); paste.position.set(-.2, .35, 0); root.add(paste);
    const total = pasteW.geometry.index.count, totalG = pasteG.geometry.index.count;
    root.add(dust(small ? 120 : 200, 8, 0x8EA9D1, .03));
    return (t, c) => {
      const k = ease(((t * .22) % 1.25) / 1);
      pasteW.geometry.setDrawRange(0, Math.floor(total * Math.min(1, k)));
      pasteG.geometry.setDrawRange(0, Math.floor(totalG * Math.min(1, k)));
      tube.scale.y = 1 - Math.sin(Math.min(1, k) * Math.PI) * .06;
      root.rotation.y = Math.sin(t * .3) * .35 + c.px * .35; root.rotation.x = c.py * .15; root.position.y = .2 - c.scroll * 1.2;
    };
  },

  /* Contact: a clear aligner settling over a row of teeth */
  aligner(scene, cam) {
    cam.position.set(0, 3.2, 5.6); cam.lookAt(0, 0, 0);
    const root = new THREE.Group(); scene.add(root);
    const arch = []; for (let i = 0; i <= 40; i++) { const u = -1 + i / 20; arch.push(new THREE.Vector3(u * 1.7, 0, -Math.pow(Math.abs(u), 1.7) * 1.7 + .7)); }
    const curve = new THREE.CatmullRomCurve3(arch);
    const crown = toothGeometry(false);
    const toothM = new THREE.MeshPhysicalMaterial({ color: 0xFBF7F0, roughness: .22, clearcoat: 1 });
    const clearM = new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: .04, transmission: 1, thickness: .25, ior: 1.45, transparent: true, opacity: .85, clearcoat: 1, specularIntensity: 1 });
    const teeth = new THREE.Group(), tray = new THREE.Group(); root.add(teeth, tray);
    const N = 14;
    for (let i = 0; i < N; i++) {
      const u = .04 + i / (N - 1) * .92, p = curve.getPointAt(u), tg = curve.getPointAt(Math.min(1, u + .01)).sub(p);
      const f = Math.abs(u - .5), w = .15 + f * .2, h = .26 + (.5 - f) * .14, d = .17 + f * .12;
      const tm = new THREE.Mesh(crown, toothM); tm.scale.set(w, h, d); tm.position.copy(p); tm.rotation.y = -Math.atan2(tg.z, tg.x); teeth.add(tm);
      const sm = new THREE.Mesh(crown, clearM); sm.scale.set(w * 1.16, h * 1.12, d * 1.2); sm.position.copy(p); sm.position.y += .015; sm.rotation.y = tm.rotation.y; tray.add(sm);
    }
    root.add(dust(small ? 120 : 220, 8, BRASS, .025));
    return (t, c) => {
      const cyc = (t * .25) % 1, drop = cyc < .45 ? 1 - ease(cyc / .45) : (cyc > .85 ? ease((cyc - .85) / .15) : 0);
      tray.position.y = drop * .9;
      tray.rotation.x = drop * .25;
      root.rotation.y = Math.sin(t * .35) * .5 + c.px * .4; root.rotation.x = c.py * .12; root.position.y = .3 - c.scroll * 1.2;
    };
  }
};

/* ---------- runner ---------- */
function start(stage) {
  const make = SCENES[stage.dataset.scene]; if (!make) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch (e) { stage.classList.add('no3d'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), .04).texture;
  scene.add(new THREE.HemisphereLight(0xFFF4E6, 0xB9C9E0, .9));
  const key = new THREE.DirectionalLight(0xFFFFFF, 1.6); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xD8B98C, 1.1); rim.position.set(-4, 2, -3); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(34, 1, .1, 100);
  const update = make(scene, cam, renderer);
  const ctx = { px: 0, py: 0, scroll: 0 }, target = { x: 0, y: 0 };
  const resize = () => { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; const ar = w / h; cam.zoom = ar < 1.25 ? Math.max(.5, ar * .78) : 1; cam.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(stage); resize();
  window.addEventListener('pointermove', e => { target.x = e.clientX / innerWidth * 2 - 1; target.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  let visible = true, raf = 0; const clock = new THREE.Clock();
  const loop = () => {
    raf = 0; if (!visible) return;
    const t = reduce ? 6 : clock.getElapsedTime();
    ctx.px += (target.x - ctx.px) * .05; ctx.py += (target.y - ctx.py) * .05;
    const r = stage.getBoundingClientRect(); ctx.scroll = Math.min(1, Math.max(0, -r.top / (r.height || 1)));
    update(t, ctx); renderer.render(scene, cam);
    if (!reduce) raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(stage);
  if (reduce) window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  stage.classList.add('ready'); raf = requestAnimationFrame(loop);
}
document.querySelectorAll('.stage').forEach(start);
