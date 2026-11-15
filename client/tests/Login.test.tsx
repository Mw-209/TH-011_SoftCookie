import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../src/pages/LoginPage";
import { AuthProvider } from "../src/auth/AuthContext";

/** Renders /login with no existing session (GET /api/auth/me -> 401). */
function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

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

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(unauthenticated());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TEST-07 [UI-01]: Login form rendering, validation and busy state", () => {
  it("renders labelled required fields with red asterisks (AC-01)", async () => {
    renderLoginPage();

    const email = await screen.findByLabelText(/Email Address/);
    const password = screen.getByLabelText(/Password/);

    expect(email).toHaveAttribute("type", "email");
    expect(password).toHaveAttribute("type", "password");

    // Both labels must carry the required marker.
    const asterisks = screen.getAllByText("*");
    expect(asterisks).toHaveLength(2);
    for (const marker of asterisks) {
      expect(marker).toHaveClass("text-cookie-errorText");
    }

    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
  });

  it("shows field-level errors below empty controls without calling the API (AC-02)", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await screen.findByLabelText(/Email Address/);
    const loginCalls = () =>
      fetchMock.mock.calls.filter(([path]) => path === "/api/auth/login");

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Email address is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(loginCalls()).toHaveLength(0);

    // The error is announced through aria-describedby on the field itself.
    expect(screen.getByLabelText(/Email Address/)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  it("rejects a malformed email address before submitting", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(await screen.findByLabelText(/Email Address/), "not-an-email");
    await user.type(screen.getByLabelText(/Password/), "secret");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([path]) => path === "/api/auth/login")
    ).toHaveLength(0);
  });

  it("disables the button and shows 'Signing in...' while the request is in flight", async () => {
    const user = userEvent.setup();

    let releaseLogin: (value: Response) => void = () => {};
    const pendingLogin = new Promise<Response>((resolve) => {
      releaseLogin = resolve;
    });

    fetchMock.mockImplementation((path: string) =>
      path === "/api/auth/login" ? pendingLogin : Promise.resolve(unauthenticated())
    );

    renderLoginPage();

    await user.type(
      await screen.findByLabelText(/Email Address/),
      "organizer1@university.edu"
    );
    await user.type(screen.getByLabelText(/Password/), "secret");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    const busyButton = await screen.findByRole("button", { name: "Signing in..." });
    expect(busyButton).toBeDisabled();

    releaseLogin(
      jsonResponse(
        {
          data: {
            user: {
              id: "u-1",
              email: "organizer1@university.edu",
              name: "Dr. Somchai Wattana",
              role: "ORGANIZER",
            },
          },
        },
        200
      )
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Signing in..." })
      ).not.toBeInTheDocument();
    });
  });
});

describe("TEST-08 [UI-02]: Failed login feedback", () => {
  it("shows an accessible alert and keeps the typed email on 401 (AC-02)", async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/auth/login"
          ? jsonResponse(
              {
                error: {
                  code: "INVALID_CREDENTIALS",
                  message: "Email or password is incorrect.",
                },
              },
              401
            )
          : unauthenticated()
      )
    );

    renderLoginPage();

    const emailField = await screen.findByLabelText(/Email Address/);
    await user.type(emailField, "organizer1@university.edu");
    await user.type(screen.getByLabelText(/Password/), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Email or password is incorrect.");

    // AC-02: the entered email survives the failure; the password does not.
    expect(screen.getByLabelText(/Email Address/)).toHaveValue(
      "organizer1@university.edu"
    );
    expect(screen.getByLabelText(/Password/)).toHaveValue("");
    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
  });

  it("surfaces the inactive-account message on 403", async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/auth/login"
          ? jsonResponse(
              {
                error: {
                  code: "ACCOUNT_INACTIVE",
                  message: "Your account cannot sign in. Contact support.",
                },
              },
              403
            )
          : unauthenticated()
      )
    );

    renderLoginPage();

    await user.type(
      await screen.findByLabelText(/Email Address/),
      "inactive@university.edu"
    );
    await user.type(screen.getByLabelText(/Password/), "secret");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your account cannot sign in. Contact support."
    );
    expect(screen.getByLabelText(/Email Address/)).toHaveValue(
      "inactive@university.edu"
    );
  });

  it("never renders a quick-login shortcut or demo credential (SDS 2.4)", async () => {
    renderLoginPage();

    await screen.findByLabelText(/Email Address/);

    const buttons = screen.getAllByRole("button").map((node) => node.textContent);
    expect(buttons).toEqual(["Sign In"]);
    expect(document.body.textContent).not.toMatch(/Password123|demo|quick login/i);
  });
});
