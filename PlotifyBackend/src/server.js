import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import authMiddleware from "./middleware/authMiddleware.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import attachUserId from "./middleware/attachUserId.js";
import { rateLimit } from "./middleware/rateLimit.js";

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 8080;

// header keamanan untuk API JSON: tidak boleh di-iframe, tidak boleh ditebak tipe kontennya,
// dan kalau respon dibuka langsung di browser, tidak ada script / resource yang boleh jalan
app.use((_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  });
  next();
});

const allowedOrigins = [
  "https://yourplotify.site",
  "https://www.yourplotify.site",
  "http://localhost:5173",
  // origin extension chrome, contoh: chrome-extension://<id>. pisahkan dengan koma kalau lebih dari satu
  ...(process.env.EXTENSION_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
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
    exposedHeaders: ["Retry-After"],
  }),
);

// batas kasar per IP untuk semua endpoint. setelah cors supaya browser tetap bisa membaca 429-nya,
// sebelum clerk supaya flood tidak sampai ke verifikasi token
app.use(rateLimit({ name: "ip", limit: 300, windowSec: 60, by: "ip" }));

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
app.use("/feedback", authMiddleware, attachUserId, feedbackRoutes);

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
