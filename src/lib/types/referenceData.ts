/**
 * A single expense/income category and the subcategories available under it.
 * String-based (no IDs), matching `Entry`'s own `category`/`subcategory`
 * fields — the reference-data store nests this shape directly, no lookup
 * table, so Story 2.3's category-filtered-subcategory picker can index
 * straight off `name`.
 */
export type Category = {
  name: string;
  subcategories: string[];
};
