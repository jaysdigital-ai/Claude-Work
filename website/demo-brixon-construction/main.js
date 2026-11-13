/* Brixon — interface behaviour (no dependencies) */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- nav ---------- */
  const nav = $('#nav'), burger = $('#burger'), links = $('#navLinks');
  const onScrollNav = () => nav.classList.toggle('stuck', scrollY > 40);
  addEventListener('scroll', onScrollNav, { passive: true }); onScrollNav();
  const setMenu = open => {
    links.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  links.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

  /* ---------- products ---------- */
  const products = [
    ['Electrical & Electronic Supplies', 'Wiring, devices, panels and testing gear for power and auxiliary systems.'],
    ['Structural & Architectural Supplies', 'Steel, cement, blocks, finishes — from the frame to the final coat.'],
    ['Personal Protective Equipment', 'Hard hats, eyewear, hearing and fall protection for every trade on site.'],
    ['Hardware', 'Hand tools, fasteners, fittings and the consumables crews burn through.'],
    ['Fire Protection & Alarm System', 'Detection, alarm and suppression components, supplied and installed.'],
    ['Security System', 'CCTV and access hardware for buildings under construction and in use.'],
  ];
  const grid = $('#tiltGrid');
  /* product illustrations, drawn here (no external images) */
  const pBg = ['#12171B', '#1570B8', '#1F262D', '#12171B', '#1F262D', '#1570B8'];
  grid.innerHTML = products.map(([t, d], i) => `
    <article class="tilt reveal" style="transition-delay:${(i % 3) * 90}ms">
      <div class="tilt-img" style="background:${pBg[i]}"><svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><pattern id="pg${i}" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#fff" stroke-opacity=".07"/></pattern></defs>
        <rect width="400" height="500" fill="url(#pg${i})"/></svg></div>
      <span class="tilt-no mono">P—0${i + 1}</span>
      <div class="tilt-body"><h3>${t}</h3><p>${d}</p></div>
      <i class="tilt-bar"></i>
    </article>`).join('');


  if (fine && !reduce) {
    $$('.tilt').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.classList.add('live');
        card.style.transitionDelay = '0ms';
        card.style.setProperty('--ry', (x - .5) * 16 + 'deg');
        card.style.setProperty('--rx', (.5 - y) * 13 + 'deg');
        card.style.setProperty('--ix', (.5 - x) * 18 + 'px');
        card.style.setProperty('--iy', (.5 - y) * 18 + 'px');
        card.style.setProperty('--gx', x * 100 + '%');
        card.style.setProperty('--gy', y * 100 + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('live');
        ['--ry', '--rx', '--ix', '--iy'].forEach(p => card.style.setProperty(p, p[2] === 'r' ? '0deg' : '0px'));
      });
    });
    // gentle tilt on the about frame and the quote form
    [['.frame', '.frame-inner', 7]].forEach(([zone, target, amt]) => {
      const z = $(zone), t = $(target);
      z.addEventListener('pointermove', e => {
        const r = z.getBoundingClientRect();
        t.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * amt + 'deg');
        t.style.setProperty('--rx', (.5 - (e.clientY - r.top) / r.height) * amt + 'deg');
      });
      z.addEventListener('pointerleave', () => { t.style.setProperty('--ry', '0deg'); t.style.setProperty('--rx', '0deg'); });
    });
    // magnetic buttons
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transition = 'transform .6s cubic-bezier(.2,.7,.1,1),background .35s'; b.style.transform = ''; setTimeout(() => b.style.transition = '', 600); });
    });
  }

  /* ---------- split headlines + reveals ---------- */
  $$('[data-split]').forEach(el => {
    let i = 0;
    const wrapWords = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.style.setProperty('--i', i++); s.textContent = part;
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          const w = document.createElement('span'); w.className = 'w';
          const s = document.createElement('span'); s.style.setProperty('--i', i++);
          n.replaceWith(w); s.append(n); w.append(s);
        }
      });
    };
    wrapWords(el);
  });
  $$('#svcList li').forEach((li, i) => li.style.setProperty('--i', i % 6));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-split], .reveal, #svcList, .frame').forEach(el => io.observe(el));
  requestAnimationFrame(() => $('h1').classList.add('in'));

  /* ---------- marquee ---------- */
  const track = $('#logos');
  track.innerHTML += track.innerHTML + track.innerHTML + track.innerHTML;

  /* ---------- scroll parallax ---------- */
  const frame = $('.frame-inner'), word = $('.foot-word');
  const par = () => {
    if (reduce) return;
    const vh = innerHeight;
    const r = frame.getBoundingClientRect();
    if (r.bottom > 0 && r.top < vh) frame.style.setProperty('--py', ((r.top + r.height / 2 - vh / 2) / vh * -7).toFixed(2) + '%');
    const w = word.getBoundingClientRect();
    if (w.top < vh) word.style.setProperty('--fy', clamp((w.bottom - vh) * .35, 0, 200).toFixed(1));
  };
  addEventListener('scroll', par, { passive: true }); par();

  /* ---------- projects: 3D ring ---------- */
  const projects = [
    ['Harbour Point Residences', 'Northgate Builders', 'Lapu-Lapu City, Cebu', 'Major renovation (10 units)', 'Completed'],
    ['3-Level Storage Office', 'Orrin Developments', 'Cebu City', 'Set-up of storage & office using 20′ container vans', 'Completed'],
    ['Parking Area Concreting', 'Orrin Developments', 'Cebu City', 'Supply of labor and materials for parking area concreting', 'Completed'],
    ['Tiling Works & Plastering', 'Sample Foods, Inc.', 'Mandaue City, Cebu', 'Plastering & tile installation at commissary', 'Completed'],
    ['Clearspring Water Refilling & STP', 'Mr. Juan Sample', 'Masbate', 'Water refilling set-up', 'Completed'],
    ['Bluewell Water Refilling & STP', 'Mr. Pedro Sample', 'Cebu City', 'Water refilling set-up', 'Completed'],
    ['House Renovation', 'Ms. Maria Sample', 'Liloan, Cebu', 'General house renovation', 'Ongoing'],
  ];
  /* blueprint drawing for each project card (drawn here, no external images) */
  const art = i => {
    const L = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}"/>`;
    const R = (x, y, w, h, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${extra}/>`;
    const rep = (n, f) => Array.from({ length: n }, (_, k) => f(k)).join('');
    const G = 172; // ground line
    const draw = [
      // residential tower, elevation
      () => R(214, 18, 92, G - 18) + rep(11, k => L(214, 32 + k * 13, 306, 32 + k * 13)) + rep(3, k => L(237 + k * 23, 18, 237 + k * 23, G - 24)) +
        R(170, G - 24, 180, 24) + R(120, 84, 50, G - 84) + rep(6, k => L(120, 98 + k * 13, 170, 98 + k * 13)) + R(350, 62, 58, G - 62) + rep(8, k => L(350, 76 + k * 13, 408, 76 + k * 13)) + R(250, 6, 20, 12, 'class="f"'),
      // three-level container office
      () => rep(3, l => R(170, G - 40 - l * 40, 180, 40) + rep(17, k => L(180 + k * 10, G - 36 - l * 40, 180 + k * 10, G - 4 - l * 40)) + R(196, G - 30 - l * 40, 34, 20, 'class="f"')) +
        `<path d="M350 ${G}L390 ${G - 40}L350 ${G - 40}M390 ${G - 40}L430 ${G - 80}L350 ${G - 80}"/>` + rep(8, k => L(355 + k * 5, G - k * 5, 355 + k * 5, G - k * 5 - 12)) + L(430, G, 430, G - 80),
      // parking slab, plan
      () => R(70, 34, 380, 122) + rep(10, k => L(90 + k * 38, 34, 90 + k * 38, 70) + L(90 + k * 38, 120, 90 + k * 38, 156)) +
        `<path d="M110 95H400M392 89l8 6-8 6" />` + R(94, 40, 30, 26, 'class="f"') + R(246, 126, 30, 26, 'class="f"') + R(360, 40, 30, 26, 'class="f"'),
      // tiling & plastering, wall elevation
      () => R(120, 24, 280, G - 24) + rep(9, k => L(120 + (k + 1) * 28, 24, 120 + (k + 1) * 28, G)) + rep(4, k => L(120, 24 + (k + 1) * 29.6, 400, 24 + (k + 1) * 29.6)) +
        [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [0, 2], [3, 0], [2, 1]].map(([c, r]) => R(121 + c * 28, G - 29.6 * (r + 1) + 1, 26, 27.6, 'class="f"')).join('') + `<path d="M330 60l34 22-10 14-34-22zM364 82l22 30" />`,
      // water refilling station, schematic
      () => rep(3, k => R(150 + k * 62, 64, 40, G - 64, 'rx="20"') + L(170 + k * 62, 64, 170 + k * 62, 44) + R(162 + k * 62, 104, 16, 30, 'class="f"')) +
        L(120, 44, 360, 44) + L(360, 44, 360, 96) + R(336, 96, 70, G - 96) + L(336, 118, 406, 118) + `<circle cx="120" cy="44" r="7"/>` + L(406, 150, 440, 150) + L(440, 150, 440, G),
      // water refilling & STP, schematic
      () => R(130, 40, 110, G - 40, 'rx="10"') + L(130, 70, 240, 70) + R(150, 96, 70, 50, 'class="f"') + rep(2, k => R(286 + k * 58, 78, 36, G - 78, 'rx="18"') + L(304 + k * 58, 78, 304 + k * 58, 56)) +
        L(240, 56, 400, 56) + L(400, 56, 400, G) + `<circle cx="270" cy="56" r="7"/><circle cx="400" cy="110" r="9"/>`,
      // house renovation, elevation with scaffold
      () => R(170, 92, 180, G - 92) + `<path d="M154 94L260 34L366 94"/>` + R(244, 126, 32, G - 126) + R(190, 110, 36, 30, 'class="f"') + R(296, 110, 36, 30, 'class="f"') + R(248, 62, 24, 20) +
        rep(4, k => L(372 + k * 22, 40, 372 + k * 22, G)) + rep(3, k => L(372, 70 + k * 36, 438, 70 + k * 36)) + `<path d="M372 ${G}L438 142M372 142L438 106M372 106L438 70" class="t"/>`,
    ][i];
    return `<svg viewBox="0 0 520 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Blueprint drawing">
      <defs><pattern id="bp${i}" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" class="g"/></pattern></defs>
      <rect width="520" height="200" fill="url(#bp${i})"/>
      <g class="d">${draw()}</g>
      <path d="M40 ${G}H480" class="gl"/><path d="M60 188H460M60 183v10M460 183v10" class="t"/>
      <text x="28" y="28">DWG ${String(i + 1).padStart(2, '0')}</text><text x="492" y="28" text-anchor="end">NOT TO SCALE</text>
    </svg>`;
  };

  const ring = $('#ring'), stage = $('#ringStage'), N = projects.length, step = 360 / N;
  ring.innerHTML = projects.map(([name, client, loc, scope, status], i) => `
    <article class="pcard" aria-label="${name}">
      <div class="pcard-top"><span class="mono">Project ${String(i + 1).padStart(2, '0')}</span><span class="status mono ${status.toLowerCase()}">${status}</span></div>
      <h3>${name}</h3>
      <dl><dt>Client</dt><dd>${client}</dd><dt>Location</dt><dd>${loc}</dd><dt>Scope</dt><dd>${scope}</dd></dl>
      <div class="pcard-art">${art(i)}</div>
    </article>`).join('');
  const cards = $$('.pcard', ring);
  let radius = 0, angle = 0, target = 0, dragging = false, lastX = 0, vel = 0, ringOn = false;
  const layout = () => {
    const cw = Math.min(540, innerWidth * .84), ch = Math.min(stage.clientHeight - 30, cw < 400 ? 400 : 430);
    stage.style.setProperty('--cw', cw + 'px'); stage.style.setProperty('--ch', ch + 'px');
    radius = cw / 2 / Math.tan(Math.PI / N) + (innerWidth < 820 ? 14 : 46);
    cards.forEach((c, i) => c.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`);
    draw();
  };
  const draw = () => {
    ring.style.transform = `translateZ(${-radius}px) rotateY(${angle}deg)`;
    cards.forEach((c, i) => {
      let d = ((i * step + angle) % 360 + 540) % 360 - 180;
      d = Math.abs(d);
      c.style.opacity = d > 95 ? 0 : clamp(1.05 - d / 110, 0, 1);
      c.style.pointerEvents = d < step / 2 ? 'auto' : 'none';
    });
    const idx = ((Math.round(-angle / step) % N) + N) % N;
    $('#ringNow').textContent = String(idx + 1).padStart(2, '0');
  };
  const tick = () => {
    if (!ringOn) return;
    if (!dragging) {
      const d = target - angle;
      if (Math.abs(d) > .02) { angle += d * (reduce ? 1 : .09); draw(); }
    }
    requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => { const was = ringOn; ringOn = e.isIntersecting; if (ringOn && !was) tick(); }).observe(stage);
  const go = dir => { target = Math.round(target / step) * step - dir * step; };
  $('#ringPrev').addEventListener('click', () => go(-1));
  $('#ringNext').addEventListener('click', () => go(1));
  stage.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; vel = 0; stage.classList.add('drag'); });
  addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    vel = dx; angle += dx * (innerWidth < 820 ? .32 : .16); draw();
  });
  const release = () => {
    if (!dragging) return;
    dragging = false; stage.classList.remove('drag');
    target = Math.round((angle + vel * 1.6) / step) * step;
  };
  addEventListener('pointerup', release); addEventListener('pointercancel', release);
  stage.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); });
  addEventListener('resize', layout); layout();

  /* ---------- quote form (demo: nothing is sent) ---------- */
  const form = $('#qform'), note = $('#formNote');
  const problems = () => {
    const bad = [];
    if (!form.elements.service.value) bad.push($('.chips', form));
    ['first', 'last'].forEach(n => { const f = form.elements[n]; if (!f.value.trim()) bad.push(f.closest('.fld')); });
    const em = form.elements.email; if (!em.value.trim() || !em.checkValidity()) bad.push(em.closest('.fld'));
    const ph = form.elements.phone; if (ph.value.replace(/\D/g, '').length < 7) bad.push(ph.closest('.fld'));
    return bad;
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    $$('.bad', form).forEach(x => x.classList.remove('bad'));
    const bad = problems();
    if (bad.length) {
      bad.forEach(x => x.classList.add('bad'));
      note.textContent = bad.length === 1 ? 'One detail still needs your attention.' : `${bad.length} details still need your attention.`;
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      const first = bad[0].querySelector('input, textarea'); if (first) first.focus();
      return;
    }
    note.textContent = '';
    $('#sentName').textContent = form.elements.first.value.trim();
    $('#sentMail').textContent = form.elements.email.value.trim();
    $('#sentSvc').textContent = form.elements.service.value;
    $('#sentRef').textContent = `BRX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    form.classList.add('is-sent');
    form.dispatchEvent(new CustomEvent('quote:sent'));
    form.reset();
  });
  form.addEventListener('input', e => {
    const slot = e.target.closest('.fld, .chips'); if (slot) slot.classList.remove('bad');
    if (!$('.bad', form)) note.textContent = '';
  });
  $('#sentAgain').addEventListener('click', () => {
    form.classList.remove('is-sent');
    form.dispatchEvent(new CustomEvent('quote:reset'));
    const f = $('.chip input', form); if (f) f.focus({ preventScroll: true });
  });

  $('#yr').textContent = new Date().getFullYear();
})();
