import { resolveClient, json } from "../lib/clients.mjs";

/**
 * Called by the upload page once every file has finished transferring.
 * Posts a plain summary to NOTIFY_WEBHOOK_URL (a Formspree endpoint, a Zapier
 * or Make hook, an n8n webhook — anything that accepts a JSON POST).
 *
 * If NOTIFY_WEBHOOK_URL is unset the upload still succeeds; the summary just
 * goes to the function log instead.
 */
export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const client = resolveClient(body.token);
  if (!client) return json({ ok: false, error: "invalid_token" }, 403);

  const files = Array.isArray(body.files) ? body.files.slice(0, 100) : [];
  const totalBytes = files.reduce((sum, f) => sum + (Number(f.size) || 0), 0);

  const summary = {
    _subject: `Artwork upload — ${client.name} (${files.length} file${files.length === 1 ? "" : "s"})`,
    client: client.name,
    uploaded_by: String(body.uploaderName || "").slice(0, 120) || "(not given)",
    reply_to: String(body.uploaderEmail || "").slice(0, 160) || "(not given)",
    note: String(body.note || "").slice(0, 2000) || "(none)",
    file_count: files.length,
    total_size: `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`,
    bucket: process.env.R2_BUCKET || "(unset)",
    files: files.map((f) => `${f.key}  (${((Number(f.size) || 0) / (1024 * 1024)).toFixed(1)} MB)`),
    received_at: new Date().toISOString(),
  };

  const hook = process.env.NOTIFY_WEBHOOK_URL;
  if (!hook) {
    console.log("Upload complete (no NOTIFY_WEBHOOK_URL set):", JSON.stringify(summary));
    return json({ ok: true, notified: false });
  }

  try {
    const res = await fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(summary),
    });
    if (!res.ok) {
      console.error("Notification webhook returned", res.status, await res.text().catch(() => ""));
      return json({ ok: true, notified: false });
    }
  } catch (err) {
    // The files are safely in R2 — a failed notification must not fail the upload.
    console.error("Notification webhook failed:", err);
    return json({ ok: true, notified: false });
  }

  return json({ ok: true, notified: true });
};
