/* ==========================================================================
   Interactions: smooth scroll, line reveals, page transitions,
   cursor, menu and the contact form.
   ========================================================================== */
(() => {
  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const animate = hasGsap && !reduce;
  if (!animate) doc.classList.remove('js-anim');

  if ('scrollRestoration' in history && !location.hash) {
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* Analytics, only with consent --------------------------------------------
     Google Analytics (G-4ZYP9XDZJ4) loads only after the visitor clicks
     "Allow" on the cookie banner. The choice is kept in local storage
     (agila-consent: granted | denied) and can be changed from the Cookie
     Policy page (any element with data-cookie-settings). */
  const GA_ID = 'G-4ZYP9XDZJ4';
  const CONSENT_KEY = 'agila-consent';
  const getConsent = () => { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } };
  const setConsent = (v) => { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) { /* storage unavailable */ } };
  function loadAnalytics() {
    if (window.__agilaGa) return;
    window.__agilaGa = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
  }
  // removes Google Analytics cookies when someone withdraws consent
  function clearAnalytics() {
    const host = location.hostname.replace(/^www\./, '');
    document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^_ga/.test(n)).forEach((n) => {
      [`domain=.${host}`, `domain=${host}`, ''].forEach((d) => { document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; ${d}`; });
    });
  }
  function consentBanner() {
    if (document.querySelector('.cookie-note')) return;
    const note = document.createElement('div');
    note.className = 'cookie-note';
    note.setAttribute('role', 'region');
    note.setAttribute('aria-label', 'Cookie choice');
    note.innerHTML = '<p>Can we use Google Analytics cookies to see how visitors use this site? They stay off unless you allow them. <a href="cookies.html">Cookie Policy</a></p>'
      + '<div class="cookie-note__actions"><button type="button" data-choice="denied" class="cookie-note__no">No thanks</button><button type="button" data-choice="granted">Allow</button></div>';
    document.body.appendChild(note);
    requestAnimationFrame(() => note.classList.add('is-in'));
    note.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', () => {
      const choice = b.dataset.choice;
      const was = getConsent();
      setConsent(choice);
      if (choice === 'granted') loadAnalytics();
      else { clearAnalytics(); if (was === 'granted') location.reload(); }   // reload unloads Analytics
      note.classList.remove('is-in');
      setTimeout(() => note.remove(), 500);
    }));
  }
  const consent = getConsent();
  if (consent === 'granted') loadAnalytics();
  else if (consent !== 'denied') consentBanner();
  document.querySelectorAll('[data-cookie-settings]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); consentBanner(); }));

  /* Smooth scroll ---------------------------------------------------------- */
  let lenis = null;
  if (animate && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 1 });
    lenis.on('scroll', window.ScrollTrigger.update);
    window.gsap.ticker.add((t) => lenis.raf(t * 1000));
    window.gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.4 });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  // Effects options (fx.js) start once headings are split and triggers exist
  window.agila = { lenis, animate, reduce, finePointer, ready: false };
  function ready() {
    window.agila.ready = true;
    window.dispatchEvent(new Event('agila:ready'));
  }

  /* Header: solid after scrolling, hides on the way down ------------------- */
  const header = document.querySelector('.header');
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 30);
    header.classList.toggle('is-hidden', y > 300 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Menu ------------------------------------------------------------------- */
  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.querySelector('.menu');
  if (menuBtn && menu) {
    const setOpen = (open) => {
      document.body.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.textContent = open ? 'Close' : 'Menu';
      menu.setAttribute('aria-hidden', String(!open));
      if (lenis) open ? lenis.stop() : lenis.start();
    };
    menuBtn.addEventListener('click', () => setOpen(!document.body.classList.contains('menu-open')));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  /* Page transitions -------------------------------------------------------- */
  const curtain = document.querySelector('.curtain');
  if (curtain && !reduce) {
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || a.target === '_blank') return;
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return;
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (url.pathname === location.pathname && url.hash) return;
        e.preventDefault();
        curtain.style.visibility = '';
        curtain.className = 'curtain is-cover';
        setTimeout(() => { location.href = url.href; }, 650);
      });
    });
    // Safety net: never leave the page covered if the CSS animation is paused
    setTimeout(() => {
      if (curtain.classList.contains('is-reveal')) { curtain.className = 'curtain'; curtain.style.visibility = 'hidden'; }
    }, 1400);
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) { curtain.className = 'curtain'; curtain.style.visibility = 'hidden'; }
    });
  } else if (curtain) {
    curtain.remove();
  }

  /* Cursor ----------------------------------------------------------------- */
  if (finePointer && !reduce) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.innerHTML = '<span></span>';
    document.body.appendChild(cursor);
    const label = cursor.firstChild;
    let x = -100, y = -100, cx = -100, cy = -100;
    window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; doc.classList.add('has-cursor'); }, { passive: true });
    document.addEventListener('pointerleave', () => doc.classList.remove('has-cursor'));
    (function loop() {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, summary, label').forEach((el) => {
      el.addEventListener('pointerenter', () => {
        const text = el.closest('[data-cursor]')?.dataset.cursor;
        if (text) { label.textContent = text; cursor.classList.add('is-view'); } else cursor.classList.add('is-link');
      });
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-link', 'is-view'));
    });

    // Magnetic buttons
    document.querySelectorAll('.btn').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* Split headings into masked lines ---------------------------------------- */
  function splitLines(el) {
    const words = [];
    const frag = document.createDocumentFragment();
    [...el.childNodes].forEach((node) => {
      if (node.nodeName === 'BR') return;
      const tag = node.nodeType === 1 ? node.tagName.toLowerCase() : 'span';
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement(tag);
        w.textContent = part;
        w.style.display = 'inline-block';
        frag.appendChild(w);
        words.push(w);
      });
    });
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.textContent = '';
    el.appendChild(frag);

    const lines = [];
    let top = null;
    // group words by where their text sits (box top + top padding): accent
    // words carry extra padding so their colour covers tall letters, which
    // moves their box up without moving the text
    words.forEach((w) => {
      const t = w.offsetTop + (parseFloat(getComputedStyle(w).paddingTop) || 0);
      if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; }
      lines[lines.length - 1].push(w);
    });
    el.textContent = '';
    lines.forEach((ws) => {
      const line = document.createElement('span');
      line.className = 'line';
      line.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      ws.forEach((w, i) => { inner.appendChild(w); if (i < ws.length - 1) inner.appendChild(document.createTextNode(' ')); });
      line.appendChild(inner);
      el.appendChild(line);
    });
    return el.querySelectorAll('.line > span');
  }

  /* Scroll animations ------------------------------------------------------- */
  if (animate) {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    // the curtain only plays between our own pages (see the head script)
    const introDelay = curtain && !doc.classList.contains('fx-direct') ? 0.55 : 0.1;

    const run = () => {
      document.querySelectorAll('[data-lines]').forEach((el) => {
        const inners = splitLines(el);
        el.style.visibility = 'visible';
        const inHero = el.closest('.hero, .page-hero');
        gsap.from(inners, {
          yPercent: 115, duration: 1.4, ease: 'expo.out', stagger: 0.09, delay: inHero ? introDelay : 0,
          scrollTrigger: inHero ? undefined : { trigger: el, start: 'top 88%' },
          // once the words have slid in, the lines stop clipping, so tall
          // letters, descenders, italic tails and lifted letters show in full
          onComplete: () => el.querySelectorAll('.line').forEach((l) => l.classList.add('is-open')),
        });
      });

      document.querySelectorAll('[data-reveal]').forEach((el) => {
        const inHero = el.closest('.hero, .page-hero');
        gsap.to(el, {
          opacity: 1, y: 0, duration: 1.3, ease: 'expo.out',
          delay: inHero ? introDelay + 0.35 + (Number(el.dataset.reveal) || 0) * 0.1 : 0,
          scrollTrigger: inHero ? undefined : { trigger: el, start: 'top 90%' },
        });
      });

      // Scroll progress bar
      const progressBar = document.createElement('div');
      progressBar.className = 'progress';
      document.body.appendChild(progressBar);
      gsap.to(progressBar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

      // Zoom out of the hero as you leave it
      document.querySelectorAll('.hero > .wrap, .page-hero > .wrap').forEach((w) => {
        gsap.to(w, {
          scale: 0.84, yPercent: -10, opacity: 0.1, ease: 'none', transformOrigin: '20% 90%',
          scrollTrigger: { trigger: w.parentElement, start: 'top top', end: 'bottom top', scrub: true },
        });
      });

      // Sections zoom in as they arrive (skipped where a sticky column needs an untransformed parent)
      document.querySelectorAll('main > section:not(.hero):not(.page-hero) > .wrap').forEach((w) => {
        if (w.querySelector('.svc__head, .contact__aside')) return;
        gsap.fromTo(w, { scale: 0.9, opacity: 0.3 }, {
          scale: 1, opacity: 1, ease: 'none', transformOrigin: '50% 0%',
          scrollTrigger: { trigger: w.parentElement, start: 'top bottom', end: 'top 35%', scrub: true },
        });
      });

      // Dark sections sit behind a pair of doors that swing open
      const mark = document.querySelector('.brand svg');
      document.querySelectorAll('main > section.dark').forEach((sec) => {
        const doors = document.createElement('div');
        doors.className = 'doors';
        doors.setAttribute('aria-hidden', 'true');
        doors.innerHTML = ['l', 'r'].map((s) =>
          `<div class="door door--${s}">${mark ? mark.outerHTML : ''}<span class="door__label">${s === 'l' ? 'The Digital' : 'Agila'}</span><i class="door__shade"></i></div>`).join('');
        sec.prepend(doors);
        const [left, right] = doors.children;
        gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 75%', end: 'top 5%', scrub: 0.6 } })
          .to(left, { rotateY: -100, ease: 'power2.in', duration: 1 }, 0)
          .to(right, { rotateY: 100, ease: 'power2.in', duration: 1 }, 0)
          .to(doors.querySelectorAll('.door__shade'), { opacity: 1, ease: 'none', duration: 1 }, 0)
          .set(doors, { autoAlpha: 0 }, 1);
      });

      // 3D flip-ins: rows open like flaps, stage cards swing in like doors
      const flip = (selector, from, stagger = 0.09, start = 'top 85%') => {
        document.querySelectorAll(selector).forEach((group) => {
          group.removeAttribute('data-stagger');
          gsap.from(group.children, {
            ...from, opacity: 0, duration: 1.4, ease: 'expo.out', stagger,
            scrollTrigger: { trigger: group, start },
          });
        });
      };
      flip('.index', { rotateX: -75, y: 30, transformOrigin: '50% 0%' }, 0.07);
      flip('.stages', { rotateY: -85, transformOrigin: '0% 50%' }, 0.12, 'top 70%');
      flip('.ways', { rotateY: -70, transformOrigin: '0% 50%' }, 0.12, 'top 75%');
      flip('.steps, .principles', { rotateX: -65, transformOrigin: '50% 0%' }, 0.1);
      flip('.faq, .why__list', { rotateX: -50, transformOrigin: '50% 0%' }, 0.06);

      // Footer sign-off: the eagle icon and line rise in together
      document.querySelectorAll('.footer__sign').forEach((el) => {
        gsap.from(el.children, {
          y: 30, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 95%' },
        });
      });

      document.querySelectorAll('[data-stagger]').forEach((group) => {
        gsap.from(group.children, {
          opacity: 0, y: 40, duration: 1.2, ease: 'expo.out', stagger: 0.08,
          scrollTrigger: { trigger: group, start: 'top 86%' },
        });
      });

      // Big CTA word drifts sideways with scroll
      document.querySelectorAll('[data-drift]').forEach((el) => {
        gsap.fromTo(el, { xPercent: 6, scale: 1.45 }, {
          // settles exactly on the page margin (it used to overshoot past it)
          xPercent: 0, scale: 1, ease: 'none', transformOrigin: '0% 50%',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom 30%', scrub: true },
        });
      });
      ScrollTrigger.refresh();
      ready();
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(run);
  } else {
    ready();
  }

  /* Contact form ------------------------------------------------------------ */
  const form = document.querySelector('[data-contact-form]');
  if (form) {
    const status = form.querySelector('.form__status');
    const button = form.querySelector('button[type="submit"]');
    const label = button.querySelector('.btn__label');
    const started = form.querySelector('[name="started"]');
    if (started) started.value = String(Date.now());          // spam check: bots submit instantly
    const showError = (text) => { status.textContent = text; status.classList.add('is-error'); };
    // Coming back from a submission made without JavaScript
    const params = new URLSearchParams(location.search);
    if (params.has('sent')) form.classList.add('is-sent');
    if (params.has('error')) showError('Sorry, that didn’t go through. Please try again, or email hello@thedigitalagila.com.');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      status.className = 'form__status';
      button.classList.add('is-loading');
      label.textContent = 'Sending…';
      try {
        const res = await fetch(form.getAttribute('action'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: new URLSearchParams(new FormData(form)).toString(),
        });
        const result = await res.json().catch(() => ({}));
        if (res.ok && result.ok) {
          form.classList.add('is-sent');
          form.querySelector('.form__success').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        } else if (res.status === 400 && result.message) {
          showError(result.message);
          const firstBad = result.fields && form.querySelector(`[name="${Object.keys(result.fields)[0]}"]`);
          if (firstBad) firstBad.focus();
        } else {
          throw new Error(result.error || res.status);
        }
      } catch (err) {
        showError('Sorry, that didn’t go through. Please try again in a moment, or email hello@thedigitalagila.com.');
      } finally {
        button.classList.remove('is-loading');
        label.textContent = 'Send message';
      }
    });
  }
})();
