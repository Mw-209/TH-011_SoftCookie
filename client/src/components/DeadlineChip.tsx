import {
  describeRegistrationWindow,
  type RegistrationWindowTone,
} from "../lib/datetime";

/**
 * Colour choices:
 * - open    quiet neutral, because "plenty of time" needs no attention
 * - closing warm amber, the theme's urgency pairing (also used by "Full")
 * - closed  muted read-only greys, reading as inactive rather than as an error
 *
 * Red is reserved for validation failures, so an elapsed date does not borrow
 * it; nothing has gone wrong, the window has simply passed.
 */
const TONE_CLASSES: Record<RegistrationWindowTone, string> = {
  open: "bg-cookie-cream text-cookie-cocoa/80 border-cookie-border",
  closing: "bg-cookie-warningBg text-cookie-warningText border-cookie-warningText/30",
  closed:
    "bg-cookie-readonlyBg text-cookie-cocoa/60 border-cookie-readonlyBorder line-through",
};

interface DeadlineChipProps {
  registrationDeadline: string;
  className?: string;
}

export default function DeadlineChip({
  registrationDeadline,
  className = "",
}: DeadlineChipProps) {
  const { label, tone } = describeRegistrationWindow(registrationDeadline);

  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
