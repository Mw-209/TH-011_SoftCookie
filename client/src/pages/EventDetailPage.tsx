import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiClientError } from "../api/client";
import {
  fetchEvent,
  SKILL_CATEGORY_LABELS,
  type EventSummary,
} from "../api/events";
import SeatBadge from "../components/SeatBadge";
import ClockIcon from "../components/ClockIcon";
import MapPinIcon from "../components/MapPinIcon";
import DeadlineChip from "../components/DeadlineChip";
import RegistrationPanel from "../components/RegistrationPanel";
import {
  formatDateTime,
  formatEventDateRange,
  formatTimeRange,
  isSameInstant,
} from "../lib/datetime";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Set by /events/new after a successful publish (F-02 section 5).
  const createdCode = (location.state as { createdEventCode?: string } | null)
    ?.createdEventCode;

  useEffect(() => {
    if (!id) return;
    let active = true;

    fetchEvent(id)
      .then((data) => {
        if (active) setEvent(data);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof ApiClientError && caught.status === 404
            ? "This event does not exist or has been removed."
            : "We could not load this event right now. Please try again."
        );
      });

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {createdCode && (
        <div
          role="status"
          className="mb-6 rounded border border-cookie-successText/30 bg-cookie-successBg px-4 py-3 text-sm font-medium text-cookie-successText"
        >
          Event published successfully. Official event code:{" "}
          <span className="font-mono font-bold">{createdCode}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded border border-cookie-errorText/30 bg-cookie-errorBg px-4 py-3 text-sm font-medium text-cookie-errorText"
        >
          {error}
        </div>
      )}

      {!error && !event && (
        <p role="status" className="text-sm text-cookie-cocoa/80">
          Loading event...
        </p>
      )}

      {event && (
        <article className="rounded-lg border border-cookie-border bg-cookie-surface p-6 shadow-sm sm:p-8">
          <div className="mb-3 flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-cookie-cocoa">
              {event.title}
            </h1>
            <DeadlineChip
              registrationDeadline={event.registrationDeadline}
              className="mt-1"
            />
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            <SeatBadge
              remainingSeats={event.remainingSeats}
              capacity={event.capacity}
            />
            <span className="rounded bg-cookie-biscuit/40 px-2.5 py-1 text-xs font-medium text-cookie-cocoa">
              {SKILL_CATEGORY_LABELS[event.skillCategory]}
            </span>
            <span className="rounded bg-cookie-biscuit/40 px-2.5 py-1 text-xs font-medium text-cookie-cocoa">
              {event.skillHours} skill hours
            </span>
          </div>

          {/* When and where, grouped so the schedule reads as one block. */}
          <section className="mb-6 rounded border border-cookie-border bg-cookie-cream/60 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cookie-caramel">
              Date &amp; Time
            </h2>

            <p className="text-lg font-semibold text-cookie-cocoa">
              {formatEventDateRange(event.startAt, event.endAt)}
            </p>
            <p className="mb-4 mt-1 flex items-center gap-1.5 text-sm font-medium text-cookie-cocoa">
              <ClockIcon className="text-cookie-cocoa/70" />
              {formatTimeRange(event.startAt, event.endAt)}
            </p>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium text-cookie-cocoa">Starts</dt>
                <dd className="text-cookie-cocoa/80">
                  {formatDateTime(event.startAt)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-cookie-cocoa">Ends</dt>
                <dd className="text-cookie-cocoa/80">
                  {formatDateTime(event.endAt)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-medium text-cookie-cocoa">Location</dt>
                <dd className="flex items-start gap-1.5 text-cookie-cocoa/80">
                  <MapPinIcon className="mt-0.5 text-cookie-cocoa/60" />
                  <span>{event.location}</span>
                </dd>
              </div>
            </dl>
          </section>

          <RegistrationPanel
            event={event}
            onRegistered={(remainingSeats) =>
              // Reflect the claimed seat without a second fetch; the server
              // already returned the authoritative figure.
              setEvent((current) =>
                current
                  ? {
                      ...current,
                      remainingSeats,
                      activeRegistrationsCount:
                        current.capacity - remainingSeats,
                    }
                  : current
              )
            }
          />

          {user?.role === "ORGANIZER" && event.organizerId === user.id && (
            <div className="mb-6 flex items-center justify-between rounded border border-cookie-border bg-cookie-cream/40 p-4">
              <div>
                <h2 className="text-sm font-semibold text-cookie-cocoa">
                  Organizer Controls
                </h2>
                <p className="text-xs text-cookie-cocoa/70">
                  Inspect participant list and registration details for your event.
                </p>
              </div>
              <Link
                to={`/organizer/events/${event.id}/registrations`}
                className="inline-flex items-center rounded bg-cookie-caramel px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cookie-amber"
              >
                View Registrations Roster
              </Link>
            </div>
          )}

          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-cookie-caramel">
              About this event
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-cookie-cocoa/90">
              {event.description}
            </p>
          </section>

          <dl className="grid gap-4 border-t border-cookie-border pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-cookie-cocoa">Event code</dt>
              <dd className="font-mono text-cookie-cocoa/80">
                {event.eventCode}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-cookie-cocoa">Organizer</dt>
              <dd className="text-cookie-cocoa/80">{event.organizerName}</dd>
            </div>
            <div>
              <dt className="font-medium text-cookie-cocoa">Registration</dt>
              <dd className="text-cookie-cocoa/80">
                {/*
                  A deadline equal to the start time carries no extra
                  information, so say what it means instead of repeating the
                  schedule the viewer just read.
                */}
                {isSameInstant(event.registrationDeadline, event.startAt)
                  ? "Until event starts (or full)"
                  : `Closes ${formatDateTime(event.registrationDeadline)}`}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-cookie-cocoa">Seats</dt>
              <dd className="text-cookie-cocoa/80">
                {event.activeRegistrationsCount} registered of {event.capacity}
              </dd>
            </div>
          </dl>
        </article>
      )}

      <p className="mt-6">
        <Link
          to="/events"
          className="text-sm font-medium text-cookie-caramel hover:underline"
        >
          Back to all events
        </Link>
      </p>
    </main>
  );
}
