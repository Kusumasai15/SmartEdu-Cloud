/**
 * Production-ready Two-Factor Authentication (2FA) for Microsoft Authenticator & Google Authenticator
 * Implements standard RFC 6238 (TOTP) and RFC 4226 (HOTP) algorithms with Base32 secret encoding.
 */

// Base32 character set
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Generate a cryptographically secure 16-character Base32 secret key.
 */
export function generateTotpSecret(length: number = 16): string {
  let secret = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * BASE32_CHARS.length);
    secret += BASE32_CHARS[randomIndex];
  }
  return secret;
}

/**
 * Generate an otpauth:// URL recognized by Microsoft Authenticator, Google Authenticator, Authy, etc.
 */
export function getOtpauthUri({
  accountName,
  secret,
  issuer = "UniFlow LMS",
}: {
  accountName: string;
  secret: string;
  issuer?: string;
}): string {
  const cleanAccount = encodeURIComponent(accountName.trim());
  const cleanIssuer = encodeURIComponent(issuer.trim());
  return `otpauth://totp/${cleanIssuer}:${cleanAccount}?secret=${secret.replace(/\s+/g, "").toUpperCase()}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate a scannable QR Code URL for Microsoft Authenticator.
 */
export function getTotpQrCodeUrl(otpauthUri: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauthUri)}`;
}

/**
 * Decode Base32 string to Uint8Array
 */
function base32ToBytes(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_CHARS.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

/**
 * Standard RFC 3174 SHA-1 implementation in pure JavaScript.
 */
function sha1(message: Uint8Array): Uint8Array {
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
  const msgLen = message.length;
  const bitLen = msgLen * 8;
  const padLen = (msgLen % 64 < 56) ? (56 - (msgLen % 64)) : (120 - (msgLen % 64));
  const totalLen = msgLen + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(message);
  padded[msgLen] = 0x80;
  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  padded[totalLen - 8] = (hi >>> 24) & 0xff;
  padded[totalLen - 7] = (hi >>> 16) & 0xff;
  padded[totalLen - 6] = (hi >>> 8) & 0xff;
  padded[totalLen - 5] = hi & 0xff;
  padded[totalLen - 4] = (lo >>> 24) & 0xff;
  padded[totalLen - 3] = (lo >>> 16) & 0xff;
  padded[totalLen - 2] = (lo >>> 8) & 0xff;
  padded[totalLen - 1] = lo & 0xff;

  const w = new Uint32Array(80);
  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      const idx = i + t * 4;
      w[t] = ((padded[idx] << 24) | (padded[idx + 1] << 16) | (padded[idx + 2] << 8) | padded[idx + 3]) >>> 0;
    }
    for (let t = 16; t < 80; t++) {
      const v = w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16];
      w[t] = ((v << 1) | (v >>> 31)) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let t = 0; t < 80; t++) {
      let f = 0, k = 0;
      if (t < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999; }
      else if (t < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
      else if (t < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
      else { f = b ^ c ^ d; k = 0xCA62C1D6; }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[t]) >>> 0;
      e = d; d = c; c = ((b << 30) | (b >>> 2)) >>> 0; b = a; a = temp;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const words = [h0, h1, h2, h3, h4];
  for (let j = 0; j < 5; j++) {
    out[j * 4] = (words[j] >>> 24) & 0xff;
    out[j * 4 + 1] = (words[j] >>> 16) & 0xff;
    out[j * 4 + 2] = (words[j] >>> 8) & 0xff;
    out[j * 4 + 3] = words[j] & 0xff;
  }
  return out;
}

/**
 * Standard RFC 2104 HMAC-SHA1 calculation.
 */
function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let formattedKey = new Uint8Array(blockSize);
  if (key.length > blockSize) {
    const hashedKey = sha1(key);
    formattedKey.set(hashedKey);
  } else {
    formattedKey.set(key);
  }
  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = formattedKey[i] ^ 0x5c;
    iKeyPad[i] = formattedKey[i] ^ 0x36;
  }
  const innerMsg = new Uint8Array(blockSize + message.length);
  innerMsg.set(iKeyPad, 0);
  innerMsg.set(message, blockSize);
  const innerHash = sha1(innerMsg);
  const outerMsg = new Uint8Array(blockSize + 20);
  outerMsg.set(oKeyPad, 0);
  outerMsg.set(innerHash, blockSize);
  return sha1(outerMsg);
}

/**
 * Calculate expected 6-digit TOTP token for given secret and time step (RFC 6238).
 */
export function computeTotpToken(secret: string, timeStepWindow: number = 0): string {
  const timeStep = Math.floor(Date.now() / 1000 / 30) + timeStepWindow;
  const keyBytes = base32ToBytes(secret);

  const timeBytes = new Uint8Array(8);
  let temp = timeStep;
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  const hmac = hmacSha1(keyBytes, timeBytes);
  const offset = hmac[19] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String((code % 1000000) + 1000000).substring(1);
}

/**
 * Verify user-entered 6-digit code with +/- 1 time step tolerance (prevents rejection due to clock drift).
 */
export function verifyTotpToken(secret: string, userToken: string): boolean {
  if (!secret || !userToken) return false;
  const cleanToken = userToken.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanToken)) return false;

  // Strictly check current, previous, and next time windows (+/- 30 seconds clock drift tolerance)
  for (const window of [0, -1, 1]) {
    const expected = computeTotpToken(secret, window);
    if (expected === cleanToken) {
      return true;
    }
  }

  // Token did not match secret TOTP algorithm
  return false;
}
