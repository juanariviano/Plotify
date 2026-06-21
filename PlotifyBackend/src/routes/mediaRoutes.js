import express from "express";
import { supabase } from "../supabase-client.js";

import { handleUpload } from "../middleware/upload.js";
import { uploadImage } from "../utils/storageHelper.js";

const router = express.Router();

// upload thumbnail
/**
 * upload thumbnail ke supabase storage
 */
router.post(
  "/upload-thumbnail",
  handleUpload("thumbnail"), // ngecek apakah imagenya udah sesuai ukuran dan tipe datanya
  async (req, res) => {
    try {
      const url = await uploadImage(req.file, "media", req.body.old_image_url);
      res.status(200).json({ image_url: url });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

// fetch data
/**
 * balikin data2 screen dan reads berdasarkan user id
 */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("media")
      .select()
      .eq("user_id", req.userId);

    if (error) return res.status(500).json({ error });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// add media
/**
 * add media berdasarkan user id
 */
router.post("/add", async (req, res) => {
  const {
    title,
    image_url,
    description,
    category,
    source,
    last_episode,
    type,
  } = req.body;

  try {
    const { data, error } = await supabase
      .from("media")
      .insert({
        title,
        description,
        image_url,
        category,
        source,
        type,
        last_episode,
        user_id: req.userId,
      })
      .select();

    if (error) {
      return res.status(500).json({ Error: error });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// mark as completed
/**
 * set is_completed ke true berdasarkan id media dan user_idnya
 */
router.put("/completed/:id", async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  try {
    const { data, error } = await supabase
      .from("media")
      .update({ is_completed: true, rating: parseFloat(rating) })
      .eq("id", parseInt(id))
      .eq("user_id", req.userId)
      .select();

    if (error) {
      return res.status(500).json({ Error: error });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// set back to uncompleted
/**
 * set is_completed ke false berdasarkan id media dan user_idnya
 */
router.put("/uncompleted/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("media")
      .update({ is_completed: false})
      .eq("id", parseInt(id))
      .eq("user_id", req.userId)
      .select();

    if (error) {
      return res.status(500).json({ Error: error });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/update/:id", async (req, res) => {
  const { id } = req.params;

  const {
    source,
    last_episode,
    image_url,
    category,
    title,
    description,
    rating,
    is_completed,
  } = req.body;

  try {
    const updateData = {
      source,
      last_episode,
      image_url,
      category,
      title,
      description,
    };

    // optional fields (only apply if exists)
    if (rating !== undefined) {
      updateData.rating = parseFloat(rating);
    }

    if (is_completed !== undefined) {
      updateData.is_completed = is_completed;
    }

    const { data, error } = await supabase
      .from("media")
      .update(updateData)
      .eq("id", parseInt(id))
      .eq("user_id", req.userId)
      .select();

    if (error) {
      return res.status(500).json({ Error: error });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// delete
/**
 * hapus media berdasarkan id media dan user_idnya
 */
router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("media")
      .delete()
      .eq("id", id)
      .eq("user_id", req.userId)
      .select();

    if (error) {
      return res.status(501).json({ Error: error });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// delete media thumbnail
/**
 * hapus media dari supabase storage -> diselect dlu urlnya dari tabel media 
 * berdasarkan id media dan user_id
 */
router.delete("/deletethumbnail/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Ambil image_url dulu sebelum dihapus
    const { data: mediaData } = await supabase
      .from("media")
      .select("image_url")
      .eq("id", parseInt(id))
      .eq("user_id", req.userId)
      .single();

    // hapus dari storage kalau ada
    if (mediaData?.image_url) {
      const oldPath = mediaData.image_url.split("/plotify/")[1];
      await supabase.storage.from("plotify").remove([oldPath]);
    }

    // hapus dari database
    const { data, error } = await supabase
      .from("media")
      .update({ image_url: null })
      .eq("id", parseInt(id))
      .eq("user_id", req.userId)
      .select();

    if (error) return res.status(500).json({ error });
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
