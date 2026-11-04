/* ==========================================================================
   The neon eagle, shared by the home page and the inner pages.
   loadEagleCanvas(): the artwork with its purple background removed.
   makeEagle(): the artwork on a bendable 3D surface whose wings beat in a
   slow wave from the body out to the tips, with a soft halo behind it.
   ========================================================================== */
import * as THREE from 'three';

let cached = null;
export function loadEagleCanvas() {
  // The artwork sits on a dark violet gradient. Light is kept, the violet
  // floor is subtracted, and what remains becomes the alpha.
  cached ||= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const S = img.naturalWidth;
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, S, S);
      const p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const r = p[i], gg = p[i + 1], b = p[i + 2];
        const a = Math.min(1, Math.max(0, Math.max(r - 34, gg * 1.7, b - 70) / 110));
        // un-mix the background so edges don't keep a purple fringe
        p[i] = a ? Math.min(255, Math.max(0, (r - 18 * (1 - a)) / a)) : 0;
        p[i + 1] = a ? Math.min(255, gg / a) : 0;
        p[i + 2] = a ? Math.min(255, Math.max(0, (b - 50 * (1 - a)) / a)) : 0;
        p[i + 3] = a * 255;
      }
      g.putImageData(d, 0, 0);
      resolve(c);
    };
    img.src = 'assets/img/neon-eagle.jpg';
  });
  return cached;
}

export function makeEagle(canvas, { boost = 1.25, halo = 0.35 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const uniforms = { uMap: { value: tex }, uTime: { value: 0 }, uOpacity: { value: 0 }, uFlap: { value: 1 }, uBoost: { value: boost } };
  const wingMat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime, uFlap;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float ax = abs(p.x);
        float wing = smoothstep(0.06, 0.5, ax) * smoothstep(-0.35, 0.15, p.y);   // wings, not body or tail
        float beat = sin(uTime * 2.1 - ax * 2.6);
        p.z += beat * 0.16 * wing * uFlap;
        p.y += beat * 0.035 * wing * uFlap;
        p.z -= ax * ax * 0.25;                                                 // a gentle curve, wings forward
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uOpacity, uBoost;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(uMap, vUv);
        // premultiplied: the alpha must follow the light, or the page behind turns black
        float a = c.a * uOpacity;
        gl_FragColor = vec4(c.rgb * a * uBoost, a);
      }`,
  });
  const wings = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 80, 80), wingMat);
  const haloMat = wingMat.clone();
  haloMat.uniforms = { ...uniforms, uBoost: { value: halo } };
  const glow = new THREE.Mesh(wings.geometry, haloMat);
  glow.scale.setScalar(1.18);
  glow.position.z = -0.06;
  const rig = new THREE.Group();
  rig.add(glow, wings);
  return {
    rig,
    set(time, opacity, flap = 1) {
      uniforms.uTime.value = time;
      uniforms.uOpacity.value = opacity;
      uniforms.uFlap.value = flap;
    },
  };
}
