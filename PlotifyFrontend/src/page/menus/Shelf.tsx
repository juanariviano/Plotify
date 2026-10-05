import { Link } from "react-router";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowUpRight, LayoutGrid, List, Minus, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import Cover from "../../components/ui/Cover";
import LoadMore from "../../components/ui/LoadMore";
import AnimatedNumber from "../../components/ui/AnimatedNumber";
import { StarDisplay } from "../../components/ui/Stars";
import { easeOut, fadeUp, stagger } from "../../lib/motion";
import { DEFAULT_PAGE_SIZE, useMediaInfinite } from "../../hooks/useMediaInfinite";
import { useLogProgress } from "../../hooks/useLogProgress";
import { btn, isUrl, sourceLabel, unitOf } from "../../lib/ui";
import type { Media } from "../../types/media";

type ShelfType = "screen" | "read";
type Tab = "ongoing" | "completed";
type View = "grid" | "list";

const VIEW_KEY = "plotify:shelf-view";

const readView = (): View => {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
};

const QuickLog = ({ item, compact = false }: { item: Media; compact?: boolean }) => {
  const log = useLogProgress();
  const unit = unitOf(item.type);
  const step = (delta: number) => {
    const next = Math.max(0, item.last_episode + delta);
    if (next !== item.last_episode) log.mutate({ item, next });
  };

  if (compact) {
    return (
      <motion.button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          step(1);
        }}
        aria-label={`log one more ${unit.long} of ${item.title}`}
        className="absolute right-2 bottom-2 flex h-10 min-w-10 items-center justify-center bg-white px-3 font-mono text-sm font-medium text-ink shadow-[0_6px_20px_-6px_rgb(23_22_15/0.45)] transition-opacity duration-300 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
        whileTap={{ scale: 0.88 }}
      >
        +1
      </motion.button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        onClick={() => step(-1)}
        aria-label={`one ${unit.long} back`}
        className="flex h-9 w-9 items-center justify-center border border-line bg-white text-muted transition-colors hover:border-ink hover:text-ink"
      >
        <Minus size={14} />
      </motion.button>
      <span className="min-w-[72px] text-center font-mono text-[13px]">
        {unit.short} <AnimatedNumber value={item.last_episode} />
      </span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        onClick={() => step(1)}
        aria-label={`one more ${unit.long}`}
        className="flex h-9 w-9 items-center justify-center border border-ink bg-white text-ink transition-colors hover:bg-ink hover:text-white"
      >
        <Plus size={14} />
      </motion.button>
    </div>
  );
};

const GridCard = ({ item, completed }: { item: Media; completed: boolean }) => {
  const unit = unitOf(item.type);
  return (
    <motion.article variants={fadeUp} layout className="group relative">
      <Link to={`/card?id=${item.id}`} className="block">
        <motion.div
          className="relative"
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
        >
          <Cover
            title={item.title}
            src={item.image_url}
            className="aspect-[3/4] w-full shadow-[0_1px_0_rgb(23_22_15/0.06)] transition-shadow duration-500 group-hover:shadow-[0_18px_40px_-18px_rgb(23_22_15/0.45)]"
            titleClassName="text-xl"
          />
          {completed && (
            <span className="absolute top-2 left-2 bg-done px-2 py-0.5 text-[11px] text-white">finished</span>
          )}
        </motion.div>
        <div className="flex flex-col gap-1 pt-3">
          <h2 className="line-clamp-2 text-[15px] leading-snug font-medium">{item.title}</h2>
          {completed ? (
            <span className="flex items-center gap-2 font-mono text-xs text-muted">
              <StarDisplay rating={item.rating} size={12} /> {item.rating}
            </span>
          ) : (
            <span className="font-mono text-xs text-muted">
              {unit.long} <AnimatedNumber value={item.last_episode} />
            </span>
          )}
        </div>
      </Link>
      {!completed && (
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[3/4] transition-transform duration-300 group-hover:-translate-y-1 [&>*]:pointer-events-auto">
          <QuickLog item={item} compact />
        </div>
      )}
    </motion.article>
  );
};

