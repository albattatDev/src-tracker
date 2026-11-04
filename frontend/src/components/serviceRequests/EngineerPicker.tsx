import { useState } from "react";
import { Check, Search } from "lucide-react";
import type { UserBrief } from "../../api/users";
import type { AssignEngineer } from "../../hooks/useAssignEngineer";
import Avatar from "../Avatar";
import { CONTROL, type ControlSize } from "../formStyles";

const ROW = { md: "min-h-12", touch: "min-h-14" } as const;

function matches(engineer: UserBrief, query: string): boolean {
  return (
    engineer.full_name.toLowerCase().includes(query) || engineer.email.toLowerCase().includes(query)
  );
}

// Search box and the list of engineers, shared by the desktop popover and the mobile sheet.
// Render it only while open: the search starts empty every time.
export default function EngineerPicker({
  assign,
  size,
  onPick,
}: {
  assign: AssignEngineer;
  size: ControlSize;
  onPick: (engineer: UserBrief) => void;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const shown = (assign.engineers ?? []).filter((engineer) => matches(engineer, query));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          data-autofocus
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search engineers"
          aria-label="Search engineers"
          className={`w-full pl-9 ${CONTROL[size]}`}
        />
      </div>
      <p className="px-1 text-xs font-medium text-muted">Engineers</p>

      {assign.isLoading ? (
        <p className="px-2 py-3 text-sm text-muted">Loading engineers…</p>
      ) : assign.isError ? (
        <p role="alert" className="px-2 py-3 text-sm text-red-700">
          Couldn't load engineers.
        </p>
      ) : shown.length === 0 ? (
        <p className="px-2 py-3 text-sm text-muted">No engineers match.</p>
      ) : (
        <ul className="max-h-64 overflow-y-auto">
          {shown.map((engineer) => {
            const current = assign.isCurrent(engineer);
            return (
              <li key={engineer.id}>
                <button
                  type="button"
                  aria-current={current || undefined}
                  onClick={() => onPick(engineer)}
                  className={`flex w-full items-center gap-2 rounded-field px-2 text-left hover:bg-fill ${ROW[size]}`}
                >
                  <Avatar name={engineer.full_name} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{engineer.full_name}</span>
                    <span className="block truncate text-xs text-muted">{engineer.email}</span>
                  </span>
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {current && <Check size={16} strokeWidth={2} aria-hidden="true" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
