import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import pkg from "./package.json" with { type: "json" };

// host clerk (frontend api) tersimpan di dalam publishable key: pk_<env>_<base64 host + "$">
const frontendApiOf = (publishableKey: string) =>
  Buffer.from(publishableKey.split("_")[2] ?? "", "base64").toString().replace(/\$$/, "");

// match pattern chrome tidak memakai port, jadi http://localhost:5173 -> http://localhost/*
const matchPattern = (url: string) => {
  const { protocol, hostname } = new URL(url);
  return `${protocol}//${hostname}/*`;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const publishableKey = env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey || !env.VITE_BACKEND_URL || !env.VITE_PLOTIFY_URL) {
    throw new Error("VITE_CLERK_PUBLISHABLE_KEY, VITE_BACKEND_URL dan VITE_PLOTIFY_URL wajib diisi di .env");
  }

  const frontendApi = frontendApiOf(publishableKey);
  // session dibaca dari cookie clerk: di development cookie ada di web app (localhost),
  // di production cookie ada di domain frontend api clerk
  const syncHost =
    env.VITE_CLERK_SYNC_HOST ||
    (publishableKey.startsWith("pk_live_") ? `https://${frontendApi}` : env.VITE_PLOTIFY_URL);

  const manifest = {
    manifest_version: 3,
    name: "Plotify",
    version: pkg.version,
    description: "log the episode or page you're on without leaving the tab.",
    icons: { 16: "icons/16.png", 32: "icons/32.png", 48: "icons/48.png", 128: "icons/128.png" },
    action: {
      default_title: "Plotify",
      default_popup: "popup.html",
      default_icon: { 16: "icons/16.png", 32: "icons/32.png" },
    },
    // activeTab + scripting: halaman hanya dibaca saat popup dibuka, bukan dipantau terus
    permissions: ["activeTab", "scripting", "storage", "cookies"],
    host_permissions: [...new Set([matchPattern(`https://${frontendApi}`), matchPattern(syncHost)])],
    // key hanya untuk build lokal supaya id extension tetap. chrome web store menolak field ini
    ...(env.EXTENSION_KEY ? { key: env.EXTENSION_KEY } : {}),
  };

  const emitManifest: Plugin = {
    name: "plotify-manifest",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "manifest.json", source: JSON.stringify(manifest, null, 2) });
    },
  };

  return {
    plugins: [react(), tailwindcss(), emitManifest],
    define: {
      "import.meta.env.VITE_CLERK_SYNC_HOST": JSON.stringify(syncHost),
    },
    build: {
      target: "es2022",
      rollupOptions: { input: "popup.html" },
    },
  };
});