const ListRow = ({ item, completed }: { item: Media; completed: boolean }) => (
  <motion.li
    variants={fadeUp}
    layout
    className="group flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line py-3 transition-colors hover:bg-white sm:flex-nowrap sm:px-2"
  >
    <Link to={`/card?id=${item.id}`} className="flex min-w-0 flex-1 items-center gap-4">
      <Cover title={item.title} src={item.image_url} showTitle={false} className="h-[50px] w-9 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate font-medium transition-colors group-hover:text-accent">{item.title}</span>
        <span className="block truncate text-xs text-muted">
          {item.category?.length ? item.category.join(" · ") : "no category"}
        </span>
      </span>
    </Link>

    {item.source ? (
      isUrl(item.source) ? (
        <a
          href={item.source}
          target="_blank"
          rel="noreferrer"
          className="hidden w-36 items-center gap-1 truncate font-mono text-xs text-ink hover:text-accent md:flex"
        >
          {sourceLabel(item.source)} <ArrowUpRight size={12} />
        </a>
      ) : (
        <span className="hidden w-36 truncate font-mono text-xs text-muted md:block">{item.source}</span>
      )
    ) : (
      <span className="hidden w-36 md:block" />
    )}

    <div className="ml-auto flex shrink-0 items-center gap-3 sm:ml-0">
      {completed ? (
        <span className="flex items-center gap-2 bg-done-soft px-2.5 py-1 font-mono text-xs text-done">
          <StarDisplay rating={item.rating} size={12} /> {item.rating}
        </span>
      ) : (
        <QuickLog item={item} />
      )}
    </div>
  </motion.li>
);

const SkeletonGrid = () => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" aria-hidden="true">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="flex flex-col gap-3">
        <div className="skeleton aspect-[3/4]" />
        <div className="skeleton h-3.5 w-3/4" />
        <div className="skeleton h-3 w-1/3" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ type, tab, searching }: { type: ShelfType; tab: Tab; searching: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: easeOut }}
    className="flex flex-col items-center gap-5 border border-dashed border-line-strong px-6 py-20 text-center"
  >
    <motion.span
      aria-hidden="true"
      className="ribbon block h-14 w-7 origin-top bg-accent"
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      transition={{ duration: 0.9, ease: easeOut, delay: 0.15 }}
    />
    <h2 className="font-serif text-3xl">
      {searching ? "nothing matches that." : tab === "completed" ? "nothing finished yet." : "an empty shelf."}
    </h2>
    <p className="max-w-sm text-muted">
      {searching
        ? "try a shorter search, or check the other tab."
        : tab === "completed"
          ? "when you finish something, rate it and it lands here."
          : `add the first thing you're ${type === "screen" ? "watching" : "reading"} and log where you stopped.`}
    </p>
    {!searching && tab === "ongoing" && (
      <Link to={`/add?item=${type}`} className={btn("primary", "lg")}>
        <Plus size={18} /> add a title
      </Link>
    )}
  </motion.div>
);

