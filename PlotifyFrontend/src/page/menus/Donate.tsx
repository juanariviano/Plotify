import { motion } from "motion/react";
import { ArrowUpRight, Coffee, Heart, QrCode } from "lucide-react";
import { useEffect } from "react";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import { easeOut, fadeUp, stagger } from "../../lib/motion";
import { btn } from "../../lib/ui";

// links come from env so the page ships before the accounts exist; a missing one shows as "soon"
const OPTIONS = [
  {
    id: "saweria",
    name: "saweria",
    who: "from indonesia",
    how: "qris, e-wallets and bank transfer, in rupiah.",
    icon: QrCode,
    url: import.meta.env.VITE_SAWERIA_URL as string | undefined,
  },
  {
    id: "kofi",
    name: "ko-fi",
    who: "from anywhere else",
    how: "paypal or card, in your own currency.",
    icon: Coffee,
    url: import.meta.env.VITE_KOFI_URL as string | undefined,
  },
];

const Donate = () => {
  useEffect(() => {
    document.title = "support · plotify";
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink lowercase">
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pt-14 pb-24 sm:px-10">
        <motion.div initial="hidden" animate="show" variants={stagger(0.08)} className="mb-12 max-w-2xl">
          <motion.p variants={fadeUp} className="eyebrow mb-3 flex items-center gap-2">
            <Heart size={13} className="text-accent" /> support
          </motion.p>
          <motion.h1 variants={fadeUp} className="mb-4 font-serif text-[48px] leading-none tracking-[-0.025em] sm:text-[64px]">
            keep plotify running.
          </motion.h1>
          <motion.p variants={fadeUp} className="text-[17px] leading-relaxed text-muted">
            plotify is free and stays free. nothing is locked behind a donation. if it keeps your shelves in order, a
            small tip helps pay for servers and the time to build what's next.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger(0.1, 0.2)}
          className="grid max-w-3xl gap-4 sm:grid-cols-2"
        >
          {OPTIONS.map((o) => (
            <motion.div
              key={o.id}
              variants={fadeUp}
              whileHover={o.url ? { y: -4 } : undefined}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="flex flex-col gap-5 border border-line bg-white p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] text-muted">{o.who}</p>
                  <h2 className="font-serif text-[32px] leading-tight">{o.name}</h2>
                </div>
                <o.icon size={26} className="text-accent" />
              </div>
              <p className="flex-1 text-sm text-body">{o.how}</p>
              {o.url ? (
                <a href={o.url} target="_blank" rel="noreferrer" className={btn("primary", "lg", "w-full")}>
                  give on {o.name} <ArrowUpRight size={17} />
                </a>
              ) : (
                <span className={btn("secondary", "lg", "w-full pointer-events-none opacity-60")} aria-disabled="true">
                  coming soon
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: easeOut, delay: 0.6 }}
          className="mt-10 max-w-2xl text-sm text-muted"
        >
          payments are handled by saweria and ko-fi. plotify never sees your card or wallet details.
        </motion.p>
      </main>

      <Footer />
    </div>
  );
};

export default Donate;
