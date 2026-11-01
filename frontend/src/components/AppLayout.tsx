import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { navItemsFor } from "../navigation";

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  if (!user) return null;

  const links = navItemsFor(user.role).map((item) => (
    <NavLink
      key={item.path}
      to={item.path}
      onClick={() => setMenuOpen(false)}
      className={({ isActive }) =>
        `block rounded-md px-3 py-2 text-sm font-medium ${
          isActive
            ? "bg-gray-900 text-white"
            : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      {item.label}
    </NavLink>
  ));

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      {menuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-gray-200 bg-white p-4 transition-transform md:static md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 px-3 text-lg font-semibold text-gray-900">SRC-T</div>
        <nav aria-label="Main" className="space-y-1">
          {links}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 md:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              Menu
            </button>
            <span className="font-medium text-gray-900">Hello, {user.first_name}</span>
          </div>
          <button
            onClick={signOut}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Log out
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
