import { useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import SidePanel from "../SidePanel";
import SlideOver from "../SlideOver";
import DetailBreadcrumb from "./DetailBreadcrumb";
import DetailScreen from "./DetailScreen";

// What the shell tells its children and footer about the screen they are on.
export interface ShellContext {
  mobile: boolean;
}

// The frame of every detail view: the inline panel on desktop, the slide-over on tablet, the
// full screen on mobile. Exactly one of them renders. It never fetches and knows nothing about
// the record: the entity's wrapper loads it (or takes it from a list) and passes in the title,
// the body (usually a <DetailState>), the footer and the header actions. The shell builds the
// breadcrumb and the mobile top bar from `list` and `title`, and pads the body.
export default function DetailShell({
  "aria-label": ariaLabel,
  width,
  storageKey,
  list,
  title,
  onClose,
  actions,
  footer,
  children,
}: {
  "aria-label": string;
  width: number; // panel width in px (desktop default, tablet fixed)
  storageKey: string; // where the desktop panel remembers its dragged width
  list: { label: string; path: string }; // the list this opened over; path keeps its filters
  title: string; // the record's name: breadcrumb end and mobile top bar
  onClose?: () => void; // default: go back to list.path
  actions?: ReactNode; // header buttons (Edit, activate/deactivate): panel header and mobile top bar
  footer?: (context: ShellContext) => ReactNode; // pinned under the body (e.g. Approve/Reject)
  children: (context: ShellContext) => ReactNode;
}) {
  const breakpoint = useBreakpoint();
  const navigate = useNavigate();
  const backToList = useCallback(() => navigate(list.path), [navigate, list.path]);
  const close = onClose ?? backToList;

  const context = { mobile: breakpoint === "mobile" };
  const body = <div className="p-4">{children(context)}</div>;
  const footerNode = footer?.(context);
  const breadcrumb = <DetailBreadcrumb listLabel={list.label} listPath={list.path} current={title} />;

  switch (breakpoint) {
    case "desktop":
      return (
        <SidePanel
          aria-label={ariaLabel}
          defaultWidth={width}
          storageKey={storageKey}
          onClose={close}
          breadcrumb={breadcrumb}
          actions={actions}
          footer={footerNode}
        >
          {body}
        </SidePanel>
      );
    case "tablet":
      return (
        <SlideOver
          aria-label={ariaLabel}
          width={width}
          onClose={close}
          breadcrumb={breadcrumb}
          actions={actions}
          footer={footerNode}
        >
          {body}
        </SlideOver>
      );
    case "mobile":
      return (
        <DetailScreen title={title} listPath={list.path} actions={actions} footer={footerNode}>
          {body}
        </DetailScreen>
      );
  }
}
