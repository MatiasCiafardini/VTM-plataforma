"use client";

import styles from "./feedback.module.css";

export function FeedbackStars({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange?: (rating: number) => void;
  disabled?: boolean;
}) {
  if (!onChange)
    return (
      <span className={styles.rating} aria-label={`${value} de 5 estrellas`}>
        {"★".repeat(value)}
        <span className={styles.emptyStars}>{"★".repeat(5 - value)}</span>
      </span>
    );
  return (
    <div
      className={styles.stars}
      role="group"
      aria-label="Calificación de la mentoría"
    >
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          aria-label={`${rating} ${rating === 1 ? "estrella" : "estrellas"}`}
          aria-pressed={value === rating}
          className={rating <= value ? styles.starSelected : styles.star}
          onClick={() => onChange(rating)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9Z" />
          </svg>
        </button>
      ))}
    </div>
  );
}
