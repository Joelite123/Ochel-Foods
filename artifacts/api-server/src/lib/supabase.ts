import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase env vars not set: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

/** Admin client — full access, server-side only */
export const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);
