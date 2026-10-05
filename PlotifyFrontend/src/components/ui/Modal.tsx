import { AnimatePresence, motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { easeOut } from "../../lib/motion";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  tone?: "default" | "danger";
};

const Modal = ({ open, onClose, title, children, tone = "default" }: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`w-full max-w-md bg-white p-7 shadow-[0_24px_60px_-20px_rgb(23_22_15/0.35)] sm:p-8 ${
              tone === "danger" ? "border-t-4 border-danger" : "border-t-4 border-ink"
            }`}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.45, ease: easeOut }}
          >
            <h2 className="mb-3 font-serif text-[28px] leading-tight tracking-[-0.01em]">{title}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
