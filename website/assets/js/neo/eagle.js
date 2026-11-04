/* ==========================================================================
   The neon eagle, shared by the home page and the inner pages.
   loadEagleCanvas(): the artwork with its purple background removed.
   makeEagle(): the eagle as a living constellation (neo/eagle-celestial.js).
   ========================================================================== */
import { makeCelestial } from './eagle-celestial.js?v=20261108';

export const makeEagle = (canvas, opts) => makeCelestial(canvas, opts);

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
      const g = c.getContext('2d', { willReadFrequently: true });
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
