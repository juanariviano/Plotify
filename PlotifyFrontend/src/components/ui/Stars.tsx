import { motion } from "motion/react";
import { useId, useState } from "react";

const STAR_PATH =
  "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z";

const Star = ({ fill, size }: { fill: number; size: number }) => {
  const id = `star-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={24 * fill} height="24" />
        </clipPath>
      </defs>
      <path d={STAR_PATH} fill="transparent" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d={STAR_PATH} fill="var(--color-accent)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" clipPath={`url(#${id})`} />
    </svg>
  );
};

// read-only stars; supports fractional ratings like 4.5
export const StarDisplay = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <span className="inline-flex items-center gap-[1px] text-ink" aria-label={`${rating} out of 5`}>
    {[0, 1, 2, 3, 4].map((i) => (
      <Star key={i} fill={Math.max(0, Math.min(1, rating - i))} size={size} />
    ))}
  </span>
);

type StarPickerProps = {
  value: number;
  onChange: (value: number) => void;
  size?: number;
};

export const StarPicker = ({ value, onChange, size = 32 }: StarPickerProps) => {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div role="radiogroup" aria-label="rating" className="flex text-ink" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} of 5`}
          className="flex h-11 w-11 items-center justify-center"
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(null)}
          onClick={() => onChange(n)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          animate={value === n ? { rotate: [0, -12, 8, 0] } : { rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <Star fill={n <= shown ? 1 : 0} size={size} />
        </motion.button>
      ))}
    </div>
  );
};
