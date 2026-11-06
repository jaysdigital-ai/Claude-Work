/* Blog posts: marks the section you're reading in the side contents list. */
(() => {
  const links = [...document.querySelectorAll('.post__toc a[href^="#"]')];
  if (!links.length) return;
  const pairs = links.map((a) => [document.getElementById(a.getAttribute('href').slice(1)), a]).filter(([t]) => t);
  let queued = false;
  const update = () => {
    queued = false;
    const line = innerHeight * 0.35;              // the heading that last passed the upper third
    let here = null;
    for (const [t, a] of pairs) if (t.getBoundingClientRect().top <= line) here = a;
    links.forEach((a) => a.classList.toggle('is-here', a === here));
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();
