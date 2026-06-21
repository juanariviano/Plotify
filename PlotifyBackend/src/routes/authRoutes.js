import express from "express";
import { supabase } from "../supabase-client.js";

const router = express.Router();

// get user data
/**
 * dapetin data user berdasarkan clerk_id
 */
router.get("/user", async (req, res) => {
  try {
    const { clerkId } = req.query;

    const { data, error } = await supabase
      .from("users")
      .select()
      .eq("clerk_id", clerkId)
      .single();

    if(!data){
      return res.status(404).json({ message: "user not found" });
    }

    res.status(200).json({username: data.username, fullname: data.fullname, profile_image_url: data.profile_image_url, email: data.email});
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "server error" });
  }
});

// complete profile when signup
/**
 * select dari supabase, cek ketersediaan username -> baru nanti di update berdasarkan clerkid
 * fullname, username, set profile_completed ke true
 * kalo usernamenya ada -> error
 */
router.post("/completeprofile", async (req, res) => {
  const { fullname, username, clerkId } = req.body;

  try {
    const { data: checkData, error: checkError } = await supabase
      .from("users")
      .select()
      .eq("username", username)
      .single();

    if (checkData) {
      if (checkData.username === username) {
        return res.status(409).json({ message: "username already in use" });
      }
    }

    const { data, error } = await supabase
      .from("users")
      .update({ fullname, username, profile_completed: true })
      .eq("clerk_id", clerkId)
      .select();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    console.log("data", data);
    console.log("err", error);

    res.json({ message: "profile completed succesfully" });
  } catch (error) {
    res.status(500).json({ message: "server error" });
  }
});

export default router;
