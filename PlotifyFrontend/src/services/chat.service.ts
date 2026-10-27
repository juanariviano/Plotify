import axios from "axios";
import type { ChatMessage, ChatResponse } from "../types/chat";

export const sendChat = async (token: string, messages: ChatMessage[]): Promise<ChatResponse> => {
  const res = await axios.post(
    `${import.meta.env.VITE_BACKEND_URL}/chat`,
    { messages: messages.map(({ role, text }) => ({ role, text })) },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return res.data;
};
