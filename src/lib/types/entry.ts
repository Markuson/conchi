/**
 * The canonical shape of a single expense/income entry.
 *
 * `userId` is a required field from day one — every callsite must supply it, enforced by
 * the compiler (no `?`, no default, no `as any` / `@ts-ignore` workaround permitted).
 */
export type Entry = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: string;
  subcategory: string;
  description: string;
  date: string;
  context?: string;
  fileUrl?: string;
  origin: 'app';
};
