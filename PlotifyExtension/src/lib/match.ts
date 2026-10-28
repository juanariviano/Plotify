import type { ExternalMedia, Media, MediaType, PageInfo } from "../types";

// "episode 12", "ep.12", "chapter-125", "ch 3", "bab 4", "s01e05".
// "part" dan "page" sengaja tidak ikut: sering jadi bagian judul atau url daftar halaman
const EPISODE_RE = /\b(?:episode|eps?|chapter|chap|ch|bab)\.?\s*[-_#:.]?\s*(\d{1,5})\b|\bs\d{1,2}\s*e(\d{1,4})\b/i;

// kata yang sering menempel di judul halaman situs streaming / baca
const NOISE_RE =
  /\b(?:watch|nonton|read|baca|streaming|stream|online|free|gratis|full movie|full episode|sub(?:title)? indo(?:nesia)?|eng(?:lish)? sub(?:bed)?|bahasa indonesia|subbed|dubbed|download|terbaru|hd)\b/gi;

// jenis media di awal / akhir judul: "Komik One Piece", "Solo Leveling Manhwa"
const KIND_EDGE_RE = /^(?:komik|comic|manga|manhwa|manhua|webtoon|novel|anime)\s+|\s+(?:komik|comic|manga|manhwa|manhua|webtoon|novel|anime)$/gi;

const SEPARATOR_RE = /\s+[|–—·•»]\s+|\s+-\s+/;

const READ_WORDS = new Set([
  "read", "baca", "chapter", "chapters", "chap", "ch", "bab", "manga", "manhwa", "manhua", "comic", "comics", "komik",
  "webtoon", "webtoons", "novel", "novels", "book", "books", "goodreads", "mangadex", "ebook",
]);
const SCREEN_WORDS = new Set([
  "watch", "nonton", "episode", "episodes", "eps", "ep", "anime", "movie", "movies", "film", "series", "tv", "netflix",
  "primevideo", "disneyplus", "hotstar", "crunchyroll", "imdb", "letterboxd", "vidio", "viu", "iqiyi", "youtube",
]);

const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export const normalize = (text: string) =>
  text.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "");

export const pageHost = (page: PageInfo) => hostOf(page.url);

// nomor episode / chapter dari judul halaman, lalu dari url
const episodeIn = (page: PageInfo): number | null => {
  let path = "";
  try {
    path = decodeURIComponent(new URL(page.url).pathname).replace(/[/_-]+/g, " ");
  } catch {
    // url aneh, pakai judul saja
  }
  for (const text of [...page.candidates, path]) {
    const m = EPISODE_RE.exec(text);
    if (m) return Number(m[1] ?? m[2]);
  }
  return null;
};

// mesin pencari bukan halaman tontonan / bacaan walaupun query-nya berisi "episode 5"
const SEARCH_HOST_RE = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|ecosia|baidu)\.|^search\./;

// judul dan nomor episode hanya diisi otomatis kalau halaman ini jelas film / seri / bacaan.
// selain itu form dibiarkan kosong supaya tidak terisi "Hasil Penelusuran" dan sejenisnya
export const isMediaPage = (page: PageInfo) => {
  const host = pageHost(page);
  if (!host || SEARCH_HOST_RE.test(host)) return false;
  return page.confident || READ_HOST_RE.test(host) || SCREEN_HOST_RE.test(host) || episodeIn(page) !== null;
};

export const detectEpisode = (page: PageInfo) => (isMediaPage(page) ? episodeIn(page) : null);

// potongan nama situs yang langsung menentukan jenis: "komikcast", "mangadex", "nontonanime"
const READ_HOST_RE = /komik|comic|manga|manhwa|manhua|webtoon|novel|goodreads|book|baca/;
const SCREEN_HOST_RE = /netflix|primevideo|disney|hotstar|crunchyroll|imdb|letterboxd|vidio|viu|iqiyi|nonton|anime|movie|film|drakor|youtube/;

export const guessType = (page: PageInfo): MediaType => {
  const host = pageHost(page);
  if (READ_HOST_RE.test(host)) return "read";
  if (SCREEN_HOST_RE.test(host)) return "screen";

  let read = 0;
  let screen = 0;
  for (const t of words(`${page.url} ${page.title}`)) {
    if (READ_WORDS.has(t)) read++;
    if (SCREEN_WORDS.has(t)) screen++;
  }
  return read > screen ? "read" : "screen";
};

