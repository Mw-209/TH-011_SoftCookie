import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiClientError } from "../api/client";
import {
  createEvent,
  SKILL_CATEGORIES,
  SKILL_CATEGORY_LABELS,
  type SkillCategory,
} from "../api/events";

type FieldName =
  | "title"
  | "description"
  | "skillCategory"
  | "skillHours"
  | "location"
  | "startAt"
  | "endAt"
  | "registrationDeadline"
  | "capacity";

type FormValues = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

const EMPTY_FORM: FormValues = {
  title: "",
  description: "",
  skillCategory: "TECHNICAL",
  skillHours: "",
  location: "",
  startAt: "",
  endAt: "",
  registrationDeadline: "",
  capacity: "",
};

/** Mirrors the server's BR-01 rules so the form can fail fast. */
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};

  const title = values.title.trim();
  if (!title) errors.title = "Event title is required.";
  else if (title.length < 5 || title.length > 120)
    errors.title = "Event title must be between 5 and 120 characters.";

  const location = values.location.trim();
  if (!location) errors.location = "Location is required.";
  else if (location.length < 3 || location.length > 150)
    errors.location = "Location must be between 3 and 150 characters.";

  const description = values.description.trim();
  if (!description) errors.description = "Description is required.";
  else if (description.length < 10 || description.length > 2000)
    errors.description = "Description must be between 10 and 2000 characters.";

  const skillHours = Number(values.skillHours);
  if (!values.skillHours.trim()) errors.skillHours = "Skill hours is required.";
  else if (!Number.isInteger(skillHours) || skillHours < 1 || skillHours > 40)
    errors.skillHours = "Skill hours must be a whole number between 1 and 40.";

  const capacity = Number(values.capacity);
  if (!values.capacity.trim()) errors.capacity = "Capacity is required.";
  else if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000)
    errors.capacity = "Capacity must be a whole number between 1 and 1000.";

  if (!values.startAt) errors.startAt = "Start date and time is required.";
  if (!values.endAt) errors.endAt = "End date and time is required.";

  // An empty deadline is not an error: it falls back to the start time, meaning
  // "open until the event begins", which BR-01 allows. When the start time is
  // missing too, that field is already flagged and carries the message.
  if (!values.registrationDeadline && !values.startAt) {
    errors.registrationDeadline = "Registration deadline is required.";
  }

  if (values.startAt && values.endAt && !errors.endAt) {
    if (new Date(values.endAt) <= new Date(values.startAt))
      errors.endAt = "End date and time must be after the start date and time.";
  }

  if (
    values.startAt &&
    values.registrationDeadline &&
    !errors.registrationDeadline
  ) {
    if (new Date(values.registrationDeadline) > new Date(values.startAt))
      errors.registrationDeadline =
        "Registration deadline must be on or before the start date and time.";
  }

  return errors;
}

