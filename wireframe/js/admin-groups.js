/* Admin menu groups (2026-11-28, Yuta: 似た項目はまとめて、順番も整頓).
   Pages that belong together share one menu item and show tabs across their top; every page and every function
   is still there, only reached through the tab. The menu item's badge is the sum of its tabs' badges.
   The badge elements (dr-badge, contact-badge …) live in the tabs, so the code that sets them is unchanged.
   Uses admin.html globals: showSection. */
(function () {
  'use strict';
  var GROUPS = {
    incoming: [['delete-requests', '報告', 'dr-badge'], ['contact', 'お問い合わせ', 'contact-badge']],
    posts: [['new-posts', '新しい投稿', 'new-badge'], ['post-checks', '投稿の点検', 'pc-badge']],
    ai: [['ai-suggest', 'AI の提案', 'ais-badge'], ['translations', '翻訳の確認', 'tr-badge']],
    requests: [['research-requests', '再調査の依頼', 'rr-badge'], ['genus-requests', '収録の依頼', 'gr-badge']],
    cases: [['cases', '受付簿', 'cases-badge'], ['suspensions', '利用停止', null]],
    people: [['users', 'ユーザー', null], ['poster', '投稿者を調べる', null]],
    checks: [['verify', '検証', 'vq-badge'], ['name-checks', 'データ点検', null]],
    stores: [['nurseries', 'ナーセリー', null], ['shops', '取扱店', null]]
  };
  var groupOf = {}, strips = {};

  Object.keys(GROUPS).forEach(function (g) {
    var bar = document.createElement('div');
    bar.className = 'group-tabs';
    bar.setAttribute('role', 'tablist');
    GROUPS[g].forEach(function (t) {
      groupOf[t[0]] = g;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'group-tab';
      b.setAttribute('data-group-tab', t[0]);
      b.appendChild(document.createTextNode(t[1] + ' '));
      if (t[2]) {
        var old = document.getElementById(t[2]);
        var badge = old || document.createElement('span');
        if (!old) { badge.id = t[2]; badge.className = 'nav-badge d-none'; }
        b.appendChild(badge);       // moves the existing badge out of the old menu item
      }
      b.addEventListener('click', function () { showSection(t[0]); });
      bar.appendChild(b);
    });
    strips[g] = bar;
    place(g, GROUPS[g][0][0]);
  });

  function place(g, section) {
    var sec = document.getElementById('sec-' + section);
    if (!sec) return;
    var title = sec.querySelector('.section-title');
    if (title) title.insertAdjacentElement('afterend', strips[g]);
    else sec.insertBefore(strips[g], sec.firstChild);
    strips[g].querySelectorAll('[data-group-tab]').forEach(function (b) {
      var on = b.getAttribute('data-group-tab') === section;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  // the menu badge of a group: the sum of its tabs' badges
  function sum(g) {
    var n = 0;
    GROUPS[g].forEach(function (t) {
      var b = t[2] && document.getElementById(t[2]);
      if (b && !b.classList.contains('d-none')) n += Number(b.textContent) || 0;
    });
    var el = document.getElementById('grp-badge-' + g);
    if (!el) return;
    el.textContent = n ? String(n) : '';
    el.classList.toggle('d-none', !n);
  }
  var obs = new MutationObserver(function () { Object.keys(GROUPS).forEach(sum); });
  Object.keys(GROUPS).forEach(function (g) {
    GROUPS[g].forEach(function (t) {
      var b = t[2] && document.getElementById(t[2]);
      if (b) obs.observe(b, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });
  });

  // opening any page of a group puts the tabs on it and marks the group's menu item
  var base = window.showSection;
  window.showSection = function (section, navKey) {
    var g = groupOf[section];
    base(section, navKey || (g ? GROUPS[g][0][0] : section));
    if (g) place(g, section);
  };
  // admin.html's own handlers call showSection by its global name
  try { showSection = window.showSection; } catch (e) { /* not reassignable */ }
})();
