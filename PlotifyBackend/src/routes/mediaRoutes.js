import express from "express";
import { supabase } from "../supabase-client.js";

import { handleUpload } from "../middleware/upload.js";
import { uploadImage, removeOwnImage } from "../utils/storageHelper.js";
import { validateMedia, isValidRating, MEDIA_TYPES } from "../utils/validate.js";
import { lookupExternal, matchExternal, MATCH_KINDS } from "../utils/externalMedia.js";
import { refreshMediaEmbedding, refreshMediaEmbeddings } from "../utils/embedding.js";
import { MEDIA_FIELDS, getOwnedMedia, isSeasonRating, syncTitle } from "../utils/seasons.js";
import { buildRecap, yearRange } from "../utils/recap.js";
import { rateLimit } from "../middleware/rateLimit.js";
import seasonRoutes from "./seasonRoutes.js";

const router = express.Router();

// semua perubahan data (termasuk season) dibatasi per user; add/update juga memanggil gemini untuk embedding
const writeLimit = rateLimit({ name: "media-write", limit: 120, windowSec: 60 });
router.use((req, res, next) => (req.method === "GET" ? next() : writeLimit(req, res, next)));

// riwayat season per judul: /media/:id/seasons
router.use("/:id/seasons", seasonRoutes);

// supabase membatasi satu select ke 1000 baris, jadi ambil per halaman
const PAGE = 1000;
const selectAll = async (build, max = 10000) => {
  const rows = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
};

// upload thumbnail
/**
 * upload thumbnail ke supabase storage
 */
