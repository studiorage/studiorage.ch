(function () {
  const loader = document.getElementById('site-loader');
  const frame = document.getElementById('loader-frame');

  if (!loader || !frame) return;

  let completed = false;
  document.body.classList.add('is-loader-active');

  function completeLoader() {
    if (completed) return;
    completed = true;

    loader.hidden = true;
    document.body.classList.remove('is-loader-active');
    document.documentElement.classList.add('loader-complete');
    document.dispatchEvent(new CustomEvent('loaderComplete'));
  }

  function connectExactLoader() {
    try {
      const childDocument = frame.contentDocument;
      if (!childDocument) return;

      // The supplied standalone loader dispatches this event after its own
      // exact animation sequence has completed.
      childDocument.addEventListener('loaderComplete', completeLoader, { once: true });
    } catch (error) {
      // Same-origin access can fail only in unusual preview environments.
      // The fallback below still releases the page after the full sequence.
    }
  }

  frame.addEventListener('load', connectExactLoader, { once: true });

  // Full supplied sequence is approximately 4.2 seconds. This is only a
  // safety fallback and does not alter the iframe animation itself.
  window.setTimeout(completeLoader, 5000);
})();
