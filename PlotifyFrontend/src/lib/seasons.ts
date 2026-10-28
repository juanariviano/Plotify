import type { Media, Season } from "../types/media";

// the title's seasons, oldest first. the active one always takes last_episode from the item
// itself, since quick +1 logging only patches that field in the cache
export const seasonsOf = (item: Media): Season[] => {
  const list = (item.seasons ?? []).map((s) =>
    s.season === item.season ? { ...s, last_episode: item.last_episode } : s,
  );

  if (!list.some((s) => s.season === item.season)) {
    list.push({
      season: item.season ?? 1,
      last_episode: item.last_episode,
      is_completed: item.is_completed,
      rating: item.rating > 0 ? item.rating : null,
      rewatch_count: 0,
    });
  }

  return list.sort((a, b) => a.season - b.season);
};

// true when finishing this season leaves nothing else running, so the title needs its rating
export const finishesTitle = (seasons: Season[], season: number) =>
  seasons.every((s) => s.season === season || s.is_completed);
