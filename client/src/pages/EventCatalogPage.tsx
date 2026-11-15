import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchEvents,
  SKILL_CATEGORY_LABELS,
  type EventSummary,
} from "../api/events";
import SeatBadge from "../components/SeatBadge";
import ClockIcon from "../components/ClockIcon";
import MapPinIcon from "../components/MapPinIcon";
import DeadlineChip from "../components/DeadlineChip";
import { formatEventDateRange, formatTimeRange } from "../lib/datetime";

export default function EventCatalogPage() {
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchEvents()
      .then((data) => {
        if (active) setEvents(data);
      })
      .catch(() => {
        if (active) {
          setError(
            "We could not load events right now. Please refresh and try again."
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-cookie-cocoa">
        Events
      </h1>
      <p className="mb-8 text-sm text-cookie-cocoa/80">
        Published university skill-building events, sorted by event date —
        soonest first.
      </p>

      {error && (
        <div
          role="alert"
          className="rounded border border-cookie-errorText/30 bg-cookie-errorBg px-4 py-3 text-sm font-medium text-cookie-errorText"
        >
          {error}
        </div>
      )}

      {!error && events === null && (
        <p role="status" className="text-sm text-cookie-cocoa/80">
          Loading events...
        </p>
      )}

      {!error && events?.length === 0 && (
        <div className="rounded-lg border border-cookie-border bg-cookie-surface p-8 text-center shadow-sm">
          <p className="font-medium text-cookie-cocoa">No events yet</p>
          <p className="mt-1 text-sm text-cookie-cocoa/80">
            Published events will appear here once an organizer creates one.
          </p>
        </div>
      )}

      {!error && events && events.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col rounded-lg border border-cookie-border bg-cookie-surface p-5 shadow-sm"
            >
              {/* Primary block: what, when, where, and whether seats are left. */}
              <div className="mb-2 flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-cookie-cocoa">
                  <Link
                    to={`/events/${event.id}`}
                    className="hover:text-cookie-caramel hover:underline"
                  >
                    {event.title}
                  </Link>
                </h2>
                <DeadlineChip
                  registrationDeadline={event.registrationDeadline}
                  className="mt-0.5"
                />
              </div>

              <p className="text-sm font-semibold text-cookie-caramel">
                {formatEventDateRange(event.startAt, event.endAt)}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-cookie-cocoa">
                <ClockIcon className="text-cookie-cocoa/70" />
                {formatTimeRange(event.startAt, event.endAt)}
              </p>

              <p className="mb-4 mt-1 flex items-start gap-1.5 text-sm text-cookie-cocoa/80">
                <MapPinIcon className="mt-0.5 text-cookie-cocoa/60" />
                <span>{event.location}</span>
              </p>

              <div className="mb-4">
                <SeatBadge
                  remainingSeats={event.remainingSeats}
                  capacity={event.capacity}
                />
              </div>

              {/* Secondary block: reference details, kept quiet at the bottom.
                  Organizer and registration deadline live on the detail view. */}
              <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-cookie-border pt-3 text-xs text-cookie-cocoa/70">
                <span className="font-mono">{event.eventCode}</span>
                <span aria-hidden="true">·</span>
                <span>{SKILL_CATEGORY_LABELS[event.skillCategory]}</span>
                <span aria-hidden="true">·</span>
                <span>{event.skillHours} skill hours</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
