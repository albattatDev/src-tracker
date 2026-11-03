import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import type { SRRead } from "../api/serviceRequests";
import { useAuth } from "../hooks/useAuth";
import { useCreateInvoice, useInvoices } from "../hooks/useInvoices";
import { riyadhToday } from "../utils/dates";
import { availableActions } from "../utils/serviceRequestActions";
import InvoiceTable from "./InvoiceTable";

const CONTROL = "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900";

function AddInvoiceForm({ sr }: { sr: SRRead }) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [submissionDate, setSubmissionDate] = useState(riyadhToday);
  const [dueDate, setDueDate] = useState("");
  const create = useCreateInvoice();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Add invoice
      </button>
    );
  }

  const fieldErrors = create.error instanceof ApiError ? create.error.fieldErrors : {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

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
      {
        onSuccess: () => {
          setNumber("");
          setAmount("");
          setDueDate("");
          setOpen(false);
        },
      }
    );
  }

  const error = (field: string) =>
    fieldErrors[field] && <span className="font-normal text-red-700">{fieldErrors[field]}</span>;

  return (
    <form onSubmit={submit} className="flex flex-wrap items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Invoice number
        <input required maxLength={50} value={number} onChange={(e) => setNumber(e.target.value)} className={CONTROL} />
        {error("invoice_number")}
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Amount (SAR)
        <input
          required
          inputMode="decimal"
          pattern="\d{1,10}(\.\d{1,2})?"
          title="A positive amount with at most 2 decimals"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={CONTROL}
        />
        {error("amount")}
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Submission date
        <input required type="date" value={submissionDate} onChange={(e) => setSubmissionDate(e.target.value)} className={CONTROL} />
        {error("submission_date")}
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Due date (optional)
        <input type="date" min={submissionDate} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={CONTROL} />
        {error("due_date") ?? error("body")}
      </label>
      <div className="flex gap-2 self-end">
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            create.reset();
            setOpen(false);
          }}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
      {create.error && !hasFieldErrors && (
        <p role="alert" className="basis-full rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {create.error.message}
        </p>
      )}
    </form>
  );
}

// Operations cannot call /invoices (403), so the section is not rendered for them at all.
export default function ServiceRequestInvoices({ sr }: { sr: SRRead }) {
  const { user } = useAuth();
  const canView = user?.role === "engineer" || user?.role === "manager" || user?.role === "admin";
  const { canAddInvoice } = availableActions(user?.role, sr.status);
  const query = useInvoices({ service_request_id: sr.id, sort: "created_at", order: "desc", page_size: 100 }, canView);

  if (!canView) return null;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Invoices</h2>
      </div>
      {canAddInvoice && (
        <div className="mb-3">
          <AddInvoiceForm sr={sr} />
        </div>
      )}
      {query.isPending ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-red-700">{query.error.message}</p>
      ) : query.data.items.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">No invoices yet.</p>
      ) : (
        <InvoiceTable items={query.data.items} showRequest={false} />
      )}
    </section>
  );
}
