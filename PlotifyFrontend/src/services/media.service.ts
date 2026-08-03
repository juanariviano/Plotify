import axios from "axios";
import type {
  AddMediaPayload,
  CompleteMediaPayload,
  DeleteMediaPayload,
  PaginatedMediaResponse,
  UncompleteMediaPayload,
  UpdateMediaPayload,
  Media,
} from "../types/media";

type GetMediaParams = {
  token: string;
  page?: number;
  limit?: number;
  type?: "screen" | "read";
  is_completed?: boolean;
  q?: string;
};

export const getMediaData = async ({
  token,
  page = 1,
  limit = 20,
  type,
  is_completed,
  q,
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
    });

    return res.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const getMediaById = async (token: string, id: number): Promise<Media> => {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_BACKEND_URL}/media/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

export const createMedia = async ({ token, mediaData }: AddMediaPayload) => {
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

export const deleteMediaThumbnail = async ({
  token,
  id,
}: DeleteMediaPayload) => {
  const res = await axios.delete(
    `${import.meta.env.VITE_BACKEND_URL}/media/deletethumbnail/${id}`,
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