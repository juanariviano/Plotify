import Cropper, { type Area } from "react-easy-crop";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { cropImage } from "../../lib/cropImage";
import { btn } from "../../lib/ui";

type ImageCropperProps = {
  // the picked image; null keeps the cropper closed
  file: File | null;
  aspect: number;
  round?: boolean;
  outputWidth: number;
  title?: string;
  onCancel: () => void;
  onDone: (cropped: File) => void;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

// drag to move, pinch / scroll / slider to zoom, then crop to the shape it will be shown in
const ImageCropper = ({
  file,
  aspect,
  round = false,
  outputWidth,
  title = "frame your image",
  onCancel,
  onDone,
}: ImageCropperProps) => {
  const src = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (src) URL.revokeObjectURL(src);
  }, [src]);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // every new image starts centred and unzoomed
  const [shownFile, setShownFile] = useState(file);
  if (file !== shownFile) {
    setShownFile(file);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setError("");
  }

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const confirm = async () => {
    if (!file || !area) return;
    try {
      setBusy(true);
      onDone(await cropImage(file, area, outputWidth));
    } catch {
      setError("couldn't read that image. try a jpg, png or webp.");
    } finally {
      setBusy(false);
    }
  };

  const nudge = (delta: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));

  return (
    <Modal open={!!file} onClose={() => !busy && onCancel()} title={title}>
      <p className="mb-4 text-sm text-muted">drag to move it, scroll or pinch to zoom.</p>

      <div className="relative h-[320px] w-full overflow-hidden bg-ink">
        {src && (
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            aspect={aspect}
            cropShape={round ? "round" : "rect"}
            showGrid={!round}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
          />
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          aria-label="zoom out"
          onClick={() => nudge(-0.2)}
          className="flex h-9 w-9 items-center justify-center text-muted hover:text-ink"
        >
          <Minus size={16} />
        </button>
        <label className="flex-1">
          <span className="sr-only">zoom</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-[var(--color-ink)]"
          />
        </label>
        <button
          type="button"
          aria-label="zoom in"
          onClick={() => nudge(0.2)}
          className="flex h-9 w-9 items-center justify-center text-muted hover:text-ink"
        >
          <Plus size={16} />
        </button>
        <button type="button" onClick={reset} className={btn("ghost", "sm")}>
          <RotateCcw size={14} /> reset
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button type="button" className={btn("primary", "lg")} onClick={confirm} disabled={busy || !area}>
          {busy ? "cropping…" : "use this"}
        </button>
        <button type="button" className={btn("secondary", "lg")} onClick={onCancel} disabled={busy}>
          cancel
        </button>
      </div>
    </Modal>
  );
};

export default ImageCropper;
