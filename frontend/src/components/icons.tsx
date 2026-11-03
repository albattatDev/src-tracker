import type { ReactNode } from "react";

// Small inline icons, so no icon library is needed. They are decorative: the button's text
// carries the meaning, so each one is hidden from screen readers.
export function UploadIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* the tray */}
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      {/* the arrow going up into it */}
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

// Shared by the icons below: the same 24x24 outline style as UploadIcon.
function Outline({ className, children }: { className: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

// A page with text lines: PDFs and anything that is not an image.
export function DocumentIcon({ className = "size-4" }: { className?: string }) {
  return (
    <Outline className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </Outline>
  );
}

// A picture frame with a hill and a sun: JPG and PNG.
export function ImageIcon({ className = "size-4" }: { className?: string }) {
  return (
    <Outline className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </Outline>
  );
}

export function CloseIcon({ className = "size-4" }: { className?: string }) {
  return (
    <Outline className={className}>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </Outline>
  );
}
