import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { motion, useInView, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import AnimatedNumber from "../../components/ui/AnimatedNumber";
import { StarDisplay } from "../../components/ui/Stars";
import { Reveal } from "../../components/motion";
import { easeOut, fadeUp, stagger } from "../../lib/motion";
import { btn } from "../../lib/ui";

const DEMO = [
  { id: "a", title: "severance", unit: "episode", total: 10, by: 1, step: "+1", tone: "#2f3b3a", start: 7 },
  { id: "b", title: "frieren", unit: "episode", total: 28, by: 1, step: "+1", tone: "#5a6a4d", start: 22 },
  { id: "c", title: "the three-body problem", unit: "page", total: 400, by: 10, step: "+10", tone: "#1f2a44", start: 214 },
];

const SCATTERED = [
  "a note in your phone",
  "a screenshot of the episode list",
  "a bookmark folder called “later”",
  "a “continue watching” row that forgets",
  "a message to yourself",
  "twelve open tabs",
];

const SHELVES = {
  screen: [
    { title: "severance", meta: "ep 7", tone: "#2f3b3a" },
    { title: "frieren", meta: "ep 22", tone: "#5a6a4d" },
    { title: "shōgun", meta: "ep 4", tone: "#6b3b2b" },
  ],
  read: [
    { title: "the three-body problem", meta: "p 214", tone: "#1f2a44" },
    { title: "vinland saga", meta: "ch 98", tone: "#3b4a3f" },
    { title: "project hail mary", meta: "p 88", tone: "#8a5a2b" },
  ],
};

const SPINES = [
  { w: 22, h: 110, c: "#2b3138" },
  { w: 30, h: 92, c: "#d8c9a8" },
  { w: 18, h: 120, c: "#3a3f55" },
  { w: 26, h: 78, c: "#c9b48a" },
  { w: 34, h: 104, c: "#2f3b3a" },
  { w: 20, h: 86, c: "#e2d6bd" },
  { w: 28, h: 116, c: "#4a3a36" },
  { w: 24, h: 96, c: "#bfa98a" },
];

const HEADLINE = ["remember", "where", "you"];
const MANIFESTO = "no feed. no followers. no algorithm. just your place in everything you love.".split(" ");

const HeroDemo = () => {
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(DEMO.map((d) => [d.id, d.start])),
  );

  return (
    <motion.div
      className="relative min-w-0 flex-[1_1_420px] border border-line bg-soft p-5 sm:p-7"
      initial={{ opacity: 0, y: 40, rotate: 1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 1, ease: easeOut, delay: 0.35 }}
    >
      <div className="mb-4 flex items-baseline justify-between">
        <span className="font-serif text-[22px]">continue</span>
        <motion.span
          className="font-mono text-[11px] text-accent"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          try it: tap +1
        </motion.span>
      </div>
      <motion.div className="flex flex-col gap-2.5" initial="hidden" animate="show" variants={stagger(0.12, 0.7)}>
        {DEMO.map((d) => {
          const v = counts[d.id];
          const pct = Math.min(100, Math.round((v / d.total) * 100));
          return (
            <motion.div key={d.id} variants={fadeUp} className="flex items-center gap-3.5 border border-line bg-white p-3.5">
              <span className="h-[60px] w-11 shrink-0" style={{ background: d.tone }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{d.title}</div>
                <div className="mt-0.5 mb-2 text-[13px] text-muted">
                  {d.unit} <AnimatedNumber value={v} /> of {d.total}
                </div>
                <div className="h-1 bg-track">
                  <motion.div
                    className="h-1 bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.86 }}
                whileHover={{ y: -2 }}
                onClick={() => setCounts((c) => ({ ...c, [d.id]: Math.min(d.total, c[d.id] + d.by) }))}
                aria-label={`log ${d.step} for ${d.title}`}
                className="h-11 min-w-[52px] shrink-0 bg-ink px-3 text-sm font-medium text-white"
              >
                {d.step}
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: easeOut, delay: 1.3 }}
        className="mt-4 flex gap-3.5 border border-dashed border-line-strong bg-paper px-4 py-3.5"
      >
        <span className="pt-1 font-mono text-[11px] whitespace-nowrap text-muted">oct 3 · ch 98</span>
        <span className="font-serif text-[17px] leading-snug text-[#3b3933] italic">
          stopped at the start of the new arc. good place to pause.
        </span>
      </motion.div>
    </motion.div>
  );
};

const ScatteredList = () => {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -120px 0px" });

  return (
    <ul ref={ref} className="flex min-w-0 flex-[1_1_440px] flex-wrap content-start gap-2.5">
      {SCATTERED.map((item, i) => (
        <motion.li
          key={item}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: easeOut, delay: i * 0.08 }}
          className="relative border border-line bg-white px-4 py-3 text-[15px] text-muted"
        >
          {item}
          <motion.span
            aria-hidden="true"
            className="absolute top-1/2 right-3 left-3 h-px origin-left bg-muted"
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.45, ease: easeOut, delay: 0.7 + i * 0.12 }}
          />
        </motion.li>
      ))}
      <motion.li
        initial={{ opacity: 0, scale: 0.8 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.7 + SCATTERED.length * 0.12 + 0.2 }}
        className="flex items-center gap-2.5 bg-ink px-4 py-3 text-[15px] font-medium text-white"
      >
        <span aria-hidden="true" className="ribbon block h-4 w-2.5 bg-accent" />
        one shelf in plotify
      </motion.li>
    </ul>
  );
};

