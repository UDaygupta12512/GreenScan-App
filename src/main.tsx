import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect, lazy, Suspense, ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";

// Initialize theme from localStorage before React renders to prevent flash
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// Run immediately
initializeTheme();

// Global error handler for Vite chunk loading errors
window.addEventListener("vite:preloadError", () => {
  console.log("Vite preload error detected, reloading...");
  window.location.reload();
});

const isChunkLoadError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Failed to fetch dynamically imported module") ||
    error.message.includes("Importing a module script failed")
  );
};

type LazyComponentImport<TProps extends object = object> = () => Promise<{
  default: ComponentType<TProps>;
}>;

// Helper to retry lazy imports on version mismatch
const lazyRetry = <TProps extends object>(
  componentImport: LazyComponentImport<TProps>,
) => {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error: unknown) {
      console.error("Lazy load error:", error);
      // Check if the error is a chunk load error (version mismatch)
      if (isChunkLoadError(error)) {
        
        const storageKey = "chunk_retry_" + window.location.pathname;
        const lastRetry = sessionStorage.getItem(storageKey);
        const now = Date.now();
        
        // If retried recently (within 10 seconds), stop to prevent loop
        if (lastRetry && (now - Number.parseInt(lastRetry, 10) < 10000)) {
           console.error("Reload loop detected, stopping.");
           throw error;
        }
        
        console.log("Chunk load failed, reloading page to get new version...");
        sessionStorage.setItem(storageKey, now.toString());
        
        // Attempt to unregister service worker to clear stale cache
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for(const registration of registrations) {
                    await registration.unregister();
                }
            } catch (e) {
                console.error("Failed to unregister SW:", e);
            }
        }

        // Clear all caches
        if ('caches' in window) {
            try {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            } catch (e) {
                console.error("Failed to clear caches:", e);
            }
        }
        
        window.location.reload();
        // Return a promise that never resolves to prevent error boundary from showing during reload
        return new Promise(() => {}); 
      }
      throw error;
    }
  });
};

const Landing = lazyRetry(() => import("./pages/Landing.tsx"));
const NotFound = lazyRetry(() => import("./pages/NotFound.tsx"));
const Auth = lazyRetry(() => import("./pages/Auth.tsx"));
const Home = lazyRetry(() => import("./pages/Home.tsx"));
const HistoryPage = lazyRetry(() => import("./pages/HistoryPage.tsx"));
const SettingsPage = lazyRetry(() => import("./pages/SettingsPage.tsx"));
const SearchPage = lazyRetry(() => import("./pages/SearchPage.tsx"));
const FavoritesPage = lazyRetry(() => import("./pages/FavoritesPage.tsx"));
const ComparePage = lazyRetry(() => import("./pages/ComparePage.tsx"));
const DashboardPage = lazyRetry(() => import("./pages/DashboardPage.tsx"));

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Clear retry flags on successful route change
  useEffect(() => {
    const storageKey = "chunk_retry_" + location.pathname;
    sessionStorage.removeItem(storageKey);
  }, [location.pathname]);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/home" element={<Home />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);