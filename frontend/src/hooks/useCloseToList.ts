import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSrListLinks } from "./useSrListLinks";

// Closes whatever opened over the list (panel, slide-over, dialog) by going back to the list
// URL with the same query string, so the filters stay.
export function useCloseToList() {
  const navigate = useNavigate();
  const { listPath } = useSrListLinks();
  return useCallback(() => navigate(listPath), [navigate, listPath]);
}
