/* ==========================================================================
   Inner-page effects: Editorial (kinetic type, ink-fill text, marquee,
   outline numerals) plus Hands-on (working service demos, live brief).
   Option 1 runs first so option 3 can see what it changed.
   CSS for both lives in assets/css/fx.css, scoped with [data-fx~="1|3"].
   ========================================================================== */
(() => {
  document.documentElement.dataset.fx = '1 3';
  const start = async () => {
    for (const p of ['1', '3']) {
      try { await import(`./fx/option-${p}.js?v=20261111`); } catch (err) { console.error('Effects failed to load', err); }
    }
  };
  if (window.agila && window.agila.ready) start();
  else window.addEventListener('agila:ready', start, { once: true });
})();
