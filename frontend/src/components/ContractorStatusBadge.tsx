// A contractor is active or inactive (deactivated instead of deleted). Word and colour both
// carry it.
export default function ContractorStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
