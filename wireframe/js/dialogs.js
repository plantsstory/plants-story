  (function() {
    var dialog = document.getElementById('parentPhotoDialog');
    var dlgImg = dialog.querySelector('img');
    var dlgLabel = dialog.querySelector('.dialog-label');
    var dlgClose = dialog.querySelector('.dialog-close');

    // Close on × button
    dlgClose.addEventListener('click', function() {
      dialog.close();
    });

    // Close on backdrop click (click outside the dialog-inner)
    dialog.addEventListener('click', function(e) {
      if (e.target === dialog) {
        dialog.close();
      }
    });

    // Close on image click (tap again to close)
    dlgImg.addEventListener('click', function() {
      dialog.close();
    });

    // Clean up on close
    dialog.addEventListener('close', function() {
      dlgImg.src = '';
    });

    // Open on parent photo click/tap
    document.addEventListener('click', function(e) {
      var el = e.target;
      if (el.tagName === 'IMG' && el.classList.contains('has-photo')) {
        var parent = el.closest('.parent-photo-display');
        if (parent) {
          e.preventDefault();
          e.stopPropagation();
          dlgImg.src = el.src;
          dlgLabel.textContent = el.alt || '';
          dialog.showModal();
        }
      }
    });
  })();

  // ---- Deletion Request System ----
  (function() {
    var currentRequest = null; // { targetType, targetId, targetName }
    var _dialog, _targetEl, _optionsEl, _detailEl, _submitBtn, _cancelBtn, _titleEl;
    var _bound = false;

    function getEls() {
      _dialog = document.getElementById('delete-request-dialog');
      _targetEl = document.getElementById('delete-request-target');
      _optionsEl = document.getElementById('delete-reason-options');
      _detailEl = document.getElementById('delete-reason-detail');
      _submitBtn = document.getElementById('delete-request-submit');
      _cancelBtn = document.getElementById('delete-request-cancel');
      _titleEl = document.getElementById('delete-dialog-title');
      return !!_dialog;
    }

    function bindOnce() {
      if (_bound) return;
      _bound = true;

      _optionsEl.addEventListener('change', function(e) {
        if (e.target.name === 'delete-reason') {
          // the textarea starts with the d-none class; style.display alone could never show it.
          // 11-27: 誤った情報 and 重複 ask what is wrong too, or the report cannot be acted on
          var ask = DETAIL_ASK[e.target.value];
          _detailEl.classList.toggle('d-none', !ask);
          if (_detailNote) _detailNote.classList.toggle('d-none', !ask);
          if (ask) { _detailEl.placeholder = ask.ph; _detailEl.focus(); }
        }
      });

      _cancelBtn.addEventListener('click', function() {
        _dialog.close();
        currentRequest = null;
      });

      _dialog.addEventListener('click', function(e) {
        if (e.target === _dialog) { _dialog.close(); currentRequest = null; }
      });

      _submitBtn.addEventListener('click', function() {
        if (!currentRequest) return;
        var selected = _dialog.querySelector('input[name="delete-reason"]:checked');
        if (!selected) { showToast('理由を選択してください', true); return; }
        var reason = selected.value;
        var ask = DETAIL_ASK[reason];
        var reasonDetail = ask ? (_detailEl.value.trim() || null) : null;
        if (ask && ask.required && !reasonDetail) { showToast(ask.need, true); _detailEl.focus(); return; }

        var sbClient = window._supabaseClient;
        if (!sbClient) { showToast('データベース接続エラー', true); return; }

        _submitBtn.disabled = true;
        _submitBtn.textContent = '送信中...';
        sbClient.rpc('submit_deletion_request', {
          p_target_type: currentRequest.targetType,
          p_target_id: currentRequest.targetId,
          p_target_name: currentRequest.targetName,
          p_reason: reason,
          p_reason_detail: reasonDetail
        }).then(function(res) {
          _submitBtn.disabled = false;
          _submitBtn.textContent = '送信';
          if (res.error) throw new Error(res.error.message);
          var result = res.data;
          if (result && !result.success) throw new Error(result.error || 'Failed');
          var wasMine = currentRequest && currentRequest.mine;
          _dialog.close();
          currentRequest = null;
          showToast(wasMine ? '削除依頼を送信しました' : '報告を送信しました');
        }).catch(function(err) {
          _submitBtn.disabled = false;
          _submitBtn.textContent = '送信';
          showToast(err.message || '送信に失敗しました', true);
        });
      });
    }

    // reasons that open the box: what it asks, and whether it may be left empty
    var DETAIL_ASK = {
      wrong_info: { required: true, ph: 'どこが違いますか？（例: 交配式が逆。作出者の Instagram では A × B と書いています）。正しい情報や出典のリンクがあれば添えてください', need: 'どこが違うかを、ひとことでも書いてください' },
      duplicate: { required: false, ph: 'どの名前と同じですか？（任意）', need: '' },
      irrelevant: { required: false, ph: 'どこが違いますか？（任意）', need: '' },
      copyright: { required: false, ph: 'もとの写真の場所（リンク）や、撮った人がわかれば書いてください（任意）', need: '' },
      other: { required: true, ph: '詳細を入力...', need: '詳細を入力してください' }
    };
    var _detailNote = null;

    var cultivarReasons = [
      { value: 'duplicate', label: '重複している品種' },
      { value: 'wrong_info', label: '誤った情報' },
      { value: 'created_by_mistake', label: '間違えて作成した' },
      { value: 'spam', label: 'スパム・不適切な内容' },
      { value: 'other', label: 'その他' }
    ];

    var imageReasons = [
      { value: 'irrelevant', label: '無関係な画像' },
      { value: 'inappropriate', label: '不適切な画像' },
      { value: 'copyright', label: '著作権侵害の可能性' },
      { value: 'uploaded_by_mistake', label: '間違えてアップロードした' },
      { value: 'other', label: 'その他' }
    ];

    // mine: the photo is the visitor's own (or they are an admin), so 間違えてアップロードした and the 削除依頼 wording apply
    function openDialog(targetType, targetId, targetName, mine) {
      if (!getEls()) return;
      bindOnce();
      currentRequest = { targetType: targetType, targetId: targetId, targetName: targetName, mine: !!mine };
      _targetEl.textContent = targetName || '';
      if (_titleEl) _titleEl.textContent = targetType === 'cultivar' ? '誤りを報告' : (mine ? '写真の削除依頼' : '写真を報告');
      var reasons = targetType === 'cultivar' ? cultivarReasons
        : imageReasons.filter(function(r) { return mine || r.value !== 'uploaded_by_mistake'; });
      _optionsEl.innerHTML = '';
      reasons.forEach(function(r) {
        var label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.9rem;';
        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'delete-reason';
        radio.value = r.value;
        label.appendChild(radio);
        label.appendChild(document.createTextNode(r.label));
        _optionsEl.appendChild(label);
      });
      _detailEl.classList.add('d-none');
      _detailEl.style.display = '';
      _detailEl.value = '';
      if (!_detailNote) {
        _detailNote = document.createElement('p');
        _detailNote.className = 'dialog-detail-note text-xs text-muted d-none';
        _detailNote.textContent = '書いた内容は管理者だけが読みます。直すときの手がかりにします。';
        _detailEl.insertAdjacentElement('afterend', _detailNote);
      }
      _detailNote.classList.add('d-none');
      _dialog.showModal();
    }

    // Cultivar delete request button (event delegation)
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('#detail-delete-request-btn');
      if (!btn) return;
      e.preventDefault();
      var h1 = document.querySelector('#page-cultivar h1');
      var cultivarName = h1 ? h1Key(h1) : '';
      if (!cultivarName) return;

      // Get cultivar ID - use stored ID first, fallback to name search
      var sbClient = window._supabaseClient;
      if (!sbClient) { showToast('データベース接続エラー', true); return; }
      var storedId = document.getElementById('page-cultivar').getAttribute('data-cultivar-id');
      var query;
      if (storedId) {
        query = sbClient.from('cultivars').select('id').eq('id', storedId).limit(1);
      } else {
        query = sbClient.from('cultivars').select('id').eq('cultivar_name', cultivarName).limit(1);
      }
      query.then(function(res) {
        if (res.error || !res.data || res.data.length === 0) {
          showToast('品種が見つかりません', true);
          return;
        }
        openDialog('cultivar', res.data[0].id, cultivarName);
      });
    });

    // Image delete request (modify existing gallery__delete behavior)
    document.addEventListener('click', function(e) {
      var deleteLink = e.target.closest('.gallery__delete');
      if (!deleteLink) return;
      e.preventDefault();
      e.stopPropagation();

      var item = deleteLink.closest('.gallery__item');
      if (!item) return;

      var imageId = item.getAttribute('data-image-id');
      if (!imageId) return; // no image ID, can't submit request

      var h1 = document.querySelector('#page-cultivar h1');
      var cultivarName = h1 ? h1Key(h1) : '';
      openDialog('image', imageId, cultivarName, deleteLink.getAttribute('data-mine') === '1');
    });
  })();
