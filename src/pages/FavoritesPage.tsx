import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { ProductResults } from "@/components/ProductResults";
import { getFavorites, removeFavorite, type FavoriteProduct } from "@/lib/favorites";
import { getLocalUserPreferences } from "@/lib/local-fallback";
import { lookupProduct } from "@/lib/api";
import { toast } from "sonner";
import type { OpenFoodFactsProduct } from "@/types/openfoodfacts";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>(getFavorites);
  const [selectedProduct, setSelectedProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const userPreferences = getLocalUserPreferences();

  const handleRemove = (code: string) => {
    removeFavorite(code);
    setFavorites(getFavorites());
    toast.success("Removed from favorites.");
  };

  const handleViewProduct = async (fav: FavoriteProduct) => {
    setLoadingCode(fav.code);
    const result = await lookupProduct(fav.code);

    if (result.success && result.data) {
      setSelectedProduct(result.data);
    } else {
      toast.error(result.error || "Failed to load product details.");
    }
    setLoadingCode(null);
  };

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
          onBack={() => {
            setSelectedProduct(null);
            setFavorites(getFavorites());
          }}
          alternatives={[]}
          userPreferences={userPreferences}
        />
        <BottomNav active="favorites" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Favorites</h1>
            <p className="text-muted-foreground">Your bookmarked products</p>
          </div>

          {favorites.length === 0 ? (
            <Card className="p-12 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground">Scan or search products and tap the bookmark icon to save them here</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((fav) => (
                <motion.div
                  key={fav.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-colors h-full">
                    <div
                      className="cursor-pointer"
                      onClick={() => handleViewProduct(fav)}
                    >
                      {fav.image_url ? (
                        <img
                          src={fav.image_url}
                          alt={fav.product_name}
                          className="w-full h-40 object-contain rounded-lg bg-white/5 mb-3"
                        />
                      ) : (
                        <div className="w-full h-40 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                          <Package className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                      <h3 className="font-semibold mb-1 line-clamp-2">
                        {loadingCode === fav.code ? "Loading..." : (fav.product_name || "Unknown Product")}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">{fav.brands || "Unknown brand"}</p>
                      <div className="flex gap-2 mb-3">
                        {fav.nutriscore_grade && (
                          <div className={`w-8 h-8 rounded ${getScoreColor(fav.nutriscore_grade)} flex items-center justify-center text-white text-sm font-bold`}>
                            {fav.nutriscore_grade.toUpperCase()}
                          </div>
                        )}
                        {fav.ecoscore_grade && fav.ecoscore_grade !== "unknown" && (
                          <div className={`w-8 h-8 rounded ${getScoreColor(fav.ecoscore_grade)} flex items-center justify-center text-white text-sm font-bold`}>
                            {fav.ecoscore_grade.toUpperCase()}
                          </div>
                        )}
                        {fav.nova_group && (
                          <Badge variant="secondary" className="text-xs">NOVA {fav.nova_group}</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full hover:bg-red-500/10 hover:text-red-500"
                      onClick={() => handleRemove(fav.code)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
      <BottomNav active="favorites" />
    </div>
  );
}
