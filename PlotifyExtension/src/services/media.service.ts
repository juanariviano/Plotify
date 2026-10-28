import type { ExternalMedia, Media, MediaType, NewMedia, PaginatedMediaResponse } from "../types";

const BASE = import.meta.env.VITE_BACKEND_URL as string;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const request = async <T>(token: string, path: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      // FormData mengatur content-type (multipart + boundary) sendiri
      ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.message ?? `request failed (${res.status})`);
  return body as T;
};

const query = (params: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (v === undefined || v === "" ? [] : [[k, String(v)]])),
  ).toString();

// media milik user: dari situs yang sama (site), judul yang mirip (q), atau satu rak (type)
export const findMedia = (
  token: string,
  params: { site?: string; q?: string; type?: MediaType; limit?: number },
  signal?: AbortSignal,
) => request<PaginatedMediaResponse>(token, `/media?${query({ limit: 50, ...params })}`, { signal });

export const lookupMedia = (token: string, q: string, type: MediaType, signal?: AbortSignal) =>
  request<ExternalMedia[]>(token, `/media/lookup?${query({ q, type })}`, { signal });

// upload cover ke supabase storage lewat backend (jpg / png / webp, max 2MB)
export const uploadThumbnail = async (token: string, file: File) => {
  const form = new FormData();
  form.append("thumbnail", file);
  return (await request<{ image_url: string }>(token, "/media/upload-thumbnail", { method: "POST", body: form })).image_url;
};

// endpoint mutasi membalas array berisi baris yang berubah
export const createMedia = async (token: string, media: NewMedia) =>
  (await request<Media[]>(token, "/media/add", { method: "POST", body: JSON.stringify(media) }))[0];

export const updateMedia = async (
  token: string,
  id: number,
  fields: Partial<Pick<Media, "last_episode" | "source">>,
) =>
  (await request<Media[]>(token, `/media/update/${id}`, { method: "PUT", body: JSON.stringify(fields) }))[0];

export const completeMedia = async (token: string, id: number, rating: number) =>
  (await request<Media[]>(token, `/media/completed/${id}`, { method: "PUT", body: JSON.stringify({ rating }) }))[0];

export const uncompleteMedia = async (token: string, id: number) =>
  (await request<Media[]>(token, `/media/uncompleted/${id}`, { method: "PUT", body: "{}" }))[0];
