const RATE_API = 'https://open.er-api.com/v6/latest/USD';
const CACHE_KEY = 'ratebridge:rates';
const CACHE_TIME_KEY = 'ratebridge:rates:time';
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

async function getRates() {
  const cached = localStorage.getItem(CACHE_KEY);
  const cachedTime = Number(localStorage.getItem(CACHE_TIME_KEY) || 0);
  const isFresh = cached && Date.now() - cachedTime < CACHE_TTL;

  if (!navigator.onLine) {
    if (cached) return { rates: JSON.parse(cached), time: cachedTime, offline: true };
    throw new Error('offline-no-cache');
  }

  if (isFresh) {
    return { rates: JSON.parse(cached), time: cachedTime, offline: false };
  }

  try {
    const res = await fetch(RATE_API);
    if (!res.ok) throw new Error('bad-response');
    const data = await res.json();
    if (!data.rates) throw new Error('no-rates');
    localStorage.setItem(CACHE_KEY, JSON.stringify(data.rates));
    localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
    return { rates: data.rates, time: Date.now(), offline: false };
  } catch (err) {
    if (cached) return { rates: JSON.parse(cached), time: cachedTime, offline: false, stale: true };
    throw err;
  }
}

function formatNumber(n) {
  if (!isFinite(n)) return '—';
  const opts = Math.abs(n) < 10 ? { maximumFractionDigits: 4 } : { maximumFractionDigits: 2 };
  return new Intl.NumberFormat('en-US', opts).format(n);
}

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function initConverter() {
  const form = document.querySelector('[data-converter]');
  if (!form) return;

  const amountInput = form.querySelector('[data-amount]');
  const fromSelect = form.querySelector('[data-from]');
  const toSelect = form.querySelector('[data-to]');
  const swapBtn = form.querySelector('[data-swap]');
  const resultValue = form.querySelector('[data-result-value]');
  const resultLabel = form.querySelector('[data-result-label]');
  const updatedEl = form.querySelector('[data-updated]');
  const statusEl = form.querySelector('[data-status]');
  const copyBtn = form.querySelector('[data-copy]');
  const shareBtn = form.querySelector('[data-share]');
  const trendEl = form.querySelector('[data-trend]');

  let ratesCache = null;
  let lastResultText = '';

  function setStatus(message, tone = 'muted') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
  }

  async function ensureRates() {
    if (ratesCache) return ratesCache;
    setStatus('Fetching live rates…', 'muted');
    try {
      const result = await getRates();
      ratesCache = result;
      if (result.offline) setStatus("You're offline. Showing the last saved rate.", 'warn');
      else if (result.stale) setStatus("Couldn't reach the rate service. Showing last saved rate.", 'warn');
      else setStatus('', 'muted');
      return result;
    } catch (err) {
      setStatus("Couldn't reach the rate service. Try again in a moment.", 'error');
      throw err;
    }
  }

  function computeRate(rates, from, to) {
    // rates are USD-based; derive cross rate.
    if (from === 'USD') return rates[to];
    if (to === 'USD') return 1 / rates[from];
    return rates[to] / rates[from];
  }

  async function runConversion() {
    const amount = parseFloat(amountInput.value);
    const from = fromSelect.value;
    const to = toSelect.value;

    if (!isFinite(amount) || amount < 0) {
      resultValue.textContent = '—';
      return;
    }

    try {
      const { rates, time } = await ensureRates();
      const rate = computeRate(rates, from, to);
      const converted = amount * rate;

      resultValue.classList.add('is-updating');
      resultValue.textContent = `${formatNumber(converted)}`;
      if (resultLabel) resultLabel.textContent = to;
      lastResultText = `${formatNumber(amount)} ${from} = ${formatNumber(converted)} ${to}`;
      if (updatedEl) updatedEl.textContent = formatTime(time);
      requestAnimationFrame(() => resultValue.classList.remove('is-updating'));

      if (trendEl) {
        const key = `ratebridge:prevrate:${from}${to}`;
        const prev = parseFloat(localStorage.getItem(key) || '0');
        if (prev) {
          const diff = rate - prev;
          trendEl.textContent = diff > 0.0001 ? '▲' : diff < -0.0001 ? '▼' : '●';
          trendEl.dataset.trend = diff > 0.0001 ? 'up' : diff < -0.0001 ? 'down' : 'flat';
        }
        localStorage.setItem(key, String(rate));
      }

      recordRecent(from, to, amount);
    } catch (err) {
      // status already set by ensureRates
    }
  }

  function recordRecent(from, to, amount) {
    try {
      const list = JSON.parse(localStorage.getItem('ratebridge:recent') || '[]');
      const entry = { from, to, amount, ts: Date.now() };
      const filtered = list.filter((e) => !(e.from === from && e.to === to));
      filtered.unshift(entry);
      localStorage.setItem('ratebridge:recent', JSON.stringify(filtered.slice(0, 5)));
      renderRecent();
    } catch (e) {}
  }

  function renderRecent() {
    const container = document.querySelector('[data-recent-list]');
    if (!container) return;
    const list = JSON.parse(localStorage.getItem('ratebridge:recent') || '[]');
    if (!list.length) {
      container.innerHTML = '<p class="recent-empty">Your recent conversions will show up here.</p>';
      return;
    }
    container.innerHTML = list
      .map(
        (e) =>
          `<button type="button" class="pill" data-recent-item data-from="${e.from}" data-to="${e.to}" data-amount="${e.amount}">${formatNumber(e.amount)} ${e.from} → ${e.to}</button>`
      )
      .join('');
    container.querySelectorAll('[data-recent-item]').forEach((btn) => {
      btn.addEventListener('click', () => {
        amountInput.value = btn.dataset.amount;
        fromSelect.value = btn.dataset.from;
        toSelect.value = btn.dataset.to;
        runConversion();
      });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runConversion();
  });
  amountInput.addEventListener('input', debounce(runConversion, 350));
  fromSelect.addEventListener('change', runConversion);
  toSelect.addEventListener('change', runConversion);

  swapBtn?.addEventListener('click', () => {
    const tmp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = tmp;
    runConversion();
  });

  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(lastResultText);
      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = original), 1500);
    } catch (e) {}
  });

  shareBtn?.addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Currency conversion', text: lastResultText, url: location.href });
      } catch (e) {}
    } else {
      copyBtn?.click();
    }
  });

  document.querySelectorAll('[data-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      amountInput.value = chip.dataset.chip;
      fromSelect.value = chip.dataset.from || 'USD';
      toSelect.value = chip.dataset.to || 'CNY';
      runConversion();
    });
  });

  document.querySelectorAll('[data-pair]').forEach((pairBtn) => {
    pairBtn.addEventListener('click', () => {
      fromSelect.value = pairBtn.dataset.from;
      toSelect.value = pairBtn.dataset.to;
      runConversion();
    });
  });

  renderRecent();
  runConversion();

  window.addEventListener('online', () => {
    ratesCache = null;
    runConversion();
  });
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

document.addEventListener('astro:page-load', initConverter);
initConverter();
