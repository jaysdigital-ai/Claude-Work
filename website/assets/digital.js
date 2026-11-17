/* The Digital Agila — on-brand "digital" layer.
   1. Circuit traces (the logo's circuit motif): thin lines with 45° turns and nodes,
      with light pulses travelling along them. Drawn at the edges of heroes, dark sections,
      the CTA band and the footer, so they never sit behind body text.
   2. Dot grid in page heroes that lights up around the cursor.
   3. Kicker labels "decode" from code characters when they scroll into view.
   Calm by design; static for prefers-reduced-motion. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  // small seeded random so every section keeps the same layout between visits
  function rng(seed) { return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }

  function trace(r, W, H, side, band) {
    // start on a side edge, run inwards, one or two 45° bends, end in a node
    var y = band[0] + r() * (band[1] - band[0]);
    var x = side === 'l' ? -10 : W + 10, dir = side === 'l' ? 1 : -1;
    var reach = W < 1100 ? W * (0.05 + r() * 0.05) : W * (0.12 + r() * 0.2);
    var d = 'M' + x.toFixed(0) + ' ' + y.toFixed(0);
    var segs = 2 + Math.floor(r() * 2), run = 0;
    for (var i = 0; i < segs; i++) {
      var h = reach / segs * (0.6 + r() * 0.8);
      x += dir * h; run += h;
      d += ' H' + x.toFixed(0);
      if (i < segs - 1) {
        var dy = (r() < .5 ? -1 : 1) * (14 + r() * 30);
        if (y + dy < 12 || y + dy > H - 12) dy = -dy;
        x += dir * Math.abs(dy); y += dy;
        d += ' L' + x.toFixed(0) + ' ' + y.toFixed(0);
      }
    }
    return { d: d, x: x, y: y };
  }

  function draw(el) {
    var old = el.querySelector(':scope > svg.circuit'); if (old) old.remove();
    var W = el.clientWidth, H = el.clientHeight; if (W < 200 || H < 120) return;
    var dark = el.classList.contains('dark') || el.classList.contains('cta') || el.classList.contains('footer');
    var seed = 0, key = (el.id || el.className) + W; for (var k = 0; k < key.length; k++) seed = (seed * 31 + key.charCodeAt(k)) % 100000;
    var r = rng(seed + 7);
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'circuit'); svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('preserveAspectRatio', 'none');
    var id = 'cg' + Math.floor(r() * 1e6);
    svg.innerHTML = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8b6cf0"/><stop offset="1" stop-color="#6fd6f2"/></linearGradient></defs>';
    var edgeOnly = el.classList.contains('footer') || el.classList.contains('cta');
    var n = W < 700 ? 3 : (edgeOnly ? 3 : 6);
    var bands = [[H * .08, H * .35], [H * .62, H * .92]];
    for (var i = 0; i < n; i++) {
      var side = edgeOnly ? 'r' : (i % 2 ? 'r' : 'l');
      var band = edgeOnly ? (el.classList.contains('footer') ? [H * .6, H * .78] : bands[i % 2]) : bands[Math.floor(i / 2) % 2];
      var t = trace(r, W, H, side, band);
      var g = document.createElementNS(NS, 'g');
      var base = '<path class="ct-line" d="' + t.d + '" stroke="url(#' + id + ')"/>';
      var pulse = reduce ? '' : '<path class="ct-pulse" pathLength="1000" d="' + t.d + '" style="animation-duration:' + (3.2 + r() * 3).toFixed(2) + 's;animation-delay:' + (r() * 4).toFixed(2) + 's"/>';
      var node = '<circle class="ct-node" cx="' + t.x.toFixed(0) + '" cy="' + t.y.toFixed(0) + '" r="3.5"/>';
      g.innerHTML = base + pulse + node;
      svg.appendChild(g);
    }
    svg.classList.toggle('on-dark', dark);
    el.insertBefore(svg, el.firstChild);
  }

  var targets = Array.prototype.slice.call(document.querySelectorAll('.hero, .page-hero, .dark, .cta'));
  targets.forEach(function (el) { el.classList.add('has-circuit'); draw(el); });
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { targets.forEach(draw); }, 200); });

  // pause pulses when offscreen
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('ct-paused', !e.isIntersecting); }); });
    targets.forEach(function (t) { io.observe(t); });
  }

  // dot grid spotlight in heroes
  document.querySelectorAll('.hero, .page-hero').forEach(function (h) {
    var grid = document.createElement('div'); grid.className = 'dotgrid'; grid.setAttribute('aria-hidden', 'true');
    h.insertBefore(grid, h.firstChild);
    if (reduce) return;
    h.addEventListener('pointermove', function (e) {
      var r = h.getBoundingClientRect();
      grid.style.setProperty('--mx', (e.clientX - r.left) + 'px'); grid.style.setProperty('--my', (e.clientY - r.top) + 'px');
      grid.classList.add('lit');
    });
    h.addEventListener('pointerleave', function () { grid.classList.remove('lit'); });
  });

  // kicker decode
  if (reduce) return;
  var CH = '01<>/{}#_=+';
  var ko = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; ko.unobserve(e.target);
      var el = e.target, final = el.textContent, start = null, dur = 650;
      el.style.minWidth = el.offsetWidth + 'px';
      (function step(ts) {
        if (!start) start = ts; var p = Math.min(1, (ts - start) / dur), done = Math.floor(final.length * p), out = '';
        for (var i = 0; i < final.length; i++) out += i < done || final[i] === ' ' ? final[i] : CH[Math.floor(Math.random() * CH.length)];
        el.textContent = out;
        if (p < 1) requestAnimationFrame(step); else { el.textContent = final; el.style.minWidth = ''; }
      })(performance.now());
    });
  }, { threshold: .6 });
  document.querySelectorAll('.kicker').forEach(function (k) { ko.observe(k); });
})();
