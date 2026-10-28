import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Layers, Minus, Plus, Repeat, RotateCcw, Sparkles } from "lucide-react";
import Cover from "./Cover";
import StarPicker from "./StarPicker";
import { nextSeason, uncompleteMedia, updateMedia, updateSeason } from "../services/media.service";
import { useToken } from "../lib/useToken";
import { btn, isUrl, unitOf } from "../lib/ui";
import { collapse, ease, fade, pop } from "../lib/motion";
import { pageHost } from "../lib/match";
import type { Media, PageInfo } from "../types";

type Props = {
  item: Media;
  page: PageInfo;
  detected: number | null;
  onChange: (item: Media) => void;
};

type Status = "idle" | "saving" | "saved" | "error";

// angka episode bergulir ke atas saat naik, ke bawah saat turun.
// arah dikirim lewat custom supaya angka yang keluar ikut arah terbaru
const tick = {
  enter: (direction: number) => ({ y: direction * 28, opacity: 0 }),
  center: { y: 0, opacity: 1, transition: { duration: 0.28, ease } },
  exit: (direction: number) => ({ y: direction * -28, opacity: 0, transition: { duration: 0.18 } }),
};

// link sumber ikut diperbarui ke halaman ini kalau masih di situs yang sama,
// supaya tombol "continue on" di web langsung membuka episode terakhir
const nextSource = (item: Media, page: PageInfo) => {
  if (!isUrl(item.source) || item.source === page.url || page.url.length > 500) return undefined;
  try {
    return new URL(item.source).hostname.replace(/^www\./, "") === pageHost(page) ? page.url : undefined;
  } catch {
    return undefined;
  }
};

