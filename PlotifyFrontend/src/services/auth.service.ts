import axios from "axios";
import type { CompleteProfilePayload } from "../types/auth";

export const completeProfile = async ({fullname, username, token}: CompleteProfilePayload) => {
  try {
    await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/auth/completeprofile`,
      { fullname, username },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } },
    );
  } catch (err) {
    console.log(err);
    throw err; 
  }
};
