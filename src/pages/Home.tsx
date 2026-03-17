import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { DynamicGreeting } from "@/components/DynamicGreeting";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ProductResults } from "@/components/ProductResults";
import { OnboardingModal } from "@/components/OnboardingModal";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getLocalScanHistory,
  getLocalUserPreferences,
  saveLocalScannedProduct,
  type LocalUserPreferences,
} from "@/lib/local-fallback";
import { lookupProduct, fetchCategoryAlternatives, isValidBarcode, normalizeBarcode } from "@/lib/api";
import { Scan, Loader2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import type { OpenFoodFactsProduct } from "@/types/openfoodfacts";

interface ProductLookupResponse {
  status: number;
  product?: OpenFoodFactsProduct;
}

const normalizeGrade = (grade?: string) =>
  typeof grade === "string" ? grade.trim().toLowerCase() : undefined;

export default function Home() {
  console.log("Home component loaded");
  const navigate = useNavigate();
  const { isAuthenticated: convexAuthenticated } = useConvexAuth();
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [productData, setProductData] = useState<OpenFoodFactsProduct | null>(null);
  const [alternatives, setAlternatives] = useState<OpenFoodFactsProduct[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [authRecoveryFailed, setAuthRecoveryFailed] = useState(false);
  const [localUserPreferences, setLocalUserPreferences] =
    useState<LocalUserPreferences | null>(getLocalUserPreferences);
  const [localScanHistory, setLocalScanHistory] = useState(getLocalScanHistory);

  const userPreferences = useQuery(
    api.userPreferences.getUserPreferences,
    convexAuthenticated ? {} : "skip",
  );
  const saveProduct = useMutation(api.products.saveScannedProduct);
  const scanHistoryResult = useQuery(
    api.products.getUserScanHistory,
    convexAuthenticated ? {} : "skip",
  );
  const scanHistory = scanHistoryResult ?? [];

  const resolvedUserPreferences = userPreferences ?? localUserPreferences;
  const resolvedScanHistory = convexAuthenticated ? scanHistory : localScanHistory;

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("Back online!");
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      toast.error("You are offline. Some features may be limited.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto sign-in anonymously if not authenticated
  useEffect(() => {
    const autoSignIn = async () => {
      if (!authLoading && !isAuthenticated) {
        try {
          await signIn("anonymous");
          setAuthRecoveryFailed(false);
        } catch (error) {
          console.error("Auto sign-in failed:", error);
          setAuthRecoveryFailed(true);
        }
      }
    };
    autoSignIn();
  }, [isAuthenticated, authLoading, signIn]);

  useEffect(() => {
    if (resolvedUserPreferences === null && isAuthenticated && !authLoading) {
      setShowOnboarding(true);
    } else if (resolvedUserPreferences && !resolvedUserPreferences.hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [resolvedUserPreferences, isAuthenticated, authLoading]);

  const fetchProductData = async (barcode: string) => {
    const normalizedBarcode = normalizeBarcode(barcode);
    if (!isValidBarcode(normalizedBarcode)) {
      toast.error("Please provide a valid barcode (8-14 digits).");
      setShowScanner(false);
      return;
    }

    setIsLoadingProduct(true);

    const result = await lookupProduct(normalizedBarcode);

    if (result.success && result.data) {
      const product = result.data;
      setProductData(product);

      saveLocalScannedProduct({
        barcode: normalizedBarcode,
        productName: product.product_name || "Unknown Product",
        imageUrl: product.image_url,
        ecoScore: product.ecoscore_grade,
        nutriScore: product.nutriscore_grade,
        novaGroup: product.nova_group,
        allergens: product.allergens_tags || [],
        rawData: product,
      });
      setLocalScanHistory(getLocalScanHistory());

      try {
        await saveProduct({
          barcode: normalizedBarcode,
          productName: product.product_name || "Unknown Product",
          imageUrl: product.image_url,
          ecoScore: product.ecoscore_grade,
          nutriScore: product.nutriscore_grade,
          novaGroup: product.nova_group,
          allergens: product.allergens_tags || [],
          rawData: product,
        });
      } catch (saveError) {
        console.error("Failed to save product to history:", saveError);
        toast.warning("Product saved locally. Cloud history sync failed.");
      }

      // Fetch alternatives if product has poor scores
      if (
        ["d", "e"].includes(normalizeGrade(product.nutriscore_grade) ?? "") ||
        ["d", "e"].includes(normalizeGrade(product.ecoscore_grade) ?? "")
      ) {
        const categoryTag = product.categories_tags?.[0];
        if (categoryTag) {
          const altResult = await fetchCategoryAlternatives(categoryTag, product.code);
          if (altResult.success && altResult.data) {
            setAlternatives(altResult.data.slice(0, 3));
          } else {
            setAlternatives([]);
          }
        } else {
          setAlternatives([]);
        }
      } else {
        setAlternatives([]);
      }

      toast.success("Product scanned successfully!");
    } else {
      // Handle error from API
      const errorMessage = result.error || "Failed to fetch product data";

      if (result.errorType === "not_found") {
        toast.error("Product not found in OpenFoodFacts database");
      } else if (result.errorType === "network") {
        toast.error("Network error. Please check your connection.");
      } else if (result.errorType === "timeout") {
        toast.error("Request timed out. Please try again.");
      } else {
        toast.error(errorMessage);
      }

      setProductData(null);
    }

    setIsLoadingProduct(false);
    setShowScanner(false);
  };

  const fetchProductDataRef = useRef(fetchProductData);
  fetchProductDataRef.current = fetchProductData;

  const handleBarcodeDetected = useCallback((barcode: string) => {
    if (!navigator.onLine) {
      toast.error("Cannot scan products while offline");
      setShowScanner(false);
      return;
    }
    fetchProductDataRef.current(barcode);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const topPaddingClass =
    isOffline && authRecoveryFailed
      ? "pt-24 pb-6"
      : isOffline || authRecoveryFailed
        ? "pt-16 pb-6"
        : "py-6";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
      {/* Offline Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          You are offline. Some features may be limited.
        </div>
      )}

      {authRecoveryFailed && (
        <div className={`fixed left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-3 ${isOffline ? "top-10" : "top-0"}`}>
          Auto sign-in failed. Scan works, but history sync needs sign-in.
          <Button
            size="sm"
            variant="secondary"
            className="h-7"
            onClick={() => navigate("/auth?redirectAfterAuth=/home")}
          >
            Sign in
          </Button>
        </div>
      )}

      {/* Scrollable Header with GreenScan Logo and Title */}
      <div className={`container mx-auto px-4 flex items-center justify-center ${topPaddingClass}`}>
        <div className="px-5 py-2.5 rounded-2xl bg-white/5 backdrop-blur-md border-2 border-green-500 shadow-lg flex items-center gap-3">
          <img 
            src="https://harmless-tapir-303.convex.cloud/api/storage/b3e409bf-2eab-4b32-a9d6-e24c1a02cacb" 
            alt="GreenScan Logo" 
            className="h-8 w-8 object-contain"
          />
          <h1 className="text-2xl font-bold tracking-tight text-green-600 dark:text-green-400">
            GreenScan
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {!productData ? (
            <motion.div
              key="scanner-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto"
            >
              <DynamicGreeting userName={resolvedUserPreferences?.name} />

              {/* Scan Button */}
              <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 mb-6">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center overflow-hidden">
                    <img 
                      src="https://harmless-tapir-303.convex.cloud/api/storage/b1d8c7c7-8a74-48b1-b107-3b37a23686ee" 
                      alt="Scan" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Ready to Scan</h3>
                    <p className="text-muted-foreground">
                      Tap the button below to start scanning products
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => setShowScanner(true)}
                    disabled={isOffline}
                    className="w-full max-w-xs bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:opacity-50"
                  >
                    {isOffline ? (
                      <>
                        <WifiOff className="mr-2 h-5 w-5" />
                        Offline
                      </>
                    ) : (
                      <>
                        <Scan className="mr-2 h-5 w-5" />
                        Start Scanning
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 text-center">
                  <p className="text-3xl font-bold mb-1">
                    {resolvedScanHistory.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Products Scanned</p>
                </Card>
                <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 text-center">
                  <p className="text-3xl font-bold mb-1">🌱</p>
                  <p className="text-sm text-muted-foreground">Eco-Conscious</p>
                </Card>
              </div>
            </motion.div>
          ) : (
            <ProductResults
              key="results-view"
              product={productData}
              alternatives={alternatives}
              userPreferences={resolvedUserPreferences}
              onBack={() => {
                setProductData(null);
                setAlternatives([]);
              }}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav active="scan" />

      {/* Modals */}
      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner
            key="barcode-scanner"
            onDetected={handleBarcodeDetected}
            onClose={() => setShowScanner(false)}
          />
        )}
        {showOnboarding && (
          <OnboardingModal
            key="onboarding-modal"
            onComplete={() => {
              setShowOnboarding(false);
              setLocalUserPreferences(getLocalUserPreferences());
            }}
            onClose={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {isLoadingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Analyzing product...</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}