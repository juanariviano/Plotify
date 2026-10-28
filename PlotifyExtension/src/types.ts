export type MediaType = "screen" | "read";

export type Media = {
  id: number;
  image_url: string | null;
  title: string;
  description: string | null;
  category: string[];
  source: string;
  type: MediaType;
  last_episode: number;
  is_completed: boolean;
  rating: number;
  user_id: number;
  created_at: string;
  external_source: string | null;
  external_id: string | null;
};

export type PaginatedMediaResponse = {
  data: Media[];
  total: number;
  page: number;
  limit: number;
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

export type NewMedia = {
  title: string;
  image_url: string | null;
  description: string;
  category: string[];
  source: string;
  last_episode: number;
  type: MediaType;
  external_source: string | null;
  external_id: string | null;
};

// apa yang dibaca dari tab yang sedang dibuka
export type PageInfo = {
  url: string;
  title: string;
  siteName: string | null;
  // calon judul mentah, urut dari yang paling bisa dipercaya
  candidates: string[];
  // situs / json-ld / og:type menandai halaman ini sebagai film, seri, atau bacaan
  confident: boolean;
  selection: string | null;
};
