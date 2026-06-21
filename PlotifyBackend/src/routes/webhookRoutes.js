import express from "express";
import { supabase } from "../supabase-client.js";

const router = express.Router();

router.post("/clerk", async (req, res) => {
  const body = JSON.parse(req.body);
  const { id, email_addresses } = body.data;
  const email = email_addresses[0].email_address;

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
      return res.status(500).json({ error });
    }

    res.status(200).json({ message: "User created" });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

export default router;
