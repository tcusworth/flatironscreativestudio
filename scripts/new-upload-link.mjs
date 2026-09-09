#!/usr/bin/env node
/**
 * Mint a client upload link.
 *
 *   node scripts/new-upload-link.mjs "Annie deCamp"
 *   node scripts/new-upload-link.mjs "Annie deCamp" --days 30
 *
 * Prints the link to send the client and the JSON entry to add to the
 * UPLOAD_CLIENTS environment variable in Netlify.
 */
import { randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--"));

if (!name) {
  console.error('Usage: node scripts/new-upload-link.mjs "Client Name" [--days 30]');
  process.exit(1);
}

const daysFlag = args.indexOf("--days");
const days = daysFlag !== -1 ? Number(args[daysFlag + 1]) : null;

const slug = name
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 24);

const token = `${slug}-${randomBytes(6).toString("hex")}`;

const entry = { name, folder: slug };
if (days && Number.isFinite(days)) {
  entry.expires = new Date(Date.now() + days * 86400000).toISOString();
}

const link = `https://flatironscreativestudio.com/upload/?c=${token}`;

console.log("");
console.log("  Send this link to the client");
console.log("  " + link);
console.log("");
if (entry.expires) console.log(`  Expires ${new Date(entry.expires).toDateString()}`);
console.log("  Uploads land in the bucket under:  " + slug + "/");
console.log("");
console.log("  Add this to UPLOAD_CLIENTS in Netlify (merge with what's already there):");
console.log("");
console.log("  " + JSON.stringify({ [token]: entry }, null, 2).split("\n").join("\n  "));
console.log("");
