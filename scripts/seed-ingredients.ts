import { db } from '../src/shared/database/connection'
import * as schema from '../src/shared/database/schema'
import { promises as fs } from 'fs'
import path from 'path'
import { sql } from 'drizzle-orm'

// Định nghĩa kiểu dữ liệu cho nguyên liệu từ file JSON
interface IngredientSeed {
    name: string
    category: string
    aliases?: string[]
}

async function seedIngredients() {
    console.log('🌱 Bắt đầu quá trình seed dữ liệu nguyên liệu...')

    try {
        // 1. Đọc file JSON
        const jsonPath = path.resolve(__dirname, 'ingredients.json')
        const jsonData = await fs.readFile(jsonPath, 'utf-8')
        const ingredientsData: IngredientSeed[] = JSON.parse(jsonData)

        if (!ingredientsData || ingredientsData.length === 0) {
            console.log('Không tìm thấy nguyên liệu nào trong file JSON. Kết thúc.')
            return
        }

        console.log(`🔍 Tìm thấy ${ingredientsData.length} nguyên liệu trong file JSON.`)

        // 3. Loại bỏ các bản ghi trùng lặp dựa trên 'name', giữ lại bản ghi cuối cùng
        const uniqueIngredientsMap = new Map<string, IngredientSeed>()
        for (const ingredient of ingredientsData) {
            uniqueIngredientsMap.set(ingredient.name, ingredient)
        }
        const uniqueIngredients = Array.from(uniqueIngredientsMap.values())

        console.log(
            `✨ Đã loại bỏ các bản ghi trùng lặp, còn lại ${uniqueIngredients.length} nguyên liệu duy nhất.`,
        )

        // 4. Chuẩn bị dữ liệu để insert
        const dataToInsert = uniqueIngredients.map((ing) => ({
            name: ing.name,
            category: ing.category,
            aliases: ing.aliases || [], // Đảm bảo aliases luôn là một mảng
        }))

        // 5. Sử dụng "onConflictDoUpdate" (upsert) để không xóa dữ liệu cũ
        // Lệnh này sẽ insert dòng mới, nếu một nguyên liệu với 'name' đã tồn tại,
        // nó sẽ cập nhật các trường được chỉ định thay vì báo lỗi.
        console.log('⏳ Đang thực hiện upsert (thêm mới hoặc cập nhật)...')

        await db
            .insert(schema.ingredients)
            .values(dataToInsert)
            .onConflictDoUpdate({
                target: schema.ingredients.name, // Cột unique để check conflict
                set: {
                    category: sql`excluded.category`, // Cập nhật category từ dữ liệu mới
                    aliases: sql`excluded.aliases`, // Cập nhật aliases từ dữ liệu mới
                },
            })

        console.log('✅ Seed dữ liệu nguyên liệu thành công!')
    } catch (error) {
        console.error('❌ Đã xảy ra lỗi khi seed dữ liệu:', error)
        process.exit(1) // Thoát với mã lỗi
    } finally {
        console.log('🏁 Quá trình seed đã hoàn tất.')
        // Bun sẽ tự động thoát khi script chạy xong, không cần process.exit(0)
    }
}

seedIngredients() 