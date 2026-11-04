import { useCallback, useEffect, useState } from "react";

const KEY = "srct.sidebarPinned";

// Browser storage can be missing or throw (private window, blocked site data), so the
// sidebar falls back to the collapsed rail and still works.
function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function useSidebarPinned(): [boolean, () => void] {
  const [pinned, setPinned] = useState(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, pinned ? "1" : "0");
    } catch {
      // Not saved; the choice still applies for this visit.
    }
  }, [pinned]);

  const toggle = useCallback(() => setPinned((current) => !current), []);

  return [pinned, toggle];
}
