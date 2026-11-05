import type { ReactNode } from "react";

// A titled block of the dashboard: "Needs attention · Decisions waiting for you".
export default function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex flex-wrap items-baseline gap-x-3">
        <span className="text-base font-semibold">{title}</span>
        <span className="text-sm font-normal text-muted">{subtitle}</span>
      </h2>
      {children}
    </section>
  );
}
