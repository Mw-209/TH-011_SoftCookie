import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CreateEventPage from "../src/pages/CreateEventPage";
import { AuthProvider } from "../src/auth/AuthContext";

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
          id: "u-1",
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

let fetchMock: ReturnType<typeof vi.fn>;

function renderPage(role: "PARTICIPANT" | "ORGANIZER" = "ORGANIZER") {
  fetchMock.mockImplementation((path: string) => {
    if (path === "/api/auth/me") return Promise.resolve(sessionFor(role));
    return Promise.resolve(jsonResponse({ data: {} }, 200));
  });

  return render(
    <MemoryRouter initialEntries={["/events/new"]}>
      <AuthProvider>
        <CreateEventPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

/** Fills every field with values that satisfy BR-01. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText(/Event Title/),
    "Cloud Native Docker Workshop"
  );
  await user.type(screen.getByLabelText(/Skill Hours/), "3");
  await user.type(screen.getByLabelText(/Capacity/), "25");
  await user.type(
    screen.getByLabelText(/Location/),
    "Engineering Building Room 402"
  );
  await user.type(
    screen.getByLabelText(/Registration Deadline/),
    "2026-11-30T23:59"
  );
  await user.type(screen.getByLabelText(/Start Date\/Time/), "2026-12-01T09:00");
  await user.type(screen.getByLabelText(/End Date\/Time/), "2026-12-01T12:00");
  await user.type(
    screen.getByLabelText(/Description/),
    "Hands-on containerization workshop for engineering students."
  );
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TEST-16 [UI-03]: Create Event form", () => {
  it("separates system-assigned read-only fields from editable ones", async () => {
    renderPage();

    const eventCode = await screen.findByLabelText("Event Code");
    const organizer = screen.getByLabelText("Organizer");

    expect(eventCode).toHaveAttribute("readonly");
    expect(eventCode).toHaveValue("Auto-generated on save (EVT-2026-XXXX)");
    expect(eventCode).toHaveClass("bg-cookie-readonlyBg");

    expect(organizer).toHaveAttribute("readonly");
    expect(organizer).toHaveValue(
      "Dr. Somchai Wattana (organizer1@university.edu)"
    );

    // Editable controls use the white surface, not the read-only shading.
    expect(screen.getByLabelText(/Event Title/)).toHaveClass(
      "bg-cookie-surface"
    );
  });

  it("marks all nine editable fields as required with a red asterisk", async () => {
    renderPage();
    await screen.findByLabelText(/Event Title/);

    const asterisks = screen.getAllByText("*");
    expect(asterisks).toHaveLength(9);
    for (const marker of asterisks) {
      expect(marker).toHaveClass("text-cookie-errorText");
    }
  });

  it("shows field-level errors below invalid controls without calling the API (AC-07)", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByLabelText(/Event Title/);

    await user.click(screen.getByRole("button", { name: "Publish Event" }));

    expect(await screen.findByText("Event title is required.")).toBeInTheDocument();
    expect(screen.getByText("Capacity is required.")).toBeInTheDocument();
    expect(screen.getByText("Skill hours is required.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Title/)).toHaveAttribute(
      "aria-invalid",
      "true"
    );

    expect(
      fetchMock.mock.calls.filter(([path]) => path === "/api/events")
    ).toHaveLength(0);
  });

  it("rejects a non-positive capacity before submitting (BR-01)", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByLabelText(/Capacity/);

    await fillValidForm(user);
    await user.clear(screen.getByLabelText(/Capacity/));
    await user.type(screen.getByLabelText(/Capacity/), "0");
    await user.click(screen.getByRole("button", { name: "Publish Event" }));

    expect(
      await screen.findByText(
        "Capacity must be a whole number between 1 and 1000."
      )
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([path]) => path === "/api/events")
    ).toHaveLength(0);
  });

  it("rejects a registration deadline after the start time", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByLabelText(/Registration Deadline/);

    await fillValidForm(user);
    await user.clear(screen.getByLabelText(/Registration Deadline/));
    await user.type(
      screen.getByLabelText(/Registration Deadline/),
      "2026-12-02T10:00"
    );
    await user.click(screen.getByRole("button", { name: "Publish Event" }));

    expect(
      await screen.findByText(
        "Registration deadline must be on or before the start date and time."
      )
    ).toBeInTheDocument();
  });

  it("disables the button and shows 'Publishing...' while submitting", async () => {
    const user = userEvent.setup({ delay: null });

    let release: (value: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });

    renderPage();
    await screen.findByLabelText(/Event Title/);

    fetchMock.mockImplementation((path: string) =>
      path === "/api/events" ? pending : Promise.resolve(sessionFor("ORGANIZER"))
    );

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Publish Event" }));

    const busy = await screen.findByRole("button", { name: "Publishing..." });
    expect(busy).toBeDisabled();

    release(
      jsonResponse(
        { data: { event: { id: "e-1", eventCode: "EVT-2026-0004" } } },
        201
      )
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Publishing..." })
      ).not.toBeInTheDocument();
    });
  });

  it("preserves every entered value when the server rejects the payload (AC-07)", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByLabelText(/Event Title/);

    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/events"
          ? jsonResponse(
              {
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Please correct the highlighted fields.",
                  details: { capacity: "Capacity must be between 1 and 1000." },
                },
              },
              400
            )
          : sessionFor("ORGANIZER")
      )
    );

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Publish Event" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please correct the highlighted fields."
    );
    expect(
      screen.getByText("Capacity must be between 1 and 1000.")
    ).toBeInTheDocument();

    // Nothing the organizer typed may be lost.
    expect(screen.getByLabelText(/Event Title/)).toHaveValue(
      "Cloud Native Docker Workshop"
    );
    expect(screen.getByLabelText(/Location/)).toHaveValue(
      "Engineering Building Room 402"
    );
    expect(screen.getByLabelText(/Description/)).toHaveValue(
      "Hands-on containerization workshop for engineering students."
    );
    expect(screen.getByLabelText(/Start Date\/Time/)).toHaveValue(
      "2026-12-01T09:00"
    );
    expect(screen.getByRole("button", { name: "Publish Event" })).toBeEnabled();
  });

  it("sends absolute ISO instants and no client-side identifiers", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByLabelText(/Event Title/);

    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/events"
          ? jsonResponse(
              { data: { event: { id: "e-1", eventCode: "EVT-2026-0004" } } },
              201
            )
          : sessionFor("ORGANIZER")
      )
    );

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Publish Event" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([path]) => path === "/api/events")
      ).toHaveLength(1);
    });

    const [, init] = fetchMock.mock.calls.find(
      ([path]) => path === "/api/events"
    ) as [string, RequestInit];
    const payload = JSON.parse(init.body as string);

    expect(payload.capacity).toBe(25);
    expect(payload.skillHours).toBe(3);
    expect(payload.startAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("eventCode");
    expect(payload).not.toHaveProperty("organizerId");
  });

  it("prefills an empty registration deadline from the start time", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByLabelText(/Start Date\/Time/);

    expect(screen.getByLabelText(/Registration Deadline/)).toHaveValue("");

    await user.type(screen.getByLabelText(/Start Date\/Time/), "2026-12-01T09:00");

    // BR-01 permits registrationDeadline === startAt.
    expect(screen.getByLabelText(/Registration Deadline/)).toHaveValue(
      "2026-12-01T09:00"
    );
  });

  it("never overwrites a registration deadline the organizer already chose", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByLabelText(/Registration Deadline/);

    await user.type(
      screen.getByLabelText(/Registration Deadline/),
      "2026-11-25T17:00"
    );
    await user.type(screen.getByLabelText(/Start Date\/Time/), "2026-12-01T09:00");

    expect(screen.getByLabelText(/Registration Deadline/)).toHaveValue(
      "2026-11-25T17:00"
    );
  });

  it("leaves the prefilled deadline editable", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByLabelText(/Start Date\/Time/);

    await user.type(screen.getByLabelText(/Start Date\/Time/), "2026-12-01T09:00");
    await user.clear(screen.getByLabelText(/Registration Deadline/));
    await user.type(
      screen.getByLabelText(/Registration Deadline/),
      "2026-11-28T12:00"
    );

    expect(screen.getByLabelText(/Registration Deadline/)).toHaveValue(
      "2026-11-28T12:00"
    );
  });

  it("explains the deadline rule next to the field", async () => {
    renderPage();
    await screen.findByLabelText(/Registration Deadline/);

    expect(
      screen.getByText(/Leave it blank to accept registrations until the event/)
    ).toBeInTheDocument();
  });

  it("falls back to the start time when the deadline is left blank", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByLabelText(/Event Title/);

    fetchMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/events"
          ? jsonResponse(
              { data: { event: { id: "e-1", eventCode: "EVT-2026-0004" } } },
              201
            )
          : sessionFor("ORGANIZER")
      )
    );

    await fillValidForm(user);
    // Clearing after the start time was set leaves the field genuinely blank.
    await user.clear(screen.getByLabelText(/Registration Deadline/));
    await user.click(screen.getByRole("button", { name: "Publish Event" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([path]) => path === "/api/events")
      ).toHaveLength(1);
    });

    const [, init] = fetchMock.mock.calls.find(
      ([path]) => path === "/api/events"
    ) as [string, RequestInit];
    const payload = JSON.parse(init.body as string);

    expect(payload.registrationDeadline).toBe(payload.startAt);
    expect(
      screen.queryByText("Registration deadline is required.")
    ).not.toBeInTheDocument();
  });

  it("renders 403 Access Denied for a PARTICIPANT (AC-08)", async () => {
    renderPage("PARTICIPANT");

    expect(
      await screen.findByRole("heading", { name: "403 Access Denied" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Only organizers can create events.")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Event Title/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Publish Event" })
    ).not.toBeInTheDocument();
  });
});
