# ShareCapsule Finance — Market Data Gateway

Stateless public-data gateway for `finance/trade/`.

## Privacy boundary

The endpoint accepts only one application input:

```text
symbol=AAPL
```

It does not accept or need:

- user identity
- finance-vault contents
- balances
- holdings or share counts
- cost basis
- transactions
- debts
- goals
- bank credentials

The browser watchlist remains on the user's device. A ticker leaves the browser only when that ticker is refreshed.

The Worker does not use a database, KV, Durable Objects, cookies, authentication profiles, or application-level request logging. Public responses are cached by ticker for a short period so requests for the same public symbol can reuse the same market payload.

Cloudflare/platform-level operational metadata is outside the application data model and should be reviewed in the Cloudflare account configuration before production claims are finalized.

## Sources

### Polygon / Massive

Used for:

- company/ticker reference data
- current/delayed snapshot when the configured plan supports it
- previous-day OHLC fallback
- ticker-linked recent news
- publisher metadata
- ticker sentiment/insight fields when provided

The API key is stored only as a Cloudflare Worker secret.

### SEC EDGAR

Used for primary-source company filings such as:

- 8-K
- 10-Q
- 10-K
- S-1 / S-3 / prospectus filings
- DEF 14A
- Schedule 13D / 13G
- Form 4

The SEC submissions API does not require an API key. Automated requests must declare an identifying user agent containing an organization/app name and a contact email and comply with SEC rate guidance.

## Deploy

From this directory:

```bash
npx wrangler login
npx wrangler secret put POLYGON_API_KEY
npx wrangler secret put SEC_USER_AGENT
npx wrangler deploy
```

For `SEC_USER_AGENT`, enter a value in this pattern using a real monitored contact address:

```text
ShareCapsule Finance contact@example.com
```

Do not commit either value to Git.

The Worker custom domain is configured as:

```text
finance-market.sharecapsule.org
```

The browser client is intentionally hard-coded to that host. The production browser origin is:

```text
https://finance.sharecapsule.org
```

## Response

`GET /v1/ticker?symbol=AAPL` returns a normalized object containing:

- `company`
- `quote`
- `news[]`
- `filings[]`
- `generatedAt`

News items contain a deterministic `impact` classification (`high`, `medium`, `low`) and an explanation of why the item was flagged. This classification is a research prioritization aid, not a price prediction or buy/sell recommendation.

## Market-data plan behavior

If the market-data account supports ticker snapshots, the response uses the snapshot. If snapshots are not included in the plan, the Worker attempts to fall back to the previous trading day's aggregate bar. News/reference access still depends on the provider plan in use.
