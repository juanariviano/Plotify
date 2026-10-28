-- jalankan sekali di Supabase → SQL Editor (setelah security.sql)
-- aman dijalankan ulang

-- 1. season (screen) / volume (read) yang sedang berjalan, dan berapa kali sudah diulang
alter table media
  add column if not exists season int not null default 1,
  add column if not exists rewatch_count int not null default 0;

alter table media drop constraint if exists media_season_check;
alter table media add constraint media_season_check check (season between 1 and 1000);

alter table media drop constraint if exists media_rewatch_count_check;
alter table media add constraint media_rewatch_count_check check (rewatch_count between 0 and 10000);

-- 2. rating aplikasi dari user. satu baris per user, diisi ulang = diperbarui
create table if not exists app_feedback (
  id bigint generated always as identity primary key,
  user_id bigint not null unique references users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- sama seperti tabel lain: hanya backend (service role) yang boleh akses
alter table app_feedback enable row level security;
