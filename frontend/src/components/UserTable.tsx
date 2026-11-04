import { Link } from "react-router-dom";
import type { AdminUser } from "../api/users";
import { useRowNavigation } from "../hooks/useRowNavigation";
import ContractorStatusBadge from "./ContractorStatusBadge";
import { RoleBadge } from "./Badges";

// The whole row opens the edit form (?edit=<id>); the name is a real link for keyboards.
export default function UserTable({ items }: { items: AdminUser[] }) {
  const { rowProps } = useRowNavigation();
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Role</th>
            <th className="px-3 py-2">Manager</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((user) => (
            <tr key={user.id} {...rowProps(`/users?edit=${user.id}`)}>
              <td className="whitespace-nowrap px-3 py-2 font-medium">
                <Link to={`/users?edit=${user.id}`} className="text-gray-900 hover:underline">
                  {user.full_name}
                </Link>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">{user.email}</td>
              <td className="px-3 py-2">
                <RoleBadge role={user.role} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                {user.manager_name ?? <span className="text-gray-400">—</span>}
              </td>
              <td className="px-3 py-2">
                <ContractorStatusBadge isActive={user.is_active} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
