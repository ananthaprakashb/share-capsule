(() => {
  'use strict';

  const API = 'https://finance-market.sharecapsule.org/v1/ticker';
  const DB_NAME = 'sharecapsule-trade-monitor';
  const STORE = 'local';
  const WATCHLIST_ID = 'watchlist';
  const KEY_ID = 'device-key';
  const MAX_TICKERS = 30;
  const IMPACT_WEIGHT = {high: 3, medium: 2, low: 1};

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const usd = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 2});
  const compact = new Intl.NumberFormat('en-US', {notation: 'compact', maximumFractionDigits: 1});

  let db;
  let deviceKey;
  let tickers = [];
  let selected = null;
  let currentNews = [];
  let currentFilter = 'all';

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, {keyPath: 'id'});
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function get(id) {
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  function put(value) {
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  const b64 = (bytes) => {
    let text = '';
    for (const byte of new Uint8Array(bytes)) text += String.fromCharCode(byte);
    return btoa(text);
  };

  const unb64 = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

  async function loadKey() {
    const saved = await get(KEY_ID);
    if (saved?.key) return saved.key;
    const key = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
    await put({id: KEY_ID, key});
    return key;
  }

  async function saveWatchlist() {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(tickers));
    const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, deviceKey, data);
    await put({id: WATCHLIST_ID, iv: b64(iv), ciphertext: b64(ciphertext), updatedAt: new Date().toISOString()});
  }

  async function loadWatchlist() {
    const saved = await get(WATCHLIST_ID);
    if (!saved) return [];
    try {
      const plain = await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv: unb64(saved.iv)},
        deviceKey,
        unb64(saved.ciphertext)
      );
      const parsed = JSON.parse(new TextDecoder().decode(plain));
      return Array.isArray(parsed)
        ? parsed.filter((ticker) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)).slice(0, MAX_TICKERS)
        : [];
    } catch {
      return [];
    }
  }

  function setStatus(text, error = false) {
    $('status').textContent = text;
    $('status').classList.toggle('error', error);
  }

  function renderWatchlist() {
    $('watchlist').innerHTML = tickers.length
      ? tickers.map((ticker) => `
          <button class="ticker-card ${selected === ticker ? 'active' : ''}" data-ticker="${esc(ticker)}" type="button">
            <strong>${esc(ticker)}</strong>
            <span>Tap to review recent catalysts</span>
            <span class="ticker-actions"><span>On device</span><span class="remove" data-remove="${esc(ticker)}">Remove</span></span>
          </button>
        `).join('')
      : '<div class="empty">No preferred tickers yet. Add a symbol such as AAPL, MSFT, NVDA, TSLA or AMZN.</div>';

    document.querySelectorAll('[data-ticker]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const remove = event.target.closest('[data-remove]');
        if (remove) {
          event.stopPropagation();
          tickers = tickers.filter((ticker) => ticker !== remove.dataset.remove);
          if (selected === remove.dataset.remove) {
            selected = tickers[0] || null;
            currentNews = [];
            $('detail').hidden = true;
          }
          await saveWatchlist();
          renderWatchlist();
          if (selected) await loadTicker(selected);
          return;
        }
        selected = button.dataset.ticker;
        currentFilter = 'all';
        updateFilterButtons();
        renderWatchlist();
        await loadTicker(selected);
      });
    });
  }

  const valueOrDash = (value, formatter = usd) => Number.isFinite(Number(value))
    ? formatter.format(Number(value))
    : '—';

  function impactBadge(impact) {
    const value = String(impact || 'low').toLowerCase();
    const className = value === 'high' ? 'high' : value === 'medium' ? 'medium' : '';
    return `<span class="badge ${className}">${esc(value)} potential impact</span>`;
  }

  function directionBadge(direction) {
    const value = String(direction || 'neutral').toLowerCase();
    if (value === 'positive') return '<span class="badge positive">possible positive</span>';
    if (value === 'negative') return '<span class="badge negative">possible negative</span>';
    return '<span class="badge">neutral / mixed</span>';
  }

  function timeAgo(value) {
    const ms = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(ms)) return '';
    const hours = Math.max(0, Math.floor(ms / 3600000));
    if (hours < 1) return 'Less than 1h ago';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.href : '#';
    } catch {
      return '#';
    }
  }

  function deriveSummary(news) {
    const summary = {
      positive: 0, negative: 0, neutral: 0,
      highImpact: 0, mediumImpact: 0, lowImpact: 0,
      score: 0, label: 'No recent news',
      basis: 'No ticker-linked news was returned.'
    };
    if (!news.length) return summary;

    let signedWeight = 0;
    let totalWeight = 0;
    for (const item of news) {
      const direction = ['positive', 'negative'].includes(item.direction) ? item.direction : 'neutral';
      summary[direction] += 1;
      const impact = ['high', 'medium'].includes(item.impact) ? item.impact : 'low';
      summary[`${impact}Impact`] += 1;
      const weight = IMPACT_WEIGHT[impact];
      totalWeight += weight;
      if (direction === 'positive') signedWeight += weight;
      if (direction === 'negative') signedWeight -= weight;
    }

    summary.score = totalWeight ? Math.round((signedWeight / totalWeight) * 100) : 0;
    if (summary.score >= 35) summary.label = 'Positive news skew';
    else if (summary.score >= 10) summary.label = 'Slightly positive';
    else if (summary.score <= -35) summary.label = 'Negative news skew';
    else if (summary.score <= -10) summary.label = 'Slightly negative';
    else summary.label = 'Mixed / neutral';
    summary.basis = 'Weighted by article sentiment and event significance. This describes recent news tone, not expected price direction.';
    return summary;
  }

  function renderSummary(summary) {
    $('toneLabel').textContent = summary?.label || 'Mixed / neutral';
    const score = Number(summary?.score);
    $('toneScore').textContent = Number.isFinite(score) ? `${score > 0 ? '+' : ''}${score}` : '0';
    $('tonePositive').textContent = Number(summary?.positive || 0);
    $('toneNegative').textContent = Number(summary?.negative || 0);
    $('toneNeutral').textContent = Number(summary?.neutral || 0);
    $('toneHigh').textContent = Number(summary?.highImpact || 0);
    $('toneBasis').textContent = summary?.basis || 'News tone is a research aid, not a price forecast.';
    $('toneScore').className = Number.isFinite(score) ? (score > 9 ? 'positive-text' : score < -9 ? 'negative-text' : '') : '';
  }

  function updateFilterButtons() {
    document.querySelectorAll('[data-news-filter]').forEach((button) => {
      button.classList.toggle('active', button.dataset.newsFilter === currentFilter);
    });
  }

  function renderNews() {
    let news = currentNews;
    if (currentFilter === 'positive') news = news.filter((item) => item.direction === 'positive');
    if (currentFilter === 'negative') news = news.filter((item) => item.direction === 'negative');
    if (currentFilter === 'high') news = news.filter((item) => item.impact === 'high');

    $('newsList').innerHTML = news.length
      ? news.map((item) => {
          const sentimentReason = item.sentimentReason
            ? `<div class="reason"><strong>Direction context:</strong> ${esc(item.sentimentReason)}</div>`
            : '';
          return `
            <article class="feed-card">
              <div class="feed-meta">
                ${directionBadge(item.direction || item.sentiment)}
                ${impactBadge(item.impact)}
                <span class="badge">${esc(item.publisher || 'Source')}</span>
                <span class="badge">${esc(timeAgo(item.publishedAt))}</span>
              </div>
              <h3>${esc(item.title)}</h3>
              ${item.summary ? `<p>${esc(item.summary)}</p>` : ''}
              ${sentimentReason}
              <div class="reason"><strong>Why flagged:</strong> ${esc(item.impactReason || 'Ticker-linked recent news.')}</div>
              <a href="${esc(safeExternalUrl(item.url))}" target="_blank" rel="noopener noreferrer">Open original article ↗</a>
            </article>
          `;
        }).join('')
      : '<div class="empty">No recent stories match this filter.</div>';
  }

  function renderFilings(filings) {
    $('filingList').innerHTML = filings.length
      ? filings.map((item) => `
          <article class="feed-card">
            <div class="feed-meta">
              ${impactBadge(item.impact)}
              <span class="badge">SEC ${esc(item.form)}</span>
              <span class="badge">${esc(item.filed || '')}</span>
            </div>
            <h3>${esc(item.description || item.form)}</h3>
            <div class="reason">Primary-source regulatory filing. Its presence may be important, but the filing itself is not labeled positive or negative.</div>
            <a href="${esc(safeExternalUrl(item.url))}" target="_blank" rel="noopener noreferrer">Open SEC filing ↗</a>
          </article>
        `).join('')
      : '<div class="empty">No recent SEC filing data was returned for this ticker.</div>';
  }

  function renderData(data) {
    $('detail').hidden = false;
    $('companyName').textContent = data.company?.name || 'Company';
    $('tickerName').textContent = data.ticker || selected || '—';
    $('lastPrice').textContent = valueOrDash(data.quote?.price);

    const change = Number(data.quote?.changePercent);
    $('dayChange').textContent = Number.isFinite(change)
      ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}% today`
      : 'Change unavailable';
    $('dayChange').className = Number.isFinite(change) ? (change >= 0 ? 'up' : 'down') : '';

    $('dayOpen').textContent = valueOrDash(data.quote?.open);
    $('dayHigh').textContent = valueOrDash(data.quote?.high);
    $('dayLow').textContent = valueOrDash(data.quote?.low);
    $('dayVolume').textContent = Number.isFinite(Number(data.quote?.volume))
      ? compact.format(Number(data.quote.volume))
      : '—';
    $('marketNote').textContent = data.quote?.asOf
      ? `Market data as of ${new Date(data.quote.asOf).toLocaleString()}. Availability and delay depend on the configured market-data plan.`
      : 'Market timestamp unavailable.';

    currentNews = Array.isArray(data.news) ? data.news : [];
    const summary = data.newsSummary || deriveSummary(currentNews);
    renderSummary(summary);
    renderNews();
    renderFilings(Array.isArray(data.filings) ? data.filings : []);
  }

  async function loadTicker(ticker) {
    setStatus(`Loading public market data and recent catalysts for ${ticker}…`);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(`${API}?symbol=${encodeURIComponent(ticker)}`, {
        method: 'GET',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
        headers: {'Accept': 'application/json'}
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Market gateway returned ${response.status}`);
      }

      const data = await response.json();
      renderData(data);
      setStatus(`Loaded ${ticker}. Only the ticker symbol was sent; your local finance data was not transmitted.`);
    } catch (error) {
      setStatus(`Could not load ${ticker}: ${error.name === 'AbortError' ? 'request timed out' : error.message}`, true);
    }
  }

  $('tickerForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const ticker = $('tickerInput').value.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) {
      setStatus('Enter a valid U.S. ticker symbol using letters, numbers, dot, or dash.', true);
      return;
    }
    if (!tickers.includes(ticker)) {
      tickers.push(ticker);
      tickers = tickers.slice(0, MAX_TICKERS);
      await saveWatchlist();
    }
    selected = ticker;
    currentFilter = 'all';
    updateFilterButtons();
    $('tickerInput').value = '';
    renderWatchlist();
    await loadTicker(ticker);
  });

  $('refreshAll').addEventListener('click', () => {
    if (selected) loadTicker(selected);
    else setStatus('Select or add a ticker first.', true);
  });

  $('newsFilters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-news-filter]');
    if (!button) return;
    currentFilter = button.dataset.newsFilter;
    updateFilterButtons();
    renderNews();
  });

  async function init() {
    if (!crypto?.subtle || !indexedDB) {
      setStatus('This browser does not provide the local security features required by Ticker Watch.', true);
      return;
    }
    try {
      db = await openDb();
      deviceKey = await loadKey();
      tickers = await loadWatchlist();
      selected = tickers[0] || null;
      renderWatchlist();
      updateFilterButtons();
      if (selected) await loadTicker(selected);
    } catch (error) {
      console.error(error);
      setStatus('Could not open device-local watchlist storage.', true);
    }
  }

  init();
})();
