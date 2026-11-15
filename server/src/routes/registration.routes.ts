import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getOwnedRegistration,
  listMyRegistrations,
} from "../services/registration.service.js";

/**
 * Participant-owned registration reads (F-03 7.2).
 * Mounted at /api/registrations.
 */
export const registrationRouter = Router();

// Registration records belong to participants; organizers inspect rosters
// through the event endpoints instead (F-04).
registrationRouter.use(requireAuth, requireRole("PARTICIPANT"));

// GET /api/registrations/my
registrationRouter.get(
  "/my",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registrations = await listMyRegistrations(req.currentUser!.id);
      res.status(200).json({ data: { registrations } });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/registrations/:id — owner only (BR-05)
registrationRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registration = await getOwnedRegistration(
        req.params.id,
        req.currentUser!.id
      );
      res.status(200).json({ data: { registration } });
    } catch (error) {
      next(error);
    }
  }
);
