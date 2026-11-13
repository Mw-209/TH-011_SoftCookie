interface SeatBadgeProps {
  remainingSeats: number;
  capacity: number;
}

/**
 * Seat availability badge from F-02 section 5: green while seats remain,
 * warm amber once the event is full.
 */
export default function SeatBadge({ remainingSeats, capacity }: SeatBadgeProps) {
  const isFull = remainingSeats <= 0;

  const text = isFull
    ? `Full (0 / ${capacity})`
    : `${remainingSeats} / ${capacity} seats available`;

  const palette = isFull
    ? "bg-cookie-warningBg text-cookie-warningText"
    : "bg-cookie-successBg text-cookie-successText";

  return (
    <span
      className={`inline-block rounded px-2.5 py-1 text-xs font-semibold ${palette}`}
    >
      {text}
    </span>
  );
}
