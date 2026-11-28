import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EventDetailPage from "../src/pages/EventDetailPage";
import RegistrationPanel from "../src/components/RegistrationPanel";
import { AuthProvider } from "../src/auth/AuthContext";
import type { EventSummary } from "../src/api/events";
import { toDateTimeLocalValue } from "../src/lib/datetime";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ORGANIZER_ID = "o-1";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sessionFor(role: "PARTICIPANT" | "ORGANIZER"): Response {
  return jsonResponse(
    {
      data: {
        user:
          role === "ORGANIZER"
            ? { id: ORGANIZER_ID, email: "organizer1@university.edu", name: "Dr. Somchai Wattana", role }
            : { id: "p-1", email: "student1@university.edu", name: "Kittipong Jaidee", role },
      },
    },
    200
  );
}

/** An event owned by ORGANIZER_ID, open for registration, starting in 10 days. */
function makeEvent(overrides: Partial<EventSummary> = {}): EventSummary {
  const start = new Date(Date.now() + 10 * DAY);
  start.setSeconds(0, 0);
  const deadline = new Date(Date.now() + 5 * DAY);
  deadline.setSeconds(0, 0);

  return {
    id: "e-1",
    eventCode: "EVT-2026-0001",
    title: "Full-Stack TypeScript & Testing Workshop",
    description: "Build and test a full-stack TypeScript application.",
    skillCategory: "TECHNICAL",
    skillHours: 3,
    location: "Engineering Bldg 4, Room 402",
    startAt: start.toISOString(),
    endAt: new Date(start.getTime() + 3 * HOUR).toISOString(),
    registrationDeadline: deadline.toISOString(),
    capacity: 5,
    activeRegistrationsCount: 2,
    remainingSeats: 3,
    organizerId: ORGANIZER_ID,
    organizerName: "Dr. Somchai Wattana",
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Routes the detail page's calls; onPatch decides the PATCH response. */
function renderDetailPage(
  event: EventSummary,
  onPatch: (body: Record<string, unknown>) => Promise<Response>
) {
  fetchMock.mockImplementation((path: string, init?: RequestInit) => {
    if (path === "/api/auth/me") return Promise.resolve(sessionFor("ORGANIZER"));
    if (path === `/api/events/${event.id}` && init?.method === "PATCH") {
      return onPatch(JSON.parse(String(init.body)));
    }
    if (path === `/api/events/${event.id}`) {
      return Promise.resolve(jsonResponse({ data: { event } }, 200));
    }
    return Promise.resolve(jsonResponse({ data: {} }, 200));
  });

  return render(
    <MemoryRouter initialEntries={[`/events/${event.id}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/events/:id" element={<EventDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function patchCalls() {
  return fetchMock.mock.calls.filter(
    ([, init]) => (init as RequestInit | undefined)?.method === "PATCH"
  );
}

describe("TEST-44 [UI-08]: datetime-local conversion (F-05 3.3)", () => {
  it("converts a UTC instant to local wall-clock text and back without shifting it", () => {
    const iso = "2026-12-05T03:00:00.000Z";
    const value = toDateTimeLocalValue(iso);

    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    // Round trip: what the form sends back is the same instant it received.
    expect(new Date(value).toISOString()).toBe(iso);
  });
});

describe("TEST-44 [UI-08]: organizer Edit Capacity & Deadline form (AC-21, AC-22, AC-23)", () => {
  it("pre-fills current values and shows the minimum allowed capacity", async () => {
    const event = makeEvent();
    renderDetailPage(event, () => Promise.reject(new Error("no PATCH expected")));

    const capacity = await screen.findByLabelText("Capacity");
    expect(capacity).toHaveValue(5);
    expect(screen.getByLabelText("Registration Deadline")).toHaveValue(
      toDateTimeLocalValue(event.registrationDeadline)
    );
    expect(screen.getByText("Minimum 2 (seats already taken).")).toBeInTheDocument();
  });

  it("shows inline errors for an out-of-range capacity and sends nothing (AC-23)", async () => {
    const user = userEvent.setup();
    renderDetailPage(makeEvent(), () => Promise.reject(new Error("no PATCH expected")));

    const capacity = await screen.findByLabelText("Capacity");
    await user.clear(capacity);
    await user.type(capacity, "0");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Capacity must be between 1 and 1000.")).toBeInTheDocument();
    expect(capacity).toHaveAttribute("aria-invalid", "true");
    expect(patchCalls()).toHaveLength(0);
  });

  it("rejects a deadline after the event start inline (AC-23, BR-01)", async () => {
    const user = userEvent.setup();
    const event = makeEvent();
    renderDetailPage(event, () => Promise.reject(new Error("no PATCH expected")));

    const deadline = await screen.findByLabelText("Registration Deadline");
    const afterStart = toDateTimeLocalValue(
      new Date(new Date(event.startAt).getTime() + DAY).toISOString()
    );
    await user.clear(deadline);
    await user.type(deadline, afterStart);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(
      await screen.findByText("Registration deadline must be on or before the start date and time.")
    ).toBeInTheDocument();
    expect(patchCalls()).toHaveLength(0);
  });

  it("shows the 409 banner and keeps the typed value when capacity is below active registrations (AC-22)", async () => {
    const user = userEvent.setup();
    renderDetailPage(makeEvent(), () =>
      Promise.resolve(
        jsonResponse(
          {
            error: {
              code: "CAPACITY_BELOW_ACTIVE_COUNT",
              message: "Capacity cannot be lower than the 2 active registration(s) already confirmed.",
            },
          },
          409
        )
      )
    );

    const capacity = await screen.findByLabelText("Capacity");
    await user.clear(capacity);
    await user.type(capacity, "1");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Capacity cannot be lower than the 2 active registration(s) already confirmed."
    );
    expect(capacity).toHaveValue(1);
  });

  it("shows a busy button, sends only the changed field, and refreshes seats on success (AC-21)", async () => {
    const user = userEvent.setup();
    const event = makeEvent();
    let resolvePatch: (response: Response) => void = () => {};

    renderDetailPage(
      event,
      () =>
        new Promise<Response>((resolve) => {
          resolvePatch = resolve;
        })
    );

    const capacity = await screen.findByLabelText("Capacity");
    await user.clear(capacity);
    await user.type(capacity, "8");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    const busy = await screen.findByRole("button", { name: "Saving..." });
    expect(busy).toBeDisabled();
    expect(JSON.parse(String((patchCalls()[0][1] as RequestInit).body))).toEqual({
      capacity: 8,
    });

    resolvePatch(
      jsonResponse(
        { data: { event: { ...event, capacity: 8, remainingSeats: 6 } } },
        200
      )
    );

    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
    expect(screen.getByText("2 registered of 8")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();
  });

  it("does not render the form for a non-owning organizer (BR-05)", async () => {
    renderDetailPage(
      makeEvent({ organizerId: "someone-else" }),
      () => Promise.reject(new Error("no PATCH expected"))
    );

    expect(await screen.findByText("Full-Stack TypeScript & Testing Workshop")).toBeInTheDocument();
    expect(screen.queryByLabelText("Capacity")).not.toBeInTheDocument();
  });
});

describe("TEST-44 [UI-08]: closed registration state in RegistrationPanel (AC-25, BR-06)", () => {
  function renderPanel(event: EventSummary, onRegister?: () => Promise<Response>) {
    fetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/api/auth/me") return Promise.resolve(sessionFor("PARTICIPANT"));
      if (path === "/api/registrations/my") {
        return Promise.resolve(jsonResponse({ data: { registrations: [] } }, 200));
      }
      if (init?.method === "POST" && onRegister) return onRegister();
      return Promise.resolve(jsonResponse({ data: {} }, 200));
    });

    return render(
      <MemoryRouter initialEntries={[`/events/${event.id}`]}>
        <AuthProvider>
          <RegistrationPanel event={event} />
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it("shows the closed badge instead of the Register button once the deadline has passed", async () => {
    renderPanel(
      makeEvent({ registrationDeadline: new Date(Date.now() - HOUR).toISOString() })
    );

    expect(
      await screen.findByText("Registration Closed (Deadline Passed)")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Register for Event" })).not.toBeInTheDocument();
  });

  it("prefers the closed badge over Event Full when both apply", async () => {
    renderPanel(
      makeEvent({
        registrationDeadline: new Date(Date.now() - HOUR).toISOString(),
        activeRegistrationsCount: 5,
        remainingSeats: 0,
      })
    );

    expect(
      await screen.findByText("Registration Closed (Deadline Passed)")
    ).toBeInTheDocument();
    expect(screen.queryByText("Event Full (0 seats left)")).not.toBeInTheDocument();
  });

  it("handles a stale tab: 409 DEADLINE_PASSED shows the error and closes the panel", async () => {
    const user = userEvent.setup();
    renderPanel(makeEvent(), () =>
      Promise.resolve(
        jsonResponse(
          {
            error: {
              code: "DEADLINE_PASSED",
              message: "The registration deadline for this event has passed.",
            },
          },
          409
        )
      )
    );

    await user.click(await screen.findByRole("button", { name: "Register for Event" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The registration deadline for this event has passed."
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Register for Event" })).not.toBeInTheDocument()
    );
    expect(screen.getByText("Registration Closed (Deadline Passed)")).toBeInTheDocument();
  });
});
