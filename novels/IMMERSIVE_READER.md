# Immersive novel metadata

The `/novels/` reader works with plain Markdown without metadata. Optional metadata makes chapter openings cinematic.

## Book metadata

Add `book.json` inside a novel folder:

```json
{
  "title": "UNPROMPTED",
  "author": "Anantha Prakash",
  "mood": "future",
  "artwork": "cover.webp",
  "ambient": "atmosphere.mp3"
}
```

All fields are optional. Audio is never autoplayed; the reader must explicitly turn on **Atmosphere**.

## Chapter metadata

Markdown chapters can start with simple YAML-style front matter:

```md
---
title: The Last Prompt
subtitle: San Francisco · 2:13 AM
mood: night
scene: San Francisco
artwork: chapter-01.webp
ambient: rain.mp3
---

The room had stopped asking questions.
```

Supported moods are `night`, `warm`, `forest`, `future`, and `storm`. Unknown moods gracefully use the future palette.

`artwork` and `ambient` may be absolute HTTPS URLs or paths relative to the novel folder.

## Design rules

- Atmosphere is opt-in and plays quietly.
- Chapter artwork is concentrated at the opening, not behind reading text.
- Reader chrome fades after a few seconds and returns on interaction.
- Device reduced-motion preferences are respected.
- Story Markdown remains the canonical source and remains readable without any metadata.
