import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import axios from "axios";
import { sendChat } from "../../services/chat.service";
import type { ChatMessage } from "../../types/chat";

// state percakapan chatbot: daftar pesan, kirim, loading, error
export const useChat = () => {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // hasil: true kalau terkirim, false kalau gagal (supaya input bisa dikembalikan)
  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return true;

    const before = messages;
    const next: ChatMessage[] = [...before, { role: "user", text: question }];
    setMessages(next);
    setError("");
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("not signed in");

      const res = await sendChat(token, next);
      setMessages([...next, { role: "model", text: res.reply, toolsUsed: res.toolsUsed }]);
      return true;
    } catch (err) {
      console.log(err);
      const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
      setError(message || "something went wrong. try again.");
      setMessages(before);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setError("");
  };

  return { messages, loading, error, send, reset };
};
