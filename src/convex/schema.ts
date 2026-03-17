import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
    }).index("email", ["email"]),

    // Scanned products history
    scannedProducts: defineTable({
      userId: v.id("users"),
      barcode: v.string(),
      productName: v.string(),
      imageUrl: v.optional(v.string()),
      ecoScore: v.optional(v.string()),
      nutriScore: v.optional(v.string()),
      novaGroup: v.optional(v.number()),
      allergens: v.optional(v.array(v.string())),
      rawData: v.optional(v.any()),
    }).index("by_user", ["userId"]),

    // User preferences from onboarding
    userPreferences: defineTable({
      userId: v.id("users"),
      name: v.string(),
      age: v.number(),
      healthGoals: v.array(v.string()),
      dietaryRestrictions: v.array(v.string()),
      sustainabilityFocus: v.boolean(),
      hasCompletedOnboarding: v.boolean(),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;