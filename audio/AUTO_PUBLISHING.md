# R2 audio auto publishing

The workflow `.github/workflows/publish-r2-audio.yml` checks the `techvideos` Cloudflare R2 bucket every 15 minutes and publishes newly discovered audio objects to both:

- `audio/data.json`
- `data/releases.json`

Publisher or workflow changes also trigger a full R2 discovery scan after explicit metadata overrides are processed.

## Required GitHub Actions secrets

Add these repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Create the R2 access keys with read-only access to the `techvideos` bucket.

## Supported files

The publisher automatically accepts `.m4a`, `.mp3`, `.aac`, `.wav`, `.ogg`, `.oga`, `.opus`, `.flac`, `.m4b`, `.aif`, and `.aiff` files.

Ambiguous media containers such as `.mp4`, `.webm`, `.mpeg`, and `.mpg` are published only when R2 reports an `audio/*` content type or when the object has `forcePublish: true` in `audio/publish-overrides.json`. This prevents ordinary videos from being added as audio articles.

## Metadata overrides

Use `audio/publish-overrides.json` when a filename is not enough to produce the desired title, category, description, language, cover, or stable ID. Explicit overrides are published immediately after they reach `main`, even before R2 API secrets are configured.

For an audio file stored in an ambiguous container such as `.mp4`, add an exact object-key override with `"forcePublish": true` when R2 does not expose an audio content type.

## Duplicate protection

The publisher skips objects already present by exact `objectKey`. Generated ID collisions are automatically resolved with a stable hash suffix; an explicitly configured duplicate ID is reported and skipped.

New D1 reaction rows are created automatically on the first Like or Clap because audio IDs use the generic reaction API.

## Discovery diagnostics

Each discovery run prints JSON containing:

- `newestDiscovered` — the newest supported or ambiguous R2 objects, ordered by `LastModified`
- `newestIgnored` — recent objects with unsupported extensions
- `added` — objects published by the run
- `skipped` — objects not published and the exact reason, including existing object keys, ambiguous non-audio content types, or explicit ID collisions

When a new file is not published, inspect the `Discover and publish new audio objects` step first; the newest R2 object and its skip reason should be visible there.
