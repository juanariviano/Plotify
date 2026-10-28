import { useAuth } from "@clerk/chrome-extension";
import { useCallback } from "react";

export const useToken = () => {
  const { getToken } = useAuth();

  return useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("No token");
    return token;
  }, [getToken]);
};
