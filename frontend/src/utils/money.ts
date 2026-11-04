// Amounts arrive as decimal strings ("1250.50", DECIMAL(12,2) in the database). They are only
// grouped as text and never turned into a number, so no float rounding can touch money.
// A fraction with fewer than 2 digits is padded; a longer one is kept as it is, never cut.
export function formatAmountNumber(amount: string): string {
  const [whole, fraction = ""] = amount.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${fraction.padEnd(2, "0")}`;
}

// Plain text for messages and dialogs: "42,000.00 SAR".
export function formatAmount(amount: string): string {
  return `${formatAmountNumber(amount)} SAR`;
}
