import express from "express";
import { Webhook } from "svix";
import { supabase } from "../supabase-client.js";

const router = express.Router();

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

  // hanya event user.created yang diproses, event lain (user.updated, session.*, dll) diabaikan
  if (body.type !== "user.created") {
    return res.status(200).json({ message: "Event ignored" });
  }

  const { id, email_addresses, primary_email_address_id } = body.data;
  const email = (
    email_addresses?.find((e) => e.id === primary_email_address_id) ?? email_addresses?.[0]
  )?.email_address;

  try {
    const { data, error } = await supabase
      .from("users")
      .insert({
        clerk_id: id,
        email: email,
        profile_completed: false,
      })
      .select();

    if (error) {
      console.log("Supabase error:", error);
      return res.status(500).json({ error: "Failed to create user" });
    }

    res.status(200).json({ message: "User created" });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

export default router;