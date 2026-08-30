import { RECIPES } from '../data/recipes'
import type { Recipe } from '../types/recipe'

export const totalTime = (r: Recipe) => r.prepTime + r.cookTime

export function formatTime(mins: number): string {
  if (mins <= 0) return '0 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

const FRACTIONS: [number, string][] = [
  [0.125, '⅛'],
  [0.25, '¼'],
  [0.33, '⅓'],
  [0.5, '½'],
  [0.66, '⅔'],
  [0.75, '¾'],
]

/** 0.5 → "½", 1.5 → "1½", 2.3 → "2.3" */
export function formatQty(q: number): string {
  if (!isFinite(q)) return ''
  const rounded = Math.round(q * 100) / 100
  const whole = Math.floor(rounded)
  const frac = rounded - whole
  for (const [val, sym] of FRACTIONS) {
    if (Math.abs(frac - val) < 0.04) {
      return whole > 0 ? `${whole}${sym}` : sym
    }
  }
  if (frac < 0.04) return `${whole}`
  // round to 1 decimal for odd amounts
  return `${Math.round(rounded * 10) / 10}`
}

/** Scale an ingredient quantity by servings ratio and format with unit. */
export function formatIngredient(q: number, u: string, ratio = 1): string {
  const scaled = q * ratio
  const qty = formatQty(scaled)
  if (!u) return qty
  return `${qty} ${u}`
}

// ─── Ingredient index ──────────────────────────────────────────

export interface PantryEntry {
  name: string
  count: number // how many recipes use it
}

let pantryCache: PantryEntry[] | null = null

/** All unique ingredient names across the catalog, most-used first. */
export function pantryIndex(): PantryEntry[] {
  if (pantryCache) return pantryCache
  const map = new Map<string, number>()
  for (const r of RECIPES) {
    const seen = new Set<string>()
    for (const ing of r.ingredients) {
      const key = ing.n.toLowerCase()
      if (!seen.has(key)) {
        map.set(key, (map.get(key) ?? 0) + 1)
        seen.add(key)
      }
    }
  }
  pantryCache = [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  return pantryCache
}

// ─── Pantry matching ───────────────────────────────────────────

export interface PantryMatch {
  recipe: Recipe
  matched: string[]
  missing: string[]
  score: number // matched / total, 0..1
}

/** Common aliases so "green onion" finds "scallions", etc. */
const ALIASES: Record<string, string> = {
  'green onion': 'scallions',
  'spring onion': 'scallions',
  cilantro: 'cilantro',
  coriander: 'cilantro',
  chickpea: 'chickpeas',
  'garbanzo beans': 'chickpeas',
  prawns: 'shrimp',
  aubergine: 'eggplant',
  courgette: 'zucchini',
  capsicum: 'bell pepper',
  rocket: 'arugula',
  'powdered sugar': 'powdered sugar',
  'confectioners sugar': 'powdered sugar',
  'icing sugar': 'powdered sugar',
  'heavy cream': 'heavy cream',
  'double cream': 'heavy cream',
  'whipping cream': 'heavy cream',
}

function canon(name: string): string {
  const n = name.trim().toLowerCase()
  return ALIASES[n] ?? n
}

/** Rank recipes by how many of their ingredients the user already has. */
export function matchByPantry(have: string[]): PantryMatch[] {
  const haveSet = new Set(have.map(canon))
  const results: PantryMatch[] = []
  for (const r of RECIPES) {
    const matched: string[] = []
    const missing: string[] = []
    const seen = new Set<string>()
    for (const ing of r.ingredients) {
      const key = canon(ing.n)
      if (seen.has(key)) continue
      seen.add(key)
      // direct hit, or the user's item is contained in the ingredient name
      // ("rice" covers "jasmine rice"), but not the reverse for tiny names
      const hit =
        haveSet.has(key) ||
        [...haveSet].some((h) => h.length >= 4 && key.includes(h))
      if (hit) matched.push(ing.n)
      else missing.push(ing.n)
    }
    const total = matched.length + missing.length
    results.push({
      recipe: r,
      matched,
      missing,
      score: total === 0 ? 0 : matched.length / total,
    })
  }
  return results
    .filter((m) => m.matched.length > 0)
    .sort((a, b) => b.score - a.score || b.recipe.rating - a.recipe.rating)
}

// ─── Text search ───────────────────────────────────────────────

export function searchRecipes(query: string): Recipe[] {
  const q = query.trim().toLowerCase()
  if (!q) return RECIPES
  return RECIPES.filter((r) => {
    const hay = [
      r.title,
      r.description,
      r.cuisine,
      r.category,
      ...r.tags,
      ...r.ingredients.map((i) => i.n),
    ]
      .join(' ')
      .toLowerCase()
    return q.split(/\s+/).every((word) => hay.includes(word))
  })
}

export const ALL_CUISINES = [...new Set(RECIPES.map((r) => r.cuisine))].sort()
