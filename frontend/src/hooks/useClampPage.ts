import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

interface Paged {
  total: number;
  page_size: number;
}

// For a paged list driven by `?page=`. A URL such as ?page=9 on a one-page list jumps to the
// last real page, replacing the history entry so Back does not return to the invalid one.
// `pastTheEnd` is true until that has happened (show the loading state, not an empty page).
// Waits while the data is placeholder data from the previous page.
export function useClampPage(page: number, data: Paged | undefined, isPlaceholderData: boolean) {
  const [, setSearchParams] = useSearchParams();
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : undefined;
  const pastTheEnd = pageCount !== undefined && page > pageCount;

  useEffect(() => {
    if (pageCount === undefined || isPlaceholderData || page <= pageCount) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (pageCount === 1) next.delete("page");
        else next.set("page", String(pageCount));
        return next;
      },
      { replace: true }
    );
  }, [pageCount, page, isPlaceholderData, setSearchParams]);

  return { pageCount: pageCount ?? 1, pastTheEnd };
}
