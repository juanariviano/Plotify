import express from "express";
import { supabase } from "../supabase-client.js";

import { handleUpload } from "../middleware/upload.js";
import { uploadImage, removeOwnImage } from "../utils/storageHelper.js";
import { validateMedia, isValidRating, MEDIA_TYPES } from "../utils/validate.js";
import { lookupExternal } from "../utils/externalMedia.js";
import { refreshMediaEmbedding } from "../utils/embedding.js";

const router = express.Router();

// semua kolom kecuali embedding (768 angka per item, tidak perlu dikirim ke frontend)
const MEDIA_FIELDS =
  "id, image_url, title, description, category, source, type, last_episode, is_completed, rating, user_id, created_at, external_source, external_id";

// upload thumbnail
/**
 * upload thumbnail ke supabase storage
 */
router.post(
  "/upload-thumbnail",
  handleUpload("thumbnail"), // ngecek apakah imagenya udah sesuai ukuran dan tipe datanya
  async (req, res) => {
    try {
      const url = await uploadImage(req.file, "media", req.userId);
      res.status(200).json({ image_url: url });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

// fetch data
/**
 * balikin data media berdasarkan user id dengan pagination
 * query: page, limit, type, is_completed, q
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const offset = (page - 1) * limit;
    const { q, type, is_completed } = req.query;

    if (type !== undefined && !MEDIA_TYPES.includes(type)) {
      return res.status(400).json({ message: "type harus screen atau read" });
    }
    if (q !== undefined && (typeof q !== "string" || q.length > 200)) {
      return res.status(400).json({ message: "q tidak valid" });
    }

    let query = supabase
      .from("media")
      .select(MEDIA_FIELDS, { count: "exact" })
      .eq("user_id", req.userId);

    if (type) {
      query = query.eq("type", type);
    }

    if (is_completed !== undefined && is_completed !== "") {
      query = query.eq("is_completed", is_completed === "true");
    }

    if (q) {
      query = query.ilike("title", `%${q}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.status(200).json({ data, total: count, page, limit });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// cari judul di database luar (TMDB / AniList / Open Library)
/**
 * query: q (judul), type (screen | read)
 */
router.get("/lookup", async (req, res) => {
  const { q, type } = req.query;

  if (typeof q !== "string" || !q.trim() || q.length > 200 || !MEDIA_TYPES.includes(type)) {
    return res.status(400).json({ message: "q dan type (screen/read) wajib diisi" });
  }

  try {
    const results = await lookupExternal(q, type);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


/**
 * balikin satu media berdasarkan id dan user id
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("media")
      .select(MEDIA_FIELDS)
      .eq("id", parseInt(id, 10))
      .eq("user_id", req.userId)
      .single();

    if (error) {
      return res.status(404).json({ error: "Media not found" });
    }

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
    external_source,
    external_id,
  } = req.body;

  const invalid = validateMedia(req.body, { isNew: true });
  if (invalid) return res.status(400).json({ message: invalid });

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
        external_source: external_source || null,
        external_id: external_id || null,
        user_id: req.userId,
      })
      .select(MEDIA_FIELDS);

    if (error) throw error;

    // di-await karena di vercel proses berhenti setelah response dikirim
    await refreshMediaEmbedding(data[0]);

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

  if (!isValidRating(rating)) {
    return res.status(400).json({ message: "rating harus 0 - 5" });
  }

  try {
    const { data, error } = await supabase
      .from("media")
      .update({ is_completed: true, rating: parseFloat(rating) })
      .eq("id", parseInt(id, 10))
      .eq("user_id", req.userId)
      .select(MEDIA_FIELDS);

    if (error) throw error;

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
      .eq("id", parseInt(id, 10))
      .eq("user_id", req.userId)
      .select(MEDIA_FIELDS);

    if (error) throw error;

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

  const invalid = validateMedia(req.body);
  if (invalid) return res.status(400).json({ message: invalid });

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
      .eq("id", parseInt(id, 10))
      .eq("user_id", req.userId)
      .select(MEDIA_FIELDS);

    if (error) throw error;

    // embedding hanya perlu dihitung ulang kalau teks yang di-embed berubah
    const textChanged = [title, description, category].some((v) => v !== undefined);
    if (textChanged && data[0]) {
      await refreshMediaEmbedding(data[0]);
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
      .eq("id", parseInt(id, 10))
      .eq("user_id", req.userId)
      .select(MEDIA_FIELDS);

    if (error) throw error;

    // thumbnail yang diupload user ikut dihapus dari storage
    if (data[0]?.image_url) {
      await removeOwnImage(data[0].image_url, req.userId);
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
      .eq("id", parseInt(id, 10))
      .eq("user_id", req.userId)
      .single();

    // hapus dari storage kalau ada
    if (mediaData?.image_url) {
      await removeOwnImage(mediaData.image_url, req.userId);
    }

    // hapus dari database
    const { data, error } = await supabase
      .from("media")
      .update({ image_url: null })
      .eq("id", parseInt(id, 10))
      .eq("user_id", req.userId)
      .select(MEDIA_FIELDS);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
