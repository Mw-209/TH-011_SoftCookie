import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiClientError } from "../api/client";
import {
  cancelRegistration,
  fetchMyRegistrations,
  registerForEvent,
  type Registration,
  type RegistrationStatus,
} from "../api/registrations";
import type { EventSummary } from "../api/events";
import { isRegistrationClosed } from "../lib/datetime";

interface RegistrationPanelProps {
  event: EventSummary;
  /**
   * Lets the detail page refresh its seat figures after a registration,
   * re-registration or cancellation, using the server's remainingSeats.
   */
  onSeatsChanged?: (remainingSeats: number) => void;
}

/** The viewer's own row for this event, whatever its status. */
interface OwnRegistration {
  id: string;
  registrationNumber: string;
  status: RegistrationStatus;
}

/**
 * Registration action panel for /events/:id (F-03 section 5, F-05, F-06).
 *
 * Whether the viewer already holds a seat is not part of the F-02 event
 * payload, so it is read from GET /api/registrations/my. That keeps the event
 * contract that shipped with Issue #4 unchanged.
 *
 * The participant's row can be in one of three states, and each decides what
 * the panel offers:
 * - REGISTERED / ATTENDED: the seat is held; a REGISTERED seat can be
 *   cancelled until the deadline (F-06).
 * - CANCELLED: the seat was released; it can be claimed again while the event
 *   is open and has a free seat (F-06, re-registration keeps the same row).
 * - no row: the normal Register action, unless closed (F-05) or full.
 */
