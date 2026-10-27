import { isValidExternalId } from "./validate.js";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

// buang tag HTML dari deskripsi AniList (contoh: <br>, <i>)
const stripHtml = (text) => (text ? text.replace(/<[^>]*>/g, "").trim() : null);

/**
 * cari film & series di TMDB
 */
async function searchTmdb(q) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}` } },
  );
  const json = await res.json();

  return (json.results || [])
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 5)
    .map((r) => ({
      external_source: r.media_type === "movie" ? "tmdb_movie" : "tmdb_tv",
      external_id: String(r.id),
      title: r.title || r.name,
      description: r.overview || null,
      image_url: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null,
      category: [],
      year: (r.release_date || r.first_air_date || "").slice(0, 4) || null,
    }));
}

/**
 * cari anime / manga di AniList
 * mediaType: "ANIME" atau "MANGA"
 */
async function searchAnilist(q, mediaType) {
  const query = `
    query ($search: String, $type: MediaType) {
      Page(perPage: 5) {
        media(search: $search, type: $type) {
          id
          title { romaji english }
          description(asHtml: false)
          coverImage { large }
          genres
          startDate { year }
        }
      }
    }`;

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { search: q, type: mediaType } }),
  });
  const json = await res.json();

  return (json.data?.Page?.media || []).map((m) => ({
    external_source: "anilist",
    external_id: String(m.id),
    title: m.title.english || m.title.romaji,
    description: stripHtml(m.description),
    image_url: m.coverImage?.large || null,
    category: m.genres || [],
    year: m.startDate?.year ? String(m.startDate.year) : null,
  }));
}

/**
 * cari buku di Open Library
 */
async function searchOpenLibrary(q) {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5&fields=key,title,first_publish_year,cover_i,subject,author_name`,
  );
  const json = await res.json();

  return (json.docs || []).map((d) => ({
    external_source: "openlibrary",
    external_id: d.key, // contoh: "/works/OL123W"
    title: d.title,
    description: d.author_name ? `Oleh ${d.author_name.join(", ")}` : null,
    image_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    category: (d.subject || []).slice(0, 5),
    year: d.first_publish_year ? String(d.first_publish_year) : null,
  }));
}

// hasil lookup jarang berubah; judul yang sama tidak perlu memanggil API luar lagi
const LOOKUP_TTL = 60 * 60 * 1000;
const LOOKUP_MAX = 500;
const lookupCache = new Map();

export async function lookupExternal(q, type) {
  const key = `${type}:${q.trim().toLowerCase()}`;
  const hit = lookupCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.results;

  const results = await searchExternal(q, type);

  // hasil kosong tidak disimpan, bisa jadi karena API luar sedang gagal
  if (results.length) {
    if (lookupCache.size >= LOOKUP_MAX) lookupCache.delete(lookupCache.keys().next().value);
    lookupCache.set(key, { results, expires: Date.now() + LOOKUP_TTL });
  }

  return results;
}

/**
 * cari di semua sumber sesuai tipe rak
 * screen → TMDB + AniList anime
 * read   → AniList manga + Open Library
 */
