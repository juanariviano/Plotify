import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { DEFAULT_PAGE_SIZE, mediaListOptions, type Shelf } from "../lib/queries";

export { DEFAULT_PAGE_SIZE };

type UseMediaInfiniteOptions = {
  type: Shelf;
  isCompleted: boolean;
  search?: string;
  pageSize?: number;
};

export const useMediaInfinite = ({ type, isCompleted, search = "", pageSize }: UseMediaInfiniteOptions) => {
  const { userId, getToken } = useAuth();

  const query = useInfiniteQuery(mediaListOptions(userId, getToken, { type, isCompleted, search, pageSize }));

  const items = query.data?.pages.flatMap((page) => page.data) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    items,
    total,
    visibleCount: items.length,
    hasMore: query.hasNextPage ?? false,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
    isLoading: query.isLoading,
  };
};
