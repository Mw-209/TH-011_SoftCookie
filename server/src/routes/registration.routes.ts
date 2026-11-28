import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  cancelRegistration,
  getOwnedRegistration,
  listMyRegistrations,
} from "../services/registration.service.js";

/**
 * Participant-owned registration reads (F-03 7.2) and cancellation (F-06 3.2).
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

// POST /api/registrations/:id/cancel — owner only (F-06 3.2, BR-04, BR-05)
registrationRouter.post(
  "/:id/cancel",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // The body is ignored: identity comes from the session (BR-04).
      const result = await cancelRegistration(req.params.id, req.currentUser!.id);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);
