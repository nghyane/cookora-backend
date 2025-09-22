import { db } from "@/shared/database/connection";
import {
  pantryItems,
  ingredients,
  pantryFollowers,
  users,
} from "@/shared/database/schema";
import {
  eq,
  and,
  count,
  desc,
  asc,
  lte,
  gte,
  inArray,
  or,
  exists,
  sql,
} from "drizzle-orm";
import type { PantrySearchQuery } from "@/shared/schemas/api/pantry.schemas";

export async function getPantryItems(userId: string, query: PantrySearchQuery) {
  const { ingredientId, expiringBefore, page, limit } = query;
  const offset = (page - 1) * limit;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      primaryPantryOwnerId: true,
    },
  });

  const pantryOwnerId = user?.primaryPantryOwnerId || userId;
  const whereConditions = [eq(pantryItems.userId, pantryOwnerId)];

  if (ingredientId) {
    whereConditions.push(eq(pantryItems.ingredientId, ingredientId));
  }

  if (expiringBefore) {
    whereConditions.push(lte(pantryItems.expiresAt, expiringBefore));
  }

  const whereClause =
    whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

  const itemsQuery = await db
    .select({
      id: pantryItems.id,
      userId: pantryItems.userId,
      ingredientId: pantryItems.ingredientId,
      quantity: pantryItems.quantity,
      unit: pantryItems.unit,
      addedAt: pantryItems.addedAt,
      expiresAt: pantryItems.expiresAt,
      notes: pantryItems.notes,
      addedBy: pantryItems.addedBy,
      owner: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
      ingredient: {
        id: ingredients.id,
        name: ingredients.name,
        category: ingredients.category,
        imageUrl: ingredients.imageUrl,
      },
    })
    .from(pantryItems)
    .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id))
    .leftJoin(users, eq(pantryItems.userId, users.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(pantryItems.addedAt));

  const totalQuery = await db
    .select({ count: count() })
    .from(pantryItems)
    .where(whereClause);

  const itemsWithMyFlag = itemsQuery.map((item) => ({
    ...item,
    isMyItem: item.addedBy === userId,
  }));

  return {
    items: itemsWithMyFlag,
    total: totalQuery[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalQuery[0].count / limit),
  };
}

export async function getExpiringItems(userId: string, days: number = 7) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { primaryPantryOwnerId: true },
  });

  const pantryOwnerId = user?.primaryPantryOwnerId || userId;

  const expiringItems = await db
    .select({
      id: pantryItems.id,
      quantity: pantryItems.quantity,
      unit: pantryItems.unit,
      expiresAt: pantryItems.expiresAt,
      notes: pantryItems.notes,
      ingredient: {
        id: ingredients.id,
        name: ingredients.name,
        category: ingredients.category,
        imageUrl: ingredients.imageUrl,
      },
    })
    .from(pantryItems)
    .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id))
    .where(
      and(
        eq(pantryItems.userId, pantryOwnerId),
        lte(pantryItems.expiresAt, expiryDate),
        gte(pantryItems.expiresAt, new Date()), // Chưa hết hạn
      ),
    )
    .orderBy(asc(pantryItems.expiresAt));

  return expiringItems;
}

/**
 * Get user's ingredient IDs for internal use
 * SIMPLIFIED: Single pantry model
 */
export async function getUserIngredientIds(userId: string): Promise<string[]> {
  // Get user's current pantry
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { primaryPantryOwnerId: true },
  });

  const pantryOwnerId = user?.primaryPantryOwnerId || userId;

  const userIngredients = await db
    .select({ ingredientId: pantryItems.ingredientId })
    .from(pantryItems)
    .where(eq(pantryItems.userId, pantryOwnerId));

  return userIngredients.map((item) => item.ingredientId);
}

/**
 * Get user pantry as Map for O(1) lookup
 * SIMPLIFIED: Single pantry model
 */
export async function getUserPantryMap(userId: string) {
  // Get user's current pantry
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { primaryPantryOwnerId: true },
  });

  const pantryOwnerId = user?.primaryPantryOwnerId || userId;

  const userPantryData = await db
    .select({
      ingredientId: pantryItems.ingredientId,
      quantity: pantryItems.quantity,
      unit: pantryItems.unit,
    })
    .from(pantryItems)
    .where(eq(pantryItems.userId, pantryOwnerId));

  return new Map(userPantryData.map((item) => [item.ingredientId, item]));
}
