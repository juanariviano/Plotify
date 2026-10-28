import axios from "axios";
import type {
  AddMediaPayload,
  CompleteMediaPayload,
  DeleteMediaPayload,
  PaginatedMediaResponse,
  UncompleteMediaPayload,
  UpdateMediaPayload,
  BulkMediaItem,
  Media,
  MediaStats,
  Recap,
} from "../types/media";
import type { ExternalMedia } from "../types/chat";

type GetMediaParams = {
  token: string;
  page?: number;
  limit?: number;
  type?: "screen" | "read";
  is_completed?: boolean;
  q?: string;
  signal?: AbortSignal;
};

export const getMediaData = async ({
  token,
  page = 1,
  limit = 20,
  type,
  is_completed,
  q,
  signal,
}: GetMediaParams): Promise<PaginatedMediaResponse> => {
  try {
    const params: Record<string, string | number | boolean> = { page, limit };

    if (type) params.type = type;
    if (is_completed !== undefined) params.is_completed = is_completed;
    if (q) params.q = q;

    const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/media`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params,
      signal,
    });

    return res.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const getMediaStats = async (token: string, signal?: AbortSignal): Promise<MediaStats> => {
  const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/media/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  return res.data;
};

export const getMediaById = async (token: string, id: number, signal?: AbortSignal): Promise<Media> => {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_BACKEND_URL}/media/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal,
      },
    );

    return res.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const uploadThumbnail = async ({
  token,
  file,
}: {
  token: string;
  file: File;
}) => {
  const formData = new FormData();

  formData.append("thumbnail", file);

  const res = await axios.post(
    `${import.meta.env.VITE_BACKEND_URL}/media/upload-thumbnail`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return res.data.image_url;
};

export const lookupMedia = async (
  token: string,
  q: string,
  type: "screen" | "read",
  signal?: AbortSignal,
): Promise<ExternalMedia[]> => {
  const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/media/lookup`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: { q, type },
    signal,
  });

  return res.data;
};

// endpoint mutasi membalas array berisi baris yang berubah
export const createMedia = async ({ token, mediaData }: AddMediaPayload): Promise<Media[]> => {
  const res = await axios.post(
    `${import.meta.env.VITE_BACKEND_URL}/media/add`,
    mediaData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return res.data;
};

export const updateMedia = async ({
  token,
  id,
  mediaData,
}: UpdateMediaPayload) => {
  const res = await axios.put(
    `${import.meta.env.VITE_BACKEND_URL}/media/update/${id}`,
    mediaData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const completeMedia = async ({
  token,
  id,
  rating,
}: CompleteMediaPayload) => {
  const res = await axios.put(
    `${import.meta.env.VITE_BACKEND_URL}/media/completed/${id}`,
    { rating },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const uncompleteMedia = async ({
  token,
  id,
}: UncompleteMediaPayload) => {
  const res = await axios.put(
    `${import.meta.env.VITE_BACKEND_URL}/media/uncompleted/${id}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const deleteMedia = async ({
  token,
  id,
}: DeleteMediaPayload) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_BACKEND_URL}/media/delete/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

// skipExisting leaves out titles already on the shelf; the answer only holds what was added
export const createMediaBulk = async (
  token: string,
  items: BulkMediaItem[],
  { skipExisting = false } = {},
): Promise<Media[]> => {
  const res = await axios.post(
    `${import.meta.env.VITE_BACKEND_URL}/media/bulk`,
    { items, ...(skipExisting ? { skip_existing: true } : {}) },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return res.data;
};

// every season call answers with the whole title, seasons included
const seasonRequest = async (
  token: string,
  method: "post" | "put" | "delete",
  path: string,
  body?: object,
): Promise<Media[]> => {
  const res = await axios.request({
    method,
    url: `${import.meta.env.VITE_BACKEND_URL}/media/${path}`,
    data: body,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

// active season is marked finished with its rating (required if it has none yet);
// restart: true starts the next one at 0, false keeps counting from the last episode
export const nextSeason = (token: string, id: number, restart: boolean, rating?: number) =>
  seasonRequest(token, "post", `${id}/seasons/next`, { restart, ...(rating ? { rating } : {}) });

export const addSeason = (
  token: string,
  id: number,
  season: { season: number; last_episode: number; is_completed: boolean; rating?: number },
) => seasonRequest(token, "post", `${id}/seasons`, season);

// a finished season needs a rating, sent here or already saved
export const updateSeason = (
  token: string,
  id: number,
  season: number,
  changes: { last_episode?: number; is_completed?: boolean; rating?: number },
) => seasonRequest(token, "put", `${id}/seasons/${season}`, changes);

export const switchSeason = (token: string, id: number, season: number) =>
  seasonRequest(token, "put", `${id}/seasons/${season}/switch`);

// a finished season back to episode 0; rewatch counts go up, rating is kept
export const rewatchSeason = (token: string, id: number, season: number) =>
  seasonRequest(token, "put", `${id}/seasons/${season}/rewatch`);

export const deleteSeason = (token: string, id: number, season: number) =>
  seasonRequest(token, "delete", `${id}/seasons/${season}`);

export type MatchKind = "movie" | "anime" | "manga" | "book";
export type MatchQuery = { title?: string; year?: string | null; mal_id?: number | null; isbn?: string | null };
// a book can come back with a cover but no open library work to link
export type MatchResult = Omit<ExternalMedia, "external_source" | "external_id"> & {
  external_source: ExternalMedia["external_source"] | null;
  external_id: string | null;
};

// covers, genres and ids for up to 50 imported titles at once; null where nothing matched
export const matchMedia = async (token: string, kind: MatchKind, items: MatchQuery[]): Promise<(MatchResult | null)[]> => {
  const res = await axios.post(
    `${import.meta.env.VITE_BACKEND_URL}/media/match`,
    { kind, items },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return res.data;
};

// tz keeps the year, months and weekdays on their local clock
export const getRecap = async (token: string, year: number, signal?: AbortSignal): Promise<Recap> => {
  const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/media/recap/${year}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: { tz: new Date().getTimezoneOffset() },
    signal,
  });

  return res.data;
};
