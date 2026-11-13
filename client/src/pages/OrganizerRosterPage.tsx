import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiClientError } from "../api/client";
import { fetchEventRoster, type EventRosterData } from "../api/roster";
import { SKILL_CATEGORY_LABELS } from "../api/events";
import { formatDateTime, formatEventDateRange, formatTimeRange } from "../lib/datetime";
import ClockIcon from "../components/ClockIcon";
import MapPinIcon from "../components/MapPinIcon";

function RosterStatusBadge({ status }: { status: string }) {
  const isRegistered = status === "REGISTERED";
  const palette = isRegistered
    ? "bg-cookie-successBg text-cookie-successText"
    : "bg-cookie-readonlyBg text-cookie-cocoa/60";

  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-2.5 py-1 text-xs font-semibold ${palette}`}
    >
      {status}
    </span>
  );
}

export default function OrganizerRosterPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<EventRosterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let active = true;
    setIsLoading(true);
    setIsForbidden(false);
    setError(null);

    fetchEventRoster(id)
      .then((roster) => {
        if (!active) return;
        setData(roster);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        if (
          caught instanceof ApiClientError &&
          (caught.status === 403 ||
            caught.code === "FORBIDDEN_ROLE" ||
            caught.code === "FORBIDDEN_OWNERSHIP")
        ) {
          setIsForbidden(true);
        } else if (caught instanceof ApiClientError && caught.status === 404) {
          setError("This event does not exist or has been removed.");
        } else {
          setError("We could not load the registrations roster right now. Please try again.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if ((user && user.role !== "ORGANIZER") || isForbidden) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <div
          role="alert"
          className="rounded-lg border border-cookie-errorText/30 bg-cookie-errorBg p-6 text-center shadow-sm"
        >
          <h1 className="mb-2 text-xl font-bold text-cookie-errorText">
            403 Access Denied
          </h1>
          <p className="text-sm text-cookie-errorText">
            You do not have permission to view registrations for this event.
          </p>
          <div className="mt-4">
            <Link
              to="/events"
              className="text-sm font-medium text-cookie-caramel hover:underline"
            >
              Back to all events
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-4">
        <Link
          to={`/events/${id}`}
          className="inline-flex items-center text-sm font-medium text-cookie-caramel hover:underline"
        >
          &larr; Back to Event Details
        </Link>
      </div>

      {isLoading && (
        <p role="status" className="text-sm text-cookie-cocoa/80">
          Loading registrations roster...
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="rounded border border-cookie-errorText/30 bg-cookie-errorBg px-4 py-3 text-sm font-medium text-cookie-errorText"
        >
          {error}
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          {/* Event Summary Header Card */}
          <section className="mb-8 rounded-lg border border-cookie-border bg-cookie-surface p-6 shadow-sm sm:p-8">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="text-2xl font-bold text-cookie-cocoa">
                {data.event.title}
              </h1>
              <span className="font-mono text-sm font-semibold text-cookie-cocoa/80">
                {data.event.eventCode}
              </span>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded bg-cookie-readonlyBg px-2.5 py-1 text-xs font-semibold text-cookie-cocoa">
                {SKILL_CATEGORY_LABELS[data.event.skillCategory] ?? data.event.skillCategory}
              </span>
              <span className="rounded bg-cookie-readonlyBg px-2.5 py-1 text-xs font-semibold text-cookie-cocoa">
                {data.event.skillHours} skill hours
              </span>
            </div>

            <dl className="grid gap-4 rounded border border-cookie-border bg-cookie-readonlyBg/40 p-4 text-sm sm:grid-cols-2 md:grid-cols-4">
              <div>
                <dt className="text-xs font-medium text-cookie-cocoa/70">Location</dt>
                <dd className="flex items-center gap-1 font-medium text-cookie-cocoa">
                  <MapPinIcon className="h-4 w-4 text-cookie-cocoa/60" />
                  <span>{data.event.location}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-cookie-cocoa/70">Schedule</dt>
                <dd className="font-medium text-cookie-cocoa">
                  {formatEventDateRange(data.event.startAt, data.event.endAt)}
                  <span className="block text-xs text-cookie-cocoa/70">
                    {formatTimeRange(data.event.startAt, data.event.endAt)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-cookie-cocoa/70">Registered</dt>
                <dd className="font-semibold text-cookie-cocoa">
                  {data.event.activeRegistrationsCount} / {data.event.capacity}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-cookie-cocoa/70">Remaining Seats</dt>
                <dd className="font-semibold text-cookie-cocoa">
                  {data.event.remainingSeats}
                </dd>
              </div>
            </dl>
          </section>

          {/* Participant Roster Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-cookie-cocoa">
                Registered Participants ({data.registrations.length})
              </h2>
            </div>

            {data.registrations.length === 0 ? (
              <div className="rounded-lg border border-cookie-border bg-cookie-surface p-8 text-center shadow-sm">
                <p className="font-medium text-cookie-cocoa">
                  No participants have registered for this event yet.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop View: Table */}
                <div className="hidden overflow-x-auto rounded-lg border border-cookie-border bg-cookie-surface shadow-sm md:block">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">
                      Participant registrations roster
                    </caption>
                    <thead className="border-b border-cookie-border bg-cookie-cream/60 text-xs uppercase tracking-wide text-cookie-cocoa/70">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          Registration No.
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Participant Name
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Email
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Registered Date/Time
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.registrations.map((reg) => (
                        <tr
                          key={reg.id}
                          className="border-b border-cookie-border last:border-0 hover:bg-cookie-cream/30"
                        >
                          <td className="px-4 py-3 font-mono text-xs font-medium text-cookie-cocoa">
                            {reg.registrationNumber}
                          </td>
                          <td className="px-4 py-3 font-medium text-cookie-cocoa">
                            {reg.participant.name}
                          </td>
                          <td className="px-4 py-3 text-cookie-cocoa/80">
                            {reg.participant.email}
                          </td>
                          <td className="px-4 py-3">
                            <RosterStatusBadge status={reg.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-cookie-cocoa/80">
                            {formatDateTime(reg.registeredAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Stacked Cards */}
                <ul className="grid gap-4 md:hidden">
                  {data.registrations.map((reg) => (
                    <li
                      key={reg.id}
                      className="rounded-lg border border-cookie-border bg-cookie-surface p-5 shadow-sm"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span className="font-mono text-xs font-medium text-cookie-cocoa">
                          {reg.registrationNumber}
                        </span>
                        <RosterStatusBadge status={reg.status} />
                      </div>
                      <h3 className="text-base font-semibold text-cookie-cocoa">
                        {reg.participant.name}
                      </h3>
                      <p className="text-sm text-cookie-cocoa/80">
                        {reg.participant.email}
                      </p>
                      <p className="mt-3 border-t border-cookie-border pt-2 text-xs text-cookie-cocoa/70">
                        Registered: {formatDateTime(reg.registeredAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
