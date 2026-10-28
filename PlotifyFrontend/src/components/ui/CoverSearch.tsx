import { useAuth } from "@clerk/clerk-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { lookupMedia } from "../../services/media.service";
import { requireToken } from "../../lib/queries";
import { stagger, fadeUp } from "../../lib/motion";
import { SOURCE_NAMES } from "../../lib/ui";
import type { ExternalMedia } from "../../types/chat";
import Cover from "./Cover";

type CoverSearchProps = {
  initialQuery: string;
  type: "screen" | "read";
  onPick: (match: ExternalMedia) => void;
};

// covers from tmdb / anilist / open library for a title; same cache as the add page lookup
const CoverSearch = ({ initialQuery, type, onPick }: CoverSearchProps) => {
  const { getToken } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery.trim());

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const lookup = useQuery({
    queryKey: ["lookup", type, debounced],
    queryFn: async ({ signal }) => lookupMedia(await requireToken(getToken), debounced, type, signal),
    enabled: debounced.length >= 2,
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const covers = (lookup.data ?? []).filter((m) => m.image_url);

  return (
    <div className="flex flex-col gap-3 border border-line bg-soft p-4">
      <label className="flex h-10 items-center gap-2 border border-line-strong bg-white px-3 focus-within:border-ink">
        <Search size={15} className="shrink-0 text-muted" />
        <span className="sr-only">search covers</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search a title"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none normal-case"
        />
      </label>

      {lookup.isFetching && !covers.length ? (
        <div className="grid grid-cols-4 gap-2" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4]" />
          ))}
        </div>
      ) : covers.length ? (
        <motion.ul
          key={debounced}
          initial="hidden"
          animate="show"
          variants={stagger(0.04)}
          className="grid grid-cols-4 gap-2"
          aria-label="covers found"
        >
          {covers.map((m) => (
            <motion.li key={`${m.external_source}:${m.external_id}`} variants={fadeUp}>
              <button
                type="button"
                onClick={() => onPick(m)}
                title={`${m.title}${m.year ? ` (${m.year})` : ""} · ${SOURCE_NAMES[m.external_source]}`}
                className="block w-full outline-offset-2 transition-transform hover:-translate-y-0.5"
              >
                <Cover title={m.title} src={m.image_url} showTitle={false} className="aspect-[3/4] w-full" />
                <span className="mt-1 block truncate text-[11px] text-muted normal-case">{m.title}</span>
              </button>
            </motion.li>
          ))}
        </motion.ul>
      ) : (
        <p className="text-sm text-muted">
          {debounced.length < 2 ? "type a title to search." : "no covers found. try another spelling."}
        </p>
      )}
    </div>
  );
};

export default CoverSearch;
