import type { Entry } from './entry';

/**
 * Filter parameters accepted by the analytics query.
 *
 * `from` / `to` are ISO date strings bounding the query range. `category`,
 * `subcategory` and `context` are optional narrowing filters.
 */
export type AnalyticsFilterParams = {
  from: string;
  to: string;
  category?: string;
  subcategory?: string;
  context?: string;
};

/**
 * A totals breakdown — an array of label/value pairs (e.g. one row per category).
 * This is a type alias to an array, not an interface/object shape.
 */
export type AnalyticsTotals = Array<{ label: string; value: number }>;

/**
 * The full analytics response: aggregate totals plus the underlying entries
 * that produced them.
 */
export type AnalyticsResponse = {
  totals: AnalyticsTotals;
  entries: Entry[];
};
