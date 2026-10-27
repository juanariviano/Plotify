-- jalankan sekali di Supabase → SQL Editor

-- 1. aktifkan pgvector
create extension if not exists vector;

-- 2. kolom embedding (768 = outputDimensionality di src/utils/embedding.js)
alter table media
  add column if not exists embedding vector(768);

-- 3. index untuk pencarian cosine
create index if not exists media_embedding_idx
  on media using hnsw (embedding vector_cosine_ops);

-- 4. fungsi pencarian semantik, selalu dibatasi ke satu user
create or replace function match_media(
  query_embedding vector(768),
  match_user_id bigint,
  match_count int default 5,
  filter_type text default null,
  filter_completed boolean default null
)
returns table (
  id bigint,
  title text,
  description text,
  category text[],
  type text,
  source text,
  last_episode int,
  is_completed boolean,
  rating float,
  external_source text,
  external_id text,
  similarity float
)
language sql stable
as $$
  select
    m.id::bigint,
    m.title::text,
    m.description::text,
    m.category::text[],
    m.type::text,
    m.source::text,
    m.last_episode::int,
    m.is_completed,
    m.rating::float,
    m.external_source,
    m.external_id,
    1 - (m.embedding <=> query_embedding) as similarity
  from media m
  where m.user_id = match_user_id
    and m.embedding is not null
    and (filter_type is null or m.type = filter_type)
    and (filter_completed is null or m.is_completed = filter_completed)
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
