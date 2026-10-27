import { useAuth } from "@clerk/clerk-react";
import { useIsRestoring, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { clearCache, USER_SCOPES } from "../lib/queryClient";

// the cache survives reloads, so make sure it only ever holds the current account:
// signed out → wipe it; signed in → drop anything saved by another account
export const useCacheGuard = () => {
  const { isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();

  useEffect(() => {
    if (!isLoaded || isRestoring) return;

    if (!userId) {
      clearCache();
      return;
    }

    queryClient.removeQueries({
      predicate: (query) => USER_SCOPES.includes(query.queryKey[0] as string) && query.queryKey[1] !== userId,
    });
  }, [isLoaded, isRestoring, userId, queryClient]);
};
