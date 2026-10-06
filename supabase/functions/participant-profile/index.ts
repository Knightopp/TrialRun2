import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getServiceKey(): string | null {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
    return Object.values(keys).find((value) => typeof value === "string") ?? null;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = getServiceKey();
    const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!supabaseUrl || !serviceKey) return json({ success: false, error: "Server configuration error." }, 500);
    if (!token) return json({ success: false, error: "Please verify your email to access your profile." }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const email = authData.user?.email?.trim().toLowerCase();
    if (authError || !authData.user || !email || !authData.user.email_confirmed_at) {
      return json({ success: false, error: "Please verify your email to access your profile." }, 401);
    }

    const body = await req.json();
    const action = body?.action;
    if (action !== "get" && action !== "save") return json({ success: false, error: "Invalid profile action." }, 400);

    let { data: participant, error: participantError } = await admin
      .from("participants")
      .select("id, participant_code, name, email, phone, college, department, year, pass_token")
      .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
      .maybeSingle();
    if (participantError) {
      console.error("Participant lookup failed:", participantError);
      return json({ success: false, error: "Could not load your participant profile." }, 503);
    }

    if (action === "save") {
      const profile = body?.profile ?? {};
      const name = typeof profile.name === "string" ? profile.name.trim() : "";
      const phone = typeof profile.phone === "string" ? profile.phone.trim().slice(0, 20) : "";
      const college = typeof profile.college === "string" ? profile.college.trim().slice(0, 150) : "";
      if (name.length < 2 || name.length > 100 || !phone || !college) {
        return json({ success: false, error: "Name, phone number, and college are required." }, 400);
      }

      if (participant) {
        const { data, error } = await admin
          .from("participants")
          .update({ name, phone, college })
          .eq("id", participant.id)
          .select("id, participant_code, name, email, phone, college, department, year, pass_token")
          .single();
        if (error) {
          console.error("Participant profile update failed:", error);
          return json({ success: false, error: "Could not save your profile." }, 500);
        }
        participant = data;
      } else {
        const { data: code, error: codeError } = await admin.rpc("fn_generate_participant_code");
        if (codeError || typeof code !== "string" || !code) {
          console.error("Participant code generation failed:", codeError);
          return json({ success: false, error: "Could not create your participant profile." }, 503);
        }
        const { data, error } = await admin
          .from("participants")
          .insert({
            participant_code: code,
            name,
            email,
            phone,
            college,
            department: "N/A",
            year: "2026",
          })
          .select("id, participant_code, name, email, phone, college, department, year, pass_token")
          .single();
        if (error) {
          console.error("Participant profile creation failed:", error);
          return json({ success: false, error: "Could not create your participant profile." }, 500);
        }
        participant = data;
      }
    }

    let registrations: unknown[] = [];
    if (participant) {
      const { data, error } = await admin
        .from("registrations")
        .select("*, events(*)")
        .eq("participant_id", participant.id)
        .order("registered_at", { ascending: false });
      if (error) {
        console.error("Participant registration lookup failed:", error);
        return json({ success: false, error: "Could not load your event registrations." }, 503);
      }
      registrations = data ?? [];
    }
    return json({ success: true, participant, registrations });
  } catch (error) {
    console.error("Unexpected participant-profile error:", error);
    return json({ success: false, error: "Could not process your profile request." }, 500);
  }
});
