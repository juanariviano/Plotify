import { GoogleGenAI } from "@google/genai";
import { supabase } from "../supabase-client.js";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// harus sama dengan vector(768) di sql/rag.sql
const DIMENSIONS = 768;

/**
 * ubah teks jadi vektor
 * taskType: RETRIEVAL_DOCUMENT untuk data yang disimpan, RETRIEVAL_QUERY untuk pertanyaan
 */
export async function embedText(text, taskType = "RETRIEVAL_DOCUMENT") {
  const res = await ai.models.embedContent({
    model: process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001",
    contents: text,
    config: { outputDimensionality: DIMENSIONS, taskType },
  });

  return res.embeddings[0].values;
}

/**
 * gabungkan field media jadi satu teks yang mewakili isinya
 */
export function buildMediaText(media) {
  return [
    `title: ${media.title}`,
    `type: ${media.type === "read" ? "book / manga / reading" : "movie / series / anime"}`,
    media.category?.length ? `categories: ${media.category.join(", ")}` : "",
    media.description ? `description: ${media.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * hitung ulang embedding satu media lalu simpan ke kolom embedding
 * error tidak dilempar supaya add/update tetap berhasil walau gemini sedang gagal
 */
export async function refreshMediaEmbedding(media) {
  try {
    const embedding = await embedText(buildMediaText(media));

    const { error } = await supabase
      .from("media")
      .update({ embedding })
      .eq("id", media.id);

    if (error) throw error;
  } catch (error) {
    console.error(`embedding gagal untuk media ${media.id}:`, error.message);
  }
}

/**
 * sama seperti refreshMediaEmbedding, tapi banyak media dalam satu panggilan gemini (dipakai bulk add)
 */
export async function refreshMediaEmbeddings(mediaList) {
  if (!mediaList.length) return;

  try {
    const res = await ai.models.embedContent({
      model: process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001",
      contents: mediaList.map(buildMediaText),
      config: { outputDimensionality: DIMENSIONS, taskType: "RETRIEVAL_DOCUMENT" },
    });

    await Promise.all(
      mediaList.map((media, i) =>
        supabase.from("media").update({ embedding: res.embeddings[i].values }).eq("id", media.id),
      ),
    );
  } catch (error) {
    console.error(`embedding gagal untuk ${mediaList.length} media:`, error.message);
  }
}
