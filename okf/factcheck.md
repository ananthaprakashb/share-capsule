---
type: Product Feature
title: ShareCapsule news investigation assistant
description: Evidence-oriented investigation of messages, articles, screenshots, and video claims.
resource: https://sharecapsule.app/factcheck/
tags:
  - fact-checking
  - misinformation
  - tamil
  - ocr
  - news-verification
timestamp: 2026-08-02T16:50:00Z
---

# News investigation assistant

The `/factcheck/` route helps users investigate news or claims received through messaging apps, websites, screenshots, and public video links.

## Supported inputs

- Tamil or English message text
- Article or original-source URL
- Public video or social-media URL with a user-supplied claim
- Screenshot text extracted through browser-local OCR

Regional OCR support may include Tamil, Telugu, Malayalam, Hindi/Devanagari, Kannada, and English.

## Investigation signals

- Claim extraction and selection
- Published fact-check matches
- Article metadata, publisher, author, and dates
- Official-domain indicators
- Evidence timeline
- Source-transparency signals
- Article metadata comparison
- Regional official-source and news-search links

## Important limitation

The tool is an evidence assistant, not an automatic truth detector. A missing published fact check does not prove that a claim is true or false. Evidence strength and source transparency are not mathematical truth scores.

## Privacy

Screenshot OCR runs in the browser. Screenshot bytes are not intentionally sent to ShareCapsule for OCR. Only text selected for investigation is submitted to the fact-check service.

## Related pages

- [Safety and privacy](./safety-and-privacy.md)
- [Site overview](./site-overview.md)
