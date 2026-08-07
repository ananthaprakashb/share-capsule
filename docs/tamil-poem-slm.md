# Tamil poem SLM endpoint

Public page: `/cards/tamil/poem/`

API: `POST /api/tamil-poem`

```json
{
  "prompt": "இயற்கை மற்றும் மழை பற்றிய 4 வரி தமிழ் கவிதை எழுதுக"
}
```

The Cloudflare Pages Function preserves the Ollama chat structure used by the prototype:

- system role: Tamil master-poet instructions
- user role: visitor-supplied prompt
- default model: `qwen2.5:3b`
- non-streaming chat response

## Runtime configuration

Cloudflare Pages cannot run the Python `ollama` package or an Ollama daemon inside a Pages Function. Configure the function to call an Ollama-compatible HTTPS service.

Set these Pages environment variables:

- `OLLAMA_BASE_URL` — required. Base URL of the Ollama-compatible service, without `/api/chat`.
- `OLLAMA_MODEL` — optional. Defaults to `qwen2.5:3b`.
- `OLLAMA_API_KEY` — optional. Sent as a Bearer token when configured.

For production, do not expose an unauthenticated Ollama daemon directly to the public internet. Put authentication and TLS in front of the service, or use a private/managed Ollama-compatible endpoint.

## Equivalent Python prototype

```python
import ollama

system_prompt = """You are a master Tamil poet (தமிழ் கவிஞர்).
Write expressive, emotionally resonant Tamil poems (புதுக்கவிதை) using rich imagery, traditional metaphors, and proper Tamil script.
Ensure line breaks feel musical and natural."""

response = ollama.chat(
    model="qwen2.5:3b",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ],
)
```

The production Pages Function performs the same chat request through Ollama's `/api/chat` HTTP interface so it can run in the Cloudflare runtime.
