import { Prisma, SkillCategory, type Event } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { ApiError } from "../lib/errors.js";

/** BR-01 bounds. Kept here so the validator and its tests share one source. */
export const EVENT_LIMITS = {
  title: { min: 5, max: 120 },
  description: { min: 10, max: 2000 },
  location: { min: 3, max: 150 },
  skillHours: { min: 1, max: 40 },
  capacity: { min: 1, max: 1000 },
} as const;

const SKILL_CATEGORIES = Object.values(SkillCategory) as string[];

export interface ValidatedEventInput {
  title: string;
  description: string;
  skillCategory: SkillCategory;
  skillHours: number;
  location: string;
  startAt: Date;
  endAt: Date;
  registrationDeadline: Date;
  capacity: number;
}

/** Event as the API exposes it, with the server-computed seat figures. */
export interface PublicEvent {
  id: string;
  eventCode: string;
  title: string;
  description: string;
  skillCategory: SkillCategory;
  skillHours: number;
  location: string;
  startAt: string;
  endAt: string;
  registrationDeadline: string;
  capacity: number;
  activeRegistrationsCount: number;
  remainingSeats: number;
  organizerId: string;
  organizerName: string;
}

/** Official code format from BR-01: EVT-YYYY-NNNN. */
export function formatEventCode(year: number, sequence: number): string {
  return `EVT-${year}-${String(sequence).padStart(4, "0")}`;
}

function readTrimmedString(
  raw: Record<string, unknown>,
  field: keyof typeof EVENT_LIMITS,
  label: string,
  details: Record<string, string>
): string {
  const value = typeof raw[field] === "string" ? (raw[field] as string).trim() : "";
  const { min, max } = EVENT_LIMITS[field];

  if (!value) {
    details[field] = `${label} is required.`;
    return value;
  }

  if (value.length < min || value.length > max) {
    details[field] = `${label} must be between ${min} and ${max} characters.`;
  }

  return value;
}

function readInteger(
  raw: Record<string, unknown>,
  field: "skillHours" | "capacity",
  label: string,
  details: Record<string, string>
): number {
  const value = raw[field];
  const { min, max } = EVENT_LIMITS[field];

  if (value === undefined || value === null || value === "") {
    details[field] = `${label} is required.`;
    return Number.NaN;
  }

  // A numeric string is rejected on purpose: the contract types these as
  // integers, and silently coercing would hide client bugs.
  if (typeof value !== "number" || !Number.isInteger(value)) {
    details[field] = `${label} must be a whole number.`;
    return Number.NaN;
  }

  if (value < min || value > max) {
    details[field] = `${label} must be between ${min} and ${max}.`;
  }

  return value;
}

function readDate(
  raw: Record<string, unknown>,
  field: "startAt" | "endAt" | "registrationDeadline",
  label: string,
  details: Record<string, string>
): Date | null {
  const value = raw[field];

  if (typeof value !== "string" || value.trim() === "") {
    if (!(value instanceof Date)) {
      details[field] = `${label} is required.`;
      return null;
    }
  }

  const parsed = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(parsed.getTime())) {
    details[field] = `${label} must be a valid date and time.`;
    return null;
  }

  return parsed;
}

/**
 * Validates and normalises a create-event payload against BR-01.
 * Every problem is reported at once so the form can mark all bad fields.
 * Client-supplied id/eventCode/organizerId are ignored (BR-01, BR-04).
 */
export function validateEventInput(body: unknown): ValidatedEventInput {
  const raw = (body ?? {}) as Record<string, unknown>;
  const details: Record<string, string> = {};

  const title = readTrimmedString(raw, "title", "Event title", details);
  const description = readTrimmedString(
    raw,
    "description",
    "Description",
    details
  );
  const location = readTrimmedString(raw, "location", "Location", details);
  const skillHours = readInteger(raw, "skillHours", "Skill hours", details);
  const capacity = readInteger(raw, "capacity", "Capacity", details);

  const skillCategoryRaw = raw.skillCategory;
  if (skillCategoryRaw === undefined || skillCategoryRaw === null || skillCategoryRaw === "") {
    details.skillCategory = "Skill category is required.";
  } else if (
    typeof skillCategoryRaw !== "string" ||
    !SKILL_CATEGORIES.includes(skillCategoryRaw)
  ) {
    details.skillCategory = `Skill category must be one of ${SKILL_CATEGORIES.join(", ")}.`;
  }

  const startAt = readDate(raw, "startAt", "Start date and time", details);
  const endAt = readDate(raw, "endAt", "End date and time", details);
  const registrationDeadline = readDate(
    raw,
    "registrationDeadline",
    "Registration deadline",
    details
  );

  // Cross-field rules only run when both operands parsed, so one bad date
  // does not produce a second misleading message.
  if (startAt && endAt && !details.endAt && endAt.getTime() <= startAt.getTime()) {
    details.endAt = "End date and time must be after the start date and time.";
  }

  if (
    startAt &&
    registrationDeadline &&
    !details.registrationDeadline &&
    registrationDeadline.getTime() > startAt.getTime()
  ) {
    details.registrationDeadline =
      "Registration deadline must be on or before the start date and time.";
  }

  if (Object.keys(details).length > 0) {
    throw ApiError.validation("Please correct the highlighted fields.", details);
  }

  return {
    title,
    description,
    location,
    skillCategory: skillCategoryRaw as SkillCategory,
    skillHours,
    capacity,
    startAt: startAt as Date,
    endAt: endAt as Date,
    registrationDeadline: registrationDeadline as Date,
  };
}

type EventWithCounts = Event & {
  organizer: { name: string };
  _count: { registrations: number };
};

