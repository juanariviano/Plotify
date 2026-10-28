import express from "express";
import { supabase } from "../supabase-client.js";
import { isValidSeason } from "../utils/validate.js";
import { getOwnedMedia, isSeasonRating, syncTitle } from "../utils/seasons.js";

// dipasang di /media/:id/seasons
const router = express.Router({ mergeParams: true });

const isValidEpisode = (v) => Number.isInteger(v) && v >= 0 && v <= 100000;
const RATING_REQUIRED = "season yang selesai wajib diberi rating 1 - 5";
const RATING_INVALID = "rating harus 1 - 5";

// cek media milik user dan nomor season di url; hasil disimpan di req
router.use(async (req, res, next) => {
  try {
    const media = await getOwnedMedia(parseInt(req.params.id, 10), req.userId);
    if (!media) return res.status(404).json({ message: "Media not found" });
    req.media = media;
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

const findSeason = (req, res) => {
  const season = Number(req.params.season);
  const row = req.media.seasons.find((s) => s.season === season);
  if (!row) res.status(404).json({ message: "season tidak ditemukan" });
  return row;
};

// next season
/**
 * season aktif ditandai selesai, lalu pindah ke season berikutnya.
 * body: { restart, rating } → restart true: mulai dari episode 0, false: nomor episode lanjut dari season sebelumnya.
 * rating untuk season yang selesai, wajib kalau season itu belum punya rating.
 * kalau season berikutnya sudah ada, season itu dilanjutkan dari progress-nya sendiri
 */
router.post("/next", async (req, res) => {
  const { restart, rating } = req.body;
  const media = req.media;
  const target = media.season + 1;
  const current = media.seasons.find((s) => s.season === media.season);

  if (typeof restart !== "boolean") {
    return res.status(400).json({ message: "restart harus boolean" });
  }
  if (!isValidSeason(target)) return res.status(400).json({ message: "season sudah maksimal" });
  if (rating !== undefined && !isSeasonRating(rating)) return res.status(400).json({ message: RATING_INVALID });
  if (rating === undefined && current?.rating == null) {
    return res.status(400).json({ message: RATING_REQUIRED });
  }

  try {
    const now = new Date().toISOString();

    const { error: doneError } = await supabase
      .from("media_seasons")
      .update({ is_completed: true, ...(rating !== undefined ? { rating } : {}), updated_at: now })
      .eq("media_id", media.id)
      .eq("season", media.season);
    if (doneError) throw doneError;

    const exists = media.seasons.some((s) => s.season === target);
    const { error } = exists
      ? await supabase
          .from("media_seasons")
          .update({ is_completed: false, updated_at: now })
          .eq("media_id", media.id)
          .eq("season", target)
      : await supabase.from("media_seasons").insert({
          media_id: media.id,
          season: target,
          last_episode: restart ? 0 : media.last_episode,
        });
    if (error) throw error;

    res.status(200).json([await syncTitle(media, { active: target })]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// tambah season manual
/**
 * body: season, last_episode (default 0), is_completed (default false), rating (wajib kalau sudah selesai)
 */
router.post("/", async (req, res) => {
  const { season, last_episode = 0, is_completed = false, rating } = req.body;
  const media = req.media;

  if (!Number.isInteger(season) || !isValidSeason(season)) {
    return res.status(400).json({ message: "season harus 1 - 1000" });
  }
  if (!isValidEpisode(last_episode)) return res.status(400).json({ message: "last_episode tidak valid" });
  if (typeof is_completed !== "boolean") return res.status(400).json({ message: "is_completed harus boolean" });
  if (rating !== undefined && !isSeasonRating(rating)) return res.status(400).json({ message: RATING_INVALID });
  if (is_completed && rating === undefined) return res.status(400).json({ message: RATING_REQUIRED });
  if (media.seasons.some((s) => s.season === season)) {
    return res.status(409).json({ message: "season sudah ada" });
  }

  try {
    const { error } = await supabase
      .from("media_seasons")
      .insert({ media_id: media.id, season, last_episode, is_completed, rating: rating ?? null });
    if (error) throw error;

    // season baru yang masih berjalan dan paling akhir jadi season aktif
    const active = !is_completed && season > media.season ? season : undefined;
    res.status(200).json([await syncTitle(media, { active })]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// edit satu season
/**
 * body (semua opsional): last_episode, is_completed, rating.
 * season yang selesai harus punya rating, dari body atau yang sudah tersimpan
 */
router.put("/:season", async (req, res) => {
  const row = findSeason(req, res);
  if (!row) return;

  const { last_episode, is_completed, rating } = req.body;
  const media = req.media;

  if (last_episode !== undefined && !isValidEpisode(last_episode)) {
    return res.status(400).json({ message: "last_episode tidak valid" });
  }
  if (is_completed !== undefined && typeof is_completed !== "boolean") {
    return res.status(400).json({ message: "is_completed harus boolean" });
  }
  if (rating !== undefined && !isSeasonRating(rating)) {
    return res.status(400).json({ message: RATING_INVALID });
  }
  if ((is_completed ?? row.is_completed) && (rating ?? row.rating) == null) {
    return res.status(400).json({ message: RATING_REQUIRED });
  }

  try {
    const { error } = await supabase
      .from("media_seasons")
      .update({
        ...(last_episode !== undefined ? { last_episode } : {}),
        ...(is_completed !== undefined ? { is_completed } : {}),
        ...(rating !== undefined ? { rating } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("media_id", media.id)
      .eq("season", row.season);
    if (error) throw error;

    res.status(200).json([await syncTitle(media)]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// jadikan season aktif
/**
 * season aktif yang tampil di rak dan bertambah lewat tombol +1
 */
router.put("/:season/switch", async (req, res) => {
  const row = findSeason(req, res);
  if (!row) return;

  try {
    res.status(200).json([await syncTitle(req.media, { active: row.season })]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// rewatch / reread satu season
/**
 * season yang sudah selesai mulai lagi dari episode 0 dan jadi season aktif.
 * rewatch_count season dan judul bertambah, rating season tetap disimpan
 */
router.put("/:season/rewatch", async (req, res) => {
  const row = findSeason(req, res);
  if (!row) return;

  const media = req.media;
  if (!row.is_completed) {
    return res.status(409).json({ message: "hanya season yang sudah selesai yang bisa diulang" });
  }

  try {
    // syarat is_completed = true mencegah klik ganda menambah hitungan dua kali
    const { data: updated, error } = await supabase
      .from("media_seasons")
      .update({
        is_completed: false,
        last_episode: 0,
        rewatch_count: row.rewatch_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("media_id", media.id)
      .eq("season", row.season)
      .eq("is_completed", true)
      .select("season");
    if (error) throw error;
    if (!updated.length) return res.status(409).json({ message: "season sudah diulang" });

    res.status(200).json([
      await syncTitle(media, { active: row.season, extra: { rewatch_count: media.rewatch_count + 1 } }),
    ]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// hapus satu season
/**
 * minimal harus tersisa satu season
 */
router.delete("/:season", async (req, res) => {
  const row = findSeason(req, res);
  if (!row) return;

  const media = req.media;
  if (media.seasons.length <= 1) {
    return res.status(400).json({ message: "minimal harus ada satu season" });
  }

  try {
    const { error } = await supabase
      .from("media_seasons")
      .delete()
      .eq("media_id", media.id)
      .eq("season", row.season);
    if (error) throw error;

    res.status(200).json([await syncTitle(media)]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
