# ShareCapsule Cards social login

The `/cards/` hub and `/cards/api/*` endpoints are designed to sit behind Cloudflare Access. Existing routes such as `/cards/daily/` remain public because the repository middleware only enforces authentication for `/cards`, `/cards/`, and `/cards/api/*`.

## Cloudflare Access setup

Create Access self-hosted applications for these paths on the production domain:

- `sharecapsule.app/cards`
- `sharecapsule.app/cards/api/*`

Use an **Allow** policy that requires an authenticated identity. Enable one or more social identity providers such as Google or GitHub in Cloudflare Zero Trust. Cloudflare Access will redirect unauthenticated users to the provider sign-in screen and inject `Cf-Access-Jwt-Assertion` after successful authentication.

The Pages middleware intentionally returns HTTP 401 when that assertion is absent, so the members hub is not accidentally public if the Access application has not been configured yet.

## Model configuration

The protected poem endpoint reuses the same server-side model configuration as the Tamil poem feature:

- Preferred: `OLLAMA_BASE_URL`, optional `OLLAMA_MODEL` (defaults to `qwen2.5:3b`) and optional `OLLAMA_API_KEY`.
- Fallback: `GROQ_API_KEY`, optional `GROQ_BASE_URL`, and optional `GROQ_MODEL`.

Do not place API keys in `cards/index.html` or other browser code.

## Routes

- `GET /cards/` — authenticated Tamil/English poem card maker.
- `GET /cards/api/session` — returns the authenticated Access email when Cloudflare provides it.
- `POST /cards/api/poem` — accepts `{ "prompt": "...", "language": "ta" | "en" }` and returns `{ poem, model, language }`.

The card is rendered locally to a 1080x1350 canvas and can be downloaded as PNG or shared through the Web Share API/WhatsApp.
