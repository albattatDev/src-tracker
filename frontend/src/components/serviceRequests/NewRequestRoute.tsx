import { useNavigate } from "react-router-dom";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useListLinks } from "../../hooks/useListLinks";
import { SR_BASE } from "../../routes";
import NewRequestDialog from "./NewRequestDialog";
import NewRequestSheet from "./NewRequestSheet";

// The element of /service-requests/new: the list stays behind it. Cancel, Escape or the
// backdrop go back to the list with its filters; a created request opens its panel.
export default function NewRequestRoute() {
  const navigate = useNavigate();
  const { detailPath, close: cancel } = useListLinks(SR_BASE);
  const created = (id: number) => navigate(detailPath(id));

  return useBreakpoint() === "mobile" ? (
    <NewRequestSheet onCreated={created} onCancel={cancel} />
  ) : (
    <NewRequestDialog onCreated={created} onCancel={cancel} />
  );
}
