import { useCallback, useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { fullName } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useSidebarPinned } from "../hooks/useSidebarPinned";
import { pageTitleFor } from "../navigation";
import Avatar from "./Avatar";
import { buttonClass } from "./buttonStyles";
import RolePill from "./shell/RolePill";
import DesktopSidebar from "./shell/DesktopSidebar";
import MobileDrawer from "./shell/MobileDrawer";
import { TopBarProvider, TopBarSlot } from "./shell/TopBarContext";

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const [pinned, togglePinned] = useSidebarPinned();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  if (!user) return null;

  const name = fullName(user);

  return (
    <TopBarProvider>
      <div className="min-h-screen bg-canvas">
        {/* Desktop rail. Hover overlays the content; only pinning moves it (md:pl-rail / md:pl-sidebar below). */}
        <DesktopSidebar pinned={pinned} onTogglePin={togglePinned} />

        {drawerOpen && <MobileDrawer onClose={closeDrawer} />}

        <div
          className={`flex min-h-screen min-w-0 flex-col transition-[padding] duration-150 motion-reduce:transition-none ${
            pinned ? "md:pl-sidebar" : "md:pl-rail"
          }`}
        >
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4 md:px-6">
            <TopBarSlot
              fallback={
                <>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Open menu"
                    aria-expanded={drawerOpen}
                    className={buttonClass("ghost", "icon-touch")}
                  >
                    <Menu size={18} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <span className="truncate text-base font-semibold">{pageTitleFor(pathname)}</span>
                </>
              }
            />

            <div className="hidden items-center gap-3 md:flex">
              <Avatar name={name} size={28} />
              <span className="font-medium">Hello, {user.first_name}</span>
              <RolePill role={user.role} />
            </div>

            <button
              type="button"
              onClick={signOut}
              className={`${buttonClass("secondary", "md")} hidden md:inline-flex`}
            >
              <LogOut size={18} strokeWidth={2} aria-hidden="true" />
              Log out
            </button>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TopBarProvider>
  );
}
