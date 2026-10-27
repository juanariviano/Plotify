export const MEDIA_TYPES = ["screen", "read"];
export const EXTERNAL_SOURCES = ["tmdb_movie", "tmdb_tv", "anilist", "openlibrary"];

const isText = (v, max) => typeof v === "string" && v.length <= max;

const isHttpUrl = (v) => {
  try {
    return ["http:", "https:"].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};

// format external_id per sumber. dipakai juga untuk mencegah id aneh disisipkan ke url fetch
export const isValidExternalId = (source, id) => {
  if (typeof id !== "string") return false;
  if (source === "openlibrary") return /^\/works\/OL\d+W$/.test(id);
  if (EXTERNAL_SOURCES.includes(source)) return /^\d{1,12}$/.test(id);
  return false;
};

// cek field media dari body. isNew = true untuk add (title & type wajib)
// hasil: pesan error, atau null kalau valid
export const validateMedia = (body, { isNew = false } = {}) => {
  const {
    title,
    description,
    image_url,
    category,
    source,
    type,
    last_episode,
    rating,
    is_completed,
    external_source,
    external_id,
  } = body;

  if (isNew || title !== undefined) {
    if (!isText(title, 200) || !title.trim()) return "title wajib diisi (max 200 karakter)";
  }
  if (isNew || type !== undefined) {
    if (!MEDIA_TYPES.includes(type)) return "type harus screen atau read";
  }
  if (description != null && !isText(description, 2000)) {
    return "description max 2000 karakter";
  }
  if (image_url != null && !(isText(image_url, 1000) && isHttpUrl(image_url))) {
    return "image_url tidak valid";
  }
  if (
    category != null &&
    !(Array.isArray(category) && category.length <= 20 && category.every((c) => isText(c, 50)))
  ) {
    return "category max 20 item, masing-masing max 50 karakter";
  }
  // source boleh teks biasa ("netflix") atau link, tapi link harus http/https (blok javascript: dll)
  if (source != null) {
    if (!isText(source, 500)) return "source max 500 karakter";
    if (/^\s*[a-z][a-z0-9+.-]*:/i.test(source) && !isHttpUrl(source.trim())) {
      return "source harus berupa link http/https";
    }
  }
  if (
    last_episode != null &&
    !(Number.isInteger(Number(last_episode)) && last_episode >= 0 && last_episode <= 100000)
  ) {
    return "last_episode tidak valid";
  }
  if (rating != null && !isValidRating(rating)) return "rating harus 0 - 5";
  if (is_completed !== undefined && typeof is_completed !== "boolean") {
    return "is_completed harus boolean";
  }
  if (external_source != null || external_id != null) {
    if (!EXTERNAL_SOURCES.includes(external_source) || !isValidExternalId(external_source, external_id)) {
      return "external_source / external_id tidak valid";
    }
  }

  return null;
};

// fullname & username untuk complete profile / edit profile
export const validateName = ({ fullname, username }) => {
  if (!isText(fullname, 100) || !fullname.trim()) return "fullname wajib diisi (max 100 karakter)";
  if (!isText(username, 50) || !username.trim()) return "username wajib diisi (max 50 karakter)";
  return null;
};

export const isValidRating = (rating) => {
  const n = parseFloat(rating);
  return Number.isFinite(n) && n >= 0 && n <= 5;
};
