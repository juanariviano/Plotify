import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Check, LoaderCircle, Plus } from "lucide-react";
import Cover from "./Cover";
import CoverPicker, { checkImage } from "./CoverPicker";
import { MediaRow, TypeTabs } from "./ListPicker";
import { createMedia, lookupMedia, uploadThumbnail } from "../services/media.service";
import { useToken } from "../lib/useToken";
import { useDebounced } from "../lib/useDebounced";
import { btn, unitOf } from "../lib/ui";
import { pageHost } from "../lib/match";
import { collapse, fade, pop, rise } from "../lib/motion";
import type { ExternalMedia, Media, MediaType, PageInfo } from "../types";

type Props = {
  page: PageInfo;
  options: string[];
  detected: number | null;
  initialType: MediaType;
  // media user yang judulnya mirip, ditawarkan sebelum menambah judul baru
  similar: Media[];
  onPick: (item: Media) => void;
  onBrowse: () => void;
};

const SOURCE_LABEL: Record<ExternalMedia["external_source"], string> = {
  tmdb_movie: "tmdb",
  tmdb_tv: "tmdb",
  anilist: "anilist",
  openlibrary: "open library",
};

const parseCategories = (text: string) =>
  [...new Set(text.split(",").map((c) => c.trim().slice(0, 50)).filter(Boolean))].slice(0, 20);

