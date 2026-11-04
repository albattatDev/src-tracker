import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, listUsers, updateUser, type UserInput, type UserPatch } from "../api/users";

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: listUsers });
}

// A saved user can change who appears in the engineer and manager pickers elsewhere.
function useUserMutation<V>(mutationFn: (vars: V) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all(
        ["users", "managers", "engineers"].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] })
        )
      ),
  });
}

export const useCreateUser = () => useUserMutation((data: UserInput) => createUser(data));

export const useUpdateUser = (id: number) =>
  useUserMutation((data: UserPatch) => updateUser(id, data));
