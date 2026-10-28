import { Link, useNavigate, useParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { ChevronLeft, ChevronRight, Download, Pause, Play, RotateCcw, Share2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Cover from "../../components/ui/Cover";
import CountUp from "../../components/ui/CountUp";
import { StarDisplay } from "../../components/ui/Stars";
import { getRecap } from "../../services/media.service";
import { mediaKeys, requireToken } from "../../lib/queries";
import { easeOut } from "../../lib/motion";
import { formatDay, MONTHS, personaOf, recapOpen, WEEKDAYS, type Persona } from "../../lib/recap";
import { drawRecapCard } from "../../lib/recapCard";
import { btn, unitOf } from "../../lib/ui";
import type { Recap as RecapData, RecapItem } from "../../types/media";

// each slide stays up this long unless they tap on, or hold to pause
const DURATION = 7000;
const PAPER = "#fbfaf7";
const INK = "#17160f";

type Slide = { id: string; bg: string; dark?: boolean; body: ReactNode };

const scene: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: easeOut } },
};

const Kicker = ({ children }: { children: ReactNode }) => (
  <motion.p variants={rise} className="mb-4 font-mono text-[13px] tracking-wide opacity-70">
    {children}
  </motion.p>
);

const Big = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <motion.div
    variants={rise}
    className={`font-serif leading-[0.88] tracking-[-0.035em] break-words ${className || "text-[clamp(88px,26vw,168px)]"}`}
  >
    {children}
  </motion.div>
);

const plural = (n: number, word: string) => `${word}${n === 1 ? "" : "s"}`;

const Pick = ({ item, label }: { item: RecapItem; label: string }) => (
  <motion.div variants={rise} className="flex items-center gap-4">
    <Cover title={item.title} src={item.image_url} showTitle={false} className="aspect-[3/4] w-20 shrink-0 shadow-lg" />
    <div className="min-w-0">
      <p className="mb-1 font-mono text-xs opacity-70">{label}</p>
      <p className="font-serif text-[28px] leading-tight normal-case">{item.title}</p>
      <p className="mt-1 text-sm opacity-70">{formatDay(item.completed_at)}</p>
    </div>
  </motion.div>
);

