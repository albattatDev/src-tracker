const BUTTON =
  "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50";

// Generic: it knows nothing about service requests, so any list page can use it.
export default function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-center gap-4">
      <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={BUTTON}>
        Prev
      </button>
      <span className="text-sm text-gray-700">
        Page {page} of {pageCount}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        className={BUTTON}
      >
        Next
      </button>
    </nav>
  );
}
