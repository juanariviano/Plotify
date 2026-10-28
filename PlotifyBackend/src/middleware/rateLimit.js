import { getAuth } from "@clerk/express";

// batas jumlah request per user (atau per IP kalau belum login)
// di vercel tiap instance punya memori sendiri, jadi hitungan disimpan di upstash redis supaya berlaku untuk semua instance.
// env: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (atau KV_REST_API_URL + KV_REST_API_TOKEN dari integrasi vercel).
// kalau env tidak ada, hitungan disimpan di memori instance ini saja (cukup untuk lokal)
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (!REDIS_URL && process.env.VERCEL) {
  console.warn("rate limit: upstash belum diset, hitungan hanya per instance");
}

const MEMORY_MAX = 10000;
const memory = new Map();

// fixed window: key hidup selama windowMs, tiap request menaikkan hitungan
const hitMemory = (key, windowMs) => {
  const now = Date.now();
  let entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    if (memory.size >= MEMORY_MAX) memory.delete(memory.keys().next().value);
    entry = { count: 0, resetAt: now + windowMs };
    memory.set(key, entry);
  }
  entry.count += 1;
  return { count: entry.count, resetMs: entry.resetAt - now };
};

const hitRedis = async (key, windowMs) => {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    // SET NX hanya membuat key (dengan masa hidup) kalau belum ada; INCR tidak mengubah masa hidupnya
    body: JSON.stringify([
      ["SET", key, "0", "PX", String(windowMs), "NX"],
      ["INCR", key],
      ["PTTL", key],
    ]),
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const [, incr, ttl] = await res.json();
  return { count: incr.result, resetMs: ttl.result > 0 ? ttl.result : windowMs };
};

// vercel selalu menimpa x-forwarded-for dengan IP asli client, jadi entri pertama bisa dipercaya
export const clientIp = (req) =>
  req.headers["x-real-ip"] || req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress || "unknown";

/**
 * name: nama limit (jadi bagian key), limit: jumlah request, windowSec: panjang window
 * by: "user" (clerk id, fallback IP) atau "ip"
 */
export const rateLimit = ({ name, limit, windowSec, by = "user" }) => {
  const windowMs = windowSec * 1000;

  return async (req, res, next) => {
    const id = (by === "user" && getAuth(req)?.userId) || `ip:${clientIp(req)}`;
    const key = `rl:${name}:${id}`;

    let hit;
    try {
      hit = REDIS_URL ? await hitRedis(key, windowMs) : hitMemory(key, windowMs);
    } catch (error) {
      // redis sedang gagal → tetap layani request (pakai memori), jangan sampai aplikasi ikut mati
      console.error(`rate limit ${name}:`, error.message);
      hit = hitMemory(key, windowMs);
    }

    const resetSec = Math.ceil(hit.resetMs / 1000);
    res.set("RateLimit-Limit", String(limit));
    res.set("RateLimit-Remaining", String(Math.max(0, limit - hit.count)));
    res.set("RateLimit-Reset", String(resetSec));

    if (hit.count > limit) {
      res.set("Retry-After", String(resetSec));
      return res.status(429).json({ message: `too many requests. try again in ${resetSec}s.`, retryAfter: resetSec });
    }

    next();
  };
};

// dipakai test
export const resetMemoryLimits = () => memory.clear();
