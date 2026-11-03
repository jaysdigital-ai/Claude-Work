/* ==========================================================================
   Desk interfaces: laptop clock, dashboard counters, the booking chat.
   ========================================================================== */
(() => {
  // Laptop menu-bar clock
  const clock = document.querySelector('[data-clock]');
  const tick = () => { if (clock) clock.textContent = new Date().toLocaleTimeString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }); };
  tick();
  setInterval(tick, 20000);

  // Dashboard numbers count up each time the tablet opens
  const dash = document.querySelector('[data-ui="tablet"]');
  if (dash) {
    new MutationObserver(() => {
      if (!dash.classList.contains('is-open')) return;
      dash.querySelectorAll('[data-count]').forEach((el) => {
        const end = Number(el.dataset.count), start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / 1400), e = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(end * e).toLocaleString();
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }).observe(dash, { attributes: true, attributeFilter: ['class'] });
  }

  // Phone: a short scripted chat that ends at the booking button
  const log = document.querySelector('[data-chat-log]');
  const choices = document.querySelector('[data-chat-choices]');
  const REPLIES = {
    leads: ['More leads, please.', 'A focused funnel plus follow-up automation usually lifts leads from the traffic you already have. Want us to map yours on a free call?'],
    time: ['Less admin.', 'We automate the busywork: instant replies, CRM tagging, reminders and follow-ups. Most owners get hours back every week.'],
    rank: ['Rank on Google.', 'Technical fixes, on-page work and planned content, reported monthly in plain English. A free call is the best place to start.'],
  };
  const add = (cls, text) => {
    const p = document.createElement('p');
    p.className = cls;
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  };
  choices?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-reply]');
    if (!b) return;
    const [me, them] = REPLIES[b.dataset.reply];
    add('me', me);
    choices.hidden = true;
    const typing = document.createElement('p');
    typing.className = 'them typing';
    typing.textContent = '•••';
    setTimeout(() => { log.appendChild(typing); log.scrollTop = log.scrollHeight; }, 300);
    setTimeout(() => { typing.remove(); add('them', them); }, 1300);
  });
})();
