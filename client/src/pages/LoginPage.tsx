import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiClientError } from "../api/client";

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(from, { replace: true });
    } catch (error) {
      // AC-02: the typed email must survive a failed attempt; only the
      // password is cleared.
      setPassword("");

      if (error instanceof ApiClientError) {
        if (error.details) {
          setFieldErrors(error.details as FieldErrors);
        }
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded border border-cookie-inputBorder bg-cookie-surface px-3 py-2 text-cookie-cocoa outline-none focus:border-cookie-caramel focus:ring-2 focus:ring-cookie-biscuit";

  return (
    <div className="min-h-screen bg-cookie-cream text-cookie-cocoa">
      <header className="bg-cookie-cocoa px-4 py-4 text-white shadow-sm sm:px-6">
        <div className="mx-auto max-w-5xl">
          <span className="text-lg font-bold tracking-tight">
            SoftCookie Event
          </span>
        </div>
      </header>

      <main className="flex items-start justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-lg border border-cookie-border bg-cookie-surface p-6 shadow-sm sm:p-8">
          <h1 className="mb-1 text-2xl font-bold">Sign In</h1>
          <p className="mb-6 text-sm text-cookie-cocoa/80">
            Use your university account to continue.
          </p>

          {formError && (
            <div
              role="alert"
              className="mb-5 rounded border border-cookie-errorText/30 bg-cookie-errorBg px-3 py-2 text-sm font-medium text-cookie-errorText"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-cookie-cocoa"
              >
                Email Address{" "}
                <span aria-hidden="true" className="text-cookie-errorText">
                  *
                </span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className={inputClass}
              />
              {fieldErrors.email && (
                <p
                  id="email-error"
                  className="mt-1 text-sm font-medium text-cookie-errorText"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-cookie-cocoa"
              >
                Password{" "}
                <span aria-hidden="true" className="text-cookie-errorText">
                  *
                </span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "password-error" : undefined
                }
                className={inputClass}
              />
              {fieldErrors.password && (
                <p
                  id="password-error"
                  className="mt-1 text-sm font-medium text-cookie-errorText"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded bg-cookie-caramel px-4 py-2.5 font-medium text-white transition-colors hover:bg-cookie-amber disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
