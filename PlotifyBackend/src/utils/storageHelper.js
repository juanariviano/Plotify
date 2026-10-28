import { supabase } from "../supabase-client.js";

const BUCKET = "plotify";

// ambil path storage dari public url, contoh: ".../plotify/media/12/123.png" -> "media/12/123.png"
const pathFromUrl = (url) =>
  typeof url === "string" ? url.split(`/${BUCKET}/`)[1] || null : null;

// upload ke supabase storage, trus dapetin publicUrl
// file disimpan per user (folder/userId/...) supaya bisa dicek kepemilikannya saat dihapus
export const uploadImage = async (file, folder, userId) => {
  const fileExt = file.mimetype.split("/")[1];
  const filePath = `${folder}/${userId}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file.buffer, { contentType: file.mimetype });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
};

// hapus image dari storage tanpa cek pemilik
// hanya untuk url yang ditulis server sendiri (users.profile_image_url), bukan input user
export const removeImage = async (url) => {
  const path = pathFromUrl(url);
  if (!path) return;

  await supabase.storage.from(BUCKET).remove([path]);
};

// hapus image dari storage, tapi hanya kalau file itu milik user ini
// media.image_url bisa diisi bebas oleh user, jadi tanpa cek ini user bisa menghapus file orang lain
export const removeOwnImage = async (url, userId) => {
  const path = pathFromUrl(url);
  if (!path || path.includes("..")) return;

  const owned = ["media", "profile"].some((folder) =>
    path.startsWith(`${folder}/${userId}/`),
  );
  if (!owned) return;

  await supabase.storage.from(BUCKET).remove([path]);
};

// hapus semua file milik satu user (cover media + foto profil), dipakai saat akun dihapus
export const removeUserFiles = async (userId) => {
  for (const folder of ["media", "profile"]) {
    const prefix = `${folder}/${userId}`;
    // list dibatasi per halaman, jadi ulangi sampai foldernya kosong
    for (;;) {
      const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 100 });
      if (error) throw error;
      if (!data?.length) break;

      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove(data.map((f) => `${prefix}/${f.name}`));
      if (removeError) throw removeError;
      if (data.length < 100) break;
    }
  }
};
