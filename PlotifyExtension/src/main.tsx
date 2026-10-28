import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/chrome-extension";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import "./index.css";
import App from "./App.tsx";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// popup hidup hanya selama terbuka, jadi cache cukup di memori
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* syncHost: session diambil dari login di web plotify, jadi tidak perlu login dua kali */}
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} syncHost={import.meta.env.VITE_CLERK_SYNC_HOST}>
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </ClerkProvider>
    </QueryClientProvider>
  </StrictMode>,
);
