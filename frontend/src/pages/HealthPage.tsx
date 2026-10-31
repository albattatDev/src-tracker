import { useEffect, useState } from "react";
import { getHealth } from "../api/client";

type ConnectionState = "loading" | "connected" | "not connected";

export default function HealthPage() {
  const [state, setState] = useState<ConnectionState>("loading");

  useEffect(() => {
    let cancelled = false;

    getHealth()
      .then((data) => {
        if (!cancelled) {
          setState(data.database === "connected" ? "connected" : "not connected");
        }
      })
      .catch(() => {
        if (!cancelled) setState("not connected");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const dotColor =
    state === "connected"
      ? "bg-green-500"
      : state === "not connected"
        ? "bg-red-500"
        : "bg-gray-400";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-lg border border-gray-200 bg-white px-8 py-6 shadow-sm">
        <h1 className="mb-4 text-lg font-semibold text-gray-900">
          SRC-T API status
        </h1>
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${dotColor}`} />
          <span className="text-gray-700">{state}</span>
        </div>
      </div>
    </div>
  );
}