async function searchExternal(q, type) {
  const searches =
    type === "screen"
      ? [searchTmdb(q), searchAnilist(q, "ANIME")]
      : [searchAnilist(q, "MANGA"), searchOpenLibrary(q)];

  // allSettled: kalau satu API gagal, yang lain tetap jalan
  const results = await Promise.allSettled(searches);

  return results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

// ---------------------------------------------------------------------------
// detail & rekomendasi (dipakai oleh chatbot)
// ---------------------------------------------------------------------------

const tmdbFetch = async (path) => {
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
};

const anilistFetch = async (query, variables) => {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
};

const ANILIST_FIELDS = `
  id
  type
  title { romaji english }
  description(asHtml: false)
  coverImage { large }
  genres
  startDate { year }
`;

const fromAnilist = (m) => ({
  external_source: "anilist",
  external_id: String(m.id),
  title: m.title.english || m.title.romaji,
  description: stripHtml(m.description),
  image_url: m.coverImage?.large || null,
  category: m.genres || [],
  year: m.startDate?.year ? String(m.startDate.year) : null,
  type: m.type === "MANGA" ? "read" : "screen",
});

const fromTmdb = (r, kind) => ({
  external_source: kind === "movie" ? "tmdb_movie" : "tmdb_tv",
  external_id: String(r.id),
  title: r.title || r.name,
  description: r.overview || null,
  image_url: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null,
  category: (r.genres || []).map((g) => g.name),
  year: (r.release_date || r.first_air_date || "").slice(0, 4) || null,
  type: "screen",
});

// id berasal dari gemini (bisa terpengaruh prompt injection), jadi formatnya dicek
// sebelum disisipkan ke url. contoh: id "@evil.com/x" akan membuat fetch ke host lain
const assertExternalId = (source, id) => {
  if (!isValidExternalId(source, id)) {
    throw new Error(`external_id tidak valid untuk ${source}`);
  }
};

const olDescription = (d) => (typeof d === "string" ? d : d?.value) || null;

/**
 * detail lengkap satu judul: sinopsis, genre, jumlah episode/chapter, dll
 */
export async function getExternalDetails(source, id) {
  assertExternalId(source, id);

  if (source === "tmdb_movie" || source === "tmdb_tv") {
    const kind = source === "tmdb_movie" ? "movie" : "tv";
    const r = await tmdbFetch(`/${kind}/${id}`);
    return {
      ...fromTmdb(r, kind),
      status: r.status,
      runtime_minutes: r.runtime ?? null,
      seasons: r.number_of_seasons ?? null,
      episodes: r.number_of_episodes ?? null,
      rating: r.vote_average ?? null,
    };
  }

  if (source === "anilist") {
    const data = await anilistFetch(
      `query ($id: Int) { Media(id: $id) { ${ANILIST_FIELDS} status episodes chapters volumes averageScore } }`,
      { id: Number(id) },
    );
    const m = data.Media;
    return {
      ...fromAnilist(m),
      status: m.status,
      episodes: m.episodes,
      chapters: m.chapters,
      volumes: m.volumes,
      rating: m.averageScore ? m.averageScore / 10 : null,
    };
  }

  if (source === "openlibrary") {
    const res = await fetch(`https://openlibrary.org${id}.json`);
    if (!res.ok) throw new Error(`Open Library ${res.status}`);
    const w = await res.json();
    return {
      external_source: "openlibrary",
      external_id: id,
      title: w.title,
      description: olDescription(w.description),
      image_url: w.covers?.[0] ? `https://covers.openlibrary.org/b/id/${w.covers[0]}-L.jpg` : null,
      category: (w.subjects || []).slice(0, 8),
      type: "read",
    };
  }

  throw new Error(`sumber tidak dikenal: ${source}`);
}

/**
 * judul-judul yang mirip dengan satu judul
 */
export async function getRecommendations(source, id) {
  assertExternalId(source, id);

  if (source === "tmdb_movie" || source === "tmdb_tv") {
    const kind = source === "tmdb_movie" ? "movie" : "tv";
    const json = await tmdbFetch(`/${kind}/${id}/recommendations`);
    return (json.results || []).slice(0, 8).map((r) => fromTmdb(r, kind));
  }

  if (source === "anilist") {
    const data = await anilistFetch(
      `query ($id: Int) {
        Media(id: $id) {
          recommendations(perPage: 8, sort: RATING_DESC) {
            nodes { mediaRecommendation { ${ANILIST_FIELDS} } }
          }
        }
      }`,
      { id: Number(id) },
    );
    return data.Media.recommendations.nodes
      .map((n) => n.mediaRecommendation)
      .filter(Boolean)
      .map(fromAnilist);
  }

  if (source === "openlibrary") {
    // open library tidak punya fitur rekomendasi, jadi cari buku dengan subjek yang sama
    const work = await getExternalDetails(source, id);
    const subject = work.category[0];
    if (!subject) return [];

    const res = await fetch(
      `https://openlibrary.org/search.json?subject=${encodeURIComponent(subject)}&limit=8&fields=key,title,first_publish_year,cover_i,subject,author_name`,
    );
    const json = await res.json();
    return (json.docs || [])
      .filter((d) => d.key !== id)
      .map((d) => ({
        external_source: "openlibrary",
        external_id: d.key,
        title: d.title,
        description: d.author_name ? `Oleh ${d.author_name.join(", ")}` : null,
        image_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
        category: (d.subject || []).slice(0, 5),
        year: d.first_publish_year ? String(d.first_publish_year) : null,
        type: "read",
      }));
  }

  throw new Error(`sumber tidak dikenal: ${source}`);
}
