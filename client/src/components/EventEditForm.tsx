import { useState, type FormEvent } from "react";
import { ApiClientError } from "../api/client";
import { updateEvent, type EventSummary, type UpdateEventPayload } from "../api/events";
import { toDateTimeLocalValue } from "../lib/datetime";

interface EventEditFormProps {
  event: EventSummary;
  /** Receives the server's updated event so the page can refresh seats and the deadline chip. */
  onUpdated: (event: EventSummary) => void;
}

type FieldName = "capacity" | "registrationDeadline";
type FieldErrors = Partial<Record<FieldName, string>>;

const CAPACITY_MIN = 1;
const CAPACITY_MAX = 1000;

/**
 * "Edit Capacity & Deadline" form for the owning organizer (F-05 3.3).
 *
 * Only changed fields are sent, so an untouched deadline is never re-saved
 * with its seconds truncated by the datetime-local input. Typed values are
 * kept on every error, and the backend stays the authority on BR-07: the
 * minimum shown here is a hint, not a client-side block.
 */
export default function EventEditForm({ event, onUpdated }: EventEditFormProps) {
  const [baseline, setBaseline] = useState(() => ({
    capacity: String(event.capacity),
    registrationDeadline: toDateTimeLocalValue(event.registrationDeadline),
  }));
  const [capacity, setCapacity] = useState(baseline.capacity);
  const [registrationDeadline, setRegistrationDeadline] = useState(
    baseline.registrationDeadline
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const parsedCapacity = Number(capacity);

    if (capacity.trim() === "") {
      errors.capacity = "Capacity is required.";
    } else if (!Number.isInteger(parsedCapacity)) {
      errors.capacity = "Capacity must be a whole number.";
    } else if (parsedCapacity < CAPACITY_MIN || parsedCapacity > CAPACITY_MAX) {
      errors.capacity = `Capacity must be between ${CAPACITY_MIN} and ${CAPACITY_MAX}.`;
    }

    if (registrationDeadline.trim() === "") {
      errors.registrationDeadline = "Registration deadline is required.";
    } else {
      const deadline = new Date(registrationDeadline);
      if (Number.isNaN(deadline.getTime())) {
        errors.registrationDeadline = "Registration deadline must be a valid date and time.";
      } else if (deadline.getTime() > new Date(event.startAt).getTime()) {
        errors.registrationDeadline =
          "Registration deadline must be on or before the start date and time.";
      }
    }

    return errors;
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setFormError(null);
    setStatus(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload: UpdateEventPayload = {};
    if (capacity !== baseline.capacity) {
      payload.capacity = Number(capacity);
    }
    if (registrationDeadline !== baseline.registrationDeadline) {
      // datetime-local yields wall-clock text; send an absolute instant.
      payload.registrationDeadline = new Date(registrationDeadline).toISOString();
    }

    if (Object.keys(payload).length === 0) {
      setStatus("No changes to save.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateEvent(event.id, payload);
      const next = {
        capacity: String(updated.capacity),
        registrationDeadline: toDateTimeLocalValue(updated.registrationDeadline),
      };
      setBaseline(next);
      setCapacity(next.capacity);
      setRegistrationDeadline(next.registrationDeadline);
      setStatus("Changes saved.");
      onUpdated(updated);
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        if (caught.code === "VALIDATION_ERROR" && caught.details) {
          setFieldErrors({
            capacity: caught.details.capacity,
            registrationDeadline: caught.details.registrationDeadline,
          });
        }
        setFormError(caught.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded border border-cookie-inputBorder bg-cookie-surface px-3 py-2 text-cookie-cocoa outline-none focus:border-cookie-caramel focus:ring-2 focus:ring-cookie-biscuit";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="edit-event-heading"
      className="mt-4 border-t border-cookie-border pt-4"
    >
      <h3 id="edit-event-heading" className="mb-3 text-sm font-semibold text-cookie-cocoa">
        Edit Capacity &amp; Deadline
      </h3>

      {formError && (
        <div
          role="alert"
          className="mb-3 rounded border border-cookie-errorText/30 bg-cookie-errorBg px-3 py-2 text-sm font-medium text-cookie-errorText"
        >
          {formError}
        </div>
      )}

      {status && (
        <p role="status" className="mb-3 text-sm font-medium text-cookie-successText">
          {status}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-capacity" className="mb-1 block text-sm font-medium text-cookie-cocoa">
            Capacity
          </label>
          <input
            id="edit-capacity"
            name="capacity"
            type="number"
            inputMode="numeric"
            min={CAPACITY_MIN}
            max={CAPACITY_MAX}
            value={capacity}
            onChange={(change) => setCapacity(change.target.value)}
            aria-invalid={Boolean(fieldErrors.capacity)}
            aria-describedby={fieldErrors.capacity ? "edit-capacity-error" : "edit-capacity-hint"}
            className={inputClass}
          />
          {fieldErrors.capacity ? (
            <p id="edit-capacity-error" className="mt-1 text-sm font-medium text-cookie-errorText">
              {fieldErrors.capacity}
            </p>
          ) : (
            <p id="edit-capacity-hint" className="mt-1 text-xs text-cookie-cocoa/70">
              Minimum {event.activeRegistrationsCount} (seats already taken).
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="edit-registrationDeadline"
            className="mb-1 block text-sm font-medium text-cookie-cocoa"
          >
            Registration Deadline
          </label>
          <input
            id="edit-registrationDeadline"
            name="registrationDeadline"
            type="datetime-local"
            value={registrationDeadline}
            onChange={(change) => setRegistrationDeadline(change.target.value)}
            aria-invalid={Boolean(fieldErrors.registrationDeadline)}
            aria-describedby={
              fieldErrors.registrationDeadline
                ? "edit-registrationDeadline-error"
                : "edit-registrationDeadline-hint"
            }
            className={inputClass}
          />
          {fieldErrors.registrationDeadline ? (
            <p
              id="edit-registrationDeadline-error"
              className="mt-1 text-sm font-medium text-cookie-errorText"
            >
              {fieldErrors.registrationDeadline}
            </p>
          ) : (
            <p id="edit-registrationDeadline-hint" className="mt-1 text-xs text-cookie-cocoa/70">
              On or before the event start. A past time closes registration now.
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="mt-4 rounded bg-cookie-caramel px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cookie-amber disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
