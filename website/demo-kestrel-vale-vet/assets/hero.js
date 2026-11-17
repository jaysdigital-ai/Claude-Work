(function () {
  var hero = document.querySelector('.hero, .phero'); if (!hero) return;
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5).toFixed(3));
    hero.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5).toFixed(3));
  });
  hero.addEventListener('pointerleave', function () { hero.style.setProperty('--mx', 0); hero.style.setProperty('--my', 0); });
  var fig = document.querySelector('.hero-photo.slides');
  if (fig) {
    var imgs = fig.querySelectorAll('img'), dots = fig.querySelectorAll('.hp-dots span'), i = 0;
    setInterval(function () {
      imgs[i].classList.remove('on'); dots[i].classList.remove('on');
      i = (i + 1) % imgs.length; imgs[i].classList.add('on'); dots[i].classList.add('on');
    }, 5000);
  }
  var deck = document.querySelector('.deck');
  if (deck) {
    var cards = deck.querySelectorAll('.dc'), n = 0;
    setInterval(function () { n++; cards.forEach(function (c, k) { c.className = 'dc p' + (((k - n) % 3) + 3) % 3; }); }, 3200);
  }
})();