router.post(
  "/upload-thumbnail",
  rateLimit({ name: "upload", limit: 60, windowSec: 60 * 10 }),
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
 * query: page, limit, type, is_completed, q, site (hostname di kolom source, dipakai extension)
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const offset = (page - 1) * limit;
    const { q, type, is_completed, site } = req.query;

    if (type !== undefined && !MEDIA_TYPES.includes(type)) {
      return res.status(400).json({ message: "type harus screen atau read" });
    }
    if (q !== undefined && (typeof q !== "string" || q.length > 200)) {
      return res.status(400).json({ message: "q tidak valid" });
    }
    // hanya huruf, angka, titik dan strip supaya tidak bisa menyisipkan wildcard ilike
    if (site !== undefined && (typeof site !== "string" || !/^[a-z0-9.-]{1,253}$/i.test(site))) {
      return res.status(400).json({ message: "site tidak valid" });
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

    if (site) {
      query = query.ilike("source", `%${site}%`);
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

// ringkasan profil
/**
 * semua angka untuk halaman profil dalam satu request:
 * total per rak, 4 yang sedang berjalan, 3 favorit, sebaran rating, kategori teratas
 */
router.get("/stats", async (req, res) => {
  try {
    const [all, ongoing, favourites] = await Promise.all([
      // kolom ringan saja untuk dihitung; ikut batas max rows supabase (default 1000)
      supabase
        .from("media")
        .select("type, is_completed, rating, category, completed_at")
        .eq("user_id", req.userId),
      supabase
        .from("media")
        .select(MEDIA_FIELDS)
        .eq("user_id", req.userId)
        .eq("is_completed", false)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("media")
        .select(MEDIA_FIELDS)
        .eq("user_id", req.userId)
        .eq("is_completed", true)
        .order("rating", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const error = all.error || ongoing.error || favourites.error;
    if (error) throw error;

    const rows = all.data;
    const finished = rows.filter((m) => m.is_completed);

    const counts = {};
    for (const m of rows) {
      for (const c of m.category ?? []) counts[c] = (counts[c] ?? 0) + 1;
    }

    res.status(200).json({
      totals: {
        ongoing: rows.length - finished.length,
        finished: finished.length,
        screenFinished: finished.filter((m) => m.type === "screen").length,
        readFinished: finished.filter((m) => m.type === "read").length,
      },
      ongoing: ongoing.data,
      favourites: favourites.data,
      ratings: [5, 4, 3, 2, 1].map((stars) => ({
        stars,
        count: finished.filter((m) => Math.round(m.rating) === stars).length,
      })),
      categories: Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      // tahun yang punya judul selesai, untuk daftar recap di profil
      recapYears: [
        ...new Set(finished.filter((m) => m.completed_at).map((m) => new Date(m.completed_at).getUTCFullYear())),
      ].sort((a, b) => b - a),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// cari judul di database luar (TMDB / AniList / Open Library)
/**
 * query: q (judul), type (screen | read)
 */
router.get("/lookup", rateLimit({ name: "lookup", limit: 60, windowSec: 60 }), async (req, res) => {
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


// cocokkan banyak judul sekaligus (import dari letterboxd / myanimelist / goodreads)
/**
 * body: { kind: movie | anime | manga | book, items } max 50 item
 * movie: { title, year }, anime / manga: { mal_id }, book: { isbn }
 * hasil: array sepanjang items, berisi cover/genre/id eksternal atau null
 */
const MATCH_MAX = 50;

const isMatchItem = (kind, item) => {
  if (!item || typeof item !== "object") return false;
  if (kind === "movie") {
    return (
      typeof item.title === "string" && !!item.title.trim() && item.title.length <= 200 &&
      (item.year == null || /^\d{4}$/.test(String(item.year)))
    );
  }
  if (kind === "book") return item.isbn == null || /^(\d{9}[\dX]|\d{13})$/.test(item.isbn);
  return item.mal_id == null || (Number.isInteger(item.mal_id) && item.mal_id > 0 && item.mal_id < 1e9);
};

router.post("/match", rateLimit({ name: "match", limit: 40, windowSec: 60 * 10 }), async (req, res) => {
  const { kind, items } = req.body;

  if (!MATCH_KINDS.includes(kind)) return res.status(400).json({ message: "kind tidak valid" });
  if (!Array.isArray(items) || !items.length || items.length > MATCH_MAX) {
    return res.status(400).json({ message: `items harus berisi 1 - ${MATCH_MAX} judul` });
  }
  if (!items.every((item) => isMatchItem(kind, item))) {
    return res.status(400).json({ message: "item tidak valid" });
  }

  try {
    res.status(200).json(await matchExternal(kind, items));
  } catch (error) {
    console.error("match:", error.message);
    res.status(502).json({ message: "lookup failed" });
  }
});

// recap tahunan
/**
 * semua judul yang selesai dalam satu tahun → angka-angka untuk halaman recap
 * query: tz (menit selisih dari UTC, dari Date.getTimezoneOffset() di browser)
 */
const RECAP_FIELDS =
  "id, title, type, image_url, category, rating, last_episode, completed_at, seasons:media_seasons(last_episode)";

router.get("/recap/:year", async (req, res) => {
  const year = Number(req.params.year);
  const tz = req.query.tz === undefined ? 0 : Number(req.query.tz);

  if (!Number.isInteger(year) || year < 2000 || year > new Date().getUTCFullYear()) {
    return res.status(400).json({ message: "year tidak valid" });
  }
  if (!Number.isInteger(tz) || Math.abs(tz) > 14 * 60) {
    return res.status(400).json({ message: "tz tidak valid" });
  }

  try {
    const { start, end } = yearRange(year, tz);

    const [rows, added] = await Promise.all([
      selectAll(() =>
        supabase
          .from("media")
          .select(RECAP_FIELDS)
          .eq("user_id", req.userId)
          .eq("is_completed", true)
          .gte("completed_at", start)
          .lt("completed_at", end)
          .order("completed_at"),
      ),
      supabase
        .from("media")
        .select("id", { count: "exact", head: true })
        .eq("user_id", req.userId)
        .gte("created_at", start)
        .lt("created_at", end),
    ]);

    if (added.error) throw added.error;

    res.status(200).json(buildRecap(rows, { year, tz, added: added.count ?? 0 }));
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
    season,
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
        season: season ?? 1,
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

// bulk add
/**
 * tambah banyak media sekaligus (pindahan dari aplikasi lain)
 * body: { items: [{ ...field add, is_completed, rating, completed_at }], skip_existing }, max 50 item
 * - rating boleh kosong untuk yang sudah selesai: export letterboxd / goodreads sering tanpa rating
 * - completed_at: tanggal selesai dari aplikasi asal, supaya masuk ke recap tahun yang benar.
 *   null = tidak diketahui (tidak masuk recap); tidak dikirim = sekarang
 * - skip_existing: judul yang sudah ada di rak (judul sama, atau id eksternal sama) dilewati
 * hasil: media yang benar-benar ditambahkan
 */
const BULK_MAX = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

const isPastDate = (value) => {
  if (typeof value !== "string" || value.length > 40) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time >= Date.UTC(1900, 0, 1) && time <= Date.now() + DAY_MS;
};

const sameTitle = (title) => title.trim().toLowerCase();

router.post("/bulk", rateLimit({ name: "bulk", limit: 40, windowSec: 60 * 10 }), async (req, res) => {
  const { items, skip_existing } = req.body;

  if (!Array.isArray(items) || !items.length || items.length > BULK_MAX) {
    return res.status(400).json({ message: `items harus berisi 1 - ${BULK_MAX} media` });
  }

  for (const [i, item] of items.entries()) {
    const invalid =
      item && typeof item === "object" ? validateMedia(item, { isNew: true }) : "item tidak valid";
    if (invalid) return res.status(400).json({ message: `item ${i + 1}: ${invalid}` });
    if (item.is_completed && item.rating != null && !(isValidRating(item.rating) && item.rating > 0)) {
      return res.status(400).json({ message: `item ${i + 1}: rating harus 0.5 - 5` });
    }
    if (item.completed_at != null && !isPastDate(item.completed_at)) {
      return res.status(400).json({ message: `item ${i + 1}: completed_at tidak valid` });
    }
  }

  try {
    let fresh = items;

    if (skip_existing === true) {
      const types = [...new Set(items.map((item) => item.type))];
      const existing = await selectAll(() =>
        supabase
          .from("media")
          .select("title, external_source, external_id")
          .eq("user_id", req.userId)
          .in("type", types),
      );
      const titles = new Set(existing.map((m) => sameTitle(m.title)));
      const ids = new Set(existing.filter((m) => m.external_id).map((m) => `${m.external_source}:${m.external_id}`));

      fresh = items.filter(
        (item) =>
          !titles.has(sameTitle(item.title)) &&
          !(item.external_id && ids.has(`${item.external_source}:${item.external_id}`)),
      );
      if (!fresh.length) return res.status(200).json([]);
    }

    const rows = fresh.map((item) => ({
      title: item.title.trim(),
      description: item.description || null,
      image_url: item.image_url || null,
      category: item.category ?? [],
      source: item.source || null,
      type: item.type,
      last_episode: item.last_episode ?? 0,
      season: item.season ?? 1,
      is_completed: !!item.is_completed,
      ...(item.is_completed && item.rating != null ? { rating: parseFloat(item.rating) } : {}),
      ...(item.is_completed && item.completed_at !== undefined
        ? { completed_at: item.completed_at && new Date(item.completed_at).toISOString() }
        : {}),
      external_source: item.external_source || null,
      external_id: item.external_id || null,
      user_id: req.userId,
    }));

    // kolom yang tidak dikirim (rating untuk yang belum selesai) memakai default tabel, bukan null
    const { data, error } = await supabase
      .from("media")
      .insert(rows, { defaultToNull: false })
      .select(MEDIA_FIELDS);

    if (error) throw error;

    await refreshMediaEmbeddings(data);

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

  const value = parseFloat(rating);
  if (!isSeasonRating(value)) {
    return res.status(400).json({ message: "rating harus 1 - 5" });
  }

  try {
    const media = await getOwnedMedia(parseInt(id, 10), req.userId);
    if (!media) return res.status(404).json({ message: "Media not found" });

    // judul selesai = semua season-nya selesai
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("media_seasons")
      .update({ is_completed: true, updated_at: now })
      .eq("media_id", media.id);
    if (error) throw error;

    // rating ini untuk season aktif, juga season lain yang belum pernah dirating
    const { error: ratingError } = await supabase
      .from("media_seasons")
      .update({ rating: value, updated_at: now })
      .eq("media_id", media.id)
      .or(`season.eq.${media.season},rating.is.null`);
    if (ratingError) throw ratingError;

    res.status(200).json([await syncTitle(media)]);
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
    const media = await getOwnedMedia(parseInt(id, 10), req.userId);
    if (!media) return res.status(404).json({ message: "Media not found" });

    // season aktif kembali berjalan, season lain tetap selesai
    const { error } = await supabase
      .from("media_seasons")
      .update({ is_completed: false, updated_at: new Date().toISOString() })
      .eq("media_id", media.id)
      .eq("season", media.season);
    if (error) throw error;

    res.status(200).json([await syncTitle(media, { active: media.season })]);
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
    const mediaId = parseInt(id, 10);

    // cover lama diambil dari database supaya bisa dibuang kalau diganti / dihapus
    let oldImage = null;
    if (image_url !== undefined) {
      const { data: current } = await supabase
        .from("media")
        .select("image_url")
        .eq("id", mediaId)
        .eq("user_id", req.userId)
        .single();
      oldImage = current?.image_url ?? null;
    }

    // season diatur lewat /media/:id/seasons, bukan dari sini
    const updateData = {
      source,
      last_episode,
      image_url,
      category,
      title,
      description,
    };

    const { data, error } = await supabase
      .from("media")
      .update(updateData)
      .eq("id", mediaId)
      .eq("user_id", req.userId)
      .select(MEDIA_FIELDS);

    if (error) throw error;

    // is_completed dan rating lewat sini (dipakai extension) berlaku untuk season:
    // is_completed true = semua selesai, false = season aktif berjalan lagi; rating = rating season aktif
    if (data[0] && (is_completed !== undefined || rating != null)) {
      const now = new Date().toISOString();

      if (is_completed !== undefined) {
        let seasons = supabase
          .from("media_seasons")
          .update({ is_completed, updated_at: now })
          .eq("media_id", mediaId);
        if (!is_completed) seasons = seasons.eq("season", data[0].season);
        const { error: seasonError } = await seasons;
        if (seasonError) throw seasonError;
      }

      if (rating != null && isSeasonRating(parseFloat(rating))) {
        const { error: ratingError } = await supabase
          .from("media_seasons")
          .update({ rating: parseFloat(rating), updated_at: now })
          .eq("media_id", mediaId)
          .eq("season", data[0].season);
        if (ratingError) throw ratingError;
      }

      data[0] = await syncTitle(data[0], { active: is_completed === false ? data[0].season : undefined });
    }

    if (data[0] && oldImage && oldImage !== image_url) {
      await removeOwnImage(oldImage, req.userId);
    }

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
