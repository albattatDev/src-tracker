import type { PointerEvent, KeyboardEvent, RefObject } from "react";
import type { ResizableWidth } from "../hooks/useResizableWidth";

const STEP = 16;

// The drag handle on a panel's left edge. The panel is anchored to the right, so dragging
// left makes it wider. Pointer capture keeps the drag going outside the handle; arrow keys
// move it 16px (Left widens); a double-click goes back to the default width.
export default function PanelResizeHandle({
  panelRef,
  resize,
}: {
  panelRef: RefObject<HTMLElement>;
  resize: ResizableWidth;
}) {
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault(); // no text selection while dragging
    event.currentTarget.setPointerCapture(event.pointerId);
    resize.setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const right = panelRef.current?.getBoundingClientRect().right ?? window.innerWidth;
    resize.setWidth(right - event.clientX);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resize.setDragging(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") resize.setWidth(resize.width + STEP);
    else if (event.key === "ArrowRight") resize.setWidth(resize.width - STEP);
    else return;
    event.preventDefault();
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      aria-valuenow={resize.width}
      aria-valuemin={resize.min}
      aria-valuemax={resize.max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      onDoubleClick={resize.reset}
      className="absolute inset-y-0 -left-0.5 z-20 w-1.5 cursor-col-resize touch-none hover:bg-line-strong focus-visible:bg-ink"
    />
  );
}
