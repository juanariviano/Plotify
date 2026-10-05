import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { getMediaData } from "../services/media.service";

type Shelf = "screen" | "read";

// a single small page per shelf state; enough for totals and a short preview
export const useMediaSlice = (type: Shelf, isCompleted: boolean, limit = 1) => {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["media", "slice", type, isCompleted, limit],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return getMediaData({ token, page: 1, limit, type, is_completed: isCompleted });
    },
    staleTime: 1000 * 60 * 5,
  });
};
