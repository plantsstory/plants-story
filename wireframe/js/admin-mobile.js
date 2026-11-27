/* Admin on a phone (owner 2026-11-27): nothing may be wider than the screen, so the page never sways sideways.
   Tables turn into one card per row there (admin.css, max-width 768px). This script writes each column's heading
   onto its cells (data-label) so a card can show "区分  Hybrid" without the heading row, and marks the cells that
   hold buttons so they line up at the foot of the card. It only adds attributes and classes; on a wide screen
   the tables look exactly as before. Also wires the menu's own ログアウト to the header's. */
(function () {
  'use strict';
  var each = Array.prototype.forEach;

  function headRow(table) {
    if (table.tHead && table.tHead.rows.length) return table.tHead.rows[table.tHead.rows.length - 1];
    var first = table.rows[0];
    if (first && first.cells.length && Array.prototype.every.call(first.cells, function (c) { return c.tagName === 'TH'; })) {
      first.classList.add('m-head');
      return first;
    }
    return null;
  }

  function labelTable(table) {
    if (table.closest('.no-m-cards')) return;
    var head = headRow(table);
    if (!head) return;
    var names = [];
    each.call(head.cells, function (c) {
      var n = (c.textContent || '').replace(/\s+/g, ' ').trim();
      for (var i = 0; i < (c.colSpan || 1); i++) names.push(n);
    });
    table.classList.add('m-cards');
    each.call(table.rows, function (tr) {
      if (tr === head || tr.hasAttribute('data-m') || (tr.parentNode && tr.parentNode.tagName === 'THEAD')) return;
      tr.setAttribute('data-m', '1');
      var col = 0;
      var cells = tr.cells;
      // the card's title is the first column, unless that is only a number (ID, #): then the next one
      var titleCol = /^(id|#|no\.?)$/i.test(names[0] || '') && names.length > 1 ? 1 : 0;
      each.call(cells, function (td, i) {
        var span = td.colSpan || 1;
        var last = i === cells.length - 1;
        if (span > 1) {
          td.classList.add('m-wide');
        } else if (last && td.querySelector('button, .btn')) {
          td.classList.add('m-actions');          // the row's buttons: along the foot of the card
        } else if (col === titleCol && !td.querySelector('input, select, textarea')) {
          td.classList.add('m-title');
        } else if (names[col]) {
          td.setAttribute('data-label', names[col]);
        }
        col += span;
      });
    });
  }

  var queued = false;
  function run() {
    queued = false;
    each.call(document.querySelectorAll('.admin-content table, #modal-content table'), labelTable);
  }
  function queue() {
    if (queued) return;
    queued = true;
    (window.requestAnimationFrame || setTimeout)(run);
  }

  var target = document.getElementById('admin-app') || document.body;
  new MutationObserver(queue).observe(target, { childList: true, subtree: true });
  var modal = document.getElementById('modal-overlay');
  if (modal) new MutationObserver(queue).observe(modal, { childList: true, subtree: true });
  queue();

  var out = document.getElementById('btn-logout-nav');
  if (out) out.addEventListener('click', function () {
    var b = document.getElementById('btn-logout');
    if (b) b.click();
  });
})();
