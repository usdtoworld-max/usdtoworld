// src/utils/error-handler.js
// Central place for error classification, retry logic, and hooks into
// external error-tracking/API-health services. The tracking calls are
// placeholders — wire in a real provider (Sentry, Datadog, etc.) by
// filling in `reportError` and `reportApiHealth` below.

/**
 * Classify a caught error/response into one of the site's known error states.
 * Used to decide which status page or inline message to show.
 */
export function classifyError(err) {
  if (!navigator.onLine) return 'offline';
  if (err && err.status === 429) return 'rate-limit';
  if (err && err.status >= 500) return 'server';
  if (err && (err.status === 0 || err.name === 'TypeError')) return 'api-error';
  return 'unknown';
}

/**
 * Retry an async operation with exponential backoff.
 * @param {() => Promise<any>} fn
 * @param {{retries?: number, baseDelayMs?: number, onAttempt?: (n:number)=>void}} opts
 */
export async function retryWithBackoff(fn, opts = {}) {
  const { retries = 3, baseDelayMs = 500, onAttempt } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      onAttempt?.(attempt);
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const delay = baseDelayMs * 2 ** attempt + Math.random() * 100;
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw lastErr;
}

/**
 * Report a caught error to an external error-tracking service.
 * PLACEHOLDER: replace the body with your provider's SDK call, e.g.
 *   Sentry.captureException(err, { extra: context });
 */
export function reportError(err, context = {}) {
  // eslint-disable-next-line no-console
  console.error('[error-handler] captured error', err, context);
  // TODO: integrate error tracking, e.g.:
  // Sentry.captureException(err, { extra: context });
}

/**
 * Report API/service health so an uptime dashboard can track failure rates.
 * PLACEHOLDER: wire this into your API health monitoring provider.
 */
export function reportApiHealth(service, status, meta = {}) {
  // eslint-disable-next-line no-console
  console.info('[error-handler] api health', service, status, meta);
  // TODO: integrate API health monitoring, e.g. send a beacon to your
  // monitoring endpoint: navigator.sendBeacon('/api/health', JSON.stringify({...}))
}

/**
 * Map an error classification to the matching status page path.
 */
export function errorPageFor(kind) {
  switch (kind) {
    case 'offline':
      return '/offline';
    case 'rate-limit':
      return '/rate-limit';
    case 'server':
      return '/500';
    case 'api-error':
      return '/api-error';
    default:
      return '/500';
  }
}
