import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMedia } from "../services/media.service";
import { mediaKeys, requireToken } from "../lib/queries";
import { patchMedia, snapshotMedia } from "../lib/mediaCache";
import type { Media } from "../types/media";

type LogVars = { item: Media; next: number };

// sets last_episode for one item, updating every cached copy immediately
export const useLogProgress = () => {
  const { userId, getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ item, next }: LogVars) =>
      updateMedia({
        token: await requireToken(getToken),
        id: item.id,
        mediaData: {
          title: item.title,
          description: item.description,
          category: item.category,
          source: item.source,
          image_url: item.image_url,
          last_episode: next,
        },
      }),
    onMutate: async ({ item, next }) => {
      await queryClient.cancelQueries({ queryKey: mediaKeys.all(userId) });
      const restore = snapshotMedia(queryClient, userId);
      patchMedia(queryClient, userId, item.id, { last_episode: next });
      return { restore };
    },
    onError: (_err, _vars, context) => {
      context?.restore();
    },
  });
};
