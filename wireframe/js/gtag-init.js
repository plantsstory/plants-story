// gtag.js itself comes after the page is parsed, so it does not hold up the first view from a slow phone line
// (board 11 T156); the calls made before then wait in dataLayer and are sent when it arrives.
(function () {
  var loaded = false;
  function load() {
    if (loaded) return; loaded = true;
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=G-KJK72JH471';
    document.head.appendChild(g);
  }
  if (document.readyState !== 'loading') setTimeout(load, 0);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(load, 0); });
  setTimeout(load, 4000);
})();
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-KJK72JH471', { send_page_view: true });

// Core Web Vitals → GA4
(function() {
  function sendToGA4(metric) {
    gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true
    });
  }
  // Self-hosted (unpkg.com is blocked by CSP); absolute path works from static stub pages too
  var vitalsRoot = location.hostname === 'plantsstory.github.io' ? '/plants-story/' : '/';
  var s = document.createElement('script');
  s.src = vitalsRoot + 'js/vendor/web-vitals.iife.js';
  s.async = true;
  s.onload = function() {
    if (window.webVitals) {
      webVitals.onCLS(sendToGA4);
      webVitals.onINP(sendToGA4);
      webVitals.onLCP(sendToGA4);
      webVitals.onFCP(sendToGA4);
      webVitals.onTTFB(sendToGA4);
    }
  };
  document.head.appendChild(s);
}());
