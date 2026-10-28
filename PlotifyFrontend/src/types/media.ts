export type Season = {
  season: number;
  last_episode: number;
  is_completed: boolean;
  // 1 - 5; the title's rating is the average of its seasons
  rating: number | null;
  rewatch_count: number;
};

export type Media = {
    id: number;
    image_url: string | null;
    title: string;
    description: string | null;
    category: string[];
    source: string;
    type: "read" | "screen";
    last_episode: number;
    season: number;
    rewatch_count: number;
    // every season of the title; `season` / `last_episode` above are the active one
    seasons?: Season[];
    is_completed: boolean;
    rating: number;
    user_id: number;
    created_at: Date;
    // when it was last finished; null while in progress
    completed_at?: string | null;
  };

export type ItemsProps = {
  page: string;
  search?: string;
};

export type MediaStats = {
  totals: { ongoing: number; finished: number; screenFinished: number; readFinished: number };
  ongoing: Media[];
  favourites: Media[];
  ratings: { stars: number; count: number }[];
  categories: [string, number][];
  // years with at least one finished title, newest first
  recapYears?: number[];
};

export type PaginatedMediaResponse = {
  data: Media[];
  total: number;
  page: number;
  limit: number;
};

export type AddMediaPayload = {
  token: string,
  mediaData: {
    title: string;
    image_url: string | null;
    description: string;
    category: string[];
    source: string;
    last_episode: number;
    season?: number;
    type: string;
    external_source?: string | null;
    external_id?: string | null;
  }
}

export type BulkMediaItem = AddMediaPayload["mediaData"] & {
  is_completed: boolean;
  // optional for finished titles only when importing; the bulk page always asks for one
  rating?: number;
  // the date it was finished in the app it came from
  completed_at?: string | null;
};

export type RecapItem = {
  id: number;
  title: string;
  type: "read" | "screen";
  image_url: string | null;
  rating: number | null;
  completed_at: string;
  // episodes or pages, across every season
  units: number;
};

export type Recap = {
  year: number;
  totals: { finished: number; screen: number; read: number; rated: number; added: number };
  progress: { episodes: number; pages: number };
  averageRating: number | null;
  months: number[];
  topMonth: number | null;
  weekdays: number[];
  topWeekday: number | null;
  busiestDay: { date: string; count: number } | null;
  topCategories: [string, number][];
  topRated: RecapItem[];
  first: RecapItem | null;
  last: RecapItem | null;
  biggest: RecapItem | null;
};

export type DeleteMediaPayload = {
  token: string;
  id: number;
};

export type UpdateMediaPayload = {
  token: string;
  id: number;
  mediaData: {
    source?: string;
    last_episode?: number;
    image_url?: string | null;
    category?: string[];
    title?: string;
    description?: string | null;
    rating?: number | null;
    is_completed?: boolean;
  };
};

export type CompleteMediaPayload = {
  token: string;
  id: number;
  rating: number;
};

export type UncompleteMediaPayload = {
  token: string;
  id: number;
};
