import { useCallback, useEffect, useRef, useState } from "react";

// A search box whose text is kept locally while the URL value (`value`) follows after a short
// pause. The pending commit is cancelled when `value` changes from outside (Clear, browser
// Back/Forward), and the text then resets to it. `reset()` is for a Clear that may not change
// `value` (it is already empty) while a commit is still waiting; the one owner of the search
// (useInvoiceListParams) calls it from its own clearFilters.
export function useDebouncedSearch(value: string, onCommit: (next: string) => void, delay = 300) {
  const [text, setTextState] = useState(value);
  const timer = useRef<number | undefined>(undefined);

  // The newest value and callback, so a timer started earlier never commits stale ones.
  const latest = useRef({ value, onCommit });
  useEffect(() => {
    latest.current = { value, onCommit };
  });

  const cancel = useCallback(() => window.clearTimeout(timer.current), []);

  useEffect(() => {
    cancel();
    setTextState(value);
  }, [value, cancel]);

  useEffect(() => cancel, [cancel]); // unmount

  const setText = useCallback(
    (next: string) => {
      setTextState(next);
      cancel();
      timer.current = window.setTimeout(() => {
        if (next !== latest.current.value) latest.current.onCommit(next);
      }, delay);
    },
    [cancel, delay]
  );

  const reset = useCallback(() => {
    cancel();
    setTextState("");
  }, [cancel]);

  return { text, setText, reset };
}
