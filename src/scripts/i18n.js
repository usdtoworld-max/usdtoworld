import { translations } from '../data/translations.js';

function applyLocale(locale) {
  const dict = translations[locale] || translations.en;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });
  document.querySelectorAll('[data-locale-label]').forEach((el) => {
    el.textContent = locale.toUpperCase();
  });
  document.querySelectorAll('[data-locale-select]').forEach((sel) => {
    sel.value = locale;
  });
  window.__currentLocale = locale;
  window.dispatchEvent(new CustomEvent('localechange', { detail: { locale } }));
}

function initI18n() {
  const saved = localStorage.getItem('locale') || 'en';
  applyLocale(saved);

  document.querySelectorAll('[data-locale-select]').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const locale = e.target.value;
      localStorage.setItem('locale', locale);
      applyLocale(locale);
    });
  });
}

document.addEventListener('astro:page-load', initI18n);
initI18n();
