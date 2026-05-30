import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

/**
 * GET /api/customers
 * Return all customer profiles enriched with order stats + referral code.
 * Uses service-role key — bypasses RLS entirely.
 */
router.get("/", async (_req: Request, res: Response) => {
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  if (!profiles || profiles.length === 0) return res.json([]);

  // Enrich each profile with order stats and referral code in parallel
  const enriched = await Promise.all(
    profiles.map(async (p: any) => {
      const [{ data: orders }, { data: ref }] = await Promise.all([
        supabaseAdmin.from("orders").select("total").eq("user_id", p.id),
        supabaseAdmin.from("referral_codes").select("code, total_referrals").eq("user_id", p.id).single(),
      ]);
      return {
        ...p,
        orderCount: orders?.length ?? 0,
        totalSpent: orders?.reduce((s: number, o: any) => s + Number(o.total), 0) ?? 0,
        referralCode: ref?.code ?? null,
        referralCount: ref?.total_referrals ?? 0,
      };
    })
  );

  return res.json(enriched);
});

/**
 * GET /api/customers/:id/orders
 * Return recent orders for a specific customer.
 */
router.get("/:id/orders", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("user_id", req.params.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

export default router;
