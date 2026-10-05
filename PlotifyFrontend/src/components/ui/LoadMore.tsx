import { DEFAULT_PAGE_SIZE } from "../../hooks/useMediaInfinite";
import { btn } from "../../lib/ui";

type LoadMoreProps = {
  visibleCount: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  className?: string;
  pageSize?: number;
};

const LoadMore = ({
  visibleCount,
  total,
  hasMore,
  isLoading,
  onLoadMore,
  className = "mt-12",
  pageSize = DEFAULT_PAGE_SIZE,
}: LoadMoreProps) => {
  if (total === 0 || (total <= pageSize && !hasMore && !isLoading)) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="h-1 w-48 bg-track" aria-hidden="true">
        <div
          className="h-1 bg-ink transition-[width] duration-700 ease-out-expo"
          style={{ width: `${Math.min(100, (visibleCount / total) * 100)}%` }}
        />
      </div>
      <span className="font-mono text-xs text-muted">
        showing {visibleCount} of {total}
      </span>

      {hasMore && (
        <button type="button" onClick={onLoadMore} disabled={isLoading} className={btn("secondary", "md", "min-w-36")}>
          {isLoading ? "loading…" : "load more"}
        </button>
      )}
    </div>
  );
};

export default LoadMore;
