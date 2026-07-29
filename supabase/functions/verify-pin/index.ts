import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let pin: string | undefined;
  try {
    const body = await req.json();
    pin = body?.pin;
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!pin || !/^\d{4}$/.test(pin)) {
    return new Response(JSON.stringify({ success: false, error: "Invalid PIN format" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use the auto-injected service role key — never exposed to the browser
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "admin_overview_pin")
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ success: false, error: "PIN not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const success = data.value === pin;

  return new Response(JSON.stringify({ success }), {
    status: success ? 200 : 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
