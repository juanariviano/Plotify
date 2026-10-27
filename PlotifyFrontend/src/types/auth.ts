export type ClerkError = {
  errors?: {
    longMessage?: string;
  }[];
};

export type CompleteProfilePayload = {
  fullname: string
  username: string
  token: string | null
  // email: string | undefined
}