export default function RegistrationPanel({
  event,
  onSeatsChanged,
}: RegistrationPanelProps) {
  const { user } = useAuth();
  const [own, setOwn] = useState<OwnRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [justRegistered, setJustRegistered] =
    useState<Registration["registrationNumber"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set when the server answers DEADLINE_PASSED, e.g. from a tab left open
  // across the deadline, so the actions disappear without a reload.
  const [closedByServer, setClosedByServer] = useState(false);

  const isParticipant = user?.role === "PARTICIPANT";

  useEffect(() => {
    if (!isParticipant) {
      setIsLoading(false);
      return;
    }

    let active = true;

    fetchMyRegistrations()
      .then((registrations) => {
        if (!active) return;
        // The (event, participant) pair is unique, so there is at most one row,
        // including a CANCELLED one that can be re-registered (F-06).
        const row = registrations.find(
          (registration) => registration.eventId === event.id
        );
        setOwn(
          row
            ? { id: row.id, registrationNumber: row.registrationNumber, status: row.status }
            : null
        );
      })
      .catch(() => {
        // A failure here only costs the "already registered" hint; the button
        // stays usable and the backend remains the authority.
        if (active) setOwn(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [event.id, isParticipant]);

  function handleFailure(caught: unknown) {
    if (caught instanceof ApiClientError) {
      // EVENT_FULL means another participant claimed the last seat between
      // the page loading and the click; DEADLINE_PASSED means the window
      // closed while the page was open (BR-06).
      setError(caught.message);
      if (caught.code === "DEADLINE_PASSED") setClosedByServer(true);
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  async function handleRegister() {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await registerForEvent(event.id);
      setJustRegistered(result.registration.registrationNumber);
      setOwn({
        id: result.registration.id,
        registrationNumber: result.registration.registrationNumber,
        status: result.registration.status,
      });
      onSeatsChanged?.(result.remainingSeats);
    } catch (caught) {
      handleFailure(caught);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!own) return;
    setError(null);
    setIsCancelling(true);

    try {
      const result = await cancelRegistration(own.id);
      setJustRegistered(null);
      setOwn({ ...own, status: result.registration.status });
      onSeatsChanged?.(result.remainingSeats);
    } catch (caught) {
      handleFailure(caught);
    } finally {
      setIsCancelling(false);
    }
  }

  const holdsSeat = own?.status === "REGISTERED" || own?.status === "ATTENDED";
  const isCancelled = own?.status === "CANCELLED";
  const isFull = event.remainingSeats <= 0;
  // Display order without a seat: closed beats full, because once the
  // deadline has passed a free seat cannot be claimed anyway (F-05 3.3).
  const isClosed =
    closedByServer || isRegistrationClosed(event.registrationDeadline);
  // Shown with the success message too, so a participant who has just
  // registered can cancel without reloading the page.
  const canCancel = own?.status === "REGISTERED" && !isClosed;

  const primaryButton =
    "rounded bg-cookie-caramel px-4 py-2.5 font-medium text-white transition-colors hover:bg-cookie-amber disabled:cursor-not-allowed disabled:opacity-70";
  const warningBadge =
    "inline-block rounded bg-cookie-warningBg px-2.5 py-1 text-xs font-semibold text-cookie-warningText";

  return (
    <section className="mb-6 rounded border border-cookie-readonlyBorder bg-cookie-readonlyBg p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cookie-caramel">
        Registration
      </h2>

      <dl className="mb-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs font-medium text-cookie-cocoa/70">Capacity</dt>
          <dd className="font-semibold text-cookie-cocoa">{event.capacity}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-cookie-cocoa/70">
            Registered
          </dt>
          <dd className="font-semibold text-cookie-cocoa">
            {event.activeRegistrationsCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-cookie-cocoa/70">
            Remaining seats
          </dt>
          <dd className="font-semibold text-cookie-cocoa">
            {event.remainingSeats}
          </dd>
        </div>
      </dl>

      {!isParticipant && (
        <p className="text-sm text-cookie-cocoa/70">
          Only participants can register for events.
        </p>
      )}

      {isParticipant && (
        <>
          {justRegistered && (
            <div
              role="status"
              className="mb-3 rounded border border-cookie-successText/30 bg-cookie-successBg px-3 py-2 text-sm font-medium text-cookie-successText"
            >
              You are registered. Registration number:{" "}
              <span className="font-mono font-bold">{justRegistered}</span>
              <Link
                to="/my-registrations"
                className="ml-2 underline hover:no-underline"
              >
                View in My Registrations
              </Link>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-3 rounded border border-cookie-errorText/30 bg-cookie-errorBg px-3 py-2 text-sm font-medium text-cookie-errorText"
            >
              {error}
            </div>
          )}

          {isLoading && (
            <p role="status" className="text-sm text-cookie-cocoa/70">
              Checking your registration...
            </p>
          )}

          {!isLoading && holdsSeat && !justRegistered && (
            <p className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded bg-cookie-successBg px-2.5 py-1 text-xs font-semibold text-cookie-successText">
                {own?.status}
              </span>
              <span className="font-mono text-cookie-cocoa">
                {own?.registrationNumber}
              </span>
              <Link
                to="/my-registrations"
                className="font-medium text-cookie-caramel underline hover:no-underline"
              >
                View in My Registrations
              </Link>
            </p>
          )}

          {!isLoading && canCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              className="rounded border border-cookie-errorText/40 bg-cookie-surface px-4 py-2 text-sm font-medium text-cookie-errorText transition-colors hover:bg-cookie-errorBg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCancelling ? "Cancelling..." : "Cancel Registration"}
            </button>
          )}

          {!isLoading && isCancelled && (
            <p className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className={warningBadge}>Registration Cancelled</span>
              <span className="font-mono text-cookie-cocoa/70">
                {own?.registrationNumber}
              </span>
            </p>
          )}

          {!isLoading && !holdsSeat && isClosed && (
            <span className={warningBadge}>
              Registration Closed (Deadline Passed)
            </span>
          )}

          {!isLoading && !holdsSeat && !isClosed && isFull && (
            <span className={warningBadge}>Event Full (0 seats left)</span>
          )}

          {!isLoading && !holdsSeat && !isClosed && !isFull && (
            <button
              type="button"
              onClick={handleRegister}
              disabled={isSubmitting}
              className={primaryButton}
            >
              {isSubmitting
                ? "Registering..."
                : isCancelled
                  ? "Re-Register for Event"
                  : "Register for Event"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
