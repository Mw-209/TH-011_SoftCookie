import { useAuth } from "../auth/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-cookie-cocoa">
        Welcome, {user?.name}
      </h1>
      <p className="mb-8 max-w-2xl text-sm text-cookie-cocoa/80">
        University Skill-Building Event Registration and Attendance System.
        Browse published events and manage your skill-building activities.
      </p>

      <div className="rounded-lg border border-cookie-border bg-cookie-surface p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-cookie-cocoa">
          Signed in as {user?.role === "ORGANIZER" ? "an organizer" : "a participant"}
        </h2>
        <p className="text-sm text-cookie-cocoa/80">
          {user?.role === "ORGANIZER"
            ? "You can publish new skill-building events and review their registration rosters."
            : "You can browse published events and register for the ones you want to attend."}
        </p>
      </div>
    </main>
  );
}
