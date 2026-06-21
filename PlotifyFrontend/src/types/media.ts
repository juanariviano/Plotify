export type Media = {
    id: number;
    image_url: string | null;
    title: string;
    description: string | null;
    category: string[];
    source: string;
    type: "read" | "screen";
    last_episode: number;
    is_completed: boolean;
    rating: number;
    user_id: number;
    created_at: Date;
  };

export type ItemsProps = {
  page: string;
  data: Media[];
}

export type AddMediaPayload = {
  token: string,
  mediaData: {
    title: string;
    image_url: string | null;
    description: string;
    category: string[];
    source: string;
    last_episode: number;
    type: string;
  }
}

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
