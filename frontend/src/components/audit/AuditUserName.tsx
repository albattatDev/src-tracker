import type { AuditUser } from "../../api/audit";
import Avatar, { PersonName } from "../Avatar";

// Who did it. A system action has no user: a neutral avatar and "System" in muted text.
export default function AuditUserName({ user, size = 24 }: { user: AuditUser | null; size?: 24 | 28 }) {
  if (user) return <PersonName name={user.full_name} size={size} />;
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar name={null} size={size} />
      <span className="text-muted">System</span>
    </span>
  );
}
