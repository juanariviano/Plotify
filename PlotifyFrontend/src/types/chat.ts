export type ChatMessage = {
  role: "user" | "model";
  text: string;
  toolsUsed?: string[];
};

export type ChatResponse = {
  reply: string;
  toolsUsed: string[];
};

export type ExternalMedia = {
  external_source: "tmdb_movie" | "tmdb_tv" | "anilist" | "openlibrary";
  external_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string[];
  year: string | null;
};
