import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, ApiClientError } from "../api/client";

export type Role = "PARTICIPANT" | "ORGANIZER";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the initial GET /api/auth/me has settled. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Identity always comes from the server session, never from local storage (BR-04).
  useEffect(() => {
    let active = true;

    apiFetch<{ user: AuthUser }>("/api/auth/me")
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch((error: unknown) => {
        // A missing session is the normal unauthenticated case, not a failure.
        if (!(error instanceof ApiClientError) || error.code !== "UNAUTHENTICATED") {
          // Nothing else to recover here; the user simply stays logged out.
        }
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ message: string }>("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      // Clear locally even if the request failed, so the UI never shows a
      // session the user has asked to end.
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}
