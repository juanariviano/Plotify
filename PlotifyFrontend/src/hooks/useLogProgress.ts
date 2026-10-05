import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { updateMedia } from "../services/media.service";
import type { Media, PaginatedMediaResponse } from "../types/media";

type LogVars = { item: Media; next: number };

// sets last_episode for one item, updating every cached shelf page immediately
export const useLogProgress = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ item, next }: LogVars) => {
      const token = await getToken();
      if (!token) throw new Error("No token");

      return updateMedia({
        token,
        id: item.id,
        mediaData: {
          title: item.title,
          description: item.description,
          category: item.category,
          source: item.source,
          image_url: item.image_url,
          last_episode: next,
        },
      });
    },
    onMutate: async ({ item, next }) => {
      await queryClient.cancelQueries({ queryKey: ["media"] });
      const snapshot = queryClient.getQueriesData({ queryKey: ["media"] });

      queryClient.setQueriesData<InfiniteData<PaginatedMediaResponse>>({ queryKey: ["media"] }, (data) => {
        if (!data?.pages) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            data: page.data.map((m) => (m.id === item.id ? { ...m, last_episode: next } : m)),
          })),
        };
      });

      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
  });
};
