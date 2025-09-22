import { db } from "@/shared/database/connection";
import { pantryItems, ingredients, users } from "@/shared/database/schema";
import { eq, inArray } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "@/shared/utils/errors";
import type {
  AddPantryItem,
  UpdatePantryItem,
} from "@/shared/schemas/api/pantry.schemas";

export async function addPantryItem(userId: string, data: AddPantryItem) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { primaryPantryOwnerId: true },
  });

  const pantryOwnerId = user?.primaryPantryOwnerId || userId;

  return db.transaction(async (tx) => {
    const ingredient = await tx.query.ingredients.findFirst({
      where: eq(ingredients.id, data.ingredientId),
      columns: { id: true },
    });

    if (!ingredient) {
      throw new NotFoundError("Nguyên liệu không tồn tại.");
    }

    const [newItem] = await tx
      .insert(pantryItems)
      .values({
        userId: pantryOwnerId,
        ingredientId: data.ingredientId,
        quantity: data.quantity,
        unit: data.unit,
        expiresAt: data.expiresAt,
        notes: data.notes,
        addedBy: userId,
      })
      .returning();

    return newItem;
  });
}

export async function addPantryBatch(userId: string, items: AddPantryItem[]) {
  if (items.length === 0) {
    return [];
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { primaryPantryOwnerId: true },
  });

  const pantryOwnerId = user?.primaryPantryOwnerId || userId;

  return db.transaction(async (tx) => {
    const ingredientIds = [...new Set(items.map((item) => item.ingredientId))];
    const existingIngredients = await tx.query.ingredients.findMany({
      where: inArray(ingredients.id, ingredientIds),
      columns: { id: true },
    });

    if (existingIngredients.length !== ingredientIds.length) {
      const existingIds = new Set(existingIngredients.map((i) => i.id));
      const missingIds = ingredientIds.filter((id) => !existingIds.has(id));
      throw new NotFoundError(
        `Các nguyên liệu không tồn tại: ${missingIds.join(", ")}`,
      );
    }

    const itemsToInsert = items.map((item) => ({
      userId: pantryOwnerId,
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      expiresAt: item.expiresAt,
      notes: item.notes,
      addedBy: userId,
    }));

    const newItems = await tx
      .insert(pantryItems)
      .values(itemsToInsert)
      .returning();

    return newItems;
  });
}

export async function updatePantryItem(
  userId: string,
  itemId: string,
  data: UpdatePantryItem,
) {
  return db.transaction(async (tx) => {
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { primaryPantryOwnerId: true },
    });

    const pantryOwnerId = user?.primaryPantryOwnerId || userId;

    const existingItem = await tx.query.pantryItems.findFirst({
      where: eq(pantryItems.id, itemId),
      columns: { userId: true },
    });

    if (!existingItem) {
      throw new NotFoundError("Pantry item không tồn tại");
    }

    if (existingItem.userId !== pantryOwnerId) {
      throw new ForbiddenError("Item này không thuộc pantry hiện tại của bạn");
    }

    const updateData: Partial<typeof pantryItems.$inferInsert> = { ...data };

    const [updatedItem] = await tx
      .update(pantryItems)
      .set(updateData)
      .where(eq(pantryItems.id, itemId))
      .returning();

    return updatedItem;
  });
}

export async function removePantryItem(userId: string, itemId: string) {
  return db.transaction(async (tx) => {
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { primaryPantryOwnerId: true },
    });

    const pantryOwnerId = user?.primaryPantryOwnerId || userId;

    const existingItem = await tx.query.pantryItems.findFirst({
      where: eq(pantryItems.id, itemId),
      columns: { userId: true },
    });

    if (!existingItem) {
      throw new NotFoundError("Pantry item không tồn tại");
    }

    if (existingItem.userId !== pantryOwnerId) {
      throw new ForbiddenError("Item này không thuộc pantry hiện tại của bạn");
    }

    const [deletedItem] = await tx
      .delete(pantryItems)
      .where(eq(pantryItems.id, itemId))
      .returning({ id: pantryItems.id });

    return deletedItem;
  });
}