const AddForm = ({ page, options, detected, initialType, similar, onPick, onBrowse }: Props) => {
  const getToken = useToken();

  const [type, setType] = useState<MediaType>(initialType);
  const [title, setTitle] = useState(options[0] ?? "");
  const [image, setImage] = useState<string | null>(null);
  // file cover milik user, baru di-upload saat disimpan supaya tidak ada file yatim di storage
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("");
  const [episode, setEpisode] = useState(String(detected ?? 0));
  const [pick, setPick] = useState<ExternalMedia | null>(null);
  const canSaveSource = /^https?:/.test(page.url) && page.url.length <= 500;
  const [saveSource, setSaveSource] = useState(canSaveSource);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const q = useDebounced(title.trim(), 400);
  const lookup = useQuery({
    queryKey: ["lookup", q, type],
    queryFn: async ({ signal }) => lookupMedia(await getToken(), q, type, signal),
    enabled: q.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const applyPick = (result: ExternalMedia | null) => {
    setPick(result);
    setFile(null);
    setImage(result?.image_url ?? null);
    setDescription(result?.description ?? "");
    setCategories(result?.category.join(", ") ?? "");
    if (result) setTitle(result.title);
  };

  // hasil teratas langsung dipakai untuk mengisi form, sekali per jenis (screen / read).
  // setelah itu user bebas mengganti pilihan atau mengedit isinya
  const autoFilled = useRef<MediaType | null>(null);
  useEffect(() => {
    if (autoFilled.current === type || !lookup.data?.length || lookup.isFetching) return;
    autoFilled.current = type;
    applyPick(lookup.data[0]);
  }, [lookup.data, lookup.isFetching, type]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const lastEpisode = Number(episode);
    if (!title.trim()) return setError("title is required");
    if (!Number.isInteger(lastEpisode) || lastEpisode < 0) return setError(`${unitOf(type).long} must be 0 or more`);

    setSaving(true);
    setError("");
    try {
      const token = await getToken();
      const created = await createMedia(token, {
        title: title.trim(),
        image_url: file ? await uploadThumbnail(token, file) : image,
        description: description.trim(),
        category: parseCategories(categories),
        source: saveSource ? page.url : "",
        last_episode: lastEpisode,
        type,
        external_source: pick?.external_source ?? null,
        external_id: pick?.external_id ?? null,
      });
      onPick(created);
    } catch {
      setError("couldn't add this title, try again");
      setSaving(false);
    }
  };

  // gambar yang di-paste (cmd/ctrl+v) di mana saja di form jadi cover. paste teks tidak terpengaruh
  const onPaste = (e: ClipboardEvent) => {
    const pasted = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (!pasted) return;
    e.preventDefault();
    const invalid = checkImage(pasted);
    setError(invalid ?? "");
    if (!invalid) setFile(pasted);
  };

  return (
    <form onSubmit={submit} onPaste={onPaste}>
      <div className="px-5">
        <AnimatePresence initial={false}>
          {similar.length > 0 && (
            <motion.div {...collapse} className="overflow-hidden">
              <div className="mb-5 border border-accent/25 bg-accent-soft p-3">
                <span className="label text-accent">already in your list?</span>
                <div className="space-y-2">
                  {similar.slice(0, 3).map((item, i) => (
                    <MediaRow key={item.id} item={item} index={i} onClick={() => onPick(item)} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mb-3 font-serif text-[22px]">add a title</p>
        <TypeTabs value={type} onChange={setType} />

        <label className="label mt-5" htmlFor="title">
          title
        </label>
        <input
          id="title"
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="what are you on?"
          maxLength={200}
          autoComplete="off"
        />
        {options.length > 1 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {options.map((option, i) => (
              <motion.button
                key={option}
                {...rise(i)}
                type="button"
                onClick={() => setTitle(option)}
                whileTap={{ scale: 0.94 }}
                className={`max-w-full truncate border px-2.5 py-1 text-xs transition-colors duration-200 ${
                  option === title ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-body hover:border-ink"
                }`}
              >
                {option}
              </motion.button>
            ))}
          </div>
        )}

        <AnimatePresence initial={false}>
          {q.length >= 2 && (
            <motion.div {...collapse} className="overflow-hidden">
              <div className="pt-4">
                <span className="label flex items-center gap-1.5">
                  fill details from
                  {lookup.isFetching && <LoaderCircle size={13} className="animate-spin text-muted" />}
                </span>
                {lookup.data && lookup.data.length > 0 ? (
                  <div key={`${q}-${type}`} className="-mx-1 max-h-[208px] space-y-2 overflow-y-auto px-1 pb-1">
                    {lookup.data.map((result, i) => {
                      const active =
                        pick?.external_id === result.external_id && pick.external_source === result.external_source;
                      return (
                        <motion.button
                          key={`${result.external_source}-${result.external_id}`}
                          {...rise(i)}
                          type="button"
                          onClick={() => applyPick(active ? null : result)}
                          aria-pressed={active}
                          whileTap={{ scale: 0.98 }}
                          className={`flex w-full items-center gap-3 border p-2.5 text-left transition-colors duration-200 ${
                            active ? "border-ink bg-white shadow-[0_0_0_1px_var(--color-ink)]" : "border-line bg-white hover:border-line-strong"
                          }`}
                        >
                          <Cover title={result.title} image={result.image_url} className="h-14 w-10" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{result.title}</span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {[result.year, SOURCE_LABEL[result.external_source]].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <AnimatePresence>
                            {active && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1, transition: pop }}
                                exit={{ scale: 0 }}
                                className="flex h-6 w-6 shrink-0 items-center justify-center bg-done text-white"
                              >
                                <Check size={14} strokeWidth={3} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  !lookup.isFetching && (
                    <p className="text-[13px] text-muted">
                      {lookup.isError ? "couldn't search right now." : "no match found."} fill in the details yourself.
                    </p>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5">
          <CoverPicker title={title} image={image} file={file} onImage={setImage} onFile={setFile} />
        </div>

        <label className="label mt-4" htmlFor="description">
          description
        </label>
        <textarea
          id="description"
          className="field h-[88px] resize-none py-2.5 text-sm leading-snug"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          placeholder="optional"
        />

        <div className="mt-4 grid grid-cols-[1fr_128px] gap-3">
          <div>
            <label className="label" htmlFor="categories">
              categories
            </label>
            <input
              id="categories"
              className="field"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="action, fantasy"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label" htmlFor="episode">
              last {unitOf(type).long}
            </label>
            <input
              id="episode"
              type="number"
              inputMode="numeric"
              min={0}
              className="field text-center font-mono"
              value={episode}
              onChange={(e) => setEpisode(e.target.value)}
            />
          </div>
        </div>

        {canSaveSource && (
          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[13px] text-body">
            <input
              type="checkbox"
              checked={saveSource}
              onChange={(e) => setSaveSource(e.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            <span className="min-w-0 truncate">
              save this page as the source <span className="text-muted">({pageHost(page)})</span>
            </span>
          </label>
        )}
      </div>

      {/* tombol simpan tetap terlihat walaupun form di-scroll */}
      <div className="sticky bottom-0 mt-5 border-t border-line bg-paper/95 px-5 pt-3 pb-4 backdrop-blur">
        <AnimatePresence>
          {error && (
            <motion.p {...fade} className="mb-2 text-[13px] text-danger">
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        <motion.button
          type="submit"
          disabled={saving}
          whileTap={{ scale: 0.98 }}
          className={btn("primary", "lg", "w-full")}
        >
          {saving ? (
            <>
              <LoaderCircle size={16} className="animate-spin" /> adding…
            </>
          ) : (
            <>
              <Plus size={16} /> add to plotify
            </>
          )}
        </motion.button>
        <button type="button" onClick={onBrowse} className={btn("ghost", "sm", "mt-1 w-full")}>
          or pick a title from your list
        </button>
      </div>
    </form>
  );
};

export default AddForm;