const LoopingStepper = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [n, setN] = useState(21);

  useEffect(() => {
    if (!inView) return;
    const timer = window.setInterval(() => setN((v) => (v >= 26 ? 21 : v + 1)), 1400);
    return () => window.clearInterval(timer);
  }, [inView]);

  return (
    <div ref={ref} className="flex h-[200px] flex-col justify-center gap-4 border border-line bg-paper p-5">
      <div className="flex items-center justify-center gap-6">
        <span className="flex h-11 w-11 items-center justify-center border border-line-strong bg-white">
          <Minus size={18} />
        </span>
        <span className="font-serif text-[56px] leading-none">
          <AnimatedNumber value={n} />
        </span>
        <motion.span
          key={n}
          initial={{ scale: 0.85 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
          className="flex h-11 w-11 items-center justify-center bg-ink text-white"
        >
          <Plus size={18} />
        </motion.span>
      </div>
      <p className="text-center font-serif text-[15px] text-body italic">“14:32, right after the festival”</p>
    </div>
  );
};

const GrowingShelf = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="flex h-[200px] flex-col justify-between border border-line bg-paper px-5 pt-5">
      <StarDisplay rating={inView ? 4 : 0} size={26} />
      <div className="flex items-end gap-[3px] border-b-[5px] border-ink" aria-hidden="true">
        {SPINES.map((s, i) => (
          <motion.span
            key={i}
            className="block origin-bottom"
            style={{ width: s.w, height: s.h, background: s.c }}
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: 1 } : {}}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.2 + i * 0.07 }}
          />
        ))}
      </div>
    </div>
  );
};

const ManifestoWord = ({ word, index, total, progress }: { word: string; index: number; total: number; progress: MotionValue<number> }) => {
  const start = index / total;
  const opacity = useTransform(progress, [start, start + 1 / total], [0.18, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block pr-[0.25em]">
      {word}
    </motion.span>
  );
};

const Manifesto = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 45%"] });

  return (
    <section className="relative bg-night text-paper">
      <motion.span
        aria-hidden="true"
        className="ribbon absolute top-0 left-[max(20px,calc(50%-560px))] block h-24 w-7 origin-top bg-accent"
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: easeOut }}
      />
      <div ref={ref} className="mx-auto max-w-[1200px] px-5 pt-36 pb-28 sm:px-10">
        <p className="max-w-[900px] font-serif text-[40px] leading-[1.08] tracking-[-0.025em] sm:text-[60px]" aria-label={MANIFESTO.join(" ")}>
          {MANIFESTO.map((word, i) => (
            <ManifestoWord key={i} word={word} index={i} total={MANIFESTO.length} progress={scrollYProgress} />
          ))}
        </p>
      </div>
    </section>
  );
};

