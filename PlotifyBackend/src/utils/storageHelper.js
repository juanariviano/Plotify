import { supabase } from "../supabase-client.js";

// upload ke supabase storage, trus dapetin publicUrl
export const uploadImage = async (file, folder, oldImageUrl = null) => {
  // hapus image lama kalau ada
  if (oldImageUrl) {
    const oldPath = oldImageUrl.split('/plotify/')[1];
    await supabase.storage.from('plotify').remove([oldPath]);
  }

  // upload image baru
  const fileExt = file.mimetype.split('/')[1];
  const filePath = `${folder}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from('plotify')
    .upload(filePath, file.buffer, { contentType: file.mimetype });

  if (error) throw error;

  const { data } = supabase.storage.from('plotify').getPublicUrl(filePath);
  return data.publicUrl;
};