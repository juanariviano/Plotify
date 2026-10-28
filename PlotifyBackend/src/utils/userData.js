import { supabase } from "../supabase-client.js";
import { removeUserFiles } from "./storageHelper.js";
import { forgetUserId } from "../middleware/attachUserId.js";

/**
 * hapus semua data satu akun di sisi plotify: file di storage, media (season & feedback ikut cascade), baris users.
 * dipakai DELETE /profile/delete dan webhook user.deleted dari clerk. aman dipanggil dua kali
 */
export async function deleteUserData(clerkId) {
  const { data: user, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (error) throw error;
  forgetUserId(clerkId);
  if (!user) return false;

  await removeUserFiles(user.id);

  const { error: mediaError } = await supabase.from("media").delete().eq("user_id", user.id);
  if (mediaError) throw mediaError;

  const { error: userError } = await supabase.from("users").delete().eq("id", user.id);
  if (userError) throw userError;

  return true;
}
