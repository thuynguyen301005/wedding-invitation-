import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const RSVP_ADMIN_COOKIE = "rsvp_admin_session";
export const RSVP_ADMIN_SESSION_SECONDS = 60 * 60 * 12;

function getSessionSecret(): string | null {
  const secret = process.env.RSVP_ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function isRsvpAdminConfigured(): boolean {
  const password = process.env.RSVP_ADMIN_PASSWORD;
  return Boolean(password && password.length >= 16 && getSessionSecret());
}

export function verifyRsvpAdminPassword(password: string): boolean {
  const expected = process.env.RSVP_ADMIN_PASSWORD;
  if (!expected || expected.length < 16 || password.length > 256) return false;

  const expectedHash = createHmac("sha256", "rsvp-admin-password").update(expected).digest();
  const suppliedHash = createHmac("sha256", "rsvp-admin-password").update(password).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export function createRsvpAdminSession(now = Date.now()): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const expiresAt = Math.floor(now / 1000) + RSVP_ADMIN_SESSION_SECONDS;
  const payload = `${expiresAt}.${randomUUID()}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyRsvpAdminSession(token: string | undefined, now = Date.now()): boolean {
  const secret = getSessionSecret();
  if (!secret || !token) return false;

  const [expiresAtText, nonce, signature, ...rest] = token.split(".");
  if (!expiresAtText || !nonce || !signature || rest.length > 0) return false;

  const expiresAt = Number(expiresAtText);
  const currentTime = Math.floor(now / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= currentTime) return false;
  if (expiresAt > currentTime + RSVP_ADMIN_SESSION_SECONDS + 60) return false;
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;

  const expected = createHmac("sha256", secret).update(`${expiresAtText}.${nonce}`).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}
