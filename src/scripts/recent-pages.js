const EXCLUDED = ['/404', '/500', '/503', '/offline', '/rate-limit', '/api-error'];

function recordVisit() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (EXCLUDED.some((p) => path === p)) return;

  try {
    const list = JSON.parse(localStorage.getItem('usdtoworld:recent-pages') || '[]');
    const title = document.title.split('|')[0].trim();
    const filtered = list.filter((e) => e.path !== path);
    filtered.unshift({ path, title, ts: Date.now() });
    localStorage.setItem('usdtoworld:recent-pages', JSON.stringify(filtered.slice(0, 5)));
  } catch (e) {}
}

document.addEventListener('astro:page-load', recordVisit);
recordVisit();
