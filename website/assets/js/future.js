/* ==========================================================================
   Celestial layer, on every page (styles: assets/css/future.css)
   - the cursor is a tiny black hole with a spinning accretion ring; it
     sheds stardust as it moves and swells over anything you can click
   - labels gather out of stardust, letter by letter
   - a comet crosses each section as it arrives
   - an aurora ripples through the page title
   - mockups sparkle with starlight on hover
   - the page transition is a wormhole that names where you're going
   The cursor runs only with a mouse, and its loop stops when nothing moves.
   Nothing moves for reduced motion.
   ========================================================================== */
(() => {
  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  doc.classList.add('fx-on');

  const PAGE_NAMES = { '': 'Home', index: 'Home', about: 'About', services: 'Services', contact: 'Contact', privacy: 'Privacy', terms: 'Terms', cookies: 'Cookies' };
  const pageName = (path) => PAGE_NAMES[path.split('/').pop().replace(/\.html$/, '')] || 'The Digital Agila';

  /* The page transition says where you're going, and where you've arrived */
  function transitionLabel() {
    const curtain = document.querySelector('.curtain');
    if (!curtain || reduce) return;
    const warp = document.createElement('div');
    warp.className = 'fx-warp';
    warp.innerHTML = '<i></i><span>ARRIVED AT</span><b></b>';
    curtain.appendChild(warp);
    const name = warp.querySelector('b'), verb = warp.querySelector('span');
    name.textContent = pageName(location.pathname);
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      try {
        const u = new URL(a.href, location.href);
        if (u.origin !== location.origin || u.pathname === location.pathname) return;
        name.textContent = pageName(u.pathname);
        verb.textContent = 'TRAVELLING TO';
      } catch { /* ignore */ }
    }, true);
  }

  function celestial() {
    if (reduce) return;

    /* Labels gather out of stardust ------------------------------------------- */
    function stardust(el) {
      if (el.dataset.fxDust) return;
      const text = el.textContent;
      if (!text.trim() || el.children.length) return;   // only plain-text labels
      el.dataset.fxDust = '1';
      el.setAttribute('aria-label', text);
      el.textContent = '';
      [...text].forEach((ch, i) => {
        const s = document.createElement('span');
        s.className = 'fx-dust';
        s.setAttribute('aria-hidden', 'true');
        s.textContent = ch;
        s.style.setProperty('--dx', ((Math.random() - 0.5) * 60).toFixed(0) + 'px');
        s.style.setProperty('--dy', ((Math.random() - 0.5) * 40).toFixed(0) + 'px');
        s.style.setProperty('--d', (i * 0.03 + Math.random() * 0.25).toFixed(2) + 's');
        el.appendChild(s);
      });
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); e.target.classList.add('fx-dust-in'); } });
      }, { threshold: 0.6 });
      document.querySelectorAll('.label, .neo-eyebrow, .neo-list__num').forEach((l) => { stardust(l); io.observe(l); });

      /* A comet across each section as it arrives ----------------------------- */
      const cio = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          cio.unobserve(e.target);
          const s = e.target;
          if (getComputedStyle(s).position === 'static') s.classList.add('fx-scan-host');
          const c = document.createElement('i');
          c.className = 'fx-comet';
          c.setAttribute('aria-hidden', 'true');
          c.style.top = (8 + Math.random() * 30).toFixed(0) + '%';
          s.appendChild(c);
          c.addEventListener('animationend', () => c.remove(), { once: true });
        });
      }, { threshold: 0.25 });
      document.querySelectorAll('main section.section, main .strip, .footer').forEach((s, i) => {
        if (i > 0 || s.getBoundingClientRect().top > innerHeight * 0.5) cio.observe(s);
      });
    }

    /* Aurora through the page title ------------------------------------------- */
    document.querySelectorAll('.page-hero, .neo-hero').forEach((h) => {
      if (getComputedStyle(h).position === 'static') h.classList.add('fx-scan-host');
      const a = document.createElement('i');
      a.className = 'fx-aurora';
      a.setAttribute('aria-hidden', 'true');
      h.appendChild(a);
    });

    /* Starlight on mockups ------------------------------------------------------ */
    document.querySelectorAll('.tile .mk, .neo-founder__photo').forEach((el) => {
      if (getComputedStyle(el).position === 'static') el.classList.add('fx-holo-host');
      const s = document.createElement('i');
      s.className = 'fx-starlight';
      s.setAttribute('aria-hidden', 'true');
      el.appendChild(s);
      el.classList.add('fx-star-host');
    });

    if (!fine) return;

    /* Black-hole cursor with a stardust trail -------------------------------- */
    const hole = document.createElement('div');
    hole.className = 'fx-hole';
    hole.setAttribute('aria-hidden', 'true');
    hole.innerHTML = '<i></i><b></b><b></b><b></b>';
    document.body.appendChild(hole);
    const cv = document.createElement('canvas');
    cv.className = 'fx-trail';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    const g = cv.getContext('2d');
    const DPR = Math.min(devicePixelRatio, 1.5);
    const size = () => { cv.width = innerWidth * DPR; cv.height = innerHeight * DPR; };
    size();
    addEventListener('resize', size);
    const dust = [];
    const COLS = ['255,243,220', '255,207,138', '201,166,255', '140,200,255'];
    let mx = -100, my = -100, hx = -100, hy = -100, lx = null, ly = null, raf = 0;
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (lx === null) { hx = mx; hy = my; lx = mx; ly = my; }
      const d = Math.hypot(mx - lx, my - ly);
      for (let i = 0; i < Math.min(4, d / 6); i++) {
        if (dust.length > 160) dust.shift();
        dust.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8 + 0.15, life: 1, r: 0.6 + Math.random() * 1.6, c: COLS[(Math.random() * COLS.length) | 0] });
      }
      lx = mx; ly = my;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      hole.classList.toggle('is-big', !!e.target.closest('a, button, [role="tab"], summary, input, select, textarea, label.chip'));
    });
    function loop() {
      hx += (mx - hx) * 0.25; hy += (my - hy) * 0.25;
      hole.style.transform = `translate(${hx.toFixed(1)}px, ${hy.toFixed(1)}px)`;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, innerWidth, innerHeight);
      g.globalCompositeOperation = 'lighter';
      for (let i = dust.length - 1; i >= 0; i--) {
        const p = dust[i];
        // dust spirals gently back toward the black hole as it fades
        const ax = (hx - p.x) * 0.002, ay = (hy - p.y) * 0.002;
        p.vx = (p.vx + ax - (hy - p.y) * 0.0012) * 0.97;
        p.vy = (p.vy + ay + (hx - p.x) * 0.0012) * 0.97;
        p.x += p.vx; p.y += p.vy;
        p.life -= 0.012;
        if (p.life <= 0) { dust.splice(i, 1); continue; }
        g.fillStyle = `rgba(${p.c},${(p.life * 0.9).toFixed(3)})`;
        g.beginPath(); g.arc(p.x, p.y, p.r * (0.5 + p.life), 0, Math.PI * 2); g.fill();
      }
      const moving = Math.abs(mx - hx) + Math.abs(my - hy) > 0.3;
      if (!dust.length && !moving) { g.clearRect(0, 0, innerWidth, innerHeight); raf = 0; return; }
      raf = requestAnimationFrame(loop);
    }
  }

  /* Home tool stack ----------------------------------------------------------
     Filter buttons light up one group of tools. On wide screens the tools
     orbit a glowing core in three rings; on tablets and phones they sit in
     a grid that twinkles, with gold lines joining a group on hover or filter. */
  function toolStack() {
    const box = document.querySelector('[data-tools]');
    if (!box) return;
    const stage = box.querySelector('.tools__stage');
    const grid = box.querySelector('.tools__grid');
    const tools = [...grid.querySelectorAll('.tool')];
    const buttons = [...box.querySelectorAll('[data-filter]')];
    const wide = () => matchMedia('(min-width: 900px)').matches;
    let filter = 'all';
    tools.forEach((t) => { const tip = t.querySelector('.tool__tip'); tip.dataset.name = t.querySelector('.tool__name').textContent; });

    // Every tool shows its name and what it's for: on hover or keyboard focus
    // (the card on the tile), and on touch screens a panel at the bottom of the
    // screen when a tool is tapped. Cards near the screen edge open inward.
    const touch = matchMedia('(hover: none)');
    const detail = document.createElement('div');
    detail.className = 'tools__detail';
    detail.setAttribute('role', 'status');
    detail.setAttribute('aria-live', 'polite');
    detail.innerHTML = '<span class="tool__mark" aria-hidden="true"></span><p><b></b><span></span></p>';
    box.appendChild(detail);
    let hideTimer = 0;
    const describe = (t) => {
      detail.querySelector('.tool__mark').innerHTML = t.querySelector('.tool__mark').innerHTML;
      detail.querySelector('.tool__mark').className = t.querySelector('.tool__mark').className;
      detail.querySelector('b').textContent = t.querySelector('.tool__tip').dataset.name;
      detail.querySelector('p span').textContent = t.querySelector('.tool__tip').textContent;
    };
    const side = (t) => {
      const r = t.getBoundingClientRect();
      t.dataset.side = r.left < 120 ? 'left' : r.right > innerWidth - 120 ? 'right' : '';
    };
    tools.forEach((t) => {
      t.addEventListener('pointerenter', () => side(t));
      t.addEventListener('focus', () => side(t));
      t.addEventListener('click', () => {
        if (!touch.matches) return;
        describe(t);
        tools.forEach((x) => x.classList.toggle('is-picked', x === t));
        detail.classList.add('is-on');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => { detail.classList.remove('is-on'); t.classList.remove('is-picked'); }, 4500);
      });
    });
    detail.addEventListener('click', () => { detail.classList.remove('is-on'); tools.forEach((x) => x.classList.remove('is-picked')); });

    buttons.forEach((b) => b.addEventListener('click', () => {
      filter = b.dataset.filter;
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      box.classList.toggle('is-filtered', filter !== 'all');
      tools.forEach((t) => t.classList.toggle('is-on', filter === 'all' || t.dataset.cat === filter));
      box.dispatchEvent(new CustomEvent('tools:filter'));
    }));

    // play the entrance once the tools scroll into view
    const enter = () => { box.classList.remove('is-in'); void box.offsetWidth; box.classList.add('is-in'); };
    let seen = false;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { seen = true; io.disconnect(); enter(); } }, { threshold: 0.15 });
      io.observe(stage);
    } else { seen = true; box.classList.add('is-in'); }

    const centre = (el) => { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top + r.height / 2]; };

    /* 1 · Constellation: twinkling tiles, gold lines join a group ---------- */
    function constellation() {
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'tools__lines');
      svg.setAttribute('aria-hidden', 'true');
      stage.appendChild(svg);
      let hoverCat = null;
      const draw = () => {
        const cat = hoverCat || (filter !== 'all' ? filter : null);
        svg.innerHTML = '';
        if (!cat) return;
        const s = stage.getBoundingClientRect();
        svg.setAttribute('viewBox', `0 0 ${s.width} ${s.height}`);
        const pts = tools.filter((t) => t.dataset.cat === cat).map(centre);
        if (pts.length < 2) return;
        const path = document.createElementNS(NS, 'polyline');
        path.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
        svg.appendChild(path);
        pts.forEach(([x, y]) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 3); svg.appendChild(c); });
      };
      const on = (e) => { hoverCat = e.currentTarget.dataset.cat; draw(); };
      const off = () => { hoverCat = null; draw(); };
      tools.forEach((t) => { t.addEventListener('pointerenter', on); t.addEventListener('pointerleave', off); t.addEventListener('focus', on); t.addEventListener('blur', off); });
      box.addEventListener('tools:filter', draw);
      addEventListener('resize', draw);
      // a few tools sparkle now and then
      const timer = reduce ? 0 : setInterval(() => {
        if (document.hidden) return;
        for (let k = 0; k < 2; k++) {
          const t = tools[(Math.random() * tools.length) | 0];
          t.classList.add('is-twinkle');
          setTimeout(() => t.classList.remove('is-twinkle'), 1600);
        }
      }, 900);
      return () => {
        clearInterval(timer); svg.remove(); box.removeEventListener('tools:filter', draw); removeEventListener('resize', draw);
        tools.forEach((t) => { t.removeEventListener('pointerenter', on); t.removeEventListener('pointerleave', off); t.removeEventListener('focus', on); t.removeEventListener('blur', off); t.classList.remove('is-twinkle'); });
      };
    }

    /* 2 · Orbit: three rings of logos circling a core (wide screens) ------- */
    function orbit() {
      if (!wide()) return constellation();
      const SIZES = [11, 18, 26];                 // inner, middle, outer
      const RADII = [0.2, 0.33, 0.46];            // share of the stage width
      const wrap = document.createElement('div');
      wrap.className = 'orbit';
      wrap.innerHTML = '<div class="orbit__core" aria-hidden="true"><img src="assets/img/logo-icon.svg" alt=""><b>' + tools.length + '</b><span>tools</span></div>';
      const rings = SIZES.map((n, k) => { const ul = document.createElement('ul'); ul.className = 'orbit__ring orbit__ring--' + (k + 1); ul.setAttribute('aria-label', 'Tools we work with'); wrap.appendChild(ul); return ul; });
      let at = 0;
      [2, 1, 0].forEach((k) => {
        const n = SIZES[k];
        for (let j = 0; j < n && at < tools.length; j++, at++) {
          const t = tools[at];
          t.style.setProperty('--a', (j / n) * 360 + (k * 7) + 'deg');
          const orb = document.createElement('span');
          orb.className = 'tool__orb';
          while (t.firstChild) orb.appendChild(t.firstChild);
          t.appendChild(orb);
          rings[k].appendChild(t);
        }
      });
      stage.appendChild(wrap);
      grid.hidden = true;
      const size = () => { const w = wrap.offsetWidth; rings.forEach((r, k) => r.style.setProperty('--R', Math.round(w * RADII[k]) + 'px')); };
      size();
      addEventListener('resize', size);
      return () => {
        removeEventListener('resize', size);
        tools.forEach((t) => { const orb = t.querySelector('.tool__orb'); if (orb) { while (orb.firstChild) t.appendChild(orb.firstChild); orb.remove(); } t.style.removeProperty('--a'); grid.appendChild(t); });
        wrap.remove(); grid.hidden = false;
      };
    }

    // Orbit on wide screens, the constellation grid on tablets and phones;
    // rebuilt when the screen crosses that width
    box.dataset.anim = '2';
    let cleanup = orbit() || (() => {});
    const mq = matchMedia('(min-width: 900px)');
    const swap = () => { cleanup(); cleanup = orbit() || (() => {}); if (seen) enter(); };
    if (mq.addEventListener) mq.addEventListener('change', swap); else mq.addListener(swap);
  }

  function start() {
    doc.classList.add('fx-ready');
    transitionLabel();
    toolStack();
    celestial();
  }
  if (window.agila && window.agila.ready) start();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 0));
  else start();
})();
