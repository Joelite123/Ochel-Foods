/**
 * Shared promotions cache — same pattern as useMenuData.ts.
 *
 * Fetches active promotions from Supabase exactly once per session.
 * Both PromoBanner and CartPanel consume this; each applies its own
 * additional filtering on top of the date-validated results returned here.
 */

import { supabase } from "./supabase";
import type { DBPromotion } from "./supabase";

let cachedPromos: DBPromotion[] | null = null;
let fetchPromise: Promise<DBPromotion[]> | null = null;

function filterByDate(promos: DBPromotion[]): DBPromotion[] {
  const now = new Date();
  return promos.filter((p) => {
    if (p.starts_at && new Date(p.starts_at) > now) return false;
    if (p.ends_at && new Date(p.ends_at) < now) return false;
    return true;
  });
}

/**
 * Returns all currently active, date-valid promotions.
 * Hits Supabase only on the first call; subsequent calls resolve instantly
 * from the module-level cache. Concurrent callers share the same in-flight
 * request via `fetchPromise` so there is at most one network round-trip.
 */
export async function getActivePromos(): Promise<DBPromotion[]> {
  if (cachedPromos) return cachedPromos;

  if (!fetchPromise) {
    // Wrap in Promise.resolve so fetchPromise is a native Promise (not a
    // PromiseLike), which satisfies TypeScript and allows .catch chaining.
    fetchPromise = Promise.resolve(
      supabase
        .from("promotions")
        .select("*")
        .eq("is_active", true)
    ).then(({ data }) => {
      const valid = filterByDate((data as DBPromotion[]) ?? []);
      cachedPromos = valid;
      fetchPromise = null;
      return valid;
    });
  }

  // Capture in a local variable so TypeScript knows it can't be null here.
  const pending = fetchPromise;
  return pending;
}

/** Call after an admin saves/updates a promotion so the next read re-fetches. */
export function invalidatePromosCache(): void {
  cachedPromos = null;
}
