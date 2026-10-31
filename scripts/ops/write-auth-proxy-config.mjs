#!/usr/bin/env node
// Writes the Pages Function's auth target from NEON_AUTH_BASE_URL (Neon's `base_url`, ending in
// `/auth`). Run before `wrangler pages deploy`; the output is gitignored.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
if (!baseUrl) {
  console.error('NEON_AUTH_BASE_URL is not set (Neon Auth base URL, ends with /auth).');
  process.exit(1);
}
try {
  new URL(baseUrl);
} catch {
  console.error('NEON_AUTH_BASE_URL is not a valid URL.');
  process.exit(1);
}

const out = fileURLToPath(
  new URL('../../apps/web/functions/auth/auth-target.generated.json', import.meta.url),
);
writeFileSync(out, `${JSON.stringify({ authBaseUrl: baseUrl.replace(/\/+$/, '') }, null, 2)}\n`);
console.log(`Wrote ${out}`);
