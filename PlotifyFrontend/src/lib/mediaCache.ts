import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { mediaKeys } from "./queries";
import type { Media, MediaStats, PaginatedMediaResponse } from "../types/media";

// write helpers so a change shows up everywhere at once, without refetching every shelf

type Uid = string | null | undefined;
type ShelfPages = InfiniteData<PaginatedMediaResponse>;

const isShelf = (data: unknown): data is ShelfPages => !!data && typeof data === "object" && "pages" in data;
const isStats = (data: unknown): data is MediaStats => !!data && typeof data === "object" && "favourites" in data;

// maps one item across every page; returning null drops it and lowers the totals
const updateShelf = (data: ShelfPages, id: number, fn: (m: Media) => Media | null): ShelfPages => {
  let removed = 0;
  const pages = data.pages.map((page) => ({
    ...page,
    data: page.data.flatMap((m) => {
      if (m.id !== id) return [m];
      const next = fn(m);
      if (!next) removed += 1;
      return next ? [next] : [];
    }),
  }));

  return { ...data, pages: removed ? pages.map((p) => ({ ...p, total: p.total - removed })) : pages };
};

// an item already loaded by a shelf or the profile, so a card can open without waiting
export const findCachedMedia = (qc: QueryClient, uid: Uid, id: number) => {
  for (const [key, data] of qc.getQueriesData({ queryKey: mediaKeys.all(uid) })) {
    const pool = isShelf(data)
      ? data.pages.flatMap((p) => p.data)
      : isStats(data)
        ? [...data.ongoing, ...data.favourites]
        : [];
    const hit = pool.find((m) => m.id === id);
    if (hit) return { data: hit, updatedAt: qc.getQueryState(key)?.dataUpdatedAt };
  }
  return undefined;
};

export const patchMedia = (qc: QueryClient, uid: Uid, id: number, patch: Partial<Media>) => {
  const merge = (m: Media) => (m.id === id ? { ...m, ...patch } : m);

  qc.setQueryData<Media>(mediaKeys.item(uid, id), (m) => m && merge(m));

  // an item that no longer matches a shelf tab (completed / ongoing) leaves that tab
  for (const [key, data] of qc.getQueriesData<ShelfPages>({ queryKey: mediaKeys.lists(uid) })) {
    if (!data) continue;
    const isCompleted = key[4];
    qc.setQueryData<ShelfPages>(
      key,
      updateShelf(data, id, (m) => {
        const next = merge(m);
        return next.is_completed === isCompleted ? next : null;
      }),
    );
  }

  qc.setQueryData<MediaStats>(
    mediaKeys.stats(uid),
    (s) => s && { ...s, ongoing: s.ongoing.map(merge), favourites: s.favourites.map(merge) },
  );
};

// new items land at the top of the unfiltered tab they belong to
export const addMedia = (qc: QueryClient, uid: Uid, media: Media) => {
  qc.setQueryData(mediaKeys.item(uid, media.id), media);

  for (const [key, data] of qc.getQueriesData<ShelfPages>({ queryKey: mediaKeys.lists(uid) })) {
    const [, , , type, isCompleted, search] = key;
    if (!data || type !== media.type || isCompleted !== media.is_completed || search) continue;

    qc.setQueryData<ShelfPages>(key, {
      ...data,
      pages: data.pages.map((page, i) => ({
        ...page,
        data: i === 0 ? [media, ...page.data] : page.data,
        total: page.total + 1,
      })),
    });
  }
};

// drops a deleted item from the shelves; its own item query is left to the caller,
// which may still be on screen
export const removeMedia = (qc: QueryClient, uid: Uid, id: number) => {
  for (const [key, data] of qc.getQueriesData<ShelfPages>({ queryKey: mediaKeys.lists(uid) })) {
    if (data) qc.setQueryData<ShelfPages>(key, updateShelf(data, id, () => null));
  }
};

// marks shelves and stats stale after a change; only what's on screen refetches,
// and nobody waits for it
export const refreshMedia = (qc: QueryClient, uid: Uid) => {
  void qc.invalidateQueries({
    queryKey: mediaKeys.all(uid),
    predicate: (query) => query.queryKey[2] !== "item",
  });
};

export const snapshotMedia = (qc: QueryClient, uid: Uid) => {
  const snapshot = qc.getQueriesData({ queryKey: mediaKeys.all(uid) });
  return () => snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
};
