import { Link, NavLink } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { easeOut, fadeUp, stagger } from "../../lib/motion";
import { Logo } from "../ui/Navbar";

type Variant = "signin" | "signup" | "plain";

const SHELF_PEEK = [
  { title: "severance", meta: "ep 7", pct: 70, tone: "#2f3b3a" },
  { title: "the three-body problem", meta: "p 214", pct: 54, tone: "#1f2a44" },
  { title: "vinland saga", meta: "ch 98", pct: 46, tone: "#3b4a3f" },
];

const STEPS = [
  { n: "01", title: "add a title", body: "a show, a book, a manga. drop in a cover and where you watch or read it." },
  { n: "02", title: "log as you go", body: "one tap for the next episode or page." },
  { n: "03", title: "finish and rate", body: "it moves to your finished shelf, and your year fills up." },
];

const HEADLINES: Record<Variant, string> = {
  signin: "your bookmarks are right where you left them.",
  signup: "never lose your place again.",
  plain: "one quiet place for everything you watch and read.",
};

const Aside = ({ variant }: { variant: Variant }) => (
  <aside className="relative flex flex-col gap-8 overflow-hidden bg-night px-6 pt-7 pb-9 text-paper sm:px-14 sm:pt-10 lg:min-h-screen lg:flex-[1_1_520px] lg:gap-10 lg:pb-10">
    <motion.span
      aria-hidden="true"
      className="ribbon absolute top-0 right-8 block h-20 w-6 origin-top bg-accent sm:right-[72px] sm:h-[104px] sm:w-7"
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      transition={{ duration: 1, ease: easeOut, delay: 0.3 }}
    />
    <Logo light />

    <motion.div
      className="flex max-w-[520px] flex-1 flex-col justify-center gap-9"
      initial="hidden"
      animate="show"
      variants={stagger(0.1, 0.15)}
    >
      <motion.h2
        variants={fadeUp}
        className="font-serif text-[34px] leading-[1.04] tracking-[-0.025em] sm:text-[44px] lg:text-[52px]"
      >
        {HEADLINES[variant]}
      </motion.h2>

      {variant === "signin" && (
        <motion.div variants={stagger(0.12, 0.2)} className="hidden flex-col gap-2 lg:flex">
          <motion.span variants={fadeUp} className="eyebrow mb-1 text-dim">a shelf, mid-week</motion.span>
          {SHELF_PEEK.map((row, i) => (
            <motion.div
              key={row.title}
              variants={{
                hidden: { opacity: 0, x: -24 },
                show: { opacity: 1 - i * 0.15, x: 0, transition: { duration: 0.8, ease: easeOut } },
              }}
              className="flex max-w-[380px] items-center gap-3.5 bg-paper px-3.5 py-3 text-ink"
              style={{ marginLeft: i * 28 }}
            >
              <span className="h-[38px] w-7 shrink-0" style={{ background: row.tone }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{row.title}</span>
                <span className="mt-1.5 block h-[3px] bg-track">
                  <motion.span
                    className="block h-[3px] bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${row.pct}%` }}
                    transition={{ duration: 1.2, ease: easeOut, delay: 0.7 + i * 0.15 }}
                  />
                </span>
              </span>
              <span className="font-mono text-xs text-muted">{row.meta}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {variant === "signup" && (
        <motion.ol variants={stagger(0.1, 0.2)} className="hidden border-t border-night-line lg:block">
          {STEPS.map((s) => (
            <motion.li key={s.n} variants={fadeUp} className="flex gap-5 border-b border-night-line py-4">
              <span className="pt-0.5 font-mono text-xs text-dim">{s.n}</span>
              <span>
                <span className="mb-1 block font-medium">{s.title}</span>
                <span className="block text-sm leading-relaxed text-dim">{s.body}</span>
              </span>
            </motion.li>
          ))}
        </motion.ol>
      )}
    </motion.div>

    <p className="hidden text-[13px] text-dim lg:block">
      {variant === "signup" ? "free, private, and yours. no feed, no followers." : "screen, read and finished. one quiet place."}
    </p>
  </aside>
);

type AuthLayoutProps = {
  variant?: Variant;
  title: string;
  children: ReactNode;
  stepKey?: string;
};

const AuthLayout = ({ variant = "plain", title, children, stepKey = "main" }: AuthLayoutProps) => (
  <div className="flex min-h-screen flex-col bg-paper text-ink lowercase lg:flex-row">
    <title>{title}</title>
    <Aside variant={variant} />
    <main className="flex flex-1 items-start justify-center px-5 py-10 sm:px-8 lg:flex-[1_1_440px] lg:items-center lg:py-14">
      <div className="w-full max-w-[380px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
            transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  </div>
);

export const AuthTabs = () => (
  <nav aria-label="account" className="mb-9 flex gap-7 border-b border-line text-sm">
    {[
      { to: "/signin", label: "sign in" },
      { to: "/signup", label: "create account" },
    ].map((tab) => (
      <NavLink key={tab.to} to={tab.to} className="relative py-3">
        {({ isActive }) => (
          <>
            <span className={isActive ? "font-medium text-ink" : "text-muted transition-colors hover:text-ink"}>{tab.label}</span>
            {isActive && (
              <motion.span
                layoutId="auth-tab"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-ink"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </>
        )}
      </NavLink>
    ))}
  </nav>
);

export const Divider = ({ label = "or with email" }: { label?: string }) => (
  <div className="my-6 flex items-center gap-3 text-xs text-muted">
    <span className="h-px flex-1 bg-line" />
    {label}
    <span className="h-px flex-1 bg-line" />
  </div>
);

export const FormError = ({ message }: { message: string }) => (
  <AnimatePresence>
    {message && (
      <motion.p
        role="alert"
        initial={{ opacity: 0, height: 0, y: -4 }}
        animate={{ opacity: 1, height: "auto", y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3, ease: easeOut }}
        className="overflow-hidden border-l-2 border-danger bg-danger-soft px-3 py-2 text-sm text-danger"
      >
        {message}
      </motion.p>
    )}
  </AnimatePresence>
);

export const AuthHeading = ({ title, subtitle }: { title: string; subtitle?: ReactNode }) => (
  <div className="mb-7">
    <h1 className="mb-2 font-serif text-[40px] leading-[1.05] tracking-[-0.02em]">{title}</h1>
    {subtitle && <p className="text-[15px] text-muted">{subtitle}</p>}
  </div>
);

export const BackLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline">
    {children}
  </Link>
);

export default AuthLayout;
