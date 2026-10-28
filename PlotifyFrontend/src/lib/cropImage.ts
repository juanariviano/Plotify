import type { Area } from "react-easy-crop";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// draws the chosen area at a fixed width and re-encodes it as jpeg, which also keeps
// big phone photos under the 2MB upload limit
export const cropImage = async (file: File, area: Area, outputWidth: number) => {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const width = Math.min(outputWidth, Math.round(area.width));
    const height = Math.round((width * area.height) / area.width);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas not supported");

    // jpeg has no transparency, so transparent png corners become white instead of black
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("could not encode image");

    const name = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
};
