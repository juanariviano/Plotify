import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, Crop, ImageOff, ImageUp, Layers, Minus, Pencil, Plus, Repeat, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Media } from "../../types/media";
import {
  deleteMedia,
  nextSeason,
  rewatchSeason,
  uncompleteMedia,
  updateSeason,
  updateMedia,
  uploadThumbnail,
} from "../../services/media.service";
import { useLogProgress } from "../../hooks/useLogProgress";
import { useMediaItem } from "../../hooks/useMediaItem";
import { useFileDrop } from "../../hooks/useFileDrop";
import { patchMedia, refreshMedia, removeMedia } from "../../lib/mediaCache";
import { mediaKeys } from "../../lib/queries";
import { finishesTitle, seasonsOf } from "../../lib/seasons";
import LoadingScreen from "../../components/ui/LoadingScreen";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import Cover from "../../components/ui/Cover";
import Modal from "../../components/ui/Modal";
import TagInput from "../../components/ui/TagInput";
import CoverSearch from "../../components/ui/CoverSearch";
import ImageCropper from "../../components/ui/ImageCropper";
import SeasonPanel from "../../components/media/SeasonPanel";
import AnimatedNumber from "../../components/ui/AnimatedNumber";
import { StarDisplay, StarPicker } from "../../components/ui/Stars";
import { easeOut, fadeUp, stagger } from "../../lib/motion";
import { btn, isUrl, sourceLabel, unitOf } from "../../lib/ui";

type EditForm = {
  title: string;
  description: string;
  category: string[];
  source: string;
  last_episode: string;
  rating: number;
};

type FormErrors = { title?: string; lastEpisode?: string; rating?: string };

const formatAdded = (value: Date | string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toLowerCase();
};

