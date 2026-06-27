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
    <nav
      aria-label="breadcrumb"
      className={`reveal flex flex-wrap items-center gap-2 text-xs text-gray-400 ${className}`}
    >
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 && <span className="text-[#eaeaea]">/</span>}
          {item.to ? (
            <Link to={item.to} className="transition-colors hover:text-black">
              {item.label}
            </Link>
          ) : (
            <span className="text-black">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
