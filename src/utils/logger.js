// src/utils/logger.js
// A tiny leveled logger plus placeholders for analytics and performance
// monitoring integrations. Swap the TODO sections for real providers
// (Plausible, GA4, Sentry Performance, Web Vitals reporting, etc.).

const LEVELS = ['debug', 'info', 'warn', 'error'];
const currentLevel = 'info'; // raise to 'debug' locally when needed

function shouldLog(level) {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(currentLevel);
}

export const logger = {
  debug: (...args) => shouldLog('debug') && console.debug('[debug]', ...args),
  info: (...args) => shouldLog('info') && console.info('[info]', ...args),
  warn: (...args) => shouldLog('warn') && console.warn('[warn]', ...args),
  error: (...args) => shouldLog('error') && console.error('[error]', ...args),
};

/**
 * Track a page view. PLACEHOLDER: call your analytics provider here.
 */
export function trackPageView(path = window.location.pathname) {
  logger.debug('page view', path);
  // TODO: integrate analytics, e.g.:
  // window.plausible?.('pageview');
  // gtag('event', 'page_view', { page_path: path });
}

/**
 * Track a custom interaction event (conversion run, theme toggle, etc.).
 * PLACEHOLDER: call your analytics provider here.
 */
export function trackEvent(name, props = {}) {
  logger.debug('event', name, props);
  // TODO: integrate analytics, e.g.:
  // window.plausible?.(name, { props });
}

/**
 * Record a Core Web Vitals-style performance metric.
 * PLACEHOLDER: forward to your performance monitoring provider.
 */
export function trackPerformance(metricName, value, extra = {}) {
  logger.debug('perf', metricName, value, extra);
  // TODO: integrate performance monitoring, e.g. send to your RUM endpoint:
  // navigator.sendBeacon('/api/vitals', JSON.stringify({ metricName, value, ...extra }));
}
