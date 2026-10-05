import { motion } from "motion/react";
import { easeOut } from "../../lib/motion";

type RibbonProps = {
  className?: string;
  delay?: number;
  color?: string;
};

// the bookmark ribbon: drops in from its top edge
const Ribbon = ({ className = "", delay = 0.2, color = "var(--color-accent)" }: RibbonProps) => (
  <motion.span
    aria-hidden="true"
    className={`ribbon block origin-top ${className}`}
    style={{ background: color }}
    initial={{ scaleY: 0 }}
    animate={{ scaleY: 1 }}
    transition={{ duration: 0.9, ease: easeOut, delay }}
  />
);

export default Ribbon;
