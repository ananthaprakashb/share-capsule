# Share Capsule generic reactions Worker

This Worker stores combined Like and Clap counts in the existing Cloudflare D1 tables.

## What changed

The Worker no longer uses a hard-coded `VALID_AUDIO_IDS` list. Any audio ID matching this safe slug format is accepted automatically:

```text
lowercase-words-separated-by-hyphens
```

Examples:

- `economic-indicators`
- `google-ai-vector-search`
- `psychology-of-spending`

Future audio entries using the same ID convention require no Worker code change.

## Deploy through the Cloudflare dashboard

1. Open **Workers & Pages**.
2. Open `sharecapsule-reactions`.
3. Select **Edit code**.
4. Replace the Worker code with `workers/reactions/src/index.js` from this repository.
5. Confirm the D1 binding is named `DB`.
6. Select **Save and deploy**.

The existing D1 tables are reused. Rows for a new audio ID are created automatically on the first Like or Clap.

## Expected API

```text
GET  /api/audio/:audioId/reactions?visitorId=...
POST /api/audio/:audioId/clap
POST /api/audio/:audioId/like
```

## Security rules

- Audio IDs must be 3–100 characters.
- Audio IDs may contain only lowercase letters, digits, and single hyphen-separated words.
- Visitor IDs are validated.
- A visitor may add at most 50 claps per audio item.
- Clap increments are restricted to 1–5 per request.
- SQL values use D1 prepared statements and bindings.
- CORS is restricted to Share Capsule origins.
