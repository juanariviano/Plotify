import { AnimatePresence, motion } from "motion/react";
import { easeOut } from "../../lib/motion";

type AnimatedNumberProps = {
  value: number | string;
  className?: string;
  direction?: 1 | -1;
};

// rolls the old value out and the new one in, like an odometer
const AnimatedNumber = ({ value, className = "", direction = 1 }: AnimatedNumberProps) => (
  <span className={`relative inline-flex overflow-hidden align-bottom ${className}`}>
    <AnimatePresence mode="popLayout" initial={false} custom={direction}>
      <motion.span
        key={value}
        custom={direction}
        variants={{
          enter: (d: number) => ({ y: d > 0 ? "70%" : "-70%", opacity: 0 }),
          center: { y: 0, opacity: 1 },
          exit: (d: number) => ({ y: d > 0 ? "-70%" : "70%", opacity: 0 }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.45, ease: easeOut }}
        className="inline-block tabular-nums"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  </span>
);

export default AnimatedNumber;
