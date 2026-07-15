# Share Capsule PWA and notifications

## Included

- installable web app manifest
- service worker with offline fallback
- Android/desktop install prompt and iOS Add to Home Screen guidance
- notification opt-in UI on every page
- Push API subscription storage in the existing `sharecapsule-reactions` Worker and D1 database
- service-worker handlers for incoming push messages and notification clicks

## One-time Cloudflare setup

1. Run `workers/reactions/migrations/0003_push_subscriptions.sql` against the D1 database bound as `DB`.
2. Generate a Web Push VAPID key pair with a trusted Web Push tool or library.
3. In the `sharecapsule-reactions` Worker, add encrypted secrets/variables:
   - `VAPID_PUBLIC_KEY` — URL-safe Base64 public key used by browsers.
   - `VAPID_PRIVATE_KEY` — private key used only by the future notification sender.
   - `VAPID_SUBJECT` — a contact such as `mailto:admin@sharecapsule.app`.
4. Deploy the latest `workers/reactions/src/index.js` and `workers/reactions/src/push-subscriptions.js`.

## Sending new-post notifications

Subscriptions are stored in `push_subscriptions`. Sending a broadcast requires a server-side Web Push sender that:

1. reads active subscriptions from D1;
2. encrypts the payload for each subscription;
3. signs each request using the VAPID private key;
4. deletes subscriptions that return HTTP 404 or 410.

Never expose `VAPID_PRIVATE_KEY` in browser JavaScript or the repository.

Example payload handled by `sw.js`:

```json
{
  "title": "New on Share Capsule",
  "body": "A new Tamil health audio has been released.",
  "url": "/?release=tamil-teeth-heart-alzheimer-health",
  "tag": "release-tamil-teeth-heart-alzheimer-health"
}
```

## Mobile installation

- Android: use the in-page **Install** button or browser menu → Install app/Add to Home screen.
- iPhone/iPad: open the site, tap Share, then **Add to Home Screen**. Web push on iOS requires the app to be installed to the Home Screen and the user to grant notification permission.
