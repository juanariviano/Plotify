import { motion } from "motion/react";
import { Star } from "lucide-react";
import { pop } from "../lib/motion";

type Props = { value: number; onChange: (rating: number) => void };

const StarPicker = ({ value, onChange }: Props) => (
  <div className="flex gap-1" role="radiogroup" aria-label="rating">
    {[1, 2, 3, 4, 5].map((n) => (
      <motion.button
        key={n}
        type="button"
        role="radio"
        aria-checked={value === n}
        aria-label={`${n} star${n > 1 ? "s" : ""}`}
        onClick={() => onChange(n)}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.85 }}
        transition={pop}
        className="p-0.5"
      >
        <motion.span
          className="block"
          animate={{ scale: n <= value ? [1, 1.25, 1] : 1 }}
          transition={{ duration: 0.3, delay: n <= value ? (n - 1) * 0.03 : 0 }}
          key={n <= value ? `on-${value}` : "off"}
        >
          <Star size={26} className={n <= value ? "fill-accent text-accent" : "text-line-strong"} />
        </motion.span>
      </motion.button>
    ))}
  </div>
);

export default StarPicker;
