import type { Recipe, Ingredient } from '../types/recipe';
import type { ProductWithDetails } from '../types';

/**
 * Given a recipe and the current product catalog, return the products
 * whose name matches an ingredient in the recipe. Used to build the
 * "Shop these spices" cross-link on recipe detail pages.
 */
export function productsForRecipe(
  recipe: Recipe,
  products: ProductWithDetails[]
): ProductWithDetails[] {
  const ingredientKeys = new Set(
    recipe.ingredients.map((i) => i.n.trim().toLowerCase())
  );
  return products.filter((p) => {
    const name = p.name.toLowerCase();
    for (const key of ingredientKeys) {
      if (name === key || name.includes(key) || key.includes(name)) return true;
    }
    return false;
  });
}

/**
 * Given a single product and all recipes, return recipes whose
 * ingredient list mentions this product. Used on product detail
 * pages to show "Try this in..." recipe cards.
 */
export function recipesForProduct(
  product: { name: string },
  recipes: Recipe[],
  limit = 3
): Recipe[] {
  const productName = product.name.toLowerCase().trim();
  const scored = recipes
    .map((r) => {
      const hit = r.ingredients.some((ing: Ingredient) => {
        const n = ing.n.toLowerCase();
        return n === productName || n.includes(productName) || productName.includes(n);
      });
      return { r, hit };
    })
    .filter(({ hit }) => hit)
    .map(({ r }) => r);

  return scored.slice(0, limit);
}
