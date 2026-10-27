import axios from "axios";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getUserData } from "../services/profile.service";
import { clearCache } from "../lib/queryClient";

const isMissingProfile = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 404;

// several components read the profile at once; only the first one signs out
let signingOut = false;

// the signed-in user's profile row. if the backend has no row for this clerk user
// (404), the session is stale, so sign out instead of rendering a broken page.
// not used on /verifysignup, where a missing row is expected for new accounts.
export const useProfile = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user id");
      return getUserData(await getToken());
    },
    enabled: !!isLoaded && !!user?.id,
    staleTime: 1000 * 60 * 10,
    retry: (failureCount, error) => !isMissingProfile(error) && failureCount < 3,
  });

  const missing = isMissingProfile(query.error);

  useEffect(() => {
    if (!missing || signingOut) return;
    signingOut = true;
    clearCache();
    signOut({ redirectUrl: "/signin" }).finally(() => {
      signingOut = false;
    });
  }, [missing, signOut]);

  return { ...query, user, isLoaded, missing };
};
