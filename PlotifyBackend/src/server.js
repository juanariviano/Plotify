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
const PORT = process.env.PORT;

// cors
app.use(cors({
  origin: 'https://yourplotify.site',
  credentials: true
}));
// app.use(cors());
app.use(clerkMiddleware());

// karena berkaitan dgn autentikasi maka harus pake raw data (express.raw)
// biar yang data yg diproses daru pengguna itu hanya yg berformat json, dan tidak diubah ke object, tpi jadi buffer (data asli, tanpa diubah)
app.use('/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

// alur : clerk -> webhook -> be -> supabase
// routes
app.use("/webhooks", webhookRoutes);
app.use("/auth", authRoutes);
app.use("/media", authMiddleware, attachUserId, mediaRoutes);
app.use("/profile", authMiddleware, attachUserId, profileRoutes);

app.listen(PORT, () => {
  console.log(`Server has running on port: ${PORT}`);
});

// setup ngrok (tools yg bikin localhost server bisa diakses dari internet) -> buat clerk
// - jalanin npm install -g ngrok
// - ngrok config add-authtoken <token>
// - ngrok http <port backend>
