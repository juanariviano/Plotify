import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getMediaData, getMediaStats } from "../services/media.service";

export type Shelf = "screen" | "read";
export type GetToken = () => Promise<string | null>;
type Uid = string | null | undefined;

export const DEFAULT_PAGE_SIZE = 20;

export const requireToken = async (getToken: GetToken) => {
  const token = await getToken();
  if (!token) throw new Error("No token");
  return token;
};

// every media key starts with ["media", clerkUserId] so accounts never share cache
export const mediaKeys = {
  all: (uid: Uid) => ["media", uid] as const,
  lists: (uid: Uid) => ["media", uid, "list"] as const,
  list: (uid: Uid, type: Shelf, isCompleted: boolean, search: string) =>
    ["media", uid, "list", type, isCompleted, search] as const,
  item: (uid: Uid, id: number) => ["media", uid, "item", id] as const,
  stats: (uid: Uid) => ["media", uid, "stats"] as const,
};

type ListParams = { type: Shelf; isCompleted: boolean; search?: string; pageSize?: number };

export const mediaListOptions = (
  uid: Uid,
  getToken: GetToken,
  { type, isCompleted, search = "", pageSize = DEFAULT_PAGE_SIZE }: ListParams,
) =>
  infiniteQueryOptions({
    queryKey: mediaKeys.list(uid, type, isCompleted, search),
    queryFn: async ({ pageParam, signal }) =>
      getMediaData({
        token: await requireToken(getToken),
        page: pageParam,
        limit: pageSize,
        type,
        is_completed: isCompleted,
        q: search || undefined,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.limit);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    enabled: !!uid,
    // search results go stale fast and aren't persisted, so don't hold them all day
    ...(search ? { gcTime: 1000 * 60 * 5 } : {}),
  });

export const mediaStatsOptions = (uid: Uid, getToken: GetToken) =>
  queryOptions({
    queryKey: mediaKeys.stats(uid),
    queryFn: async ({ signal }) => getMediaStats(await requireToken(getToken), signal),
    enabled: !!uid,
  });
