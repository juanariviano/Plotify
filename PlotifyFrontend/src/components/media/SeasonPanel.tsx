import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Check, Minus, Plus, Repeat, RotateCcw, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import Modal from "../ui/Modal";
import { StarDisplay, StarPicker } from "../ui/Stars";
import { addSeason, deleteSeason, switchSeason, updateSeason } from "../../services/media.service";
import { requireToken } from "../../lib/queries";
import { finishesTitle, seasonsOf } from "../../lib/seasons";
import { btn, unitOf } from "../../lib/ui";
import { easeOut } from "../../lib/motion";
import type { Media, Season } from "../../types/media";

type SeasonPanelProps = {
  item: Media;
  // the updated title from the backend, seasons included
  onChange: (updated: Media) => void;
  // rewatching asks first, in the card's own popup
  onRewatch: (season: number) => void;
};

const errorText = (err: unknown) =>
  axios.isAxiosError(err) && err.response?.status === 400
    ? (err.response.data?.message ?? "that didn't work")
    : "couldn't save. try again in a moment.";

// every season / volume of a title: switch between them, log or fix progress, rewatch, add, delete
const SeasonPanel = ({ item, onChange, onRewatch }: SeasonPanelProps) => {
  const { getToken } = useAuth();
  const unit = unitOf(item.type);
  const seasons = seasonsOf(item);

  const [selected, setSelected] = useState(item.season);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newSeason, setNewSeason] = useState({ season: "", episodes: "0", finished: true, rating: 0 });
  const [showDelete, setShowDelete] = useState(false);
  // the season being rated; finish: true also marks it finished
  const [rateFor, setRateFor] = useState<{ season: number; finish: boolean } | null>(null);
  const [rating, setRating] = useState(0);

  // follow the title when its active season changes (next season, rewatch, switch)
  const [activeSeen, setActiveSeen] = useState(item.season);
  if (activeSeen !== item.season) {
    setActiveSeen(item.season);
    setSelected(item.season);
  }

  const current: Season = seasons.find((s) => s.season === selected) ?? seasons[seasons.length - 1];
  const isActive = current.season === item.season;

  const run = async (action: (token: string) => Promise<Media[]>, after?: () => void) => {
    try {
      setBusy(true);
      setError("");
      const [updated] = await action(await requireToken(getToken));
      if (updated) onChange(updated);
      after?.();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const saveEpisodes = (value: number) => {
    setDraft(null);
    if (!Number.isInteger(value) || value < 0 || value > 100000 || value === current.last_episode) return;
    void run((t) => updateSeason(t, item.id, current.season, { last_episode: value }));
  };

  // every finished season carries its own rating; a rewatched one starts from its old one
  const openRating = (finish: boolean) => {
    setRating(current.rating ?? 0);
    setError("");
    setRateFor({ season: current.season, finish });
  };

  const confirmRating = () => {
    if (!rateFor) return;
    if (!rating) {
      setError("pick a rating from 1 to 5");
      return;
    }
    const { season, finish } = rateFor;
    void run(
      (t) => updateSeason(t, item.id, season, finish ? { is_completed: true, rating } : { rating }),
      () => setRateFor(null),
    );
  };

  const openAdd = () => {
    const taken = new Set(seasons.map((s) => s.season));
    let next = 1;
    while (taken.has(next)) next += 1;
    setNewSeason({ season: String(next), episodes: "0", finished: true, rating: 0 });
    setError("");
    setShowAdd(true);
  };

  const confirmAdd = () => {
    const season = Number(newSeason.season);
    const episodes = Number(newSeason.episodes);
    if (!Number.isInteger(season) || season < 1 || season > 1000) {
      setError(`${unit.part} must be a number from 1 to 1000`);
      return;
    }
    if (seasons.some((s) => s.season === season)) {
      setError(`${unit.part} ${season} is already on the list`);
      return;
    }
    if (!Number.isInteger(episodes) || episodes < 0) {
      setError(`${unit.plural} must be a whole number`);
      return;
    }
    if (newSeason.finished && !newSeason.rating) {
      setError(`rate ${unit.part} ${season} from 1 to 5`);
      return;
    }
    void run(
      (t) =>
        addSeason(t, item.id, {
          season,
          last_episode: episodes,
          is_completed: newSeason.finished,
          ...(newSeason.finished ? { rating: newSeason.rating } : {}),
        }),
      () => {
        setShowAdd(false);
        setSelected(season);
      },
    );
  };

  const shownEpisodes = draft ?? String(current.last_episode);

  return (
    <section className="mt-8 border border-line bg-white p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-[24px]">{unit.part}s</h2>
        <p className="font-mono text-xs text-muted">
          {seasons.filter((s) => s.is_completed).length} of {seasons.length} finished
        </p>
      </div>

      <LayoutGroup id={`seasons-${item.id}`}>
        <div role="tablist" aria-label={`${unit.part}s`} className="mb-5 flex flex-wrap gap-2">
          {seasons.map((s) => (
            <button
              key={s.season}
              type="button"
              role="tab"
              aria-selected={s.season === current.season}
              onClick={() => {
                setSelected(s.season);
                setDraft(null);
                setError("");
              }}
              className={`relative flex h-10 items-center gap-2 border px-3.5 text-sm transition-colors ${
                s.season === current.season ? "border-ink text-white" : "border-line-strong text-body hover:border-ink"
              }`}
            >
              {s.season === current.season && (
                <motion.span
                  layoutId={`season-pill-${item.id}`}
                  className="absolute inset-0 bg-ink"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative font-mono">
                {unit.partShort}
                {s.season}
              </span>
              <span
                aria-label={s.is_completed ? "finished" : "in progress"}
                className={`relative h-2 w-2 ${s.is_completed ? "bg-done" : "bg-accent"}`}
              />
              {s.season === item.season && <span className="relative text-[11px] opacity-70">now</span>}
            </button>
          ))}
          <button
            type="button"
            onClick={openAdd}
            className="flex h-10 items-center gap-1.5 border border-dashed border-line-strong px-3.5 text-sm text-muted transition-colors hover:border-ink hover:text-ink"
          >
            <Plus size={14} /> add
          </button>
        </div>
      </LayoutGroup>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current.season}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
          transition={{ duration: 0.35, ease: easeOut }}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="eyebrow mb-1">
                {unit.part} {current.season} · {current.is_completed ? "finished" : "in progress"}
                {current.rewatch_count > 0 && ` · ${unit.again} ×${current.rewatch_count}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`one ${unit.long} back`}
                  disabled={busy}
                  onClick={() => saveEpisodes(current.last_episode - 1)}
                  className={btn("secondary", "md", "w-11 px-0")}
                >
                  <Minus size={16} />
                </button>
                <label className="sr-only" htmlFor={`season-ep-${item.id}`}>
                  {unit.plural} in {unit.part} {current.season}
                </label>
                <input
                  id={`season-ep-${item.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={shownEpisodes}
                  disabled={busy}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => draft !== null && saveEpisodes(Number(draft))}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  className="field h-11 w-24 text-center font-mono text-lg"
                />
                <button
                  type="button"
                  aria-label={`one more ${unit.long}`}
                  disabled={busy}
                  onClick={() => saveEpisodes(current.last_episode + 1)}
                  className={btn("primary", "md", "w-11 px-0")}
                >
                  <Plus size={16} />
                </button>
                <span className="text-sm text-muted">{unit.plural}</span>
              </div>
            </div>
            {current.rating != null && (
              <div>
                <p className="eyebrow mb-1">{unit.part} rating</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openRating(false)}
                  title={`change the rating for ${unit.part} ${current.season}`}
                  className="flex h-11 items-center gap-2 font-mono text-sm hover:text-accent"
                >
                  <StarDisplay rating={current.rating} size={18} /> {current.rating}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!isActive && !current.is_completed && (
              <button
                type="button"
                disabled={busy}
                className={btn("primary", "sm")}
                onClick={() => run((t) => switchSeason(t, item.id, current.season))}
              >
                make it the current {unit.part}
              </button>
            )}
            {current.is_completed ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  className={btn("secondary", "sm")}
                  onClick={() => onRewatch(current.season)}
                >
                  <Repeat size={14} /> {unit.again} this {unit.part}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={btn("secondary", "sm")}
                  onClick={() => run((t) => updateSeason(t, item.id, current.season, { is_completed: false }))}
                >
                  <RotateCcw size={14} /> mark in progress
                </button>
              </>
            ) : (
              <button type="button" disabled={busy} className={btn("done", "sm")} onClick={() => openRating(true)}>
                <Check size={14} /> mark {unit.part} {current.season} finished
              </button>
            )}
            {current.is_completed && current.rating == null && (
              <button type="button" disabled={busy} className={btn("secondary", "sm")} onClick={() => openRating(false)}>
                <Star size={14} /> rate it
              </button>
            )}
            {seasons.length > 1 && (
              <button
                type="button"
                disabled={busy}
                className={btn("ghost", "sm", "hover:text-danger")}
                onClick={() => setShowDelete(true)}
              >
                <Trash2 size={14} /> delete
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {error && !showAdd && rateFor === null && <p className="mt-3 text-sm text-danger">{error}</p>}

      <Modal open={showAdd} onClose={() => !busy && setShowAdd(false)} title={`add a ${unit.part}`}>
        <p className="mb-5 text-sm text-muted">for one you've already {item.type === "screen" ? "watched" : "read"}, or one you skipped.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="new-season" className="label">{unit.part}</label>
            <input
              id="new-season"
              type="number"
              inputMode="numeric"
              min={1}
              className="field font-mono"
              value={newSeason.season}
              onChange={(e) => setNewSeason({ ...newSeason, season: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="new-season-ep" className="label">{unit.plural}</label>
            <input
              id="new-season-ep"
              type="number"
              inputMode="numeric"
              min={0}
              className="field font-mono"
              value={newSeason.episodes}
              onChange={(e) => setNewSeason({ ...newSeason, episodes: e.target.value })}
            />
          </div>
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={newSeason.finished}
            onChange={(e) => setNewSeason({ ...newSeason, finished: e.target.checked })}
            className="h-4 w-4 accent-[var(--color-done)]"
          />
          already finished
        </label>
        {newSeason.finished && (
          <div className="mt-3">
            <span className="label">{unit.part} rating</span>
            <StarPicker
              value={newSeason.rating}
              onChange={(r) => {
                setNewSeason({ ...newSeason, rating: r });
                setError("");
              }}
            />
          </div>
        )}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-7 flex gap-3">
          <button type="button" className={btn("primary", "lg")} onClick={confirmAdd} disabled={busy}>
            {busy ? "adding…" : `add ${unit.part}`}
          </button>
          <button type="button" className={btn("secondary", "lg")} onClick={() => setShowAdd(false)} disabled={busy}>
            cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={showDelete}
        onClose={() => !busy && setShowDelete(false)}
        title={`delete ${unit.part} ${current.season}?`}
        tone="danger"
      >
        <p className="mb-7 text-sm text-muted">
          its progress ({current.last_episode} {unit.plural}) is removed. the other {unit.part}s stay.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className={btn("danger", "lg")}
            disabled={busy}
            onClick={() => run((t) => deleteSeason(t, item.id, current.season), () => setShowDelete(false))}
          >
            {busy ? "deleting…" : "delete"}
          </button>
          <button type="button" className={btn("secondary", "lg")} onClick={() => setShowDelete(false)} disabled={busy}>
            keep it
          </button>
        </div>
      </Modal>

      <Modal
        open={rateFor !== null}
        onClose={() => !busy && setRateFor(null)}
        title={
          !rateFor?.finish
            ? `rate ${unit.part} ${rateFor?.season}`
            : finishesTitle(seasons, rateFor.season)
              ? "all caught up?"
              : `finished ${unit.part} ${rateFor.season}?`
        }
      >
        <p className="mb-5 text-sm text-muted">
          {!rateFor?.finish
            ? `the title's rating is the average of its ${unit.part}s.`
            : finishesTitle(seasons, rateFor.season)
              ? `that's the last ${unit.part} left, so the whole title moves to your finished shelf.`
              : `the title stays on your shelf while other ${unit.part}s are still going.`}{" "}
          rate this {unit.part} out of five.
        </p>
        <StarPicker
          value={rating}
          onChange={(r) => {
            setRating(r);
            setError("");
          }}
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-7 flex gap-3">
          <button type="button" className={btn("done", "lg")} disabled={busy} onClick={confirmRating}>
            {busy ? "saving…" : rateFor?.finish ? "mark as finished" : "save rating"}
          </button>
          <button type="button" className={btn("secondary", "lg")} onClick={() => setRateFor(null)} disabled={busy}>
            {rateFor?.finish ? "not yet" : "cancel"}
          </button>
        </div>
      </Modal>
    </section>
  );
};

export default SeasonPanel;
