import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MyRegistrationsPage from "../src/pages/MyRegistrationsPage";
import RegistrationPanel from "../src/components/RegistrationPanel";
import { AuthProvider } from "../src/auth/AuthContext";
import type { Registration } from "../src/api/registrations";
import type { EventSummary } from "../src/api/events";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const OPEN_START = new Date(Date.now() + 7 * DAY).toISOString();
const OPEN_END = new Date(Date.now() + 7 * DAY + 3 * HOUR).toISOString();
const PAST = new Date(Date.now() - HOUR).toISOString();
const CANCELLED_AT = "2026-11-28T09:15:00.000Z";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function participantSession(): Response {
  return jsonResponse(
    {
      data: {
        user: { id: "p-1", email: "student1@university.edu", name: "Kittipong Jaidee", role: "PARTICIPANT" },
      },
    },
    200
  );
}

function makeEvent(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id: "e-1",
    eventCode: "EVT-2026-0001",
    title: "Full-Stack TypeScript & Testing Workshop",
    description: "Build and test a full-stack TypeScript application.",
    skillCategory: "TECHNICAL",
    skillHours: 3,
    location: "Engineering Bldg 4, Room 402",
    startAt: OPEN_START,
    endAt: OPEN_END,
    registrationDeadline: OPEN_START,
    capacity: 5,
    activeRegistrationsCount: 2,
    remainingSeats: 3,
    organizerId: "o-1",
    organizerName: "Dr. Somchai Wattana",
    ...overrides,
  };
}

function makeRegistration(
  overrides: Partial<Registration> = {},
  eventOverrides: Partial<Registration["event"]> = {}
): Registration {
  return {
    id: "r-1",
    registrationNumber: "REG-2026-0001",
    eventId: "e-1",
    participantId: "p-1",
    status: "REGISTERED",
    registeredAt: "2026-11-13T10:30:00.000Z",
    cancelledAt: null,
    checkedInAt: null,
    event: {
      id: "e-1",
      eventCode: "EVT-2026-0001",
      title: "Full-Stack TypeScript & Testing Workshop",
      skillCategory: "TECHNICAL",
      skillHours: 3,
      location: "Engineering Bldg 4, Room 402",
      startAt: OPEN_START,
      endAt: OPEN_END,
      registrationDeadline: OPEN_START,
      ...eventOverrides,
    },
    ...overrides,
  };
}

