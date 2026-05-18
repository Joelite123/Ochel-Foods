import { createClient } from "@supabase/supabase-js";
import { WebSocket as WsWebSocket } from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as unknown as Record<string, unknown>).WebSocket = WsWebSocket;
}

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
