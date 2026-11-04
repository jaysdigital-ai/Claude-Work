/* Shader snippets and helpers for the eagle (see neo/eagle-celestial.js). */

// The wing beat: the surface and any particles riding on it move as one.
// Needs uniforms uTime and uFlap.
export const BEAT = `
  vec3 beat(vec3 p) {
    float ax = abs(p.x);
    float wing = smoothstep(0.06, 0.5, ax) * smoothstep(-0.35, 0.15, p.y);   // wings, not body or tail
    float b = sin(uTime * 2.1 - ax * 2.6);
    p.z += b * 0.16 * wing * uFlap;
    p.y += b * 0.035 * wing * uFlap;
    p.z -= ax * ax * 0.25;                                                   // a gentle curve, wings forward
    return p;
  }`;

// Value noise and fractal noise
export const NOISE = `
  #ifndef FBM_OCT
  #define FBM_OCT 4
  #endif
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < FBM_OCT; i++) { v += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; }
    return v;
  }`;


/* Points sampled from the opaque parts of the artwork: [x, y, r, g, b] each,
   in the surface's own space (-0.5..0.5). minLum skips dim pixels. */
export function samplePoints(canvas, want, { minAlpha = 110, minLum = 0, spacing = 0 } = {}) {
  const S = canvas.width, data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, S, S).data;
  const out = [];
  for (let tries = 0; out.length / 5 < want && tries < want * 60; tries++) {
    const x = Math.random() * S | 0, y = Math.random() * S | 0, i = (y * S + x) * 4;
    if (data[i + 3] < minAlpha) continue;
    if (minLum && (data[i] + data[i + 1] + data[i + 2]) / 765 < minLum) continue;
    const px = x / S - 0.5, py = 0.5 - y / S;
    if (spacing) {
      let near = false;
      for (let k = 0; k < out.length; k += 5) { const dx = out[k] - px, dy = out[k + 1] - py; if (dx * dx + dy * dy < spacing * spacing) { near = true; break; } }
      if (near) continue;
    }
    out.push(px, py, data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
  }
  return out;
}

/* Devices that get the lighter shaders: phones, small tablets, and machines
   with few CPU cores or little memory (a fair sign of a modest GPU). */
export const LITE = innerWidth < 900 || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

/* Keeps the animation smooth on any device: starts at a sensible resolution,
   measures the real frame rate every second and lowers the resolution when
   frames drop, and raises it again when there is room (slowly retrying a level
   that once dropped frames). Call the returned function every frame with dt. */
export function adaptiveResolution(renderer) {
  const max = Math.min(devicePixelRatio, LITE ? 1.5 : 2);
  const min = Math.min(max, LITE ? 0.75 : 1);
  let ratio = max, ceiling = max, time = 0, frames = 0, wait = 1, good = 0;
  renderer.setPixelRatio(ratio);
  const set = (r) => { ratio = r; renderer.setPixelRatio(r); };
  return (dt) => {
    time += dt; frames++;
    if (time < 1) return;
    const fps = frames / time;
    time = 0; frames = 0;
    window.__eagleQuality = { fps: Math.round(fps), ratio: +ratio.toFixed(2) };   // for testing
    if (document.hidden || wait-- > 0) return;           // skip the first second and tab switches
    if (fps < 50 && ratio > min) { ceiling = ratio; set(Math.max(min, ratio * 0.8)); wait = 1; good = 0; return; }
    good = fps > 58 ? good + 1 : 0;
    // after a long smooth stretch, allow a little more sharpness again (a passing
    // hiccup such as a page load should not leave the eagle soft for good)
    if (good >= 6 && ceiling < max) { ceiling = Math.min(max, ceiling * 1.15); good = 0; }
    if (fps > 58 && ratio * 1.05 < ceiling) { set(Math.min(ceiling, ratio * 1.1)); wait = 3; }
  };
}

/* Writes six numbers into a typed array without making a new array each
   frame (throwaway arrays add up and cause stutter on phones). */
export function put6(arr, i, a, b, c, d, e, f) {
  arr[i] = a; arr[i + 1] = b; arr[i + 2] = c; arr[i + 3] = d; arr[i + 4] = e; arr[i + 5] = f;
}
