import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import UserFormDialog from "../components/UserFormDialog";
import UserTable from "../components/UserTable";
import { useUsers } from "../hooks/useUsers";

export default function UsersPage() {
  const query = useUsers();
  const [creating, setCreating] = useState(false);
  const [params, setParams] = useSearchParams();

  // The edit form is addressed by ?edit=<id>, so a row click is a normal link and Back closes it.
  const editId = Number(params.get("edit"));
  const editing = query.data?.find((u) => u.id === editId);
  const closeEdit = () => setParams({}, { replace: true });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          New user
        </button>
      </div>

      {query.isPending ? (
        <p className="text-gray-600">Loading…</p>
      ) : query.isError ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="mb-2">{query.error.message}</p>
          <button
            onClick={() => query.refetch()}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      ) : query.data.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-600">
          No users yet.
        </p>
      ) : (
        <UserTable items={query.data} />
      )}

      {creating && <UserFormDialog onClose={() => setCreating(false)} />}
      {editing && <UserFormDialog key={editing.id} user={editing} onClose={closeEdit} />}
    </div>
  );
}
