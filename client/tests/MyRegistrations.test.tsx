import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MyRegistrationsPage from "../src/pages/MyRegistrationsPage";
import RegistrationPanel from "../src/components/RegistrationPanel";
import { AuthProvider } from "../src/auth/AuthContext";
import type { Registration } from "../src/api/registrations";
import type { EventSummary } from "../src/api/events";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const sessionFor = (role: "PARTICIPANT" | "ORGANIZER") =>
  jsonResponse(
    {
      data: {
        user: {
          id: role === "ORGANIZER" ? "o-1" : "p-1",
          email:
            role === "ORGANIZER"
              ? "organizer1@university.edu"
              : "student1@university.edu",
          name: role === "ORGANIZER" ? "Dr. Somchai Wattana" : "Kittipong Jaidee",
          role,
        },
      },
    },
    200
  );

function makeEvent(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id: "e-1",
    eventCode: "EVT-2026-0001",
    title: "Full-Stack TypeScript & Testing Workshop",
    description: "Build and test a full-stack TypeScript application.",
    skillCategory: "TECHNICAL",
    skillHours: 3,
    location: "Engineering Bldg 4, Room 402",
    startAt: "2026-11-19T09:00:00.000Z",
    endAt: "2026-11-19T12:00:00.000Z",
    registrationDeadline: "2026-11-19T09:00:00.000Z",
    capacity: 20,
    activeRegistrationsCount: 5,
    remainingSeats: 15,
    organizerId: "o-1",
    organizerName: "Dr. Somchai Wattana",
    ...overrides,
  };
}

