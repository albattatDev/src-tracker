import { ACTIVE_FILTERS, type ActiveFilter } from "../../hooks/useContractorListParams";
import { LABEL, type ControlSize } from "../formStyles";
import Select from "../Select";

const STATUS_LABELS: Record<ActiveFilter, string> = {
  active: "Active",
  inactive: "Inactive",
  all: "All",
};

// The Status filter, shared by the desktop card and the mobile sheet.
export default function ContractorStatusSelect({
  value,
  onChange,
  size,
  wrapperClassName,
}: {
  value: ActiveFilter;
  onChange: (next: string) => void;
  size: ControlSize;
  wrapperClassName?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${LABEL[size]}`}>
      Status
      <Select
        fieldSize={size}
        wrapperClassName={wrapperClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {ACTIVE_FILTERS.map((item) => (
          <option key={item} value={item}>
            {STATUS_LABELS[item]}
          </option>
        ))}
      </Select>
    </label>
  );
}
