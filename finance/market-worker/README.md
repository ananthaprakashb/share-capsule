# ShareCapsule Finance — Market Data Gateway

Stateless public-data gateway for `finance/trade/`.

## Privacy boundary

The endpoint accepts only one application input:

```text
symbol=AAPL
```

It does not accept or need user identity, finance-vault contents, balances, holdings, share counts, cost basis, transactions, debts, goals, or bank credentials.

The browser watchlist remains on the user's device. A ticker leaves the browser only when that ticker is refreshed.

The Worker does not use a database, KV, Durable Objects, cookies, authentication profiles, or application-level request logging. Public responses are cached briefly by ticker.

Cloudflare/platform-level operational metadata is outside the application data model and should be reviewed in the Cloudflare account configuration before production claims are finalized.

## Sources

### Massive market data

Used for company/ticker reference data, snapshot or previous-close fallback, ticker-linked recent news, publisher metadata, and ticker-specific sentiment/insight reasoning when provided.

The API key remains stored only as the Cloudflare Worker secret named `POLYGON_API_KEY` for compatibility with the existing deployment configuration.

### SEC EDGAR

Used for primary-source company filings such as 8-K, 10-Q, 10-K, S-1/S-3/prospectus filings, DEF 14A, Schedule 13D/13G, and Form 4.

The SEC submissions API does not require an API key. Automated requests must declare an identifying user agent containing an organization/app name and a monitored contact email and comply with SEC rate guidance.

## News direction and impact

Each returned news item keeps two separate research labels:

- `direction`: `positive`, `negative`, or `neutral`, based on the provider's ticker-specific sentiment insight when available.
- `impact`: `high`, `medium`, or `low`, based on deterministic event/topic rules in the Worker.

The response also includes `newsSummary` with counts and a weighted news-tone index from -100 to +100. High-impact stories receive more weight than medium/low-impact stories.

The index describes the directional skew of recent ticker-linked coverage. It is **not** a prediction of future stock-price movement and is not a buy/sell/hold recommendation.

SEC filings are intentionally not assigned a positive/negative direction. They are shown as primary-source events with importance labels only.

## Deploy

From this directory:

```bash
npx wrangler login
npx wrangler secret put POLYGON_API_KEY
npx wrangler secret put SEC_USER_AGENT
npx wrangler deploy
```

For `SEC_USER_AGENT`, enter a value using a real monitored contact address, for example:

```text
ShareCapsule Finance contact@example.com
```

Do not commit secret values to Git.

Production Worker custom domain:

```text
https://finance-market.sharecapsule.org
```

Production browser origin allowed by CORS:

```text
https://finance.sharecapsule.org
```

## Response

`GET /v1/ticker?symbol=AAPL` returns a normalized object containing:

- `company`
- `quote`
- `newsSummary`
- `news[]`
- `filings[]`
- `generatedAt`

## Market-data plan behavior

If the configured market-data plan supports ticker snapshots, the response uses the snapshot. If snapshots are unavailable, the Worker attempts to fall back to the previous trading day's aggregate bar. News/reference access still depends on the provider plan in use.