const buildSlides = (r: RecapData, persona: Persona, actions: ReactNode): Slide[] => {
  const slides: Slide[] = [];
  const { totals, progress } = r;

  slides.push({
    id: "intro",
    bg: INK,
    body: (
      <div className="flex h-full flex-col justify-between">
        <Kicker>plotify · your year in stories</Kicker>
        <div>
          <Big className="text-[clamp(120px,34vw,220px)] text-accent">{r.year}</Big>
          <motion.p variants={rise} className="mt-6 max-w-xs font-serif text-[32px] leading-tight">
            everything you watched and read, in one look back.
          </motion.p>
        </div>
        <motion.p variants={rise} className="text-sm opacity-60">
          tap to begin →
        </motion.p>
      </div>
    ),
  });

  if (!totals.finished) {
    slides.push({
      id: "empty",
      bg: "#24395a",
      body: (
        <div className="flex h-full flex-col justify-center">
          <Kicker>{r.year}, so far</Kicker>
          <Big className="text-[clamp(64px,17vw,112px)]">a quiet year.</Big>
          <motion.p variants={rise} className="mt-6 max-w-sm text-lg opacity-80">
            nothing finished in {r.year} yet. finish a title and it shows up here.
          </motion.p>
          <motion.div variants={rise} className="mt-10" onPointerDown={(e) => e.stopPropagation()}>
            <Link to="/screen" className={btn("accent", "lg")}>
              open your shelf
            </Link>
          </motion.div>
        </div>
      ),
    });
    return slides;
  }

  slides.push({
    id: "count",
    bg: "#c2410c",
    body: (
      <div className="flex h-full flex-col justify-center">
        <Kicker>this year you finished</Kicker>
        <Big className="text-[clamp(140px,44vw,280px)]">
          <CountUp value={totals.finished} />
        </Big>
        <motion.p variants={rise} className="font-serif text-[40px] leading-none">
          {plural(totals.finished, "title")}.
        </motion.p>
        <motion.div variants={rise} className="mt-12 grid grid-cols-2 border-t border-white/30 pt-5">
          <div>
            <p className="font-serif text-5xl">{totals.screen}</p>
            <p className="mt-1 text-sm opacity-80">on screen</p>
          </div>
          <div>
            <p className="font-serif text-5xl">{totals.read}</p>
            <p className="mt-1 text-sm opacity-80">on the page</p>
          </div>
        </motion.div>
        {totals.added > totals.finished && (
          <motion.p variants={rise} className="mt-8 text-[15px] opacity-80">
            and {totals.added} new {plural(totals.added, "title")} found a spot on your shelves.
          </motion.p>
        )}
      </div>
    ),
  });

  if (progress.episodes || progress.pages) {
    const both = progress.episodes > 0 && progress.pages > 0;
    slides.push({
      id: "progress",
      bg: "#24395a",
      body: (
        <div className="flex h-full flex-col justify-center">
          <Kicker>that adds up to</Kicker>
          {progress.episodes > 0 && (
            <>
              <Big className={both ? "text-[clamp(80px,22vw,140px)]" : undefined}>
                <CountUp value={progress.episodes} />
              </Big>
              <motion.p variants={rise} className="mb-8 font-serif text-[32px]">
                {plural(progress.episodes, "episode")}
              </motion.p>
            </>
          )}
          {progress.pages > 0 && (
            <>
              <Big className={both ? "text-[clamp(80px,22vw,140px)]" : undefined}>
                <CountUp value={progress.pages} />
              </Big>
              <motion.p variants={rise} className="font-serif text-[32px]">
                pages & chapters
              </motion.p>
            </>
          )}
          {r.biggest && r.biggest.units > 1 && (
            <motion.p variants={rise} className="mt-12 border-t border-white/30 pt-5 text-[17px] leading-relaxed">
              the longest one: <span className="font-serif text-2xl normal-case">{r.biggest.title}</span>,{" "}
              {r.biggest.units.toLocaleString("en-US")} {unitOf(r.biggest.type).plural}.
            </motion.p>
          )}
        </div>
      ),
    });
  }

  if (r.topMonth != null) {
    const max = Math.max(...r.months);
    slides.push({
      id: "months",
      bg: "#2f6a3a",
      body: (
        <div className="flex h-full flex-col justify-center">
          <Kicker>your busiest month was</Kicker>
          <Big className="text-[clamp(64px,18vw,124px)]">{MONTHS[r.topMonth]}</Big>
          <motion.p variants={rise} className="mt-3 text-lg opacity-85">
            {r.months[r.topMonth]} {plural(r.months[r.topMonth], "title")} finished.
          </motion.p>
          <motion.div variants={rise} className="mt-10 flex h-44 items-end gap-1.5" aria-hidden="true">
            {r.months.map((count, i) => (
              <div key={i} className="flex h-full flex-1 flex-col justify-end gap-2">
                <motion.div
                  className={i === r.topMonth ? "bg-paper" : "bg-paper/35"}
                  style={{ height: `${Math.max(3, (count / max) * 100)}%`, transformOrigin: "bottom" }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.5 + i * 0.05, duration: 0.8, ease: easeOut }}
                />
                <span className="text-center font-mono text-[10px] opacity-70">{MONTHS[i][0]}</span>
              </div>
            ))}
          </motion.div>
          {r.topWeekday != null && (
            <motion.p variants={rise} className="mt-8 text-[17px]">
              you finish the most on <span className="font-serif text-2xl">{WEEKDAYS[r.topWeekday]}</span>.
              {r.busiestDay && (
                <span className="mt-1 block opacity-80">
                  and on {formatDay(r.busiestDay.date)} you wrapped up {r.busiestDay.count} in a single day.
                </span>
              )}
            </motion.p>
          )}
        </div>
      ),
    });
  }

  if (r.topCategories.length) {
    const [first, ...rest] = r.topCategories;
    slides.push({
      id: "genres",
      bg: "#4a3a55",
      body: (
        <div className="flex h-full flex-col justify-center">
          <Kicker>you kept coming back to</Kicker>
          <Big className="text-[clamp(64px,18vw,124px)]">{first[0]}</Big>
          <motion.p variants={rise} className="mt-3 text-lg opacity-85">
            {first[1]} {plural(first[1], "title")}.
          </motion.p>
          {rest.length > 0 && (
            <ol className="mt-12 border-t border-white/30">
              {rest.map(([name, count], i) => (
                <motion.li
                  key={name}
                  variants={rise}
                  className="flex items-baseline gap-4 border-b border-white/15 py-3.5"
                >
                  <span className="font-mono text-xs opacity-60">0{i + 2}</span>
                  <span className="flex-1 font-serif text-[28px] leading-none">{name}</span>
                  <span className="font-mono text-sm opacity-70">{count}</span>
                </motion.li>
              ))}
            </ol>
          )}
        </div>
      ),
    });
  }

  if (r.topRated.length) {
    const [best, ...others] = r.topRated;
    slides.push({
      id: "rated",
      bg: PAPER,
      dark: true,
      body: (
        <div className="flex h-full flex-col justify-center">
          <Kicker>your highest rated</Kicker>
          <motion.div variants={rise} className="flex items-end gap-5">
            <motion.div
              initial={{ rotate: -6, scale: 0.9 }}
              animate={{ rotate: -2, scale: 1 }}
              transition={{ delay: 0.3, duration: 1, ease: easeOut }}
              className="w-[42%] shrink-0"
            >
              <Cover title={best.title} src={best.image_url} className="aspect-[3/4] w-full shadow-2xl" titleClassName="text-2xl" />
            </motion.div>
            <div className="min-w-0 pb-1">
              <p className="font-serif text-[34px] leading-[1.05] normal-case">{best.title}</p>
              <div className="mt-3">
                <StarDisplay rating={best.rating ?? 0} size={18} />
              </div>
            </div>
          </motion.div>
          {others.length > 0 && (
            <motion.div variants={rise} className="mt-10 grid grid-cols-4 gap-3">
              {others.map((m) => (
                <div key={m.id} className="min-w-0">
                  <Cover title={m.title} src={m.image_url} className="aspect-[3/4] w-full" titleClassName="text-xs" />
                  <p className="mt-1.5 truncate text-xs normal-case">{m.title}</p>
                  <StarDisplay rating={m.rating ?? 0} size={10} />
                </div>
              ))}
            </motion.div>
          )}
        </div>
      ),
    });
  }

  if (r.first && r.last) {
    slides.push({
      id: "bookends",
      bg: "#6b3b2b",
      body: (
        <div className="flex h-full flex-col justify-center gap-12">
          <div>
            <Kicker>the year opened with</Kicker>
            <Pick item={r.first} label="first finish" />
          </div>
          <div>
            <Kicker>and closed with</Kicker>
            <Pick item={r.last} label="latest finish" />
          </div>
        </div>
      ),
    });
  }

  slides.push({
    id: "persona",
    bg: INK,
    body: (
      <div className="flex h-full flex-col justify-center">
        <Kicker>so, who were you this year?</Kicker>
        <Big className="text-[clamp(64px,17vw,116px)] text-accent italic">{persona.title}</Big>
        <motion.p variants={rise} className="mt-8 max-w-sm font-serif text-[30px] leading-tight">
          {persona.line}
        </motion.p>
        {persona.trait && (
          <motion.p variants={rise} className="mt-6 text-[17px] opacity-75">
            and when it came to ratings, {persona.trait}
            {r.averageRating != null && <> · {r.averageRating} on average</>}.
          </motion.p>
        )}
      </div>
    ),
  });

  const tiles = (
    [
      ["finished", String(totals.finished)],
      ["on screen", String(totals.screen)],
      ["on the page", String(totals.read)],
      progress.episodes ? ["episodes", progress.episodes.toLocaleString("en-US")] : null,
      progress.pages ? ["pages", progress.pages.toLocaleString("en-US")] : null,
      r.topCategories[0] ? ["top genre", r.topCategories[0][0]] : null,
      r.topMonth != null ? ["busiest month", MONTHS[r.topMonth]] : null,
      r.averageRating != null ? ["average rating", `${r.averageRating} / 5`] : null,
    ] as ([string, string] | null)[]
  )
    .filter((tile) => tile !== null)
    .slice(0, 6);

  slides.push({
    id: "summary",
    bg: PAPER,
    dark: true,
    body: (
      <div className="flex h-full flex-col">
        <Kicker>{r.year} on plotify</Kicker>
        <motion.p variants={rise} className="font-serif text-[clamp(44px,12vw,64px)] leading-none text-accent italic">
          {persona.title}
        </motion.p>
        <motion.dl variants={rise} className="mt-8 grid grid-cols-2 border-t border-ink">
          {tiles.map(([label, value]) => (
            <div key={label} className="border-b border-line py-4 pr-3">
              <dd className="truncate font-serif text-[30px] leading-none">{value}</dd>
              <dt className="mt-1.5 text-[13px] text-muted">{label}</dt>
            </div>
          ))}
        </motion.dl>
        {r.topRated[0] && (
          <motion.p variants={rise} className="mt-5 text-[15px] text-muted">
            highest rated: <span className="text-ink normal-case">{r.topRated[0].title}</span>
          </motion.p>
        )}
        <motion.div variants={rise} className="mt-auto pt-8">
          {actions}
        </motion.div>
      </div>
    ),
  });

  return slides;
};

