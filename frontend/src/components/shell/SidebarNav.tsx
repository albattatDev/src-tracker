import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { navItemsFor } from "../../navigation";

// The nav links shared by the desktop rail and the mobile drawer. Collapsed, the labels stay
// in the DOM for screen readers.
export default function SidebarNav({
  expanded,
  onNavigate,
}: {
  expanded: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
      {navItemsFor(user.role).map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          // Dashboard is matched exactly; the others stay active on their detail pages.
          end={item.path === "/dashboard"}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex h-10 items-center gap-3 rounded-button px-[11px] text-sm font-medium whitespace-nowrap ${
              isActive ? "bg-ink text-white" : "text-ink-soft hover:bg-fill"
            }`
          }
        >
          <item.icon size={18} strokeWidth={2} aria-hidden="true" className="shrink-0" />
          <span className={expanded ? "" : "sr-only"}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
