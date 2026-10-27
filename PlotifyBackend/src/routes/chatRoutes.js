import express from "express";
import { runChat } from "../utils/chatAgent.js";

const router = express.Router();

const MAX_MESSAGES = 20;
const MAX_TEXT = 2000;

/**
 * kirim pesan ke chatbot
 * body: { messages: [{ role: "user" | "model", text }] }
 */
router.post("/", async (req, res) => {
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

  try {
    const result = await runChat(messages.slice(-MAX_MESSAGES), req.userId);
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
