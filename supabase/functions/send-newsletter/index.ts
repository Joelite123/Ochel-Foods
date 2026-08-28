import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 2. Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Verify Admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Parse request payload
    const { subject, body } = await req.json();
    if (!subject || !body) {
      return new Response(JSON.stringify({ error: "Subject and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Get active subscribers
    const { data: subscribers, error: subErr } = await adminClient
      .from("newsletter_subscribers")
      .select("email, name")
      .eq("is_active", true);

    if (subErr || !subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ error: "No active subscribers found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Configure Zoho SMTP transporter
    const smtpHost = Deno.env.get("SMTP_HOST") || "smtppro.zoho.com";
    const smtpPort = Number(Deno.env.get("SMTP_PORT") || 465);
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpFrom = Deno.env.get("SMTP_FROM") || smtpUser || "noreply@ochelfoods.com";

    if (!smtpUser || !smtpPass) {
      return new Response(
        JSON.stringify({ error: "SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for port 465 (SSL), false for port 587 (STARTTLS)
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // 7. Dispatch emails
    let sentCount = 0;
    let failedCount = 0;

    for (const sub of subscribers) {
      try {
        await transporter.sendMail({
          from: `O'chel Foods <${smtpFrom}>`,
          to: sub.email,
          subject: subject,
          text: body,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
            <div style="background:#E8192C;padding:24px;text-align:center;border-radius:8px 8px 0 0">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:bold">O'chel Foods</h1>
            </div>
            <div style="padding:28px;background:#ffffff;border:1px solid #eeeeee;border-top:none;line-height:1.6">
              ${body
                .split("\n")
                .map((line: string) => (line.trim() ? `<p style="margin:0 0 14px 0">${line}</p>` : "<br/>"))
                .join("")}
            </div>
            <div style="padding:16px;background:#f9f9f9;text-align:center;font-size:12px;color:#888;border-radius:0 0 8px 8px">
              <p style="margin:0 0 4px 0">You are receiving this because you subscribed to O'chel Foods updates.</p>
              <p style="margin:0">O'chel Foods | +234 905 635 1651</p>
            </div>
          </div>`,
        });
        sentCount++;
      } catch (sendErr) {
        console.error(`Failed to send to ${sub.email}:`, sendErr);
        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: subscribers.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
