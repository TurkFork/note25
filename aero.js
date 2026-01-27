/**
 * Aero Note API (Note26-only)
 * Bare, stateless API worker intended for note.aero.blacklink.net
 * ©2026 Blacklink, Inc. All rights reserved.
 */

const CONFIG = {
  ai: {
    model: "@cf/meta/llama-3-8b-instruct",
    temperature: 0.3,
    safetyModel: "@cf/meta/llama-3-8b-instruct",
    safetyTemperature: 0.1
  },
  limits: {
    maxInputChars: 100000
  }
};

const BLOCKED_PATTERNS = [
  /\b(unblocked|proxy|bypass\s*filter|vpn\s*for\s*school)\b/i,
  /\b(slavery\s*should)\b/i,
  /\b(kill\s*(myself|yourself|me)|die|suicide|end\s*it\s*all|noose|cut\s*myself|hang\s*myself)\b/i,
  /\b(self\s*harm|selfharm|cutting)\b/i,
  /\b(kill|hurt|shoot|stab|bomb|explode)\s*(you|him|her|them|school)\b/i,
  /\b(bully|cyberbully|threaten|fight\s*you)\b/i,
  /\b(porn|sex|fuck|nude|nsfw|xxx|hentai)\b/i,
  /\b(groom|daddy|mommy|ageplay)\b/i,
  /\b(weed|pot|marijuana|cocaine|meth|heroin|drugs\s*how\s*to)\b/i,
  /\b(exam\s*answers|cheat\s*on\s*test|essay\s*mill|write\s*my\s*paper)\b/i
];

const CENSOR_MESSAGE = "I can't continue this request due to content guidelines.";
const CRISIS_MESSAGE =
  "I'm really sorry you're feeling this way. You matter. If you're in the U.S., you can call or text 988 (Suicide & Crisis Lifeline) or text HOME to 741741 (Crisis Text Line). If you're elsewhere, please reach out to a local crisis line or trusted person.";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/note26/")) {
      return handleNote26Api(request, env, url);
    }

    return jsonResponse({ error: "Not found" }, 404);
  }
};

// ============================================================
// NOTE26 API
// ============================================================

async function handleNote26Api(request, env, url) {
  const origin = request.headers.get("Origin");
  const cors = getNote26CorsHeaders(env, origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors || {} });
  }

  if (origin && !cors) {
    return jsonResponse({ error: "CORS origin not allowed" }, 403);
  }

  const tokenConfigured = (env.NOTE26_API_TOKEN || "").trim();
  if (tokenConfigured) {
    const token = (request.headers.get("X-Note26-Token") || "").trim();
    if (!token || token !== tokenConfigured) {
      return note26JsonResponse(env, origin, { error: "Invalid Note26 token" }, 401);
    }
  }

  const pathname = url.pathname;

  if (request.method === "GET") {
    if (pathname === "/api/note26/version") {
      return note26JsonResponse(env, origin, {
        name: "Aero Note API",
        app: "note26",
        version: "0.2",
        basePath: "/api/note26",
        releaseDate: "2026-01-27"
      });
    }
    return note26JsonResponse(env, origin, { error: "Not found" }, 404);
  }

  if (request.method !== "POST") {
    return note26JsonResponse(env, origin, { error: "Method not allowed" }, 405);
  }

  if (!env.CLOUDFLAREAI) {
    return note26JsonResponse(env, origin, { error: "AI service unavailable" }, 503);
  }

  const action = note26ActionFromPath(pathname);
  if (!action) {
    return note26JsonResponse(env, origin, { error: "Not found" }, 404);
  }

  // Rate limit (per-IP, per-action)
  const ip = getClientIp(request);
  const limit = parseInt(env.NOTE26_RL_LIMIT || "120", 10);
  const windowSec = parseInt(env.NOTE26_RL_WINDOW_SEC || "3600", 10);
  const rlKey = `note26_rl:${action}:${ip}`;
  const rlOk = await checkSimpleRateLimit(env, rlKey, limit, windowSec);
  if (!rlOk) {
    return note26JsonResponse(env, origin, { error: "Rate limit exceeded" }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return note26JsonResponse(env, origin, { error: "Invalid JSON" }, 400);
  }

  const input = sanitizeInput(String(body?.input || ""));
  const options = body?.options && typeof body.options === "object" ? body.options : {};

  if (!input) {
    return note26JsonResponse(env, origin, { error: "input required" }, 400);
  }
  if (input.length > CONFIG.limits.maxInputChars) {
    return note26JsonResponse(env, origin, { error: "input too long" }, 400);
  }

  const safety = await checkMessageSafety(env, input);
  if (safety.blocked) {
    return note26JsonResponse(env, origin, {
      output: safety.response || CENSOR_MESSAGE,
      tokensUsed: 0,
      blocked: true,
      crisis: !!safety.crisis
    }, 200);
  }

  const prompt = buildNote26Prompt(action, input, options);
  const aiResponse = await env.CLOUDFLAREAI.run(CONFIG.ai.model, {
    messages: [
      {
        role: "system",
        content:
          "You are Aero Note API for Note26. Return helpful, concise, user-facing output. Use Markdown for lists and headings. Do not wrap the entire response in code fences."
      },
      { role: "user", content: prompt }
    ],
    temperature: CONFIG.ai.temperature
  });

  const output = aiResponse?.response || "No response.";
  const tokensUsed = estimateTokens(input + output);

  console.log(JSON.stringify({
    event: "note26_api",
    action,
    ip,
    origin: origin || null,
    timestamp: Date.now()
  }));

  return note26JsonResponse(env, origin, { output, tokensUsed, blocked: false });
}