const Home = () => {
  const { isSignedIn } = useAuth();
  const primary = isSignedIn ? { to: "/screen", label: "go to your shelf" } : { to: "/signup", label: "start your shelf" };
  const secondary = isSignedIn ? { to: "/read", label: "open read" } : { to: "/signin", label: "i already have one" };

  useEffect(() => {
    document.title = "plotify - personal media journal";
    const params = new URLSearchParams(window.location.search);

    if (params.get("err_code")) {
      window.history.replaceState({}, "", "/");
    }
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-paper text-ink lowercase">
      <Navbar />

      <main>
        <section className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-16 gap-y-14 px-5 pt-14 pb-24 sm:px-10 sm:pt-20 sm:pb-28">
          <div className="min-w-0 flex-[1_1_500px]">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="eyebrow mb-5"
            >
              a personal media journal
            </motion.p>
            <h1 className="mb-7 font-serif text-[56px] leading-[0.98] tracking-[-0.035em] sm:text-[88px]">
              {HEADLINE.map((word, i) => (
                <span key={word} className="inline-block overflow-hidden pr-[0.22em] pb-[0.08em] align-bottom">
                  <motion.span
                    className="inline-block"
                    initial={{ y: "105%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.9, ease: easeOut, delay: 0.1 + i * 0.08 }}
                  >
                    {word}
                  </motion.span>
                </span>
              ))}
              <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.em
                  className="inline-block"
                  initial={{ y: "105%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, ease: easeOut, delay: 0.1 + HEADLINE.length * 0.08 }}
                >
                  left off.
                </motion.em>
              </span>
            </h1>
            <motion.div initial="hidden" animate="show" variants={stagger(0.1, 0.55)}>
              <motion.p variants={fadeUp} className="mb-9 max-w-[500px] text-[19px] leading-relaxed text-body">
                a quiet journal for the shows you watch and the books you read. log the last episode or page in one tap,
                and pick up exactly where you stopped.
              </motion.p>
              <motion.div variants={fadeUp} className="mb-5 flex flex-wrap gap-3">
                <Link to={primary.to} className={btn("primary", "lg", "group")}>
                  {primary.label}
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#how" className={btn("secondary", "lg")}>
                  see how it works
                </a>
              </motion.div>
              <motion.p variants={fadeUp} className="text-[13px] text-muted">
                shows, series, books and manga · sign in with email or google
              </motion.p>
            </motion.div>
          </div>

          <HeroDemo />
        </section>

        <section id="why" className="border-t border-ink">
          <div className="mx-auto flex max-w-[1200px] flex-wrap gap-x-16 gap-y-12 px-5 py-24 sm:px-10">
            <Reveal className="min-w-0 flex-[1_1_420px]">
              <p className="eyebrow mb-4">the problem</p>
              <h2 className="mb-5 font-serif text-[40px] leading-[1.04] tracking-[-0.025em] sm:text-[52px]">
                your progress is scattered across a dozen places.
              </h2>
              <p className="max-w-[440px] text-[17px] leading-relaxed text-body">
                the content lives everywhere: streaming sites, reading apps, browser tabs. your place in it shouldn't.
                plotify is the one spot that remembers.
              </p>
            </Reveal>
            <ScatteredList />
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-line bg-white">
          <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-10">
            <Reveal>
              <h2 className="mb-12 font-serif text-[40px] leading-[1.04] tracking-[-0.025em] sm:text-[52px]">
                three moves. that's the whole app.
              </h2>
            </Reveal>
            <div className="grid gap-8 md:grid-cols-3">
              <Reveal className="flex flex-col gap-5">
                <div className="flex h-[200px] flex-col gap-2.5 border border-line bg-paper p-5">
                  <span className="text-[11px] text-muted">title</span>
                  <span className="flex h-10 items-center border border-ink bg-white px-3 text-sm">
                    frieren
                    <motion.span
                      className="ml-0.5 inline-block h-4 w-px bg-ink"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </span>
                  <span className="flex gap-1.5">
                    <span className="bg-ink px-3 py-1.5 text-xs text-white">screen</span>
                    <span className="border border-line-strong px-3 py-1.5 text-xs text-muted">read</span>
                  </span>
                  <span className="flex h-10 items-center border border-line bg-white px-3 text-sm text-muted">crunchyroll</span>
                </div>
                <div>
                  <span className="font-mono text-xs text-muted">01</span>
                  <h3 className="mt-1.5 mb-2 font-serif text-[28px]">add it</h3>
                  <p className="text-[15px] leading-relaxed text-body">a title, a shelf, and where you watch or read it. a cover if you like.</p>
                </div>
              </Reveal>
              <Reveal className="flex flex-col gap-5" delay={0.1}>
                <LoopingStepper />
                <div>
                  <span className="font-mono text-xs text-muted">02</span>
                  <h3 className="mt-1.5 mb-2 font-serif text-[28px]">log it</h3>
                  <p className="text-[15px] leading-relaxed text-body">one tap for the next episode or page, right from your shelf.</p>
                </div>
              </Reveal>
              <Reveal className="flex flex-col gap-5" delay={0.2}>
                <GrowingShelf />
                <div>
                  <span className="font-mono text-xs text-muted">03</span>
                  <h3 className="mt-1.5 mb-2 font-serif text-[28px]">finish it</h3>
                  <p className="text-[15px] leading-relaxed text-body">rate it out of five and it joins your finished shelf.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="shelves" className="mx-auto max-w-[1200px] px-5 py-24 sm:px-10">
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-serif text-[40px] leading-[1.04] tracking-[-0.025em] sm:text-[52px]">two shelves, one place.</h2>
            <p className="max-w-[380px] leading-relaxed text-body">
              episodes for what you watch. pages and chapters for what you read. each counted the way it should be.
            </p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-2">
            {(["screen", "read"] as const).map((shelf, col) => (
              <Reveal key={shelf} delay={col * 0.1} className="border-t-2 border-ink">
                <div className="flex justify-between py-4 font-mono text-xs text-muted">
                  <span>{shelf}</span>
                  <span>{shelf === "screen" ? "by episode" : "by page or chapter"}</span>
                </div>
                <motion.ul initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger(0.1, 0.2)}>
                  {SHELVES[shelf].map((row) => (
                    <motion.li
                      key={row.title}
                      variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: easeOut } } }}
                      className="flex items-center gap-3.5 border-t border-line py-3 last:border-b"
                    >
                      <span className="h-[42px] w-[30px] shrink-0" style={{ background: row.tone }} />
                      <span className="flex-1 font-medium">{row.title}</span>
                      <span className="font-mono text-[13px]">{row.meta}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              </Reveal>
            ))}
          </div>
        </section>

        <Manifesto />

        <section className="mx-auto max-w-[1200px] px-5 py-32 text-center sm:px-10">
          <Reveal>
            <h2 className="mb-5 font-serif text-[52px] leading-none tracking-[-0.03em] sm:text-[72px]">your list is waiting.</h2>
            <p className="mx-auto mb-9 max-w-[440px] text-[17px] leading-relaxed text-body">
              add what you're watching tonight. it takes less than a minute.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to={primary.to} className={btn("primary", "lg", "group")}>
                {primary.label}
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to={secondary.to} className={btn("secondary", "lg")}>
                {secondary.label}
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