function makeRegistration(overrides: Partial<Registration> = {}): Registration {
  return {
    id: "r-1",
    registrationNumber: "REG-2026-0001",
    eventId: "e-1",
    participantId: "p-1",
    status: "REGISTERED",
    registeredAt: "2026-11-13T10:30:00.000Z",
    event: {
      id: "e-1",
      eventCode: "EVT-2026-0001",
      title: "Full-Stack TypeScript & Testing Workshop",
      skillCategory: "TECHNICAL",
      skillHours: 3,
      location: "Engineering Bldg 4, Room 402",
      startAt: "2026-11-19T09:00:00.000Z",
      endAt: "2026-11-19T12:00:00.000Z",
    },
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(sessionFor("PARTICIPANT"));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderMyRegistrations() {
  return render(
    <MemoryRouter initialEntries={["/my-registrations"]}>
      <AuthProvider>
        <MyRegistrationsPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

function renderPanel(
  event: EventSummary,
  role: "PARTICIPANT" | "ORGANIZER" = "PARTICIPANT"
) {
  return render(
    <MemoryRouter initialEntries={[`/events/${event.id}`]}>
      <AuthProvider>
        <RegistrationPanel event={event} />
      </AuthProvider>
    </MemoryRouter>
  );
}

/** Routes the session and registration-list calls, with a hook for the POST. */
function mockApi(options: {
  role?: "PARTICIPANT" | "ORGANIZER";
  myRegistrations?: Registration[];
  onRegister?: () => Promise<Response>;
}) {
  const { role = "PARTICIPANT", myRegistrations = [], onRegister } = options;

  fetchMock.mockImplementation((path: string, init?: RequestInit) => {
    if (path === "/api/auth/me") return Promise.resolve(sessionFor(role));
    if (path === "/api/registrations/my") {
      return Promise.resolve(
        jsonResponse({ data: { registrations: myRegistrations } }, 200)
      );
    }
    if (init?.method === "POST" && onRegister) return onRegister();
    return Promise.resolve(jsonResponse({ data: {} }, 200));
  });
}

describe("TEST-29 [UI-05]: My Registrations screen", () => {
  it("shows a loading state while fetching", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));

    renderMyRegistrations();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading your registrations..."
    );
  });

  it("shows the empty state with a Browse Events call to action", async () => {
    mockApi({ myRegistrations: [] });

    renderMyRegistrations();

    expect(
      await screen.findByText(
        "You have not registered for any skill-building events yet."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Events" })).toHaveAttribute(
      "href",
      "/events"
    );
  });

  it("shows a safe banner when the API fails", async () => {
    fetchMock.mockImplementation((path: string) =>
      path === "/api/registrations/my"
        ? Promise.reject(new TypeError("network down"))
        : Promise.resolve(sessionFor("PARTICIPANT"))
    );

    renderMyRegistrations();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not load your registrations");
    expect(alert).not.toHaveTextContent(/network down|TypeError/);
  });

  it("lists each registration with its number, event and status", async () => {
    mockApi({
      myRegistrations: [
        makeRegistration(),
        makeRegistration({
          id: "r-2",
          registrationNumber: "REG-2026-0002",
          eventId: "e-2",
          event: {
            ...makeRegistration().event,
            id: "e-2",
            eventCode: "EVT-2026-0002",
            title: "AI Agent Engineering Hands-On Lab",
            skillCategory: "DATA_AI",
            skillHours: 4,
          },
        }),
      ],
    });

    renderMyRegistrations();

    // Rendered twice by design: a table for desktop, cards for phones.
    expect(await screen.findAllByText("REG-2026-0001")).toHaveLength(2);
    expect(screen.getAllByText("REG-2026-0002")).toHaveLength(2);
    expect(screen.getAllByText("REGISTERED")).toHaveLength(4);

    expect(
      screen.getAllByRole("link", {
        name: "Full-Stack TypeScript & Testing Workshop",
      })[0]
    ).toHaveAttribute("href", "/events/e-1");
    expect(screen.getAllByText("Data & AI").length).toBeGreaterThan(0);
  });
});

describe("TEST-29 [UI-05]: Registration panel states", () => {
  it("shows capacity, registered and remaining seats", async () => {
    mockApi({});

    renderPanel(makeEvent());

    expect(await screen.findByText("Capacity")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("offers the register button when a seat is available", async () => {
    mockApi({});

    renderPanel(makeEvent());

    const button = await screen.findByRole("button", {
      name: "Register for Event",
    });
    expect(button).toBeEnabled();
  });

  it("disables the button and shows 'Registering...' while submitting (AC-10)", async () => {
    const user = userEvent.setup({ delay: null });

    let release: (value: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });

    mockApi({ onRegister: () => pending });

    renderPanel(makeEvent());
    await user.click(
      await screen.findByRole("button", { name: "Register for Event" })
    );

    const busy = await screen.findByRole("button", { name: "Registering..." });
    expect(busy).toBeDisabled();

    release(
      jsonResponse(
        {
          data: {
            registration: makeRegistration(),
            remainingSeats: 14,
          },
        },
        201
      )
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Registering..." })
      ).not.toBeInTheDocument();
    });
  });

  it("confirms success with the official registration number", async () => {
    const user = userEvent.setup({ delay: null });

    mockApi({
      onRegister: () =>
        Promise.resolve(
          jsonResponse(
            {
              data: {
                registration: makeRegistration({
                  registrationNumber: "REG-2026-0007",
                }),
                remainingSeats: 14,
              },
            },
            201
          )
        ),
    });

    renderPanel(makeEvent());
    await user.click(
      await screen.findByRole("button", { name: "Register for Event" })
    );

    const confirmation = await screen.findByRole("status");
    expect(confirmation).toHaveTextContent("You are registered");
    expect(confirmation).toHaveTextContent("REG-2026-0007");
    expect(
      screen.getByRole("link", { name: "View in My Registrations" })
    ).toHaveAttribute("href", "/my-registrations");
  });

  it("shows the REGISTERED badge instead of the button when already registered (AC-14)", async () => {
    mockApi({ myRegistrations: [makeRegistration()] });

    renderPanel(makeEvent());

    expect(await screen.findByText("REGISTERED")).toBeInTheDocument();
    expect(screen.getByText("REG-2026-0001")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Register for Event" })
    ).not.toBeInTheDocument();
  });

  it("shows the full badge and no button when no seats remain", async () => {
    mockApi({});

    renderPanel(
      makeEvent({ capacity: 1, activeRegistrationsCount: 1, remainingSeats: 0 })
    );

    expect(
      await screen.findByText("Event Full (0 seats left)")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Register for Event" })
    ).not.toBeInTheDocument();
  });

  it("surfaces a 409 when another participant takes the last seat first (AC-12)", async () => {
    const user = userEvent.setup({ delay: null });

    mockApi({
      onRegister: () =>
        Promise.resolve(
          jsonResponse(
            {
              error: {
                code: "EVENT_FULL",
                message: "This event is full. No seats remain.",
              },
            },
            409
          )
        ),
    });

    renderPanel(makeEvent({ remainingSeats: 1 }));
    await user.click(
      await screen.findByRole("button", { name: "Register for Event" })
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("This event is full.");
    // The button returns so the participant can retry if a seat frees up.
    expect(
      screen.getByRole("button", { name: "Register for Event" })
    ).toBeEnabled();
  });

  it("surfaces a duplicate registration conflict (AC-11)", async () => {
    const user = userEvent.setup({ delay: null });

    mockApi({
      onRegister: () =>
        Promise.resolve(
          jsonResponse(
            {
              error: {
                code: "DUPLICATE_REGISTRATION",
                message: "You are already registered for this event.",
              },
            },
            409
          )
        ),
    });

    renderPanel(makeEvent());
    await user.click(
      await screen.findByRole("button", { name: "Register for Event" })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You are already registered for this event."
    );
  });

  it("offers no registration action to an organizer (AC-13)", async () => {
    mockApi({ role: "ORGANIZER" });

    renderPanel(makeEvent(), "ORGANIZER");

    expect(
      await screen.findByText("Only participants can register for events.")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Register for Event" })
    ).not.toBeInTheDocument();
  });
});
