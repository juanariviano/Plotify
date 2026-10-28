import express from "express";
import { Webhook } from "svix";
import { supabase } from "../supabase-client.js";
import { deleteUserData } from "../utils/userData.js";

const router = express.Router();

// svix bisa mengirim event yang sama lebih dari sekali, jadi user yang sudah ada tidak dibuat lagi
async function createUser({ id, email_addresses, primary_email_address_id }) {
  const email = (
    email_addresses?.find((e) => e.id === primary_email_address_id) ?? email_addresses?.[0]
  )?.email_address;

  const { data: existing, error: findError } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", id)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return;

  const { error } = await supabase
    .from("users")
    .insert({ clerk_id: id, email, profile_completed: false });

  // 23505 = unique violation: kiriman lain untuk user yang sama baru saja selesai lebih dulu
  if (error && error.code !== "23505") throw error;
}

router.post("/clerk", async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return res.status(500).json({ error: "Webhook not configured" });
  }

  // Verifikasi webhook dari Clerk
  const wh = new Webhook(WEBHOOK_SECRET);
  let body;

  try {
    body = wh.verify(req.body, {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });
  } catch (err) {
    console.log("Webhook verification failed:", err);
    return res.status(400).json({ error: "Invalid webhook" });
  }

  try {
    if (body.type === "user.created") {
      await createUser(body.data);
      return res.status(200).json({ message: "User created" });
    }

    // akun dihapus dari dashboard clerk / oleh clerk sendiri → data di plotify ikut dihapus
    if (body.type === "user.deleted") {
      await deleteUserData(body.data.id);
      return res.status(200).json({ message: "User deleted" });
    }

    // event lain (user.updated, session.*, dll) diabaikan
    res.status(200).json({ message: "Event ignored" });
  } catch (error) {
    // 500 membuat svix mengirim ulang event ini nanti
    console.log(`webhook ${body.type} gagal:`, error);
    res.status(500).json({ error: "Webhook failed" });
  }
});

export default router;
