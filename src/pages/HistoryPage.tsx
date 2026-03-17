import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useConvex, useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  deleteLocalScannedProduct,
  getLocalScanHistory,
  getLocalUserPreferences,
  type LocalScannedProduct,
} from "@/lib/local-fallback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trash2, Package, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { ProductResults } from "@/components/ProductResults";
import { BottomNav } from "@/components/BottomNav";
import type { OpenFoodFactsProduct } from "@/types/openfoodfacts";

interface HistoryItem {
  _id: string;
  _creationTime: number;
  barcode: string;
  productName: string;
  imageUrl?: string;
  ecoScore?: string;
  nutriScore?: string;
  novaGroup?: number;
  allergens?: string[];
  rawData?: OpenFoodFactsProduct;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const convex = useConvex();
  const { isAuthenticated: convexAuthenticated } = useConvexAuth();
  const [localHistory, setLocalHistory] = useState<LocalScannedProduct[]>(
    getLocalScanHistory,
  );
  const scanHistoryResult = useQuery(
    api.products.getUserScanHistory,
    convexAuthenticated ? {} : "skip",
  );
  const scanHistory = scanHistoryResult ?? [];

  const deleteProduct = useMutation(api.products.deleteScannedProduct);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OpenFoodFactsProduct | null>(null);
  const isUsingLocalHistory = !convexAuthenticated;
  const effectiveHistory: HistoryItem[] = isUsingLocalHistory
    ? localHistory
    : (scanHistory as HistoryItem[]);

  const handleDelete = async (productId: string) => {
    if (isUsingLocalHistory || productId.startsWith("local-")) {
      const removed = deleteLocalScannedProduct(productId);
      setLocalHistory(getLocalScanHistory());
      if (removed) {
        toast.success("Product removed from local history");
      } else {
        toast.error("Failed to delete product");
      }
      return;
    }

    try {
      await deleteProduct({
        productId: productId as Parameters<typeof deleteProduct>[0]["productId"],
      });
      toast.success("Product removed from history");
    } catch (error) {
      console.error("Cloud delete failed, trying local delete:", error);
      const removed = deleteLocalScannedProduct(productId);
      setLocalHistory(getLocalScanHistory());
      if (removed) {
        toast.success("Product removed from local history");
      } else {
        toast.error("Failed to delete product");
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Trigger haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    if (isUsingLocalHistory) {
      setLocalHistory(getLocalScanHistory());
      toast.success("Local history refreshed");
      setIsRefreshing(false);
      return;
    }

    try {
      await convex.query(api.products.getUserScanHistory, {});
      toast.success("History refreshed");
    } catch (error) {
      console.error("History refresh failed:", error);
      setLocalHistory(getLocalScanHistory());
      toast.warning("Cloud refresh unavailable. Showing local history.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleProductClick = (product: HistoryItem) => {
    // Convert stored product data to the format expected by ProductResults
    const productData: OpenFoodFactsProduct =
      (product.rawData as OpenFoodFactsProduct | undefined) || {
      product_name: product.productName,
      image_url: product.imageUrl,
      ecoscore_grade: product.ecoScore,
      nutriscore_grade: product.nutriScore,
      nova_group: product.novaGroup,
      allergens_tags: product.allergens,
      code: product.barcode,
    };
    setSelectedProduct(productData);
  };

  const filteredHistory = (() => {
    if (!searchQuery.trim()) return effectiveHistory;

    const query = searchQuery.toLowerCase();
    return effectiveHistory.filter((product) =>
      product.productName.toLowerCase().includes(query) ||
      product.barcode.includes(query),
    );
  })();

  const getScoreColor = (score?: string) => {
    if (!score) return "bg-muted";
    const s = score.toLowerCase();
    if (s === "a") return "bg-green-500";
    if (s === "b") return "bg-lime-500";
    if (s === "c") return "bg-yellow-500";
    if (s === "d") return "bg-orange-500";
    return "bg-red-500";
  };

  // If a product is selected, show the ProductResults view
  if (selectedProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
        <ProductResults
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
          alternatives={[]}
          userPreferences={getLocalUserPreferences()}
        />
        <BottomNav active="history" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            onClick={() => navigate("/home")}
            variant="ghost"
            className="bg-white/10 hover:bg-white/20"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Scan History</h1>
            <p className="text-muted-foreground">
              View all your previously scanned products
            </p>
          </div>

          {/* Search Bar */}
          {effectiveHistory.length > 0 && (
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by product name or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 backdrop-blur-md border-white/20"
                />
              </div>
            </div>
          )}

          {effectiveHistory.length === 0 ? (
            <Card className="p-12 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No scans yet</h3>
              <p className="text-muted-foreground mb-6">
                Start scanning products to build your history
              </p>
              <Button onClick={() => navigate("/home")}>
                Start Scanning
              </Button>
            </Card>
          ) : filteredHistory.length === 0 ? (
            <Card className="p-12 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try a different search term
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((product) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card 
                    className="p-4 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="flex gap-4">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.productName}
                          className="w-24 h-24 object-contain rounded-lg bg-white/5"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-white/5 flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 truncate">
                          {product.productName}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Scanned {new Date(product._creationTime).toLocaleDateString()}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {product.nutriScore && (
                            <Badge className={`${getScoreColor(product.nutriScore)} text-white`}>
                              Nutri-Score: {product.nutriScore.toUpperCase()}
                            </Badge>
                          )}
                          {product.ecoScore && (
                            <Badge className={`${getScoreColor(product.ecoScore)} text-white`}>
                              Eco-Score: {product.ecoScore.toUpperCase()}
                            </Badge>
                          )}
                          {product.novaGroup && (
                            <Badge variant="secondary">
                              NOVA {product.novaGroup}
                            </Badge>
                          )}
                        </div>

                        {product.allergens && product.allergens.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-red-500 font-semibold">
                              Allergens: {product.allergens.map(a => a.replace(/^[a-z]{2}:/i, "").replace(/-/g, " ")).join(", ")}
                            </p>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(String(product._id));
                        }}
                        className="hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      <BottomNav active="history" />
    </div>
  );
}