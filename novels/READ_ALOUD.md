# Novels read-aloud

`/novels/` supports two narration paths, in this order:

1. **Pre-generated/server audio** — preferred when a chapter supplies `narration`, `audio`, or `tts_audio` in front matter. The value may be an HTTPS URL or a path relative to the novel folder.
2. **Edge/device speech synthesis** — fallback using the browser Web Speech API. The reader exposes the voices installed/provided by the browser and prioritizes language-matching Microsoft/Natural/Online voices when available.

Example chapter:

```md
---
chapter_title: "The Optimized Lie"
language: "en-US"
narration: "audio/chapter-01.mp3"
---
```

Without `narration`, readers can still press Play and select an available browser voice. Voice and playback-speed preferences are stored locally.

## Server generation workflow

For production-quality narration, generate one audio asset per chapter at publish time, store it in R2 or the Stories folder, and write its URL/path to `narration`. Do not put provider API keys in the browser. Generation belongs in a Worker/server or GitHub publishing workflow. The web reader only consumes the resulting audio URL.

This keeps playback cheap and cacheable while retaining zero-setup browser narration as a fallback.