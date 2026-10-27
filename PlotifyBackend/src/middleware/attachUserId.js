import { supabase } from "../supabase-client.js";

// cache clerk id -> user id supaya tiap request tidak perlu query tabel users lagi.
// hidup per instance (di vercel bertahan selama instance masih warm)
const TTL = 10 * 60 * 1000;
const MAX_ENTRIES = 5000;
const cache = new Map();

// dipanggil saat akun dihapus supaya id lama tidak dipakai lagi
export const forgetUserId = (clerkId) => cache.delete(clerkId);

// ubah clerk id ke user id (di tabel)
async function attachUserId(req, res, next) {
  try {
    const { userId: clerkId } = req.auth();

    const hit = cache.get(clerkId);
    if (hit && hit.expires > Date.now()) {
      req.userId = hit.id;
      return next();
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (error || !user) {
      cache.delete(clerkId);
      return res.status(404).json({ message: "User not found" });
    }

    // map menyimpan urutan insert, jadi key pertama adalah yang paling lama
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(clerkId, { id: user.id, expires: Date.now() + TTL });

    req.userId = user.id;

    next();
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
}

export default attachUserId;
