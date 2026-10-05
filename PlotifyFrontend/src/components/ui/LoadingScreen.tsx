import { useEffect } from "react";
import { motion } from "motion/react";
import type { Props } from "../../types/components";
import { easeOut } from "../../lib/motion";

const LoadingScreen = ({ canExit, onFinish }: Props) => {
  const letters = "plotify".split("");

  useEffect(() => {
    if (!canExit || !onFinish) return;

    // let the intro finish before handing control back
    const timer = setTimeout(() => {
      onFinish();
    }, 300);

    return () => clearTimeout(timer);
  }, [canExit, onFinish]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-paper" role="status" aria-label="loading">
      <div className="relative flex items-end gap-3">
        <motion.span
          aria-hidden="true"
          className="ribbon block h-12 w-6 origin-top bg-accent"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: [0, 1, 0.82, 1] }}
          transition={{ duration: 1.4, ease: easeOut, repeat: Infinity, repeatDelay: 0.4 }}
        />
        <span className="flex font-serif text-[44px] leading-none tracking-[-0.03em] text-ink">
          {letters.map((letter, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: [0, 1, 1, 0.35], y: [10, 0, 0, 0] }}
              transition={{
                duration: 1.8,
                times: [0, 0.25, 0.7, 1],
                delay: index * 0.06,
                repeat: Infinity,
                repeatType: "reverse",
                ease: easeOut,
              }}
            >
              {letter}
            </motion.span>
          ))}
        </span>
      </div>
    </div>
  );
};

export default LoadingScreen;
