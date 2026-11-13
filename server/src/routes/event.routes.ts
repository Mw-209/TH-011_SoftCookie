import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createEvent,
  getEventById,
  listEvents,
  validateEventInput,
} from "../services/event.service.js";
import { registerForEvent } from "../services/registration.service.js";

export const eventRouter = Router();

// Every event endpoint requires a session (F-02 7.1, 7.2).
eventRouter.use(requireAuth);

// POST /api/events — ORGANIZER only (BR-04)
eventRouter.post(
  "/",
  requireRole("ORGANIZER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = validateEventInput(req.body);
      // Ownership comes from the session, never from the payload (BR-04).
      const event = await createEvent(req.currentUser!.id, input);

      res.status(201).json({ data: { event } });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/events — any authenticated user
eventRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ data: { events: await listEvents() } });
  } catch (error) {
    next(error);
  }
});

// GET /api/events/:id — any authenticated user, 404 when unknown
eventRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ data: { event: await getEventById(req.params.id) } });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/events/:id/registrations — PARTICIPANT only (F-03 7.1, BR-04)
eventRouter.post(
  "/:id/registrations",
  requireRole("PARTICIPANT"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // The body is ignored: identity comes from the session, and status is
      // always REGISTERED on creation (BR-04).
      const result = await registerForEvent(req.currentUser!.id, req.params.id);

      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);
