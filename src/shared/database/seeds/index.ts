import { db } from "@/shared/database/connection";
import {
  users,
  recipes,
  ingredients,
  recipeIngredients,
  recipeInstructions,
  pantryItems,
  userFavorites,
  sessions,
  authProviders,
} from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import path from "path";

/**
 * Seed database với data từ JSON files
 */
export async function seedDatabase() {
  console.log("🌱 Bắt đầu seed database...");

  try {
    // Load JSON files dynamically
    const ingredientsPath = path.join(
      process.cwd(),
      "scripts",
      "ingredients.json",
    );
    const recipesPath = path.join(process.cwd(), "scripts", "recipes.json");

    const ingredientsFile = Bun.file(ingredientsPath);
    const recipesFile = Bun.file(recipesPath);

    const ingredientsJson = await ingredientsFile.json();
    const recipesJson = await recipesFile.json();

    console.log(
      `📁 Loaded ${ingredientsJson.length} ingredients and ${recipesJson.length} recipes from JSON files`,
    );

    // 1. Tạo sample users
    console.log("👥 Tạo sample users...");
    const [user1, user2, user3] = await Promise.all([
      db
        .insert(users)
        .values({
          email: "admin@cookora.com",
          name: "Admin Cookora",
          role: "admin",
          emailVerified: true,
        })
        .returning(),
      db
        .insert(users)
        .values({
          email: "chef@cookora.com",
          name: "Chef Nguyễn",
          role: "user",
          emailVerified: true,
        })
        .returning(),
      db
        .insert(users)
        .values({
          email: "hoa.nguyen@example.com",
          name: "Nguyễn Thị Hoa",
          role: "user",
          emailVerified: true,
        })
        .returning(),
    ]);

    console.log(`✅ Đã tạo ${[...user1, ...user2, ...user3].length} users`);

    // 1.5. Tạo auth providers cho users
    console.log("🔐 Tạo auth providers...");

    // Hash passwords
    const adminPassword = await Bun.password.hash("admin123");
    const chefPassword = await Bun.password.hash("chef123");
    const hoaPassword = await Bun.password.hash("MyStrongPass123!");

    await Promise.all([
      db.insert(authProviders).values({
        userId: user1[0].id,
        provider: "email",
        providerId: "admin@cookora.com",
        passwordHash: adminPassword,
      }),
      db.insert(authProviders).values({
        userId: user2[0].id,
        provider: "email",
        providerId: "chef@cookora.com",
        passwordHash: chefPassword,
      }),
      db.insert(authProviders).values({
        userId: user3[0].id,
        provider: "email",
        providerId: "hoa.nguyen@example.com",
        passwordHash: hoaPassword,
      }),
    ]);

    console.log("✅ Đã tạo auth providers");

    // 2. Import ingredients từ JSON
    console.log("🥬 Import ingredients từ JSON...");

    // Chuẩn bị data để insert - xử lý duplicates
    const ingredientMap = new Map<string, any>();

    // Merge duplicates by combining aliases
    for (const item of ingredientsJson as any[]) {
      if (ingredientMap.has(item.name)) {
        // Merge aliases if duplicate name
        const existing = ingredientMap.get(item.name);
        const combinedAliases = [
          ...new Set([...existing.aliases, ...(item.aliases || [])]),
        ];
        existing.aliases = combinedAliases;
      } else {
        ingredientMap.set(item.name, {
          name: item.name,
          category: item.category,
          aliases: item.aliases || [],
        });
      }
    }

    const ingredientsToInsert = Array.from(ingredientMap.values());

    // Insert theo batch để tránh quá tải
    const batchSize = 50; // Reduced batch size to avoid parameter limit
    const insertedIngredients = [];

    for (let i = 0; i < ingredientsToInsert.length; i += batchSize) {
      const batch = ingredientsToInsert.slice(i, i + batchSize);
      const result = await db.insert(ingredients).values(batch).returning();
      insertedIngredients.push(...result);
      console.log(
        `  - Đã insert ${Math.min(
          i + batchSize,
          ingredientsToInsert.length,
        )}/${ingredientsToInsert.length} ingredients`,
      );
    }

    console.log(
      `✅ Đã import ${insertedIngredients.length} ingredients từ JSON`,
    );

    // 3. Import recipes từ JSON
    console.log("🍽️ Import recipes từ JSON...");

    // Tạo map ingredient name -> id để lookup
    const ingredientIdMap = new Map(
      insertedIngredients.map((ing) => [ing.name.toLowerCase(), ing.id]),
    );

    // Random assign authors cho recipes
    const allUsers = [...user1, ...user2, ...user3];

    for (const recipeData of recipesJson as any[]) {
      console.log(`  📝 Đang xử lý recipe: ${recipeData.name}`);

      // Insert recipe
      const [newRecipe] = await db
        .insert(recipes)
        .values({
          title: recipeData.name,
          description:
            recipeData.description || `Món ${recipeData.name} thơm ngon`,
          servings: recipeData.servings || 4,
          cookingTime: recipeData.cookingTime || 30,
          authorId: allUsers[Math.floor(Math.random() * allUsers.length)].id,
          imageUrl: `https://images.unsplash.com/photo-${
            1550000000000 + Math.floor(Math.random() * 100000000)
          }?w=400`, // Random food image
        })
        .returning();

      // Insert recipe ingredients
      const recipeIngredientsToInsert = [];
      const missingIngredients = [];

      for (const ing of recipeData.ingredients) {
        // Tìm ingredient ID từ name
        const ingredientId = ingredientIdMap.get(ing.name.toLowerCase());

        if (ingredientId) {
          recipeIngredientsToInsert.push({
            recipeId: newRecipe.id,
            ingredientId: ingredientId,
            amount: ing.amount || 0,
            unit: ing.unit || "",
            notes: ing.notes,
          });
        } else {
          missingIngredients.push(ing.name);
        }
      }

      if (recipeIngredientsToInsert.length > 0) {
        // Insert in smaller batches to avoid parameter limits
        const ingredientBatchSize = 20;
        for (
          let i = 0;
          i < recipeIngredientsToInsert.length;
          i += ingredientBatchSize
        ) {
          const batch = recipeIngredientsToInsert.slice(
            i,
            i + ingredientBatchSize,
          );
          await db.insert(recipeIngredients).values(batch);
        }
        console.log(
          `    ✅ Đã thêm ${recipeIngredientsToInsert.length} ingredients`,
        );
      }

      if (missingIngredients.length > 0) {
        console.log(
          `    ⚠️ Không tìm thấy ${
            missingIngredients.length
          } ingredients: ${missingIngredients.join(", ")}`,
        );
      }

      // Generate recipe instructions (vì JSON không có instructions detail)
      const instructions = [
        {
          step: 1,
          description: `Chuẩn bị nguyên liệu cho món ${recipeData.name}`,
        },
        { step: 2, description: `Sơ chế và làm sạch các nguyên liệu` },
        {
          step: 3,
          description: `Thực hiện nấu theo phương pháp truyền thống`,
        },
        { step: 4, description: `Nêm nếm gia vị cho vừa khẩu vị` },
        { step: 5, description: `Trình bày ra đĩa và thưởng thức` },
      ];

      await db.insert(recipeInstructions).values(
        instructions.map((inst) => ({
          recipeId: newRecipe.id,
          ...inst,
        })),
      );
    }

    console.log(`✅ Đã import ${recipesJson.length} recipes từ JSON`);

    // 4. Tạo sample pantry items cho users
    console.log("🏪 Tạo sample pantry items...");

    // Lấy random 10 ingredients cho mỗi user
    const randomIngredients = insertedIngredients
      .sort(() => Math.random() - 0.5)
      .slice(0, 30);

    const pantryItemsToInsert = [];
    for (let i = 0; i < 3; i++) {
      const user = allUsers[i];
      const userIngredients = randomIngredients.slice(i * 10, (i + 1) * 10);

      for (const ing of userIngredients) {
        pantryItemsToInsert.push({
          userId: user.id,
          ingredientId: ing.id,
          quantity: Math.floor(Math.random() * 500) + 100, // Random 100-600
          unit: ["g", "ml", "cái", "củ", "lá"][Math.floor(Math.random() * 5)],
        });
      }
    }

    await db.insert(pantryItems).values(pantryItemsToInsert);
    console.log(`✅ Đã tạo ${pantryItemsToInsert.length} pantry items`);

    // 5. Tạo user favorites
    console.log("❤️ Tạo user favorites...");

    // Lấy tất cả recipes đã tạo
    const allRecipes = await db.select().from(recipes);

    // Random favorite cho mỗi user
    const favoritesToInsert = [];
    for (const user of allUsers) {
      const favoriteRecipes = allRecipes
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 5) + 1); // 1-5 favorites per user

      for (const recipe of favoriteRecipes) {
        favoritesToInsert.push({
          userId: user.id,
          recipeId: recipe.id,
        });
      }
    }

    if (favoritesToInsert.length > 0) {
      await db.insert(userFavorites).values(favoritesToInsert);
      console.log(`✅ Đã tạo ${favoritesToInsert.length} user favorites`);
    }

    console.log("🎉 Seed database thành công!");
    console.log(`📊 Tổng kết:`);
    console.log(`   - Users: ${allUsers.length}`);
    console.log(`   - Auth Providers: ${allUsers.length}`);
    console.log(`   - Ingredients: ${insertedIngredients.length}`);
    console.log(`   - Recipes: ${recipesJson.length}`);
    console.log(`   - Pantry Items: ${pantryItemsToInsert.length}`);
    console.log(`   - User Favorites: ${favoritesToInsert.length}`);
    console.log(``);
    console.log(`🔐 Test Credentials:`);
    console.log(`   - admin@cookora.com / admin123`);
    console.log(`   - chef@cookora.com / chef123`);
    console.log(`   - hoa.nguyen@example.com / MyStrongPass123!`);
  } catch (error) {
    console.error("❌ Lỗi khi seed database:", error);
    throw error;
  }
}

