# Client artwork uploads

A branded upload page at `/upload/` that clients reach through a private,
per-client link. Files go **straight from the client's browser to Cloudflare
R2** — they never pass through Netlify, so Netlify's ~6 MB function payload
limit and ~8 MB form limit don't apply. Full-resolution TIFFs and RAW files
are fine.

```
client browser ──1── /api/upload-url ──► Netlify function (validates token)
               ◄──2── presigned PUT URL
               ──3── PUT file ──────────► Cloudflare R2 bucket
               ──4── /api/upload-complete ─► notification webhook
```

---

## One-time setup

### 1. Create the R2 bucket

In the Cloudflare dashboard: **R2 → Create bucket**. Name it something like
`flatirons-client-uploads`. Location hint: North America.

### 2. Add a CORS policy to the bucket

The browser uploads directly, so the bucket must accept cross-origin PUTs.
Under the bucket's **Settings → CORS policy**, add:

```json
[
  {
    "AllowedOrigins": [
      "https://flatironscreativestudio.com",
      "https://www.flatironscreativestudio.com"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

Add your Netlify preview domain to `AllowedOrigins` too if you want to test on
a deploy preview.

> Presigned URLs only work against the S3 API endpoint
> (`<account-id>.r2.cloudflarestorage.com`), not a custom R2 domain. That's a
> Cloudflare constraint, not a choice made here.

### 3. Create an R2 API token

**R2 → Manage R2 API Tokens → Create API token**. Permission: **Object Read &
Write**, scoped to the one bucket. Save the Access Key ID and Secret Access Key —
the secret is shown once.

### 4. Set the Netlify environment variables

Site configuration → Environment variables:

| Variable | Value |
|---|---|
| `R2_ACCOUNT_ID` | Your Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | From the R2 API token |
| `R2_SECRET_ACCESS_KEY` | From the R2 API token |
| `R2_BUCKET` | `flatirons-client-uploads` |
| `UPLOAD_CLIENTS` | JSON object of active tokens — see below |
| `NOTIFY_WEBHOOK_URL` | *(optional)* where to post the upload summary |
| `MAX_FILE_MB` | *(optional)* per-file cap, default `500` |

For `NOTIFY_WEBHOOK_URL` a Formspree endpoint works — the same kind you already
use on `/intake/`. Create a second form so artwork uploads don't land in the
project-intake inbox. An n8n, Make, or Zapier webhook works equally well.
Leave it unset and uploads still succeed; the summary goes to the function log.

---

## Giving a client access

```bash
node scripts/new-upload-link.mjs "Annie deCamp" --days 45
```

That prints the link to send and a JSON entry. Merge the entry into
`UPLOAD_CLIENTS` in Netlify and redeploy (env var changes need a redeploy to
reach the functions).

`UPLOAD_CLIENTS` looks like this:

```json
{
  "annie-decamp-be0d2969b0e7": {
    "name": "Annie deCamp",
    "folder": "annie-decamp",
    "expires": "2026-10-24T20:22:45.412Z"
  },
  "acme-4b81de02f7a1": {
    "name": "Acme Inc",
    "folder": "acme"
  }
}
```

- `name` — shown to the client on the page ("Uploading for Annie deCamp")
- `folder` — the prefix uploads land under in the bucket
- `expires` — optional ISO date; after it, the link stops working

**To revoke a link**, delete its entry and redeploy.

Uploads are keyed as `folder/YYYY-MM-DD/<random>-<original-name>`, so repeat
uploads of the same filename never overwrite each other.

---

## What the client sees

They open the link, see the Flatirons header and their own name, and drag files
in. Image files get thumbnails; everything else gets a file-type badge. Each
file shows its own progress bar. They can add their name, email, and a note.
Nothing is required except the files.

If the link is wrong or expired they get a plain "this link isn't valid"
message pointing at `hello@flatironscreativestudio.com` — no hint that other
valid links exist.

---

## Limits and guards

| Guard | Where | Value |
|---|---|---|
| File type | Server, by extension | JPG, PNG, GIF, WEBP, TIFF, HEIC, BMP, PSD, DNG, CR2/CR3, NEF, ARW, RAF, ORF, PDF, AI, EPS, ZIP |
| Content type | Signed into the presigned URL | A leaked URL can't be reused to upload a different type |
| Filename | Server | Path separators and leading dots stripped; 120 char cap |
| File size | Server | `MAX_FILE_MB`, default 500 MB |
| Files per request | Server | 40 |
| Presigned URL lifetime | Server | 1 hour |
| Token check | Server, constant-time | Per-client, optionally expiring |
| Search indexing | `netlify.toml` header | `noindex, nofollow` on `/upload/*` |

The page is not linked from the site nav, and the token is the only thing that
opens it. A token is a bearer credential — treat a client link the way you'd
treat a shared password.

---

## Cost

Cloudflare R2's free tier covers 10 GB-month of storage, 1 million Class A
operations (uploads) and 10 million Class B operations per month, with **no
egress charges**. Past that, storage is $0.015/GB-month.

Roughly: ~65 full-resolution 150 MB TIFFs sitting in the bucket for a month
would exceed the free storage tier and cost cents, not dollars. Move finished
project files out to archive and you'll likely never leave the free tier.
*(Pricing verified against Cloudflare's docs September 2026 — worth a glance
before you rely on it long-term.)*

---

## Local development

```bash
npm install
npx netlify dev
```

Run the function tests any time — they need no credentials and no network,
since presigning is a local operation:

```bash
npm run test:uploads
```


`netlify dev` runs the functions alongside Eleventy. Put the same environment
variables in a `.env` file at the repo root (it's gitignored) or set them in
the Netlify CLI. Without them, the page loads but `/api/upload-url` returns
`storage_not_configured`.
