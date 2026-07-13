# R2 audio auto publishing

The workflow `.github/workflows/publish-r2-audio.yml` checks the `techvideos` Cloudflare R2 bucket every hour and publishes newly discovered audio objects to both:

- `audio/data.json`
- `data/releases.json`

## Required GitHub Actions secrets

Add these repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Create the R2 access keys with read-only access to the `techvideos` bucket.

## Supported files

The publisher automatically accepts `.m4a`, `.mp3`, `.aac`, `.wav`, `.ogg`, and `.flac` files. An `.mp4` file is published only when R2 reports an audio content type or when the object has `forcePublish: true` in `audio/publish-overrides.json`. This prevents ordinary videos from being added as audio articles.

## Metadata overrides

Use `audio/publish-overrides.json` when a filename is not enough to produce the desired title, category, description, language, cover, or stable ID. Explicit overrides are published immediately after they reach `main`, even before R2 API secrets are configured.

## Duplicate protection

The publisher skips objects already present by `objectKey`, and also rejects duplicate audio IDs and release slugs. New D1 reaction rows are created automatically on the first Like or Clap because audio IDs use the generic reaction API.
