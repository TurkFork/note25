# Note26 Bare API (Aero) — Integration Guide

This repo’s `aero.js` is now a **Note26-only Aero worker**: a **public, stateless** API intended for Note26 “Aero tools” like summarization, rewrites, explanations, and study questions.

**Base URL (production):** `https://note.aero.blacklink.net`
**Base path:** `/api/note26`

## Why this exists

Note26 should **not** ship `INTERNAL_API_KEY` in the browser. The existing `/api/internal/*` endpoints are for Blacklink internal services (server-to-server, or trusted apps) and require elevated auth.

This “bare API” is designed to be safe to call directly from the Note26 frontend:
- **No user accounts required**
- **No conversation storage**
- **CORS restricted** to Note26 origins
- **Rate limited** per IP

This worker serves **no HTML UI** and **only** serves `/api/note26/*`. Everything else returns JSON 404.

## Endpoints

All endpoints return JSON: `{ output, tokensUsed, blocked }`

### Version

`GET /api/note26/version`

### Summarize

`POST /api/note26/summarize`

Body:
```json
{ "input": "long text...", "options": { "length": "short", "focus": "key takeaways" } }
```

### Rewrite

`POST /api/note26/rewrite`

### Explain

`POST /api/note26/explain`

### Key points (bullets)

`POST /api/note26/key-points`

### Study questions

`POST /api/note26/questions`

### Generic (fallback)

`POST /api/note26/ai`

Uses a generic instruction and defaults to summarization if unclear.

## Browser fetch example (Note26)

```js
const NOTE_API_BASE = "https://note.aero.blacklink.net";

async function aeroSummarize(text) {
  const res = await fetch(`${NOTE_API_BASE}/api/note26/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: text,
      options: { length: "short", focus: "notes" }
    })
  });

  if (!res.ok) throw new Error(`Aero failed (${res.status})`);
  return res.json(); // { output, tokensUsed, blocked }
}
```

## CORS configuration (required)

Set `NOTE26_ALLOWED_ORIGINS` to the comma-separated list of frontend origins allowed to call the API.

Example:
```bash
NOTE26_ALLOWED_ORIGINS="https://note26.blacklink.net"
```

Defaults (if unset) include:
- `https://note26.blacklink.net`
- `http://localhost:8787`
- `http://localhost:5173`

## Optional auth (recommended)

If you want to lock the API down beyond CORS + rate limits, set:

- `NOTE26_API_TOKEN` to a secret token

Then include header:
```
X-Note26-Token: <NOTE26_API_TOKEN>
```

Important: this token is a shared secret. If you put it in a browser app, it can be extracted. Only enable this if you also control distribution and are okay with that risk.

## Rate limiting

Environment variables:
- `NOTE26_RL_LIMIT` (default `120`) requests per window per IP per action
- `NOTE26_RL_WINDOW_SEC` (default `3600`) window size in seconds

## Cloudflare Worker environment requirements

Bindings used:
- `CLOUDFLAREAI` (AI binding)
- `CONVO_HISTORY` (KV; used for rate limiting counters)

## Hostname lock

Not needed: this worker is Note26-only and serves `/api/note26/*` on any hostname it’s deployed to.

## Note26 migration notes

If Note26 currently calls `/api/internal/*`:
- Change base URL to `https://note.aero.blacklink.net`
- Switch requests to `/api/note26/*`
- Remove `X-Internal-Key` / `X-App-Id` and `credentials: "include"` from browser code
