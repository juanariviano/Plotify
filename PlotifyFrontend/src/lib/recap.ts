import type { Recap } from "../types/media";

// the yearly recap opens on december 1st and stays open after that.
// VITE_RECAP_PREVIEW=true (or dev mode) opens the current year early, for testing
const DECEMBER = 11;
const PREVIEW = import.meta.env.DEV || import.meta.env.VITE_RECAP_PREVIEW === "true";

export const FIRST_RECAP_YEAR = 2020;

export const recapOpen = (year: number, now = new Date()) =>
  year >= FIRST_RECAP_YEAR &&
  (year < now.getFullYear() || (year === now.getFullYear() && (now.getMonth() === DECEMBER || PREVIEW)));

// the year the navbar points at: through december and january, like a season
export const featuredRecapYear = (now = new Date()) => {
  if (now.getMonth() === DECEMBER || PREVIEW) return now.getFullYear();
  if (now.getMonth() === 0) return now.getFullYear() - 1;
  return null;
};

export const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export const WEEKDAYS = ["sundays", "mondays", "tuesdays", "wednesdays", "thursdays", "fridays", "saturdays"];

export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" }).toLowerCase();

export type Persona = { title: string; line: string; trait: string | null };

// a light, kind label from the shape of their year
export const personaOf = (r: Recap): Persona => {
  const { finished, screen, read } = r.totals;
  const screenShare = finished ? screen / finished : 0;
  const genre = r.topCategories[0]?.[0];

  let persona: Persona;
  if (finished >= 60) {
    persona = { title: "the marathoner", line: `${finished} finished. you didn't slow down once.`, trait: null };
  } else if (screen && read && screenShare > 0.3 && screenShare < 0.7) {
    persona = { title: "the omnivore", line: "screen or page, you took a bite of everything.", trait: null };
  } else if (screenShare >= 0.7) {
    persona = {
      title: r.progress.episodes >= 200 ? "the binge-watcher" : "the night owl",
      line: genre ? `lights off, ${genre} on.` : "lights off, next episode on.",
      trait: null,
    };
  } else {
    persona = {
      title: r.progress.pages >= 3000 ? "the bookworm" : "the quiet reader",
      line: genre ? `always one more ${genre} chapter.` : "always one more chapter.",
      trait: null,
    };
  }

  const avg = r.averageRating;
  if (avg != null && r.totals.rated >= 3) {
    persona.trait = avg >= 4.3 ? "easy to please" : avg <= 3 ? "a tough critic" : "a fair judge";
  }
  return persona;
};
