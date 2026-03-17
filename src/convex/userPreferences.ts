import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Save user onboarding preferences
export const saveUserPreferences = mutation({
  args: {
    name: v.string(),
    age: v.number(),
    healthGoals: v.array(v.string()),
    dietaryRestrictions: v.array(v.string()),
    sustainabilityFocus: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }

    // Check if preferences already exist
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        age: args.age,
        healthGoals: args.healthGoals,
        dietaryRestrictions: args.dietaryRestrictions,
        sustainabilityFocus: args.sustainabilityFocus,
        hasCompletedOnboarding: true,
      });
      return existing._id;
    } else {
      const prefId = await ctx.db.insert("userPreferences", {
        userId: user._id,
        name: args.name,
        age: args.age,
        healthGoals: args.healthGoals,
        dietaryRestrictions: args.dietaryRestrictions,
        sustainabilityFocus: args.sustainabilityFocus,
        hasCompletedOnboarding: true,
      });
      return prefId;
    }
  },
});

// Get user preferences
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    return preferences;
  },
});
