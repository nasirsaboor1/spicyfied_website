import { useEffect, useState } from 'react';
import { ChevronLeft, Clock, Users, ChefHat, Timer } from 'lucide-react';
import { RECIPES } from '../data/recipes';
import type { Recipe } from '../types/recipe';
import { formatIngredient, formatTime } from '../lib/recipe-utils';
import { productsForRecipe } from '../lib/recipeMatch';
import { recipeImage } from '../lib/recipeImages';
import { fetchProductsWithDetails } from '../lib/products';
import type { ProductWithDetails } from '../types';

interface RecipeDetailPageProps {
  recipeId: string;
  onNavigateBack: () => void;
  onNavigateToProduct: (slug: string) => void;
}

export default function RecipeDetailPage({
  recipeId,
  onNavigateBack,
  onNavigateToProduct,
}: RecipeDetailPageProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [shopThese, setShopThese] = useState<ProductWithDetails[]>([]);
  const [servings, setServings] = useState(1);

  useEffect(() => {
    const r = RECIPES.find((x) => x.id === recipeId) || null;
    setRecipe(r);
    if (r) setServings(r.servings);

    if (r) {
      // Fetch the live catalog and match ingredients to products.
      // Fails silently — if the match section can't populate, the rest
      // of the recipe still works.
      fetchProductsWithDetails()
        .then((products) => setShopThese(productsForRecipe(r, products)))
        .catch(() => setShopThese([]));
    }
  }, [recipeId]);

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ink mb-4">Recipe not found</h2>
          <button
            onClick={onNavigateBack}
            className="px-6 py-3 bg-ink text-cream rounded-lg font-semibold hover:bg-ink-light transition-colors"
          >
            Back to Recipes
          </button>
        </div>
      </div>
    );
  }

  const ratio = servings / recipe.servings;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button
          onClick={onNavigateBack}
          className="flex items-center gap-2 text-ink hover:text-moss transition-colors mb-6 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          All Recipes
        </button>

        <div className="rounded-2xl overflow-hidden aspect-[21/9] mb-8 bg-cream-soft">
          <img
            src={recipeImage(recipe.id)}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>

        <header className="mb-10">
          <p className="text-saffron text-xs font-semibold tracking-[0.25em] uppercase mb-3">
            {recipe.cuisine} · {recipe.category}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-ink leading-tight mb-4">
            {recipe.title}
          </h1>
          <p className="text-gray-700 text-lg leading-relaxed max-w-2xl">
            {recipe.description}
          </p>

          <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-ink/10 text-sm">
            <span className="flex items-center gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-saffron" />
              <span>
                <strong>{formatTime(recipe.prepTime)}</strong> prep
              </span>
            </span>
            <span className="flex items-center gap-2 text-gray-700">
              <Timer className="w-4 h-4 text-saffron" />
              <span>
                <strong>{formatTime(recipe.cookTime)}</strong> cook
              </span>
            </span>
            <span className="flex items-center gap-2 text-gray-700">
              <ChefHat className="w-4 h-4 text-saffron" />
              <strong>{recipe.difficulty}</strong>
            </span>
            <div className="flex items-center gap-3 ml-auto">
              <Users className="w-4 h-4 text-saffron" />
              <button
                type="button"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                className="w-7 h-7 rounded-full border border-ink/20 hover:border-ink flex items-center justify-center text-sm font-bold"
                aria-label="Decrease servings"
              >
                −
              </button>
              <span className="text-ink font-semibold min-w-[80px] text-center">
                {servings} {servings === 1 ? 'serving' : 'servings'}
              </span>
              <button
                type="button"
                onClick={() => setServings((s) => s + 1)}
                className="w-7 h-7 rounded-full border border-ink/20 hover:border-ink flex items-center justify-center text-sm font-bold"
                aria-label="Increase servings"
              >
                +
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-10">
          <section className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="font-serif text-2xl font-semibold text-ink mb-4">
              Ingredients
            </h2>
            <ul className="space-y-2.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-baseline gap-3 text-sm">
                  <span className="font-semibold text-ink whitespace-nowrap min-w-[80px]">
                    {formatIngredient(ing.q, ing.u, ratio)}
                  </span>
                  <span className="text-gray-700">
                    {ing.n}
                    {ing.note && (
                      <span className="text-gray-500 italic">, {ing.note}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-ink mb-4">
              Method
            </h2>
            <ol className="space-y-5">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-ink text-cream font-serif text-sm font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-800 leading-relaxed">{step.text}</p>
                    {step.timer && (
                      <p className="flex items-center gap-1.5 text-xs text-saffron font-semibold mt-1.5">
                        <Timer className="w-3.5 h-3.5" />
                        {step.timer} min timer
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {shopThese.length > 0 && (
          <section className="mt-16 pt-10 border-t border-ink/10">
            <p className="text-saffron text-xs font-semibold tracking-[0.25em] uppercase mb-2">
              From our shelf
            </p>
            <h2 className="font-serif text-3xl font-semibold text-ink mb-6">
              The spices you'll need.
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {shopThese.map((p) => {
                const img =
                  p.images.find((i) => i.sort_order === 1) || p.images[0];
                const minPrice = p.variants.length
                  ? Math.min(...p.variants.map((v) => v.price))
                  : 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => onNavigateToProduct(p.slug)}
                    className="group text-left bg-white rounded-xl border border-black/5 overflow-hidden hover:shadow-lg transition-all"
                  >
                    <div className="aspect-square bg-cream-soft overflow-hidden">
                      {img && (
                        <img
                          src={img.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-serif text-base font-semibold text-ink group-hover:text-moss transition-colors line-clamp-1">
                        {p.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        from ₹{Math.round(minPrice)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
