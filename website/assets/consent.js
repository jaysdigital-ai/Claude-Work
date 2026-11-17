/* Google Analytics, only with consent (same behaviour as the previous site).
   G-4ZYP9XDZJ4 loads only after the visitor clicks "Allow" on the cookie banner.
   The choice is kept in local storage (agila-consent: granted | denied) and can be
   changed from the Cookie Policy page (any element with data-cookie-settings). */
(function () {
  var GA_ID = 'G-4ZYP9XDZJ4', KEY = 'agila-consent';
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function load() {
    if (window.__agilaGa) return; window.__agilaGa = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', GA_ID);
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID; document.head.appendChild(s);
  }
  function clear() {
    var host = location.hostname.replace(/^www\./, '');
    document.cookie.split(';').map(function (c) { return c.split('=')[0].trim(); }).filter(function (n) { return /^_ga/.test(n); }).forEach(function (n) {
      ['domain=.' + host, 'domain=' + host, ''].forEach(function (d) { document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; ' + d; });
    });
  }
  function banner() {
    if (document.querySelector('.cookie-note')) return;
    var n = document.createElement('div');
    n.className = 'cookie-note'; n.setAttribute('role', 'region'); n.setAttribute('aria-label', 'Cookie choice');
    n.innerHTML = '<p>Can we use Google Analytics cookies to see how visitors use this site? They stay off unless you allow them. <a href="/cookies.html">Cookie Policy</a></p>'
      + '<div class="cookie-note__actions"><button type="button" data-choice="denied" class="cookie-note__no">No thanks</button><button type="button" data-choice="granted">Allow</button></div>';
    document.body.appendChild(n);
    requestAnimationFrame(function () { n.classList.add('is-in'); });
    n.querySelectorAll('[data-choice]').forEach(function (b) {
      b.addEventListener('click', function () {
        var choice = b.getAttribute('data-choice'), was = get(); set(choice);
        if (choice === 'granted') load(); else { clear(); if (was === 'granted') location.reload(); }
        n.classList.remove('is-in'); setTimeout(function () { n.remove(); }, 500);
      });
    });
  }
  var c = get();
  if (c === 'granted') load(); else if (c !== 'denied') banner();
  document.querySelectorAll('[data-cookie-settings]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); banner(); }); });
})();
