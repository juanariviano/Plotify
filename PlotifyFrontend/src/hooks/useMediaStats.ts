import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { mediaStatsOptions } from "../lib/queries";

// everything the profile page shows, in one request
export const useMediaStats = () => {
  const { userId, getToken } = useAuth();
  return useQuery(mediaStatsOptions(userId, getToken));
};
