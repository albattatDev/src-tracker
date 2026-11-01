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

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    getToken() ? "loading" : "anonymous"
  );
  // Bumped by retry() to re-run the restore effect.
  const [attempt, setAttempt] = useState(0);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("anonymous");
  }, []);

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
        setUser(me);
        setStatus("authenticated");
      })
      .catch((error) => {
        if (cancelled) return;
        // A 401 was already handled by apiFetch (token cleared, signOut called).
        // Anything else (network, 5xx) keeps the token so a restart doesn't log everyone out.
        if (!(error instanceof ApiError && error.status === 401)) {
          setStatus("error");
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
      setUser(await getMe());
      setStatus("authenticated");
    } catch (error) {
      clearToken();
      throw error;
    }
  }, []);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((n) => n + 1);
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, signIn, signOut, retry }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