const Shelf = ({ type }: { type: ShelfType }) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<Tab>("ongoing");
  const [view, setView] = useState<View>(readView);
  const searchRef = useRef<HTMLInputElement>(null);

  const ongoing = useMediaInfinite({ type, isCompleted: false, search: debouncedSearch });
  const completed = useMediaInfinite({ type, isCompleted: true, search: debouncedSearch });
  const active = tab === "ongoing" ? ongoing : completed;
  const isCompletedView = tab === "completed";

  useEffect(() => {
    document.title = `${type} · plotify`;
  }, [type]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      // storage can be unavailable (private mode); the toggle still works
    }
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target.matches("input, textarea, [contenteditable]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const verb = type === "screen" ? "watch" : "read";
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "ongoing", label: type === "screen" ? "watching" : "reading", count: ongoing.total },
    { id: "completed", label: "finished", count: completed.total },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink lowercase">
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pt-12 pb-20 sm:px-10">
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger(0.08)}
          className="mb-8 flex flex-wrap items-end justify-between gap-6"
        >
          <motion.div variants={fadeUp}>
            <p className="eyebrow mb-2">your shelf</p>
            <h1 className="font-serif text-[56px] leading-[0.95] tracking-[-0.03em] sm:text-[72px]">{type}</h1>
          </motion.div>
          <motion.p variants={fadeUp} className="pb-2 text-[15px] text-muted">
            <AnimatedNumber value={ongoing.total} className="text-ink" /> in progress ·{" "}
            <AnimatedNumber value={completed.total} className="text-ink" /> finished
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut, delay: 0.15 }}
          className="mb-8 flex flex-col gap-4 border-t border-ink pt-5 lg:flex-row lg:items-center"
        >
          <LayoutGroup id="shelf-tabs">
            <div role="tablist" aria-label="status" className="flex gap-6">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative flex h-11 items-center gap-2 text-[15px] transition-colors ${
                    tab === t.id ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                  <span className="font-mono text-xs text-muted">
                    <AnimatedNumber value={t.count} />
                  </span>
                  {tab === t.id && (
                    <motion.span
                      layoutId="shelf-tab"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </LayoutGroup>

          <div className="flex flex-1 items-center gap-2 lg:justify-end">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 border border-line-strong bg-white px-3 transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgb(23_22_15/0.06)] lg:max-w-sm">
              <Search size={16} className="shrink-0 text-muted" />
              <span className="sr-only">search your {verb}</span>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setTab("ongoing");
                }}
                placeholder={`search your ${verb}`}
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#8f8b81]"
              />
              <AnimatePresence initial={false} mode="wait">
                {search ? (
                  <motion.button
                    key="clear"
                    type="button"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    onClick={() => {
                      setSearch("");
                      setTab("ongoing");
                    }}
                    aria-label="clear search"
                    className="flex h-7 w-7 items-center justify-center text-muted hover:text-ink"
                  >
                    <X size={15} />
                  </motion.button>
                ) : (
                  <motion.kbd
                    key="kbd"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hidden border border-line px-1.5 font-mono text-[11px] text-muted sm:block"
                  >
                    /
                  </motion.kbd>
                )}
              </AnimatePresence>
            </label>

            <LayoutGroup id="shelf-view">
              <div role="group" aria-label="view" className="flex border border-line-strong bg-white p-0.5">
                {(
                  [
                    { id: "grid", icon: LayoutGrid, label: "covers" },
                    { id: "list", icon: List, label: "list" },
                  ] as const
                ).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={view === v.id}
                    aria-label={`${v.label} view`}
                    onClick={() => setView(v.id)}
                    className={`relative flex h-9 w-10 items-center justify-center transition-colors ${
                      view === v.id ? "text-white" : "text-muted hover:text-ink"
                    }`}
                  >
                    {view === v.id && (
                      <motion.span
                        layoutId="view-pill"
                        className="absolute inset-0 bg-ink"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                    <v.icon size={16} className="relative" />
                  </button>
                ))}
              </div>
            </LayoutGroup>
          </div>
        </motion.div>

        {active.isLoading && active.items.length === 0 ? (
          <SkeletonGrid />
        ) : active.total === 0 ? (
          <EmptyState type={type} tab={tab} searching={!!debouncedSearch} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${tab}-${view}-${debouncedSearch}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              {view === "grid" ? (
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={stagger(0.045)}
                  className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                >
                  {active.items.map((item) => (
                    <GridCard key={item.id} item={item} completed={isCompletedView} />
                  ))}
                </motion.div>
              ) : (
                <motion.ul
                  initial="hidden"
                  animate="show"
                  variants={stagger(0.03)}
                  className="border-t border-line"
                >
                  {active.items.map((item) => (
                    <ListRow key={item.id} item={item} completed={isCompletedView} />
                  ))}
                </motion.ul>
              )}

              <LoadMore
                visibleCount={active.visibleCount}
                total={active.total}
                hasMore={active.hasMore}
                isLoading={active.isLoadingMore}
                onLoadMore={active.loadMore}
                pageSize={DEFAULT_PAGE_SIZE}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Shelf;
