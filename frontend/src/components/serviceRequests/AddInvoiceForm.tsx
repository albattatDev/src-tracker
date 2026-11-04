import { useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import type { SRRead } from "../../api/serviceRequests";
import { useCreateInvoice } from "../../hooks/useInvoices";
import { riyadhToday } from "../../utils/dates";
import { buttonClass } from "../buttonStyles";
import { CONTROL, LABEL, type ControlSize } from "../formStyles";

// The form from the old detail page, now shown in a Modal (desktop) or a BottomSheet (mobile).
// The caller decides where it lives; `size` only picks the control and button size.
export default function AddInvoiceForm({
  sr,
  size,
  onDone,
  onCancel,
}: {
  sr: SRRead;
  size: ControlSize;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [submissionDate, setSubmissionDate] = useState(riyadhToday);
  const [dueDate, setDueDate] = useState("");
  const create = useCreateInvoice();
  const buttonSize = size === "touch" ? "touch" : "md";

  const fieldErrors = create.error instanceof ApiError ? create.error.fieldErrors : {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const error = (field: string) =>
    fieldErrors[field] && <span className="font-normal text-red-700">{fieldErrors[field]}</span>;

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      {
        service_request_id: sr.id,
        invoice_number: number,
        amount: amount.trim(),
        submission_date: submissionDate,
        due_date: dueDate || null,
      },
      { onSuccess: onDone }
    );
  }

  const label = `flex flex-col gap-1.5 ${LABEL[size]}`;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className={label}>
        Invoice number
        <input
          required
          maxLength={50}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className={CONTROL[size]}
        />
        {error("invoice_number")}
      </label>
      <label className={label}>
        Amount (SAR)
        <input
          required
          inputMode="decimal"
          pattern="\d{1,10}(\.\d{1,2})?"
          title="A positive amount with at most 2 decimals"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={CONTROL[size]}
        />
        {error("amount")}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Submission date
          <input
            required
            type="date"
            value={submissionDate}
            onChange={(e) => setSubmissionDate(e.target.value)}
            className={`pr-3 min-w-0 ${CONTROL[size]}`}
          />
          {error("submission_date")}
        </label>
        <label className={label}>
          Due date (optional)
          <input
            type="date"
            min={submissionDate}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`pr-3 min-w-0 ${CONTROL[size]}`}
          />
          {error("due_date") ?? error("body")}
        </label>
      </div>
      {create.error && !hasFieldErrors && (
        <p role="alert" className="rounded-field border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {create.error.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={buttonClass("secondary", buttonSize)}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={create.isPending}
          className={buttonClass("primary", buttonSize)}
        >
          Save
        </button>
      </div>
    </form>
  );
}