function note26ActionFromPath(pathname) {
  switch (pathname) {
    case "/api/note26/ai":
      return "auto";
    case "/api/note26/summarize":
      return "summarize";
    case "/api/note26/rewrite":
      return "rewrite";
    case "/api/note26/explain":
      return "explain";
    case "/api/note26/key-points":
      return "extract_key_points";
    case "/api/note26/questions":
      return "questions";
    default:
      return null;
  }
}

function buildNote26Prompt(action, input, options) {
  const focus = options.focus ? String(options.focus) : "";
  const length = options.length ? String(options.length) : "";
  const tone = options.tone ? String(options.tone) : "";
  const hint = [
    focus ? `Focus: ${focus}` : "",
    length ? `Length: ${length}` : "",
    tone ? `Tone: ${tone}` : ""
  ].filter(Boolean).join(" | ");

  switch (action) {
    case "summarize":
      return `Summarize this text for a student's notes. ${hint}\n\n${input}`;
    case "rewrite":
      return `Rewrite this text to be clearer and easier to study. ${hint}\n\n${input}`;
    case "explain":
      return `Explain this content in simple terms, then give a quick example. ${hint}\n\n${input}`;
    case "extract_key_points":
      return `Extract the key points as concise bullet points. ${hint}\n\n${input}`;
    case "questions":
      return `Create 5-10 study questions based on this content, then add a brief answer key. ${hint}\n\n${input}`;
    case "auto":
    default:
      return `Do the requested Note26 action on this text. If no action is provided, summarize it. ${hint}\n\n${input}`;
  }
}

// ============================================================
// SAFETY
// ============================================================

async function checkMessageSafety(env, message) {
  if (!isBlocked(message)) return { blocked: false };

  const safety = await runSafetyCheck(env, message);
  if (safety.action === "allow") return { blocked: false };
  if (safety.action === "crisis") return { blocked: true, crisis: true, response: CRISIS_MESSAGE };
  return { blocked: true, response: CENSOR_MESSAGE };
}

function isBlocked(text) {
  const lower = String(text || "").toLowerCase();
  return BLOCKED_PATTERNS.some(pattern => pattern.test(lower));
}

async function runSafetyCheck(env, message) {
  try {
    if (!env.CLOUDFLAREAI) return { action: "block", reason: "no_ai" };
    const prompt =
      `Classify the user's message for safety handling.\n` +
      `Return JSON only in this format: {"action":"allow|block|crisis","reason":"short"}\n\n` +
      `Message:\n${message}`;
    const aiResponse = await env.CLOUDFLAREAI.run(CONFIG.ai.safetyModel, {
      messages: [
        { role: "system", content: "You are a strict safety classifier. Respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
      temperature: CONFIG.ai.safetyTemperature
    });
    const raw = aiResponse?.response || "";
    const parsed = JSON.parse(raw.trim());
    if (parsed && typeof parsed.action === "string") {
      const action = parsed.action.toLowerCase();
      if (["allow", "block", "crisis"].includes(action)) {
        return { action, reason: parsed.reason || "" };
      }
    }
  } catch (err) {
    console.error("Safety check error:", err);
  }
  return { action: "block", reason: "fallback" };
}

// ============================================================
// HELPERS
// ============================================================

function sanitizeInput(text) {
  return String(text || "").trim();
}

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

async function checkSimpleRateLimit(env, key, limit, windowSec) {
  const kv = env.CONVO_HISTORY;
  if (!kv) return true;
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= limit) return false;
  await kv.put(key, String(count + 1), { expirationTtl: windowSec });
  return true;
}

function getNote26CorsHeaders(env, origin) {
  if (!origin) return null;
  const allowlistRaw = (env.NOTE26_ALLOWED_ORIGINS || "").trim();
  const allowlist = allowlistRaw
    ? allowlistRaw.split(",").map(item => item.trim()).filter(Boolean)
    : [
      "https://note.blacklink.net",
      "http://localhost:8787",
      "http://localhost:5173"
    ];

  if (allowlist.includes("*")) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,X-Note26-Token",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin"
    };
  }

  if (!allowlist.includes(origin)) {
    return null;
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Note26-Token",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  };
}

function note26JsonResponse(env, origin, data, status = 200) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };
  const cors = getNote26CorsHeaders(env, origin);
  if (cors) Object.assign(headers, cors);
  return new Response(JSON.stringify(data), { status, headers });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

