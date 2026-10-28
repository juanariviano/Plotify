import express from "express";
import { supabase } from "../supabase-client.js";
import { clerkClient } from "@clerk/express";
import { getAuth } from "@clerk/express";

import { handleUpload } from "../middleware/upload.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { uploadImage, removeImage } from "../utils/storageHelper.js";
import { validateName } from "../utils/validate.js";
import { deleteUserData } from "../utils/userData.js";

const router = express.Router();

// upload profile url
/**
 * upload profile picture ke storage supabase, baru dapetin public linknya
 * terus simpen ke tabel users (update) berdasarkan user_id
 * foto lama diambil dari database (bukan dari body) lalu dihapus
 */
router.post(
  "/upload-profile-image",
  rateLimit({ name: "profile-upload", limit: 20, windowSec: 60 * 10 }),
  handleUpload("profile_image"), // middleware
  async (req, res) => {
    // controller
    try {
      const { data: profileData } = await supabase
        .from("users")
        .select("profile_image_url")
        .eq("id", req.userId)
        .single();

      const url = await uploadImage(req.file, "profile", req.userId);

      // update profile image
      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_image_url: url })
        .eq("id", req.userId);

      if (updateError) throw updateError;

      if (profileData?.profile_image_url) {
        await removeImage(profileData.profile_image_url);
      }

      res.status(200).json({ profile_image_url: url });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// edit profile
/**
 * buat edit profile user yang sedang login
 * username disini itu tidak boleh sama
 * email tidak diambil dari body, tapi dari primary email di clerk (yang sudah diverifikasi)
 */
router.put("/edit", rateLimit({ name: "profile-edit", limit: 20, windowSec: 60 * 10 }), async (req, res) => {
  const { fullname, username } = req.body;

  const invalid = validateName({ fullname, username });
  if (invalid) return res.status(400).json({ message: invalid });

  try {
    const { data: checkData } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .neq("id", req.userId)
      .maybeSingle();

    if (checkData) {
      return res.status(409).json({ message: "username already in use" });
    }

    const { userId: clerkId } = getAuth(req);
    const clerkUser = await clerkClient.users.getUser(clerkId);
    const email = clerkUser.primaryEmailAddress?.emailAddress;

    const { data, error } = await supabase
      .from("users")
      .update({ fullname, username, ...(email ? { email } : {}) })
      .eq("id", req.userId)
      .select("username, fullname, profile_image_url, email");

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.log(error);
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
      await removeImage(profileData.profile_image_url);
    }

    // hapus dari database
    const { data, error } = await supabase
      .from("users")
      .update({ profile_image_url: null })
      .eq("id", req.userId)
      .select("username, fullname, profile_image_url, email");

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

// delete account
/**
 * hapus user di clerk, lalu semua datanya di plotify (file, media, baris users).
 * kalau langkah kedua gagal, webhook user.deleted dari clerk akan membersihkannya
 */
router.delete("/delete", async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req);

    await clerkClient.users.deleteUser(clerkId);
    await deleteUserData(clerkId);

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
