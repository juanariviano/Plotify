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
