import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

/** GET /api/menu — returns all active categories + available products */
router.get("/", async (_req: Request, res: Response) => {
  const [catsResult, prodsResult] = await Promise.all([
    supabaseAdmin
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabaseAdmin
      .from("products")
      .select("*")
      .eq("is_available", true)
      .order("sort_order"),
  ]);

  if (catsResult.error) {
    return res
      .status(500)
      .json({ error: catsResult.error.message });
  }
  if (prodsResult.error) {
    return res
      .status(500)
      .json({ error: prodsResult.error.message });
  }

  return res.json({
    categories: catsResult.data ?? [],
    products: prodsResult.data ?? [],
  });
});

/** GET /api/menu/promotions — returns active promotions */
router.get("/promotions", async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("promotions")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

/** GET /api/menu/operating-hours — returns all operating hours */
router.get("/operating-hours", async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("operating_hours")
    .select("*")
    .order("day_of_week");

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

/** GET /api/menu/delivery-zones — returns active delivery zones */
router.get("/delivery-zones", async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("delivery_zones")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

export default router;
