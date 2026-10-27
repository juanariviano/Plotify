-- jalankan sekali di Supabase → SQL Editor

-- 1. list rak: filter user_id + type + is_completed, urut created_at terbaru
--    (dipakai GET /media dan /media/stats)
create index if not exists media_user_shelf_idx
  on media (user_id, type, is_completed, created_at desc);

-- 2. favorit di /media/stats: item selesai diurutkan dari rating tertinggi
create index if not exists media_user_rating_idx
  on media (user_id, rating desc, created_at desc)
  where is_completed;

-- 3. lookup clerk_id → user di setiap request (attachUserId, /auth/user)
--    lewati kalau clerk_id sudah punya unique constraint
create index if not exists users_clerk_id_idx
  on users (clerk_id);

-- 4. cek username yang sudah dipakai (completeprofile, edit profile)
create index if not exists users_username_idx
  on users (username);
