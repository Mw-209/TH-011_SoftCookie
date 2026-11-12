import type { PublicUser } from "../services/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      /** Server-derived identity (BR-04). Never populated from client input. */
      currentUser?: PublicUser;
      /** Raw session token for the current request, when authenticated. */
      sessionToken?: string;
    }
  }
}

export {};
