import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelRegistration,
  fetchMyRegistrations,
  type Registration,
} from "../api/registrations";
import { ApiClientError } from "../api/client";
import { SKILL_CATEGORY_LABELS } from "../api/events";
import {
  formatDateTime,
  formatEventDate,
  isRegistrationClosed,
} from "../lib/datetime";

function StatusBadge({ status }: { status: Registration["status"] }) {
  // CANCELLED uses the theme's amber pairing (#FEF3C7 / #9A3412, F-06 3.3).
  const palette =
    status === "CANCELLED"
      ? "bg-cookie-warningBg text-cookie-warningText"
      : "bg-cookie-successBg text-cookie-successText";

  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${palette}`}
    >
      {status}
    </span>
  );
}

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  // Separate from the load error, so a rejected cancel keeps the list visible.
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  /** Cancel is offered only for a held seat while registration is open (F-06). */
  function canCancel(registration: Registration): boolean {
    return (
      registration.status === "REGISTERED" &&
      !isRegistrationClosed(registration.event.registrationDeadline)
    );
  }

  async function handleCancel(registration: Registration) {
    setActionError(null);
    setCancellingId(registration.id);

    try {
      const result = await cancelRegistration(registration.id);
      setRegistrations((current) =>
        current
          ? current.map((row) =>
              row.id === registration.id
                ? {
                    ...row,
                    status: result.registration.status,
                    cancelledAt: result.registration.cancelledAt,
                  }
                : row
            )
          : current
      );
    } catch (caught) {
      // e.g. DEADLINE_PASSED when the deadline passed just before the click.
      setActionError(
        caught instanceof ApiClientError
          ? caught.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setCancellingId(null);
    }
  }

  function renderCancelButton(registration: Registration) {
    if (!canCancel(registration)) return null;
    const busy = cancellingId === registration.id;

    return (
      <button
        type="button"
        onClick={() => handleCancel(registration)}
        disabled={busy}
        className="whitespace-nowrap rounded border border-cookie-errorText/40 bg-cookie-surface px-3 py-1.5 text-xs font-medium text-cookie-errorText transition-colors hover:bg-cookie-errorBg disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? "Cancelling..." : "Cancel Registration"}
      </button>
    );
  }

  useEffect(() => {
    let active = true;

    fetchMyRegistrations()
      .then((data) => {
        if (active) setRegistrations(data);
      })
      .catch(() => {
        if (active) {
          setError(
            "We could not load your registrations right now. Please refresh and try again."
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
        My Registrations
      </h1>
      <p className="mb-8 text-sm text-cookie-cocoa/80">
        Events you have claimed a seat for, most recent first.
      </p>

      {error && (
        <div
          role="alert"
          className="rounded border border-cookie-errorText/30 bg-cookie-errorBg px-4 py-3 text-sm font-medium text-cookie-errorText"
        >
          {error}
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="mb-4 rounded border border-cookie-errorText/30 bg-cookie-errorBg px-4 py-3 text-sm font-medium text-cookie-errorText"
        >
          {actionError}
        </div>
      )}

      {!error && registrations === null && (
        <p role="status" className="text-sm text-cookie-cocoa/80">
          Loading your registrations...
        </p>
      )}

      {!error && registrations?.length === 0 && (
        <div className="rounded-lg border border-cookie-border bg-cookie-surface p-8 text-center shadow-sm">
          <p className="font-medium text-cookie-cocoa">
            You have not registered for any skill-building events yet.
          </p>
          <Link
            to="/events"
            className="mt-4 inline-block rounded bg-cookie-caramel px-4 py-2 font-medium text-white transition-colors hover:bg-cookie-amber"
          >
            Browse Events
          </Link>
        </div>
      )}

      {!error && registrations && registrations.length > 0 && (
        <>
          {/* Desktop: a table, which is what this data is. */}
          <div className="hidden overflow-x-auto rounded-lg border border-cookie-border bg-cookie-surface shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Your event registrations
              </caption>
              <thead className="border-b border-cookie-border bg-cookie-cream/60 text-xs uppercase tracking-wide text-cookie-cocoa/70">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Registration No.
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Event Code
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Event Title
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Hours
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Start Date
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Location
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Registered
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((registration) => (
                  <tr
                    key={registration.id}
                    className="border-b border-cookie-border last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-cookie-cocoa">
                      {registration.registrationNumber}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-cookie-cocoa/80">
                      {registration.event.eventCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-cookie-cocoa">
                      <Link
                        to={`/events/${registration.event.id}`}
                        className="hover:text-cookie-caramel hover:underline"
                      >
                        {registration.event.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-cookie-cocoa/80">
                      {SKILL_CATEGORY_LABELS[registration.event.skillCategory]}
                    </td>
                    <td className="px-4 py-3 text-cookie-cocoa/80">
                      {registration.event.skillHours}
                    </td>
                    <td className="px-4 py-3 text-cookie-cocoa/80">
                      {formatEventDate(registration.event.startAt)}
                    </td>
                    <td className="px-4 py-3 text-cookie-cocoa/80">
                      {registration.event.location}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={registration.status} />
                      {registration.cancelledAt && (
                        <span className="mt-1 block text-xs text-cookie-cocoa/70">
                          Cancelled {formatDateTime(registration.cancelledAt)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cookie-cocoa/80">
                      {formatDateTime(registration.registeredAt)}
                    </td>
                    <td className="px-4 py-3">
                      {renderCancelButton(registration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: the same rows as cards, since a nine-column table cannot
              fit a phone without horizontal scrolling (NFR-05). */}
          <ul className="grid gap-4 md:hidden">
            {registrations.map((registration) => (
              <li
                key={registration.id}
                className="rounded-lg border border-cookie-border bg-cookie-surface p-5 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="font-mono text-xs text-cookie-cocoa/70">
                    {registration.registrationNumber}
                  </span>
                  <StatusBadge status={registration.status} />
                </div>

                <h2 className="mb-2 text-base font-semibold text-cookie-cocoa">
                  <Link
                    to={`/events/${registration.event.id}`}
                    className="hover:text-cookie-caramel hover:underline"
                  >
                    {registration.event.title}
                  </Link>
                </h2>

                <dl className="space-y-1 text-sm text-cookie-cocoa/80">
                  <div>
                    <dt className="inline font-medium">Starts: </dt>
                    <dd className="inline">
                      {formatEventDate(registration.event.startAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Location: </dt>
                    <dd className="inline">{registration.event.location}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Registered: </dt>
                    <dd className="inline">
                      {formatDateTime(registration.registeredAt)}
                    </dd>
                  </div>
                  {registration.cancelledAt && (
                    <div>
                      <dt className="inline font-medium">Cancelled: </dt>
                      <dd className="inline">
                        {formatDateTime(registration.cancelledAt)}
                      </dd>
                    </div>
                  )}
                </dl>

                {canCancel(registration) && (
                  <div className="mt-3">{renderCancelButton(registration)}</div>
                )}

                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-cookie-border pt-3 text-xs text-cookie-cocoa/70">
                  <span className="font-mono">
                    {registration.event.eventCode}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {SKILL_CATEGORY_LABELS[registration.event.skillCategory]}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{registration.event.skillHours} skill hours</span>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
