import { supabase } from "../supabase-client.js";
import { embedText } from "./embedding.js";
import {
  lookupExternal,
  getExternalDetails,
  getRecommendations,
} from "./externalMedia.js";
import { EXTERNAL_SOURCES } from "./validate.js";

const SHELF_FIELDS =
  "id, title, description, category, type, source, last_episode, is_completed, rating, external_source, external_id, created_at";


/**
 * daftar tool yang dikenalkan ke gemini
 * gemini hanya melihat nama, deskripsi, dan parameter. eksekusinya ada di runTool.
 * user_id sengaja TIDAK ada di parameter: selalu diambil dari token login.
 */
export const toolDeclarations = [
  {
    name: "search_my_shelf",
    description:
      "Semantic search over the user's own shelf (things they watched or read). Use for questions about a topic, genre, mood, or a title the user mentions. Returns items with progress (last_episode), completion, and rating.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to look for, e.g. a title, genre, or theme." },
        type: { type: "string", enum: ["screen", "read"], description: "screen = movies/series/anime, read = books/manga." },
        is_completed: { type: "boolean", description: "Only finished (true) or unfinished (false) items." },
      },
      required: ["query"],
    },
  },
  {
    name: "list_my_shelf",
    description:
      "List the user's shelf with filters and sorting, without a search query. Use for 'what did I add recently', 'what am I still watching', 'my highest rated', or counting.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["screen", "read"] },
        is_completed: { type: "boolean" },
        sort_by: { type: "string", enum: ["recent", "rating"], description: "recent = newest added first, rating = highest rated first." },
        limit: { type: "integer", description: "Max items, default 10, max 30." },
      },
    },
  },
  {
    name: "search_external",
    description:
      "Search public databases (TMDB for movies/series, AniList for anime/manga, Open Library for books) by title. Use to find the external_source and external_id of a title that has none on the shelf.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Title to search." },
        type: { type: "string", enum: ["screen", "read"] },
      },
      required: ["query", "type"],
    },
  },
  {
    name: "get_external_details",
    description:
      "Get full public info about one title: synopsis, genres, number of episodes/chapters/seasons, status, public rating.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        external_source: { type: "string", enum: EXTERNAL_SOURCES },
        external_id: { type: "string" },
      },
      required: ["external_source", "external_id"],
    },
  },
  {
    name: "get_recommendations",
    description:
      "Get titles similar to one title. Items already on the user's shelf are removed automatically.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        external_source: { type: "string", enum: EXTERNAL_SOURCES },
        external_id: { type: "string" },
      },
      required: ["external_source", "external_id"],
    },
  },
];

/**
 * buang item rekomendasi yang sudah ada di rak user
 */
async function excludeOwned(items, userId) {
  const { data: shelf } = await supabase
    .from("media")
    .select("title, external_source, external_id")
    .eq("user_id", userId);

  const ownedIds = new Set(
    (shelf || []).filter((m) => m.external_id).map((m) => `${m.external_source}:${m.external_id}`),
  );
  const ownedTitles = new Set((shelf || []).map((m) => m.title.trim().toLowerCase()));

  return items.filter(
    (item) =>
      !ownedIds.has(`${item.external_source}:${item.external_id}`) &&
      !ownedTitles.has(item.title.trim().toLowerCase()),
  );
}

/**
 * jalankan tool yang diminta gemini
 * userId berasal dari req.userId (middleware), bukan dari gemini
 */
export async function runTool(name, args, userId) {
  switch (name) {
    case "search_my_shelf": {
      const embedding = await embedText(args.query, "RETRIEVAL_QUERY");
      const { data, error } = await supabase.rpc("match_media", {
        query_embedding: embedding,
        match_user_id: userId,
        match_count: 6,
        filter_type: args.type ?? null,
        filter_completed: args.is_completed ?? null,
      });
      if (error) throw error;
      return data;
    }

    case "list_my_shelf": {
      const limit = Math.min(30, Math.max(1, parseInt(args.limit, 10) || 10));
      let query = supabase.from("media").select(SHELF_FIELDS).eq("user_id", userId);

      if (args.type) query = query.eq("type", args.type);
      if (args.is_completed !== undefined) query = query.eq("is_completed", args.is_completed);

      query =
        args.sort_by === "rating"
          ? query.order("rating", { ascending: false, nullsFirst: false })
          : query.order("created_at", { ascending: false });

      const { data, error } = await query.limit(limit);
      if (error) throw error;
      return data;
    }

    case "search_external":
      return lookupExternal(args.query, args.type);

    case "get_external_details":
      return getExternalDetails(args.external_source, args.external_id);

    case "get_recommendations": {
      const items = await getRecommendations(args.external_source, args.external_id);
      return excludeOwned(items, userId);
    }

    default:
      throw new Error(`tool tidak dikenal: ${name}`);
  }
}
