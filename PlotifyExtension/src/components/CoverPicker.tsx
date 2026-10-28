import { useEffect, useRef, useState, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link2, Upload, X } from "lucide-react";
import Cover from "./Cover";
import { btn } from "../lib/ui";
import { ease, fade, pop } from "../lib/motion";

// sama dengan batas backend (middleware/upload.js)
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024;

type Props = {
  title: string;
  image: string | null;
  file: File | null;
  onImage: (url: string | null) => void;
  onFile: (file: File | null) => void;
};

export const checkImage = (file: File) => {
  if (!ALLOWED.includes(file.type)) return "only jpg, png or webp";
  if (file.size > MAX_SIZE) return "image too large, max 2mb";
  return null;
};

// cover dari hasil pencarian, file sendiri (upload / drag / paste), atau link gambar
const CoverPicker = ({ title, image, file, onImage, onFile }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const takeFile = (next: File | undefined) => {
    if (!next) return;
    const invalid = checkImage(next);
    setError(invalid ?? "");
    if (!invalid) onFile(next);
  };

  const applyLink = () => {
    const value = link.trim();
    if (!/^https?:\/\/\S+$/i.test(value) || value.length > 1000) return setError("paste a full image link (https://…)");
    setError("");
    onImage(value);
    setLinkOpen(false);
    setLink("");
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    takeFile(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <span className="label">cover</span>
      <div className="flex gap-3">
        <div
          className={`relative shrink-0 shadow-[0_10px_24px_-14px_rgba(23,22,15,0.6)] ${dragging ? "outline-2 outline-offset-2 outline-accent" : ""}`}
          onDragOver={(e) => (e.preventDefault(), setDragging(true))}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {/* key berubah tiap cover diganti, jadi gambar baru muncul dengan animasi */}
          <motion.div
            key={preview ?? image ?? "none"}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.35, ease } }}
          >
            <Cover title={title || "?"} image={preview ?? image} className="h-[120px] w-20" />
          </motion.div>
          <AnimatePresence>
            {(preview || image) && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1, transition: pop }}
                exit={{ scale: 0 }}
                type="button"
                onClick={() => (onFile(null), onImage(null))}
                aria-label="remove cover"
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center bg-ink text-white hover:bg-danger"
              >
                <X size={13} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex gap-2">
            <button type="button" onClick={() => input.current?.click()} className={btn("secondary", "sm")}>
              <Upload size={14} /> upload
            </button>
            <button type="button" onClick={() => setLinkOpen((v) => !v)} className={btn("secondary", "sm")}>
              <Link2 size={14} /> link
            </button>
          </div>
          <input
            ref={input}
            type="file"
            accept={ALLOWED.join(",")}
            className="hidden"
            onChange={(e) => (takeFile(e.target.files?.[0]), (e.target.value = ""))}
          />
          <AnimatePresence mode="wait" initial={false}>
          {linkOpen ? (
            <motion.div key="link" {...fade} className="mt-2.5 flex gap-1.5">
              <input
                className="field h-9 text-[13px]"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyLink())}
                placeholder="https://…/cover.jpg"
                aria-label="image link"
                autoFocus
              />
              <button type="button" onClick={applyLink} className={btn("primary", "sm")}>
                use
              </button>
            </motion.div>
          ) : (
            <motion.p key="hint" {...fade} className="mt-2.5 text-xs leading-relaxed text-muted">
              or drop / paste an image here. jpg, png, webp up to 2mb.
            </motion.p>
          )}
          </AnimatePresence>
          {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default CoverPicker;
