import { changeServiceRequestStatus, SR_STATUSES, type SRRead, type SRStatus } from "../api/serviceRequests";
import { STATUS_DISPLAY } from "../components/Badges";
import { useToast } from "../components/Toast";
import { nextStatusFor } from "../utils/serviceRequestActions";
import { useAuth } from "./useAuth";
import { useServiceRequestMutation } from "./useServiceRequests";

export interface StatusOption {
  status: SRStatus;
  state: "current" | "allowed" | "disabled";
}

// The logic behind every "Move to" control (row, panel, mobile sheet). Which move is allowed
// comes from nextStatusFor, which mirrors the backend.
export function useStatusChange(sr: SRRead) {
  const { user } = useAuth();
  const toast = useToast();
  const next = nextStatusFor(user?.role, sr.status);

  const mutation = useServiceRequestMutation(
    (status: SRStatus) => changeServiceRequestStatus(sr.id, status),
    {
      onSuccess: (updated) => toast.show(`Status updated to ${STATUS_DISPLAY[updated.status].label}`),
      onError: (error) => toast.show(error.message, "error"),
    }
  );

  const options: StatusOption[] = SR_STATUSES.map((status) => ({
    status,
    state: status === sr.status ? "current" : status === next ? "allowed" : "disabled",
  }));

  return {
    canChange: next !== null,
    options,
    isPending: mutation.isPending,
    change(status: SRStatus) {
      if (status === next) mutation.mutate(status);
    },
  };
}

export type StatusChange = ReturnType<typeof useStatusChange>;
