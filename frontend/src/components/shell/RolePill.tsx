import type { UserRole } from "../../api/users";
import { ROLE_DISPLAY } from "../Badges";

// Neutral outline pill for the signed-in user's role. RoleBadge (coloured) stays for the
// Users table; the shell uses the label from the same ROLE_DISPLAY map.
export default function RolePill({ role }: { role: UserRole }) {
  return (
    <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-medium text-ink-soft">
      {ROLE_DISPLAY[role].label}
    </span>
  );
}
