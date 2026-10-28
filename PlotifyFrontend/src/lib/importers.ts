import { gunzipSync, strFromU8, unzipSync } from "fflate";
import type { MatchKind, MatchQuery } from "../services/media.service";

// turns an export from another app into plotify titles. everything runs in the browser;
// only the titles that are finally added are sent to the server

export type ImportSource = "letterboxd" | "myanimelist" | "goodreads";
export type ImportStatus = "finished" | "ongoing" | "paused" | "planned" | "dropped";

export type ImportItem = {
  key: string;
  title: string;
  type: "screen" | "read";
  status: ImportStatus;
  // 1 - 5 in half steps; null when they never rated it
  rating: number | null;
  // last episode / chapter / page reached
  progress: number;
  // YYYY-MM-DD; null when the app doesn't know, so it stays out of every recap
  completedAt: string | null;
  description: string | null;
  match: MatchQuery;
};

export type ImportResult = {
  source: ImportSource;
  kind: MatchKind;
  type: "screen" | "read";
  items: ImportItem[];
};

export const SOURCE_LABELS: Record<ImportSource, string> = {
  letterboxd: "letterboxd",
  myanimelist: "myanimelist",
  goodreads: "goodreads",
};

// minimal rfc 4180: quoted fields may hold commas, newlines and doubled quotes
export const parseCsv = (text: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((f) => f.trim()));
  if (!header) return [];
  const names = header.map((h) => h.replace(/^\uFEFF/, "").trim());
  return body.map((r) => Object.fromEntries(names.map((h, i) => [h, (r[i] ?? "").trim()])));
};

const clampRating = (r: number) => (r > 0 ? Math.min(5, Math.max(1, Math.round(r * 2) / 2)) : null);
const clampProgress = (n: number) => (Number.isFinite(n) && n > 0 ? Math.min(100000, Math.floor(n)) : 0);
const isDate = (d: string | undefined): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !d.startsWith("0000");
const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);

// ---------------------------------------------------------------------------
// letterboxd: a zip of csv files. watched = every film, diary = when it was watched,
// ratings = the latest rating, watchlist = not seen yet
// ---------------------------------------------------------------------------

type LetterboxdFile = "watched" | "diary" | "ratings" | "watchlist" | "reviews";

const letterboxdKind = (name: string, rows: Record<string, string>[]): LetterboxdFile | null => {
  const base = name.split("/").pop()!.toLowerCase().replace(/\.csv$/, "");
  if (["watched", "diary", "ratings", "watchlist", "reviews"].includes(base)) return base as LetterboxdFile;
  const cols = Object.keys(rows[0] ?? {});
  if (!cols.includes("Letterboxd URI")) return null;
  if (cols.includes("Watched Date")) return "diary";
  if (cols.includes("Rating")) return "ratings";
  return "watched";
};

const parseLetterboxd = (files: { name: string; text: string }[]): ImportItem[] => {
  const byFilm = new Map<string, ImportItem>();
  const tables = files
    .map((f) => ({ rows: parseCsv(f.text), name: f.name }))
    .map((t) => ({ ...t, kind: letterboxdKind(t.name, t.rows) }))
    .filter((t): t is { rows: Record<string, string>[]; name: string; kind: LetterboxdFile } => !!t.kind);

  // watched first so the other files only fill in what it knows; the watchlist last, only for unseen films
  const order: LetterboxdFile[] = ["watched", "diary", "reviews", "ratings", "watchlist"];
  tables.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

  for (const { rows, kind } of tables) {
    for (const r of rows) {
      const title = r.Name?.slice(0, 200);
      if (!title) continue;
      const year = /^\d{4}$/.test(r.Year) ? r.Year : null;
      const key = `${title.toLowerCase()}|${year ?? ""}`;
      const seen = byFilm.get(key);

      if (kind === "watchlist") {
        if (!seen) {
          byFilm.set(key, {
            key,
            title,
            type: "screen",
            status: "planned",
            rating: null,
            progress: 0,
            completedAt: null,
            description: null,
            match: { title, year },
          });
        }
        continue;
      }

      const item: ImportItem = seen ?? {
        key,
        title,
        type: "screen",
        status: "finished",
        rating: null,
        progress: 0,
        completedAt: null,
        description: null,
        match: { title, year },
      };
      item.status = "finished";
      // only the diary knows when a film was actually watched; "Date" elsewhere is when it was logged
      if (kind === "diary" || kind === "reviews") {
        const watched = isDate(r["Watched Date"]) ? r["Watched Date"] : null;
        const wasLater = later(item.completedAt, watched) !== item.completedAt;
        item.completedAt = later(item.completedAt, watched);
        const rating = clampRating(parseFloat(r.Rating));
        if (rating && (wasLater || !item.rating)) item.rating = rating;
      }
      if (kind === "ratings") item.rating = clampRating(parseFloat(r.Rating)) ?? item.rating;
      byFilm.set(key, item);
    }
  }

  return [...byFilm.values()];
};

// ---------------------------------------------------------------------------
// myanimelist: one xml file (often gzipped) holding either the anime or the manga list
// ---------------------------------------------------------------------------

const MAL_STATUS: Record<string, ImportStatus> = {
  completed: "finished",
  watching: "ongoing",
  reading: "ongoing",
  "on-hold": "paused",
  dropped: "dropped",
  "plan to watch": "planned",
  "plan to read": "planned",
  // older exports use numbers
  "1": "ongoing",
  "2": "finished",
  "3": "paused",
  "4": "dropped",
  "6": "planned",
};

