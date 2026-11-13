import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OrganizerRosterPage from "../src/pages/OrganizerRosterPage";
import EventDetailPage from "../src/pages/EventDetailPage";
import { AuthProvider } from "../src/auth/AuthContext";
import type { EventRosterData } from "../src/api/roster";
import type { EventSummary } from "../src/api/events";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const organizerSession = (id = "o-1") =>
  jsonResponse(
    {
      data: {
        user: {
          id,
          email: "organizer1@university.edu",
          name: "Dr. Somchai Wattana",
          role: "ORGANIZER",
        },
      },
    },
    200
  );

const participantSession = () =>
  jsonResponse(
    {
      data: {
        user: {
          id: "p-1",
          email: "student1@university.edu",
          name: "Kittipong Jaidee",
          role: "PARTICIPANT",
        },
      },
    },
    200
  );

function makeRosterData(
  overrides: Partial<EventRosterData["event"]> = {},
  registrations: EventRosterData["registrations"] = []
): EventRosterData {
  return {
    event: {
      id: "e-1",
      eventCode: "EVT-2026-0001",
      title: "Full-Stack TypeScript & Testing Workshop",
      skillCategory: "TECHNICAL",
      skillHours: 3,
      location: "Engineering Bldg 4, Room 402",
      startAt: "2026-11-19T09:00:00.000Z",
      endAt: "2026-11-19T12:00:00.000Z",
      capacity: 20,
      activeRegistrationsCount: registrations.length,
      remainingSeats: 20 - registrations.length,
      organizerId: "o-1",
      ...overrides,
    },
    registrations,
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

function renderRoster(eventId = "e-1") {
  return render(
    <MemoryRouter initialEntries={[`/organizer/events/${eventId}/registrations`]}>
      <AuthProvider>
        <Routes>
          <Route
            path="/organizer/events/:id/registrations"
            element={<OrganizerRosterPage />}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function renderEventDetail(eventId = "e-1") {
  return render(
    <MemoryRouter initialEntries={[`/events/${eventId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/events/:id" element={<EventDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("TEST-35 [UI-06]: Organizer roster component states (AC-16, AC-17, AC-18)", () => {
  it("shows loading state while fetching roster data", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(organizerSession());
      return new Promise(() => {}); // never resolves
    });

    renderRoster("e-1");

    expect(
      screen.getByRole("status", { name: "" }) ||
        screen.getByText(/loading registrations roster/i)
    ).toBeInTheDocument();
  });

  it("renders populated roster with participant details (AC-16)", async () => {
    const rosterData = makeRosterData({}, [
      {
        id: "r-1",
        registrationNumber: "REG-2026-0001",
        eventId: "e-1",
        status: "REGISTERED",
        registeredAt: "2026-11-13T10:30:00.000Z",
        participant: {
          id: "p-1",
          name: "Kittipong Jaidee",
          email: "student1@university.edu",
        },
      },
    ]);

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(organizerSession());
      if (url.includes("/api/events/e-1/registrations"))
        return Promise.resolve(jsonResponse({ data: rosterData }, 200));
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderRoster("e-1");

    // Event summary details
    await waitFor(() => {
      expect(
        screen.getByText("Full-Stack TypeScript & Testing Workshop")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("EVT-2026-0001")).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 20/)).toBeInTheDocument();
    expect(screen.getByText("19")).toBeInTheDocument();
    expect(screen.getByText(/back to event details/i)).toBeInTheDocument();

    // Participant details
    expect(screen.getAllByText("REG-2026-0001").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Kittipong Jaidee").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("student1@university.edu").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("REGISTERED").length).toBeGreaterThanOrEqual(1);
  });

  it("renders empty state message when registrations list is empty (AC-16)", async () => {
    const emptyRoster = makeRosterData({}, []);

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(organizerSession());
      if (url.includes("/api/events/e-1/registrations"))
        return Promise.resolve(jsonResponse({ data: emptyRoster }, 200));
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderRoster("e-1");

    await waitFor(() => {
      expect(
        screen.getByText("No participants have registered for this event yet.")
      ).toBeInTheDocument();
    });

    // Zero registered count
    expect(screen.getByText(/0 \/ 20/)).toBeInTheDocument();
  });

  it("renders 403 Access Denied card when backend returns FORBIDDEN_OWNERSHIP (AC-17)", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me"))
        return Promise.resolve(organizerSession("o-2")); // Non-owning organizer
      if (url.includes("/api/events/e-1/registrations"))
        return Promise.resolve(
          jsonResponse(
            {
              error: {
                code: "FORBIDDEN_OWNERSHIP",
                message: "You do not own this event.",
              },
            },
            403
          )
        );
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderRoster("e-1");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByText("403 Access Denied")).toBeInTheDocument();
    expect(
      screen.getByText(/you do not have permission to view registrations/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("REG-2026-0001")).not.toBeInTheDocument();
  });

  it("renders 403 Access Denied card when user is a PARTICIPANT (AC-18)", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(participantSession());
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderRoster("e-1");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByText("403 Access Denied")).toBeInTheDocument();
    expect(screen.queryByText("EVT-2026-0001")).not.toBeInTheDocument();
  });

  it("renders error banner when request fails unexpectedly", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(organizerSession());
      if (url.includes("/api/events/e-1/registrations"))
        return Promise.resolve(
          jsonResponse(
            {
              error: {
                code: "INTERNAL_ERROR",
                message: "Something went wrong.",
              },
            },
            500
          )
        );
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderRoster("e-1");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/we could not load the registrations roster right now/i)
    ).toBeInTheDocument();
  });
});

describe("EventDetailPage: View Registrations Roster action button visibility (F-04 Scope)", () => {
  const dummyEvent: EventSummary = {
    id: "e-1",
    eventCode: "EVT-2026-0001",
    title: "Full-Stack TypeScript & Testing Workshop",
    description: "Hands-on engineering workshop.",
    skillCategory: "TECHNICAL",
    skillHours: 3,
    location: "Engineering Bldg 4, Room 402",
    startAt: "2026-11-19T09:00:00.000Z",
    endAt: "2026-11-19T12:00:00.000Z",
    registrationDeadline: "2026-11-19T09:00:00.000Z",
    capacity: 20,
    activeRegistrationsCount: 2,
    remainingSeats: 18,
    organizerId: "o-1",
    organizerName: "Dr. Somchai Wattana",
  };

  it("displays 'View Registrations Roster' button to the owning organizer", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(organizerSession("o-1"));
      if (url.includes("/api/events/e-1"))
        return Promise.resolve(jsonResponse({ data: { event: dummyEvent } }, 200));
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderEventDetail("e-1");

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /view registrations roster/i })
      ).toBeInTheDocument();
    });

    const rosterLink = screen.getByRole("link", {
      name: /view registrations roster/i,
    });
    expect(rosterLink).toHaveAttribute(
      "href",
      "/organizer/events/e-1/registrations"
    );
  });

  it("hides 'View Registrations Roster' button from non-owning organizer", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(organizerSession("o-2")); // Non-owner
      if (url.includes("/api/events/e-1"))
        return Promise.resolve(jsonResponse({ data: { event: dummyEvent } }, 200));
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderEventDetail("e-1");

    await waitFor(() => {
      expect(screen.getByText(dummyEvent.title)).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("link", { name: /view registrations roster/i })
    ).not.toBeInTheDocument();
  });

  it("hides 'View Registrations Roster' button from participant", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(participantSession());
      if (url.includes("/api/events/e-1"))
        return Promise.resolve(jsonResponse({ data: { event: dummyEvent } }, 200));
      if (url.includes("/api/registrations/my"))
        return Promise.resolve(jsonResponse({ data: { registrations: [] } }, 200));
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderEventDetail("e-1");

    await waitFor(() => {
      expect(screen.getByText(dummyEvent.title)).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("link", { name: /view registrations roster/i })
    ).not.toBeInTheDocument();
  });
});
