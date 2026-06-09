/**
 * Generates a signed deep link for the ContentPreview iOS app.
 *
 * Usage:
 *   node tools/sign-preview-link.js [path] [user] [ttl-minutes]
 *
 * Examples:
 *   node tools/sign-preview-link.js
 *   node tools/sign-preview-link.js /digi2/home author@example.com 30
 *
 * Requires tools/preview-private.pem (never commit this file).
 * Requires Node.js >= 13.2 for ieee-p1363 DSA encoding.
 */

import { createSign } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const privateKeyPem = readFileSync(join(__dirname, 'preview-private.pem'), 'utf8');

function base64url(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function signPreviewLink({ path = '/digi2/home', sub = 'author', ttlMinutes = 60 } = {}) {
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(Buffer.from(JSON.stringify({
    sub,
    path,
    src: 'page',
    iat: now,
    exp: now + ttlMinutes * 60,
  })));

  const message = `${header}.${payload}`;
  const sign = createSign('SHA256');
  sign.update(message);
  // ieee-p1363 produces raw R||S (64 bytes) required by JWT ES256 / iOS CryptoKit
  const sig = base64url(sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' }));

  return `myapp://home?token=${message}.${sig}`;
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [,, path, sub, ttl] = process.argv;
  const url = signPreviewLink({
    path: path ?? '/digi2/home',
    sub: sub ?? 'author',
    ttlMinutes: ttl ? parseInt(ttl, 10) : 60,
  });
  console.log(url);
}