const parseMal = (xml: string): { kind: "anime" | "manga"; items: ImportItem[] } => {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new ImportError("this xml file couldn't be read.");

  const anime = [...doc.getElementsByTagName("anime")];
  const manga = [...doc.getElementsByTagName("manga")];
  const kind = anime.length >= manga.length ? "anime" : "manga";
  const entries = kind === "anime" ? anime : manga;
  const get = (el: Element, tag: string) => el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";

  const items = entries.flatMap((el): ImportItem[] => {
    const title = get(el, kind === "anime" ? "series_title" : "manga_title").slice(0, 200);
    if (!title) return [];
    const malId = parseInt(get(el, kind === "anime" ? "series_animedb_id" : "manga_mangadb_id"), 10);
    const status = MAL_STATUS[get(el, "my_status").toLowerCase()] ?? "planned";
    const finish = get(el, "my_finish_date");
    return [
      {
        key: `${kind}-${malId || title}`,
        title,
        type: kind === "anime" ? "screen" : "read",
        status,
        // mal scores out of ten
        rating: clampRating(parseInt(get(el, "my_score"), 10) / 2),
        progress: clampProgress(parseInt(get(el, kind === "anime" ? "my_watched_episodes" : "my_read_chapters"), 10)),
        completedAt: status === "finished" && isDate(finish) ? finish : null,
        description: null,
        match: { mal_id: malId > 0 ? malId : null },
      },
    ];
  });

  return { kind, items };
};

// ---------------------------------------------------------------------------
// goodreads: one csv; isbns are wrapped like ="0441013597" so spreadsheets keep the zeros
// ---------------------------------------------------------------------------

const cleanIsbn = (value = "") => {
  const isbn = value.replace(/[^0-9X]/gi, "").toUpperCase();
  return /^(\d{9}[\dX]|\d{13})$/.test(isbn) ? isbn : null;
};

const goodreadsStatus = (shelf: string): ImportStatus => {
  if (shelf === "read") return "finished";
  if (shelf === "currently-reading") return "ongoing";
  if (/dnf|did-not-finish|abandon|dropped/.test(shelf)) return "dropped";
  return "planned";
};

const parseGoodreads = (text: string): ImportItem[] =>
  parseCsv(text).flatMap((r): ImportItem[] => {
    const title = r.Title?.slice(0, 200);
    if (!title) return [];
    const status = goodreadsStatus((r["Exclusive Shelf"] || "").toLowerCase());
    const read = (r["Date Read"] || "").replace(/\//g, "-");
    return [
      {
        key: `gr-${r["Book Id"] || title}`,
        title,
        type: "read",
        status,
        rating: clampRating(parseInt(r["My Rating"], 10)),
        progress: status === "finished" ? clampProgress(parseInt(r["Number of Pages"], 10)) : 0,
        completedAt: status === "finished" && isDate(read) ? read : null,
        description: r.Author ? `by ${r.Author}` : null,
        match: { isbn: cleanIsbn(r.ISBN13) ?? cleanIsbn(r.ISBN) },
      },
    ];
  });

// ---------------------------------------------------------------------------

export class ImportError extends Error {}

const readBytes = async (file: File) => new Uint8Array(await file.arrayBuffer());
const isZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b;
const isGzip = (b: Uint8Array) => b[0] === 0x1f && b[1] === 0x8b;

// biggest export we'll read; a 50k-title letterboxd zip is still well under this
const MAX_BYTES = 30 * 1024 * 1024;

// one zip, xml(.gz) or csv, or several csvs from an unzipped letterboxd export
export const readExport = async (fileList: File[]): Promise<ImportResult> => {
  if (!fileList.length) throw new ImportError("pick a file first.");
  if (fileList.some((f) => f.size > MAX_BYTES)) throw new ImportError("that file is too big to be an export.");

  const texts: { name: string; text: string }[] = [];
  for (const file of fileList) {
    let bytes = await readBytes(file);
    if (isZip(bytes)) {
      try {
        // only the top-level csvs; letterboxd also ships deleted/ and orphaned/ copies
        const entries = unzipSync(bytes, { filter: (f) => !f.name.includes("/") && /\.csv$/i.test(f.name) });
        for (const [name, data] of Object.entries(entries)) texts.push({ name, text: strFromU8(data) });
      } catch {
        throw new ImportError("this zip couldn't be opened.");
      }
      continue;
    }
    if (isGzip(bytes)) {
      try {
        bytes = gunzipSync(bytes);
      } catch {
        throw new ImportError("this .gz file couldn't be opened.");
      }
    }
    texts.push({ name: file.name, text: strFromU8(bytes) });
  }

  const xml = texts.find((t) => /<myanimelist[\s>]/i.test(t.text.slice(0, 2000)));
  if (xml) {
    const { kind, items } = parseMal(xml.text);
    return { source: "myanimelist", kind, type: kind === "anime" ? "screen" : "read", items };
  }

  const head = (t: { text: string }) => t.text.slice(0, 500);
  const goodreads = texts.find((t) => head(t).includes("Exclusive Shelf") && head(t).includes("Book Id"));
  if (goodreads) return { source: "goodreads", kind: "book", type: "read", items: parseGoodreads(goodreads.text) };

  const letterboxd = texts.filter((t) => head(t).includes("Letterboxd URI"));
  if (letterboxd.length) return { source: "letterboxd", kind: "movie", type: "screen", items: parseLetterboxd(letterboxd) };

  throw new ImportError("this doesn't look like a letterboxd, myanimelist or goodreads export.");
};
