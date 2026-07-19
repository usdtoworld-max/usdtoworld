if ('serviceWorker' in navigator && !window.__usdtoworldSwRegistered) {
  window.__usdtoworldSwRegistered = true;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // Registration failures shouldn't break the page; the site works fully without a SW.
      console.warn('Service worker registration failed:', err);
    });
  });
}
