import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useButtonSize } from "../../hooks/useButtonSize";
import { SR_BASE } from "../../routes";
import { buttonClass } from "../buttonStyles";

// The operations action: opens the New request form over the request list.
export default function NewRequestLink() {
  const size = useButtonSize();
  return (
    <Link to={`${SR_BASE}/new`} className={buttonClass("primary", size)}>
      <Plus size={18} strokeWidth={2} aria-hidden="true" />
      New request
    </Link>
  );
}
