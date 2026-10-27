import express from "express";
import { supabase } from "../supabase-client.js";
import { validateName } from "../utils/validate.js";

const router = express.Router();

// clerk_id selalu diambil dari token login (req.auth), bukan dari query/body,
// supaya user tidak bisa membaca atau mengubah data user lain

// get user data
/**
 * dapetin data user yang sedang login berdasarkan clerk_id
 */
router.get("/user", async (req, res) => {
  try {
    const { userId: clerkId } = req.auth();

    const { data } = await supabase
      .from("users")
      .select("username, fullname, profile_image_url, email")
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
  const { fullname, username } = req.body;
  const { userId: clerkId } = req.auth();

  const invalid = validateName({ fullname, username });
  if (invalid) return res.status(400).json({ message: invalid });

  try {
    const { data: checkData } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .neq("clerk_id", clerkId)
      .maybeSingle();

    if (checkData) {
      return res.status(409).json({ message: "username already in use" });
    }

    const { error } = await supabase
      .from("users")
      .update({ fullname, username, profile_completed: true })
      .eq("clerk_id", clerkId);

    if (error) {
      console.log(error);
      return res.status(400).json({ message: "failed to complete profile" });
    }

    res.json({ message: "profile completed succesfully" });
  } catch (error) {
    res.status(500).json({ message: "server error" });
  }
});

export default router;