export default function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AC-08: participants must not see the form at all.
  if (user && user.role !== "ORGANIZER") {
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
            Only organizers can create events.
          </p>
        </div>
      </main>
    );
  }

  function setField(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  /**
   * Picking a start time prefills the registration deadline with that same
   * instant, which BR-01 allows (registrationDeadline <= startAt) and which is
   * the common intent: registration closes when the event begins.
   *
   * Only an empty deadline is filled, so a value the organizer chose is never
   * overwritten, and the field stays editable afterwards.
   */
  function handleStartAtChange(value: string) {
    setValues((current) => ({
      ...current,
      startAt: value,
      registrationDeadline: current.registrationDeadline || value,
    }));
    setFieldErrors((current) => ({ ...current, registrationDeadline: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createEvent({
        title: values.title.trim(),
        description: values.description.trim(),
        location: values.location.trim(),
        skillCategory: values.skillCategory as SkillCategory,
        skillHours: Number(values.skillHours),
        capacity: Number(values.capacity),
        // datetime-local yields wall-clock text; send an absolute instant.
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
        // Left blank means "accept registrations until the event starts".
        registrationDeadline: new Date(
          values.registrationDeadline || values.startAt
        ).toISOString(),
      });

      navigate(`/events/${created.id}`, {
        state: { createdEventCode: created.eventCode },
      });
    } catch (error) {
      // AC-07: everything the organizer typed stays on screen.
      if (error instanceof ApiClientError) {
        if (error.details) setFieldErrors(error.details as FieldErrors);
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const editableClass =
    "w-full rounded border border-cookie-inputBorder bg-cookie-surface px-3 py-2 text-cookie-cocoa outline-none focus:border-cookie-caramel focus:ring-2 focus:ring-cookie-biscuit";
  const readOnlyClass =
    "w-full rounded border border-cookie-readonlyBorder bg-cookie-readonlyBg px-3 py-2 text-cookie-cocoa/80";

  function renderError(field: FieldName) {
    if (!fieldErrors[field]) return null;
    return (
      <p
        id={`${field}-error`}
        className="mt-1 text-sm font-medium text-cookie-errorText"
      >
        {fieldErrors[field]}
      </p>
    );
  }

  function fieldProps(field: FieldName) {
    return {
      id: field,
      name: field,
      value: values[field],
      "aria-invalid": Boolean(fieldErrors[field]),
      "aria-describedby": fieldErrors[field] ? `${field}-error` : undefined,
      className: editableClass,
    };
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-cookie-cocoa">
        Create Event
      </h1>
      <p className="mb-8 text-sm text-cookie-cocoa/80">
        Publish a new university skill-building event.
      </p>

      {formError && (
        <div
          role="alert"
          className="mb-6 rounded border border-cookie-errorText/30 bg-cookie-errorBg px-3 py-2 text-sm font-medium text-cookie-errorText"
        >
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="mb-8 rounded border border-cookie-readonlyBorder bg-cookie-readonlyBg p-4">
          <legend className="px-1 text-sm font-semibold text-cookie-cocoa">
            Assigned by the system
          </legend>

          <div className="mb-3">
            <label
              htmlFor="eventCode"
              className="mb-1 block text-sm font-medium text-cookie-cocoa"
            >
              Event Code
            </label>
            <input
              id="eventCode"
              readOnly
              value="Auto-generated on save (EVT-2026-XXXX)"
              className={readOnlyClass}
            />
          </div>

          <div>
            <label
              htmlFor="organizer"
              className="mb-1 block text-sm font-medium text-cookie-cocoa"
            >
              Organizer
            </label>
            <input
              id="organizer"
              readOnly
              value={user ? `${user.name} (${user.email})` : ""}
              className={readOnlyClass}
            />
          </div>
        </fieldset>

        <div className="mb-4">
          <label
            htmlFor="title"
            className="mb-1 block text-sm font-medium text-cookie-cocoa"
          >
            Event Title{" "}
            <span aria-hidden="true" className="text-cookie-errorText">
              *
            </span>
          </label>
          <input
            type="text"
            {...fieldProps("title")}
            onChange={(event) => setField("title", event.target.value)}
          />
          {renderError("title")}
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="skillCategory"
              className="mb-1 block text-sm font-medium text-cookie-cocoa"
            >
              Skill Category{" "}
              <span aria-hidden="true" className="text-cookie-errorText">
                *
              </span>
            </label>
            <select
              {...fieldProps("skillCategory")}
              onChange={(event) => setField("skillCategory", event.target.value)}
            >
              {SKILL_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {SKILL_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
            {renderError("skillCategory")}
          </div>

          <div>
            <label
              htmlFor="skillHours"
              className="mb-1 block text-sm font-medium text-cookie-cocoa"
            >
              Skill Hours{" "}
              <span aria-hidden="true" className="text-cookie-errorText">
                *
              </span>
            </label>
            <input
              type="number"
              min={1}
              max={40}
              {...fieldProps("skillHours")}
              onChange={(event) => setField("skillHours", event.target.value)}
            />
            {renderError("skillHours")}
          </div>
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="capacity"
              className="mb-1 block text-sm font-medium text-cookie-cocoa"
            >
              Capacity (Seats){" "}
              <span aria-hidden="true" className="text-cookie-errorText">
                *
              </span>
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              {...fieldProps("capacity")}
              onChange={(event) => setField("capacity", event.target.value)}
            />
            {renderError("capacity")}
          </div>

          <div>
            <label
              htmlFor="location"
              className="mb-1 block text-sm font-medium text-cookie-cocoa"
            >
              Location{" "}
              <span aria-hidden="true" className="text-cookie-errorText">
                *
              </span>
            </label>
            <input
              type="text"
              {...fieldProps("location")}
              onChange={(event) => setField("location", event.target.value)}
            />
            {renderError("location")}
          </div>
        </div>

        <div className="mb-4">
          <label
            htmlFor="registrationDeadline"
            className="mb-1 block text-sm font-medium text-cookie-cocoa"
          >
            Registration Deadline{" "}
            <span aria-hidden="true" className="text-cookie-errorText">
              *
            </span>
          </label>
          <input
            type="datetime-local"
            {...fieldProps("registrationDeadline")}
            aria-describedby={
              fieldErrors.registrationDeadline
                ? "registrationDeadline-error"
                : "registrationDeadline-hint"
            }
            onChange={(event) =>
              setField("registrationDeadline", event.target.value)
            }
          />
          {renderError("registrationDeadline")}
          {!fieldErrors.registrationDeadline && (
            <p
              id="registrationDeadline-hint"
              className="mt-1 text-xs text-cookie-cocoa/70"
            >
              Optional. Leave it blank to accept registrations until the event
              starts (or until seats run out). Must be on or before the start
              date and time.
            </p>
          )}
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="startAt"
              className="mb-1 block text-sm font-medium text-cookie-cocoa"
            >
              Start Date/Time{" "}
              <span aria-hidden="true" className="text-cookie-errorText">
                *
              </span>
            </label>
            <input
              type="datetime-local"
              {...fieldProps("startAt")}
              onChange={(event) => handleStartAtChange(event.target.value)}
            />
            {renderError("startAt")}
          </div>

          <div>
            <label
              htmlFor="endAt"
              className="mb-1 block text-sm font-medium text-cookie-cocoa"
            >
              End Date/Time{" "}
              <span aria-hidden="true" className="text-cookie-errorText">
                *
              </span>
            </label>
            <input
              type="datetime-local"
              {...fieldProps("endAt")}
              onChange={(event) => setField("endAt", event.target.value)}
            />
            {renderError("endAt")}
          </div>
        </div>

        <div className="mb-8">
          <label
            htmlFor="description"
            className="mb-1 block text-sm font-medium text-cookie-cocoa"
          >
            Description{" "}
            <span aria-hidden="true" className="text-cookie-errorText">
              *
            </span>
          </label>
          <textarea
            rows={5}
            {...fieldProps("description")}
            onChange={(event) => setField("description", event.target.value)}
          />
          {renderError("description")}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-cookie-caramel px-4 py-2.5 font-medium text-white transition-colors hover:bg-cookie-amber disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {isSubmitting ? "Publishing..." : "Publish Event"}
        </button>
      </form>
    </main>
  );
}