/**
 * Xóa hết data trong database
 */
export async function clearDatabase() {
  console.log("🧹 Xóa hết data trong database...");

  try {
    // Xóa theo thứ tự để tránh foreign key constraint
    console.log("  - Xóa sessions...");
    await db.delete(sessions);

    console.log("  - Xóa auth providers...");
    await db.delete(authProviders);

    console.log("  - Xóa user favorites...");
    await db.delete(userFavorites);

    console.log("  - Xóa pantry items...");
    await db.delete(pantryItems);

    console.log("  - Xóa recipe instructions...");
    await db.delete(recipeInstructions);

    console.log("  - Xóa recipe ingredients...");
    await db.delete(recipeIngredients);

    console.log("  - Xóa recipes...");
    await db.delete(recipes);

    console.log("  - Xóa ingredients...");
    await db.delete(ingredients);

    console.log("  - Xóa users...");
    await db.delete(users);

    console.log("✅ Đã xóa hết data");
  } catch (error) {
    console.error("❌ Lỗi khi xóa data:", error);
    throw error;
  }
}

// Chạy seed nếu file này được execute trực tiếp
if (import.meta.main) {
  console.log("🚀 Chạy database seeding...");

  try {
    // Clear database trước
    await clearDatabase();

    // Sau đó seed data mới
    await seedDatabase();

    console.log("✅ Hoàn thành!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Seed thất bại:", error);
    process.exit(1);
  }
}
