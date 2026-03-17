import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, Search, Loader2, Package, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { lookupProduct, searchProducts, looksLikeBarcode } from "@/lib/api";
import type { OpenFoodFactsProduct } from "@/types/openfoodfacts";

interface CompareSlot {
  product: OpenFoodFactsProduct | null;
  loading: boolean;
  query: string;
}

const NUTRIENT_COMPARE = [
  { key: "energy-kcal_100g" as const, label: "Calories", unit: "kcal", lowerBetter: true },
  { key: "proteins_100g" as const, label: "Protein", unit: "g", lowerBetter: false },
  { key: "carbohydrates_100g" as const, label: "Carbs", unit: "g", lowerBetter: true },
  { key: "sugars_100g" as const, label: "Sugars", unit: "g", lowerBetter: true },
  { key: "fat_100g" as const, label: "Fat", unit: "g", lowerBetter: true },
  { key: "saturated-fat_100g" as const, label: "Saturated Fat", unit: "g", lowerBetter: true },
  { key: "fiber_100g" as const, label: "Fiber", unit: "g", lowerBetter: false },
  { key: "salt_100g" as const, label: "Salt", unit: "g", lowerBetter: true },
] as const;

const scoreValue = (grade?: string) => {
  if (!grade) return 0;
  const g = grade.toUpperCase();
  return g === "A" ? 5 : g === "B" ? 4 : g === "C" ? 3 : g === "D" ? 2 : g === "E" ? 1 : 0;
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

export default function ComparePage() {
  const [slots, setSlots] = useState<[CompareSlot, CompareSlot]>([
    { product: null, loading: false, query: "" },
    { product: null, loading: false, query: "" },
  ]);

  const searchProduct = useCallback(async (index: 0 | 1) => {
    const q = slots[index].query.trim();
    if (!q) {
      toast.error("Please enter a product name or barcode.");
      return;
    }

    const next = [...slots] as [CompareSlot, CompareSlot];
    next[index] = { ...next[index], loading: true };
    setSlots(next);

    try {
      // Check if it looks like a barcode
      if (looksLikeBarcode(q)) {
        const result = await lookupProduct(q);
        if (result.success && result.data) {
          const updated = [...slots] as [CompareSlot, CompareSlot];
          updated[index] = { product: result.data, loading: false, query: q };
          setSlots(updated);
          return;
        }
        // If barcode lookup fails, show specific error
        if (result.errorType === "not_found") {
          toast.error("Product not found. Try searching by name instead.");
        }
      }

      // Search by name
      const searchResult = await searchProducts(q, 5);
      if (searchResult.success && searchResult.data && searchResult.data.products.length > 0) {
        // Pick the best match (first result with a name)
        const bestMatch = searchResult.data.products.find(p => p.product_name);
        if (bestMatch) {
          const updated = [...slots] as [CompareSlot, CompareSlot];
          updated[index] = { product: bestMatch, loading: false, query: q };
          setSlots(updated);
          return;
        }
      }

      toast.error("Product not found. Try different keywords.");
      const updated = [...slots] as [CompareSlot, CompareSlot];
      updated[index] = { ...updated[index], loading: false };
      setSlots(updated);
    } catch {
      toast.error("Search failed. Please try again.");
      const updated = [...slots] as [CompareSlot, CompareSlot];
      updated[index] = { ...updated[index], loading: false };
      setSlots(updated);
    }
  }, [slots]);

  const clearSlot = (index: 0 | 1) => {
    const next = [...slots] as [CompareSlot, CompareSlot];
    next[index] = { product: null, loading: false, query: "" };
    setSlots(next);
  };

  const updateQuery = (index: 0 | 1, value: string) => {
    const next = [...slots] as [CompareSlot, CompareSlot];
    next[index] = { ...next[index], query: value };
    setSlots(next);
  };

  const p1 = slots[0].product;
  const p2 = slots[1].product;
  const bothLoaded = p1 && p2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="mb-2">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Compare Products</h1>
            <p className="text-muted-foreground">Compare two products side by side</p>
          </div>

          {/* Search Slots */}
          <div className="grid md:grid-cols-2 gap-4">
            {([0, 1] as const).map((idx) => (
              <Card key={idx} className="p-4 bg-white/10 backdrop-blur-md border-white/20">
                <p className="text-sm font-medium mb-2 text-muted-foreground">Product {idx + 1}</p>
                {slots[idx].product ? (
                  <div className="text-center">
                    {slots[idx].product!.image_url ? (
                      <img src={slots[idx].product!.image_url} alt={slots[idx].product!.product_name} className="w-full h-32 object-contain rounded-lg bg-white/5 mb-3" />
                    ) : (
                      <div className="w-full h-32 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <h3 className="font-semibold mb-1 line-clamp-2">{slots[idx].product!.product_name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{slots[idx].product!.brands || "Unknown brand"}</p>
                    <div className="flex gap-2 justify-center mb-3">
                      {slots[idx].product!.nutriscore_grade && (
                        <div className={`w-8 h-8 rounded ${getScoreColor(slots[idx].product!.nutriscore_grade)} flex items-center justify-center text-white text-sm font-bold`}>
                          {slots[idx].product!.nutriscore_grade!.toUpperCase()}
                        </div>
                      )}
                      {slots[idx].product!.ecoscore_grade && slots[idx].product!.ecoscore_grade !== "unknown" && (
                        <div className={`w-8 h-8 rounded ${getScoreColor(slots[idx].product!.ecoscore_grade)} flex items-center justify-center text-white text-sm font-bold`}>
                          {slots[idx].product!.ecoscore_grade!.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => clearSlot(idx)} className="text-muted-foreground">
                      <X className="mr-1 h-3 w-3" /> Change
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Name or barcode..."
                      value={slots[idx].query}
                      onChange={(e) => updateQuery(idx, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchProduct(idx)}
                      className="bg-white/5 border-white/20"
                    />
                    <Button onClick={() => searchProduct(idx)} disabled={slots[idx].loading} size="icon" className="shrink-0">
                      {slots[idx].loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Comparison Results */}
          {bothLoaded && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Score Comparison */}
              <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">Score Comparison</h3>
                </div>
                <div className="space-y-4">
                  {/* Nutri-Score */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded ${getScoreColor(p1.nutriscore_grade)} flex items-center justify-center text-white font-bold`}>
                        {p1.nutriscore_grade?.toUpperCase() || "?"}
                      </div>
                      {scoreValue(p1.nutriscore_grade) > scoreValue(p2.nutriscore_grade) && <Check className="h-5 w-5 text-green-500" />}
                    </div>
                    <span className="text-sm font-medium">Nutri-Score</span>
                    <div className="flex items-center gap-2">
                      {scoreValue(p2.nutriscore_grade) > scoreValue(p1.nutriscore_grade) && <Check className="h-5 w-5 text-green-500" />}
                      <div className={`w-10 h-10 rounded ${getScoreColor(p2.nutriscore_grade)} flex items-center justify-center text-white font-bold`}>
                        {p2.nutriscore_grade?.toUpperCase() || "?"}
                      </div>
                    </div>
                  </div>
                  {/* Eco-Score */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded ${getScoreColor(p1.ecoscore_grade)} flex items-center justify-center text-white font-bold`}>
                        {p1.ecoscore_grade?.toUpperCase() || "?"}
                      </div>
                      {scoreValue(p1.ecoscore_grade) > scoreValue(p2.ecoscore_grade) && <Check className="h-5 w-5 text-green-500" />}
                    </div>
                    <span className="text-sm font-medium">Eco-Score</span>
                    <div className="flex items-center gap-2">
                      {scoreValue(p2.ecoscore_grade) > scoreValue(p1.ecoscore_grade) && <Check className="h-5 w-5 text-green-500" />}
                      <div className={`w-10 h-10 rounded ${getScoreColor(p2.ecoscore_grade)} flex items-center justify-center text-white font-bold`}>
                        {p2.ecoscore_grade?.toUpperCase() || "?"}
                      </div>
                    </div>
                  </div>
                  {/* NOVA */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={p1.nova_group && p1.nova_group > 2 ? "destructive" : "secondary"}>
                        NOVA {p1.nova_group ?? "?"}
                      </Badge>
                      {p1.nova_group && p2.nova_group && p1.nova_group < p2.nova_group && <Check className="h-5 w-5 text-green-500" />}
                    </div>
                    <span className="text-sm font-medium">Processing</span>
                    <div className="flex items-center gap-2">
                      {p1.nova_group && p2.nova_group && p2.nova_group < p1.nova_group && <Check className="h-5 w-5 text-green-500" />}
                      <Badge variant={p2.nova_group && p2.nova_group > 2 ? "destructive" : "secondary"}>
                        NOVA {p2.nova_group ?? "?"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Nutrient Comparison */}
              <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
                <h3 className="text-lg font-bold mb-4">Nutrition Comparison (per 100g)</h3>
                {(() => {
                  const nutrientRows = NUTRIENT_COMPARE.map(({ key, label, unit, lowerBetter }) => {
                    const v1 = p1.nutriments?.[key];
                    const v2 = p2.nutriments?.[key];
                    if (typeof v1 !== "number" && typeof v2 !== "number") return null;
                    const val1 = typeof v1 === "number" ? v1 : null;
                    const val2 = typeof v2 === "number" ? v2 : null;
                    const max = Math.max(val1 ?? 0, val2 ?? 0) || 1;
                    const winner = val1 !== null && val2 !== null
                      ? (lowerBetter ? (val1 < val2 ? 1 : val1 > val2 ? 2 : 0) : (val1 > val2 ? 1 : val1 < val2 ? 2 : 0))
                      : 0;

                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={winner === 1 ? "font-bold text-green-400" : ""}>{val1 !== null ? `${val1.toFixed(1)}${unit}` : "N/A"}</span>
                          <span className="font-medium text-muted-foreground">{label}</span>
                          <span className={winner === 2 ? "font-bold text-green-400" : ""}>{val2 !== null ? `${val2.toFixed(1)}${unit}` : "N/A"}</span>
                        </div>
                        <div className="flex gap-1">
                          <div className="flex-1">
                            <Progress value={val1 !== null ? (val1 / max) * 100 : 0} className="h-2" />
                          </div>
                          <div className="flex-1">
                            <Progress value={val2 !== null ? (val2 / max) * 100 : 0} className="h-2" />
                          </div>
                        </div>
                      </div>
                    );
                  }).filter(Boolean);

                  if (nutrientRows.length === 0) {
                    return (
                      <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
                        <AlertCircle className="h-5 w-5" />
                        <p>No nutrition data available for these products</p>
                      </div>
                    );
                  }

                  return <div className="space-y-3">{nutrientRows}</div>;
                })()}
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>
      <BottomNav active="compare" />
    </div>
  );
}
