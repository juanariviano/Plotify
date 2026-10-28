import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/chrome-extension";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeftRight, ArrowUpRight } from "lucide-react";
import AddForm from "./components/AddForm";
import ListPicker from "./components/ListPicker";
import Message from "./components/Message";
import Tracker from "./components/Tracker";
import { ApiError, findMedia, lookupMedia } from "./services/media.service";
import { loadPage } from "./lib/page";
import { detectEpisode, guessType, normalize, pageHost, rankMatches, titleOptions } from "./lib/match";
import { useToken } from "./lib/useToken";
import { btn, openTab, PLOTIFY_URL } from "./lib/ui";
import { page as pageMotion } from "./lib/motion";
import type { Media, PageInfo } from "./types";

// kerangka abu-abu selama halaman dibaca dan list dicek, bentuknya mirip tampilan tracker
const Loading = () => (
  <motion.div {...pageMotion} className="animate-pulse px-5 pb-6" aria-label="loading">
    <div className="flex gap-4">
      <div className="h-[120px] w-20 bg-track" />
      <div className="flex-1 pt-1">
        <div className="h-4 w-20 bg-track" />
        <div className="mt-3 h-6 w-4/5 bg-track" />
        <div className="mt-2 h-6 w-1/2 bg-track" />
      </div>
    </div>
    <div className="mt-5 h-[118px] bg-track" />
    <div className="mt-4 h-12 bg-track" />
  </motion.div>
);

type View = { kind: "auto" } | { kind: "pick" } | { kind: "add" } | { kind: "track"; item: Media };

function Popup() {
  const getToken = useToken();
  const queryClient = useQueryClient();
  const [page, setPage] = useState<PageInfo | null | undefined>(undefined);
  // auto = pakai kecocokan terbaik dengan halaman ini (kalau tidak ada, form add)
  const [view, setView] = useState<View>({ kind: "auto" });
  const track = (item: Media) => setView({ kind: "track", item });

  useEffect(() => {
    loadPage().then(setPage, () => setPage(null));
  }, []);

  const options = useMemo(() => (page ? titleOptions(page) : []), [page]);
  const detected = useMemo(() => (page ? detectEpisode(page) : null), [page]);

  const matches = useQuery({
    queryKey: ["matches", page?.url],
    enabled: !!page,
    queryFn: async ({ signal }) => {
      const token = await getToken();
      const host = pageHost(page!);
      const empty = { data: [] as Media[] };
      const [bySite, byTitle] = await Promise.all([
        host ? findMedia(token, { site: host }, signal) : empty,
        options[0] ? findMedia(token, { q: options[0], limit: 10 }, signal) : empty,
      ]);
      const items = [...bySite.data, ...byTitle.data];
      const ranked = rankMatches(items, page!, options);
      if ((ranked[0]?.score ?? 0) >= 2 || !options[0]) return ranked;

      // belum ketemu: judulnya mungkin diganti rekomendasi waktu ditambahkan. cari judul halaman di tmdb / anilist
      // dengan key yang sama seperti form add, jadi kalau ujungnya tetap form add, hasilnya tidak diminta dua kali
      const type = guessType(page!);
      const external = await queryClient
        .fetchQuery({
          queryKey: ["lookup", options[0], type],
          queryFn: ({ signal }) => lookupMedia(token, options[0], type, signal),
          staleTime: 5 * 60 * 1000,
        })
        .catch(() => []);

      // judul rekomendasi teratas bisa beda bahasa dengan judul halaman, jadi rak juga dicari dengan judul itu
      const top = external[0]?.title;
      const byExternal =
        top && normalize(top) !== normalize(options[0]) ? await findMedia(token, { q: top, limit: 10 }, signal) : empty;
      return rankMatches([...items, ...byExternal.data], page!, options, external);
    },
  });

  if (page === null) {
    return <Message title="nothing to read here">open a tab with something you're watching or reading.</Message>;
  }

  if (matches.isError) {
    // akun clerk ada tapi profil plotify belum dibuat
    if (matches.error instanceof ApiError && matches.error.status === 404) {
      return (
        <Message
          title="almost there"
          action={
            <button type="button" onClick={() => openTab(PLOTIFY_URL)} className={btn("primary", "lg")}>
              finish setup on plotify
            </button>
          }
        >
          finish setting up your profile on plotify, then open this again.
        </Message>
      );
    }
    return (
      <Message
        title="couldn't reach plotify"
        action={
          <button type="button" onClick={() => matches.refetch()} className={btn("secondary", "lg")}>
            try again
          </button>
        }
      >
        check your connection and try again.
      </Message>
    );
  }

  if (page === undefined || matches.isPending) return <Loading />;

  const ranked = matches.data;
  const best = (ranked[0]?.score ?? 0) >= 2 ? ranked[0].item : null;
  const current = view.kind === "track" ? view.item : view.kind === "auto" ? best : null;
  const pageType = current?.type ?? guessType(page);

  let key: string;
  let content: ReactNode;

  if (current) {
    key = `track-${current.id}`;
    content = (
      <>
        <Tracker key={current.id} item={current} page={page} detected={detected} onChange={track} />
        <div className="flex items-center justify-between border-t border-line px-5 py-2.5">
          <button type="button" onClick={() => setView({ kind: "pick" })} className={btn("ghost", "sm", "-ml-3.5")}>
            <ArrowLeftRight size={14} /> change title
          </button>
          <button
            type="button"
            onClick={() => openTab(`${PLOTIFY_URL}/card?id=${current.id}`)}
            className={btn("ghost", "sm", "-mr-3.5")}
          >
            open in plotify <ArrowUpRight size={14} />
          </button>
        </div>
      </>
    );
  } else if (view.kind === "pick") {
    key = "pick";
    content = (
      <ListPicker
        initialType={pageType}
        suggested={ranked.map((m) => m.item)}
        onPick={track}
        onAdd={() => setView({ kind: "add" })}
      />
    );
  } else {
    key = "add";
    content = (
      <AddForm
        page={page}
        options={options}
        detected={detected}
        initialType={pageType}
        similar={ranked.map((m) => m.item)}
        onPick={track}
        onBrowse={() => setView({ kind: "pick" })}
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={key} {...pageMotion}>
        {content}
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <main className="pb-1">
      <header className="mb-5 flex items-center justify-between border-b border-line px-5 py-3.5">
        <button type="button" onClick={() => openTab(PLOTIFY_URL)} className="group flex items-center gap-2">
          <motion.svg
            viewBox="0 0 32 32"
            className="h-[22px] w-[22px]"
            aria-hidden="true"
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
          >
            <path d="M8 2h16v28l-8-6.2L8 30z" fill="#c2410c" />
          </motion.svg>
          <span className="font-serif text-[22px] leading-none">plotify</span>
        </button>
        <button
          type="button"
          onClick={() => openTab(PLOTIFY_URL)}
          aria-label="open plotify"
          className={btn("ghost", "sm", "-mr-3.5")}
        >
          <ArrowUpRight size={18} />
        </button>
      </header>

      {!isLoaded ? (
        <Loading />
      ) : !isSignedIn ? (
        <Message
          title="sign in to plotify"
          action={
            <button type="button" onClick={() => openTab(`${PLOTIFY_URL}/signin`)} className={btn("primary", "lg")}>
              sign in <ArrowUpRight size={16} />
            </button>
          }
        >
          sign in on the plotify website, then open this again. you'll stay signed in here too.
        </Message>
      ) : (
        <Popup />
      )}
    </main>
  );
}

export default App;
