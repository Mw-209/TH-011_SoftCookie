/**
 * Minimal clock glyph used beside event times.
 * Decorative only: the adjacent text already states the time, so it is hidden
 * from assistive technology.
 */
export default function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.75V8l2.25 1.5" />
    </svg>
  );
}
