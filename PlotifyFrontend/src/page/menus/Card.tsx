import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, ImageUp, Minus, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Media } from "../../types/media";
import {
  completeMedia,
  deleteMedia,
  deleteMediaThumbnail,
  getMediaById,
  uncompleteMedia,
  updateMedia,
  uploadThumbnail,
} from "../../services/media.service";
import { useLogProgress } from "../../hooks/useLogProgress";
import LoadingScreen from "../../components/ui/LoadingScreen";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import Cover from "../../components/ui/Cover";
import Modal from "../../components/ui/Modal";
import TagInput from "../../components/ui/TagInput";
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
  const id = searchParams.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const log = useLogProgress();

  const [item, setItem] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deleteThumbnail, setDeleteThumbnail] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showUncomplete, setShowUncomplete] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingError, setRatingError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const loadMedia = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token || !id) return;

        const data = await getMediaById(token, parseInt(id, 10));
        setItem(data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadMedia();
  }, [getToken, id]);

  useEffect(() => {
    if (item) document.title = `${item.title} · plotify`;
  }, [item]);

  const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const refreshShelves = async () => {
    await queryClient.invalidateQueries({ queryKey: ["media"] });
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
    setImageFile(null);
    setDeleteThumbnail(false);
    setIsEdit(true);
  };

  const cancelEdit = () => {
    setIsEdit(false);
    setImageFile(null);
    setDeleteThumbnail(false);
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

    if (media.is_completed && (data.rating < 0 || data.rating > 5 || !data.rating)) {
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

      let imageUrl = item.image_url;

      if (deleteThumbnail || imageFile) {
        await deleteMediaThumbnail({ token, id: item.id });
      }

      if (imageFile) {
        imageUrl = await uploadThumbnail({ token, file: imageFile });
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
        ...(item.is_completed ? { rating: form.rating } : {}),
      };

      await updateMedia({ token, id: item.id, mediaData });
      setItem({ ...item, ...mediaData, rating: item.is_completed ? form.rating : item.rating });
      await refreshShelves();
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
    setItem({ ...item, last_episode: next });
    log.mutate(
      { item, next },
      { onError: () => setItem((current) => (current ? { ...current, last_episode: item.last_episode } : current)) },
    );
  };

  const handleDelete = async () => {
    if (!item) return;
    try {
      setBusy(true);
      const token = await getToken();
      if (!token) return;

      await deleteMediaThumbnail({ token, id: item.id });
      await deleteMedia({ token, id: item.id });
      await refreshShelves();

      navigate(item.type === "read" ? "/read" : "/screen");
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

      await completeMedia({ token, id: item.id, rating });
      setItem({ ...item, is_completed: true, rating });
      await refreshShelves();
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

      await uncompleteMedia({ token, id: item.id });
      setItem({ ...item, is_completed: false });
      await refreshShelves();
      setShowUncomplete(false);
    } catch (err) {
      console.log(err);
    } finally {
      setBusy(false);
    }
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
  const coverSrc = previewUrl ?? (deleteThumbnail ? null : item.image_url);
  const added = formatAdded(item.created_at);

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
            <div className="group relative">
              <Cover
                title={isEdit && form ? form.title || item.title : item.title}
                src={coverSrc}
                className="aspect-[3/4] w-full shadow-[0_30px_60px_-30px_rgb(23_22_15/0.5)]"
                titleClassName="text-[34px]"
              />
              {isEdit && (
                <label
                  htmlFor="thumbnail-upload"
                  className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 bg-ink/55 text-sm text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-within:opacity-100"
                >
                  <ImageUp size={22} />
                  {coverSrc ? "change cover" : "upload cover"}
                  <input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImageFile(file);
                      setDeleteThumbnail(false);
                    }}
                  />
                </label>
              )}
            </div>

            {isEdit ? (
              <div className="flex flex-wrap gap-2">
                {item.image_url && !deleteThumbnail && !imageFile && (
                  <button type="button" className={btn("danger", "sm")} onClick={() => setDeleteThumbnail(true)}>
                    <Trash2 size={14} /> remove cover
                  </button>
                )}
                {(deleteThumbnail || imageFile) && (
                  <button
                    type="button"
                    className={btn("secondary", "sm")}
                    onClick={() => {
                      setDeleteThumbnail(false);
                      setImageFile(null);
                    }}
                  >
                    <RotateCcw size={14} /> restore cover
                  </button>
                )}
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
                        <p className="eyebrow mb-2 text-done">finished</p>
                        <div className="flex items-center gap-3">
                          <StarDisplay rating={item.rating} size={28} />
                          <span className="font-serif text-4xl">{item.rating}/5</span>
                        </div>
                      </div>
                      <p className="font-mono text-sm text-body">
                        {item.last_episode} {unit.plural}
                      </p>
                    </motion.section>
                  ) : (
                    <motion.section variants={fadeUp} className="border border-line bg-white p-6">
                      <div className="flex flex-wrap items-end justify-between gap-5">
                        <div>
                          <p className="eyebrow mb-1">you're on</p>
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
                      <button type="button" className={btn("secondary", "lg")} onClick={() => setShowUncomplete(true)}>
                        <RotateCcw size={16} /> back to in progress
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={btn("done", "lg")}
                        onClick={() => {
                          setRating(0);
                          setRatingError("");
                          setShowComplete(true);
                        }}
                      >
                        <Check size={17} /> mark as finished
                      </button>
                    )}
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

                    {item.is_completed && (
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

      <Modal open={showComplete} onClose={() => !busy && setShowComplete(false)} title="finished it?">
        <p className="mb-5 text-sm text-muted">rate it out of five. it moves to your finished shelf.</p>
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
        <p className="mb-7 text-sm text-muted">it returns to your {item.type} shelf. your rating is kept.</p>
        <div className="flex gap-3">
          <button type="button" className={btn("primary", "lg")} onClick={confirmUncomplete} disabled={busy}>
            {busy ? "moving…" : "yes, move it back"}
          </button>
          <button type="button" className={btn("secondary", "lg")} onClick={() => setShowUncomplete(false)} disabled={busy}>
            cancel
          </button>
        </div>
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
