import { Link } from "react-router";
import { motion } from "motion/react";
import { easeOut } from "../../lib/motion";
import { btn } from "../../lib/ui";
import { Logo } from "./Navbar";

type ErrorPageProps = {
  code: string;
  title: string;
  body: string;
};

const ErrorPage = ({ code, title, body }: ErrorPageProps) => (
  <div className="flex min-h-screen flex-col bg-paper text-ink lowercase">
    <title>{`${title} · plotify`}</title>
    <header className="mx-auto w-full max-w-[1200px] px-5 py-5 sm:px-10">
      <Logo />
    </header>
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-5 pb-24 sm:px-10">
      <div className="relative">
        <motion.span
          aria-hidden="true"
          className="ribbon absolute -top-24 left-1 block h-28 w-8 origin-top bg-accent"
          initial={{ scaleY: 0, rotate: 0 }}
          animate={{ scaleY: 1, rotate: [0, 4, -3, 2, 0] }}
          transition={{ scaleY: { duration: 0.9, ease: easeOut }, rotate: { duration: 2.4, delay: 0.9, ease: "easeInOut" } }}
          style={{ transformOrigin: "top center" }}
        />
        <motion.p
          className="mb-4 font-mono text-sm text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          error {code}
        </motion.p>
        <motion.h1
          className="mb-5 max-w-3xl font-serif text-[52px] leading-none tracking-[-0.03em] sm:text-[80px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOut, delay: 0.2 }}
        >
          {title}
        </motion.h1>
        <motion.p
          className="mb-9 max-w-md text-[17px] leading-relaxed text-body"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOut, delay: 0.35 }}
        >
          {body}
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-wrap gap-3">
          <Link to="/" className={btn("primary", "lg")}>back to the start</Link>
          <Link to="/screen" className={btn("secondary", "lg")}>open your shelf</Link>
        </motion.div>
      </div>
    </main>
  </div>
);

export default ErrorPage;
