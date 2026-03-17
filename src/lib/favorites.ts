import type { OpenFoodFactsProduct } from "@/types/openfoodfacts";

const FAVORITES_KEY = "greenscan.favorites.v1";
const MAX_FAVORITES = 500; // Prevent excessive storage usage

export interface FavoriteProduct {
  code: string;
  product_name?: string;
  image_url?: string;
  brands?: string;
  nutriscore_grade?: string;
  ecoscore_grade?: string;
  nova_group?: number;
  allergens_tags?: string[];
  addedAt: number;
}

// Validate a single favorite entry
const isValidFavorite = (item: unknown): item is FavoriteProduct => {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;

  // Required field
  if (typeof obj.code !== "string" || !obj.code.trim()) return false;

  // Validate optional string fields (ignore invalid ones)
  const stringFields = ["product_name", "image_url", "brands", "nutriscore_grade", "ecoscore_grade"];
  for (const field of stringFields) {
    if (obj[field] !== undefined && typeof obj[field] !== "string") {
      obj[field] = undefined;
    }
  }

  // Validate nova_group
  if (obj.nova_group !== undefined) {
    if (typeof obj.nova_group !== "number" || obj.nova_group < 1 || obj.nova_group > 4) {
      obj.nova_group = undefined;
    }
  }

  // Validate allergens_tags array
  if (obj.allergens_tags !== undefined) {
    if (!Array.isArray(obj.allergens_tags)) {
      obj.allergens_tags = [];
    } else {
      obj.allergens_tags = obj.allergens_tags.filter(
        (tag): tag is string => typeof tag === "string"
      );
    }
  }

  // Validate or set addedAt
  if (typeof obj.addedAt !== "number" || obj.addedAt <= 0) {
    obj.addedAt = Date.now();
  }

  return true;
};

// Sanitize string to prevent XSS in display
const sanitizeString = (str: string | undefined): string | undefined => {
  if (!str) return undefined;
  // Remove potential script tags and trim
  return str.replace(/<[^>]*>/g, "").trim().slice(0, 500);
};

const readFavorites = (): FavoriteProduct[] => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      // Corrupted data, reset
      localStorage.removeItem(FAVORITES_KEY);
      return [];
    }

    // Filter and validate each entry
    const valid = parsed.filter(isValidFavorite);

    // If some entries were invalid, rewrite the cleaned data
    if (valid.length !== parsed.length) {
      writeFavorites(valid);
    }

    return valid;
  } catch (error) {
    console.error("Failed to read favorites:", error);
    // Try to recover by clearing corrupted data
    try {
      localStorage.removeItem(FAVORITES_KEY);
    } catch {
      // Ignore cleanup errors
    }
    return [];
  }
};

const writeFavorites = (favorites: FavoriteProduct[]): boolean => {
  try {
    // Limit size to prevent quota issues
    const limited = favorites.slice(0, MAX_FAVORITES);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(limited));
    return true;
  } catch (error) {
    console.error("Failed to write favorites:", error);

    // If quota exceeded, try removing oldest entries
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      try {
        const reduced = favorites
          .sort((a, b) => b.addedAt - a.addedAt)
          .slice(0, Math.floor(favorites.length / 2));
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(reduced));
        return true;
      } catch {
        // Last resort: clear favorites
        try {
          localStorage.removeItem(FAVORITES_KEY);
        } catch {
          // Ignore
        }
      }
    }
    return false;
  }
};

export const getFavorites = (): FavoriteProduct[] => {
  return readFavorites().sort((a, b) => b.addedAt - a.addedAt);
};

export const getFavoriteCount = (): number => {
  return readFavorites().length;
};

export const isFavorite = (code: string): boolean => {
  if (!code || typeof code !== "string") return false;
  const normalized = code.trim();
  return readFavorites().some((f) => f.code === normalized);
};

export const toggleFavorite = (product: OpenFoodFactsProduct): boolean => {
  if (!product?.code || typeof product.code !== "string") return false;

  const code = product.code.trim();
  const favorites = readFavorites();
  const existingIndex = favorites.findIndex((f) => f.code === code);

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
    writeFavorites(favorites);
    return false;
  }

  // Check for duplicates more thoroughly
  if (favorites.some(f => f.code === code)) {
    return true; // Already exists
  }

  // Validate and sanitize the new entry
  const newFavorite: FavoriteProduct = {
    code,
    product_name: sanitizeString(product.product_name),
    image_url: product.image_url?.startsWith("http") ? product.image_url : undefined,
    brands: sanitizeString(product.brands),
    nutriscore_grade: product.nutriscore_grade?.toLowerCase().match(/^[a-e]$/)?.[0],
    ecoscore_grade: product.ecoscore_grade?.toLowerCase().match(/^[a-e]$/)?.[0],
    nova_group: typeof product.nova_group === "number" && product.nova_group >= 1 && product.nova_group <= 4
      ? product.nova_group
      : undefined,
    allergens_tags: Array.isArray(product.allergens_tags)
      ? product.allergens_tags.filter((t): t is string => typeof t === "string").slice(0, 20)
      : [],
    addedAt: Date.now(),
  };

  favorites.push(newFavorite);
  const success = writeFavorites(favorites);
  return success;
};

export const removeFavorite = (code: string): boolean => {
  if (!code || typeof code !== "string") return false;

  const normalized = code.trim();
  const favorites = readFavorites();
  const next = favorites.filter((f) => f.code !== normalized);

  if (next.length !== favorites.length) {
    writeFavorites(next);
    return true;
  }
  return false;
};

// Export favorites for backup/sharing
export const exportFavorites = (): string => {
  return JSON.stringify(getFavorites(), null, 2);
};

// Import favorites from backup
export const importFavorites = (jsonString: string): { imported: number; errors: number } => {
  let imported = 0;
  let errors = 0;

  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { imported: 0, errors: 1 };
    }

    const existing = readFavorites();
    const existingCodes = new Set(existing.map(f => f.code));

    for (const item of parsed) {
      if (isValidFavorite(item) && !existingCodes.has(item.code)) {
        existing.push(item);
        existingCodes.add(item.code);
        imported++;
      } else {
        errors++;
      }
    }

    if (imported > 0) {
      writeFavorites(existing);
    }
  } catch {
    errors++;
  }

  return { imported, errors };
};
