import type { ReactNode } from "react";
import { motion } from "motion/react";
import { page, pop } from "../lib/motion";

type Props = { title: string; children?: ReactNode; action?: ReactNode };

// tampilan kosong / error / belum login
const Message = ({ title, children, action }: Props) => (
  <motion.div {...page} className="px-6 pt-6 pb-9 text-center">
    <motion.svg
      viewBox="0 0 32 32"
      className="mx-auto h-9 w-9"
      aria-hidden="true"
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { ...pop, delay: 0.05 } }}
    >
      <path d="M8 2h16v28l-8-6.2L8 30z" fill="#c2410c" />
    </motion.svg>
    <p className="mt-4 font-serif text-2xl">{title}</p>
    {children && <p className="mx-auto mt-2 max-w-[290px] text-sm leading-relaxed text-muted">{children}</p>}
    {action && <div className="mt-6 flex justify-center">{action}</div>}
  </motion.div>
);

export default Message;