/** The cancel endpoint's success body for registration r-1. */
function cancelled(remainingSeats: number): Response {
  const { event: _event, ...row } = makeRegistration({
    status: "CANCELLED",
    cancelledAt: CANCELLED_AT,
  });
  return jsonResponse({ data: { registration: row, remainingSeats } }, 200);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Routes the session and list calls; handlers decide the POST responses. */
function mockApi(options: {
  myRegistrations: Registration[];
  onCancel?: () => Promise<Response>;
  onRegister?: () => Promise<Response>;
}) {
  fetchMock.mockImplementation((path: string, init?: RequestInit) => {
    if (path === "/api/auth/me") return Promise.resolve(participantSession());
    if (path === "/api/registrations/my") {
      return Promise.resolve(
        jsonResponse({ data: { registrations: options.myRegistrations } }, 200)
      );
    }
    if (init?.method === "POST" && path.endsWith("/cancel") && options.onCancel) {
      return options.onCancel();
    }
    if (init?.method === "POST" && path.endsWith("/registrations") && options.onRegister) {
      return options.onRegister();
    }
    return Promise.resolve(jsonResponse({ data: {} }, 200));
  });
}

function renderMyRegistrations() {
  return render(
    <MemoryRouter initialEntries={["/my-registrations"]}>
      <AuthProvider>
        <MyRegistrationsPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

function renderPanel(event: EventSummary, onSeatsChanged = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[`/events/${event.id}`]}>
      <AuthProvider>
        <RegistrationPanel event={event} onSeatsChanged={onSeatsChanged} />
      </AuthProvider>
    </MemoryRouter>
  );
  return onSeatsChanged;
}

function cancelPosts() {
  return fetchMock.mock.calls.filter(
    ([path, init]) =>
      String(path).endsWith("/cancel") && (init as RequestInit | undefined)?.method === "POST"
  );
}

describe("TEST-51 [UI-09]: cancelling on /my-registrations (AC-26)", () => {
  it("cancels a REGISTERED row: busy state, then a CANCELLED badge with its timestamp and no button", async () => {
    const user = userEvent.setup();
    let resolveCancel: (response: Response) => void = () => {};
    mockApi({
      myRegistrations: [makeRegistration()],
      onCancel: () =>
        new Promise<Response>((resolve) => {
          resolveCancel = resolve;
        }),
    });
    renderMyRegistrations();

    // The table and the mobile cards both render in jsdom, so each control
    // appears twice; acting on the first is enough.
    const [cancel] = await screen.findAllByRole("button", { name: "Cancel Registration" });
    await user.click(cancel);

    const busy = await screen.findAllByRole("button", { name: "Cancelling..." });
    expect(busy[0]).toBeDisabled();
    expect(cancelPosts()).toHaveLength(1);
    expect(String(cancelPosts()[0][0])).toBe("/api/registrations/r-1/cancel");

    resolveCancel(cancelled(3));

    expect((await screen.findAllByText("CANCELLED")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cancelled/).length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cancel Registration" })).not.toBeInTheDocument()
    );
  });

  it("offers no Cancel button after the deadline, or for CANCELLED and ATTENDED rows", async () => {
    mockApi({
      myRegistrations: [
        makeRegistration({ id: "r-1" }, { registrationDeadline: PAST }),
        makeRegistration({ id: "r-2", registrationNumber: "REG-2026-0002", status: "CANCELLED", cancelledAt: CANCELLED_AT }),
        makeRegistration({ id: "r-3", registrationNumber: "REG-2026-0003", status: "ATTENDED" }),
      ],
    });
    renderMyRegistrations();

    expect((await screen.findAllByText("REG-2026-0003")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Cancel Registration" })).not.toBeInTheDocument();
  });

  it("shows the 409 error banner and keeps the row REGISTERED when cancellation is rejected", async () => {
    const user = userEvent.setup();
    mockApi({
      myRegistrations: [makeRegistration()],
      onCancel: () =>
        Promise.resolve(
          jsonResponse(
            {
              error: {
                code: "DEADLINE_PASSED",
                message:
                  "The registration deadline for this event has passed, so it can no longer be cancelled.",
              },
            },
            409
          )
        ),
    });
    renderMyRegistrations();

    const [cancel] = await screen.findAllByRole("button", { name: "Cancel Registration" });
    await user.click(cancel);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The registration deadline for this event has passed, so it can no longer be cancelled."
    );
    expect(screen.getAllByText("REGISTERED").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Cancel Registration" })[0]).toBeEnabled();
  });
});

describe("TEST-51 [UI-09]: cancel and re-register in RegistrationPanel (AC-26, AC-30)", () => {
  it("cancels a held seat, then shows the cancelled badge, the Re-Register button and the freed seat", async () => {
    const user = userEvent.setup();
    mockApi({ myRegistrations: [makeRegistration()], onCancel: () => Promise.resolve(cancelled(4)) });
    const onSeatsChanged = renderPanel(makeEvent());

    await user.click(await screen.findByRole("button", { name: "Cancel Registration" }));

    expect(await screen.findByText("Registration Cancelled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Re-Register for Event" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Cancel Registration" })).not.toBeInTheDocument();
    expect(onSeatsChanged).toHaveBeenCalledWith(4);
  });

  it("offers Cancel straight after registering, without a reload", async () => {
    const user = userEvent.setup();
    const { event: _event, ...row } = makeRegistration();
    mockApi({
      myRegistrations: [],
      onRegister: () =>
        Promise.resolve(jsonResponse({ data: { registration: row, remainingSeats: 2 } }, 201)),
    });
    renderPanel(makeEvent());

    await user.click(await screen.findByRole("button", { name: "Register for Event" }));

    expect(await screen.findByText(/You are registered/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel Registration" })).toBeEnabled();
  });

  it("re-registers a CANCELLED row while the event is open and has a seat", async () => {
    const user = userEvent.setup();
    const { event: _event, ...row } = makeRegistration();
    mockApi({
      myRegistrations: [makeRegistration({ status: "CANCELLED", cancelledAt: CANCELLED_AT })],
      onRegister: () =>
        Promise.resolve(jsonResponse({ data: { registration: row, remainingSeats: 2 } }, 201)),
    });
    const onSeatsChanged = renderPanel(makeEvent());

    expect(await screen.findByText("Registration Cancelled")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Re-Register for Event" }));

    expect(await screen.findByText(/You are registered/)).toBeInTheDocument();
    expect(screen.queryByText("Registration Cancelled")).not.toBeInTheDocument();
    expect(onSeatsChanged).toHaveBeenCalledWith(2);
  });

  it("does not offer Re-Register for a CANCELLED row when the event is full", async () => {
    mockApi({
      myRegistrations: [makeRegistration({ status: "CANCELLED", cancelledAt: CANCELLED_AT })],
    });
    renderPanel(makeEvent({ activeRegistrationsCount: 5, remainingSeats: 0 }));

    expect(await screen.findByText("Registration Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Event Full (0 seats left)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Re-Register for Event" })).not.toBeInTheDocument();
  });

  it("does not offer Cancel once the deadline has passed", async () => {
    mockApi({ myRegistrations: [makeRegistration()] });
    renderPanel(makeEvent({ registrationDeadline: PAST }));

    expect(await screen.findByText("REGISTERED")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel Registration" })).not.toBeInTheDocument();
  });

  it("shows the server's 409 when a cancellation is rejected", async () => {
    const user = userEvent.setup();
    mockApi({
      myRegistrations: [makeRegistration()],
      onCancel: () =>
        Promise.resolve(
          jsonResponse(
            { error: { code: "INVALID_STATE_TRANSITION", message: "This registration is already cancelled." } },
            409
          )
        ),
    });
    renderPanel(makeEvent());

    await user.click(await screen.findByRole("button", { name: "Cancel Registration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This registration is already cancelled."
    );
  });
});
