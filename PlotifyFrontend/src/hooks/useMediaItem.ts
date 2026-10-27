import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMediaById } from "../services/media.service";
import { mediaKeys, requireToken } from "../lib/queries";
import { findCachedMedia } from "../lib/mediaCache";

// one item; starts from the copy a shelf already loaded, so the card opens instantly
export const useMediaItem = (id: number) => {
  const { userId, getToken } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: mediaKeys.item(userId, id),
    queryFn: async ({ signal }) => getMediaById(await requireToken(getToken), id, signal),
    enabled: !!userId && Number.isInteger(id),
    initialData: () => findCachedMedia(queryClient, userId, id)?.data,
    initialDataUpdatedAt: () => findCachedMedia(queryClient, userId, id)?.updatedAt,
    // a 404 means it's gone; retrying won't bring it back
    retry: (count, error) => !(axios.isAxiosError(error) && error.response?.status === 404) && count < 1,
  });
};
