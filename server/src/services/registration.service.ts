import {
  Prisma,
  RegistrationStatus,
  type Registration,
} from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { ApiError } from "../lib/errors.js";

/**
 * Statuses that occupy a seat (BR-02). CANCELLED releases its seat, which is
 * what makes the Sprint 2 re-registration flow possible.
 */
export const ACTIVE_REGISTRATION_STATUSES = [
  RegistrationStatus.REGISTERED,
  RegistrationStatus.ATTENDED,
] as const;

/** Official number format from FR-04: REG-YYYY-NNNN. */
export function formatRegistrationNumber(
  year: number,
  sequence: number
): string {
  return `REG-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Seats still claimable. Clamped at zero so a capacity reduction (BR-07, in
 * Sprint 2) can never show a negative figure.
 */
export function calculateRemainingSeats(
  capacity: number,
  activeCount: number
): number {
  return Math.max(0, capacity - activeCount);
}

export interface EligibilityInput {
  capacity: number;
  activeCount: number;
  /** Status of this participant's existing row for the event, if any. */
  existingStatus: RegistrationStatus | "REGISTERED" | "ATTENDED" | "CANCELLED" | null;
}

/**
 * Pure evaluation of BR-02 and BR-03. Kept free of database access so the
 * boundary cases are unit-testable, and called inside the locked transaction
 * where the counts are trustworthy.
 */
export function assertRegistrationEligible({
  capacity,
  activeCount,
  existingStatus,
}: EligibilityInput): void {
  // Checked first: a participant who already holds a seat is not competing for
  // one, so answering EVENT_FULL would misdescribe their situation.
  if (
    existingStatus !== null &&
    (ACTIVE_REGISTRATION_STATUSES as readonly string[]).includes(existingStatus)
  ) {
    throw ApiError.duplicateRegistration();
  }

  if (activeCount >= capacity) {
    throw ApiError.eventFull();
  }
}

export interface PublicRegistration {
  id: string;
  registrationNumber: string;
  eventId: string;
  participantId: string;
  status: RegistrationStatus;
  registeredAt: string;
}

export function toPublicRegistration(
  registration: Registration
): PublicRegistration {
  return {
    id: registration.id,
    registrationNumber: registration.registrationNumber,
    eventId: registration.eventId,
    participantId: registration.participantId,
    status: registration.status,
    registeredAt: registration.registeredAt.toISOString(),
  };
}

/** A registration joined with the event details My Registrations displays. */
export interface RegistrationWithEvent extends PublicRegistration {
  event: {
    id: string;
    eventCode: string;
    title: string;
    skillCategory: string;
    skillHours: number;
    location: string;
    startAt: string;
    endAt: string;
  };
}

const registrationWithEventInclude = {
  event: {
    select: {
      id: true,
      eventCode: true,
      title: true,
      skillCategory: true,
      skillHours: true,
      location: true,
      startAt: true,
      endAt: true,
    },
  },
} satisfies Prisma.RegistrationInclude;

type RegistrationRow = Registration & {
  event: {
    id: string;
    eventCode: string;
    title: string;
    skillCategory: string;
    skillHours: number;
    location: string;
    startAt: Date;
    endAt: Date;
  };
};

function toRegistrationWithEvent(row: RegistrationRow): RegistrationWithEvent {
  return {
    ...toPublicRegistration(row),
    event: {
      ...row.event,
      startAt: row.event.startAt.toISOString(),
      endAt: row.event.endAt.toISOString(),
    },
  };
}

/** Highest sequence already issued for the given year, or 0 when none exist. */
async function highestSequenceForYear(
  tx: Prisma.TransactionClient,
  year: number
): Promise<number> {
  const latest = await tx.registration.findFirst({
    where: { registrationNumber: { startsWith: `REG-${year}-` } },
    orderBy: { registrationNumber: "desc" },
    select: { registrationNumber: true },
  });

  if (!latest) {
    return 0;
  }

  const sequence = Number.parseInt(latest.registrationNumber.slice(-4), 10);
  return Number.isNaN(sequence) ? 0 : sequence;
}

const MAX_NUMBER_ATTEMPTS = 5;

export interface RegistrationResult {
  registration: PublicRegistration;
  remainingSeats: number;
}

/**
 * Claims a seat for the participant.
 *
 * The event row is locked with SELECT ... FOR UPDATE before the active seats
 * are counted (SDS decision DB-02). Without the lock, two requests for the last
 * seat both read "one seat free" and both insert, overbooking the event and
 * breaking BR-02. With it, the second transaction waits, then re-counts and is
 * rejected with EVENT_FULL.
 *
 * Locking the parent event also keeps contention scoped to that one event:
 * registrations for other events proceed in parallel.
 */
export async function registerForEvent(
  participantId: string,
  eventId: string
): Promise<RegistrationResult> {
  const prisma = getPrisma();
  const year = new Date().getUTCFullYear();

  for (let attempt = 1; attempt <= MAX_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Prisma has no API for row locks, so this one statement is raw SQL.
        // No ::uuid cast: Prisma maps String @id to a text column, and casting
        // the parameter makes Postgres reject the comparison as text = uuid.
        const locked = await tx.$queryRaw<Array<{ id: string; capacity: number }>>`
          SELECT id, capacity FROM events WHERE id = ${eventId} FOR UPDATE
        `;

        if (locked.length === 0) {
          throw ApiError.notFound("Event");
        }

        const { capacity } = locked[0];

        const [activeCount, existing] = await Promise.all([
          tx.registration.count({
            where: {
              eventId,
              status: { in: [...ACTIVE_REGISTRATION_STATUSES] },
            },
          }),
          tx.registration.findUnique({
            where: { eventId_participantId: { eventId, participantId } },
            select: { status: true },
          }),
        ]);

        assertRegistrationEligible({
          capacity: Number(capacity),
          activeCount,
          existingStatus: existing?.status ?? null,
        });

        const sequence = (await highestSequenceForYear(tx, year)) + attempt;

        const created = await tx.registration.create({
          data: {
            registrationNumber: formatRegistrationNumber(year, sequence),
            eventId,
            // Ownership is server-derived (BR-04).
            participantId,
            status: RegistrationStatus.REGISTERED,
          },
        });

        return {
          registration: toPublicRegistration(created),
          remainingSeats: calculateRemainingSeats(
            Number(capacity),
            activeCount + 1
          ),
        };
      });
    } catch (error) {
      if (!isRetryableNumberCollision(error) || attempt === MAX_NUMBER_ATTEMPTS) {
        throw error;
      }
    }
  }

  // Unreachable: the loop either returns or rethrows on its last attempt.
  throw new ApiError(
    500,
    "INTERNAL_ERROR",
    "Could not allocate a registration number. Please try again."
  );
}

/**
 * True only for a collision on registrationNumber. The composite unique on
 * (eventId, participantId) must surface as DUPLICATE_REGISTRATION instead of
 * being retried, so the two cases are told apart by target.
 */
function isRetryableNumberCollision(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target.join(",") : String(target ?? "");
  return fields.includes("registrationNumber");
}

/** The authenticated participant's own registrations, newest first (FR-05). */
export async function listMyRegistrations(
  participantId: string
): Promise<RegistrationWithEvent[]> {
  const prisma = getPrisma();
  const rows = await prisma.registration.findMany({
    where: { participantId },
    orderBy: { registeredAt: "desc" },
    include: registrationWithEventInclude,
  });

  return rows.map((row) => toRegistrationWithEvent(row as RegistrationRow));
}

/**
 * A single registration, readable only by its owner (BR-05).
 *
 * A record owned by someone else answers 403 rather than 404: the id was found,
 * and access is what was refused.
 */
export async function getOwnedRegistration(
  id: string,
  participantId: string
): Promise<RegistrationWithEvent> {
  const prisma = getPrisma();
  const row = await prisma.registration.findUnique({
    where: { id },
    include: registrationWithEventInclude,
  });

  if (!row) {
    throw ApiError.notFound("Registration");
  }

  if (row.participantId !== participantId) {
    throw ApiError.forbiddenOwnership();
  }

  return toRegistrationWithEvent(row as RegistrationRow);
}
