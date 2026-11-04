import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";

// The tablet/desktop layout of a list with a detail beside it: the list column, then the route's
// <Outlet /> (the inline panel on desktop, the slide-over or a dialog on tablet). -m-6 cancels
// AppLayout's md:p-6 so the panel sits flush against the top bar, the right edge and the bottom;
// the list column puts the padding back. Keep the two in step with AppLayout.
export default function MasterDetail({ children }: { children: ReactNode }) {
  return (
    <div className="-m-6 flex items-start">
      <div className="min-w-0 flex-1 p-6">{children}</div>
      <Outlet />
    </div>
  );
}
