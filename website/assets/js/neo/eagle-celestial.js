/* ==========================================================================
   The eagle: celestial.
   The eagle is a living constellation: a translucent body of drifting
   nebula with stars twinkling inside it, its shape traced by constellation
   lines that draw themselves star by star when the page opens. Behind it an
   aurora veil ripples, and a flat disk of stardust turns around it like a
   small galaxy. Scrolling fast makes the stars burn brighter.
   ========================================================================== */
import * as THREE from 'three';
import { BEAT, NOISE, samplePoints } from './eagle-shared.js?v=20261108';

/* A flat disk of stardust turning around the eagle, like a small galaxy.
   flat: how flat the orbits are (0..1). */
function makeOrbit({ count, flat = 0.35, radius = [0.45, 0.85], spin = 1, size = 1 }) {
  const aOrbit = new Float32Array(count * 4), aExtra = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const r = radius[0] + Math.random() * (radius[1] - radius[0]);
    aOrbit.set([r, Math.random() * Math.PI * 2, (0.15 + Math.random() * 0.35) * spin * (Math.random() < 0.85 ? 1 : -1), (Math.random() - 0.5) * 0.9], i * 4);
    aExtra.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aOrbit', new THREE.BufferAttribute(aOrbit, 4));
  g.setAttribute('aExtra', new THREE.BufferAttribute(aExtra, 4));
  const uniforms = { uTime: { value: 0 }, uOpacity: { value: 0 }, uAssemble: { value: 0 }, uPx: { value: Math.min(devicePixelRatio, 2) }, uScale: { value: 400 }, uFlat: { value: flat } };
  const colour = 'vec3 c = mix(vec3(1.0, 0.86, 0.62), vec3(0.75, 0.85, 1.0), aExtra.x); c = mix(c, vec3(1.0, 0.5, 0.85), step(0.82, aExtra.y));';
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime, uAssemble, uPx, uScale, uFlat;
      attribute vec4 aOrbit, aExtra;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float a = aOrbit.y + uTime * aOrbit.z;
        float r = aOrbit.x * (1.0 + 0.04 * sin(uTime * 1.3 + aExtra.z * 20.0));
        vec3 p = vec3(cos(a) * r, sin(a) * r * uFlat, sin(a) * r * 0.8);
        // tilt each orbit a little
        float tl = aOrbit.w;
        p = vec3(p.x, p.y * cos(tl) - p.z * sin(tl), p.y * sin(tl) + p.z * cos(tl));
        p.y += 0.05;
        // arrive from far away when the page opens
        float t = clamp(uAssemble * 1.4 - aExtra.w * 0.4, 0.0, 1.0);
        p *= mix(4.0, 1.0, 1.0 - pow(1.0 - t, 3.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * ${size.toFixed(2)} * (1.2 + aExtra.y * 2.6) * clamp(uScale / 420.0, 0.6, 1.6) * (1000.0 / -mv.z);
        ${colour}
        vColor = c;
        vAlpha = (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.5 + aExtra.z * 3.0) + aExtra.x * 30.0))) * t;
      }`,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vAlpha * uOpacity;
        gl_FragColor = vec4(vColor * a * 1.3, a);
      }`,
  });
  const points = new THREE.Points(g, mat);
  points.frustumCulled = false;
  return { points, uniforms };
}
export function makeCelestial(canvas, { boost = 1.25, halo = 0.35 } = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = innerWidth < 900;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const uniforms = {
    uMap: { value: tex }, uTime: { value: 0 }, uOpacity: { value: 0 }, uFlap: { value: 1 }, uBoost: { value: boost },
    uReveal: { value: reduce ? 1 : 0 }, uFx: { value: 1 }, uEnergy: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime, uFlap;
      varying vec2 vUv;
      ${BEAT}
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(beat(position), 1.0); }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uOpacity, uBoost, uTime, uReveal, uFx, uEnergy;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 uv = vUv;
        float t = uTime;
        vec4 c = texture2D(uMap, uv);
        float lum = dot(c.rgb, vec3(0.3, 0.5, 0.2));
        // drifting nebula: violet and magenta clouds, teal wisps, a golden core
        vec2 q = vec2(fbm(uv * 2.4 + t * 0.03), fbm(uv * 2.4 + vec2(3.1, 7.7) - t * 0.025));
        float n = fbm(uv * 3.0 + q * 2.2 + t * 0.02);
        vec3 neb = mix(vec3(0.22, 0.06, 0.55), vec3(0.98, 0.35, 0.78), smoothstep(0.32, 0.72, n));
        neb = mix(neb, vec3(0.25, 0.92, 1.0), smoothstep(0.58, 0.86, fbm(uv * 5.0 - t * 0.02)));
        neb = mix(neb, vec3(1.0, 0.86, 0.55), pow(lum, 2.5) * 0.7);
        // stars inside the body
        vec2 g = uv * 85.0; vec2 id = floor(g); float h = hash2(id);
        float star = step(0.92, h) * smoothstep(0.16, 0.0, length(fract(g) - 0.5)) * (0.45 + 0.55 * sin(t * (2.0 + h * 3.0) + h * 40.0));
        vec3 col = mix(c.rgb, neb * (0.35 + lum * 1.5), 0.78 * uFx) + star * (1.4 + uEnergy * 2.0) * uFx;
        // it appears from the heart outward, with a bright wavefront
        float r = length(uv - vec2(0.5, 0.56));
        float front = uReveal * 0.95 + (n - 0.5) * 0.14;
        float shown = smoothstep(front, front - 0.06, r);
        col += vec3(1.0, 0.82, 0.95) * exp(-pow((r - front) * 28.0, 2.0)) * step(0.001, 1.0 - uReveal) * 1.6 * uFx;
        // translucent, like light through gas: brighter where the artwork is bright
        float a = c.a * shown * uOpacity * mix(1.0, 0.32 + 0.5 * lum, uFx);
        gl_FragColor = vec4(col * a * uBoost, a);
      }`,
  });
  const wings = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 80, 80), mat);
  const haloMat = mat.clone();
  haloMat.uniforms = { ...uniforms, uBoost: { value: halo }, uFx: { value: 0 } };
  const glow = new THREE.Mesh(wings.geometry, haloMat);
  glow.scale.setScalar(1.2);
  glow.position.z = -0.06;
  const rig = new THREE.Group();

  /* Aurora veil behind ------------------------------------------------------- */
  const auroraU = { uTime: uniforms.uTime, uOpacity: { value: 0 } };
  const aurora = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: auroraU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform float uTime, uOpacity;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 uv = vUv;
        // vertical curtains that sway
        float x = uv.x * 3.0 + fbm(vec2(uv.y * 1.5, uTime * 0.08)) * 1.2;
        float curtain = pow(fbm(vec2(x * 2.0, uTime * 0.06)), 2.0) * 2.2;
        float rays = 0.6 + 0.4 * vnoise(vec2(x * 24.0, uTime * 0.4));
        float v = smoothstep(0.0, 0.45, uv.y) * smoothstep(1.0, 0.55, uv.y);
        float edge = smoothstep(0.0, 0.25, uv.x) * smoothstep(1.0, 0.75, uv.x);
        vec3 col = mix(vec3(0.15, 0.95, 0.75), vec3(0.6, 0.3, 1.0), smoothstep(0.3, 0.8, uv.y));
        col = mix(col, vec3(1.0, 0.35, 0.8), smoothstep(0.7, 1.0, uv.y) * 0.6);
        float a = curtain * rays * v * edge * uOpacity;
        gl_FragColor = vec4(col * a, a);
      }`,
  }));
  aurora.scale.set(2.8, 1.7, 1);
  aurora.position.set(0, 0.15, -0.5);
  rig.add(aurora, glow, wings);

  /* Constellation: bright points of the artwork, joined to their neighbours */
  const pts = samplePoints(canvas, phone ? 110 : 190, { minAlpha: 200, minLum: 0.45, spacing: 0.045 });
  const nodes = [];
  for (let i = 0; i < pts.length; i += 5) nodes.push([pts[i], pts[i + 1]]);
  // draw order: from the heart outward
  nodes.sort((a, b) => Math.hypot(a[0], a[1] - 0.06) - Math.hypot(b[0], b[1] - 0.06));
  const edges = new Set();
  nodes.forEach((a, i) => {
    const near = nodes.map((b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1])]).filter(([j, d]) => j !== i && d < 0.13).sort((x, y) => x[1] - y[1]).slice(0, 2);
    near.forEach(([j]) => edges.add(i < j ? i + ':' + j : j + ':' + i));
  });
  const lp = [], lo = [];
  edges.forEach((e) => {
    const [i, j] = e.split(':').map(Number);
    const order = Math.max(i, j) / nodes.length;
    lp.push(nodes[i][0], nodes[i][1], 0.02, nodes[j][0], nodes[j][1], 0.02);
    lo.push(order, 0, order, 1);
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lp), 3));
  lg.setAttribute('aOrder', new THREE.BufferAttribute(new Float32Array(lo), 2));
  const starU = { uTime: uniforms.uTime, uFlap: uniforms.uFlap, uOpacity: { value: 0 }, uAssemble: { value: reduce ? 1 : 0 }, uEnergy: uniforms.uEnergy, uPx: { value: Math.min(devicePixelRatio, 2) }, uScale: { value: 400 } };
  const lines = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
    uniforms: starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime, uFlap, uAssemble;
      attribute vec2 aOrder;
      varying float vA;
      ${BEAT}
      void main() {
        // each line draws itself once the stars before it are lit
        vA = smoothstep(aOrder.x, aOrder.x + 0.08, uAssemble * 1.15) * (0.55 + 0.45 * aOrder.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(beat(position), 1.0);
      }`,
    fragmentShader: `
      uniform float uOpacity, uTime;
      varying float vA;
      void main() { float a = vA * uOpacity * (0.75 + 0.15 * sin(uTime * 1.7)); gl_FragColor = vec4(vec3(1.0, 0.88, 0.7) * a * 1.4, a); }`,
  }));
  lines.frustumCulled = false;
  const sp = new Float32Array(nodes.length * 3), so = new Float32Array(nodes.length);
  nodes.forEach((n, i) => { sp.set([n[0], n[1], 0.03], i * 3); so[i] = i / nodes.length; });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aOrder', new THREE.BufferAttribute(so, 1));
  const stars = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime, uFlap, uAssemble, uPx, uScale, uEnergy;
      attribute float aOrder;
      varying float vA;
      ${BEAT}
      void main() {
        float lit = smoothstep(aOrder, aOrder + 0.05, uAssemble * 1.15);
        float tw = 0.6 + 0.4 * sin(uTime * (1.5 + fract(aOrder * 91.0) * 3.0) + aOrder * 80.0);
        vA = lit * tw * (1.0 + uEnergy);
        vec4 mv = modelViewMatrix * vec4(beat(position), 1.0);
        gl_Position = projectionMatrix * mv;
        // a flash as each star lights
        float flash = 1.0 + 2.0 * (1.0 - smoothstep(0.0, 0.12, uAssemble * 1.15 - aOrder)) * lit;
        gl_PointSize = uPx * (12.0 + 10.0 * fract(aOrder * 37.0)) * flash * clamp(uScale / 420.0, 0.6, 1.6) * (1000.0 / -mv.z);
      }`,
    fragmentShader: `
      uniform float uOpacity;
      varying float vA;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float r = length(p);
        float core = smoothstep(0.14, 0.0, r) * 1.6 + exp(-r * r * 40.0) * 0.6;
        float spikes = (smoothstep(0.035, 0.0, abs(p.x)) + smoothstep(0.035, 0.0, abs(p.y))) * smoothstep(0.5, 0.0, r);
        float a = (core + spikes * 0.9) * vA * uOpacity;
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.82) * a * 1.5, min(a, 1.0));
      }`,
  }));
  stars.frustumCulled = false;
  rig.add(lines, stars);

  /* A small galaxy of stardust turning around it */
  const disk = makeOrbit({ count: phone ? 500 : 1300, flat: 0.12, radius: [0.35, 1.1], spin: 0.5, size: 1.5 });
  disk.points.rotation.x = 0.25;
  rig.add(disk.points);
  if (reduce) disk.uniforms.uAssemble.value = 1;

  let start = null;
  return {
    rig,
    set(time, opacity, flap = 1, energy = 0) {
      if (start === null) start = time;
      const since = time - start;
      uniforms.uTime.value = time;
      uniforms.uOpacity.value = opacity;
      uniforms.uFlap.value = flap;
      uniforms.uEnergy.value += (Math.min(1, energy) - uniforms.uEnergy.value) * 0.1;
      if (!reduce) {
        starU.uAssemble.value = Math.min(1, since / 2.6);
        uniforms.uReveal.value = Math.min(1, Math.max(0, (since - 1.4) / 2.0));
        disk.uniforms.uAssemble.value = Math.min(1, Math.max(0, (since - 0.6) / 2.6));
      }
      starU.uOpacity.value = opacity;
      starU.uScale.value = rig.scale.x;
      auroraU.uOpacity.value = opacity * Math.min(1, Math.max(0, (since - 1.0) / 2.0)) * 0.95;
      disk.uniforms.uTime.value = time;
      disk.uniforms.uOpacity.value = opacity;
      disk.uniforms.uScale.value = rig.scale.x;
    },
  };
}
