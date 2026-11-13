import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EventCatalogPage from "../src/pages/EventCatalogPage";
import EventDetailPage from "../src/pages/EventDetailPage";
import { AuthProvider } from "../src/auth/AuthContext";
import type { EventSummary } from "../src/api/events";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const session = () =>
  jsonResponse(
    {
      data: {
        user: {
          id: "u-1",
          email: "student1@university.edu",
          name: "Kittipong Jaidee",
          role: "PARTICIPANT",
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
    location: "Engineering Building Room 402",
    startAt: "2026-12-01T09:00:00.000Z",
    endAt: "2026-12-01T12:00:00.000Z",
    registrationDeadline: "2026-11-30T23:59:00.000Z",
    capacity: 20,
    activeRegistrationsCount: 5,
    remainingSeats: 15,
    organizerId: "o-1",
    organizerName: "Dr. Somchai Wattana",
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

function renderCatalog() {
  return render(
    <MemoryRouter initialEntries={["/events"]}>
      <AuthProvider>
        <EventCatalogPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

function renderDetail(id = "e-1") {
  return render(
    <MemoryRouter initialEntries={[`/events/${id}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/events/:id" element={<EventDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(session());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TEST-17 [UI-04]: Event catalog states and seat badges", () => {
  it("shows a loading state while fetching", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));

    renderCatalog();

    expect(screen.getByRole("status")).toHaveTextContent("Loading events...");
  });

  it("renders an empty-catalog message when no events exist", async () => {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/events"
          ? jsonResponse({ data: { events: [] } }, 200)
          : session()
      )
    );

    renderCatalog();

    expect(await screen.findByText("No events yet")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("shows a safe banner when the API is unreachable", async () => {
    fetchMock.mockImplementation((path: string) =>
      path === "/api/events"
        ? Promise.reject(new TypeError("network down"))
        : Promise.resolve(session())
    );

    renderCatalog();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not load events right now.");
    // A failure must not leak internals to the user.
    expect(alert).not.toHaveTextContent(/network down|TypeError/);
  });

  it("renders a green seat badge while seats remain (AC-09)", async () => {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/events"
          ? jsonResponse({ data: { events: [makeEvent()] } }, 200)
          : session()
      )
    );

    renderCatalog();

    const badge = await screen.findByText("15 / 20 seats available");
    expect(badge).toHaveClass("bg-cookie-successBg");
    expect(badge).toHaveClass("text-cookie-successText");
  });

  it("renders a warm 'Full' badge when no seats remain", async () => {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/events"
          ? jsonResponse(
              {
                data: {
                  events: [
                    makeEvent({
                      capacity: 1,
                      activeRegistrationsCount: 1,
                      remainingSeats: 0,
                    }),
                  ],
                },
              },
              200
            )
          : session()
      )
    );

    renderCatalog();

    const badge = await screen.findByText("Full (0 / 1)");
    expect(badge).toHaveClass("bg-cookie-warningBg");
    expect(badge).toHaveClass("text-cookie-warningText");
  });

  it("lists each event with its code, category, hours and organizer", async () => {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/events"
          ? jsonResponse(
              {
                data: {
                  events: [
                    makeEvent(),
                    makeEvent({
                      id: "e-2",
                      eventCode: "EVT-2026-0002",
                      title: "AI Agent Engineering Hands-On Lab",
                      skillCategory: "DATA_AI",
                      skillHours: 4,
                    }),
                  ],
                },
              },
              200
            )
          : session()
      )
    );

    renderCatalog();

    expect(await screen.findByText("EVT-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("EVT-2026-0002")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("Data & AI")).toBeInTheDocument();
    expect(screen.getByText("3 skill hours")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Full-Stack TypeScript & Testing Workshop" })
    ).toHaveAttribute("href", "/events/e-1");
  });

  it("shows the event date and a 24-hour time range on each card", async () => {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/events"
          ? jsonResponse(
              {
                data: {
                  events: [
                    makeEvent({
                      startAt: "2026-11-19T09:00:00.000Z",
                      endAt: "2026-11-19T12:00:00.000Z",
                    }),
                  ],
                },
              },
              200
            )
          : session()
      )
    );

    renderCatalog();

    expect(await screen.findByText("19 Nov, 2026")).toBeInTheDocument();
    // 24-hour clock, no AM/PM and no seconds.
    const time = screen.getByText(/^\d{2}:\d{2} - \d{2}:\d{2}$/);
    expect(time).toBeInTheDocument();
    expect(time.textContent).not.toMatch(/AM|PM/i);
  });

  it("shows a date range for an event that spans two days", async () => {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/events"
          ? jsonResponse(
              {
                data: {
                  events: [
                    makeEvent({
                      startAt: "2026-11-19T10:00:00.000Z",
                      endAt: "2026-11-20T12:00:00.000Z",
                    }),
                  ],
                },
              },
              200
            )
          : session()
      )
    );

    renderCatalog();

    expect(
      await screen.findByText("19 Nov, 2026 - 20 Nov, 2026")
    ).toBeInTheDocument();
  });

  it("keeps the organizer and the verbose deadline date off the card", async () => {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/events"
          ? jsonResponse({ data: { events: [makeEvent()] } }, 200)
          : session()
      )
    );

    renderCatalog();

    await screen.findByText("EVT-2026-0001");
    // Organizer and the full deadline timestamp belong to the detail view; the
    // card carries only the compact countdown chip.
    expect(screen.queryByText(/Register by/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dr. Somchai Wattana/)).not.toBeInTheDocument();
    expect(screen.getByText(/Closes|Registration closed/)).toBeInTheDocument();
  });
});

describe("TEST-17 [UI-04]: Event detail view", () => {
  it("shows the authoritative seat figures for one event", async () => {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/events/e-1"
          ? jsonResponse({ data: { event: makeEvent() } }, 200)
          : session()
      )
    );

    renderDetail();

    expect(
      await screen.findByRole("heading", {
        name: "Full-Stack TypeScript & Testing Workshop",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("15 / 20 seats available")).toBeInTheDocument();
    expect(screen.getByText("5 registered of 20")).toBeInTheDocument();
    expect(screen.getByText("Dr. Somchai Wattana")).toBeInTheDocument();
  });

  it("explains a 404 without exposing internals", async () => {
    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/events/missing"
          ? jsonResponse(
              { error: { code: "NOT_FOUND", message: "Event not found." } },
              404
            )
          : session()
      )
    );

    renderDetail("missing");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This event does not exist or has been removed."
    );
  });
});
