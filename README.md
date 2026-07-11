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

## Current architecture

This version intentionally stays serverless and inexpensive:

`GitHub Pages + releases.json + browser JavaScript`

A future build step can generate permanent static URLs such as `/release/my-new-audio/` for unique social-preview metadata on WhatsApp and other platforms.
