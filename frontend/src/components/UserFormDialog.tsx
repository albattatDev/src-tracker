import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { ROLE_DISPLAY } from "./Badges";
import type { AdminUser, UserRole } from "../api/users";
import { useAuth } from "../hooks/useAuth";
import { useCreateUser, useUpdateUser, useUsers } from "../hooks/useUsers";
import ConfirmDialog from "./ConfirmDialog";
import Modal from "./Modal";

const CONTROL = "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900";
const ROLES = Object.keys(ROLE_DISPLAY) as UserRole[];

// Create when `user` is missing, edit otherwise. A role is chosen once, at creation: it is
// shown as plain text afterwards. The password exists only in the create form and is never
// shown again.
export default function UserFormDialog({
  user,
  onClose,
}: {
  user?: AdminUser;
  onClose: () => void;
}) {
  const { user: me } = useAuth();
  const isSelf = user !== undefined && user.id === me?.id;

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("engineer");
  const [managerId, setManagerId] = useState(String(user?.manager_id ?? ""));
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [confirming, setConfirming] = useState(false);

  const users = useUsers();
  const create = useCreateUser();
  const update = useUpdateUser(user?.id ?? 0);
  const save = user ? update : create;

  // Managers can be any active user except the one being edited.
  const managerOptions = (users.data ?? []).filter((u) => u.is_active && u.id !== user?.id);
  const effectiveRole = user ? user.role : role;
  const noManagerWarning = effectiveRole === "engineer" && managerId === "";
  const deactivating = user !== undefined && user.is_active && !isActive;

  const fieldErrors = save.error instanceof ApiError ? save.error.fieldErrors : {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const error = (field: string) =>
    fieldErrors[field] && <span className="font-normal text-red-700">{fieldErrors[field]}</span>;

  function submit() {
    const manager_id = managerId === "" ? null : Number(managerId);
    const options = {
      onSuccess: onClose,
      // Close the confirm so the message shows on the form field it belongs to.
      onError: () => setConfirming(false),
    };
    if (user) {
      update.mutate(
        {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          manager_id,
          is_active: isActive,
        },
        options
      );
    } else {
      create.mutate(
        {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          role,
          manager_id,
          password,
        },
        options
      );
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (deactivating) setConfirming(true);
    else submit();
  }

  return (
    <>
      <Modal title={user ? "Edit user" : "New user"} onClose={onClose} isBusy={save.isPending}>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              First name
              <input required maxLength={75} value={firstName} onChange={(e) => setFirstName(e.target.value)} className={CONTROL} />
              {error("first_name")}
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Last name
              <input required maxLength={75} value={lastName} onChange={(e) => setLastName(e.target.value)} className={CONTROL} />
              {error("last_name")}
            </label>
          </div>

          {user ? (
            <>
              <div className="text-xs font-medium text-gray-600">
                Email
                <p className="mt-1 text-sm font-normal text-gray-900">{user.email}</p>
              </div>
              <div className="text-xs font-medium text-gray-600">
                Role
                <p className="mt-1 text-sm font-normal text-gray-900">
                  {ROLE_DISPLAY[user.role].label}{" "}
                  <span className="text-gray-500">(cannot be changed after creation)</span>
                </p>
              </div>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                Email (used to log in)
                <input required type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} className={CONTROL} />
                {error("email")}
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                Role (cannot be changed later)
                <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={CONTROL}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_DISPLAY[r].label}
                    </option>
                  ))}
                </select>
                {error("role")}
              </label>
            </>
          )}

          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Manager
            <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={CONTROL}>
              <option value="">{users.isPending ? "Loading users…" : "No manager"}</option>
              {managerOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.email})
                </option>
              ))}
            </select>
            {error("manager_id")}
          </label>
          {noManagerWarning && (
            <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              This engineer has no manager. Invoice alerts go to the engineer's manager, so
              without one only the engineer is notified.
            </p>
          )}

          {!user && (
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Initial password (at least 8 characters)
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={CONTROL}
              />
              {error("password")}
            </label>
          )}

          {user && (
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="checkbox"
                  checked={isActive}
                  disabled={isSelf}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Active
              </label>
              {isSelf && <p className="mt-1 text-xs text-gray-500">You cannot deactivate your own account.</p>}
              {error("is_active")}
            </div>
          )}

          {users.isError && (
            <p role="alert" className="text-sm text-red-700">
              Could not load users: {users.error.message}
            </p>
          )}
          {save.error && !hasFieldErrors && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {save.error.message}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={save.isPending}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {save.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      {confirming && user && (
        <ConfirmDialog
          title={`Deactivate ${user.full_name}?`}
          message="They won't be able to log in. Their requests and invoices stay linked to them."
          confirmLabel={update.isPending ? "Deactivating…" : "Deactivate"}
          tone="reject"
          onConfirm={submit}
          onCancel={() => setConfirming(false)}
          isLoading={update.isPending}
        />
      )}
    </>
  );
}
