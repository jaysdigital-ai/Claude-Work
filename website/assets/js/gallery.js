/* ==========================================================================
   Gallery of marketing mockups (social posts, ads, landing pages, emails,
   dashboards...). Every tile is drawn in HTML/CSS and sizes itself from its
   own width, so the same tile works in the services rail, the about collage
   and the contact strip. The businesses shown are made up (concept pieces).
   ========================================================================== */
(() => {
  const icon = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 01-11.8 7L4 20l1-4.2A8 8 0 1120 12z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  };
  const stars = (n) => '<span class="mk__stars">' + '★'.repeat(n) + '</span>';

  const TILES = {
    post: () => `
      <div class="mk mk--post">
        <div class="mk__bar"><i class="mk__avatar" style="--a:#c2562b"></i><b>brioloo.bakehouse</b><span>Sponsored</span></div>
        <div class="mk__media mk__media--bake">
          <span class="mk__kicker">Weekends only</span>
          <strong>Ube <em>ensaymada</em></strong>
          <i class="mk__bun"></i><i class="mk__bun mk__bun--2"></i>
          <span class="mk__pill">Pre-order now</span>
        </div>
        <div class="mk__actions">${icon.heart}${icon.chat}${icon.send}<span></span>${icon.save}</div>
        <p class="mk__cap"><b>1,284 likes</b> <b>brioloo.bakehouse</b> Soft, buttery, and gone by 10am…</p>
      </div>`,

    story: () => `
      <div class="mk mk--phone mk--story">
        <div class="mk__screen">
          <div class="mk__progress"><i></i><i></i><i></i></div>
          <div class="mk__bar mk__bar--light"><i class="mk__avatar" style="--a:#1f6f5c"></i><b>kettlewisp.fit</b></div>
          <strong>New year,<br><em>new routine.</em></strong>
          <p>First class free for new members</p>
          <span class="mk__cta">Book a class</span>
        </div>
      </div>`,

    laptop: () => `
      <div class="mk mk--laptop">
        <div class="mk__lid"><div class="mk__screen">
          <div class="mk__nav"><b>Molarvia Dental</b><span></span><span></span><span></span><i>Book online</i></div>
          <div class="mk__hero">
            <div><small>Family dentistry</small><strong>Healthy smiles, <em>zero waiting.</em></strong><p>Same-week appointments and clear prices before we start.</p><span class="mk__cta">Book a check-up</span>
              <div class="mk__proof">${stars(5)}<span>4.9 from 312 patients</span></div></div>
            <div class="mk__form"><b>Request a visit</b><i></i><i></i><i></i><span>Send request</span></div>
          </div>
        </div></div>
        <div class="mk__base"></div>
      </div>`,

    dashboard: () => `
      <div class="mk mk--dash">
        <div class="mk__dhead"><b>Growth report</b><span>Last 30 days</span></div>
        <div class="mk__kpis">
          <div><small>Leads</small><b>248</b><em>▲ 32%</em></div>
          <div><small>Booked calls</small><b>61</b><em>▲ 18%</em></div>
          <div><small>Cost per lead</small><b>$9.40</b><em class="is-down">▼ 21%</em></div>
        </div>
        <svg class="mk__chart" viewBox="0 0 300 110" preserveAspectRatio="none">
          <path class="mk__area" d="M0 95 C30 90 45 80 70 82 S120 60 150 62 S200 40 225 35 S270 18 300 12 V110 H0Z"/>
          <path class="mk__line" d="M0 95 C30 90 45 80 70 82 S120 60 150 62 S200 40 225 35 S270 18 300 12"/>
          <path class="mk__line mk__line--b" d="M0 100 C40 98 70 96 100 92 S170 88 200 80 S260 74 300 70"/>
        </svg>
        <div class="mk__bars">${[38, 52, 46, 64, 58, 72, 80, 76, 92, 88, 100, 96].map((h) => `<i style="--h:${h}%"></i>`).join('')}</div>
      </div>`,

    email: () => `
      <div class="mk mk--email">
        <div class="mk__ehead"><i class="mk__avatar" style="--a:#3a4fb8"></i><div><b>Arvenhall Law</b><span>to you · 8:02 AM</span></div></div>
        <div class="mk__ebody">
          <div class="mk__ebanner"><small>Free guide inside</small><strong>5 contract mistakes <em>small businesses</em> make</strong></div>
          <p>Hi Ana, most of the disputes we see start with one missing line in a contract…</p>
          <i></i><i></i><i class="short"></i>
          <span class="mk__cta">Read the guide</span>
        </div>
      </div>`,

    carousel: () => `
      <div class="mk mk--carousel">
        <div class="mk__slide mk__slide--3"></div>
        <div class="mk__slide mk__slide--2"><b>02</b></div>
        <div class="mk__slide mk__slide--1">
          <small>Swipe →</small>
          <strong>5 signs your funnel is <em>leaking leads</em></strong>
          <span class="mk__dots"><i></i><i></i><i></i><i></i><i></i></span>
        </div>
      </div>`,

    listing: () => `
      <div class="mk mk--listing">
        <div class="mk__map"><i class="mk__road"></i><i class="mk__road mk__road--v"></i><i class="mk__road mk__road--d"></i><span class="mk__pin">${icon.pin}</span></div>
        <div class="mk__lcard">
          <b>Lumiquay Studio · Photography</b>
          <div>${stars(5)} <span>4.9 (128)</span></div>
          <p><em>Open</em> · Closes 7 PM · 1.2 km</p>
          <div class="mk__lbtns"><span>Call</span><span>Directions</span><span>Website</span></div>
        </div>
      </div>`,

    workflow: () => `
      <div class="mk mk--flow">
        <div class="mk__fhead"><b>New lead follow-up</b><span class="mk__live">Live</span></div>
        <div class="mk__node mk__node--start"><i>⚡</i><div><b>Form submitted</b><span>Website contact form</span></div></div>
        <div class="mk__node"><i>✉</i><div><b>Send welcome email</b><span>Instantly</span></div></div>
        <div class="mk__node"><i>⏱</i><div><b>Wait 1 day</b><span>If not booked</span></div></div>
        <div class="mk__node"><i>💬</i><div><b>Text a booking link</b><span>SMS</span></div></div>
        <div class="mk__node mk__node--end"><i>🔔</i><div><b>Notify the team</b><span>Hot lead</span></div></div>
      </div>`,

    optin: () => `
      <div class="mk mk--phone mk--optin">
        <div class="mk__screen">
          <small>Free download</small>
          <div class="mk__book"><b>The Local <em>SEO</em> Checklist</b><span>27 quick wins</span></div>
          <strong>Get found by customers near you</strong>
          <i class="mk__input">Your email</i>
          <span class="mk__cta">Send me the checklist</span>
          <p>Join 3,000+ local business owners</p>
        </div>
      </div>`,

    banner: () => `
      <div class="mk mk--banners">
        <div class="mk__banner mk__banner--a"><div><small>Ad · Molarvia Dental</small><strong>Toothache? <em>Seen today.</em></strong></div><span class="mk__cta">Book now</span></div>
        <div class="mk__banner mk__banner--b"><div><small>Ad · Kettlewisp Fitness</small><strong>Your first class <em>is on us</em></strong></div><span class="mk__cta">Claim it</span></div>
      </div>`,

    brand: () => `
      <div class="mk mk--brand">
        <div class="mk__bhead"><b>Brioloo Bakehouse</b><span>Brand kit</span></div>
        <div class="mk__aa"><b>Aa</b><em>Aa</em></div>
        <div class="mk__swatches"><i style="--s:#c2562b"></i><i style="--s:#f3d9b1"></i><i style="--s:#5b2a86"></i><i style="--s:#2b211c"></i></div>
        <div class="mk__logo"><i></i><b>brioloo</b></div>
      </div>`,

    serp: () => `
      <div class="mk mk--serp">
        <div class="mk__q">${icon.search}<span>family dentist near me</span></div>
        <div class="mk__res mk__res--you"><small>molarvia.example</small><b>Molarvia Dental · Same-week appointments</b><p>${stars(5)} 4.9 · Open today · Clear prices before we start</p><span class="mk__rank">#1</span></div>
        <div class="mk__res"><small>dental-clinic.example</small><b>Dental clinic in your area</b><p></p></div>
        <div class="mk__res"><small>dentist-directory.example</small><b>Top 10 dentists near you</b><p></p></div>
      </div>`,
  };

  const LAYOUTS = {
    rail: ['laptop', 'post', 'story', 'dashboard', 'email', 'carousel', 'listing', 'workflow', 'optin', 'banner', 'brand', 'serp'],
    collage: ['laptop', 'post', 'story', 'dashboard', 'brand', 'email', 'carousel'],
    strip: ['post', 'dashboard', 'story', 'banner', 'email', 'listing', 'optin', 'workflow', 'carousel'],
  };
  const LABELS = {
    post: 'Social post', story: 'Story ad', laptop: 'Landing page', dashboard: 'Reporting', email: 'Email campaign',
    carousel: 'Carousel', listing: 'Local SEO', workflow: 'Automation', optin: 'Lead magnet', banner: 'Ad creatives',
    brand: 'Brand kit', serp: 'Search ranking',
  };

  document.querySelectorAll('[data-gallery]').forEach((box) => {
    const kind = box.dataset.gallery;
    const names = LAYOUTS[kind];
    const tile = (n, i) => `<figure class="tile tile--${n}" style="--i:${i}">${TILES[n]()}<figcaption>${String(i + 1).padStart(2, '0')} · ${LABELS[n]}</figcaption></figure>`;
    const html = names.map(tile).join('');
    box.innerHTML = kind === 'strip' ? `<div class="strip__track">${html}${html}</div>` : html;
  });

  /* Motion, once the page's own animations are set up --------------------- */
  const start = () => {
    const { gsap, ScrollTrigger } = window;
    const { animate, finePointer } = window.agila || {};

    // Services: the rail scrolls sideways while the section is pinned (desktop)
    document.querySelectorAll('.gallery--rail').forEach((sec) => {
      const rail = sec.querySelector('.rail');
      const track = sec.querySelector('.rail__track');
      if (!animate || innerWidth < 900) return;
      rail.classList.add('is-pinned');
      const distance = () => Math.max(0, track.scrollWidth - rail.clientWidth);
      gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      gsap.from(track.children, { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: rail, start: 'top 85%' } });
    });

    // About: tiles drift at different speeds
    document.querySelectorAll('.collage').forEach((box) => {
      if (!animate) return;
      [...box.children].forEach((t, i) => {
        const speed = [-60, 40, -110, 70, -30, 90, -80][i % 7];
        gsap.fromTo(t, { y: -speed / 2 }, { y: speed, ease: 'none', scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: true } });
        gsap.from(t.firstElementChild, { scale: 0.86, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 92%' } });
      });
    });

    // Contact: the strip drifts on its own and follows the scroll direction
    document.querySelectorAll('.strip__track').forEach((track) => {
      if (!animate) return;
      let x = 0, dir = 1, slow = 1;
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { dir = s.direction; } });
      track.addEventListener('pointerenter', () => { slow = 0.15; });
      track.addEventListener('pointerleave', () => { slow = 1; });
      gsap.ticker.add((t, dt) => {
        const half = track.scrollWidth / 2;
        x -= 0.035 * dt * dir * slow;
        x = ((x % half) - half) % half;
        track.style.transform = `translate3d(${x}px,0,0)`;
      });
    });

    // Tiles lean toward the pointer
    if (finePointer && animate) {
      document.querySelectorAll('.tile').forEach((t) => {
        const mk = t.firstElementChild;
        t.addEventListener('pointermove', (e) => {
          const r = t.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
          mk.style.transform = `perspective(900px) rotateY(${nx * 8}deg) rotateX(${-ny * 8}deg) translateY(-6px)`;
        });
        t.addEventListener('pointerleave', () => { mk.style.transform = ''; });
      });
    }
    ScrollTrigger.refresh();
  };
  if (window.agila && window.agila.ready) start();
  else window.addEventListener('agila:ready', start, { once: true });
})();
