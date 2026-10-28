import { Link, useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import axios from "axios";
import { ArrowLeft, ArrowUpRight, Check, FileUp, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { StarDisplay } from "../../components/ui/Stars";
import { createMediaBulk, matchMedia, type MatchResult } from "../../services/media.service";
import {
  ImportError,
  readExport,
  SOURCE_LABELS,
  type ImportItem,
  type ImportResult,
  type ImportStatus,
} from "../../lib/importers";
import type { BulkMediaItem } from "../../types/media";
import { easeOut, fadeUp, stagger } from "../../lib/motion";
import { btn } from "../../lib/ui";
import { requireToken } from "../../lib/queries";
import { refreshMedia } from "../../lib/mediaCache";

// same limit as POST /media/bulk and /media/match
const CHUNK = 50;

const SOURCES = [
  {
    id: "letterboxd",
    name: "letterboxd",
    what: "films you've watched, rated and logged",
    steps: "settings → data → export your data. drop the whole .zip here, no need to unzip it.",
    url: "https://letterboxd.com/settings/data/",
  },
  {
    id: "myanimelist",
    name: "myanimelist",
    what: "your anime or manga list",
    steps: "export → pick anime list or manga list → export. drop the .xml.gz here as it is.",
    url: "https://myanimelist.net/panel.php?go=export",
  },
  {
    id: "goodreads",
    name: "goodreads",
    what: "every book on your shelves",
    steps: "my books → import and export → export library, then download the .csv when it's ready.",
    url: "https://www.goodreads.com/review/import",
  },
] as const;

const STATUS_LABELS: Record<ImportStatus, string> = {
  finished: "finished",
  ongoing: "in progress",
  paused: "on hold",
  planned: "plan to",
  dropped: "dropped",
};
const STATUS_ORDER: ImportStatus[] = ["finished", "ongoing", "paused", "planned", "dropped"];
// plan-to and dropped lists would land on the shelf as in progress, so they start unticked
const DEFAULT_STATUSES: ImportStatus[] = ["finished", "ongoing", "paused"];

const nouns = (r: ImportResult) =>
  r.kind === "movie" ? "films" : r.kind === "book" ? "books" : r.kind;

const toBulkItem = (item: ImportItem, match: MatchResult | null): BulkMediaItem => {
  const finished = item.status === "finished";
  return {
    title: item.title,
    description: (match?.description || item.description || "").slice(0, 500),
    category: [...new Set((match?.category ?? []).map((c) => c.toLowerCase().slice(0, 50)))].slice(0, 5),
    source: "",
    image_url: match?.image_url ?? null,
    type: item.type,
    last_episode: item.progress,
    is_completed: finished,
    ...(finished && item.rating ? { rating: item.rating } : {}),
    // null keeps an unknown date out of the recap instead of piling everything into this year
    ...(finished ? { completed_at: item.completedAt } : {}),
    external_source: match?.external_source ?? null,
    external_id: match?.external_id ?? null,
  };
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Progress = { done: number; total: number; added: number; skipped: number; pause: number };

const Import = () => {
  const navigate = useNavigate();
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();

  const [result, setResult] = useState<ImportResult | null>(null);
  const [statuses, setStatuses] = useState<ImportStatus[]>(DEFAULT_STATUSES);
  const [findCovers, setFindCovers] = useState(true);
  const [skipExisting, setSkipExisting] = useState(true);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  // where to pick up after a failed chunk
  const resumeAt = useRef(0);

  useEffect(() => {
    document.title = "import · plotify";
  }, []);

  // a half-finished import is safe to resume, but closing the tab mid-chunk would lose track of it
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<ImportStatus, number>;
    result?.items.forEach((i) => (c[i.status] += 1));
    return c;
  }, [result]);

  const included = useMemo(() => result?.items.filter((i) => statuses.includes(i.status)) ?? [], [result, statuses]);
  const undated = included.filter((i) => i.status === "finished" && !i.completedAt).length;

  const open = async (files: File[]) => {
    if (!files.length) return;
    setError("");
    setReading(true);
    try {
      const parsed = await readExport(files);
      if (!parsed.items.length) throw new ImportError("this export is empty.");
      setResult(parsed);
      setStatuses(DEFAULT_STATUSES);
      resumeAt.current = 0;
      setProgress(null);
      setFinished(false);
    } catch (err) {
      setError(err instanceof ImportError ? err.message : "this file couldn't be read.");
    } finally {
      setReading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void open([...e.dataTransfer.files]);
  };

  // rate limits answer 429 with how long to wait; anything else gets one more try
  const send = async <T,>(call: (token: string) => Promise<T>): Promise<T> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await call(await requireToken(getToken));
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 429 && attempt < 10) {
          let left = Number(axios.isAxiosError(err) && err.response?.data?.retryAfter) || 30;
          for (; left > 0; left--) {
            setProgress((p) => p && { ...p, pause: left });
            await wait(1000);
          }
          setProgress((p) => p && { ...p, pause: 0 });
          continue;
        }
        if (attempt === 0 && status !== 400) {
          await wait(2000);
          continue;
        }
        throw err;
      }
    }
  };

  const run = async () => {
    if (!result || running) return;
    const list = included;
    setError("");
    setRunning(true);
    setProgress((p) => p ?? { done: 0, total: list.length, added: 0, skipped: 0, pause: 0 });

    try {
      for (let i = resumeAt.current; i < list.length; i += CHUNK) {
        const chunk = list.slice(i, i + CHUNK);

        let matches: (MatchResult | null)[] = chunk.map(() => null);
        if (findCovers) {
          try {
            matches = await send((token) => matchMedia(token, result.kind, chunk.map((c) => c.match)));
          } catch {
            // covers are a nice-to-have; the titles still go in without them
          }
        }

        const created = await send((token) =>
          createMediaBulk(token, chunk.map((item, j) => toBulkItem(item, matches[j])), { skipExisting }),
        );

        resumeAt.current = i + CHUNK;
        setProgress((p) =>
          p && {
            ...p,
            done: Math.min(list.length, i + CHUNK),
            added: p.added + created.length,
            skipped: p.skipped + chunk.length - created.length,
          },
        );
      }
      setFinished(true);
    } catch (err) {
      console.log(err);
      setError("the import stopped partway. what's already in stays in; continue to add the rest.");
    } finally {
      setRunning(false);
      refreshMedia(queryClient, userId);
    }
  };

  const reset = () => {
    setResult(null);
    setProgress(null);
    setFinished(false);
    setError("");
    resumeAt.current = 0;
  };

  const toggle = (s: ImportStatus) =>
    setStatuses((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));

  const started = !!progress;
  const percent = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink lowercase">
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pt-10 pb-24 sm:px-10">
        <Breadcrumbs items={[{ label: "add many", to: "/add/bulk" }, { label: "import" }]} />

        <motion.div initial="hidden" animate="show" variants={stagger(0.08)} className="mb-10">
          <motion.h1 variants={fadeUp} className="mb-2 font-serif text-[48px] leading-none tracking-[-0.025em] sm:text-[56px]">
            bring your history.
          </motion.h1>
          <motion.p variants={fadeUp} className="max-w-xl text-muted">
            moving from another app? drop its export here. your ratings, progress and finish dates come along, and we'll
            find covers on the way. the file is read on your device.
          </motion.p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="pick"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              variants={stagger(0.06)}
              className="flex flex-col gap-8"
            >
              <motion.ol variants={fadeUp} className="grid gap-px border border-line bg-line md:grid-cols-3">
                {SOURCES.map((s, i) => (
                  <li key={s.id} className="flex flex-col gap-2 bg-white p-6">
                    <span className="font-mono text-xs text-dim">0{i + 1}</span>
                    <h2 className="font-serif text-[26px] leading-none">{s.name}</h2>
                    <p className="text-sm text-ink">{s.what}</p>
                    <p className="text-sm text-muted">{s.steps}</p>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-auto flex items-center gap-1 pt-2 text-sm text-ink transition-colors hover:text-accent"
                    >
                      open the export page <ArrowUpRight size={14} />
                    </a>
                  </li>
                ))}
              </motion.ol>

              <motion.div variants={fadeUp}>
                <label
                  htmlFor="import-file"
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
                  onDrop={onDrop}
                  className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-8 text-center transition-colors ${
                    dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-white hover:border-ink"
                  }`}
                >
                  <FileUp size={28} className={dragging ? "text-accent" : "text-muted"} />
                  <span className="font-serif text-2xl">{reading ? "reading your export…" : "drop your export here"}</span>
                  <span className="text-sm text-muted">or click to choose · .zip, .csv, .xml or .xml.gz</span>
                  <input
                    id="import-file"
                    type="file"
                    multiple
                    accept=".zip,.csv,.xml,.gz,application/zip,text/csv,application/xml,application/gzip"
                    className="sr-only"
                    onChange={(e) => {
                      void open([...(e.target.files ?? [])]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {error && <p className="mt-3 text-sm text-danger">{error}</p>}
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 border-t border-line pt-7">
                <Link to="/add/bulk" className={btn("secondary", "lg")}>
                  <ArrowLeft size={16} /> type a list instead
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: easeOut }}
              className="grid gap-10 lg:grid-cols-[1fr_380px]"
            >
              <section>
                <div className="mb-6 border-t border-ink pt-5">
                  <p className="eyebrow mb-2">from {SOURCE_LABELS[result.source]}</p>
                  <h2 className="font-serif text-[40px] leading-none">
                    {result.items.length.toLocaleString("en-US")} {nouns(result)}
                  </h2>
                  <p className="mt-2 text-sm text-muted">going to your {result.type} shelf.</p>
                </div>

                <fieldset disabled={started} className="mb-8">
                  <legend className="label">which ones?</legend>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_ORDER.filter((s) => counts[s]).map((s) => {
                      const on = statuses.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggle(s)}
                          className={`flex h-10 items-center gap-2 border px-4 text-sm transition-colors disabled:opacity-60 ${
                            on ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-body hover:border-ink"
                          }`}
                        >
                          {on && <Check size={14} />}
                          {STATUS_LABELS[s]}
                          <span className={`font-mono text-xs ${on ? "text-white/70" : "text-dim"}`}>{counts[s]}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="hint">
                    plotify has no "plan to" list, so those and dropped ones land as in progress at 0.
                  </p>
                </fieldset>

                <h3 className="mb-2 border-b border-ink pb-2.5 font-serif text-[22px]">a first look</h3>
                <ul className="divide-y divide-line">
                  {included.slice(0, 12).map((item) => (
                    <li key={item.key} className="flex items-center gap-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate normal-case">{item.title}</span>
                        <span className="font-mono text-xs text-muted">
                          {STATUS_LABELS[item.status]}
                          {item.completedAt && ` · ${item.completedAt}`}
                          {item.progress > 0 && item.status !== "finished" && ` · at ${item.progress}`}
                        </span>
                      </span>
                      {item.rating ? <StarDisplay rating={item.rating} /> : <span className="text-xs text-dim">unrated</span>}
                    </li>
                  ))}
                </ul>
                {included.length > 12 && (
                  <p className="mt-3 text-sm text-muted">and {(included.length - 12).toLocaleString("en-US")} more.</p>
                )}
                {!included.length && <p className="py-8 text-center text-muted">pick at least one group above.</p>}
              </section>

              <aside className="flex flex-col gap-5 self-start border border-line bg-white p-6 lg:sticky lg:top-6">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={findCovers}
                    disabled={started}
                    onChange={(e) => setFindCovers(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--color-done)]"
                  />
                  <span>
                    find covers & genres
                    <span className="block text-muted">genres also make your yearly recap more fun.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={skipExisting}
                    disabled={started}
                    onChange={(e) => setSkipExisting(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--color-done)]"
                  />
                  <span>
                    skip titles already on your shelf
                    <span className="block text-muted">safe to import the same file twice.</span>
                  </span>
                </label>
                {undated > 0 && (
                  <p className="border-l-2 border-line-strong pl-3 text-[13px] text-muted">
                    {undated.toLocaleString("en-US")} finished title{undated === 1 ? " has" : "s have"} no finish date, so{" "}
                    {undated === 1 ? "it won't" : "they won't"} count toward a year's recap.
                  </p>
                )}

                {progress && (
                  <div aria-live="polite">
                    <div className="mb-2 flex justify-between font-mono text-xs text-muted">
                      <span>
                        {progress.pause
                          ? `short break, ${progress.pause}s`
                          : finished
                            ? "done"
                            : `adding ${progress.done}/${progress.total}`}
                      </span>
                      <span>{percent}%</span>
                    </div>
                    <div className="h-1.5 bg-track">
                      <motion.div
                        className={`h-full ${finished ? "bg-done" : "bg-ink"}`}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.5, ease: easeOut }}
                      />
                    </div>
                    <p className="mt-3 text-sm">
                      <span className="text-ink">{progress.added.toLocaleString("en-US")}</span>{" "}
                      <span className="text-muted">added</span>
                      {progress.skipped > 0 && (
                        <>
                          {" "}
                          · <span className="text-ink">{progress.skipped.toLocaleString("en-US")}</span>{" "}
                          <span className="text-muted">already on your shelf</span>
                        </>
                      )}
                    </p>
                  </div>
                )}

                {error && <p className="text-sm text-danger">{error}</p>}

                {finished ? (
                  <div className="flex flex-col gap-2">
                    <button type="button" className={btn("done", "lg")} onClick={() => navigate(`/${result.type}`)}>
                      open your {result.type} shelf
                    </button>
                    <button type="button" className={btn("secondary", "lg")} onClick={reset}>
                      import another file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className={btn("primary", "lg")}
                      disabled={!included.length || running}
                      onClick={run}
                    >
                      <Sparkles size={17} />
                      {running
                        ? "importing…"
                        : started
                          ? "continue"
                          : `import ${included.length.toLocaleString("en-US")} ${nouns(result)}`}
                    </button>
                    {!running && (
                      <button type="button" className={btn("secondary", "lg")} onClick={reset}>
                        <ArrowLeft size={16} /> pick another file
                      </button>
                    )}
                  </div>
                )}
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default Import;
