import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { getMediaData } from "../services/media.service";

const DEFAULT_PAGE_SIZE = 20;

export { DEFAULT_PAGE_SIZE };

type UseMediaInfiniteOptions = {
  type: "screen" | "read";
  isCompleted: boolean;
  search?: string;
  pageSize?: number;
};

export const useMediaInfinite = ({
  type,
  isCompleted,
  search = "",
  pageSize = DEFAULT_PAGE_SIZE,
}: UseMediaInfiniteOptions) => {
  const { getToken } = useAuth();

  const query = useInfiniteQuery({
    queryKey: ["media", type, isCompleted, search],
    queryFn: async ({ pageParam }) => {
      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      return getMediaData({
        token,
        page: pageParam,
        limit: pageSize,
        type,
        is_completed: isCompleted,
        q: search || undefined,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.limit);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 10,
  });

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
