import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import EventCatalogPage from "./pages/EventCatalogPage";
import EventDetailPage from "./pages/EventDetailPage";
import CreateEventPage from "./pages/CreateEventPage";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

/** Shell for every authenticated screen: SoftCookie navbar plus page content. */
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cookie-cream text-cookie-cocoa">
      <Navbar />
      {children}
    </div>
  );
}

/** Wraps a page in the session gate and the authenticated shell. */
function protectedPage(element: React.ReactNode) {
  return (
    <ProtectedRoute>
      <AppShell>{element}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={protectedPage(<HomePage />)} />
      <Route path="/events" element={protectedPage(<EventCatalogPage />)} />

      {/*
        Declared before /events/:id so the literal path wins. The role check
        lives in the page itself, which renders the 403 card required by AC-08
        rather than redirecting away.
      */}
      <Route path="/events/new" element={protectedPage(<CreateEventPage />)} />
      <Route path="/events/:id" element={protectedPage(<EventDetailPage />)} />

      {/* Unknown paths fall back to the home route, which gates on the session. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
