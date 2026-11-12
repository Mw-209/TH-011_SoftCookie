import { Router, type Request, type Response, type NextFunction } from "express";
import {
  login,
  revokeSession,
  validateLoginInput,
} from "../services/auth.service.js";
import { SESSION_COOKIE_NAME, getSessionTtlMs } from "../lib/session.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

function sessionCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

// POST /api/auth/login — F-01 7.2
authRouter.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = validateLoginInput(req.body);
      const { user, token } = await login(email, password);

      res.cookie(SESSION_COOKIE_NAME, token, {
        ...sessionCookieOptions(),
        maxAge: getSessionTtlMs(),
      });

      res.status(200).json({ data: { user } });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auth/me — F-01 7.3
authRouter.get("/me", requireAuth, (req: Request, res: Response) => {
  res.status(200).json({ data: { user: req.currentUser } });
});

// POST /api/auth/logout — F-01 7.4
authRouter.post(
  "/logout",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.sessionToken) {
        await revokeSession(req.sessionToken);
      }

      res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
      res.status(200).json({ data: { message: "Logged out successfully." } });
    } catch (error) {
      next(error);
    }
  }
);
