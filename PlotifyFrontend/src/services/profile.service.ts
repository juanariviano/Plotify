import axios from "axios";
import type { EditProfilePayload } from "../types/profile";

export const getUserData = async (clerkId: string | null) => {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_BACKEND_URL}/auth/user`,
      { params: { clerkId } },
    );

    return res.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const uploadImageProfile = async (
  formData: FormData,
  token: string | null,
) => {
  try {
    await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/profile/upload-profile-image`,
      formData,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const deleteImageProfile = async (
  token: string | null
) => {
  try {
    await axios.delete(
      `${import.meta.env.VITE_BACKEND_URL}/profile/deleteprofilepic`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const editProfileData = async ({
  fullname,
  username,
  email,
  clerkId,
  token,
}: EditProfilePayload) => {
  try {
    await axios.put(
      `${import.meta.env.VITE_BACKEND_URL}/profile/edit`,
      { fullname, username, email, clerkId },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const deleteAccount = async (
  token: string | null,
) => {
  try {
    await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/profile/delete`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
