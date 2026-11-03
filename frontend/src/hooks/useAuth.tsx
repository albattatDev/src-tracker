import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  clearToken,
  getMe,
  getToken,
  login,
  setToken,
  setUnauthorizedHandler,
  type User,
} from "../api/client";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

// One value that is always in exactly one of these shapes. A user exists only in the
// "authenticated" shape, so "authenticated but no user" cannot happen.
type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "error" }
  | { status: "authenticated"; user: User };

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(
    getToken() ? { status: "loading" } : { status: "anonymous" }
  );
  // Bumped by retry() to re-run the restore effect.
  const [attempt, setAttempt] = useState(0);

  const signOut = useCallback(() => {
    clearToken();
    // Drop cached data so the next person to sign in never sees this user's requests.
    queryClient.clear();
    setState({ status: "anonymous" });
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
  }, [signOut]);

  // Restores the user from the stored token. `cancelled` makes StrictMode's
  // double-run safe: the first run's result is ignored, the second one is used.
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;

    getMe()
      .then((me) => {
        if (cancelled) return;
        setState({ status: "authenticated", user: me });
      })
      .catch((error) => {
        if (cancelled) return;
        // A 401 was already handled by apiFetch (token cleared, signOut called).
        // Anything else (network, 5xx) keeps the token so a restart doesn't log everyone out.
        if (!(error instanceof ApiError && error.status === 401)) {
          setState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const signIn = useCallback(async (email: string, password: string) => {
    const token = await login(email, password);
    setToken(token);
    try {
      setState({ status: "authenticated", user: await getMe() });
    } catch (error) {
      clearToken();
      throw error;
    }
  }, []);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  // The context keeps the same shape as before, so other files need no change.
  const user = state.status === "authenticated" ? state.user : null;

  return (
    <AuthContext.Provider value={{ user, status: state.status, signIn, signOut, retry }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
