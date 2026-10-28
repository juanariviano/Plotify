import { coverTone } from "../lib/ui";

type Props = { title: string; image: string | null; className?: string };

// cover media, atau blok warna dengan huruf pertama kalau belum ada gambar
const Cover = ({ title, image, className = "h-[72px] w-12" }: Props) =>
  image ? (
    <img src={image} alt="" className={`${className} shrink-0 bg-soft object-cover`} />
  ) : (
    <div
      className={`${className} flex shrink-0 items-center justify-center font-serif text-xl text-white/80`}
      style={{ background: coverTone(title) }}
    >
      {title.trim().charAt(0).toUpperCase()}
    </div>
  );

export default Cover;
