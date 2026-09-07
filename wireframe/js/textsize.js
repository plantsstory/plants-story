/* Text size, three steps (標準 / 大 / 特大).
   Loaded in <head> so the choice is applied before the first paint: every size in the
   stylesheets is rem-based, so moving the root size scales body text, headings and labels
   together. The choice is per browser (localStorage). */
(function () {
  'use strict';
  var KEY = 'plants-story-textsize';
  var SIZES = ['normal', 'large', 'xlarge'];
  var root = document.documentElement;

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return SIZES.indexOf(v) !== -1 ? v : 'normal';
    } catch (e) { return 'normal'; }
  }
  function apply(v) {
    if (SIZES.indexOf(v) === -1) v = 'normal';
    if (v === 'normal') root.removeAttribute('data-textsize');
    else root.setAttribute('data-textsize', v);
    return v;
  }
  // before paint
  var current = apply(stored());

  window.setTextSize = function (v) {
    current = apply(v);
    try { localStorage.setItem(KEY, current); } catch (e) {}
    refreshButtons();
    if (typeof gtag === 'function') gtag('event', 'text_size', { size: current });
  };
  window.getTextSize = function () { return current; };

  function refreshButtons() {
    var btns = document.querySelectorAll('.textsize__btn');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-size') === current;
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      btns[i].classList.toggle('is-active', on);
    }
  }
  function init() {
    var groups = document.querySelectorAll('.textsize');
    for (var i = 0; i < groups.length; i++) {
      groups[i].addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.textsize__btn') : null;
        if (!btn) return;
        e.preventDefault();
        window.setTextSize(btn.getAttribute('data-size'));
      });
    }
    refreshButtons();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
