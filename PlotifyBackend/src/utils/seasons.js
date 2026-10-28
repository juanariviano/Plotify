import { supabase } from "../supabase-client.js";

// semua kolom kecuali embedding (768 angka per item, tidak perlu dikirim ke frontend),
// plus riwayat season-nya
export const MEDIA_FIELDS =
  "id, image_url, title, description, category, source, type, last_episode, season, rewatch_count, is_completed, rating, user_id, created_at, completed_at, external_source, external_id, seasons:media_seasons(season, last_episode, is_completed, rating, rewatch_count)";

/**
 * media milik user beserta season-nya, atau null kalau tidak ada / bukan miliknya
 */
export async function getOwnedMedia(mediaId, userId) {
  const { data, error } = await supabase
    .from("media")
    .select(MEDIA_FIELDS)
    .eq("id", mediaId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// rating season 1 - 5 (bintang penuh, sama seperti StarPicker)
export const isSeasonRating = (rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5;

/**
 * hitung ulang kolom media dari season-season-nya lalu simpan:
 * - is_completed = semua season selesai
 * - season aktif = `active` kalau diberikan; kalau tidak, season aktif sekarang selama masih berjalan,
 *   lalu season berjalan terakhir, lalu season terakhir
 * - last_episode = progress season aktif
 * - rating = rata-rata season yang sudah dirating (1 desimal); tetap kalau belum ada yang dirating
 * extra: kolom media lain yang ikut disimpan (rewatch_count)
 */
export async function syncTitle(media, { active, extra = {} } = {}) {
  const { data: seasons, error } = await supabase
    .from("media_seasons")
    .select("season, last_episode, is_completed, rating")
    .eq("media_id", media.id)
    .order("season");

  if (error) throw error;

  const ongoing = seasons.filter((s) => !s.is_completed);
  const keep = seasons.find((s) => s.season === media.season && !s.is_completed);
  const current =
    seasons.find((s) => s.season === active) ?? keep ?? ongoing[ongoing.length - 1] ?? seasons[seasons.length - 1];

  const rated = seasons.filter((s) => s.rating != null);
  const average = rated.length
    ? Math.round((rated.reduce((sum, s) => sum + s.rating, 0) / rated.length) * 10) / 10
    : null;

  const { data, error: updateError } = await supabase
    .from("media")
    .update({
      season: current.season,
      last_episode: current.last_episode,
      is_completed: ongoing.length === 0,
      ...(average !== null ? { rating: average } : {}),
      ...extra,
    })
    .eq("id", media.id)
    .eq("user_id", media.user_id)
    .select(MEDIA_FIELDS)
    .single();

  if (updateError) throw updateError;
  return data;
}
