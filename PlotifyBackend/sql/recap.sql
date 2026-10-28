-- jalankan sekali di Supabase → SQL Editor (setelah seasons.sql)
-- aman dijalankan ulang

-- 1. kapan sebuah judul selesai, dipakai recap tahunan (GET /media/recap/:year)
alter table media add column if not exists completed_at timestamptz;

-- 2. isi untuk judul yang sudah selesai: waktu season terakhir selesai, kalau tidak ada pakai waktu ditambahkan
update media m
set completed_at = coalesce(
  (select max(s.updated_at) from media_seasons s where s.media_id = m.id and s.is_completed),
  m.created_at
)
where m.is_completed and m.completed_at is null;

-- default dipasang setelah pengisian di atas; kalau dipasang saat add column, semua baris lama ikut terisi waktu migrasi ini
alter table media alter column completed_at set default now();

-- 3. completed_at selalu ikut is_completed, dari jalur mana pun (tombol selesai, season, extension, bulk add).
--    insert yang selesai: tanpa completed_at → default now(); import boleh membawa tanggal dari aplikasi asal,
--    atau null kalau tanggalnya tidak diketahui (tidak masuk recap tahun mana pun, daripada menumpuk di tahun import)
create or replace function set_completed_at()
returns trigger
language plpgsql
as $$
begin
  if not new.is_completed then
    new.completed_at := null;
  elsif tg_op = 'UPDATE' and not old.is_completed then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists media_set_completed_at on media;
create trigger media_set_completed_at
  before insert or update of is_completed on media
  for each row execute function set_completed_at();

revoke execute on function set_completed_at() from public, anon, authenticated;

-- 4. recap: judul selesai milik satu user dalam rentang waktu
create index if not exists media_user_completed_idx
  on media (user_id, completed_at)
  where is_completed;

-- 5. popup rating muncul di hari kedua user membuka plotify (POST /feedback/visit)
alter table users
  add column if not exists visit_days int not null default 0,
  add column if not exists last_visit_on date;

-- hari yang sama hanya dihitung sekali; tanggal mundur (ganti zona waktu) tidak dihitung
create or replace function record_visit(p_user_id bigint, p_day date)
returns int
language sql
as $$
  update users
  set visit_days = visit_days + (last_visit_on is null or p_day > last_visit_on)::int,
      last_visit_on = greatest(last_visit_on, p_day)
  where id = p_user_id
  returning visit_days;
$$;

revoke execute on function record_visit(bigint, date) from public, anon, authenticated;
grant execute on function record_visit(bigint, date) to service_role;
