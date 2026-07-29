import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

/**
 * POST /api/admin/verify-pin
 * Verifies the admin dashboard PIN without ever exposing the stored value.
 * The PIN is read from app_settings (key = "admin_overview_pin") using the
 * service-role key, so RLS blocks any direct frontend access to the table.
 */
router.post("/verify-pin", async (req: Request, res: Response) => {
  const { pin } = req.body as { pin?: string };

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ success: false, error: "Invalid PIN format" });
  }

  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "admin_overview_pin")
    .single();

  if (error || !data) {
    return res.status(503).json({ success: false, error: "PIN not configured" });
  }

  if (data.value === pin) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, error: "Incorrect PIN" });
});

export default router;
