import { useMemo, useState } from 'react';
import { X, Clock, Users, ChefHat } from 'lucide-react';
import { pantryIndex, matchByPantry } from '../lib/recipe-utils';

interface PantryMatchProps {
  onNavigateToRecipe: (id: string) => void;
}

const QUICK_ADD_COUNT = 14;

export default function PantryMatch({ onNavigateToRecipe }: PantryMatchProps) {
  const [have, setHave] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const suggestions = useMemo(() => pantryIndex().slice(0, QUICK_ADD_COUNT), []);

  const matches = useMemo(() => {
    if (have.length === 0) return [];
    return matchByPantry(have).slice(0, 9);
  }, [have]);

  const addIngredient = (name: string) => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed || have.includes(trimmed)) return;
    setHave((h) => [...h, trimmed]);
    setInput('');
  };

  const removeIngredient = (name: string) => {
    setHave((h) => h.filter((x) => x !== name));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addIngredient(input);
  };

  return (
    <div className="bg-ink text-cream rounded-3xl px-6 md:px-10 py-10 md:py-12">
      <p className="text-saffron-light text-xs font-semibold tracking-[0.25em] uppercase mb-3">
        No trip to the store needed
      </p>
      <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-3">
        What's in your kitchen?
      </h2>
      <p className="text-cream/70 max-w-xl mb-6">
        Add what you already have and we'll find what you can cook right now
        — sorted by how few things you're missing.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4 max-w-lg">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. chicken, garlic, rice..."
          className="flex-1 px-4 py-2.5 rounded-lg bg-cream/10 border border-cream/20 text-cream placeholder-cream/40 focus:outline-none focus:border-saffron-light transition-colors"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-saffron-light text-ink rounded-lg font-semibold text-sm hover:bg-saffron transition-colors"
        >
          Add
        </button>
      </form>

      {have.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {have.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1.5 bg-saffron-light/15 border border-saffron-light/40 text-saffron-light px-3 py-1.5 rounded-full text-sm capitalize"
            >
              {item}
              <button
                onClick={() => removeIngredient(item)}
                aria-label={`Remove ${item}`}
                className="hover:text-cream transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {have.length === 0 && (
        <div className="mb-2">
          <p className="text-xs text-cream/50 uppercase tracking-wide mb-2">
            Or tap what you usually have
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.name}
                onClick={() => addIngredient(s.name)}
                className="capitalize px-3 py-1.5 rounded-full text-sm border border-cream/20 text-cream/80 hover:border-saffron-light hover:text-saffron-light transition-colors"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {matches.length > 0 && (
        <div className="mt-8 pt-8 border-t border-cream/15">
          <p className="text-sm text-cream/60 mb-4">
            {matches.length} recipe{matches.length === 1 ? '' : 's'} you can make
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map(({ recipe, missing }) => (
              <button
                key={recipe.id}
                onClick={() => onNavigateToRecipe(recipe.id)}
                className="text-left bg-cream/5 hover:bg-cream/10 border border-cream/10 rounded-xl p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-serif text-lg font-semibold text-cream leading-tight">
                    {recipe.emoji} {recipe.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-cream/50 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {recipe.prepTime + recipe.cookTime} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {recipe.servings}
                  </span>
                  <span className="flex items-center gap-1">
                    <ChefHat className="w-3 h-3" />
                    {recipe.difficulty}
                  </span>
                </div>
                {missing.length === 0 ? (
                  <p className="text-xs font-semibold text-moss-light bg-moss/20 inline-block px-2 py-1 rounded-full">
                    You have everything
                  </p>
                ) : (
                  <p className="text-xs text-cream/60">
                    <span className="text-saffron-light font-semibold">
                      Missing {missing.length}:
                    </span>{' '}
                    {missing.slice(0, 3).join(', ')}
                    {missing.length > 3 ? '…' : ''}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
