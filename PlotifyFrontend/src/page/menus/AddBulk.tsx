import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowLeft, ArrowRight, ChevronDown, Crop, ImageUp, Link2, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createMediaBulk, lookupMedia, uploadThumbnail } from "../../services/media.service";
import type { ExternalMedia } from "../../types/chat";
import type { BulkMediaItem } from "../../types/media";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import Cover from "../../components/ui/Cover";
import CoverSearch from "../../components/ui/CoverSearch";
import ImageCropper from "../../components/ui/ImageCropper";
import TagInput from "../../components/ui/TagInput";
import { StarPicker } from "../../components/ui/Stars";
import { useFileDrop } from "../../hooks/useFileDrop";
import { easeOut, fadeUp, stagger } from "../../lib/motion";
import { btn, SOURCE_NAMES, unitOf } from "../../lib/ui";
import { requireToken } from "../../lib/queries";
import { addMedia, refreshMedia } from "../../lib/mediaCache";

type ShelfType = "screen" | "read";

type Row = {
  key: string;
  title: string;
  description: string;
  category: string[];
  imageUrl: string | null;
  // file is the cropped upload; sourceFile is the original, kept so the crop can be adjusted
  file: File | null;
  sourceFile: File | null;
  external: ExternalMedia | null;
  finished: boolean;
  rating: number;
  lastEpisode: string;
  open: boolean;
  error: string;
};

// same limit as POST /media/bulk
const MAX_ROWS = 50;
// lookups at once; tmdb / anilist rate-limit bursts
const LOOKUP_CONCURRENCY = 3;

