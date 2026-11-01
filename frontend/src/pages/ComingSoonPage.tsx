export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-gray-900">{title}</h1>
      <p className="text-gray-600">Coming soon</p>
    </div>
  );
}
