-- jalankan sekali di Supabase → SQL Editor (setelah rag.sql)
-- backend memakai service role key, yang tetap bisa melewati RLS.
-- frontend tidak memakai supabase langsung, jadi role anon/authenticated tidak butuh akses apa pun.

-- 1. aktifkan RLS tanpa policy → anon/authenticated tidak bisa baca/tulis tabel lewat REST API
alter table users enable row level security;
alter table media enable row level security;

-- 2. match_media menerima user_id dari parameter, jadi jangan bisa dipanggil langsung lewat /rpc
revoke execute on function match_media(vector, bigint, int, text, boolean) from public, anon, authenticated;
grant execute on function match_media(vector, bigint, int, text, boolean) to service_role;
