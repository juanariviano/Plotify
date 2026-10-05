import { Link } from "react-router";

type BreadcrumbItem = {
  label: string;
  to?: string;
};

const Breadcrumbs = ({
  items,
  className = "mb-8",
}: {
  items: BreadcrumbItem[];
  className?: string;
}) => {
  return (
    <nav aria-label="breadcrumb" className={`flex flex-wrap items-center gap-2 text-sm text-muted ${className}`}>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 && <span aria-hidden="true">/</span>}
          {item.to ? (
            <Link to={item.to} className="transition-colors hover:text-ink">
              {item.label}
            </Link>
          ) : (
            <span className="max-w-[40ch] truncate text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