// "Watch Solo Leveling Episode 12 Sub Indo - SitusXYZ" -> "Solo Leveling"
const cleanOne = (raw: string, siteWords: Set<string>) => {
  const parts = raw
    .split(SEPARATOR_RE)
    .map((part) => {
      let text = part;
      const ep = EPISODE_RE.exec(text);
      // potong mulai dari penanda episode, kecuali penandanya di awal ("Episode 3: Judul")
      if (ep) text = ep.index > 0 ? text.slice(0, ep.index) : text.slice(ep[0].length);
      const stripped = text.replace(NOISE_RE, " ").trim().replace(KIND_EDGE_RE, "");
      if (stripped.trim()) text = stripped;
      return text.replace(/\s+/g, " ").replace(/^[\s:,.#-]+|[\s:,.#-]+$/g, "");
    })
    // buang bagian yang isinya nama situs
    .filter((part) => part.length > 1 && !words(part).every((w) => siteWords.has(w)));
  return parts;
};

// daftar pilihan judul yang sudah dibersihkan, tanpa duplikat, maksimal 6
export const titleOptions = (page: PageInfo): string[] => {
  const host = pageHost(page);
  const siteWords = new Set([...words(host), ...words(page.siteName ?? ""), "com", "net", "org", "www"]);
  const seen = new Set<string>();
  const out: string[] = [];
  // teks yang diblok user selalu dipakai, sisanya hanya kalau halaman ini memang media
  const raws = [...(page.selection ? [page.selection] : []), ...(isMediaPage(page) ? page.candidates : [])];
  for (const raw of raws) {
    for (const option of cleanOne(raw, siteWords)) {
      const key = normalize(option);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(option);
    }
  }
  return out.slice(0, 6);
};

// path tanpa bagian episode: /series/solo-leveling/chapter-120 -> /series/solo-leveling
const seriesPath = (url: string) => {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    while (segments.length && (/^\d+$/.test(segments.at(-1)!) || EPISODE_RE.test(segments.at(-1)!.replace(/[-_]+/g, " ")))) {
      const last = segments.at(-1)!.replace(/[-_]+/g, " ");
      const m = EPISODE_RE.exec(last);
      // slug seperti "solo-leveling-episode-12": simpan bagian sebelum penanda episode
      if (m && m.index > 0) {
        segments[segments.length - 1] = last.slice(0, m.index).trim();
        break;
      }
      segments.pop();
    }
    return segments.join("/").toLowerCase().replace(/[\s_]+/g, "-");
  } catch {
    return "";
  }
};

// slug yang nomor episodenya menempel di ujung tanpa kata "episode": solo-leveling-12 -> solo-leveling
const loosePath = (path: string) => path.replace(/-\d{1,4}$/, "");

/**
 * skor kecocokan media milik user dengan halaman yang sedang dibuka
 * 3 = halaman seri yang sama, 2 = hampir pasti sama (dipilih otomatis), 1 = mungkin sama (ditawarkan)
 * external: hasil pencarian judul halaman ini di tmdb / anilist / open library, urut dari yang paling cocok
 */
const scoreOf = (item: Media, page: PageInfo, options: string[], external: ExternalMedia[]) => {
  const host = pageHost(page);
  let score = 0;
  if (item.source && hostOf(item.source) === host && host) {
    const a = seriesPath(item.source);
    const b = seriesPath(page.url);
    if (a && b && (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`))) return 3;
    if (a && b && loosePath(a) === loosePath(b)) score = 2;
  }

  // judul dari rekomendasi sering beda dengan judul halaman ("Solo Leveling" vs "Ore dake Level Up na Ken"),
  // tapi id eksternalnya sama dengan hasil pencarian judul halaman ini
  if (item.external_id) {
    const at = external.findIndex((e) => e.external_source === item.external_source && e.external_id === item.external_id);
    if (at === 0) return Math.max(score, 2);
    if (at > 0) score = Math.max(score, 1);
  }

  const title = normalize(item.title);
  if (!title) return score;
  const keys = options.map(normalize);
  if (keys.includes(title)) return 2;
  if (title.length >= 4 && keys.some((k) => k.length >= 4 && (k.includes(title) || title.includes(k)))) return Math.max(score, 1);
  return score;
};

export const rankMatches = (items: Media[], page: PageInfo, options: string[], external: ExternalMedia[] = []) => {
  const unique = new Map(items.map((item) => [item.id, item]));
  return [...unique.values()]
    .map((item) => ({ item, score: scoreOf(item, page, options, external) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.item.is_completed) - Number(b.item.is_completed));
};
