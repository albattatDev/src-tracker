import { useEffect, useRef } from "react";
import { LogOut, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { fullName } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { useModalDialog } from "../../hooks/useModalDialog";
import { APP_NAME } from "../../navigation";
import { PersonName } from "../Avatar";
import { buttonClass } from "../buttonStyles";
import RolePill from "./RolePill";
import SidebarNav from "./SidebarNav";

// The mobile menu. Render it only while it should be open (see useModalDialog). Shows the
// user and Log out at the bottom.
export default function MobileDrawer({ onClose }: { onClose: () => void }) {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const { ref, dialogProps } = useModalDialog(onClose);
  const openedAt = useRef(pathname);

  // Any navigation closes the drawer, including back and forward.
  useEffect(() => {
    if (pathname !== openedAt.current) onClose();
  }, [pathname, onClose]);

  // From the md breakpoint up the drawer is not used. A modal dialog would leave the page
  // inert behind it, so close it when the window grows past that width (tablet rotation).
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const onChange = () => wide.matches && onClose();
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, [onClose]);

  if (!user) return null;

  return (
    <dialog
      ref={ref}
      {...dialogProps}
      aria-label="Menu"
      className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-sidebar max-w-none flex-col overflow-hidden border-r border-line bg-surface p-0 backdrop:bg-black/40 open:flex"
    >
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className={buttonClass("ghost", "icon-touch")}
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <span className="text-lg font-semibold whitespace-nowrap">{APP_NAME}</span>
      </div>
      <SidebarNav expanded onNavigate={onClose} />
      <div className="space-y-3 border-t border-line p-3">
        <div className="flex flex-wrap items-center gap-2">
          <PersonName name={fullName(user)} size={28} />
          <RolePill role={user.role} />
        </div>
        <button
          type="button"
          onClick={signOut}
          className={`${buttonClass("secondary", "touch")} w-full`}
        >
          <LogOut size={18} strokeWidth={2} aria-hidden="true" />
          Log out
        </button>
      </div>
    </dialog>
  );
}
