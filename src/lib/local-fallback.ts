import type { OpenFoodFactsProduct } from "@/types/openfoodfacts";

const LOCAL_AUTH_KEY = "greenscan.local.auth.v1";
const LOCAL_SCAN_HISTORY_KEY = "greenscan.local.scanHistory.v1";
const LOCAL_PREFERENCES_KEY = "greenscan.local.preferences.v1";

const isBrowser = typeof window !== "undefined";

export interface LocalUserPreferences {
  name: string;
  age: number;
  healthGoals: string[];
  dietaryRestrictions: string[];
  sustainabilityFocus: boolean;
  hasCompletedOnboarding: boolean;
}

export interface LocalScannedProduct {
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

interface SaveLocalScannedProductInput {
  barcode: string;
  productName: string;
  imageUrl?: string;
  ecoScore?: string;
  nutriScore?: string;
  novaGroup?: number;
  allergens?: string[];
  rawData?: OpenFoodFactsProduct;
}

const readJson = <T>(key: string, fallbackValue: T): T => {
  if (!isBrowser) {
    return fallbackValue;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return fallbackValue;
    }
    return JSON.parse(rawValue) as T;
  } catch {
    return fallbackValue;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore local storage write failures.
  }
};

export const getLocalAuthEnabled = () => readJson<boolean>(LOCAL_AUTH_KEY, false);

export const setLocalAuthEnabled = (enabled: boolean) => {
  writeJson(LOCAL_AUTH_KEY, enabled);
};

export const clearLocalAuthEnabled = () => {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.removeItem(LOCAL_AUTH_KEY);
  } catch {
    // Ignore local storage delete failures.
  }
};

export const getLocalUserPreferences = (): LocalUserPreferences | null => {
  const value = readJson<LocalUserPreferences | null>(LOCAL_PREFERENCES_KEY, null);
  if (!value || typeof value !== "object") {
    return null;
  }

  return {
    name: typeof value.name === "string" ? value.name : "",
    age: typeof value.age === "number" ? value.age : 0,
    healthGoals: Array.isArray(value.healthGoals)
      ? value.healthGoals.filter((goal): goal is string => typeof goal === "string")
      : [],
    dietaryRestrictions: Array.isArray(value.dietaryRestrictions)
      ? value.dietaryRestrictions.filter((item): item is string => typeof item === "string")
      : [],
    sustainabilityFocus: Boolean(value.sustainabilityFocus),
    hasCompletedOnboarding: Boolean(value.hasCompletedOnboarding),
  };
};

export const saveLocalUserPreferences = (
  preferences: Omit<LocalUserPreferences, "hasCompletedOnboarding"> & {
    hasCompletedOnboarding?: boolean;
  },
): LocalUserPreferences => {
  const normalized: LocalUserPreferences = {
    name: preferences.name,
    age: preferences.age,
    healthGoals: preferences.healthGoals,
    dietaryRestrictions: preferences.dietaryRestrictions,
    sustainabilityFocus: preferences.sustainabilityFocus,
    hasCompletedOnboarding: preferences.hasCompletedOnboarding ?? true,
  };

  writeJson(LOCAL_PREFERENCES_KEY, normalized);
  return normalized;
};

export const getLocalScanHistory = (): LocalScannedProduct[] => {
  const entries = readJson<LocalScannedProduct[]>(LOCAL_SCAN_HISTORY_KEY, []);
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry): entry is LocalScannedProduct => {
      return Boolean(entry && typeof entry === "object" && typeof entry._id === "string");
    })
    .sort((a, b) => b._creationTime - a._creationTime);
};

export const saveLocalScannedProduct = (
  product: SaveLocalScannedProductInput,
): LocalScannedProduct => {
  const history = getLocalScanHistory();
  const created: LocalScannedProduct = {
    _id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    _creationTime: Date.now(),
    barcode: product.barcode,
    productName: product.productName,
    imageUrl: product.imageUrl,
    ecoScore: product.ecoScore,
    nutriScore: product.nutriScore,
    novaGroup: product.novaGroup,
    allergens: product.allergens,
    rawData: product.rawData,
  };

  const nextHistory = [created, ...history].slice(0, 100);
  writeJson(LOCAL_SCAN_HISTORY_KEY, nextHistory);
  return created;
};

export const deleteLocalScannedProduct = (productId: string): boolean => {
  const history = getLocalScanHistory();
  const nextHistory = history.filter((item) => item._id !== productId);
  writeJson(LOCAL_SCAN_HISTORY_KEY, nextHistory);
  return nextHistory.length !== history.length;
};
