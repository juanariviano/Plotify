import axios from "axios";
import type {
  AddMediaPayload,
  CompleteMediaPayload,
  DeleteMediaPayload,
  PaginatedMediaResponse,
  UncompleteMediaPayload,
  UpdateMediaPayload,
  Media,
  MediaStats,
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