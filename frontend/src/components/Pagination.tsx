import { buttonClass } from "./buttonStyles";

// Generic: it knows nothing about service requests, so any list page can use it.
// With total and pageSize it also shows "Showing 1-20 of 45" on the left.
export default function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
  pageSize,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  total?: number;
  pageSize?: number;
}) {
  const showing =
    total !== undefined && pageSize !== undefined && total > 0
      ? `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`
      : null;

  return (
    <nav
      aria-label="Pagination"
      className={`mt-4 flex flex-wrap items-center gap-4 ${showing ? "justify-between" : "justify-center"}`}
    >
      {showing && <p className="text-sm text-muted">{showing}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={buttonClass("secondary", "sm")}
        >
          Prev
        </button>
        <span className="text-sm text-ink-soft">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className={buttonClass("secondary", "sm")}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
