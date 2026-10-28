import express from "express";
import { runChat } from "../utils/chatAgent.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

const MAX_MESSAGES = 20;
const MAX_TEXT = 2000;
// seluruh riwayat dikirim ulang ke gemini tiap giliran, jadi totalnya juga dibatasi
const MAX_TOTAL = 12000;

// env yang wajib ada supaya chatbot bisa jalan (gemini + tmdb)
const REQUIRED_ENV = ["GEMINI_API_KEY", "GEMINI_CHAT_MODEL", "TMDB_ACCESS_TOKEN"];

// pesan lama dibuang sampai totalnya muat; riwayat selalu dimulai dari pesan user
const trimHistory = (messages) => {
  const history = messages.slice(-MAX_MESSAGES);
  let total = history.reduce((sum, m) => sum + m.text.length, 0);
  while (history.length > 1 && (total > MAX_TOTAL || history[0].role !== "user")) {
    total -= history.shift().text.length;
  }
  return history;
};

// tiap pesan bisa memicu sampai 5 panggilan gemini; batas per menit untuk spam, per hari untuk biaya
const perMinute = rateLimit({ name: "chat-min", limit: 10, windowSec: 60 });
const perDay = rateLimit({ name: "chat-day", limit: 150, windowSec: 60 * 60 * 24 });

/**
 * kirim pesan ke chatbot
 * body: { messages: [{ role: "user" | "model", text }] }
 */
router.post("/", perMinute, perDay, async (req, res) => {
  const { messages } = req.body;

  const valid =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every(
      (m) =>
        ["user", "model"].includes(m?.role) &&
        typeof m.text === "string" &&
        m.text.trim() &&
        m.text.length <= MAX_TEXT,
    ) &&
    messages[messages.length - 1].role === "user";

  if (!valid) {
    return res.status(400).json({ message: "format messages tidak valid" });
  }

  const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missingEnv.length) {
    console.error(`chatbot: env belum diset: ${missingEnv.join(", ")}`);
    return res.status(500).json({ message: "chatbot belum dikonfigurasi" });
  }

  try {
    const result = await runChat(trimHistory(messages), req.userId);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    const busy = error.status === 429 || error.status === 503;
    res
      .status(busy ? 503 : 500)
      .json({ message: busy ? "chatbot sedang sibuk, coba lagi sebentar" : "Server error" });
  }
});

export default router;
