/**
 * Minimal map-pin glyph used beside event locations.
 * Decorative only: the adjacent text names the place.
 */
export default function MapPinIcon({ className = "" }: { className?: string }) {
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
      <path d="M8 14.25s4.75-4.1 4.75-7.5a4.75 4.75 0 1 0-9.5 0c0 3.4 4.75 7.5 4.75 7.5Z" />
      <circle cx="8" cy="6.5" r="1.75" />
    </svg>
  );
}
