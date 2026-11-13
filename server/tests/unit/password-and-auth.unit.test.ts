import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import {
  BCRYPT_COST,
  hashPassword,
  verifyPassword,
  isValidBcryptHash,
} from "../../src/lib/password.js";
import { validateLoginInput } from "../../src/services/auth.service.js";
import { ApiError } from "../../src/lib/errors.js";
import {
  generateSessionToken,
  getSessionExpiry,
} from "../../src/lib/session.js";

describe("TEST-01 [UNIT-01]: Password hashing & login input rules", () => {
  const plainPassword = "Str0ng!Passphrase";

  it("hashes with bcrypt at cost >= 10 and never stores plaintext (AC-05, NFR-01)", async () => {
    const hash = await hashPassword(plainPassword);

    expect(BCRYPT_COST).toBeGreaterThanOrEqual(10);
    expect(hash).not.toBe(plainPassword);
    expect(hash).toMatch(/^\$2[ab]\$10\$/);
    expect(isValidBcryptHash(hash)).toBe(true);
    expect(bcrypt.getRounds(hash)).toBeGreaterThanOrEqual(10);
  });

  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword(plainPassword);

    await expect(verifyPassword(plainPassword, hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("produces a different hash per call (unique salt)", async () => {
    const [first, second] = await Promise.all([
      hashPassword(plainPassword),
      hashPassword(plainPassword),
    ]);

    expect(first).not.toBe(second);
    await expect(verifyPassword(plainPassword, first)).resolves.toBe(true);
    await expect(verifyPassword(plainPassword, second)).resolves.toBe(true);
  });

  it("rejects malformed hashes", () => {
    expect(isValidBcryptHash(plainPassword)).toBe(false);
    expect(isValidBcryptHash("$2a$08$abcdefghijklmnopqrstuv")).toBe(false);
  });

  it("normalises valid login input", () => {
    const result = validateLoginInput({
      email: "  Organizer1@University.edu ",
      password: "secret",
    });

    expect(result).toEqual({
      email: "organizer1@university.edu",
      password: "secret",
    });
  });

  it("raises VALIDATION_ERROR with per-field details for bad input (AC-02)", () => {
    const cases: Array<[unknown, string[]]> = [
      [{}, ["email", "password"]],
      [{ email: "", password: "" }, ["email", "password"]],
      [{ email: "not-an-email", password: "secret" }, ["email"]],
      [{ email: "user@example.com", password: "" }, ["password"]],
    ];

    for (const [body, expectedFields] of cases) {
      try {
        validateLoginInput(body);
        throw new Error(`Expected validation to fail for ${JSON.stringify(body)}`);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.status).toBe(400);
        expect(apiError.code).toBe("VALIDATION_ERROR");
        expect(Object.keys(apiError.details ?? {}).sort()).toEqual(
          [...expectedFields].sort()
        );
      }
    }
  });

  it("issues unpredictable session tokens with a future expiry", () => {
    const tokens = new Set(
      Array.from({ length: 50 }, () => generateSessionToken())
    );

    expect(tokens.size).toBe(50);
    for (const token of tokens) {
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    }

    expect(getSessionExpiry(new Date()).getTime()).toBeGreaterThan(Date.now());
  });
});
