import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, ChevronRight, LoaderCircle, Plus, Search, Tv } from "lucide-react";
import Cover from "./Cover";
import { findMedia } from "../services/media.service";
import { useToken } from "../lib/useToken";
import { useDebounced } from "../lib/useDebounced";
import { btn, unitOf } from "../lib/ui";
import { fade, rise } from "../lib/motion";
import type { Media, MediaType } from "../types";

type Props = {
  initialType: MediaType;
  // judul yang cocok dengan halaman ini, ditampilkan paling atas saat belum mencari
  suggested: Media[];
  onPick: (item: Media) => void;
  onAdd: () => void;
};

export const TypeTabs = ({ value, onChange }: { value: MediaType; onChange: (type: MediaType) => void }) => (
  <div className="grid grid-cols-2 border border-line-strong bg-white p-1" role="radiogroup" aria-label="type">
    {(["screen", "read"] as const).map((t) => (
      <button
        key={t}
        type="button"
        role="radio"
        aria-checked={value === t}
        onClick={() => onChange(t)}
        className={`relative flex h-9 items-center justify-center gap-1.5 text-[13px] font-medium transition-colors duration-200 ${
          value === t ? "text-white" : "text-muted hover:text-ink"
        }`}
      >
        {value === t && (
          <motion.span
            layoutId="type-pill"
            className="absolute inset-0 bg-ink"
            transition={{ type: "spring", stiffness: 480, damping: 36 }}
          />
        )}
        <span className="relative flex items-center gap-1.5">
          {t === "screen" ? <Tv size={14} /> : <BookOpen size={14} />}
          {t}
        </span>
      </button>
    ))}
  </div>
);

export const MediaRow = ({ item, index = 0, onClick }: { item: Media; index?: number; onClick: () => void }) => (
  <motion.button
    {...rise(index)}
    type="button"
    onClick={onClick}
    whileTap={{ scale: 0.98 }}
    className="group flex w-full items-center gap-3 border border-line bg-white p-2.5 text-left transition-colors hover:border-ink"
  >
    <Cover title={item.title} image={item.image_url} className="h-14 w-10" />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium">{item.title}</span>
      <span className="mt-0.5 block font-mono text-xs text-muted">
        {unitOf(item.type).short} {item.last_episode}
        {item.is_completed && <span className="ml-2 font-sans text-done">finished</span>}
      </span>
    </span>
    <ChevronRight size={16} className="shrink-0 text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
  </motion.button>
);

// pilih judul mana saja dari rak screen / read milik user
const ListPicker = ({ initialType, suggested, onPick, onAdd }: Props) => {
  const getToken = useToken();
  const [type, setType] = useState<MediaType>(initialType);
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 300);

  const list = useQuery({
    queryKey: ["shelf", type, q],
    queryFn: async ({ signal }) => (await findMedia(await getToken(), { type, q, limit: 30 }, signal)).data,
    staleTime: 60 * 1000,
  });

  const onPage = q ? [] : suggested.filter((m) => m.type === type);
  const rest = (list.data ?? []).filter((m) => !onPage.some((s) => s.id === m.id));

  return (
    <div className="px-5 pb-5">
      <p className="mb-3 font-serif text-[22px]">pick a title</p>
      <TypeTabs value={type} onChange={setType} />

      <div className="relative mt-3">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-dim" />
        <input
          className="field pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`search your ${type} list`}
          aria-label={`search your ${type} list`}
          autoFocus
        />
      </div>

      <div className="-mx-1 mt-3 max-h-[290px] space-y-2 overflow-y-auto px-1 pb-1">
        {onPage.length > 0 && <p className="label mb-1.5 text-muted">on this page</p>}
        {onPage.map((item, i) => (
          <MediaRow key={item.id} item={item} index={i} onClick={() => onPick(item)} />
        ))}
        {onPage.length > 0 && rest.length > 0 && <p className="label mt-4 mb-1.5 text-muted">your list</p>}
        {/* key ikut type + q supaya animasi masuk diputar ulang saat ganti tab / pencarian */}
        <div key={`${type}-${q}`} className="space-y-2">
          {rest.map((item, i) => (
            <MediaRow key={item.id} item={item} index={onPage.length + i} onClick={() => onPick(item)} />
          ))}
        </div>
        <AnimatePresence>
          {list.isPending && (
            <motion.div {...fade} className="flex justify-center py-8">
              <LoaderCircle size={20} className="animate-spin text-muted" />
            </motion.div>
          )}
        </AnimatePresence>
        {list.isError && <p className="py-6 text-center text-[13px] text-danger">couldn't load your list</p>}
        {list.isSuccess && onPage.length + rest.length === 0 && (
          <motion.p {...fade} className="py-8 text-center text-[13px] text-muted">
            {q ? "nothing matches that." : `your ${type} list is empty.`}
          </motion.p>
        )}
      </div>

      <button type="button" onClick={onAdd} className={btn("secondary", "lg", "mt-4 w-full")}>
        <Plus size={16} /> add a new title
      </button>
    </div>
  );
};

export default ListPicker;
