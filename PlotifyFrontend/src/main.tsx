import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ClerkProvider } from "@clerk/clerk-react";
import "./index.css";
import App from "./App.tsx";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { MotionConfig } from "motion/react";
import { persistOptions, queryClient } from "./lib/queryClient.ts";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <BrowserRouter>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <MotionConfig reducedMotion="user">
            <App />
          </MotionConfig>
        </ClerkProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
);
