import express from "express";
import { supabase } from "../supabase-client.js";
import { clerkClient } from "@clerk/express";
import { getAuth } from "@clerk/express";

import { handleUpload } from "../middleware/upload.js";
import { uploadImage } from "../utils/storageHelper.js";

const router = express.Router();

// upload profile url
/**
 * upload profile picture ke storage supabase, baru dapetin public linknya
 * terus simpen ke tabel users (update) berdasarkan user_id
 */
router.post(
  "/upload-profile-image",
  handleUpload("profile_image"), // middleware
  async (req, res) => {
    // controller
    try {
      const url = await uploadImage(
        req.file,
        "profile",
        req.body.old_image_url,
      );

      // update profile image
      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_image_url: url })
        .eq("id", req.userId);

      if (updateError) {
        return res.status(500).json({ message: updateError.message });
      }

      res.status(200).json({ profile_image_url: url });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

// edit profile
/**
 * buat edit profile berdasarkan username
 * username disini itu tidak boleh sama 
 */
router.put("/edit", async (req, res) => {
  const { fullname, username, email, clerkId } = req.body;

  try {
    const { data: checkData, error: checkError } = await supabase
      .from("users")
      .select()
      .eq("username", username)
      .neq("clerk_id", clerkId)
      .single();

    if (checkData) {
      if (checkData.username === username) {
        return res.status(409).json({ message: "username already in use" });
      }
    }

    const { data, error } = await supabase
      .from("users")
      .update({ fullname, username, email })
      .eq("id", req.userId)
      .select();

    console.log("email: ", email)
    console.log(data);

    if (error) {
      return res.status(501).json({ Error: error });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// delete profile picture
/**
 * cek dlu di tabel ada atau engga, kalo ada maka bru di delete di storage supabase
 * baru update table users, public_image_url = null
 */
router.delete("/deleteprofilepic", async (req, res) => {
  try {
    // Ambil image_url dulu sebelum dihapus
    const { data: profileData } = await supabase
      .from("users")
      .select("profile_image_url")
      .eq("id", req.userId)
      .single();

    // hapus dari storage kalau ada
    if (profileData?.profile_image_url) {
      const oldPath = profileData.profile_image_url.split("/plotify/")[1];
      await supabase.storage.from("plotify").remove([oldPath]);
    }

    // hapus dari database
    const { data, error } = await supabase
      .from("users")
      .update({ profile_image_url: null })
      .eq("id", req.userId)
      .select();

    if (error) return res.status(500).json({ error });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// delete account
/**
 * delete account sepenuhnya ditangani clerk
 * tapi ini buat delete data dari tabel users
 */
router.delete("/delete", async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req);

    const { data: userData } = await supabase
      .from("users")
      .select("profile_image_url")
      .eq("id", req.userId)
      .single();

    // hapus profile image dari storage kalau ada
    if (userData?.profile_image_url) {
      const oldPath = userData.profile_image_url.split("/plotify/")[1];
      await supabase.storage.from("plotify").remove([oldPath]);
    }

    // hapus user di clerk
    await clerkClient.users.deleteUser(clerkId);

    // hapus data user di supabase
    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("id", req.userId)
      .select();

    if (error) {
      return res.status(500).json({ error });
    }

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err });
  }
});

export default router;
