import type { MediaType } from "../types";

// sama dengan PlotifyFrontend/src/lib/ui.ts, ukurannya disesuaikan untuk popup
type Variant = "primary" | "secondary" | "ghost" | "accent" | "done";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-[background-color,border-color,color,transform,opacity] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-[#2d2b22]",
  secondary: "border border-line-strong bg-white text-ink hover:border-ink",
  ghost: "text-muted hover:text-ink",
  accent: "bg-accent text-white hover:bg-[#a5370a]",
  done: "bg-done text-white hover:bg-[#25552e]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
};

export const btn = (variant: Variant = "primary", size: Size = "md", extra = "") =>
  `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

const COVER_TONES = [
  "#2f3b3a",
  "#5a6a4d",
  "#6b3b2b",
  "#3a3f55",
  "#4a4038",
  "#24395a",
  "#3b4a3f",
  "#8a5a2b",
  "#4d5b6b",
  "#4a3a55",
];

export const coverTone = (title: string) => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return COVER_TONES[Math.abs(hash) % COVER_TONES.length];
};

export const unitOf = (type: MediaType) =>
  type === "read"
    ? { long: "page", short: "p", plural: "pages", part: "volume", again: "reread" }
    : { long: "episode", short: "ep", plural: "episodes", part: "season", again: "rewatch" };

export const isUrl = (value: string | null | undefined) =>
  !!value && /^https?:\/\//i.test(value.trim());

export const PLOTIFY_URL = import.meta.env.VITE_PLOTIFY_URL as string;

export const openTab = (url: string) => {
  chrome.tabs.create({ url });
  window.close();
};
