import axios from "axios";
import type { CompleteProfilePayload } from "../types/auth";

export const completeProfile = async ({fullname, username, clerkId}: CompleteProfilePayload) => {
  try {
    await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/auth/completeprofile`,
      { fullname, username, clerkId},
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.log(err);
    throw err; 
  }
};
