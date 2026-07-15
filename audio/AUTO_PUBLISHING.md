# R2 audio publishing

Automatic R2 catalog updates are currently **paused**.

The workflow `.github/workflows/publish-r2-audio.yml` no longer runs on a schedule and no longer runs automatically on pushes. It can only be started manually with `workflow_dispatch` while the R2 publishing process is reviewed.

For now, new R2 audio releases should be reviewed and added one by one:

- add the playable object to `audio/data.json`
- add the curated homepage release to `data/manual-releases.json`
- verify the exact R2 object key and public URL before publishing

The generated historical catalog remains in `data/releases.json`. The homepage loads `data/manual-releases.json` first and then merges the generated catalog behind it, deduplicating by release slug.

## Required GitHub Actions secrets

The manual R2 discovery workflow still requires these repository secrets when it is explicitly run:

- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Create the R2 access keys with read-only access to the `techvideos` bucket.

## Supported files

The publisher recognizes `.m4a`, `.mp3`, `.aac`, `.wav`, `.ogg`, `.oga`, `.opus`, `.flac`, `.m4b`, `.aif`, and `.aiff` files.

Ambiguous media containers such as `.mp4`, `.webm`, `.mpeg`, and `.mpg` are published by the discovery script only when R2 reports an `audio/*` content type or when the object has `forcePublish: true` in `audio/publish-overrides.json`.

## Manual review policy

Do not rely on R2 discovery to publish a new release automatically. Review each candidate object individually for:

- exact object key
- whether the object is actually audio
- title and language
- category and description
- stable release ID
- public playback URL

Only after review should it be added to the manual catalog.

## Discovery diagnostics

When the manual discovery workflow is explicitly run, it prints JSON containing:

- `newestDiscovered` — the newest supported or ambiguous R2 objects, ordered by `LastModified`
- `newestIgnored` — recent objects with unsupported extensions
- `added` — objects published by the run
- `skipped` — objects not published and the exact reason

The discovery workflow is retained only as a troubleshooting tool while the publishing process is revisited.
