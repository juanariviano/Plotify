import { motion, type HTMLMotionProps } from "motion/react";
import { easeOut, fadeUp, stagger } from "../lib/motion";

type RevealProps = HTMLMotionProps<"div"> & {
  delay?: number;
  y?: number;
  once?: boolean;
};

// fades and lifts its children in the first time they scroll into view
export const Reveal = ({ delay = 0, y = 16, once = true, children, ...rest }: RevealProps) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once, margin: "0px 0px -64px 0px" }}
    transition={{ duration: 0.7, ease: easeOut, delay }}
    {...rest}
  >
    {children}
  </motion.div>
);

type StaggerProps = HTMLMotionProps<"div"> & {
  gap?: number;
  delay?: number;
  inView?: boolean;
};

// parent for StaggerItem children; animates on mount, or on scroll when inView is set
export const Stagger = ({ gap, delay, inView = false, children, ...rest }: StaggerProps) => (
  <motion.div
    variants={stagger(gap, delay)}
    initial="hidden"
    {...(inView
      ? { whileInView: "show", viewport: { once: true, margin: "0px 0px -64px 0px" } }
      : { animate: "show" })}
    {...rest}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, ...rest }: HTMLMotionProps<"div">) => (
  <motion.div variants={fadeUp} {...rest}>
    {children}
  </motion.div>
);

// page-level enter animation
export const PageEnter = ({ children, ...rest }: HTMLMotionProps<"div">) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: easeOut }}
    {...rest}
  >
    {children}
  </motion.div>
);
