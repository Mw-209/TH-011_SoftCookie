import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { SESSION_COOKIE_NAME } from "../lib/session.js";
import { getUserBySessionToken } from "../services/auth.service.js";
import { ApiError } from "../lib/errors.js";

/**
 * Populates req.currentUser from the session cookie, or rejects with 401.
 * BR-04: identity is derived server-side only.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (typeof token !== "string" || token.length === 0) {
    next(ApiError.unauthenticated());
    return;
  }

  try {
    const user = await getUserBySessionToken(token);
    if (!user) {
      next(ApiError.unauthenticated());
      return;
    }

    req.currentUser = user;
    req.sessionToken = token;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Restricts a route to the given roles. Must run after requireAuth.
 * BR-05: wrong role yields 403 FORBIDDEN_ROLE.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.currentUser) {
      next(ApiError.unauthenticated());
      return;
    }

    if (!allowedRoles.includes(req.currentUser.role)) {
      next(ApiError.forbiddenRole());
      return;
    }

    next();
  };
}
