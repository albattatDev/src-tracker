import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonClass } from "../buttonStyles";
import { TopBarOverride } from "../shell/TopBarContext";

// Mobile detail: a full screen. It replaces the app's top bar with a back arrow (to the list,
// keeping its filters), the title and the header actions.
export default function DetailScreen({
  title,
  listPath,
  actions,
  footer,
  children,
}: {
  title: ReactNode;
  listPath: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <TopBarOverride>
        <Link to={listPath} aria-label="Back to list" className={buttonClass("ghost", "icon-touch")}>
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
        </Link>
        <span className="min-w-0 truncate text-base font-semibold">{title}</span>
        {actions && <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div>}
      </TopBarOverride>

      {/* The screen is as tall as the space under the top bar (-m-4 cancels AppLayout's p-4):
          the body scrolls and the footer stays at the bottom, as in the panel. */}
      <div className="-m-4 flex h-[calc(100dvh-var(--spacing-topbar))] flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="rounded-xl border border-line bg-surface">{children}</div>
        </div>
        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </>
  );
}
