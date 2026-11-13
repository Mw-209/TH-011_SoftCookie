interface SeatBadgeProps {
  remainingSeats: number;
  capacity: number;
}

/**
 * Seat availability badge from F-02 section 5: green while seats remain,
 * warm amber once the event is full.
 *
 * A full event reads simply "Full". The "X / Y" shape only makes sense while
 * it means "seats left of capacity"; once it reads "0 / 1" the leading zero
 * invites the opposite reading, that nobody has registered. The exact figures
 * stay on the detail view, which spells them out as "1 registered of 1".
 */
export default function SeatBadge({ remainingSeats, capacity }: SeatBadgeProps) {
  const isFull = remainingSeats <= 0;

  const text = isFull
    ? "Full"
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
