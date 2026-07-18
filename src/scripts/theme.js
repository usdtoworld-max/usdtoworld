function initThemeToggle() {
  const toggles = document.querySelectorAll('[data-theme-toggle]');
  if (!toggles.length) return;

  const apply = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    toggles.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  };

  toggles.forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      apply(next);
    });
  });

  apply(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
}

document.addEventListener('astro:page-load', initThemeToggle);
initThemeToggle();
