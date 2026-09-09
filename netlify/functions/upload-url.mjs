import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { resolveClient, json } from "../lib/clients.mjs";

/**
 * Hands the browser a short-lived presigned PUT URL for each file, so the file
 * uploads straight from the client's machine to Cloudflare R2. Nothing large
 * ever passes through this function — Netlify caps function payloads around 6MB.
 */

// Extension allowlist. Browsers report inconsistent MIME types for TIFF, HEIC
// and RAW files, so extension is the source of truth and we set Content-Type
// ourselves from this map.
const ALLOWED = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  tif: "image/tiff",
  tiff: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  psd: "image/vnd.adobe.photoshop",
  dng: "image/x-adobe-dng",
  cr2: "image/x-canon-cr2",
  cr3: "image/x-canon-cr3",
  nef: "image/x-nikon-nef",
  arw: "image/x-sony-arw",
  raf: "image/x-fuji-raf",
  orf: "image/x-olympus-orf",
  pdf: "application/pdf",
  ai: "application/postscript",
  eps: "application/postscript",
  zip: "application/zip",
};

const MAX_FILE_BYTES = Number(process.env.MAX_FILE_MB || 500) * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 40;
const URL_TTL_SECONDS = 60 * 60; // 1 hour — long enough for a slow upload of a big file

function r2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function sanitize(name) {
  return String(name)
    .replace(/[\/\\]/g, "-")      // no path separators — keys stay flat within their prefix
    .replace(/[^\w.\- ]/g, "")     // drop anything exotic
    .replace(/\.{2,}/g, ".")       // collapse "..", so nothing looks like traversal
    .replace(/^[.\-\s]+/, "")      // no leading dot, dash or space
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "file";
}

function extOf(name) {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

export default async (req) => {
  // GET — validate a token so the page can greet the client (or refuse) before
  // showing the dropzone.
  if (req.method === "GET") {
    const token = new URL(req.url).searchParams.get("token");
    const client = resolveClient(token);
    if (!client) return json({ ok: false, error: "invalid_token" }, 403);
    return json({ ok: true, client: client.name });
  }

  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const client = resolveClient(body.token);
  if (!client) return json({ ok: false, error: "invalid_token" }, 403);

  const bucket = process.env.R2_BUCKET;
  const s3 = r2Client();
  if (!s3 || !bucket) {
    console.error("R2 is not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.");
    return json({ ok: false, error: "storage_not_configured" }, 500);
  }

  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length === 0) return json({ ok: false, error: "no_files" }, 400);
  if (files.length > MAX_FILES_PER_REQUEST) {
    return json({ ok: false, error: "too_many_files", max: MAX_FILES_PER_REQUEST }, 400);
  }

  const day = new Date().toISOString().slice(0, 10);
  const results = [];

  for (const file of files) {
    const original = sanitize(file?.name);
    const ext = extOf(original);
    const contentType = ALLOWED[ext];
    const size = Number(file?.size) || 0;

    if (!contentType) {
      results.push({ name: file?.name, ok: false, error: "unsupported_type" });
      continue;
    }
    if (size <= 0 || size > MAX_FILE_BYTES) {
      results.push({ name: file?.name, ok: false, error: "too_large", maxBytes: MAX_FILE_BYTES });
      continue;
    }

    const key = `${client.folder}/${day}/${randomUUID().slice(0, 8)}-${original}`;
    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      }),
      {
        expiresIn: URL_TTL_SECONDS,
        // Sign content-type so a leaked URL can't be reused to upload something else.
        signableHeaders: new Set(["content-type"]),
      }
    );

    results.push({ name: file?.name, ok: true, key, url, contentType });
  }

  return json({ ok: true, client: client.name, files: results });
};
