import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { mediaListOptions, mediaStatsOptions } from "../lib/queries";
import { routeLoaders } from "../lib/routeLoaders";

// Warm the route module and any stale shelf data on hover, focus, or touch.
export const usePrefetch = () => {
  const { userId, getToken } = useAuth();
  const queryClient = useQueryClient();

  const run = (to: string) => {
    const path = to.split(/[?#]/, 1)[0];
    if (Object.hasOwn(routeLoaders, path)) {
      void routeLoaders[path as keyof typeof routeLoaders]().catch(() => {});
    }

    if (!userId) return;

    if (path === "/screen" || path === "/read") {
      const type = path === "/screen" ? "screen" : "read";
      for (const isCompleted of [false, true]) {
        void queryClient.prefetchInfiniteQuery(mediaListOptions(userId, getToken, { type, isCompleted }));
      }
    } else if (path === "/profile") {
      void queryClient.prefetchQuery(mediaStatsOptions(userId, getToken));
    }
  };

  return (to: string) => {
    const handler = () => run(to);
    return { onMouseEnter: handler, onFocus: handler, onTouchStart: handler };
  };
};
