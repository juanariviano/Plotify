import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import authMiddleware from "./middleware/authMiddleware.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import attachUserId from "./middleware/attachUserId.js";

const app = express();
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
      return callback(new Error(`origin ${origin} not allowed by cors`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(clerkMiddleware());

// Clerk webhooks need the raw body buffer for signature verification
app.use("/webhooks", express.raw({ type: "application/json" }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({ ok: true, service: "plotify-backend" });
});

// flow: clerk -> webhook -> backend -> supabase
app.use("/webhooks", webhookRoutes);
app.use("/auth", authRoutes);
app.use("/media", authMiddleware, attachUserId, mediaRoutes);
app.use("/profile", authMiddleware, attachUserId, profileRoutes);

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
