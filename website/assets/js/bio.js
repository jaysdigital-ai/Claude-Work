/* ==========================================================================
   Interactive founder portrait ([data-bio]): the figure, its halo and the
   orbiting skill tags sit at different depths and tilt toward the pointer,
   so they slide past each other. Tapping on a phone spreads the tags.
   ========================================================================== */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-bio]').forEach((fig) => {
    const stage = fig.querySelector('.bio__stage');
    fig.addEventListener('click', () => fig.classList.toggle('is-active'));
    if (reduce) return;
    fig.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = fig.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      stage.style.transition = 'transform .25s ease-out';
      stage.style.transform = `rotateY(${nx * 22}deg) rotateX(${-ny * 14}deg)`;
    });
    fig.addEventListener('pointerleave', () => {
      stage.style.transition = '';
      stage.style.transform = '';
    });
  });
})();
