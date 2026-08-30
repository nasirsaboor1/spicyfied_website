export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export type Category =
  | 'Breakfast'
  | 'Poultry'
  | 'Beef'
  | 'Seafood'
  | 'Pasta & Rice'
  | 'Vegetarian'
  | 'Soups & Salads'
  | 'Desserts & Baking'

export interface Ingredient {
  n: string // normalized name, e.g. "garlic"
  q: number // quantity
  u: string // unit, e.g. "g", "ml", "tbsp", "" for countable
  note?: string // e.g. "finely chopped"
}

export interface RecipeStep {
  text: string
  timer?: number // minutes, if the step benefits from a timer
}

export interface Recipe {
  id: string
  title: string
  description: string
  category: Category
  cuisine: string
  difficulty: Difficulty
  prepTime: number // minutes
  cookTime: number // minutes
  servings: number
  ingredients: Ingredient[]
  steps: RecipeStep[]
  tags: string[]
  emoji: string
  rating: number // 0-5
}

export const CATEGORIES: Category[] = [
  'Breakfast',
  'Poultry',
  'Beef',
  'Seafood',
  'Pasta & Rice',
  'Vegetarian',
  'Soups & Salads',
  'Desserts & Baking',
]

export const CATEGORY_META: Record<Category, { emoji: string; color: string }> = {
  Breakfast: { emoji: '🍳', color: 'from-amber-300 to-orange-400' },
  Poultry: { emoji: '🍗', color: 'from-orange-300 to-red-400' },
  'Beef': { emoji: '🥩', color: 'from-red-300 to-rose-500' },
  Seafood: { emoji: '🦐', color: 'from-sky-300 to-cyan-500' },
  'Pasta & Rice': { emoji: '🍝', color: 'from-yellow-300 to-amber-500' },
  Vegetarian: { emoji: '🥗', color: 'from-green-300 to-emerald-500' },
  'Soups & Salads': { emoji: '🍲', color: 'from-teal-300 to-green-500' },
  'Desserts & Baking': { emoji: '🍰', color: 'from-pink-300 to-fuchsia-400' },
}
