# Cloudflare Pages + D1 place voting

The Tamil Nadu place-name page uses `/api/place-votes` for shared vote counts. Cloudflare Pages Functions serves the API and D1 stores counts and anonymized vote receipts.

## Setup checklist

- [ ] Install Wrangler: `npm install --save-dev wrangler`
- [ ] Authenticate: `npx wrangler login`
- [ ] Create the database: `npx wrangler d1 create share-capsule-place-votes`
- [ ] Copy the returned database ID into `wrangler.jsonc`
- [ ] Apply the schema locally: `npx wrangler d1 execute share-capsule-place-votes --local --file=migrations/0001_place_votes.sql`
- [ ] Apply the schema remotely: `npx wrangler d1 execute share-capsule-place-votes --remote --file=migrations/0001_place_votes.sql`
- [ ] Create or connect the Cloudflare Pages project to this GitHub repository
- [ ] Use framework preset **None**, no build command, and output directory `.`
- [ ] Add a D1 binding named `PLACE_VOTES_DB` for preview and production
- [ ] Redeploy after adding the binding
- [ ] Open `/name/history/tn/`, vote, refresh, and verify the shared count

## Local test

```bash
npx wrangler pages dev . --d1 PLACE_VOTES_DB=REPLACE_WITH_D1_DATABASE_ID
```

```bash
curl http://localhost:8788/api/place-votes
curl -X POST http://localhost:8788/api/place-votes/madurai \
  -H 'content-type: application/json' \
  -d '{"action":"add","voterToken":"local-test-voter-token-123"}'
```

## API

### `GET /api/place-votes`

Returns all current counts. Send `x-voter-token` to also receive the caller's voted place IDs.

### `POST /api/place-votes/:placeId`

Body:

```json
{"action":"add","voterToken":"browser-generated-token"}
```

Use `remove` to withdraw a vote. The API stores only a SHA-256 hash of the browser token, not the raw token.
