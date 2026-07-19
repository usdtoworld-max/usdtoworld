function initScrollTop() {
  const btn = document.querySelector('[data-scroll-top]');
  if (!btn) return;
  if (btn.dataset.scrollTopInit === 'true') return;
  btn.dataset.scrollTopInit = 'true';

  const onScroll = () => {
    btn.classList.toggle('is-visible', window.scrollY > 480);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

document.addEventListener('astro:page-load', initScrollTop);
initScrollTop();
