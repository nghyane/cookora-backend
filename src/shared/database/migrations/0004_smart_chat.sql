-- Migrate ingredient categories từ English sang Vietnamese
UPDATE ingredients SET category = 'rau_cu' WHERE category = 'vegetables';--> statement-breakpoint
UPDATE ingredients SET category = 'gia_vi' WHERE category = 'seasoning';--> statement-breakpoint
UPDATE ingredients SET category = 'rau_thom' WHERE category = 'herbs';--> statement-breakpoint
UPDATE ingredients SET category = 'thit' WHERE category = 'meat';--> statement-breakpoint
UPDATE ingredients SET category = 'gia_vi_kho' WHERE category = 'spices';--> statement-breakpoint
UPDATE ingredients SET category = 'ngu_coc' WHERE category = 'grains';--> statement-breakpoint
UPDATE ingredients SET category = 'hai_san' WHERE category = 'seafood';--> statement-breakpoint
UPDATE ingredients SET category = 'khac' WHERE category = 'other';