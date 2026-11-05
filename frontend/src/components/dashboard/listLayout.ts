// How a dashboard list draws its rows: a table (tablet and desktop) or cards (mobile).
// TopList decides it once and hands it to whatever renders the rows.
export type ListLayout = "table" | "cards";