const Tracker = ({ item, page, detected, onChange }: Props) => {
  const getToken = useToken();
  const unit = unitOf(item.type);

  const [episode, setEpisode] = useState(item.last_episode);
  // arah animasi angka: 1 = naik, -1 = turun
  const [direction, setDirection] = useState(1);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(item.last_episode));
  const [status, setStatus] = useState<Status>("idle");
  const [rating, setRating] = useState(0);
  // panel di bawah: rating untuk menyelesaikan season aktif, atau pindah ke season berikutnya
  const [panel, setPanel] = useState<"finish" | "next" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const seasons = item.seasons ?? [];
  const active = seasons.find((s) => s.season === item.season);
  const othersRunning = seasons.some((s) => !s.is_completed && s.season !== item.season);
  const nextExisting = seasons.find((s) => s.season === item.season + 1);
  const multi = seasons.length > 1 || item.season > 1;

  // klik +/- beruntun: satu request jalan sekaligus, nilai terakhir yang pasti tersimpan
  const desired = useRef(item.last_episode);
  const saved = useRef(item.last_episode);
  const running = useRef(false);

  const sync = async () => {
    if (running.current) return;
    running.current = true;
    setStatus("saving");
    try {
      const token = await getToken();
      while (desired.current !== saved.current) {
        const value = desired.current;
        const updated = await updateMedia(token, item.id, { last_episode: value, source: nextSource(item, page) });
        saved.current = value;
        if (updated) onChange(updated);
      }
      setStatus("saved");
    } catch {
      desired.current = saved.current;
      setEpisode(saved.current);
      setDraft(String(saved.current));
      setStatus("error");
    } finally {
      running.current = false;
    }
  };

  const setProgress = (value: number) => {
    const next = Math.max(0, Math.min(100000, Math.round(value)));
    if (next === episode) return;
    setDirection(next > episode ? 1 : -1);
    setEpisode(next);
    setDraft(String(next));
    desired.current = next;
    void sync();
  };

  const commitDraft = () => {
    setEditing(false);
    const value = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(value)) setDraft(String(episode));
    else setProgress(value);
  };

  // hasil dari backend bisa mengganti season aktif, jadi angka episode ikut disamakan
  const apply = (updated: Media | undefined) => {
    if (!updated) return;
    onChange(updated);
    desired.current = saved.current = updated.last_episode;
    setDirection(updated.last_episode >= episode ? 1 : -1);
    setEpisode(updated.last_episode);
    setDraft(String(updated.last_episode));
  };

  const openPanel = (next: "finish" | "next") => {
    // season yang diulang memakai rating lamanya sebagai awal
    setRating(active?.rating ?? 0);
    setError("");
    setPanel(next);
  };

  const run = async (action: (token: string) => Promise<Media | undefined>) => {
    setBusy(true);
    setError("");
    try {
      apply(await action(await getToken()));
      setPanel(null);
    } catch {
      setError("couldn't save, try again");
    } finally {
      setBusy(false);
    }
  };

  // menyelesaikan season aktif dengan rating-nya sendiri; judul selesai kalau tidak ada season lain yang berjalan
  const finish = () => {
    if (!rating) return setError("pick a rating from 1 to 5");
    void run((token) => updateSeason(token, item.id, item.season, { is_completed: true, rating }));
  };

  const goNext = (restart: boolean) => {
    if (!rating && active?.rating == null) return setError(`rate ${unit.part} ${item.season} first`);
    void run((token) => nextSeason(token, item.id, restart, rating || undefined));
  };

  return (
    <div className="px-5 pb-5">
      <div className="flex gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.45, ease } }}
          className="shadow-[0_10px_24px_-12px_rgba(23,22,15,0.55)]"
        >
          <Cover title={item.title} image={item.image_url} className="h-[120px] w-20" />
        </motion.div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="bg-soft px-2 py-0.5 text-[11px] font-medium tracking-wide text-body uppercase">
              {item.type === "read" ? "reading" : "watching"}
            </span>
            {multi && (
              <span className="border border-line-strong px-2 py-0.5 text-[11px] font-medium tracking-wide text-ink uppercase">
                {unit.part} {item.season}
              </span>
            )}
            {item.rewatch_count > 0 && (
              <span className="flex items-center gap-1 bg-accent-soft px-2 py-0.5 text-[11px] font-medium tracking-wide text-accent uppercase">
                <Repeat size={11} strokeWidth={2.5} /> ×{item.rewatch_count}
              </span>
            )}
            <AnimatePresence>
              {item.is_completed && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1, transition: pop }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="flex items-center gap-1 bg-done-soft px-2 py-0.5 text-[11px] font-medium tracking-wide text-done uppercase"
                >
                  <Check size={11} strokeWidth={3} /> finished
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-2 line-clamp-3 font-serif text-[22px] leading-[1.15]">{item.title}</p>
          <div className="mt-auto h-5 pt-1 text-xs text-muted" aria-live="polite">
            <AnimatePresence mode="wait">
              {status !== "idle" && (
                <motion.span key={status} {...fade} className="flex items-center gap-1">
                  {status === "saving" && "saving…"}
                  {status === "saved" && (
                    <>
                      <Check size={12} className="text-done" /> saved
                    </>
                  )}
                  {status === "error" && <span className="text-danger">couldn't save, try again</span>}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-5 border border-line bg-white p-4">
        <span className="label text-center text-muted">
          last {unit.long}
          {multi && ` · ${unit.part} ${item.season}`}
        </span>
        <div className="flex items-center justify-between gap-3">
          <motion.button
            type="button"
            aria-label={`minus one ${unit.long}`}
            onClick={() => setProgress(episode - 1)}
            disabled={episode <= 0}
            whileTap={{ scale: 0.88 }}
            transition={pop}
            className={btn("secondary", "lg", "w-14 px-0")}
          >
            <Minus size={20} />
          </motion.button>

          {editing ? (
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => e.key === "Enter" && commitDraft()}
              aria-label={`last ${unit.long}`}
              autoFocus
              className="field h-16 min-w-0 flex-1 text-center font-serif text-[40px]"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="click to type a number"
              className="relative h-16 min-w-0 flex-1 overflow-hidden transition-colors hover:bg-soft"
            >
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.span
                  key={episode}
                  custom={direction}
                  variants={tick}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute inset-0 flex items-center justify-center font-serif text-[44px] leading-none tabular-nums"
                >
                  {episode}
                </motion.span>
              </AnimatePresence>
            </button>
          )}

          <motion.button
            type="button"
            aria-label={`plus one ${unit.long}`}
            onClick={() => setProgress(episode + 1)}
            whileTap={{ scale: 0.88 }}
            transition={pop}
            className={btn("primary", "lg", "w-14 px-0")}
          >
            <Plus size={20} />
          </motion.button>
        </div>

        <AnimatePresence initial={false}>
          {detected !== null && detected !== episode && (
            <motion.div {...collapse} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setProgress(detected)}
                className={btn("accent", "md", "mt-3 w-full")}
              >
                <Sparkles size={15} /> set to {unit.short} {detected} from this page
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4">
        <AnimatePresence initial={false} mode="wait">
          {panel === "finish" ? (
            <motion.div key="finish" {...collapse} className="overflow-hidden">
              <div className="border border-line bg-white p-4">
                <span className="label">{multi ? `how was ${unit.part} ${item.season}?` : "how was it?"}</span>
                <StarPicker value={rating} onChange={(r) => (setRating(r), setError(""))} />
                {othersRunning && (
                  <p className="mt-2 text-xs text-muted">other {unit.part}s are still going, so it stays on your shelf.</p>
                )}
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setPanel(null)} className={btn("secondary", "md", "flex-1")}>
                    cancel
                  </button>
                  <button type="button" onClick={finish} disabled={busy} className={btn("done", "md", "flex-1")}>
                    <Check size={15} /> {busy ? "saving…" : "finish"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : panel === "next" ? (
            <motion.div key="next" {...collapse} className="overflow-hidden">
              <div className="border border-line bg-white p-4">
                <span className="label">
                  rate {unit.part} {item.season}
                  {active?.rating != null && <span className="font-normal text-muted"> (saved)</span>}
                </span>
                <StarPicker value={rating} onChange={(r) => (setRating(r), setError(""))} />
                <p className="mt-2 mb-3 text-xs text-muted">
                  {unit.part} {item.season} is marked finished and stays on the list.
                </p>
                {nextExisting ? (
                  <button type="button" onClick={() => goNext(false)} disabled={busy} className={btn("primary", "md", "w-full")}>
                    continue {unit.part} {item.season + 1} at {unit.short} {nextExisting.last_episode}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => goNext(false)} disabled={busy} className={btn("primary", "md", "w-full")}>
                      keep counting · next is {unit.short} {episode + 1}
                    </button>
                    <button type="button" onClick={() => goNext(true)} disabled={busy} className={btn("secondary", "md", "w-full")}>
                      start {unit.part} {item.season + 1} from 0
                    </button>
                  </div>
                )}
                <button type="button" onClick={() => setPanel(null)} className={btn("ghost", "sm", "mt-2 w-full")}>
                  cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="actions" {...fade} className="flex gap-2">
              {item.is_completed ? (
                <button
                  type="button"
                  onClick={() => run((token) => uncompleteMedia(token, item.id))}
                  disabled={busy}
                  className={btn("secondary", "lg", "flex-1")}
                >
                  <RotateCcw size={16} /> mark as ongoing
                </button>
              ) : (
                <button type="button" onClick={() => openPanel("finish")} className={btn("done", "lg", "flex-1")}>
                  <Check size={16} /> {othersRunning ? `finish ${unit.part} ${item.season}` : "mark as completed"}
                </button>
              )}
              <button
                type="button"
                onClick={() => openPanel("next")}
                aria-label={`next ${unit.part}`}
                title={`next ${unit.part}`}
                className={btn("secondary", "lg", "px-3.5")}
              >
                <Layers size={16} /> next
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {error && (
            <motion.p {...fade} className="mt-2 text-[13px] text-danger">
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Tracker;
