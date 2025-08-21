-- Seed data cho Cookora database
-- Xóa dữ liệu cũ (nếu có)
TRUNCATE TABLE pantry_items, recipe_ingredients, recipe_instructions, recipes, ingredients RESTART IDENTITY CASCADE;

COMMIT; 