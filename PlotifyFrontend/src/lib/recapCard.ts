import type { Recap } from "../types/media";
import { MONTHS, personaOf } from "./recap";

// a 1080 × 1920 story-sized image of the recap, drawn by hand on a canvas.
// covers are left out: most cover hosts don't allow reading them back, and one would block the export

const W = 1080;
const H = 1920;
const PAD = 96;

const C = {
  night: "#17160f",
  paper: "#fbfaf7",
  accent: "#c2410c",
  dim: "#a8a397",
  line: "#3a382f",
};

const SERIF = '"Newsreader", Georgia, serif';
const SANS = '"Geist", "Helvetica Neue", Helvetica, sans-serif';
const MONO = '"Geist Mono", ui-monospace, Menlo, monospace';

// shrinks the text until it fits, then cuts it with an ellipsis as a last resort
const fit = (ctx: CanvasRenderingContext2D, text: string, max: number, size: number, family: string, min = size * 0.6) => {
  let s = size;
  ctx.font = `400 ${s}px ${family}`;
  while (ctx.measureText(text).width > max && s > min) {
    s -= 2;
    ctx.font = `400 ${s}px ${family}`;
  }
  let t = text;
  while (ctx.measureText(t).width > max && t.length > 1) t = t.slice(0, -2) + "…";
  return t;
};

export const drawRecapCard = async (r: Recap): Promise<Blob> => {
  // the page already uses these, but make sure the canvas doesn't fall back to a system font
  await Promise.all(
    [`400 120px ${SERIF}`, `400 40px ${SANS}`, `400 28px ${MONO}`].map((f) => document.fonts.load(f).catch(() => [])),
  );

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const persona = personaOf(r);

  ctx.fillStyle = C.night;
  ctx.fillRect(0, 0, W, H);

  // header
  ctx.fillStyle = C.accent;
  ctx.fillRect(PAD, PAD, 18, 30);
  ctx.fillStyle = C.paper;
  ctx.font = `500 44px ${SERIF}`;
  ctx.textBaseline = "top";
  ctx.fillText("plotify", PAD + 34, PAD - 6);
  ctx.font = `400 28px ${MONO}`;
  ctx.fillStyle = C.dim;
  ctx.textAlign = "right";
  ctx.fillText(`recap ${r.year}`, W - PAD, PAD + 4);
  ctx.textAlign = "left";

  // the big number
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.paper;
  ctx.font = `400 360px ${SERIF}`;
  ctx.fillText(r.totals.finished.toLocaleString("en-US"), PAD - 12, 640);
  ctx.font = `400 48px ${SANS}`;
  ctx.fillStyle = C.dim;
  ctx.fillText(`title${r.totals.finished === 1 ? "" : "s"} finished in ${r.year}`, PAD, 720);

  // persona
  ctx.fillStyle = C.accent;
  ctx.font = `400 30px ${MONO}`;
  ctx.fillText("you were", PAD, 850);
  ctx.fillStyle = C.paper;
  ctx.fillText(fit(ctx, persona.title, W - PAD * 2, 104, SERIF), PAD, 960);
  if (persona.trait) {
    ctx.font = `400 40px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText(`and ${persona.trait}.`, PAD, 1030);
  }

  // stat rows
  const top = r.topRated[0];
  const rows = (
    [
      ["on screen", `${r.totals.screen}`],
      ["on the page", `${r.totals.read}`],
      r.progress.episodes ? ["episodes", r.progress.episodes.toLocaleString("en-US")] : null,
      r.progress.pages ? ["pages & chapters", r.progress.pages.toLocaleString("en-US")] : null,
      r.topCategories[0] ? ["top genre", r.topCategories[0][0]] : null,
      r.topMonth != null ? ["busiest month", MONTHS[r.topMonth]] : null,
      top ? ["highest rated", top.title] : null,
    ] as ([string, string] | null)[]
  )
    .filter((row) => row !== null)
    .slice(0, 6);

  let y = 1150;
  for (const [label, value] of rows) {
    ctx.fillStyle = C.line;
    ctx.fillRect(PAD, y, W - PAD * 2, 2);
    ctx.font = `400 30px ${MONO}`;
    ctx.fillStyle = C.dim;
    ctx.fillText(label, PAD, y + 62);
    ctx.fillStyle = C.paper;
    ctx.textAlign = "right";
    ctx.fillText(fit(ctx, value, W - PAD * 2 - 360, 48, SERIF), W - PAD, y + 66);
    ctx.textAlign = "left";
    y += 104;
  }

  // footer
  ctx.fillStyle = C.accent;
  ctx.fillRect(0, H - 14, W, 14);
  ctx.font = `400 30px ${MONO}`;
  ctx.fillStyle = C.dim;
  ctx.fillText("yourplotify.site", PAD, H - PAD + 10);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas export failed"))), "image/png"),
  );
};
