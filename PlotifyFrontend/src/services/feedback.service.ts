import axios from "axios";
import type { AppFeedback, FeedbackStatus } from "../types/feedback";

// local date, so "the second day" means their second day, not utc's
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// counts today as a visit (once per day) and returns their rating so far
export const recordVisit = async (token: string, signal?: AbortSignal): Promise<FeedbackStatus> => {
  const res = await axios.post(
    `${import.meta.env.VITE_BACKEND_URL}/feedback/visit`,
    { day: today() },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    },
  );

  return res.data;
};

export const sendFeedback = async (
  token: string,
  feedback: { rating: number; comment: string },
): Promise<AppFeedback> => {
  const res = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/feedback`, feedback, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};
