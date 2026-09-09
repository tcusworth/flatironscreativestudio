/**
 * Tests for the client upload functions. No network and no real R2 credentials
 * needed — presigning is a local operation, so this checks the token gate,
 * the file allowlist, size caps, key shape and the notification fallback.
 *
 *   npm run test:uploads
 */
process.env.R2_ACCOUNT_ID = "abc123fakeaccount";
process.env.R2_ACCESS_KEY_ID = "FAKEKEYID";
process.env.R2_SECRET_ACCESS_KEY = "fakesecretfakesecretfakesecret";
process.env.R2_BUCKET = "flatirons-client-uploads";
process.env.MAX_FILE_MB = "500";
process.env.UPLOAD_CLIENTS = JSON.stringify({
  "annie-decamp-be0d2969b0e7": { name: "Annie deCamp", folder: "annie-decamp" },
  "expired-aaaa1111": { name: "Old Client", folder: "old", expires: "2020-01-01T00:00:00Z" }
});

const { default: uploadUrl } = await import("../netlify/functions/upload-url.mjs");
const { default: uploadComplete } = await import("../netlify/functions/upload-complete.mjs");

let pass = 0, fail = 0;
const check = (label, cond, extra = "") => {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label + (extra ? "  → " + extra : "")); }
};

const post = (body) => new Request("https://x/api/upload-url", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
});

console.log("\n── Token gate (GET) ──");
let r = await uploadUrl(new Request("https://x/api/upload-url?token=annie-decamp-be0d2969b0e7"));
let j = await r.json();
check("valid token returns client name", r.status === 200 && j.client === "Annie deCamp", JSON.stringify(j));

r = await uploadUrl(new Request("https://x/api/upload-url?token=wrong-token"));
check("bad token → 403", r.status === 403);

r = await uploadUrl(new Request("https://x/api/upload-url?token=expired-aaaa1111"));
check("expired token → 403", r.status === 403);

r = await uploadUrl(new Request("https://x/api/upload-url"));
check("missing token → 403", r.status === 403);

console.log("\n── Presigning (POST) ──");
r = await uploadUrl(post({ token: "annie-decamp-be0d2969b0e7", files: [
  { name: "Sunrise Over Flatirons.tif", size: 180 * 1024 * 1024, type: "" },
  { name: "detail-shot.JPG", size: 4 * 1024 * 1024, type: "image/jpeg" },
  { name: "malware.exe", size: 1024, type: "application/octet-stream" },
  { name: "huge-scan.tif", size: 900 * 1024 * 1024, type: "image/tiff" },
  { name: "../../etc/passwd.png", size: 2048, type: "image/png" }
]}));
j = await r.json();
const [tif, jpg, exe, huge, trav] = j.files;

check("TIFF signed, correct content-type", tif.ok && tif.contentType === "image/tiff", JSON.stringify(tif).slice(0,120));
check("URL points at the R2 S3 endpoint", /^https:\/\/[a-z0-9.-]*abc123fakeaccount\.r2\.cloudflarestorage\.com\//.test(tif.url), tif.url.slice(0,90));
check("URL carries SigV4 signature", tif.url.includes("X-Amz-Signature=") && tif.url.includes("X-Amz-Credential="));
check("expiry is 3600s", tif.url.includes("X-Amz-Expires=3600"));
check("content-type is a signed header", /X-Amz-SignedHeaders=[^&]*content-type/i.test(decodeURIComponent(tif.url)), decodeURIComponent(tif.url).match(/X-Amz-SignedHeaders=[^&]*/)?.[0]);
check("content-length NOT signed (browser sets it)", !/content-length/i.test(decodeURIComponent(tif.url)));
check("key uses client folder + date", /^annie-decamp\/\d{4}-\d{2}-\d{2}\/[0-9a-f]{8}-/.test(tif.key), tif.key);
check("uppercase extension accepted", jpg.ok && jpg.contentType === "image/jpeg");
check(".exe rejected", !exe.ok && exe.error === "unsupported_type");
check("900MB over 500MB cap rejected", !huge.ok && huge.error === "too_large");
check("path traversal neutralised in key", trav.ok && !trav.key.includes("..") && trav.key.split("/").length === 3, trav.key);

console.log("\n── Abuse guards ──");
r = await uploadUrl(post({ token: "wrong", files: [{ name: "a.jpg", size: 100 }] }));
check("bad token can't presign", r.status === 403);

r = await uploadUrl(post({ token: "annie-decamp-be0d2969b0e7", files: [] }));
check("empty file list → 400", r.status === 400);

r = await uploadUrl(post({ token: "annie-decamp-be0d2969b0e7",
  files: Array.from({ length: 41 }, (_, i) => ({ name: `f${i}.jpg`, size: 1000 })) }));
check("41 files → too_many_files", r.status === 400 && (await r.json()).error === "too_many_files");

r = await uploadUrl(new Request("https://x/api/upload-url", { method: "DELETE" }));
check("DELETE → 405", r.status === 405);

r = await uploadUrl(new Request("https://x/api/upload-url", {
  method: "POST", headers: {"content-type":"application/json"}, body: "not json" }));
check("malformed JSON → 400", r.status === 400);

console.log("\n── Two files never collide ──");
r = await uploadUrl(post({ token: "annie-decamp-be0d2969b0e7",
  files: [{ name: "untitled.jpg", size: 1000 }, { name: "untitled.jpg", size: 1000 }] }));
j = await r.json();
check("same filename → distinct keys", j.files[0].key !== j.files[1].key, j.files[0].key + " vs " + j.files[1].key);

console.log("\n── upload-complete ──");
delete process.env.NOTIFY_WEBHOOK_URL;
r = await uploadComplete(new Request("https://x/api/upload-complete", {
  method: "POST", headers: {"content-type":"application/json"},
  body: JSON.stringify({ token: "annie-decamp-be0d2969b0e7", files: [{key:"annie-decamp/2026-09-09/ab-x.tif", size: 1048576, name:"x.tif"}], note:"hi" }) }));
j = await r.json();
check("succeeds with no webhook configured", r.status === 200 && j.ok === true && j.notified === false);

r = await uploadComplete(new Request("https://x/api/upload-complete", {
  method: "POST", headers: {"content-type":"application/json"},
  body: JSON.stringify({ token: "nope", files: [] }) }));
check("bad token → 403", r.status === 403);

process.env.NOTIFY_WEBHOOK_URL = "http://127.0.0.1:9/dead";
r = await uploadComplete(new Request("https://x/api/upload-complete", {
  method: "POST", headers: {"content-type":"application/json"},
  body: JSON.stringify({ token: "annie-decamp-be0d2969b0e7", files: [{key:"k", size: 1}] }) }));
j = await r.json();
check("dead webhook does NOT fail the upload", r.status === 200 && j.ok === true, JSON.stringify(j));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
