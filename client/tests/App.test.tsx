import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../src/App";

describe("Client Landing Shell (SoftCookie Warm Bakery UI)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders SoftCookie Event title and Sign In action", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ready", db: "connected" }), {
        status: 200,
      })
    );

    render(<App />);

    expect(screen.getByRole("heading", { name: "SoftCookie Event" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
      "href",
      "/login"
    );

    await waitFor(() => {
      expect(screen.getByText("Ready (Connected)")).toBeInTheDocument();
    });
  });
});

