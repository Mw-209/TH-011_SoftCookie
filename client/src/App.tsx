import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <HomePage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Unknown paths fall back to the home route, which gates on the session. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
