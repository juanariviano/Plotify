import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ImageUp, Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createMedia, uploadThumbnail } from "../../services/media.service";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import Cover from "../../components/ui/Cover";
import TagInput from "../../components/ui/TagInput";
import AnimatedNumber from "../../components/ui/AnimatedNumber";
import { easeOut, fadeUp, stagger } from "../../lib/motion";
import { btn, sourceLabel, unitOf } from "../../lib/ui";

type ShelfType = "screen" | "read";

const SOURCE_CHIPS: Record<ShelfType, string[]> = {
  screen: ["netflix", "crunchyroll", "prime video", "disney+", "youtube"],
  read: ["kindle", "mangadex", "webtoon", "paperback", "library"],
};

const Add = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const item: ShelfType = searchParams.get("item") === "read" ? "read" : "screen";
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [lastEpisode, setLastEpisode] = useState("0");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState({ title: "", lastEpisode: "" });

  const unit = unitOf(item);
  const preview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ""), [imageFile]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    document.title = `add to ${item} · plotify`;
  }, [item]);

  const setShelf = (next: ShelfType) => setSearchParams({ item: next }, { replace: true });

  const bump = (delta: 1 | -1) => {
    const current = Number(lastEpisode) || 0;
    setDirection(delta);
    setLastEpisode(String(Math.max(0, current + delta)));
    if (errors.lastEpisode) setErrors((e) => ({ ...e, lastEpisode: "" }));
  };

  const takeFile = (file: File | undefined) => {
    if (file && file.type.startsWith("image/")) setImageFile(file);
  };

  const validate = () => {
    const next = { title: "", lastEpisode: "" };
    if (!title.trim()) next.title = "title is required";
    if (!lastEpisode.trim() || Number.isNaN(Number(lastEpisode))) {
      next.lastEpisode = item === "screen" ? "last episode is required" : "last page is required";
    }
    setErrors(next);
    return !next.title && !next.lastEpisode;
  };

  const handleSubmit = async () => {
    if (loading || !validate()) return;

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadThumbnail({ token, file: imageFile });
      }

      await createMedia({
        token,
        mediaData: {
          title: title.trim(),
          description,
          category,
          source,
          last_episode: Number(lastEpisode),
          type: item,
          image_url: imageUrl,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["media"] });
      navigate(`/${item}`);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const shownTitle = title.trim() || "your title";

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink lowercase">
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pt-10 pb-24 sm:px-10">
        <Breadcrumbs items={[{ label: item, to: `/${item}` }, { label: "add a title" }]} />

        <motion.div initial="hidden" animate="show" variants={stagger(0.08)}>
          <motion.h1 variants={fadeUp} className="mb-2 font-serif text-[48px] leading-none tracking-[-0.025em] sm:text-[56px]">
            add a title.
          </motion.h1>
          <motion.p variants={fadeUp} className="mb-10 text-muted">
            only the name and where you are matter. everything else can wait.
          </motion.p>
        </motion.div>

        <div className="flex flex-wrap items-start gap-x-16 gap-y-12">
          <motion.form
            className="flex min-w-0 flex-[999_1_560px] flex-col gap-8"
            initial="hidden"
            animate="show"
            variants={stagger(0.06, 0.15)}
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <motion.div variants={fadeUp}>
              <label htmlFor="add-title" className="label">title</label>
              <input
                id="add-title"
                autoFocus
                className="field h-[60px] border-ink font-serif text-2xl"
                placeholder={`what are you ${item === "screen" ? "watching" : "reading"}?`}
                value={title}
                aria-invalid={!!errors.title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((er) => ({ ...er, title: "" }));
                }}
              />
              {errors.title && <p className="mt-1.5 text-sm text-danger">{errors.title}</p>}
            </motion.div>

            <motion.fieldset variants={fadeUp}>
              <legend className="label">shelf</legend>
              <LayoutGroup id="add-shelf">
                <div className="inline-flex border border-line-strong bg-white p-0.5">
                  {(["screen", "read"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={item === s}
                      onClick={() => setShelf(s)}
                      className={`relative h-11 px-6 text-sm transition-colors ${item === s ? "text-white" : "text-body hover:text-ink"}`}
                    >
                      {item === s && (
                        <motion.span
                          layoutId="add-shelf-pill"
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

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-8 gap-y-3 border border-line bg-white px-6 py-5">
              <div>
                <span className="label mb-2.5">where are you?</span>
                <div className="flex items-center gap-3">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    onClick={() => bump(-1)}
                    aria-label={`one ${unit.long} less`}
                    className={btn("secondary", "md", "w-11 px-0")}
                  >
                    <Minus size={18} />
                  </motion.button>
                  <div className="min-w-[110px] text-center">
                    <div className="font-mono text-[11px] text-muted">{unit.long}</div>
                    <label htmlFor="add-ep" className="sr-only">last {unit.long}</label>
                    <input
                      id="add-ep"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={lastEpisode}
                      aria-invalid={!!errors.lastEpisode}
                      onChange={(e) => {
                        setLastEpisode(e.target.value);
                        if (errors.lastEpisode) setErrors((er) => ({ ...er, lastEpisode: "" }));
                      }}
                      className="w-[110px] bg-transparent text-center font-serif text-[44px] leading-none outline-none"
                    />
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    onClick={() => bump(1)}
                    aria-label={`one more ${unit.long}`}
                    className={btn("primary", "md", "w-11 px-0")}
                  >
                    <Plus size={18} />
                  </motion.button>
                </div>
              </div>
              <p className="max-w-[260px] text-sm text-muted">
                the last {unit.long} you finished. leave it at 0 if you haven't started.
              </p>
              {errors.lastEpisode && <p className="w-full text-sm text-danger">{errors.lastEpisode}</p>}
            </motion.div>

            <motion.div variants={fadeUp}>
              <label htmlFor="add-source" className="label">
                {item === "read" ? "where do you read it?" : "where do you watch it?"}{" "}
                <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="add-source"
                className="field"
                placeholder="a site, an app, or paste a link"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
              <div className="mt-2.5 flex flex-wrap gap-2">
                {SOURCE_CHIPS[item].map((chip) => (
                  <motion.button
                    key={chip}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setSource(chip)}
                    className={`h-8 border px-3 text-[13px] transition-colors ${
                      source === chip ? "border-ink bg-ink text-white" : "border-line bg-white text-body hover:border-ink"
                    }`}
                  >
                    {chip}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <label htmlFor="add-cat" className="label">
                categories <span className="font-normal text-muted">(optional)</span>
              </label>
              <TagInput id="add-cat" value={category} onChange={setCategory} placeholder="e.g. anime, fantasy" />
            </motion.div>

            <motion.div variants={fadeUp}>
              <label htmlFor="add-desc" className="label">
                a line to remember it by <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="add-desc"
                rows={3}
                className="field"
                placeholder="why you started, who recommended it…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <span className="label">
                cover <span className="font-normal text-muted">(optional)</span>
              </span>
              <label
                htmlFor="add-file"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  takeFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex h-28 cursor-pointer items-center justify-center gap-3 border border-dashed text-sm transition-colors ${
                  dragging ? "border-accent bg-accent-soft text-accent" : "border-[#b9b3a4] bg-white text-body hover:border-ink"
                }`}
              >
                <ImageUp size={20} />
                {imageFile ? imageFile.name : "drop an image, or click to upload"}
                <input
                  id="add-file"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => takeFile(e.target.files?.[0])}
                />
              </label>
              {imageFile && (
                <button type="button" className={btn("ghost", "sm", "mt-1 px-0")} onClick={() => setImageFile(null)}>
                  <X size={14} /> remove image
                </button>
              )}
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 border-t border-line pt-7">
              <button type="submit" disabled={loading} className={btn("primary", "lg")}>
                {loading ? "adding…" : "add to shelf"}
              </button>
              <Link to={`/${item}`} className={btn("secondary", "lg")}>cancel</Link>
              <span className="ml-1 hidden text-xs text-muted sm:inline">
                press <kbd className="border border-line-strong bg-white px-1.5 font-mono text-ink">enter</kbd> to save
              </span>
            </motion.div>
          </motion.form>

          <motion.aside
            className="w-full min-w-0 flex-[1_1_320px] lg:sticky lg:top-8"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: easeOut, delay: 0.25 }}
          >
            <p className="eyebrow mb-3">how it will look on your shelf</p>
            <div className="flex flex-col gap-5 border border-line bg-soft p-6">
              <div className="flex justify-center">
                <motion.div
                  key={preview || "tone"}
                  initial={{ rotateY: -12, opacity: 0.4 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.6, ease: easeOut }}
                  className="w-[180px]"
                  style={{ transformPerspective: 800 }}
                >
                  <Cover
                    title={shownTitle}
                    src={preview || null}
                    className="aspect-[3/4] w-full shadow-[0_24px_50px_-24px_rgb(23_22_15/0.5)]"
                    titleClassName="text-2xl"
                  />
                </motion.div>
              </div>
              <div className="flex flex-col gap-1.5 border border-line bg-white p-4">
                <span className="font-mono text-[11px] text-muted">
                  {item} · {sourceLabel(source) || "anywhere"}
                </span>
                <span className="font-serif text-[22px] leading-tight break-words">{shownTitle}</span>
                <span className="mt-1 text-sm font-semibold">
                  {unit.long} <AnimatedNumber value={Number(lastEpisode) || 0} direction={direction} />
                </span>
                <AnimatePresence initial={false}>
                  {category.length > 0 && (
                    <motion.span
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-muted"
                    >
                      {category.join(" · ")}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Add;
