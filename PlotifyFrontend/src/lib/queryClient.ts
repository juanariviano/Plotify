import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { removeOldestQuery, type PersistQueryClientProviderProps } from "@tanstack/react-query-persist-client";

const DAY = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      // must be at least the persist maxAge, or restored queries are dropped right away
      gcTime: DAY,
      retry: 1,
    },
  },
});

// queries tied to one account; their key is always [scope, clerkUserId, ...]
export const USER_SCOPES = ["media", "profile"];

const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    // storage can be unavailable (private mode); the app just won't persist
    return undefined;
  }
})();

const persister = createSyncStoragePersister({
  storage,
  key: "plotify:cache",
  retry: removeOldestQuery,
});

export const persistOptions: PersistQueryClientProviderProps["persistOptions"] = {
  persister,
  maxAge: DAY,
  buster: "1",
  dehydrateOptions: {
    // only finished shelf/profile data; search results are throwaway
    shouldDehydrateQuery: (query) => {
      const [scope, , kind, , , search] = query.queryKey;
      return (
        query.state.status === "success" &&
        USER_SCOPES.includes(scope as string) &&
        !(kind === "list" && search)
      );
    },
  },
};

// wipes memory and the saved copy, e.g. on sign-out
export const clearCache = () => {
  queryClient.clear();
  void persister.removeClient();
};
