export type ClerkError = {
  errors?: {
    longMessage?: string;
  }[];
};

export type CompleteProfilePayload = {
  fullname: string
  username: string
  clerkId: string | null | undefined
  // email: string | undefined
}