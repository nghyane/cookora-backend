// Vietnamese Culinary Domain Constants

/**
 * Vietnamese Cooking Methods - Phương pháp nấu ăn
 */
export const COOKING_METHODS = [
  'luoc', // luộc (boiling)
  'chien', // chiên (frying)
  'nuong', // nướng (grilling)
  'xao', // xào (stir-frying)
  'hap', // hấp (steaming)
  'kho', // kho (braising)
  'canh', // canh (soup)
  'goi', // gỏi (salad)
  'nem', // nem (spring rolls)
  'pha_che', // pha chế (mixing drinks)
  'lam_banh', // làm bánh (baking)
  'uop', // ướp (marinating)
  'rang', // rang (roasting)
  'cac_loai_khac', // các loại khác (other methods)
] as const

/**
 * Vietnamese Regions - Vùng miền
 */
export const VIETNAMESE_REGIONS = [
  'mien_bac', // miền Bắc (Northern Vietnam)
  'mien_trung', // miền Trung (Central Vietnam)
  'mien_nam', // miền Nam (Southern Vietnam)
  'tay_bac', // Tây Bắc (Northwestern Vietnam)
  'dong_bac', // Đông Bắc (Northeastern Vietnam)
  'dong_bang_song_cuu_long', // Đồng bằng sông Cửu Long (Mekong Delta)
  'tay_nguyen', // Tây Nguyên (Central Highlands)
  'duyen_hai_mien_trung', // Duyên hải miền Trung (Central Coast)
] as const

/**
 * Vietnamese Meal Types - Loại bữa ăn
 */
export const MEAL_TYPES = [
  'sang', // sáng (breakfast)
  'trua', // trưa (lunch)
  'toi', // tối (dinner)
  'phu', // phụ (snack)
  'che', // chè (dessert)
  'nuoc_uong', // nước uống (drinks)
  'banh_keo', // bánh kẹo (sweets)
  'an_vat', // ăn vặt (street food)
] as const

/**
 * Vietnamese Ingredient Categories - Phân loại nguyên liệu (đồng nhất tiếng Việt)
 */
export const INGREDIENT_CATEGORIES = [
  'rau_cu', // rau củ (30 items)
  'gia_vi', // gia vị (19 items)  
  'rau_thom', // rau thơm (16 items)
  'thit', // thịt (15 items)
  'gia_vi_kho', // gia vị khô (13 items)
  'ngu_coc', // ngũ cốc (10 items)
  'hai_san', // hải sản (6 items)
  'khac', // khác (4 items)
] as const

/**
 * Mapping từ categories cũ (English) sang mới (Vietnamese)
 */
export const CATEGORY_MIGRATION_MAP = {
  vegetables: 'rau_cu',
  seasoning: 'gia_vi',
  herbs: 'rau_thom', 
  meat: 'thit',
  spices: 'gia_vi_kho',
  grains: 'ngu_coc',
  seafood: 'hai_san',
  other: 'khac'
} as const

/**
 * Vietnamese Dish Categories - Phân loại món ăn
 */
export const DISH_CATEGORIES = [
  'mon_chinh', // món chính (main dishes)
  'mon_phu', // món phụ (side dishes)
  'mon_khai_vi', // món khai vị (appetizers)
  'mon_canh', // món canh (soups)
  'mon_trang_mieng', // món tráng miệng (desserts)
  'nuoc_uong', // nước uống (beverages)
  'banh_ngot', // bánh ngọt (sweet cakes)
  'banh_man', // bánh mặn (savory cakes)
  'che_banh', // chè bánh (puddings & cakes)
  'mon_chay', // món chay (vegetarian)
] as const

/**
 * Vietnamese Dietary Restrictions - Hạn chế ăn uống
 */
export const DIETARY_RESTRICTIONS = [
  'chay', // chay (vegetarian)
  'thuần_chay', // thuần chay (vegan)
  'khong_gluten', // không gluten (gluten-free)
  'khong_lactose', // không lactose (lactose-free)
  'it_dau_mo', // ít dầu mỡ (low-fat)
  'it_duong', // ít đường (low-sugar)
  'it_muoi', // ít muối (low-sodium)
  'khong_cay', // không cay (non-spicy)
  'khong_bia_ruou', // không bia rượu (no alcohol)
  'eat_clean', // eat clean
] as const

/**
 * Vietnamese Spice Levels - Độ cay
 */
export const SPICE_LEVELS = [
  'khong_cay', // không cay (not spicy)
  'it_cay', // ít cay (mildly spicy)
  'vua_cay', // vừa cay (moderately spicy)
  'cay', // cay (spicy)
  'rat_cay', // rất cay (very spicy)
  'cuc_cay', // cực cay (extremely spicy)
] as const

/**
 * Vietnamese Units - Đơn vị đo lường
 */
export const VIETNAMESE_UNITS = [
  // Volume - Thể tích
  'muong_canh', // muỗng canh (tablespoon)
  'muong_ca_phe', // muỗng cà phê (teaspoon)
  'chén', // chén (bowl)
  'ly', // ly (glass)
  'coc', // cốc (cup)
  'ml', // milliliter
  'lit', // liter

  // Weight - Khối lượng
  'gram', // gram
  'kg', // kilogram
  'yen', // yến (tael - traditional Vietnamese unit)
  'can', // cân (traditional Vietnamese unit)

  // Count - Số lượng
  'cai', // cái (piece)
  'qúa', // quả (fruit/item)
  'con', // con (animal/fish)
  'cây', // cây (stick/piece)
  'lá', // lá (leaf)
  'nhánh', // nhánh (branch)
  'củ', // củ (bulb/tuber)
  'trái', // trái (fruit)

  // Special Vietnamese measures
  'thia', // thìa (spoon)
  'nắm', // nắm (handful)
  'chút', // chút (a little bit)
  'vài', // vài (a few)
  'tí', // tí (tiny amount)
  'ít', // ít (little)
  'nhiều', // nhiều (much/many)
] as const

/**
 * Vietnamese Cooking Difficulty - Độ khó
 */
export const DIFFICULTY_LEVELS = [
  'de', // dễ (easy)
  'trung_binh', // trung bình (medium)
  'kho', // khó (hard)
  'rat_kho', // rất khó (very hard)
  'chuyen_nghiep', // chuyên nghiệp (professional)
] as const

/**
 * Vietnamese Cooking Time Categories - Thời gian nấu
 */
export const TIME_CATEGORIES = [
  'nhanh', // nhanh (quick - under 15 mins)
  'trung_binh', // trung bình (medium - 15-45 mins)
  'cham', // chậm (slow - 45+ mins)
  'rat_cham', // rất chậm (very slow - 2+ hours)
  'qua_dem', // qua đêm (overnight)
] as const

// Type definitions
export type CookingMethod = (typeof COOKING_METHODS)[number]
export type VietnameseRegion = (typeof VIETNAMESE_REGIONS)[number]
export type MealType = (typeof MEAL_TYPES)[number]
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number]
export type DishCategory = (typeof DISH_CATEGORIES)[number]
export type DietaryRestriction = (typeof DIETARY_RESTRICTIONS)[number]
export type SpiceLevel = (typeof SPICE_LEVELS)[number]
export type VietnameseUnit = (typeof VIETNAMESE_UNITS)[number]
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number]
export type TimeCategory = (typeof TIME_CATEGORIES)[number]
