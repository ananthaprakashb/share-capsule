# Public Deadline Timeline

Public page:

`https://sharecapsule.app/reminder/public/timeline/`

## Files

- `index.html` — mobile-first county selector and deadline timeline.
- `data/california.json` — reviewed California deadline and county-source registry.
- `worker/worker.js` — Cloudflare Worker API that receives city/county context and can use Cloudflare's coarse request city.
- `worker/wrangler.toml` — Worker deployment configuration.

## Location behavior

On page load the browser sends:

```json
{
  "city": "a saved or manually entered city, when available",
  "county": "a selected county, when available",
  "state": "CA",
  "country": "US",
  "timezone": "browser timezone"
}
```

The page does not automatically request precise GPS coordinates. When hosted on Cloudflare, the Worker can use `request.cf.city`, `request.cf.regionCode`, `request.cf.country`, and `request.cf.timezone` to infer a coarse region when the browser has not supplied a city.

## Deploy the Worker

From `reminder/public/timeline/worker/`:

```bash
npx wrangler deploy
```

Then use either approach:

1. Add a Cloudflare route for `sharecapsule.app/api/reminder/public/timeline*` to the Worker; or
2. Set `window.TIMELINE_API_URL` before the page script to the deployed `workers.dev/api/timeline` URL.

Until the Worker is routed, the page falls back to `data/california.json` and still supports manual city/county selection.

## Source and legal-safety rules

- Include only a deadline that has an official state, county, court, or agency source.
- Keep a direct official source URL on every rendered deadline.
- Do not infer individualized court, eviction, permit, license, DMV, insurance, supplemental-assessment, or entity deadlines without the controlling notice and user-supplied facts.
- Mark September 15 versus November 30 assessment-appeal dates as verify-first until each county's filing window has been separately validated.
- Revalidate fixed-date election entries for every election cycle.
- Update the registry version whenever sources or rules change.

## Initial California coverage

Alameda, Contra Costa, Marin, Napa, San Francisco, San Mateo, Santa Clara, San Joaquin, Solano, and Sonoma counties.
