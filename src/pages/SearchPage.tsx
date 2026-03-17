import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, Package, Barcode, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { ProductResults } from "@/components/ProductResults";
import { getLocalUserPreferences } from "@/lib/local-fallback";
import { searchProducts, looksLikeBarcode } from "@/lib/api";
import type { OpenFoodFactsProduct } from "@/types/openfoodfacts";

// Debounce delay for search suggestions
const DEBOUNCE_MS = 300;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenFoodFactsProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const userPreferences = getLocalUserPreferences();

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  const searchAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      searchAbortController.current?.abort();
    };
  }, []);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      toast.error("Please enter a search term.");
      return;
    }

    // Cancel any pending search
    searchAbortController.current?.abort();
    searchAbortController.current = new AbortController();

    setIsSearching(true);
    setHasSearched(true);
    setSearchError(null);

    const result = await searchProducts(trimmed, 24);

    if (!isMounted.current) return;

    setIsSearching(false);

    if (result.success && result.data) {
      setResults(result.data.products);
      setTotalCount(result.data.count);

      if (result.data.products.length === 0) {
        toast.info("No products found. Try different keywords.");
      } else if (looksLikeBarcode(trimmed) && result.data.count === 1) {
        // Auto-select if exact barcode match
        setSelectedProduct(result.data.products[0]);
        toast.success("Product found!");
      }
    } else {
      setResults([]);
      setTotalCount(0);
      setSearchError(result.error || "Search failed");
      toast.error(result.error || "Search failed. Please try again.");
    }
  }, [query]);

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setSearchError(null);
    setTotalCount(0);
  }, []);

  const handleRetry = useCallback(() => {
    setSearchError(null);
    handleSearch();
  }, [handleSearch]);

  const getScoreColor = (score?: string) => {
    if (typeof score !== "string") return "bg-muted";
    const s = score.toLowerCase();
    if (s === "a") return "bg-green-500";
    if (s === "b") return "bg-lime-500";
    if (s === "c") return "bg-yellow-500";
    if (s === "d") return "bg-orange-500";
    return "bg-red-500";
  };

  if (selectedProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
        <ProductResults
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
          alternatives={[]}
          userPreferences={userPreferences}
        />
        <BottomNav active="search" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Search Products</h1>
            <p className="text-muted-foreground">Find any product by name or brand</p>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              {looksLikeBarcode(query) ? (
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              )}
              <Input
                type="text"
                placeholder="Search by product name, brand, or barcode..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 pr-10 bg-white/10 backdrop-blur-md border-white/20"
                autoFocus
              />
              {query && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {/* Search hint */}
          {!hasSearched && (
            <p className="text-sm text-muted-foreground text-center mb-6">
              Tip: Enter a barcode number to find an exact product match
            </p>
          )}

          {/* Result count */}
          {hasSearched && results.length > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              Showing {results.length} of {totalCount.toLocaleString()} results
            </p>
          )}

          {/* Results */}
          {isSearching && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Searching products...</p>
            </div>
          )}

          {!isSearching && hasSearched && results.length === 0 && !searchError && (
            <Card className="p-12 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">Try different keywords or check spelling</p>
              <div className="text-sm text-muted-foreground">
                <p>Suggestions:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Use generic product names (e.g., "chocolate" instead of brand names)</li>
                  <li>• Try searching by barcode number for exact matches</li>
                  <li>• Check for typos in your search term</li>
                </ul>
              </div>
            </Card>
          )}

          {!isSearching && searchError && (
            <Card className="p-12 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <div className="text-red-400 mb-4">
                <Package className="h-16 w-16 mx-auto opacity-50" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Search Failed</h3>
              <p className="text-muted-foreground mb-4">{searchError}</p>
              <Button onClick={handleRetry} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </Card>
          )}

          {!isSearching && results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((product) => (
                <motion.div
                  key={product.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="p-4 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-colors cursor-pointer h-full"
                    onClick={() => setSelectedProduct(product)}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-40 object-contain rounded-lg bg-white/5 mb-3"
                      />
                    ) : (
                      <div className="w-full h-40 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                        <Package className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    <h3 className="font-semibold mb-1 line-clamp-2">{product.product_name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{product.brands || "Unknown brand"}</p>
                    <div className="flex gap-2">
                      {product.nutriscore_grade && (
                        <div className={`w-8 h-8 rounded ${getScoreColor(product.nutriscore_grade)} flex items-center justify-center text-white text-sm font-bold`}>
                          {product.nutriscore_grade.toUpperCase()}
                        </div>
                      )}
                      {product.ecoscore_grade && product.ecoscore_grade !== "unknown" && product.ecoscore_grade !== "not-applicable" && (
                        <div className={`w-8 h-8 rounded ${getScoreColor(product.ecoscore_grade)} flex items-center justify-center text-white text-sm font-bold`}>
                          {product.ecoscore_grade.toUpperCase()}
                        </div>
                      )}
                      {product.nova_group && (
                        <Badge variant="secondary" className="text-xs">
                          NOVA {product.nova_group}
                        </Badge>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
      <BottomNav active="search" />
    </div>
  );
}
