/** Real food photography for every recipe, ported from the source
 * recipe repo (public/images/recipes/{id}.jpg). Same owner, no
 * attribution issue. */
export function recipeImage(id: string): string {
  return `/images/recipes/${id}.jpg`;
}
