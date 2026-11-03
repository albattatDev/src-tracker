import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import "./index.css";

// One QueryClient for the whole app: it holds the cache of everything fetched with useQuery.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // one automatic retry, then show the error
      refetchOnWindowFocus: false, // do not refetch every time the tab regains focus
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
