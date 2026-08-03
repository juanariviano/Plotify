import { Link } from "react-router";
import { useEffect, useRef, useState } from "react";
import type { Media, ItemsProps } from "../../types/media";
import LoadMore from "./LoadMore";
import { DEFAULT_PAGE_SIZE, useMediaInfinite } from "../../hooks/useMediaInfinite";
import "../../styles/animations.css";

type MediaTab = "ongoing" | "completed";

const tabBaseClass =
  "flex flex-1 cursor-pointer items-center justify-center gap-2 border px-4 py-3 text-sm transition-all duration-500 ease-in-out active:scale-[0.98] sm:px-6 sm:py-4";

const getTabClass = (isActive: boolean, tab: MediaTab) => {
  if (!isActive) {
    if (tab === "completed") {
      return `${tabBaseClass} border-[#eaeaea] bg-white text-gray-400 hover:border-[rgba(52,101,56,0.2)] hover:bg-[#edf3ec] hover:text-[#346538]`;
    }

    return `${tabBaseClass} border-[#eaeaea] bg-white text-gray-400 hover:border-[#111111] hover:bg-[#f7f6f3] hover:text-[#111111]`;
  }

  if (tab === "completed") {
    return `${tabBaseClass} border-[rgba(52,101,56,0.12)] bg-[#edf3ec] text-[#346538]`;
  }

  return `${tabBaseClass} border-[#111111] bg-[#111111] text-white`;
};

const Item = ({ page, search = "" }: ItemsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<MediaTab>("ongoing");
  const mediaType = page.includes("screen") ? "screen" : "read";
  const ongoingLabel = page.includes("screen") ? "ongoing" : "on reads";

  const ongoing = useMediaInfinite({
    type: mediaType,
    isCompleted: false,
    search,
  });

  const completed = useMediaInfinite({
    type: mediaType,
    isCompleted: true,
    search,
  });

  const activeQuery = activeTab === "ongoing" ? ongoing : completed;
  const isCompletedView = activeTab === "completed";

  useEffect(() => {
    setActiveTab("ongoing");
  }, [search]);

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
  }, [
    activeTab,
    activeQuery.items.length,
    activeQuery.isLoadingMore,
    search,
  ]);

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

  const isInitialLoading =
    (ongoing.isLoading || completed.isLoading) &&
    ongoing.items.length === 0 &&
    completed.items.length === 0;

  if (isInitialLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <span className="text-sm tracking-[0.08em] text-gray-400">loading...</span>
      </div>
    );
  }

  if (ongoing.total === 0 && completed.total === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <span className="text-sm tracking-[0.08em] text-gray-400">no items found</span>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <div className="reveal mb-8 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("ongoing")}
          className={getTabClass(activeTab === "ongoing", "ongoing")}
        >
          <span>{ongoingLabel}</span>
          <span className="font-mono text-xs opacity-70">{ongoing.total}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={getTabClass(activeTab === "completed", "completed")}
        >
          <span>completed</span>
          <span className="font-mono text-xs opacity-70">{completed.total}</span>
        </button>
      </div>

      <div key={activeTab}>
        {activeQuery.isLoading && activeQuery.items.length === 0 ? (
          <div className="flex h-[40vh] items-center justify-center">
            <span className="text-sm tracking-[0.08em] text-gray-400">loading...</span>
          </div>
        ) : activeQuery.total === 0 ? (
          <div className="flex h-[40vh] flex-col items-center justify-center gap-3">
            <span className="inline-block border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
              {activeTab === "ongoing" ? ongoingLabel : "completed"}
            </span>
            <span className="text-sm tracking-[0.08em] text-gray-400">no items here yet</span>
          </div>
        ) : (
          <>
            <div className="reveal mb-6 mt-2">
              <span
                className={`inline-block border px-3 py-1 text-[10px] tracking-[0.08em] ${
                  isCompletedView
                    ? "card-detail-badge card-detail-badge--completed"
                    : "border-[#eaeaea] bg-[#f7f6f3] text-gray-400"
                }`}
              >
                {isCompletedView ? "completed" : ongoingLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {activeQuery.items.map((item, index) =>
                renderCard(item, index, isCompletedView),
              )}
            </div>

            <LoadMore
              visibleCount={activeQuery.visibleCount}
              total={activeQuery.total}
              hasMore={activeQuery.hasMore}
              isLoading={activeQuery.isLoadingMore}
              onLoadMore={activeQuery.loadMore}
              pageSize={DEFAULT_PAGE_SIZE}
              className="mt-10"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Item;