const parseTitles = (text: string) => {
  const seen = new Set<string>();
  return text
    .split("\n")
    // strip list markers people paste in: "1.", "-", "•"
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim())
    .filter((line) => {
      const key = line.toLowerCase();
      if (!line || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const fromMatch = (row: Row, m: ExternalMedia): Row => ({
  ...row,
  title: m.title,
  description: m.description?.slice(0, 500) ?? "",
  category: m.category.slice(0, 5).map((c) => c.toLowerCase()),
  imageUrl: m.image_url,
  file: null,
  sourceFile: null,
  external: m,
  error: "",
});

const BulkRow = ({
  row,
  type,
  onChange,
  onRemove,
}: {
  row: Row;
  type: ShelfType;
  onChange: (next: Row) => void;
  onRemove: () => void;
}) => {
  const unit = unitOf(type);
  const preview = useMemo(() => (row.file ? URL.createObjectURL(row.file) : null), [row.file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const [cropFile, setCropFile] = useState<File | null>(null);
  const { dragging, dropProps } = useFileDrop(setCropFile);
  const set = (patch: Partial<Row>) => onChange({ ...row, ...patch, error: "" });
  const inputId = `bulk-${row.key}`;

  return (
    <motion.li
      layout
      variants={fadeUp}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
      className={`border bg-white ${row.error ? "border-danger" : "border-line"}`}
    >
      <div className="flex flex-wrap items-start gap-4 p-4">
        <label
          htmlFor={`${inputId}-file`}
          {...dropProps}
          className={`group relative w-16 shrink-0 cursor-pointer outline-offset-2 ${dragging ? "outline-2 outline-dashed outline-accent" : ""}`}
          title="click or drop an image to use your own cover"
        >
          <Cover title={row.title || "?"} src={preview ?? row.imageUrl} showTitle={false} className="aspect-[3/4] w-full" />
          <span
            className={`absolute inset-0 flex items-center justify-center bg-ink/55 text-white transition-opacity ${
              dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <ImageUp size={16} />
          </span>
          <input
            id={`${inputId}-file`}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file?.type.startsWith("image/")) setCropFile(file);
              e.target.value = "";
            }}
          />
        </label>
        <ImageCropper
          file={cropFile}
          aspect={3 / 4}
          outputWidth={600}
          title="frame your cover"
          onCancel={() => setCropFile(null)}
          onDone={(file) => {
            set({ file, sourceFile: cropFile });
            setCropFile(null);
          }}
        />

        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
          <label htmlFor={`${inputId}-title`} className="sr-only">title</label>
          <input
            id={`${inputId}-title`}
            className="field h-10 font-serif text-lg"
            value={row.title}
            aria-invalid={!row.title.trim() && !!row.error}
            onChange={(e) => set({ title: e.target.value })}
          />
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
            {row.external ? (
              <span className="flex items-center gap-1">
                <Link2 size={12} /> {SOURCE_NAMES[row.external.external_source]}
                {row.external.year && ` · ${row.external.year}`}
              </span>
            ) : (
              <span>no match, added as typed</span>
            )}
            {row.file && <span className="text-accent">your own cover</span>}
            <button
              type="button"
              aria-expanded={row.open}
              onClick={() => onChange({ ...row, open: !row.open })}
              className="flex items-center gap-0.5 text-ink hover:text-accent"
            >
              {row.open ? "less" : "edit details"}
              <ChevronDown size={12} className={`transition-transform ${row.open ? "rotate-180" : ""}`} />
            </button>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LayoutGroup id={`status-${row.key}`}>
            <div className="inline-flex border border-line-strong bg-white p-0.5 text-[13px]">
              {([true, false] as const).map((finished) => (
                <button
                  key={String(finished)}
                  type="button"
                  aria-pressed={row.finished === finished}
                  onClick={() => set({ finished })}
                  className={`relative h-8 px-3 transition-colors ${row.finished === finished ? "text-white" : "text-body hover:text-ink"}`}
                >
                  {row.finished === finished && (
                    <motion.span
                      layoutId={`status-pill-${row.key}`}
                      className={`absolute inset-0 ${finished ? "bg-done" : "bg-ink"}`}
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span className="relative">{finished ? "finished" : type === "screen" ? "watching" : "reading"}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>

          {row.finished && <StarPicker value={row.rating} onChange={(rating) => set({ rating })} size={18} />}
          <label className="flex items-center gap-2 text-[13px] text-muted">
            {row.finished ? unit.plural : unit.long}
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={row.lastEpisode}
              onChange={(e) => set({ lastEpisode: e.target.value })}
              className="field h-9 w-20 text-center font-mono"
            />
          </label>

          <button
            type="button"
            onClick={onRemove}
            aria-label={`remove ${row.title}`}
            className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-danger"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {row.error && <p className="px-4 pb-3 text-sm text-danger">{row.error}</p>}

      <AnimatePresence initial={false}>
        {row.open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="overflow-hidden"
          >
            <div className="grid gap-5 border-t border-line p-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor={`${inputId}-desc`} className="label">description</label>
                  <textarea
                    id={`${inputId}-desc`}
                    rows={3}
                    className="field"
                    value={row.description}
                    onChange={(e) => set({ description: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor={`${inputId}-cat`} className="label">categories</label>
                  <TagInput id={`${inputId}-cat`} value={row.category} onChange={(category) => set({ category })} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.file && row.sourceFile && (
                    <button type="button" className={btn("secondary", "sm")} onClick={() => setCropFile(row.sourceFile)}>
                      <Crop size={14} /> adjust crop
                    </button>
                  )}
                  {row.external?.image_url && (row.file || row.imageUrl !== row.external.image_url) && (
                    <button
                      type="button"
                      className={btn("secondary", "sm")}
                      onClick={() => set({ imageUrl: row.external!.image_url, file: null, sourceFile: null })}
                    >
                      <Sparkles size={14} /> use recommended cover
                    </button>
                  )}
                  {(row.imageUrl || row.file) && (
                    <button
                      type="button"
                      className={btn("secondary", "sm")}
                      onClick={() => set({ imageUrl: null, file: null, sourceFile: null })}
                    >
                      <Trash2 size={14} /> use default cover
                    </button>
                  )}
                  {row.external && (
                    <button type="button" className={btn("secondary", "sm")} onClick={() => set({ external: null })}>
                      <X size={14} /> unlink match
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span className="label">wrong match? pick the right one</span>
                <CoverSearch initialQuery={row.title} type={type} onPick={(m) => onChange(fromMatch(row, m))} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
};

const AddBulk = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const type: ShelfType = searchParams.get("item") === "read" ? "read" : "screen";
  const navigate = useNavigate();
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();

  const [text, setText] = useState("");
  const [defaultFinished, setDefaultFinished] = useState(true);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  const titles = useMemo(() => parseTitles(text), [text]);
  const verb = type === "screen" ? "watched" : "read";

  useEffect(() => {
    document.title = `add many to ${type} · plotify`;
  }, [type]);

  const setShelf = (next: ShelfType) => {
    setRows(null);
    setSearchParams({ item: next }, { replace: true });
  };

  // look every title up (cached, same key as the add page) and prefill with the best match
  const findMatches = async () => {
    const list = titles.slice(0, MAX_ROWS);
    if (!list.length) return;

    setError("");
    setProgress({ label: "finding matches", done: 0, total: list.length });

    const found: (ExternalMedia | undefined)[] = new Array(list.length);
    let next = 0;
    const worker = async () => {
      while (next < list.length) {
        const i = next++;
        try {
          const results = await queryClient.fetchQuery({
            queryKey: ["lookup", type, list[i]],
            queryFn: async ({ signal }) => lookupMedia(await requireToken(getToken), list[i], type, signal),
            staleTime: 1000 * 60 * 30,
          });
          found[i] = results[0];
        } catch {
          // no match; the row keeps the typed title
        }
        setProgress((p) => p && { ...p, done: p.done + 1 });
      }
    };
    await Promise.all(Array.from({ length: LOOKUP_CONCURRENCY }, worker));

    setRows(
      list.map((title, i) => {
        const row: Row = {
          key: `${i}-${title}`,
          title,
          description: "",
          category: [],
          imageUrl: null,
          file: null,
          sourceFile: null,
          external: null,
          finished: defaultFinished,
          rating: 0,
          lastEpisode: "0",
          open: false,
          error: "",
        };
        return found[i] ? fromMatch(row, found[i]) : row;
      }),
    );
    setProgress(null);
  };

  const updateRow = (key: string, next: Row) => setRows((rs) => rs && rs.map((r) => (r.key === key ? next : r)));
  const setAll = (finished: boolean) => setRows((rs) => rs && rs.map((r) => ({ ...r, finished, error: "" })));

  const validate = (list: Row[]) => {
    let ok = true;
    const checked = list.map((r) => {
      let err = "";
      const ep = Number(r.lastEpisode);
      if (!r.title.trim()) err = "title is required";
      else if (r.finished && !r.rating) err = "pick a rating, or mark it as in progress";
      else if (!Number.isInteger(ep) || ep < 0 || ep > 10000) err = `${unitOf(type).long} must be a whole number`;
      if (err) ok = false;
      return { ...r, error: err };
    });
    setRows(checked);
    return ok;
  };

  const handleSave = async () => {
    if (!rows?.length || progress || !validate(rows)) {
      if (rows?.length) setError("some titles need a fix before they can be added.");
      return;
    }

    try {
      setError("");
      const token = await requireToken(getToken);

      // own covers go up first, one at a time, so a big list doesn't flood the upload endpoint
      const withFile = rows.filter((r) => r.file);
      const uploaded = new Map<string, string>();
      if (withFile.length) setProgress({ label: "uploading covers", done: 0, total: withFile.length });
      for (const r of withFile) {
        uploaded.set(r.key, await uploadThumbnail({ token, file: r.file! }));
        setProgress((p) => p && { ...p, done: p.done + 1 });
      }

      setProgress({ label: "adding to your shelf", done: 0, total: rows.length });
      const items: BulkMediaItem[] = rows.map((r) => ({
        title: r.title.trim(),
        description: r.description,
        category: r.category,
        source: "",
        image_url: uploaded.get(r.key) ?? r.imageUrl,
        type,
        last_episode: Number(r.lastEpisode),
        is_completed: r.finished,
        ...(r.finished ? { rating: r.rating } : {}),
        external_source: r.external?.external_source ?? null,
        external_id: r.external?.external_id ?? null,
      }));

      const created = await createMediaBulk(token, items);
      created.forEach((m) => addMedia(queryClient, userId, m));
      refreshMedia(queryClient, userId);
      navigate(`/${type}`);
    } catch (err) {
      console.log(err);
      setError("couldn't add them. check your connection and try again.");
      setProgress(null);
    }
  };

  const finishedCount = rows?.filter((r) => r.finished).length ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink lowercase">
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pt-10 pb-32 sm:px-10">
        <Breadcrumbs items={[{ label: type, to: `/${type}` }, { label: "add many" }]} />

        <motion.div initial="hidden" animate="show" variants={stagger(0.08)} className="mb-10">
          <motion.h1 variants={fadeUp} className="mb-2 font-serif text-[48px] leading-none tracking-[-0.025em] sm:text-[56px]">
            bring your list.
          </motion.h1>
          <motion.p variants={fadeUp} className="max-w-xl text-muted">
            paste everything you've already {verb}, one title per line. we'll find covers and details, and you can
            change anything before it lands on your shelf.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-4">
            <Link to="/add/import" className="inline-flex items-center gap-1.5 text-sm text-ink transition-colors hover:text-accent">
              coming from letterboxd, myanimelist or goodreads? import your export <ArrowRight size={14} />
            </Link>
          </motion.div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!rows ? (
            <motion.div
              key="paste"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              variants={stagger(0.06)}
              className="flex max-w-3xl flex-col gap-7"
            >
              <motion.fieldset variants={fadeUp}>
                <legend className="label">shelf</legend>
                <LayoutGroup id="bulk-shelf">
                  <div className="inline-flex border border-line-strong bg-white p-0.5">
                    {(["screen", "read"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={type === s}
                        onClick={() => setShelf(s)}
                        className={`relative h-11 px-6 text-sm transition-colors ${type === s ? "text-white" : "text-body hover:text-ink"}`}
                      >
                        {type === s && (
                          <motion.span
                            layoutId="bulk-shelf-pill"
                            className="absolute inset-0 bg-ink"
                            transition={{ type: "spring", stiffness: 500, damping: 38 }}
                          />
                        )}
                        <span className="relative">{s}</span>
                      </button>
                    ))}
                  </div>
                </LayoutGroup>
              </motion.fieldset>

              <motion.div variants={fadeUp}>
                <label htmlFor="bulk-text" className="label">titles, one per line</label>
                <textarea
                  id="bulk-text"
                  autoFocus
                  rows={12}
                  className="field font-mono text-sm normal-case"
                  placeholder={type === "screen" ? "Inception\nAttack on Titan\nParasite" : "Dune\nOne Piece\nNorwegian Wood"}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <p className="hint">
                  {titles.length} title{titles.length === 1 ? "" : "s"}
                  {titles.length > MAX_ROWS && ` · only the first ${MAX_ROWS} are added at a time`}
                </p>
              </motion.div>

              <motion.label variants={fadeUp} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={defaultFinished}
                  onChange={(e) => setDefaultFinished(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-done)]"
                />
                i've finished all of these (you can change each one next)
              </motion.label>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 border-t border-line pt-7">
                <button
                  type="button"
                  disabled={!titles.length || !!progress}
                  onClick={findMatches}
                  className={btn("primary", "lg")}
                >
                  <Sparkles size={17} />
                  {progress ? `${progress.label}… ${progress.done}/${progress.total}` : "find covers & details"}
                </button>
                <Link to={`/${type}`} className={btn("secondary", "lg")}>cancel</Link>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: easeOut }}
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink pt-5">
                <p className="text-[15px] text-muted">
                  <span className="text-ink">{rows.length}</span> to add ·{" "}
                  <span className="text-ink">{finishedCount}</span> finished
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btn("secondary", "sm")} onClick={() => setAll(true)}>
                    mark all finished
                  </button>
                  <button type="button" className={btn("secondary", "sm")} onClick={() => setAll(false)}>
                    mark all in progress
                  </button>
                </div>
              </div>

              <motion.ul initial="hidden" animate="show" variants={stagger(0.03)} className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {rows.map((row) => (
                    <BulkRow
                      key={row.key}
                      row={row}
                      type={type}
                      onChange={(next) => updateRow(row.key, next)}
                      onRemove={() => setRows((rs) => rs && rs.filter((r) => r.key !== row.key))}
                    />
                  ))}
                </AnimatePresence>
              </motion.ul>

              {!rows.length && <p className="py-10 text-center text-muted">nothing left to add.</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {rows && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ duration: 0.4, ease: easeOut }}
            className="sticky bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-5 py-4 sm:px-10">
              <button
                type="button"
                disabled={!rows.length || !!progress}
                onClick={handleSave}
                className={btn("primary", "lg")}
              >
                {progress ? `${progress.label}… ${progress.done}/${progress.total}` : `add ${rows.length} to ${type}`}
              </button>
              <button
                type="button"
                disabled={!!progress}
                onClick={() => setRows(null)}
                className={btn("secondary", "lg")}
              >
                <ArrowLeft size={16} /> back to the list
              </button>
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default AddBulk;
