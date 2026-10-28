import express from "express";
import { supabase } from "../supabase-client.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

const getFeedback = (userId) =>
  supabase
    .from("app_feedback")
    .select("rating, comment, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

// rating aplikasi milik user
/**
 * balikin rating yang pernah dikirim (atau null) dan sudah berapa hari berbeda user membuka plotify
 */
router.get("/", async (req, res) => {
  try {
    const [feedback, user] = await Promise.all([
      getFeedback(req.userId),
      supabase.from("users").select("visit_days").eq("id", req.userId).single(),
    ]);

    const error = feedback.error || user.error;
    if (error) throw error;

    res.status(200).json({ feedback: feedback.data, visitDays: user.data.visit_days ?? 0 });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// catat kunjungan hari ini
/**
 * body: day (YYYY-MM-DD, tanggal lokal user). hari yang sama dihitung sekali saja,
 * jadi aman dipanggil di setiap buka halaman. frontend memakai visitDays untuk menentukan kapan popup rating muncul
 */
const DAY_MS = 24 * 60 * 60 * 1000;

router.post("/visit", rateLimit({ name: "visit", limit: 30, windowSec: 60 * 10 }), async (req, res) => {
  const { day } = req.body;

  // tanggal lokal bisa beda satu hari dengan UTC (zona waktu), lebih dari itu ditolak
  const time = typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) ? Date.parse(`${day}T00:00:00Z`) : NaN;
  if (!Number.isFinite(time) || Math.abs(time - Date.now()) > 2 * DAY_MS) {
    return res.status(400).json({ message: "day tidak valid" });
  }

  try {
    const [visit, feedback] = await Promise.all([
      supabase.rpc("record_visit", { p_user_id: req.userId, p_day: day }),
      getFeedback(req.userId),
    ]);

    const error = visit.error || feedback.error;
    if (error) throw error;

    res.status(200).json({ feedback: feedback.data, visitDays: visit.data ?? 0 });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// kirim / perbarui rating
/**
 * body: rating (1 - 5), comment (opsional, max 1000 karakter)
 */
router.put("/", rateLimit({ name: "feedback", limit: 10, windowSec: 60 * 10 }), async (req, res) => {
  const { rating, comment } = req.body;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "rating harus 1 - 5" });
  }
  if (comment != null && (typeof comment !== "string" || comment.length > 1000)) {
    return res.status(400).json({ message: "comment max 1000 karakter" });
  }

  try {
    const { data, error } = await supabase
      .from("app_feedback")
      .upsert(
        {
          user_id: req.userId,
          rating,
          comment: comment?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("rating, comment, updated_at")
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
