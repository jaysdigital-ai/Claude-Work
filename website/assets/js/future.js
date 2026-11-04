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

  function start() {
    doc.classList.add('fx-ready');
    transitionLabel();
    celestial();
  }
  if (window.agila && window.agila.ready) start();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 0));
  else start();
})();
