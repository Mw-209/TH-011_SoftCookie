import { useEffect, useState } from "react";

type ProbeState = "checking" | "connected" | "disconnected";

export default function App() {
  const [dbStatus, setDbStatus] = useState<ProbeState>("checking");

  useEffect(() => {
    let active = true;
    fetch("/api/ready")
      .then((res) => (res.ok ? "connected" : "disconnected"))
      .catch(() => "disconnected" as const)
      .then((status) => {
        if (active) setDbStatus(status);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-cookie-cream text-cookie-cocoa">
      <header className="bg-cookie-cocoa text-white px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">
            SoftCookie Event
          </span>
          <span className="text-xs px-2.5 py-1 rounded bg-cookie-caramel text-white font-medium">
            TH-011_SoftCookie
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-cookie-surface p-8 rounded-lg border border-cookie-border shadow-sm text-center">
          <h1 className="text-2xl font-bold text-cookie-cocoa mb-2">
            SoftCookie Event
          </h1>
          <p className="text-sm text-cookie-cocoa/80 mb-6">
            University Skill-Building Event Registration and Attendance System
          </p>

          <div className="mb-6 p-3 rounded border border-cookie-readonlyBorder bg-cookie-readonlyBg text-xs flex items-center justify-between">
            <span className="font-medium">Backend &amp; Database Status</span>
            {dbStatus === "checking" && (
              <span className="px-2 py-0.5 rounded bg-cookie-warningBg text-cookie-warningText font-semibold">
                Checking...
              </span>
            )}
            {dbStatus === "connected" && (
              <span className="px-2 py-0.5 rounded bg-cookie-successBg text-cookie-successText font-semibold">
                Ready (Connected)
              </span>
            )}
            {dbStatus === "disconnected" && (
              <span className="px-2 py-0.5 rounded bg-cookie-errorBg text-cookie-errorText font-semibold">
                API Unreachable
              </span>
            )}
          </div>

          <a
            href="/login"
            className="inline-block w-full py-2.5 px-4 bg-cookie-caramel hover:bg-cookie-amber text-white font-medium rounded transition-colors"
          >
            Sign In
          </a>
        </div>
      </main>
    </div>
  );
}

