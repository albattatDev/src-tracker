import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useButtonSize } from "../../hooks/useButtonSize";
import { buttonClass } from "../buttonStyles";
import UserFormDialog from "../UserFormDialog";

// The admin's action: opens the same create-user form as the Users page. Saving a user
// invalidates the dashboard and users queries (useUserMutation), so the counts update.
export default function AddUserButton() {
  const [open, setOpen] = useState(false);
  const size = useButtonSize();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${buttonClass("primary", size)} ${size === "touch" ? "w-full" : ""}`}
      >
        <UserPlus size={18} strokeWidth={2} aria-hidden="true" />
        Add user
      </button>
      {open && <UserFormDialog onClose={() => setOpen(false)} />}
    </>
  );
}
