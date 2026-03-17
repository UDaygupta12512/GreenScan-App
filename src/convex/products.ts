import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Save a scanned product to history
export const saveScannedProduct = mutation({
  args: {
    barcode: v.string(),
    productName: v.string(),
    imageUrl: v.optional(v.string()),
    ecoScore: v.optional(v.string()),
    nutriScore: v.optional(v.string()),
    novaGroup: v.optional(v.number()),
    allergens: v.optional(v.array(v.string())),
    rawData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated to save products");
    }

    const productId = await ctx.db.insert("scannedProducts", {
      userId: user._id,
      barcode: args.barcode,
      productName: args.productName,
      imageUrl: args.imageUrl,
      ecoScore: args.ecoScore,
      nutriScore: args.nutriScore,
      novaGroup: args.novaGroup,
      allergens: args.allergens,
      rawData: args.rawData,
    });

    return productId;
  },
});

// Get user's scan history
export const getUserScanHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const products = await ctx.db
      .query("scannedProducts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);

    return products;
  },
});

// Get a specific scanned product
export const getScannedProduct = query({
  args: { productId: v.id("scannedProducts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const product = await ctx.db.get(args.productId);
    
    if (!product || product.userId !== user._id) {
      return null;
    }

    return product;
  },
});

// Delete a product from history
export const deleteScannedProduct = mutation({
  args: { productId: v.id("scannedProducts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const product = await ctx.db.get(args.productId);
    
    if (!product || product.userId !== user._id) {
      throw new Error("Product not found or unauthorized");
    }

    await ctx.db.delete(args.productId);
  },
});
