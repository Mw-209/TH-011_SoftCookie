import crypto from "node:crypto";

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || "event_sys_session";

/** Session lifetime in hours (SESSION_TTL_HOURS, default 24 per .env.example). */
export function getSessionTtlHours(): number {
  const parsed = Number(process.env.SESSION_TTL_HOURS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
}

export function getSessionTtlMs(): number {
  return getSessionTtlHours() * 60 * 60 * 1000;
}

/** Opaque 256-bit session token. Never derived from user data. */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getSessionExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + getSessionTtlMs());
}
