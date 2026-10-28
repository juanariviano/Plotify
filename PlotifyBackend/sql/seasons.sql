-- jalankan sekali di Supabase → SQL Editor (setelah features.sql)
-- aman dijalankan ulang

-- 1. riwayat per season (screen) / volume (read). satu baris per season per judul.
--    media.season + media.last_episode tetap ada sebagai season yang sedang aktif,
--    media.is_completed = semua season sudah selesai,
--    media.rating = rata-rata rating season (dihitung backend)
create table if not exists media_seasons (
  id bigint generated always as identity primary key,
  media_id bigint not null references media (id) on delete cascade,
  season int not null check (season between 1 and 1000),
  last_episode int not null default 0 check (last_episode between 0 and 100000),
  is_completed boolean not null default false,
  rating real check (rating between 1 and 5),
  rewatch_count int not null default 0 check (rewatch_count between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (media_id, season)
);

-- sama seperti tabel lain: hanya backend (service role) yang boleh akses
alter table media_seasons enable row level security;

-- 2. isi dari data yang sudah ada: tiap judul dapat satu baris untuk season aktifnya,
--    rating judul jadi rating season itu
insert into media_seasons (media_id, season, last_episode, is_completed, rating)
select id, season, last_episode, is_completed, case when rating >= 1 then rating end from media
on conflict (media_id, season) do nothing;

-- 3. season aktif selalu ikut media.last_episode, dari jalur mana pun
--    (tombol +1, edit, extension, add, bulk add). season baru ikut rating judul (bulk add yang sudah selesai)
create or replace function sync_active_season()
returns trigger
language plpgsql
as $$
begin
  insert into media_seasons (media_id, season, last_episode, is_completed, rating)
  values (new.id, new.season, new.last_episode, new.is_completed, case when new.rating >= 1 then new.rating end)
  on conflict (media_id, season)
  do update set last_episode = excluded.last_episode, updated_at = now();
  return new;
end;
$$;

drop trigger if exists media_sync_active_season on media;
create trigger media_sync_active_season
  after insert or update of season, last_episode on media
  for each row execute function sync_active_season();

revoke execute on function sync_active_season() from public, anon, authenticated;
