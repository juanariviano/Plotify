import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useState } from "react";

type TagInputProps = {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

// categories as chips: enter or comma adds one, backspace on empty removes the last
const TagInput = ({ id, value, onChange, placeholder = "type and press enter" }: TagInputProps) => {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    if (!parts.length) return;
    onChange([...value, ...parts.filter((p) => !value.includes(p))]);
    setDraft("");
  };

  return (
    <div className="flex min-h-12 flex-wrap items-center gap-1.5 border border-line-strong bg-white px-2 py-1.5 transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgb(23_22_15/0.06)]">
      <AnimatePresence initial={false} mode="popLayout">
        {value.map((tag) => (
          <motion.span
            key={tag}
            layout
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="flex items-center gap-0.5 bg-soft py-0.5 pr-0.5 pl-2.5 text-[13px]"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`remove ${tag}`}
              className="flex h-7 w-7 items-center justify-center text-muted hover:text-ink"
            >
              <X size={13} />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          if (next.includes(",")) commit(next);
          else setDraft(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        placeholder={value.length ? "" : placeholder}
        className="h-9 min-w-[140px] flex-1 bg-transparent px-1 text-[15px] outline-none placeholder:text-[#8f8b81]"
      />
    </div>
  );
};

export default TagInput;
