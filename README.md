# Share Capsule

A mobile-first, data-driven audio release and sharing site published at `sharecapsule.app`.

## How releases work

All releases live in:

`data/releases.json`

The page code in `index.html` automatically:

- shows all releases on the homepage
- adds search across title, artist, category, language, description and tags
- opens a release using `?release=<slug>`
- creates audience-specific WhatsApp share text
- supports native mobile sharing
- plays either a real preview audio URL or the built-in demo tone

Example release URL:

`https://sharecapsule.app/?release=ennungal-ennangal`

## Add a new release

Add one more object inside the `releases` array in `data/releases.json`.

```json
{
  "slug": "my-new-audio",
  "title": "My New Audio",
  "artist": "Artist Name",
  "type": "Audio release",
  "category": "Personal Finance",
  "language": "English",
  "publishedAt": "2026-07-12",
  "description": "A short description.",
  "featured": true,
  "coverImage": "https://cdn.example.com/covers/my-new-audio.jpg",
  "coverBackground": "linear-gradient(145deg,#263238,#546e7a)",
  "coverEyebrow": "New release",
  "coverLines": ["My New", "Audio"],
  "previewUrl": "https://cdn.example.com/audio/my-new-audio-preview.mp3",
  "demoTone": false,
  "demoDuration": 30,
  "platforms": [
    {"label": "YouTube", "icon": "▶", "url": "https://youtube.com/..."},
    {"label": "Spotify", "icon": "●", "url": "https://open.spotify.com/..."},
    {"label": "Apple Music", "icon": "♫", "url": "https://music.apple.com/..."}
  ],
  "shareMessages": {
    "friend": {"label": "Close friend", "icon": "💛", "text": "Thought you might enjoy this 🎧"},
    "family": {"label": "Family", "icon": "👨‍👩‍👧", "text": "Sharing this with the family ❤️"},
    "topic": {"label": "Someone interested in this", "icon": "✨", "text": "This made me think of you."}
  },
  "tags": ["finance", "budgeting", "habits"]
}
```

## Media hosting

For many releases, avoid storing large full-length audio files directly in the GitHub repository. Use a public HTTPS media URL from object storage or a CDN and place it in `previewUrl`. Cover art can also use an external HTTPS URL in `coverImage`.

## Nearby parking endpoint

`https://sharecapsule.app/parking/` asks the visitor to approve browser location access and then finds mapped parking lots and garages near the current coordinates.

The endpoint:

- keeps location processing in the browser and does not store coordinates
- supports 0.5, 1, 2 and 5 mile search radii
- uses OpenStreetMap data through the Overpass API
- sorts parking facilities by distance
- displays parking type, access rules, mapped capacity, hours and published fee/charge tags when available
- links to directions and a live web search for current rates

A listed parking facility is not a claim of live vacancy. Price, availability, access and hours must be confirmed with signs or the parking provider.

## Verified jobs endpoint

`https://sharecapsule.app/jobs/` lists verified U.S. openings in these categories:

- software engineering
- frontend engineering
- Java engineering
- data engineering
- analytics

The location gate accepts jobs in any of the 50 states, Washington D.C., and remote jobs only when the posting explicitly identifies the role as U.S.-based. Foreign and ambiguously remote postings are excluded.

Files:

- `jobs/sources.json` — official source allowlist, U.S. scope and visa-evidence metadata
- `jobs/rules.mjs` — shared role classification, all-state location recognition, U.S.-remote validation and canonical job keys
- `jobs/blocked.json` — globally hidden jobs confirmed invalid by maintainers
- `jobs/index.html` — live search, role/state/visa filters, deduplication and user validation controls
- `jobs/validate-sources.mjs` — automated source, official-link, role, U.S.-location and duplicate validation
- `.github/workflows/revalidate-jobs.yml` — validation on relevant pushes, pull requests, manual runs and a daily schedule

The jobs feature intentionally distinguishes three different facts:

1. what the live job posting explicitly says about sponsorship;
2. whether company-level historical federal filing evidence is available;
3. whether a user has confirmed or hidden the listing in their own browser.

An invalid-job button hides the role locally and opens a prefilled GitHub issue. After a maintainer confirms the report, add the job key or official URL to `jobs/blocked.json` to hide it for everyone.

## Fact-check endpoint

`https://sharecapsule.app/factcheck/` embeds Google Fact Check Explorer so visitors can search published fact checks from independent organizations without Share Capsule running a paid AI or search API.

The page:

- loads Google Fact Check Explorer inside the Share Capsule fact-check section
- provides a direct "Open Fact Check Explorer" link when the embedded view is blocked or does not render correctly
- does not require an OpenAI API key, Google Fact Check API key, or paid backend request
- clearly states that ratings and evidence come from the original fact-check publishers

File:

- `factcheck/index.html` — mobile-first embedded Fact Check Explorer interface with an external fallback link

Because embedding is controlled by the external provider, Google may block or change iframe behavior. The direct-open fallback must remain available.

## Current architecture

Most of the site intentionally stays static and inexpensive:

`GitHub Pages + JSON data + browser JavaScript`

Separate Cloudflare Workers are used only for features that require server-side state or processing, such as shared reactions and job-verdict tracking.

A future build step can generate permanent static URLs such as `/release/my-new-audio/` for unique social-preview metadata on WhatsApp and other platforms. A small serverless database can later add shared job-validation vote totals without changing the public jobs URL.
