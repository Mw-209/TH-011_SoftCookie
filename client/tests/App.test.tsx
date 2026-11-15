import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";
import { AuthProvider } from "../src/auth/AuthContext";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const unauthenticated = () =>
  jsonResponse(
    { error: { code: "UNAUTHENTICATED", message: "Authentication is required." } },
    401
  );

const authenticatedAs = (role: "PARTICIPANT" | "ORGANIZER", name: string) =>
  jsonResponse(
    {
      data: {
        user: { id: "u-1", email: "user@university.edu", name, role },
      },
    },
    200
  );

let fetchMock: ReturnType<typeof vi.fn>;

function renderApp(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(unauthenticated());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Application shell routing and SoftCookie navbar (F-01 section 5)", () => {
  it("redirects an unauthenticated visitor from a protected route to /login (AC-03)", async () => {
    renderApp("/");

    expect(
      await screen.findByRole("heading", { name: "Sign In" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
  });

  it("shows participant navigation, name and role badge once authenticated", async () => {
    fetchMock.mockResolvedValue(
      authenticatedAs("PARTICIPANT", "Kittipong Jaidee")
    );

    renderApp("/");

    expect(await screen.findByText("Kittipong Jaidee")).toBeInTheDocument();
    expect(screen.getByText("PARTICIPANT")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Events" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "My Registrations" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create Event" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log Out" })).toBeInTheDocument();
  });

  it("shows organizer navigation instead of participant navigation", async () => {
    fetchMock.mockResolvedValue(
      authenticatedAs("ORGANIZER", "Dr. Somchai Wattana")
    );

    renderApp("/");

    expect(await screen.findByText("Dr. Somchai Wattana")).toBeInTheDocument();
    expect(screen.getByText("ORGANIZER")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Event" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "My Registrations" })
    ).not.toBeInTheDocument();
  });

  it("returns to /login after logging out (AC-04)", async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation((path: string) => {
      if (path === "/api/auth/logout") {
        return Promise.resolve(
          jsonResponse({ data: { message: "Logged out successfully." } }, 200)
        );
      }
      return Promise.resolve(authenticatedAs("PARTICIPANT", "Kittipong Jaidee"));
    });

    renderApp("/");

    await user.click(await screen.findByRole("button", { name: "Log Out" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Sign In" })
      ).toBeInTheDocument();
    });

    expect(
      fetchMock.mock.calls.filter(([path]) => path === "/api/auth/logout")
    ).toHaveLength(1);
  });
});