const eventInclude = {
  organizer: { select: { name: true } },
  // BR-02 defines an active registration as REGISTERED or ATTENDED;
  // CANCELLED rows release their seat.
  _count: {
    select: {
      registrations: { where: { status: { in: ["REGISTERED", "ATTENDED"] } } },
    },
  },
} satisfies Prisma.EventInclude;

export function toPublicEvent(event: EventWithCounts): PublicEvent {
  const activeRegistrationsCount = event._count.registrations;

  return {
    id: event.id,
    eventCode: event.eventCode,
    title: event.title,
    description: event.description,
    skillCategory: event.skillCategory,
    skillHours: event.skillHours,
    location: event.location,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    registrationDeadline: event.registrationDeadline.toISOString(),
    capacity: event.capacity,
    activeRegistrationsCount,
    // Clamped so a capacity reduction in Sprint 2 can never report a
    // negative number of seats.
    remainingSeats: Math.max(0, event.capacity - activeRegistrationsCount),
    organizerId: event.organizerId,
    organizerName: event.organizer.name,
  };
}

/** Highest sequence already used for the given year, or 0 when none exist. */
async function highestSequenceForYear(
  tx: Prisma.TransactionClient,
  year: number
): Promise<number> {
  const latest = await tx.event.findFirst({
    where: { eventCode: { startsWith: `EVT-${year}-` } },
    orderBy: { eventCode: "desc" },
    select: { eventCode: true },
  });

  if (!latest) {
    return 0;
  }

  const sequence = Number.parseInt(latest.eventCode.slice(-4), 10);
  return Number.isNaN(sequence) ? 0 : sequence;
}

const MAX_CODE_ATTEMPTS = 5;

/**
 * Creates an event owned by the given organizer, assigning the next
 * EVT-YYYY-NNNN code for the current year.
 *
 * Two organizers publishing at the same moment can derive the same sequence,
 * so a unique-constraint collision on eventCode is retried rather than
 * surfaced. The unique index remains the authority on uniqueness.
 */
export async function createEvent(
  organizerId: string,
  input: ValidatedEventInput
): Promise<PublicEvent> {
  const prisma = getPrisma();
  const year = new Date().getUTCFullYear();

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const sequence = (await highestSequenceForYear(tx, year)) + attempt;

        return tx.event.create({
          data: {
            ...input,
            eventCode: formatEventCode(year, sequence),
            organizerId,
          },
          include: eventInclude,
        });
      });

      return toPublicEvent(created as EventWithCounts);
    } catch (error) {
      const isCodeCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";

      if (!isCodeCollision || attempt === MAX_CODE_ATTEMPTS) {
        throw error;
      }
    }
  }

  // Unreachable: the loop either returns or rethrows on its last attempt.
  throw new ApiError(
    500,
    "INTERNAL_ERROR",
    "Could not allocate an event code. Please try again."
  );
}

/** All events, earliest start first (F-02 7.2). */
export async function listEvents(): Promise<PublicEvent[]> {
  const prisma = getPrisma();
  const events = await prisma.event.findMany({
    orderBy: { startAt: "asc" },
    include: eventInclude,
  });

  return events.map((event) => toPublicEvent(event as EventWithCounts));
}

export async function getEventById(id: string): Promise<PublicEvent> {
  const prisma = getPrisma();
  const event = await prisma.event.findUnique({
    where: { id },
    include: eventInclude,
  });

  if (!event) {
    throw new ApiError(404, "NOT_FOUND", "Event not found.");
  }

  return toPublicEvent(event as EventWithCounts);
}

export interface EventRosterRegistration {
  id: string;
  registrationNumber: string;
  eventId: string;
  status: string;
  registeredAt: string;
  participant: {
    id: string;
    name: string;
    email: string;
  };
}

export interface EventRoster {
  event: {
    id: string;
    eventCode: string;
    title: string;
    skillCategory: SkillCategory;
    skillHours: number;
    location: string;
    startAt: string;
    endAt: string;
    capacity: number;
    activeRegistrationsCount: number;
    remainingSeats: number;
    organizerId: string;
  };
  registrations: EventRosterRegistration[];
}

const ACTIVE_STATUSES = ["REGISTERED", "ATTENDED"] as const;

/**
 * Retrieves the full participant registration roster for an event.
 * Enforces BR-05: only the owning organizer may inspect registrations.
 */
export async function getEventRoster(
  eventId: string,
  organizerId: string
): Promise<EventRoster> {
  const prisma = getPrisma();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: {
        select: { status: true },
      },
    },
  });

  if (!event) {
    throw new ApiError(404, "NOT_FOUND", "Event not found.");
  }

  if (event.organizerId !== organizerId) {
    throw ApiError.forbiddenOwnership();
  }

  const activeRegistrationsCount = event.registrations.filter((r) =>
    (ACTIVE_STATUSES as readonly string[]).includes(r.status)
  ).length;

  const registrations = await prisma.registration.findMany({
    where: { eventId },
    orderBy: { registeredAt: "asc" },
    include: {
      participant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    event: {
      id: event.id,
      eventCode: event.eventCode,
      title: event.title,
      skillCategory: event.skillCategory,
      skillHours: event.skillHours,
      location: event.location,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      capacity: event.capacity,
      activeRegistrationsCount,
      remainingSeats: Math.max(0, event.capacity - activeRegistrationsCount),
      organizerId: event.organizerId,
    },
    registrations: registrations.map((r) => ({
      id: r.id,
      registrationNumber: r.registrationNumber,
      eventId: r.eventId,
      status: r.status,
      registeredAt: r.registeredAt.toISOString(),
      participant: {
        id: r.participant.id,
        name: r.participant.name,
        email: r.participant.email,
      },
    })),
  };
}
