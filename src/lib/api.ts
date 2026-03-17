import axios, { AxiosError } from "axios";
import type { OpenFoodFactsProduct } from "@/types/openfoodfacts";

const API_BASE = "https://world.openfoodfacts.org";
const DEFAULT_TIMEOUT = 10000;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache for API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  // Limit cache size to prevent memory issues
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// Normalize barcode to handle various formats
export function normalizeBarcode(barcode: string): string {
  // Remove all non-digit characters
  const digits = barcode.replace(/[^\d]/g, "");

  // Add leading zeros to EAN-8 to make it compatible
  if (digits.length === 8) {
    return digits;
  }

  // Standard EAN-13, UPC-A (12 digits), or longer codes
  return digits;
}

// Validate barcode format
export function isValidBarcode(barcode: string): boolean {
  const normalized = normalizeBarcode(barcode);
  // Accept 8-14 digit barcodes (EAN-8, UPC-A, EAN-13, ITF-14)
  return /^\d{8,14}$/.test(normalized);
}

// Detect if a string looks like a barcode vs a search query
export function looksLikeBarcode(input: string): boolean {
  const trimmed = input.trim();
  // Pure digits of proper length
  if (/^\d{8,14}$/.test(trimmed)) return true;
  // Digits with common separators (spaces, dashes)
  const cleaned = trimmed.replace(/[\s\-]/g, "");
  return /^\d{8,14}$/.test(cleaned);
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: "network" | "timeout" | "not_found" | "server" | "unknown";
}

// Generic retry wrapper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on 4xx errors (except 429 rate limit)
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
      }

      // Wait before retrying
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt] || 4000));
      }
    }
  }

  throw lastError;
}

// Parse API error into user-friendly message
function parseApiError(error: unknown): { message: string; type: ApiResult<unknown>["errorType"] } {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    if (axiosError.code === "ECONNABORTED") {
      return { message: "Request timed out. Please try again.", type: "timeout" };
    }

    if (axiosError.response) {
      const status = axiosError.response.status;
      if (status === 404) {
        return { message: "Product not found in database.", type: "not_found" };
      }
      if (status === 429) {
        return { message: "Too many requests. Please wait and try again.", type: "server" };
      }
      if (status >= 500) {
        return { message: "Server error. Please try again later.", type: "server" };
      }
      return { message: `Request failed (${status}).`, type: "unknown" };
    }

    if (axiosError.request) {
      if (!navigator.onLine) {
        return { message: "You are offline.", type: "network" };
      }
      return { message: "Network error. Check your connection.", type: "network" };
    }
  }

  return { message: "An unexpected error occurred.", type: "unknown" };
}

// Product lookup API with caching and retry
export interface ProductLookupResult {
  status: number;
  product?: OpenFoodFactsProduct;
}

export async function lookupProduct(barcode: string): Promise<ApiResult<OpenFoodFactsProduct>> {
  const normalized = normalizeBarcode(barcode);

  if (!isValidBarcode(normalized)) {
    return {
      success: false,
      error: "Invalid barcode format. Expected 8-14 digits.",
      errorType: "unknown",
    };
  }

  const cacheKey = `product:${normalized}`;
  const cached = getCached<OpenFoodFactsProduct>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }

  try {
    const response = await withRetry(() =>
      axios.get<ProductLookupResult>(
        `${API_BASE}/api/v2/product/${normalized}.json`,
        {
          timeout: DEFAULT_TIMEOUT,
          params: {
            fields: "code,product_name,image_url,brands,nutriscore_grade,ecoscore_grade,nova_group,allergens_tags,categories,categories_tags,nutriments,ingredients_text,ingredients_count,additives_count,additives_tags,ingredients_analysis_tags,labels_tags,packaging_tags,origins_tags,ecoscore_data,quantity,serving_size,allergens",
          },
        }
      )
    );

    if (response.data.status === 1 && response.data.product) {
      const product = response.data.product;
      setCache(cacheKey, product);
      return { success: true, data: product };
    }

    return {
      success: false,
      error: "Product not found in database.",
      errorType: "not_found",
    };
  } catch (error) {
    const parsed = parseApiError(error);
    return {
      success: false,
      error: parsed.message,
      errorType: parsed.type,
    };
  }
}

// Product search API
export interface SearchResult {
  products: OpenFoodFactsProduct[];
  count: number;
}

