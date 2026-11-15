import bcrypt from "bcryptjs";

/**
 * bcrypt cost factor. NFR-01 requires >= 10; docs/system-sds.md 1.2 pins it at 10
 * so seeded hashes and runtime hashes stay interchangeable.
 */
export const BCRYPT_COST = 10;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_COST);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

/** True for a well-formed bcrypt hash at the cost factor this system mandates. */
export function isValidBcryptHash(value: string): boolean {
  return /^\$2[aby]\$(1[0-9]|[2-9][0-9])\$/.test(value);
}
