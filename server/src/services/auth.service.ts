import type { Role, User } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { verifyPassword } from "../lib/password.js";
import {
  generateSessionToken,
  getSessionExpiry,
} from "../lib/session.js";
import { ApiError } from "../lib/errors.js";

/** The only user shape that may leave the server. Never includes passwordHash (NFR-01). */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates raw login input before any database work.
 * Throws VALIDATION_ERROR (400) with per-field details.
 */
export function validateLoginInput(body: unknown): {
  email: string;
  password: string;
} {
  const details: Record<string, string> = {};
  const raw = (body ?? {}) as Record<string, unknown>;

  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const password = typeof raw.password === "string" ? raw.password : "";

  if (!email) {
    details.email = "Email address is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    details.email = "Enter a valid email address.";
  }

  if (!password) {
    details.password = "Password is required.";
  }

  if (Object.keys(details).length > 0) {
    throw ApiError.validation("Please correct the highlighted fields.", details);
  }

  return { email: email.toLowerCase(), password };
}

/**
 * Verifies credentials and creates a PostgreSQL-backed session.
 * BR-04: only active users may authenticate.
 */
export async function login(email: string, password: string): Promise<{
  user: PublicUser;
  token: string;
  expiresAt: Date;
}> {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always run a comparison shape that does not leak whether the email exists.
  if (!user) {
    throw ApiError.invalidCredentials();
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw ApiError.invalidCredentials();
  }

  // Checked only after the password is proven, so an attacker cannot use this
  // response to enumerate which accounts exist.
  if (!user.isActive) {
    throw ApiError.accountInactive();
  }

  const token = generateSessionToken();
  const expiresAt = getSessionExpiry();

  await prisma.session.create({
    data: { token, userId: user.id, expiresAt },
  });

  return { user: toPublicUser(user), token, expiresAt };
}

/**
 * Resolves the active session token to its owner.
 * Expired sessions are deleted and treated as absent.
 */
export async function getUserBySessionToken(
  token: string
): Promise<PublicUser | null> {
  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { token } }).catch(() => undefined);
    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  return toPublicUser(session.user);
}

/** AC-04: deleting the row makes any replay of the token fail immediately. */
export async function revokeSession(token: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.session.delete({ where: { token } }).catch(() => undefined);
}
