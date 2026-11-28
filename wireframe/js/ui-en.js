/* ============================================================
   ENGLISH OVERLAY for the parts of the page that have no data-i18n key
   Much of the page (newer sections and the text that the scripts write) is Japanese only, so an English
   reader saw two languages side by side (site check 2026-11-26). In English this file swaps whole text
   nodes, placeholders and labels whose Japanese matches i18n/ui-en.json exactly, swaps a few long blocks
   (guide, glossary, pricing) as a whole, and keeps doing so for text the scripts add later. Switching back
   to Japanese puts every original back. The word list loads only when English is on.
   Records, notes and people's descriptions are what people wrote: they are left as written.
   ============================================================ */
(function () {
  'use strict';

  var VERSION = '20261128i';
  // text written by people, never swapped
  var KEEP = '.record__body, .record__note, .person span, .story__copy, .profile__bio, [data-ui-keep], script, style, textarea, svg, code, pre';
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var JP = /[぀-ヿ㐀-鿿！-～]/;

  var dict = null, rules = [], blocks = {}, loading = null;
  var on = false, observer = null;
  var swappedText = [];   // [node, original, english]
  var swappedAttr = [];   // [el, name, original, english]
  var swappedBlock = [];  // [el, originalHtml]

  function load() {
    if (loading) return loading;
    loading = fetch('i18n/ui-en.json?v=' + VERSION).then(function (r) { return r.json(); }).then(function (d) {
      dict = d.text || {};
      rules = (d.rules || []).map(function (r) { return [new RegExp(r[0]), r[1]]; });
      blocks = d.blocks || {};
    }).catch(function () { dict = {}; });
    return loading;
  }

  function english(s) {
    var k = s.trim();
    if (!k || !JP.test(k)) return null;
    var e = dict[k];
    if (e == null) {
      for (var i = 0; i < rules.length; i++) {
        if (rules[i][0].test(k)) { e = k.replace(rules[i][0], rules[i][1]); break; }
      }
    }
    if (e == null) return null;
    return s.replace(k, e);
  }

  function kept(el) { return !el || (el.closest && el.closest(KEEP)); }

  function swapText(n) {
    if (kept(n.parentElement)) return;
    var v = n.nodeValue, e = english(v);
    if (e == null || e === v) return;
    swappedText.push([n, v, e]);
    n.nodeValue = e;
  }

  function swapAttrs(el) {
    if (kept(el)) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute(a);
      if (!v) continue;
      var e = english(v);
      if (e == null || e === v) continue;
      swappedAttr.push([el, a, v, e]);
      el.setAttribute(a, e);
    }
  }

  function swapBlocks(root) {
    Object.keys(blocks).forEach(function (sel) {
      var list = [];
      if (root.matches && root.matches(sel)) list.push(root);
      if (root.querySelectorAll) list = list.concat(Array.prototype.slice.call(root.querySelectorAll(sel)));
      list.forEach(function (el) {
        if (el.hasAttribute('data-ui-en')) return;
        swappedBlock.push([el, el.innerHTML]);
        el.innerHTML = blocks[sel];
        el.setAttribute('data-ui-en', '');
      });
    });
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { swapText(root); return; }
    if (root.nodeType !== 1) return;
    swapBlocks(root);
    if (root.hasAttribute) swapAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) swapText(n);
      else swapAttrs(n);
    }
  }

  var titleJp = null, titleEn = null;
  function swapTitle() {
    var e = english(document.title);
    if (e == null || e === document.title) return;
    titleJp = document.title; titleEn = e;
    document.title = e;
  }

  function start() {
    walk(document.body);
    swapTitle();
    if (!observer) {
      observer = new MutationObserver(function (muts) {
        if (!on) return;
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'characterData') swapText(m.target);
          else if (m.type === 'attributes') swapAttrs(m.target);
          else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
        }
        swapTitle();
      });
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  function stop() {
    if (observer) observer.disconnect();
    // newest first, so a node swapped twice gets its first Japanese back
    for (var i = swappedText.length - 1; i >= 0; i--) {
      var t = swappedText[i];
      if (t[0].nodeValue === t[2]) t[0].nodeValue = t[1];
    }
    for (var j = swappedAttr.length - 1; j >= 0; j--) {
      var a = swappedAttr[j];
      if (a[0].getAttribute(a[1]) === a[3]) a[0].setAttribute(a[1], a[2]);
    }
    for (var k = swappedBlock.length - 1; k >= 0; k--) {
      swappedBlock[k][0].innerHTML = swappedBlock[k][1];
      swappedBlock[k][0].removeAttribute('data-ui-en');
    }
    swappedText = []; swappedAttr = []; swappedBlock = [];
    if (titleEn && document.title === titleEn) document.title = titleJp;
  }

  // called by applyLanguage (forms.js) every time the language is set
  window.aoUiLanguage = function (lang) {
    var want = lang === 'en';
    if (want === on) return;
    on = want;
    if (!on) { stop(); return; }
    load().then(function () { if (on) start(); });
  };
  if (window.currentLang === 'en') window.aoUiLanguage('en');
})();
