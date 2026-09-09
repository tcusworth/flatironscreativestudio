import { timingSafeEqual } from "node:crypto";

/**
 * Per-client upload tokens.
 *
 * Configured via the UPLOAD_CLIENTS environment variable, a JSON object keyed
 * by token:
 *
 *   {
 *     "annie-7f3a9c21": { "name": "Annie deCamp", "folder": "annie-decamp" },
 *     "acme-4b81de02": { "name": "Acme Inc",     "folder": "acme" }
 *   }
 *
 * Tokens are unguessable strings you generate (see scripts/new-upload-link.mjs).
 * "folder" is the prefix uploads land under inside the R2 bucket.
 */
export function loadClients() {
  const raw = process.env.UPLOAD_CLIENTS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    console.error("UPLOAD_CLIENTS is not valid JSON — no upload tokens are active.");
    return {};
  }
}

/** Constant-time string compare, so tokens can't be guessed a character at a time. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Resolve a token to its client record, or null. */
export function resolveClient(token) {
  if (!token || typeof token !== "string") return null;
  const clients = loadClients();
  for (const [knownToken, client] of Object.entries(clients)) {
    if (safeEqual(token, knownToken)) {
      if (client.expires && Date.now() > Date.parse(client.expires)) return null;
      return {
        name: client.name || "Client",
        folder: (client.folder || "misc").replace(/[^a-zA-Z0-9._-]/g, "-"),
      };
    }
  }
  return null;
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
