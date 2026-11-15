import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Navbar from "../src/components/Navbar";
import LoginPage from "../src/pages/LoginPage";
import CreateEventPage from "../src/pages/CreateEventPage";
import OrganizerRosterPage from "../src/pages/OrganizerRosterPage";
import SeatBadge from "../src/components/SeatBadge";
import { AuthProvider } from "../src/auth/AuthContext";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const organizerSession = () =>
  jsonResponse(
    {
      data: {
        user: {
          id: "o-1",
          email: "organizer1@university.edu",
          name: "Dr. Somchai Wattana",
          role: "ORGANIZER",
        },
      },
    },
    200
  );

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TEST-36 [UI-07]: SoftCookie Warm Bakery UI theme and responsive style tokens (AC-19, NFR-05)", () => {
  it("verifies Navbar uses header background #603928 (bg-cookie-cocoa) and warm branding", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(organizerSession());
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/SoftCookie/i)).toBeInTheDocument();
    });

    const header = screen.getByRole("banner");
    expect(header.className).toContain("bg-cookie-cocoa");
  });

  it("verifies required form fields display red asterisk marker (*) (AC-19)", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(jsonResponse({}, 401));
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const asterisks = screen.getAllByText("*");
    expect(asterisks.length).toBeGreaterThanOrEqual(2);
    for (const asterisk of asterisks) {
      expect(asterisk.className).toContain("text-cookie-errorText");
      expect(asterisk).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("verifies primary action buttons use #A85F34 (bg-cookie-caramel) styling", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(jsonResponse({}, 401));
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    expect(submitBtn.className).toContain("bg-cookie-caramel");
  });

  it("verifies read-only system fields use #F0F0F0 (bg-cookie-readonlyBg) in CreateEventPage", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(organizerSession());
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <CreateEventPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/event code/i)).toBeInTheDocument();
    });

    const eventCodeInput = screen.getByLabelText(/event code/i);
    expect(eventCodeInput).toHaveAttribute("readonly");
    expect(eventCodeInput.className).toContain("bg-cookie-readonlyBg");

    const organizerInput = screen.getByLabelText(/organizer/i);
    expect(organizerInput).toHaveAttribute("readonly");
    expect(organizerInput.className).toContain("bg-cookie-readonlyBg");
  });

  it("verifies status badges provide explicit text alongside color coding (non-color-only)", () => {
    const { rerender } = render(
      <SeatBadge remainingSeats={10} capacity={20} />
    );
    expect(screen.getByText(/10 \/ 20 seats available/i)).toBeInTheDocument();

    rerender(<SeatBadge remainingSeats={0} capacity={20} />);
    expect(screen.getByText("Full")).toBeInTheDocument();
  });

  it("verifies OrganizerRosterPage responsive layout uses desktop table and mobile cards (NFR-05)", async () => {
    const rosterData = {
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
        activeRegistrationsCount: 1,
        remainingSeats: 19,
        organizerId: "o-1",
      },
      registrations: [
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
      ],
    };

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) return Promise.resolve(organizerSession());
      if (url.includes("/api/events/e-1/registrations"))
        return Promise.resolve(jsonResponse({ data: rosterData }, 200));
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter initialEntries={["/organizer/events/e-1/registrations"]}>
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

    await waitFor(() => {
      expect(
        screen.getByText("Full-Stack TypeScript & Testing Workshop")
      ).toBeInTheDocument();
    });

    // Desktop table container must have hidden md:block
    const table = screen.getByRole("table");
    const desktopContainer = table.closest("div");
    expect(desktopContainer?.className).toContain("hidden");
    expect(desktopContainer?.className).toContain("md:block");

    // Mobile cards container must have md:hidden
    const mobileList = screen.getByRole("list");
    expect(mobileList.className).toContain("md:hidden");
  });
});
