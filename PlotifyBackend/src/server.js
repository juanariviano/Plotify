import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import authMiddleware from "./middleware/authMiddleware.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import attachUserId from "./middleware/attachUserId.js";

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 8080;

const allowedOrigins = [
  "https://yourplotify.site",
  "https://www.yourplotify.site",
  "http://localhost:5173",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // tanpa header CORS, browser yang memblokir. tidak perlu dilempar jadi error 500
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// token yang rusak/tidak valid membuat clerk melempar error → balas 401, bukan 500
const clerk = clerkMiddleware();
app.use((req, res, next) =>
  clerk(req, res, (err) => {
    if (err) {
      console.error("clerk auth error:", err.message);
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  }),
);

// Clerk webhooks need the raw body buffer for signature verification
app.use("/webhooks", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
  res.status(200).json({ ok: true, service: "plotify-backend" });
});

// flow: clerk -> webhook -> backend -> supabase
app.use("/webhooks", webhookRoutes);
app.use("/auth", authMiddleware, authRoutes);
app.use("/media", authMiddleware, attachUserId, mediaRoutes);
app.use("/profile", authMiddleware, attachUserId, profileRoutes);
app.use("/chat", authMiddleware, attachUserId, chatRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "server error" });
});

// Local only. On Vercel the app is exported as a serverless function.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server has running on port: ${PORT}`);
  });
}

export default app;
