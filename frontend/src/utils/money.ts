// Amounts arrive as decimal strings ("1250.50"). They are only grouped as text and never
// turned into a number, so no float rounding can touch money.
export function formatAmount(amount: string): string {
  const [whole, fraction] = amount.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}