const Card = () => {
  const [searchParams] = useSearchParams();
  const id = parseInt(searchParams.get("id") ?? "", 10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getToken, userId } = useAuth();
  const log = useLogProgress();

  const { data: item, isLoading: loading } = useMediaItem(id);
  const deleted = useRef(false);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  // imageFile is the cropped upload; sourceFile is the original, kept so the crop can be adjusted
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  // a cover picked from tmdb / anilist / open library instead of an upload
  const [pickedCover, setPickedCover] = useState<string | null>(null);
  const [showCoverSearch, setShowCoverSearch] = useState(false);
  const [deleteThumbnail, setDeleteThumbnail] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showUncomplete, setShowUncomplete] = useState(false);
  // the season a rewatch starts from; null keeps the popup closed
  const [rewatchFrom, setRewatchFrom] = useState<number | null>(null);
  const [showSeason, setShowSeason] = useState(false);
  const [nextRating, setNextRating] = useState(0);
  const [nextError, setNextError] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingError, setRatingError] = useState("");
  const [busy, setBusy] = useState(false);

  // forget a deleted item only once we've left, so it isn't refetched while still on screen
  useEffect(() => () => {
    if (deleted.current) queryClient.removeQueries({ queryKey: mediaKeys.item(userId, id), exact: true });
  }, [queryClient, userId, id]);

  useEffect(() => {
    if (item) document.title = `${item.title} · plotify`;
  }, [item]);

  const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // a new image goes through the cropper first
  const { dragging, dropProps } = useFileDrop(setCropFile);

  const applyCrop = (cropped: File) => {
    setSourceFile(cropFile);
    setImageFile(cropped);
    setPickedCover(null);
    setDeleteThumbnail(false);
    setCropFile(null);
  };

  const applyDefaultCover = () => {
    setImageFile(null);
    setSourceFile(null);
    setPickedCover(null);
    setDeleteThumbnail(true);
  };

  const resetCover = () => {
    setImageFile(null);
    setSourceFile(null);
    setPickedCover(null);
    setShowCoverSearch(false);
    setDeleteThumbnail(false);
  };

  const startEdit = () => {
    if (!item) return;
    setForm({
      title: item.title,
      description: item.description ?? "",
      category: item.category ?? [],
      source: item.source ?? "",
      last_episode: String(item.last_episode ?? ""),
      rating: item.rating ?? 0,
    });
    setErrors({});
    resetCover();
    setIsEdit(true);
  };

  const cancelEdit = () => {
    setIsEdit(false);
    resetCover();
  };

  const validate = (data: EditForm, media: Media) => {
    const next: FormErrors = {};

    if (!data.title.trim()) next.title = "title is required";

    const raw = data.last_episode.trim();
    const num = Number(raw);
    if (!raw) next.lastEpisode = media.type === "screen" ? "last episode is required" : "last page is required";
    else if (Number.isNaN(num)) next.lastEpisode = "must be a number";
    else if (num < 0) next.lastEpisode = "cannot be negative";
    else if (num > 10000) next.lastEpisode = "value too large";

    // with several seasons the rating is set per season in the seasons panel
    if (media.is_completed && seasonsOf(media).length === 1 && (data.rating < 0 || data.rating > 5 || !data.rating)) {
      next.rating = "rating is required";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!item || !form || !validate(form, item)) return;

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) return;

      // the backend removes the old cover from storage when image_url changes
      let imageUrl = item.image_url;

      if (imageFile) {
        imageUrl = await uploadThumbnail({ token, file: imageFile });
      } else if (pickedCover) {
        imageUrl = pickedCover;
      } else if (deleteThumbnail) {
        imageUrl = null;
      }

      const mediaData = {
        title: form.title.trim(),
        description: form.description,
        category: form.category,
        source: form.source,
        image_url: imageUrl,
        last_episode: Number(form.last_episode),
        ...(item.is_completed && seasonsOf(item).length === 1 ? { rating: form.rating } : {}),
      };

      // the answer carries the recomputed rating and seasons
      const [updated] = (await updateMedia({ token, id: item.id, mediaData })) as Media[];
      patchMedia(queryClient, userId, item.id, updated ?? mediaData);
      refreshMedia(queryClient, userId);
      cancelEdit();
    } catch (err) {
      console.log(err);
    } finally {
      setSaving(false);
    }
  };

  const step = (delta: 1 | -1) => {
    if (!item) return;
    const next = Math.max(0, item.last_episode + delta);
    if (next === item.last_episode) return;
    setDirection(delta);
    log.mutate({ item, next });
  };

  const handleDelete = async () => {
    if (!item) return;
    try {
      setBusy(true);
      const token = await getToken();
      if (!token) return;

      // the backend also removes the cover from storage
      await deleteMedia({ token, id: item.id });
      deleted.current = true;

      navigate(item.type === "read" ? "/read" : "/screen");
      removeMedia(queryClient, userId, item.id);
      refreshMedia(queryClient, userId);
    } catch (error) {
      console.log(error);
      setBusy(false);
    }
  };

  const confirmComplete = async () => {
    if (!item) return;
    if (!rating || rating < 0 || rating > 5) {
      setRatingError("pick a rating from 1 to 5");
      return;
    }

    try {
      setBusy(true);
      const token = await getToken();
      if (!token) return;

      // finishes the active season with its own rating; the title finishes once no season is left running
      const [updated] = await updateSeason(token, item.id, item.season, { is_completed: true, rating });
      patchMedia(queryClient, userId, item.id, updated ?? { is_completed: true, rating });
      refreshMedia(queryClient, userId);
      setShowComplete(false);
    } catch (err) {
      console.log(err);
    } finally {
      setBusy(false);
    }
  };

  const confirmUncomplete = async () => {
    if (!item) return;
    try {
      setBusy(true);
      const token = await getToken();
      if (!token) return;

      const [updated] = await uncompleteMedia({ token, id: item.id });
      patchMedia(queryClient, userId, item.id, updated ?? { is_completed: false });
      refreshMedia(queryClient, userId);
      setShowUncomplete(false);
    } catch (err) {
      console.log(err);
    } finally {
      setBusy(false);
    }
  };

  // the backend answers with the updated row, so the cache takes it as-is
  const runAction = async (action: (token: string) => Promise<Media[]>, close: () => void) => {
    if (!item) return;
    try {
      setBusy(true);
      const token = await getToken();
      if (!token) return;

      const [updated] = await action(token);
      if (updated) patchMedia(queryClient, userId, item.id, updated);
      refreshMedia(queryClient, userId);
      setDirection(-1);
      close();
    } catch (err) {
      console.log(err);
    } finally {
      setBusy(false);
    }
  };

  const applyUpdate = (updated: Media) => {
    if (!item) return;
    patchMedia(queryClient, userId, item.id, updated);
    refreshMedia(queryClient, userId);
  };

  const confirmRewatch = () =>
    item &&
    rewatchFrom !== null &&
    runAction((token) => rewatchSeason(token, item.id, rewatchFrom), () => setRewatchFrom(null));

  // the season being left is marked finished, so it needs a rating unless it already has one
  const confirmNextSeason = (restart: boolean) => {
    if (!item) return;
    const saved = seasonsOf(item).find((s) => s.season === item.season)?.rating;
    if (!nextRating && saved == null) {
      setNextError(`rate ${unitOf(item.type).part} ${item.season} first`);
      return;
    }
    void runAction(
      (token) => nextSeason(token, item.id, restart, nextRating || undefined),
      () => setShowSeason(false),
    );
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!item) {
    return (
      <div className="flex min-h-screen flex-col bg-paper text-ink lowercase">
        <Navbar />
        <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-start justify-center gap-5 px-5 py-20 sm:px-10">
          <p className="eyebrow">not found</p>
          <h1 className="font-serif text-5xl tracking-[-0.02em]">we couldn't find that title.</h1>
          <p className="text-muted">it may have been deleted, or the link is out of date.</p>
          <Link to="/screen" className={btn("primary", "lg")}>back to your shelf</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const unit = unitOf(item.type);
  const coverSrc = previewUrl ?? pickedCover ?? (deleteThumbnail ? null : item.image_url);
  const coverChanged = !!(imageFile || pickedCover || deleteThumbnail);
  const added = formatAdded(item.created_at);
  const season = item.season ?? 1;
  const rewatches = item.rewatch_count ?? 0;
  const seasons = seasonsOf(item);
  const finishedSeasons = seasons.filter((s) => s.is_completed);
  const nextExisting = seasons.find((s) => s.season === season + 1);
  const finishesAll = finishesTitle(seasons, season);
  const activeSeason = seasons.find((s) => s.season === season);
  const ratedSeasons = seasons.filter((s) => s.rating != null).length;

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink lowercase">
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pt-10 pb-24 sm:px-10">
        <Breadcrumbs
          items={[
            { label: item.type, to: `/${item.type}` },
            { label: item.title },
            ...(isEdit ? [{ label: "editing" }] : []),
          ]}
        />

        <div className="flex flex-wrap items-start gap-x-16 gap-y-10">
          <motion.div
            className="flex w-full flex-col gap-3 sm:w-[320px]"
            initial={{ opacity: 0, y: 24, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.8, ease: easeOut }}
          >
            <div className="group relative" {...(isEdit ? dropProps : {})}>
              <Cover
                title={isEdit && form ? form.title || item.title : item.title}
                src={coverSrc}
                className="aspect-[3/4] w-full shadow-[0_30px_60px_-30px_rgb(23_22_15/0.5)]"
                titleClassName="text-[34px]"
              />
              {isEdit && (
                <label
                  htmlFor="thumbnail-upload"
                  className={`absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 text-sm text-white transition-[opacity,background-color] duration-300 focus-within:opacity-100 ${
                    dragging
                      ? "border-2 border-dashed border-white bg-accent/70 opacity-100"
                      : "bg-ink/55 opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <ImageUp size={22} />
                  {dragging ? "drop to use this image" : coverSrc ? "change cover" : "upload cover"}
                  <span className="text-xs text-white/75">or drag an image here</span>
                  <input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file?.type.startsWith("image/")) setCropFile(file);
                      // lets the same file be picked again after cancelling the cropper
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            {isEdit ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {imageFile && sourceFile && (
                    <button type="button" className={btn("secondary", "sm")} onClick={() => setCropFile(sourceFile)}>
                      <Crop size={14} /> adjust crop
                    </button>
                  )}
                  <button
                    type="button"
                    aria-expanded={showCoverSearch}
                    className={btn(showCoverSearch ? "primary" : "secondary", "sm")}
                    onClick={() => setShowCoverSearch((v) => !v)}
                  >
                    <Sparkles size={14} /> recommended covers
                  </button>
                  {coverSrc && (
                    <button type="button" className={btn("ghost", "sm")} onClick={applyDefaultCover}>
                      <ImageOff size={14} /> use default cover
                    </button>
                  )}
                  {coverChanged && item.image_url && (
                    <button type="button" className={btn("ghost", "sm")} onClick={resetCover}>
                      <RotateCcw size={14} /> back to current cover
                    </button>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {showCoverSearch && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <CoverSearch
                        initialQuery={form?.title || item.title}
                        type={item.type}
                        onPick={(m) => {
                          setPickedCover(m.image_url);
                          setImageFile(null);
                          setSourceFile(null);
                          setDeleteThumbnail(false);
                          setShowCoverSearch(false);
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <ImageCropper
                  file={cropFile}
                  aspect={3 / 4}
                  outputWidth={600}
                  title="frame your cover"
                  onCancel={() => setCropFile(null)}
                  onDone={applyCrop}
                />
              </div>
            ) : (
              item.source &&
              (isUrl(item.source) ? (
                <a href={item.source} target="_blank" rel="noreferrer" className={btn("primary", "lg", "w-full")}>
                  continue on {sourceLabel(item.source)} <ArrowUpRight size={17} />
                </a>
              ) : (
                <div className="flex h-12 items-center justify-between border border-line bg-white px-4 text-sm">
                  <span className="text-muted">{item.type === "read" ? "where to read" : "where to watch"}</span>
                  <span className="font-mono">{item.source}</span>
                </div>
              ))
            )}
          </motion.div>

          <div className="min-w-0 flex-[999_1_480px]">
            <AnimatePresence mode="wait" initial={false}>
              {!isEdit ? (
                <motion.div
                  key="view"
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                  variants={stagger(0.07, 0.1)}
                >
                  <motion.div variants={fadeUp} className="mb-5 flex flex-wrap gap-2 text-xs">
                    <span className="bg-ink px-2.5 py-1 text-white">{item.type}</span>
                    {item.is_completed && <span className="bg-done px-2.5 py-1 text-white">finished</span>}
                    {seasons.length > 1 && (
                      <span className="border border-ink px-2.5 py-1 text-ink">
                        {seasons.length} {unit.part}s
                      </span>
                    )}
                    {rewatches > 0 && (
                      <span className="flex items-center gap-1 bg-accent-soft px-2.5 py-1 text-accent">
                        <Repeat size={12} /> {unit.again} ×{rewatches}
                      </span>
                    )}
                    {(item.category ?? []).map((cat) => (
                      <span key={cat} className="border border-line px-2.5 py-1 text-body">
                        {cat}
                      </span>
                    ))}
                  </motion.div>

                  <motion.h1
                    variants={fadeUp}
                    className="mb-4 font-serif text-[44px] leading-[1.02] tracking-[-0.025em] break-words sm:text-[60px]"
                  >
                    {item.title}
                  </motion.h1>

                  <motion.p variants={fadeUp} className="mb-9 max-w-xl text-base leading-relaxed text-muted">
                    {item.description || "no description yet. add a line to remember it by."}
                  </motion.p>

                  {item.is_completed ? (
                    <motion.section
                      variants={fadeUp}
                      className="flex flex-wrap items-center justify-between gap-6 border border-done/20 bg-done-soft p-6"
                    >
                      <div>
                        <p className="eyebrow mb-2 text-done">
                          finished{ratedSeasons > 1 && ` · average of ${ratedSeasons} ${unit.part}s`}
                        </p>
                        <div className="flex items-center gap-3">
                          <StarDisplay rating={item.rating} size={28} />
                          <span className="font-serif text-4xl">{item.rating}/5</span>
                        </div>
                      </div>
                      <p className="font-mono text-sm text-body">
                        {seasons.length > 1
                          ? `${seasons.length} ${unit.part}s`
                          : `${item.last_episode} ${unit.plural}`}
                      </p>
                    </motion.section>
                  ) : (
                    <motion.section variants={fadeUp} className="border border-line bg-white p-6">
                      <div className="flex flex-wrap items-end justify-between gap-5">
                        <div>
                          <p className="eyebrow mb-1">
                            you're on {unit.part} {season}
                            {rewatches > 0 && ` · ${unit.again} ${rewatches}`}
                          </p>
                          <p className="font-serif text-[56px] leading-[0.95] tracking-[-0.02em] sm:text-[68px]">
                            {unit.long}{" "}
                            <AnimatedNumber value={item.last_episode} direction={direction} />
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => step(-1)}
                            aria-label={`one ${unit.long} back`}
                            className={btn("secondary", "lg", "w-[52px] px-0")}
                          >
                            <Minus size={18} />
                          </motion.button>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.94 }}
                            onClick={() => step(1)}
                            className={btn("primary", "lg")}
                          >
                            <Plus size={18} /> 1 {unit.long}
                          </motion.button>
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-4 text-sm text-muted">
                        {item.source && (
                          <span>
                            {item.type === "read" ? "reading on" : "watching on"}{" "}
                            <span className="text-ink">{sourceLabel(item.source)}</span>
                          </span>
                        )}
                        {added && (
                          <span>
                            added <span className="text-ink">{added}</span>
                          </span>
                        )}
                        <AnimatePresence>
                          {log.isSuccess && (
                            <motion.span
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-1 text-done"
                            >
                              <Check size={14} /> saved
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.section>
                  )}

                  <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
                    {item.is_completed ? (
                      <>
                        <button
                          type="button"
                          className={btn("primary", "lg")}
                          onClick={() => setRewatchFrom(seasons[0].season)}
                        >
                          <Repeat size={16} /> {unit.again}
                        </button>
                        <button type="button" className={btn("secondary", "lg")} onClick={() => setShowUncomplete(true)}>
                          <RotateCcw size={16} /> back to in progress
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={btn("done", "lg")}
                        disabled={busy}
                        onClick={() => {
                          setRating(activeSeason?.rating ?? 0);
                          setRatingError("");
                          setShowComplete(true);
                        }}
                      >
                        <Check size={17} />{" "}
                        {finishesAll ? "mark as finished" : `finish ${unit.part} ${season}`}
                      </button>
                    )}
                    <button
                      type="button"
                      className={btn("secondary", "lg")}
                      onClick={() => {
                        setNextRating(activeSeason?.rating ?? 0);
                        setNextError("");
                        setShowSeason(true);
                      }}
                    >
                      <Layers size={16} /> next {unit.part}
                    </button>
                    <button type="button" className={btn("secondary", "lg")} onClick={startEdit}>
                      <Pencil size={15} /> edit
                    </button>
                    <button
                      type="button"
                      className={btn("ghost", "lg", "text-danger hover:text-danger hover:underline")}
                      onClick={() => setShowDelete(true)}
                    >
                      delete
                    </button>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <SeasonPanel item={item} onChange={applyUpdate} onRewatch={setRewatchFrom} />
                  </motion.div>
                </motion.div>
              ) : (
                form && (
                  <motion.form
                    key="edit"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.5, ease: easeOut }}
                    className="flex flex-col gap-6"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSave();
                    }}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-ink px-2.5 py-1 text-white">{item.type}</span>
                      <span className="bg-accent-soft px-2.5 py-1 text-accent">editing</span>
                    </div>

                    <div>
                      <label htmlFor="edit-title" className="label">title</label>
                      <input
                        id="edit-title"
                        className="field h-14 font-serif text-2xl"
                        value={form.title}
                        aria-invalid={!!errors.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                      />
                      {errors.title && <p className="mt-1.5 text-sm text-danger">{errors.title}</p>}
                    </div>

                    <div>
                      <label htmlFor="edit-cat" className="label">categories</label>
                      <TagInput id="edit-cat" value={form.category} onChange={(category) => setForm({ ...form, category })} />
                    </div>

                    <div>
                      <label htmlFor="edit-desc" className="label">description</label>
                      <textarea
                        id="edit-desc"
                        rows={3}
                        className="field"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="edit-source" className="label">
                          {item.type === "read" ? "where to read" : "where to watch"}
                        </label>
                        <input
                          id="edit-source"
                          className="field"
                          value={form.source}
                          placeholder="a site, an app, or a link"
                          onChange={(e) => setForm({ ...form, source: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-ep" className="label">
                          {item.is_completed ? "total" : "last"} {unit.long}
                          {seasons.length > 1 && ` · ${unit.part} ${season}`}
                        </label>
                        <input
                          id="edit-ep"
                          type="number"
                          inputMode="numeric"
                          className="field font-mono"
                          value={form.last_episode}
                          aria-invalid={!!errors.lastEpisode}
                          onChange={(e) => setForm({ ...form, last_episode: e.target.value })}
                        />
                        {errors.lastEpisode && <p className="mt-1.5 text-sm text-danger">{errors.lastEpisode}</p>}
                      </div>
                    </div>

                    {item.is_completed && seasons.length === 1 && (
                      <div>
                        <span className="label">rating</span>
                        <StarPicker value={form.rating} onChange={(r) => setForm({ ...form, rating: r })} />
                        {errors.rating && <p className="mt-1.5 text-sm text-danger">{errors.rating}</p>}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 border-t border-line pt-6">
                      <button type="submit" disabled={saving} className={btn("primary", "lg")}>
                        {saving ? "saving…" : "save changes"}
                      </button>
                      <button type="button" disabled={saving} className={btn("secondary", "lg")} onClick={cancelEdit}>
                        cancel
                      </button>
                    </div>
                  </motion.form>
                )
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />

      <Modal
        open={showComplete}
        onClose={() => !busy && setShowComplete(false)}
        title={seasons.length > 1 ? `finished ${unit.part} ${season}?` : "finished it?"}
      >
        <p className="mb-5 text-sm text-muted">
          {seasons.length > 1 ? `rate ${unit.part} ${season} out of five. ` : "rate it out of five. "}
          {finishesAll
            ? "it moves to your finished shelf."
            : `the title stays on your shelf while other ${unit.part}s are still going.`}
        </p>
        <StarPicker
          value={rating}
          onChange={(r) => {
            setRating(r);
            setRatingError("");
          }}
        />
        <AnimatePresence>
          {ratingError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 text-sm text-danger"
            >
              {ratingError}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="mt-7 flex gap-3">
          <button type="button" className={btn("done", "lg")} onClick={confirmComplete} disabled={busy}>
            {busy ? "saving…" : "mark as finished"}
          </button>
          <button type="button" className={btn("secondary", "lg")} onClick={() => setShowComplete(false)} disabled={busy}>
            not yet
          </button>
        </div>
      </Modal>

      <Modal open={showUncomplete} onClose={() => !busy && setShowUncomplete(false)} title="back to in progress?">
        <p className="mb-7 text-sm text-muted">it returns to your {item.type} shelf. your ratings are kept.</p>
        <div className="flex gap-3">
          <button type="button" className={btn("primary", "lg")} onClick={confirmUncomplete} disabled={busy}>
            {busy ? "moving…" : "yes, move it back"}
          </button>
          <button type="button" className={btn("secondary", "lg")} onClick={() => setShowUncomplete(false)} disabled={busy}>
            cancel
          </button>
        </div>
      </Modal>

      <Modal open={rewatchFrom !== null} onClose={() => !busy && setRewatchFrom(null)} title={`start a ${unit.again}?`}>
        {finishedSeasons.length > 1 && (
          <fieldset className="mb-5">
            <legend className="label">start from</legend>
            <div className="flex flex-wrap gap-2">
              {finishedSeasons.map((s) => (
                <button
                  key={s.season}
                  type="button"
                  aria-pressed={rewatchFrom === s.season}
                  onClick={() => setRewatchFrom(s.season)}
                  className={`h-10 border px-3.5 font-mono text-sm transition-colors ${
                    rewatchFrom === s.season ? "border-ink bg-ink text-white" : "border-line-strong bg-white hover:border-ink"
                  }`}
                >
                  {unit.part} {s.season}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <p className="mb-2 text-sm text-muted">
          {seasons.length > 1 ? `${unit.part} ${rewatchFrom} ` : "it "}will start from {unit.long} 0
          {item.is_completed ? ` and move back to your ${item.type} shelf.` : "."}
          {seasons.length > 1 && ` your other ${unit.part}s keep their progress.`}
        </p>
        <p className="mb-7 text-sm text-muted">
          {(seasons.find((s) => s.season === rewatchFrom)?.rating ?? 0) > 0 &&
            `its ${seasons.find((s) => s.season === rewatchFrom)?.rating}/5 rating is kept, and `}
          this becomes {unit.again}{" "}
          <span className="font-mono text-ink">×{rewatches + 1}</span>.
        </p>
        <div className="flex gap-3">
          <button type="button" className={btn("primary", "lg")} onClick={confirmRewatch} disabled={busy}>
            <Repeat size={16} /> {busy ? "starting…" : `start from ${unit.long} 0`}
          </button>
          <button type="button" className={btn("secondary", "lg")} onClick={() => setRewatchFrom(null)} disabled={busy}>
            cancel
          </button>
        </div>
      </Modal>

      <Modal open={showSeason} onClose={() => !busy && setShowSeason(false)} title={`on to ${unit.part} ${season + 1}?`}>
        <p className="mb-5 text-sm text-muted">
          {unit.part} {season} is marked finished and stays on the list.{" "}
          {nextExisting
            ? `${unit.part} ${season + 1} is already there, so it picks up where you left it.`
            : `how should ${unit.plural} count in ${unit.part} ${season + 1}?`}
          {item.is_completed && " it also moves back to your shelf."}
        </p>
        <div className="mb-5">
          <span className="label">
            {unit.part} {season} rating
            {activeSeason?.rating != null && <span className="font-normal text-muted"> (saved, change it if you like)</span>}
          </span>
          <StarPicker
            value={nextRating}
            onChange={(r) => {
              setNextRating(r);
              setNextError("");
            }}
          />
          {nextError && <p className="mt-1.5 text-sm text-danger">{nextError}</p>}
        </div>
        {nextExisting ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => confirmNextSeason(false)}
            className="flex w-full flex-col items-start gap-0.5 border border-line-strong bg-white px-4 py-3.5 text-left transition-colors hover:border-ink disabled:opacity-50"
          >
            <span className="font-medium">continue {unit.part} {season + 1}</span>
            <span className="text-sm text-muted">
              at {unit.long} {nextExisting.last_episode}
            </span>
          </button>
        ) : (
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => confirmNextSeason(false)}
              className="flex flex-col items-start gap-0.5 border border-line-strong bg-white px-4 py-3.5 text-left transition-colors hover:border-ink disabled:opacity-50"
            >
              <span className="font-medium">keep counting</span>
              <span className="text-sm text-muted">
                next is {unit.long} {item.last_episode + 1}, carried on from {unit.part} {season}
              </span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => confirmNextSeason(true)}
              className="flex flex-col items-start gap-0.5 border border-line-strong bg-white px-4 py-3.5 text-left transition-colors hover:border-ink disabled:opacity-50"
            >
              <span className="font-medium">start from 0</span>
              <span className="text-sm text-muted">
                {unit.part} {season + 1} starts at {unit.long} 0, next is {unit.long} 1
              </span>
            </button>
          </div>
        )}
        <button
          type="button"
          className={btn("ghost", "md", "mt-4 px-0")}
          onClick={() => setShowSeason(false)}
          disabled={busy}
        >
          {busy ? "saving…" : "cancel"}
        </button>
      </Modal>

      <Modal open={showDelete} onClose={() => !busy && setShowDelete(false)} title="delete this title?" tone="danger">
        <p className="mb-7 text-sm text-muted">
          “{item.title}” and its cover will be removed from your shelf. this can't be undone.
        </p>
        <div className="flex gap-3">
          <button type="button" className={btn("danger", "lg")} onClick={handleDelete} disabled={busy}>
            {busy ? "deleting…" : "delete"}
          </button>
          <button type="button" className={btn("secondary", "lg")} onClick={() => setShowDelete(false)} disabled={busy}>
            keep it
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Card;
