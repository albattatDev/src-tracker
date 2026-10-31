// VITE_API_URL is injected by docker-compose from the root .env (see docker-compose.yml).
// The fallback only applies when running `npm run dev` directly on the host, outside Docker.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface HealthResponse {
  status: string;
  database: string;
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
}
