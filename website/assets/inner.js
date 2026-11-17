/* Small interactions kept from the older inner pages. */
(function () {
  // Pressing Eco case study: show the site in French or English
  document.querySelectorAll('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () {
      var lang = b.getAttribute('data-set-lang'), group = b.closest('figure, section') || document;
      group.querySelectorAll('.lang-shot').forEach(function (s) { s.setAttribute('data-lang', lang); });
      b.parentNode.querySelectorAll('[data-set-lang]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  });
  // Blog: highlight the section you're reading in the contents list
  var toc = document.querySelectorAll('.post__toc a');
  if (toc.length && 'IntersectionObserver' in window) {
    var map = {}; toc.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { toc.forEach(function (a) { a.classList.remove('on'); }); var a = map[e.target.id]; if (a) a.classList.add('on'); } });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }
})();
