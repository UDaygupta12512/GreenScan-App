import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import {
  clearLocalAuthEnabled,
  getLocalAuthEnabled,
  setLocalAuthEnabled,
} from "@/lib/local-fallback";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const authActions = useAuthActions();
  const [hasLocalAuthFallback, setHasLocalAuthFallback] = useState(
    getLocalAuthEnabled(),
  );

  useEffect(() => {
    if (isAuthenticated && hasLocalAuthFallback) {
      clearLocalAuthEnabled();
      setHasLocalAuthFallback(false);
    }
  }, [isAuthenticated, hasLocalAuthFallback]);

  const signIn: typeof authActions.signIn = useCallback(
    async (provider, params) => {
      try {
        return await authActions.signIn(provider, params);
      } catch (error) {
        if (provider === "anonymous") {
          // Keep the app usable in local mode if backend auth is unavailable.
          setLocalAuthEnabled(true);
          setHasLocalAuthFallback(true);
          return { signingIn: true };
        }
        throw error;
      }
    },
    [authActions],
  );

  const signOut: typeof authActions.signOut = useCallback(async () => {
    try {
      await authActions.signOut();
    } finally {
      clearLocalAuthEnabled();
      setHasLocalAuthFallback(false);
    }
  }, [authActions]);

  const resolvedIsAuthenticated = isAuthenticated || hasLocalAuthFallback;

  // Keep auth state resilient even if optional user profile queries fail server-side.
  const isLoading = isAuthLoading && !hasLocalAuthFallback;

  return {
    isLoading,
    isAuthenticated: resolvedIsAuthenticated,
    user: null,
    signIn,
    signOut,
  };
}
