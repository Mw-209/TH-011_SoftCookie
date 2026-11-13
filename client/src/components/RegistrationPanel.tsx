import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiClientError } from "../api/client";
import {
  fetchMyRegistrations,
  registerForEvent,
  type Registration,
} from "../api/registrations";
import type { EventSummary } from "../api/events";

interface RegistrationPanelProps {
  event: EventSummary;
  /** Lets the detail page refresh its seat figures after a successful claim. */
  onRegistered?: (remainingSeats: number) => void;
}

/**
 * Registration action panel for /events/:id (F-03 section 5).
 *
 * Whether the viewer already holds a seat is not part of the F-02 event
 * payload, so it is read from GET /api/registrations/my. That keeps the event
 * contract that shipped with Issue #4 unchanged.
 */
export default function RegistrationPanel({
  event,
  onRegistered,
}: RegistrationPanelProps) {
  const { user } = useAuth();
  const [existing, setExisting] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justRegistered, setJustRegistered] =
    useState<Registration["registrationNumber"] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setExisting(
          registrations.find(
            (registration) =>
              registration.eventId === event.id &&
              registration.status !== "CANCELLED"
          ) ?? null
        );
      })
      .catch(() => {
        // A failure here only costs the "already registered" hint; the button
        // stays usable and the backend remains the authority.
        if (active) setExisting(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [event.id, isParticipant]);

  async function handleRegister() {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await registerForEvent(event.id);
      setJustRegistered(result.registration.registrationNumber);
      setExisting({ ...result.registration, event } as unknown as Registration);
      onRegistered?.(result.remainingSeats);
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        // EVENT_FULL here means another participant claimed the last seat
        // between the page loading and the click.
        setError(caught.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const registrationNumber =
    justRegistered ?? existing?.registrationNumber ?? null;
  const isFull = event.remainingSeats <= 0;

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

          {!isLoading && registrationNumber && !justRegistered && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded bg-cookie-successBg px-2.5 py-1 text-xs font-semibold text-cookie-successText">
                REGISTERED
              </span>
              <span className="font-mono text-cookie-cocoa">
                {registrationNumber}
              </span>
              <Link
                to="/my-registrations"
                className="font-medium text-cookie-caramel underline hover:no-underline"
              >
                View in My Registrations
              </Link>
            </p>
          )}

          {!isLoading && !registrationNumber && isFull && (
            <span className="inline-block rounded bg-cookie-warningBg px-2.5 py-1 text-xs font-semibold text-cookie-warningText">
              Event Full (0 seats left)
            </span>
          )}

          {!isLoading && !registrationNumber && !isFull && (
            <button
              type="button"
              onClick={handleRegister}
              disabled={isSubmitting}
              className="rounded bg-cookie-caramel px-4 py-2.5 font-medium text-white transition-colors hover:bg-cookie-amber disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Registering..." : "Register for Event"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