export async function searchProducts(
  query: string,
  pageSize: number = 24
): Promise<ApiResult<SearchResult>> {
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      success: false,
      error: "Please enter a search term.",
      errorType: "unknown",
    };
  }

  // If it looks like a barcode, do a product lookup instead
  if (looksLikeBarcode(trimmed)) {
    const result = await lookupProduct(trimmed);
    if (result.success && result.data) {
      return {
        success: true,
        data: {
          products: [result.data],
          count: 1,
        },
      };
    }
    // Fall through to search if barcode lookup fails
  }

  const cacheKey = `search:${trimmed}:${pageSize}`;
  const cached = getCached<SearchResult>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }

  try {
    const response = await withRetry(() =>
      axios.get<{ products?: OpenFoodFactsProduct[]; count?: number }>(
        `${API_BASE}/cgi/search.pl`,
        {
          params: {
            search_terms: trimmed,
            search_simple: 1,
            action: "process",
            json: 1,
            page_size: pageSize,
            fields: "code,product_name,image_url,brands,nutriscore_grade,ecoscore_grade,nova_group,allergens_tags,categories,nutriments,ingredients_text,ingredients_count,additives_count,additives_tags,ingredients_analysis_tags,labels_tags,packaging_tags,origins_tags,ecoscore_data,quantity,serving_size,allergens,categories_tags",
          },
          timeout: DEFAULT_TIMEOUT,
        }
      )
    );

    // Filter out products without names
    const products = (response.data.products ?? []).filter(
      (p) => p.product_name && p.product_name.trim()
    );

    const result: SearchResult = {
      products,
      count: response.data.count ?? products.length,
    };

    setCache(cacheKey, result);
    return { success: true, data: result };
  } catch (error) {
    const parsed = parseApiError(error);
    return {
      success: false,
      error: parsed.message,
      errorType: parsed.type,
    };
  }
}

// Fetch alternatives in a category
export async function fetchCategoryAlternatives(
  categoryTag: string,
  excludeCode?: string,
  nutriscoreFilter: string[] = ["a", "b"]
): Promise<ApiResult<OpenFoodFactsProduct[]>> {
  // Normalize category tag
  const categorySlug = categoryTag
    .replace(/^[a-z]{2}:/i, "")
    .trim()
    .toLowerCase();

  if (!categorySlug) {
    return { success: true, data: [] };
  }

  const cacheKey = `alternatives:${categorySlug}`;
  const cached = getCached<OpenFoodFactsProduct[]>(cacheKey);
  if (cached) {
    const filtered = cached.filter(p => p.code !== excludeCode);
    return { success: true, data: filtered };
  }

  const filterAlternatives = (products: OpenFoodFactsProduct[]): OpenFoodFactsProduct[] => {
    return products
      .filter((p) => {
        if (!p.product_name || p.code === excludeCode) return false;
        const nutri = p.nutriscore_grade?.toLowerCase();
        const eco = p.ecoscore_grade?.toLowerCase();
        return (
          (nutri && nutriscoreFilter.includes(nutri)) ||
          (eco && nutriscoreFilter.includes(eco))
        );
      })
      .slice(0, 6);
  };

  try {
    // Try category endpoint first
    const response = await axios.get<{ products?: OpenFoodFactsProduct[] }>(
      `${API_BASE}/category/${encodeURIComponent(categorySlug)}.json`,
      {
        params: {
          page_size: 30,
          fields: "code,product_name,image_url,nutriscore_grade,ecoscore_grade,brands",
        },
        timeout: DEFAULT_TIMEOUT,
      }
    );

    const alternatives = filterAlternatives(response.data.products ?? []);
    if (alternatives.length > 0) {
      setCache(cacheKey, alternatives);
      return { success: true, data: alternatives };
    }
  } catch {
    // Try fallback search
  }

  try {
    const fallbackResponse = await axios.get<{ products?: OpenFoodFactsProduct[] }>(
      `${API_BASE}/api/v2/search`,
      {
        params: {
          categories_tags: `en:${categorySlug}`,
          page_size: 30,
          fields: "code,product_name,image_url,nutriscore_grade,ecoscore_grade,brands",
        },
        timeout: DEFAULT_TIMEOUT,
      }
    );

    const alternatives = filterAlternatives(fallbackResponse.data.products ?? []);
    setCache(cacheKey, alternatives);
    return { success: true, data: alternatives };
  } catch (error) {
    const parsed = parseApiError(error);
    return {
      success: false,
      error: parsed.message,
      errorType: parsed.type,
    };
  }
}

// Clear cache (useful for testing or after errors)
export function clearApiCache(): void {
  cache.clear();
}
