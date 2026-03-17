import { motion } from "framer-motion";
import { Leaf, Heart, AlertTriangle, ArrowLeft, ExternalLink, Share2, ShieldAlert, Apple, FlaskConical, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { useState } from "react";
import type { OpenFoodFactsProduct } from "@/types/openfoodfacts";
import type { LocalUserPreferences } from "@/lib/local-fallback";

interface ProductResultsProps {
  product: OpenFoodFactsProduct;
  onBack: () => void;
  alternatives?: OpenFoodFactsProduct[];
  userPreferences?: LocalUserPreferences | null;
}

interface HealthFlag {
  type: string;
  value: string;
  severity: "high" | "medium";
}

interface EcoFactor {
  name: string;
  status: "positive" | "negative" | "neutral";
  detail: string;
}

interface DietaryConflict {
  restriction: string;
  reason: string;
}

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const DAILY_VALUES = {
  "energy-kcal_100g": 2000,
  proteins_100g: 50,
  carbohydrates_100g: 260,
  sugars_100g: 50,
  fat_100g: 70,
  "saturated-fat_100g": 20,
  fiber_100g: 25,
  salt_100g: 6,
};

const NUTRIENT_LABELS: Record<string, string> = {
  "energy-kcal_100g": "Calories",
  proteins_100g: "Protein",
  carbohydrates_100g: "Carbs",
  sugars_100g: "Sugars",
  fat_100g: "Fat",
  "saturated-fat_100g": "Saturated Fat",
  fiber_100g: "Fiber",
  salt_100g: "Salt",
};

const NUTRIENT_UNITS: Record<string, string> = {
  "energy-kcal_100g": "kcal",
  proteins_100g: "g",
  carbohydrates_100g: "g",
  sugars_100g: "g",
  fat_100g: "g",
  "saturated-fat_100g": "g",
  fiber_100g: "g",
  salt_100g: "g",
};

const DIETARY_ALLERGEN_MAP: Record<string, { allergens: string[]; tags: string[]; ingredientKeywords: string[] }> = {
  "Nut-Free": {
    allergens: ["en:nuts", "en:peanuts", "en:tree-nuts", "en:almonds", "en:cashews", "en:walnuts", "en:hazelnuts", "en:pistachios", "en:pecans", "en:macadamia"],
    tags: [],
    ingredientKeywords: ["nut", "peanut", "almond", "cashew", "walnut", "hazelnut", "pistachio", "pecan", "macadamia", "praline"],
  },
  "Gluten-Free": {
    allergens: ["en:gluten", "en:wheat", "en:barley", "en:rye", "en:oats", "en:spelt", "en:kamut", "en:triticale"],
    tags: [],
    ingredientKeywords: ["wheat", "gluten", "barley", "rye", "malt", "semolina", "durum", "spelt", "farina", "couscous"],
  },
  "Dairy-Free": {
    allergens: ["en:milk", "en:dairy", "en:lactose", "en:casein", "en:whey", "en:butter", "en:cream", "en:cheese"],
    tags: [],
    ingredientKeywords: ["milk", "dairy", "lactose", "casein", "whey", "butter", "cream", "cheese", "yogurt", "yoghurt", "ghee", "lacto"],
  },
  "Vegan": {
    allergens: ["en:milk", "en:eggs", "en:honey", "en:gelatin", "en:dairy"],
    tags: ["en:non-vegan"],
    ingredientKeywords: ["milk", "egg", "honey", "gelatin", "casein", "whey", "lactose", "carmine", "shellac", "beeswax", "lard", "tallow"],
  },
  "Vegetarian": {
    allergens: [],
    tags: ["en:non-vegetarian"],
    ingredientKeywords: ["meat", "beef", "pork", "chicken", "fish", "gelatin", "lard", "tallow", "rennet", "anchovy"],
  },
  "Egg-Free": {
    allergens: ["en:eggs", "en:egg"],
    tags: [],
    ingredientKeywords: ["egg", "albumin", "globulin", "lysozyme", "mayonnaise", "meringue", "ovalbumin", "ovomucin"],
  },
  "Soy-Free": {
    allergens: ["en:soybeans", "en:soy", "en:soja"],
    tags: [],
    ingredientKeywords: ["soy", "soja", "soybean", "edamame", "tofu", "tempeh", "miso", "lecithin"],
  },
  "Shellfish-Free": {
    allergens: ["en:crustaceans", "en:shellfish", "en:molluscs"],
    tags: [],
    ingredientKeywords: ["shrimp", "crab", "lobster", "prawn", "crayfish", "clam", "mussel", "oyster", "scallop", "squid"],
  },
};

// Normalize text for matching
const normalizeText = (text: string): string => {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
};

// Check if any keyword is found in text
const containsKeyword = (text: string, keywords: string[]): string | null => {
  const normalized = normalizeText(text);
  for (const keyword of keywords) {
    if (normalized.includes(normalizeText(keyword))) {
      return keyword;
    }
  }
  return null;
};

export function ProductResults({ product, onBack, alternatives, userPreferences }: ProductResultsProps) {
  const [isFav, setIsFav] = useState(() => isFavorite(product.code || ""));

  const getScoreColor = (score?: string) => {
    if (typeof score !== "string") return "bg-muted";
    const s = score.toLowerCase();
    if (s === "a") return "bg-green-500";
    if (s === "b") return "bg-lime-500";
    if (s === "c") return "bg-yellow-500";
    if (s === "d") return "bg-orange-500";
    return "bg-red-500";
  };

  const getDietaryConflicts = (): DietaryConflict[] => {
    if (!userPreferences?.dietaryRestrictions?.length) return [];
    const conflicts: DietaryConflict[] = [];
    const seenRestrictions = new Set<string>();

    const allergenTags = toStringArray(product.allergens_tags).map(t => t.toLowerCase());
    const ingredientTags = toStringArray(product.ingredients_analysis_tags).map(t => t.toLowerCase());
    const ingredientsText = (product.ingredients_text || "").toLowerCase();
    const allergensText = (product.allergens || "").toLowerCase();

    for (const restriction of userPreferences.dietaryRestrictions) {
      // Skip if we already found a conflict for this restriction
      if (seenRestrictions.has(restriction)) continue;

      const mapping = DIETARY_ALLERGEN_MAP[restriction];
      if (!mapping) continue;

      // Check allergen tags (most reliable)
      for (const allergen of mapping.allergens) {
        const allergenKey = allergen.replace("en:", "").toLowerCase();
        const found = allergenTags.some(tag => {
          const tagKey = tag.replace("en:", "").toLowerCase();
          return tagKey.includes(allergenKey) || allergenKey.includes(tagKey);
        });

        if (found) {
          conflicts.push({
            restriction,
            reason: `Contains ${allergen.replace("en:", "").replace(/-/g, " ")}`,
          });
          seenRestrictions.add(restriction);
          break;
        }
      }

      if (seenRestrictions.has(restriction)) continue;

      // Check ingredient analysis tags
      for (const tag of mapping.tags) {
        if (ingredientTags.includes(tag.toLowerCase())) {
          conflicts.push({
            restriction,
            reason: `Product is ${tag.replace("en:", "").replace(/-/g, " ")}`,
          });
          seenRestrictions.add(restriction);
          break;
        }
      }

      if (seenRestrictions.has(restriction)) continue;

      // Check allergens text field
      const allergensMatch = containsKeyword(allergensText, mapping.ingredientKeywords);
      if (allergensMatch) {
        conflicts.push({
          restriction,
          reason: `Contains ${allergensMatch}`,
        });
        seenRestrictions.add(restriction);
        continue;
      }

      // Check ingredients text (less reliable, only if keywords are distinctive)
      if (ingredientsText && mapping.ingredientKeywords.length > 0) {
        const ingredientMatch = containsKeyword(ingredientsText, mapping.ingredientKeywords);
        if (ingredientMatch) {
          conflicts.push({
            restriction,
            reason: `May contain ${ingredientMatch} (check ingredients)`,
          });
          seenRestrictions.add(restriction);
        }
      }
    }

    return conflicts;
  };

  const getHealthFlags = () => {
    const flags: HealthFlag[] = [];
    const nutriments = product.nutriments ?? {};
    const ingredientAnalysisTags = toStringArray(product.ingredients_analysis_tags);

    if (typeof nutriments.sugars_100g === "number" && nutriments.sugars_100g > 15) {
      flags.push({ type: "High Sugar", value: `${nutriments.sugars_100g}g per 100g`, severity: "high" });
    }
    if (typeof nutriments.fat_100g === "number" && nutriments.fat_100g > 20) {
      flags.push({ type: "High Fat", value: `${nutriments.fat_100g}g per 100g`, severity: "high" });
    }
    if (typeof nutriments.salt_100g === "number" && nutriments.salt_100g > 1.5) {
      flags.push({ type: "High Salt", value: `${nutriments.salt_100g}g per 100g`, severity: "high" });
    }
    if (typeof nutriments["saturated-fat_100g"] === "number" && nutriments["saturated-fat_100g"] > 5) {
      flags.push({ type: "High Saturated Fat", value: `${nutriments["saturated-fat_100g"]}g per 100g`, severity: "medium" });
    }
    if (ingredientAnalysisTags.includes("en:palm-oil")) {
      flags.push({ type: "Contains Palm Oil", value: "Environmental concern", severity: "medium" });
    }

    return flags;
  };

  const getEcoFactors = () => {
    const factors: EcoFactor[] = [];
    const packagingTags = toStringArray(product.packaging_tags);
    const labelsTags = toStringArray(product.labels_tags);
    const originsTags = toStringArray(product.origins_tags);

    if (packagingTags.some((tag: string) => tag.includes("recyclable"))) {
      factors.push({ name: "Recyclability", status: "positive", detail: "Recyclable packaging" });
    } else if (packagingTags.some((tag: string) => tag.includes("non-recyclable"))) {
      factors.push({ name: "Recyclability", status: "negative", detail: "Non-recyclable packaging" });
    } else if (packagingTags.length > 0) {
      factors.push({ name: "Packaging", status: "neutral", detail: packagingTags.slice(0, 2).map((t: string) => t.replace("en:", "")).join(", ") });
    }

    if (labelsTags.length > 0) {
      factors.push({
        name: "Certifications",
        status: "positive",
        detail: labelsTags.slice(0, 3).map((l: string) => l.replace("en:", "")).join(", ")
      });
    }

    if (originsTags.length > 0) {
      factors.push({
        name: "Origin",
        status: "neutral",
        detail: originsTags[0].replace("en:", "")
      });
    }

    const transportScore = product.ecoscore_data?.adjustments?.transportation?.value;
    if (typeof transportScore === "number") {
      factors.push({
        name: "Carbon Footprint",
        status: transportScore < 0 ? "negative" : "positive",
        detail: transportScore < 0 ? "High transport emissions" : "Low transport emissions"
      });
    }

    return factors;
  };

  const handleShare = async () => {
    const productUrl = product.code
      ? `https://world.openfoodfacts.org/product/${encodeURIComponent(product.code)}`
      : window.location.href;
    const shareData = {
      title: `${product.product_name} - GreenScan`,
      text: `Check out this product analysis: Nutri-Score ${product.nutriscore_grade?.toUpperCase() || "N/A"}, Eco-Score ${product.ecoscore_grade?.toUpperCase() || "N/A"}`,
      url: productUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Share failed:", error);
      toast.error("Unable to share right now.");
    }
  };

  const handleToggleFavorite = () => {
    if (!product.code) return;
    const nowFav = toggleFavorite(product);
    setIsFav(nowFav);
    toast.success(nowFav ? "Added to favorites!" : "Removed from favorites.");
  };

  const handleOpenAlternative = (code?: string) => {
    if (!code) {
      toast.error("Product details link is unavailable for this item.");
      return;
    }
    const detailsUrl = `https://world.openfoodfacts.org/product/${encodeURIComponent(code)}`;
    const openedWindow = window.open(detailsUrl, "_blank", "noopener,noreferrer");
    if (!openedWindow) {
      toast.error("Popup blocked. Please allow popups and try again.");
    }
  };

  const healthFlags = getHealthFlags();
  const ecoFactors = getEcoFactors();
  const dietaryConflicts = getDietaryConflicts();
  const categoryList =
    typeof product.categories === "string"
      ? product.categories.split(",").map((c) => c.trim()).filter(Boolean)
      : [];
  const ingredientAnalysisTags = toStringArray(product.ingredients_analysis_tags);
  const allergenTags = toStringArray(product.allergens_tags);
  const nutriments = product.nutriments ?? {};
  const hasNutritionData = Object.keys(DAILY_VALUES).some(
    (key) => typeof nutriments[key as keyof typeof nutriments] === "number",
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto p-4 space-y-6"
    >
      <div className="flex items-center justify-between mb-4">
        <Button
          onClick={onBack}
          variant="ghost"
          className="bg-white/10 backdrop-blur-md hover:bg-white/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Scanner
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={handleToggleFavorite}
            variant="ghost"
            size="icon"
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            className="bg-white/10 backdrop-blur-md hover:bg-white/20"
          >
            {isFav ? <BookmarkCheck className="h-5 w-5 text-yellow-400" /> : <Bookmark className="h-5 w-5" />}
          </Button>
          <Button
            onClick={handleShare}
            variant="ghost"
            size="icon"
            aria-label="Share product"
            className="bg-white/10 backdrop-blur-md hover:bg-white/20"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Personalized Dietary Alert */}
      {dietaryConflicts.length > 0 && (
        <Card className="p-4 bg-red-500/20 backdrop-blur-md border-red-500/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-red-500/30">
              <ShieldAlert className="h-6 w-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-red-400">Personal Dietary Alert</h3>
          </div>
          <div className="space-y-2">
            {dietaryConflicts.map((conflict, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-red-300">Your profile: {conflict.restriction}</span>
                <span className="text-red-200">— {conflict.reason}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Product Header */}
      <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
        <div className="flex flex-col md:flex-row gap-6">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.product_name}
              className="w-full md:w-48 h-48 object-contain rounded-lg bg-white/5"
            />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {product.product_name || "Unknown Product"}
            </h1>
            <p className="text-muted-foreground mb-2">
              {product.brands || "No brand information"}
            </p>
            {product.quantity && (
              <p className="text-sm text-muted-foreground mb-2">{product.quantity}</p>
            )}
            {categoryList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categoryList.slice(0, 3).map((cat: string, i: number) => (
                  <Badge key={i} variant="secondary" className="bg-white/10 backdrop-blur-sm">
                    {cat}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Three Pillars */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Pillar 1: Sustainability */}
        <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Leaf className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="text-xl font-bold">Sustainability</h3>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Eco-Score</p>
              <div className="flex items-center gap-2">
                <div className={`w-12 h-12 rounded-lg ${getScoreColor(product.ecoscore_grade)} flex items-center justify-center text-white font-bold text-xl`}>
                  {product.ecoscore_grade?.toUpperCase() || "?"}
                </div>
                <span className="text-sm">
                  {product.ecoscore_grade && product.ecoscore_grade !== "unknown" && product.ecoscore_grade !== "not-applicable" ? "Environmental Impact" : "Not Available"}
                </span>
              </div>
            </div>

            {ecoFactors.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Eco Factors</p>
                <div className="space-y-2">
                  {ecoFactors.map((factor, i) => (
                    <div key={i} className="text-xs p-2 rounded bg-white/5">
                      <div className="font-semibold flex items-center gap-1">
                        {factor.status === "positive" && "✓"}
                        {factor.status === "negative" && "✗"}
                        {factor.name}
                      </div>
                      <div className="text-muted-foreground">{factor.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.labels_tags && product.labels_tags.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Certifications</p>
                <div className="flex flex-wrap gap-1">
                  {product.labels_tags.slice(0, 4).map((label: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs bg-white/5">
                      {label.replace("en:", "")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Pillar 2: Health Level */}
        <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Heart className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold">Health Level</h3>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Nutri-Score</p>
              <div className="flex items-center gap-2">
                <div className={`w-12 h-12 rounded-lg ${getScoreColor(product.nutriscore_grade)} flex items-center justify-center text-white font-bold text-xl`}>
                  {product.nutriscore_grade?.toUpperCase() || "?"}
                </div>
                <span className="text-sm">
                  {product.nutriscore_grade ? "Nutritional Quality" : "Not Available"}
                </span>
              </div>
            </div>

            {healthFlags.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Health Warnings</p>
                <div className="space-y-1">
                  {healthFlags.map((flag, i) => (
                    <div key={i} className={`text-xs p-2 rounded ${flag.severity === "high" ? "bg-red-500/20 text-red-300" : "bg-orange-500/20 text-orange-300"}`}>
                      <div className="font-semibold">⚠ {flag.type}</div>
                      <div>{flag.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.nova_group && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Processing Level</p>
                <Badge variant={product.nova_group > 2 ? "destructive" : "secondary"}>
                  NOVA Group {product.nova_group}
                </Badge>
              </div>
            )}

            {ingredientAnalysisTags.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Ingredients Analysis</p>
                <div className="space-y-1">
                  {ingredientAnalysisTags.includes("en:palm-oil") && (
                    <Badge variant="destructive" className="text-xs">Contains Palm Oil</Badge>
                  )}
                  {ingredientAnalysisTags.includes("en:vegan") && (
                    <Badge variant="secondary" className="text-xs bg-green-500/20">Vegan</Badge>
                  )}
                  {ingredientAnalysisTags.includes("en:vegetarian") && (
                    <Badge variant="secondary" className="text-xs bg-green-500/20">Vegetarian</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Pillar 3: Allergens */}
        <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold">Allergens</h3>
          </div>

          <div className="space-y-2">
            {allergenTags.length > 0 ? (
              allergenTags.map((allergen: string, i: number) => (
                <div key={i} className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="font-semibold text-red-500">
                    {allergen.replace("en:", "").replace(/-/g, " ").toUpperCase()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No allergen information available
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Nutrition Facts */}
      {hasNutritionData && (
        <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Apple className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Nutrition Facts</h3>
              <p className="text-xs text-muted-foreground">Per 100g {product.serving_size ? `• Serving: ${product.serving_size}` : ""}</p>
            </div>
          </div>
          <div className="space-y-3">
            {(Object.keys(DAILY_VALUES) as Array<keyof typeof DAILY_VALUES>).map((key) => {
              const value = nutriments[key as keyof typeof nutriments];
              if (typeof value !== "number") return null;
              const daily = DAILY_VALUES[key];
              const pct = Math.min(Math.round((value / daily) * 100), 100);
              const label = NUTRIENT_LABELS[key];
              const unit = NUTRIENT_UNITS[key];
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">
                      {value}{unit} <span className="text-xs">({pct}% DV)</span>
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-2"
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Ingredients */}
      {(product.ingredients_text || (product.additives_tags && product.additives_tags.length > 0)) && (
        <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <FlaskConical className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Ingredients</h3>
              <div className="flex gap-3 text-xs text-muted-foreground">
                {typeof product.ingredients_count === "number" && (
                  <span>{product.ingredients_count} ingredients</span>
                )}
                {typeof product.additives_count === "number" && product.additives_count > 0 && (
                  <span>{product.additives_count} additives</span>
                )}
              </div>
            </div>
          </div>
          {product.ingredients_text && (
            <p className="text-sm leading-relaxed mb-4">{product.ingredients_text}</p>
          )}
          {product.additives_tags && product.additives_tags.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Additives</p>
              <div className="flex flex-wrap gap-1">
                {product.additives_tags.slice(0, 8).map((additive, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-amber-500/10 border-amber-500/20">
                    {additive.replace("en:", "")}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Healthy Alternatives */}
      {alternatives && alternatives.length > 0 && (
        <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
          <h3 className="text-xl font-bold mb-4">Healthier Alternatives</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {alternatives.map((alt, i: number) => (
              <Card key={i} className="p-4 bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-colors">
                {alt.image_url && (
                  <img
                    src={alt.image_url}
                    alt={alt.product_name}
                    className="w-full h-32 object-contain rounded-lg mb-3 bg-white/5"
                  />
                )}
                <h4 className="font-semibold mb-2 line-clamp-2">{alt.product_name}</h4>
                <div className="flex gap-2 mb-2">
                  {typeof alt.nutriscore_grade === "string" && (
                    <div className={`w-8 h-8 rounded ${getScoreColor(alt.nutriscore_grade)} flex items-center justify-center text-white text-sm font-bold`}>
                      {alt.nutriscore_grade.toUpperCase()}
                    </div>
                  )}
                  {typeof alt.ecoscore_grade === "string" && (
                    <div className={`w-8 h-8 rounded ${getScoreColor(alt.ecoscore_grade)} flex items-center justify-center text-white text-sm font-bold`}>
                      {alt.ecoscore_grade.toUpperCase()}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-white/5 hover:bg-white/10"
                  disabled={!alt.code}
                  onClick={() => handleOpenAlternative(alt.code)}
                >
                  <ExternalLink className="mr-2 h-3 w-3" />
                  View Details
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
}
