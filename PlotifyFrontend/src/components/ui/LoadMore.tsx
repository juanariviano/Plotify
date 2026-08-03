import { DEFAULT_PAGE_SIZE } from "../../hooks/useMediaInfinite";

type LoadMoreProps = {
  visibleCount: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  className?: string;
  pageSize?: number;
};

const SKELETON_COUNT = 5;

const LoadMore = ({
  visibleCount,
  total,
  hasMore,
  isLoading,
  onLoadMore,
  className = "mt-10",
  pageSize = DEFAULT_PAGE_SIZE,
}: LoadMoreProps) => {
  if (total === 0 || (total <= pageSize && !hasMore && !isLoading)) {
    return null;
  }

  const showEndState = !hasMore && total > pageSize;

  return (
    <div className={`reveal flex flex-col items-center gap-6 ${className}`}>
      <span className="font-mono text-xs tracking-[0.06em] text-gray-400">
        showing {visibleCount} of {total}
      </span>

      {isLoading && (
        <div
          className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          aria-hidden="true"
        >
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <div
              key={index}
              className="load-more-skeleton flex flex-col overflow-hidden border border-[#eaeaea] bg-white"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="aspect-[3/4] bg-[#f7f6f3]" />
              <div className="flex flex-col gap-2 p-4">
                <div className="h-4 w-3/4 bg-[#f7f6f3]" />
                <div className="h-3 w-1/2 bg-[#f7f6f3]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && !isLoading && (
        <button
          type="button"
          onClick={onLoadMore}
          className="cursor-pointer border border-[#eaeaea] px-8 py-3 text-sm tracking-[0.04em] transition-all duration-500 ease-in-out hover:bg-black hover:text-white active:scale-[0.98]"
        >
          load more
        </button>
      )}

      {showEndState && (
        <span className="text-xs tracking-[0.06em] text-gray-400">all items loaded</span>
      )}
    </div>
  );
};

export default LoadMore;
