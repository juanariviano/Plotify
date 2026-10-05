import { coverTone } from "../../lib/ui";

type CoverProps = {
  title: string;
  src?: string | null;
  className?: string;
  titleClassName?: string;
  showTitle?: boolean;
};

// an uploaded cover, or a toned block with the title set in serif
const Cover = ({ title, src, className = "", titleClassName = "text-lg", showTitle = true }: CoverProps) => {
  if (src) {
    return (
      <div className={`overflow-hidden bg-soft ${className}`}>
        <img
          src={src}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-end overflow-hidden p-[8%] ${className}`}
      style={{ background: coverTone(title) }}
      role="img"
      aria-label={title}
    >
      {showTitle && (
        <span
          className={`line-clamp-4 font-serif leading-[1.05] text-white/90 transition-transform duration-700 ease-out-expo group-hover:-translate-y-1 ${titleClassName}`}
        >
          {title}
        </span>
      )}
    </div>
  );
};

export default Cover;
