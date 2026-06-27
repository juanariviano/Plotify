import { Link } from "react-router";
import { useEffect, useRef } from "react";
import type { Media, ItemsProps } from "../../types/media";
import "../../styles/animations.css";

const Item = ({ page, data }: ItemsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const pageData = data.filter((item: Media) => page.includes(item.type));

  const checkComplete = pageData.some((item: Media) => item.is_completed === true);
  const checkUncomplete = pageData.some(
    (item: Media) => item.is_completed === false,
  );
  const hasData = pageData.length > 0;

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const elements = root.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [data, page]);

  const progressLabel = page.includes("screen") ? "last eps" : "last page";

  const renderCard = (item: Media, index: number, completed: boolean) => (
    <Link key={item.id} to={`/card?id=${item.id}`}>
      <article
        className="reveal landing-card group flex h-full flex-col overflow-hidden bg-white"
        style={{ transitionDelay: `${index * 80}ms` }}
      >
        <div className="aspect-[3/4] overflow-hidden border-b border-[#eaeaea] bg-[#f7f6f3]">
          <img
            src={item.image_url ? item.image_url : "default-thumbnail.png"}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          />
        </div>
        <div className="flex flex-col gap-2 p-4">
          <h2 className="line-clamp-2 font-bold leading-snug">{item.title}</h2>
          <span className="font-mono text-xs text-gray-400">
            {completed ? `rating: ${item.rating}/5` : `${progressLabel}: ${item.last_episode}`}
          </span>
        </div>
      </article>
    </Link>
  );

  if (!hasData) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <span className="text-sm tracking-[0.08em] text-gray-400">no items found</span>
      </div>
    );
  }

  let ongoingIndex = 0;
  let completedIndex = 0;

  return (
    <div ref={containerRef}>
      {checkUncomplete && (
        <div className="reveal mb-6 mt-2">
          <span className="inline-block border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
            {page.includes("screen") ? "ongoing" : "on reads"}
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {pageData.map((item: Media) => {
          if (item.is_completed === false) {
            const card = renderCard(item, ongoingIndex, false);
            ongoingIndex += 1;
            return card;
          }
          return null;
        })}
      </div>

      {checkComplete && (
        <div className="reveal mb-6 mt-10">
          <span className="inline-block border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
            completed
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {pageData.map((item: Media) => {
          if (item.is_completed === true) {
            const card = renderCard(item, completedIndex, true);
            completedIndex += 1;
            return card;
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default Item;
