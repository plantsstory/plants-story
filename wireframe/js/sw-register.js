if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js').catch(function() {});
  });
  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'SW_UPDATED') {
      window.location.reload();
    }
  });
}
