// isi embedding untuk semua media yang belum punya
// jalankan: node --env-file=.env scripts/backfill-embeddings.js
import { supabase } from "../src/supabase-client.js";
import { refreshMediaEmbedding } from "../src/utils/embedding.js";

const { data: rows, error } = await supabase
  .from("media")
  .select("id, title, description, category, type")
  .is("embedding", null);

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`${rows.length} media belum punya embedding`);

for (const [i, media] of rows.entries()) {
  await refreshMediaEmbedding(media);
  console.log(`${i + 1}/${rows.length}  ${media.title}`);
  // jeda kecil supaya tidak kena rate limit tier gratis
  await new Promise((r) => setTimeout(r, 700));
}

console.log("selesai");
