function initOfflineBanner() {
  const banner = document.querySelector('[data-offline-banner]');
  if (!banner) return;

  const update = () => {
    banner.hidden = navigator.onLine;
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

document.addEventListener('astro:page-load', initOfflineBanner);
initOfflineBanner();