const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const Screen = ({ children }: { children: ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-night px-6 text-center text-paper lowercase">
    <div className="max-w-sm">{children}</div>
  </div>
);

const Recap = () => {
  const params = useParams();
  const year = Number(params.year);
  const navigate = useNavigate();
  const { userId, getToken } = useAuth();
  const open = Number.isInteger(year) && recapOpen(year);

  const { data, isError, refetch } = useQuery({
    queryKey: mediaKeys.recap(userId, year),
    queryFn: async ({ signal }) => getRecap(await requireToken(getToken), year, signal),
    enabled: !!userId && open,
  });

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [sharing, setSharing] = useState<"" | "save" | "share">("");
  const elapsed = useRef(0);
  const fill = useRef<HTMLDivElement>(null);
  const press = useRef<{ t: number } | null>(null);

  useEffect(() => {
    document.title = `recap ${params.year} · plotify`;
  }, [params.year]);

  const close = useCallback(() => navigate("/profile"), [navigate]);

  const exportCard = useCallback(
    async (mode: "save" | "share") => {
      if (!data) return;
      setSharing(mode);
      try {
        const blob = await drawRecapCard(data);
        const name = `plotify-recap-${data.year}.png`;
        const file = new File([blob], name, { type: "image/png" });
        if (mode === "share" && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: `my ${data.year} on plotify` });
            return;
          } catch (err) {
            if ((err as Error).name === "AbortError") return;
          }
        }
        saveBlob(blob, name);
      } catch (err) {
        console.log(err);
      } finally {
        setSharing("");
      }
    },
    [data],
  );

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const slides = useMemo(() => {
    if (!data) return [];
    const actions = (
      // buttons sit inside the tap area, so keep their presses from flipping slides
      <div className="flex flex-wrap gap-2" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
        <button type="button" className={btn("primary", "lg")} disabled={!!sharing} onClick={() => exportCard("save")}>
          <Download size={16} /> {sharing === "save" ? "drawing…" : "save image"}
        </button>
        {canShare && (
          <button type="button" className={btn("accent", "lg")} disabled={!!sharing} onClick={() => exportCard("share")}>
            <Share2 size={16} /> share
          </button>
        )}
        <button type="button" className={btn("secondary", "lg")} onClick={() => setIndex(0)}>
          <RotateCcw size={16} /> again
        </button>
      </div>
    );
    return buildSlides(data, personaOf(data), actions);
  }, [data, sharing, exportCard, canShare]);

  const last = slides.length - 1;
  const next = useCallback(() => setIndex((i) => Math.min(i + 1, last)), [last]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // fresh timer for every slide
  useEffect(() => {
    elapsed.current = 0;
    if (fill.current) fill.current.style.width = index === last ? "100%" : "0%";
  }, [index, last]);

  useEffect(() => {
    if (paused || holding || index >= last) return;
    let before = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      // a background tab pauses frames; don't jump ahead when it comes back
      elapsed.current += Math.min(now - before, 100);
      before = now;
      const p = Math.min(1, elapsed.current / DURATION);
      if (fill.current) fill.current.style.width = `${p * 100}%`;
      if (p >= 1) next();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, last, paused, holding, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") close();
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, close]);

  if (!open) {
    const thisYear = new Date().getFullYear();
    return (
      <Screen>
        <p className="mb-3 font-mono text-sm text-dim">plotify recap</p>
        <h1 className="mb-4 font-serif text-5xl leading-none">
          {year === thisYear ? "not wrapped yet." : "no recap here."}
        </h1>
        <p className="mb-8 text-dim">
          {year === thisYear
            ? `your ${year} recap opens on december 1st. keep finishing things until then.`
            : "pick a year from your profile."}
        </p>
        <Link to="/profile" className={btn("accent", "lg")}>
          back to profile
        </Link>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <h1 className="mb-4 font-serif text-5xl leading-none">couldn't load it.</h1>
        <p className="mb-8 text-dim">check your connection and try again.</p>
        <div className="flex justify-center gap-2">
          <button type="button" className={btn("accent", "lg")} onClick={() => void refetch()}>
            try again
          </button>
          <Link to="/profile" className={btn("secondary", "lg")}>
            back
          </Link>
        </div>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <motion.p
          className="font-serif text-4xl"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          gathering your {year}…
        </motion.p>
      </Screen>
    );
  }

  const slide = slides[index];
  const fg = slide.dark ? INK : PAPER;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night lowercase"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <button
        type="button"
        onClick={prev}
        disabled={index === 0}
        aria-label="previous"
        className="mr-6 hidden h-12 w-12 items-center justify-center text-paper/70 transition-colors hover:text-paper disabled:opacity-20 sm:flex"
      >
        <ChevronLeft size={28} />
      </button>

      <motion.section
        aria-roledescription="story"
        aria-label={`${data.year} recap, ${index + 1} of ${slides.length}`}
        className="relative h-full w-full overflow-hidden select-none sm:h-[min(92vh,860px)] sm:w-auto sm:aspect-[9/16]"
        animate={{ backgroundColor: slide.bg, color: fg }}
        transition={{ duration: 0.6, ease: easeOut }}
        onPointerDown={() => {
          press.current = { t: Date.now() };
          setHolding(true);
        }}
        onPointerUp={(e) => {
          setHolding(false);
          const p = press.current;
          press.current = null;
          // a long press only pauses; a quick tap moves, the left third goes back
          if (!p || Date.now() - p.t > 300) return;
          const rect = e.currentTarget.getBoundingClientRect();
          if (e.clientX - rect.left < rect.width / 3) prev();
          else next();
        }}
        onPointerCancel={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
      >
        <div className="absolute inset-x-0 top-0 z-10 px-4 pt-4">
          <div className="flex gap-1">
            {slides.map((s, i) => (
              <div key={s.id} className="relative h-[3px] flex-1 overflow-hidden">
                <div className="absolute inset-0" style={{ backgroundColor: fg, opacity: 0.25 }} />
                {/* the active bar's width is driven by the timer, outside of react renders */}
                <div
                  ref={i === index ? fill : undefined}
                  className="absolute inset-y-0 left-0"
                  style={{ backgroundColor: fg, ...(i === index ? {} : { width: i < index ? "100%" : "0%" }) }}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <span className="font-mono text-xs opacity-70">recap {data.year}</span>
            <div className="flex items-center gap-1">
              {index < last && (
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? "play" : "pause"}
                  className="flex h-9 w-9 items-center justify-center opacity-80 hover:opacity-100"
                >
                  {paused ? <Play size={18} /> : <Pause size={18} />}
                </button>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="close recap"
                className="flex h-9 w-9 items-center justify-center opacity-80 hover:opacity-100"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            variants={scene}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="h-full px-7 pt-24 pb-10 sm:px-9"
          >
            {slide.body}
          </motion.div>
        </AnimatePresence>
      </motion.section>

      <button
        type="button"
        onClick={next}
        disabled={index === last}
        aria-label="next"
        className="ml-6 hidden h-12 w-12 items-center justify-center text-paper/70 transition-colors hover:text-paper disabled:opacity-20 sm:flex"
      >
        <ChevronRight size={28} />
      </button>
    </motion.div>
  );
};

export default Recap;
