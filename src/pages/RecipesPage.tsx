import { useMemo, useState } from 'react';
import { Clock, Users } from 'lucide-react';
import { RECIPES } from '../data/recipes';
import { ALL_CUISINES } from '../lib/recipe-utils';
import Reveal from '../components/Reveal';
import PantryMatch from '../components/PantryMatch';
import { recipeImage } from '../lib/recipeImages';

interface RecipesPageProps {
  onNavigateToRecipe: (id: string) => void;
  initialCuisine?: string;
}

export default function RecipesPage({
  onNavigateToRecipe,
  initialCuisine = 'all',
}: RecipesPageProps) {
  const [cuisine, setCuisine] = useState<string>(initialCuisine);

  const filtered = useMemo(() => {
    if (cuisine === 'all') return RECIPES;
    return RECIPES.filter((r) => r.cuisine === cuisine);
  }, [cuisine]);

  return (
    <div className="min-h-screen bg-cream">
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <Reveal className="max-w-3xl">
          <p className="text-saffron text-xs font-semibold tracking-[0.25em] uppercase mb-3">
            Cook with what you buy
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-ink mb-4 leading-tight">
            Recipes from every kitchen the spice cabinet visits.
          </h1>
          <p className="text-gray-600 text-lg">
            A working set of dishes across sixteen cuisines — filter by the
            kitchen you cook in most.
          </p>
        </Reveal>
      </section>

      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Reveal>
          <PantryMatch onNavigateToRecipe={onNavigateToRecipe} />
        </Reveal>
      </section>

      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="flex flex-wrap gap-2 border-b border-ink/10 pb-6">
          <button
            onClick={() => setCuisine('all')}
            className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
              cuisine === 'all'
                ? 'bg-ink text-cream border-ink'
                : 'bg-transparent text-ink border-ink/20 hover:border-ink/50'
            }`}
          >
            All ({RECIPES.length})
          </button>
          {ALL_CUISINES.map((c) => {
            const count = RECIPES.filter((r) => r.cuisine === c).length;
            return (
              <button
                key={c}
                onClick={() => setCuisine(c)}
                className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                  cuisine === c
                    ? 'bg-ink text-cream border-ink'
                    : 'bg-transparent text-ink border-ink/20 hover:border-ink/50'
                }`}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {filtered.length === 0 ? (
          <p className="text-center py-16 text-gray-500">
            No recipes yet for this cuisine.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((r, i) => (
              <Reveal key={r.id} delayMs={Math.min(i, 6) * 60}>
                <button
                  onClick={() => onNavigateToRecipe(r.id)}
                  className="group text-left w-full bg-white rounded-2xl border border-black/5 hover:shadow-xl hover:shadow-ink/10 transition-all duration-500 overflow-hidden h-full flex flex-col"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-cream-soft">
                    <img
                      src={recipeImage(r.id)}
                      alt={r.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute bottom-2 right-2 text-2xl drop-shadow-md">
                      {r.emoji}
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <span className="text-saffron font-semibold tracking-wide uppercase">
                        {r.cuisine}
                      </span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">{r.category}</span>
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-ink mb-2 group-hover:text-moss transition-colors">
                      {r.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-4 flex-1">
                      {r.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-black/5">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {r.prepTime + r.cookTime} min
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Serves {r.servings}
                      </span>
                      <span className="ml-auto text-ink font-medium">{r.difficulty}</span>
                    </div>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
