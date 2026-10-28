export type AppFeedback = {
  rating: number;
  comment: string | null;
  updated_at: string;
};

export type FeedbackStatus = {
  feedback: AppFeedback | null;
  // distinct days they've opened plotify
  visitDays: number;
};
