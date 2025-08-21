import type { Recipe, User } from './types'

export const isValidUser = (data: unknown): data is User => {
    return (
        typeof data === 'object' &&
        data !== null &&
        'id' in data &&
        'email' in data &&
        'name' in data &&
        'createdAt' in data &&
        'updatedAt' in data
    )
}

export const isValidRecipe = (data: unknown): data is Recipe => {
    return (
        typeof data === 'object' &&
        data !== null &&
        'id' in data &&
        'title' in data &&
        'instructions' in data &&
        'cookingTime' in data &&
        'servings' in data
    )
}
