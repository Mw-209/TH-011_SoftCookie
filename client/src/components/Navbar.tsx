import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/** Role-specific navigation, per F-01 section 5. */
const LINKS_BY_ROLE = {
  PARTICIPANT: [
    { to: "/events", label: "Browse Events" },
    { to: "/my-registrations", label: "My Registrations" },
  ],
  ORGANIZER: [
    { to: "/events", label: "Browse Events" },
    { to: "/events/new", label: "Create Event" },
  ],
} as const;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return null;
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  const links = LINKS_BY_ROLE[user.role];

  return (
    <header className="bg-cookie-cocoa text-white shadow-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-5">
          <span className="text-lg font-bold tracking-tight">
            SoftCookie Event
          </span>
          <nav aria-label="Main navigation" className="flex items-center gap-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  [
                    "text-sm transition-colors hover:text-cookie-biscuit",
                    isActive ? "font-semibold text-cookie-biscuit" : "text-white/90",
                  ].join(" ")
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{user.name}</span>
          <span className="rounded bg-cookie-caramel px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
            {user.role}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded border border-white/40 px-3 py-1 text-sm font-medium transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoggingOut ? "Logging out..." : "Log Out"}
          </button>
        </div>
      </div>
    </header>
  );
}
