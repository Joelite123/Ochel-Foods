import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

/** POST /api/subscribe — public newsletter subscribe endpoint */
router.post("/", async (req: Request, res: Response) => {
  const { email, name } = req.body as { email?: string; name?: string };
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email required" });
  }

  const { error } = await supabaseAdmin.from("newsletter_subscribers").upsert(
    { email: email.toLowerCase(), name: name || null, is_active: true },
    { onConflict: "email" }
  );

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

export default router;
