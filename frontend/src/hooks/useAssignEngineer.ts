import { assignServiceRequest, type SRRead } from "../api/serviceRequests";
import type { UserBrief } from "../api/users";
import { useToast } from "../components/Toast";
import { canAssign } from "../utils/serviceRequestActions";
import { useAuth } from "./useAuth";
import { useEngineers } from "./useEngineers";
import { useServiceRequestMutation } from "./useServiceRequests";

// The logic behind every "Assign" control (row, panel, mobile sheet). The engineers are only
// requested when this user may assign, so other roles never get a 403 from /users.
export function useAssignEngineer(sr: SRRead) {
  const { user } = useAuth();
  const toast = useToast();
  const allowed = canAssign(user?.role, sr.status);
  const engineers = useEngineers(allowed);

  const mutation = useServiceRequestMutation(
    (engineer: UserBrief) => assignServiceRequest(sr.id, engineer.id),
    {
      onSuccess: (_updated, engineer) => toast.show(`Assigned to ${engineer.full_name}`),
      onError: (error) => toast.show(error.message, "error"),
    }
  );

  return {
    canAssign: allowed,
    engineers: engineers.data,
    isLoading: engineers.isPending,
    isError: engineers.isError,
    isPending: mutation.isPending,
    isCurrent: (engineer: UserBrief) => engineer.id === sr.assigned_engineer_id,
    assign(engineer: UserBrief) {
      if (engineer.id !== sr.assigned_engineer_id) mutation.mutate(engineer);
    },
  };
}

export type AssignEngineer = ReturnType<typeof useAssignEngineer>;
