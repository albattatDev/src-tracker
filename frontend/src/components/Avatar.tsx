import { User } from "lucide-react";

// Size in px: the circle box, the initials font and the empty-state icon.
const SIZES = {
  24: { box: "size-6", text: "text-[11px]", icon: 14 },
  28: { box: "size-7", text: "text-[12px]", icon: 16 },
} as const;

type AvatarSize = keyof typeof SIZES;

// Up to 2 initials: the first letters of the first two words, uppercase. Array.from walks
// code points, so a character made of several UTF-16 units is not cut in half.
// An empty or blank name gives "".
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0].toUpperCase())
    .join("");
}

// Decorative: the name is always written next to it, so screen readers skip it.
// No initials (no name, unassigned) shows a dashed circle with a user icon.
export default function Avatar({ name, size = 24 }: { name: string | null; size?: AvatarSize }) {
  const { box, text, icon } = SIZES[size];
  const letters = name ? initials(name) : "";
  if (!letters) {
    return (
      <span
        aria-hidden="true"
        className={`${box} inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-muted`}
      >
        <User size={icon} strokeWidth={2} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${box} ${text} inline-flex shrink-0 items-center justify-center rounded-full bg-line font-semibold text-ink-soft`}
    >
      {letters}
    </span>
  );
}

// An Avatar and the visible name, side by side. With no name it shows the dashed Avatar and,
// if given, emptyLabel ("Unassigned") in muted text.
export function PersonName({
  name,
  emptyLabel,
  size = 24,
}: {
  name: string | null;
  emptyLabel?: string;
  size?: AvatarSize;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar name={name} size={size} />
      {name ? <span>{name}</span> : emptyLabel && <span className="text-muted">{emptyLabel}</span>}
    </span>
  );
}
