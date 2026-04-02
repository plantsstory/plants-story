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
    var _dialog, _targetEl, _optionsEl, _detailEl, _submitBtn, _cancelBtn;
    var _bound = false;

    function getEls() {
      _dialog = document.getElementById('delete-request-dialog');
      _targetEl = document.getElementById('delete-request-target');
      _optionsEl = document.getElementById('delete-reason-options');
      _detailEl = document.getElementById('delete-reason-detail');
      _submitBtn = document.getElementById('delete-request-submit');
      _cancelBtn = document.getElementById('delete-request-cancel');
      return !!_dialog;
    }

    function bindOnce() {
      if (_bound) return;
      _bound = true;

      _optionsEl.addEventListener('change', function(e) {
        if (e.target.name === 'delete-reason') {
          _detailEl.style.display = e.target.value === 'other' ? '' : 'none';
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
        var reasonDetail = reason === 'other' ? _detailEl.value.trim() : null;
        if (reason === 'other' && !reasonDetail) { showToast('詳細を入力してください', true); return; }

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
          _dialog.close();
          currentRequest = null;
          showToast('削除依頼を送信しました');
        }).catch(function(err) {
          _submitBtn.disabled = false;
          _submitBtn.textContent = '送信';
          showToast(err.message || '送信に失敗しました', true);
        });
      });
    }

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

    function openDialog(targetType, targetId, targetName) {
      if (!getEls()) return;
      bindOnce();
      currentRequest = { targetType: targetType, targetId: targetId, targetName: targetName };
      _targetEl.textContent = targetName || '';
      var reasons = targetType === 'cultivar' ? cultivarReasons : imageReasons;
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
      _detailEl.style.display = 'none';
      _detailEl.value = '';
      _dialog.showModal();
    }

    // Cultivar delete request button (event delegation)
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('#detail-delete-request-btn');
      if (!btn) return;
      e.preventDefault();
      var h1 = document.querySelector('#page-cultivar h1');
      var cultivarName = h1 ? h1.textContent : '';
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
      var cultivarName = h1 ? h1.textContent : '';
      openDialog('image', imageId, cultivarName);
    });
  })();
