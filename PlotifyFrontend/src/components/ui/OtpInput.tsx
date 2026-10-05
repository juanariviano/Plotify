import { motion } from "motion/react";
import { useRef } from "react";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  onComplete?: () => void;
  invalid?: boolean;
};

// six single-digit boxes that behave like one field (typing, backspace, paste)
const OtpInput = ({ value, onChange, length = 6, onComplete, invalid = false }: OtpInputProps) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const setAt = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    const joined = next.join("").slice(0, length);
    onChange(joined);
    if (joined.length === length) onComplete?.();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
    if (pasted.length === length) onComplete?.();
  };

  return (
    <motion.div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      animate={invalid ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`digit ${i + 1}`}
          aria-invalid={invalid}
          value={digit}
          onPaste={handlePaste}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, d);
            if (d && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digit && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
          }}
          className={`h-14 min-w-0 border bg-white text-center font-mono text-2xl outline-none transition-[border-color,box-shadow] duration-200 focus:border-accent focus:shadow-[0_0_0_3px_rgb(194_65_12/0.12)] sm:h-16 ${
            invalid ? "border-danger" : digit ? "border-ink" : "border-line-strong"
          }`}
        />
      ))}
    </motion.div>
  );
};

export default OtpInput;
