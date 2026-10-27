import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { mediaListOptions, mediaStatsOptions } from "../lib/queries";

// start loading a page's data on hover / focus / touch, so it's ready on click.
// fresh data is left alone, so repeated hovers cost nothing
export const usePrefetch = () => {
  const { userId, getToken } = useAuth();
  const queryClient = useQueryClient();

  const run = (to: string) => {
    if (!userId) return;

    if (to === "/screen" || to === "/read") {
      const type = to === "/screen" ? "screen" : "read";
      for (const isCompleted of [false, true]) {
        void queryClient.prefetchInfiniteQuery(mediaListOptions(userId, getToken, { type, isCompleted }));
      }
    } else if (to === "/profile") {
      void queryClient.prefetchQuery(mediaStatsOptions(userId, getToken));
    }
  };

  return (to: string) => {
    const handler = () => run(to);
    return { onMouseEnter: handler, onFocus: handler, onTouchStart: handler };
  };
};
