/// <reference types="https://deno.land/std@0.168.0/http/server.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EventType =
  | "auth.login_success"
  | "auth.login_failure"
  | "auth.session_expired"
  | "search.keyword"
  | "search.nav_tree"
  | "cart.item_added"
  | "cart.item_removed"
  | "cart.cart_view"
  | "cart.cart_abandoned"
  | "checkout.started"
  | "checkout.completed"
  | "checkout.failed"
  | "checkout.canceled"
  | "account.password_changed"
  | "account.admin_password_changed"
  | "account.password_set_to_default_zip"
  | "admin.action_performed"
  | "other.custom";

const VALID_EVENT_TYPES = new Set<EventType>([
  "auth.login_success",
  "auth.login_failure",
  "auth.session_expired",
  "search.keyword",
  "search.nav_tree",
  "cart.item_added",
  "cart.item_removed",
  "cart.cart_view",
  "cart.cart_abandoned",
  "checkout.started",
  "checkout.completed",
  "checkout.failed",
  "checkout.canceled",
  "account.password_changed",
  "account.admin_password_changed",
  "account.password_set_to_default_zip",
  "admin.action_performed",
  "other.custom",
]);

function parseIP(req: Request): string | null {
  const h = req.headers;
  const xff = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf;
  // Not always available in Edge Functions; store best-effort header set
  return null;
}

function getUserAgent(req: Request): string | null {
  return req.headers.get("user-agent");
}

function getPath(req: Request): string | null {
  try {
    const url = new URL(req.url);
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Supabase configuration missing" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Input shape
    const eventTypeInput: string | undefined = body.eventType;
    const accountNumber: number | null = body.accountNumber ?? null;
    const emailAddress: string | null = body.emailAddress ?? null;
    const sessionId: string | null = body.sessionId ?? null;
    const requestId: string | null = body.requestId ?? crypto.randomUUID();
    const referrer: string | null = body.referrer ?? req.headers.get("referer");
    const createdBy: string | null = body.createdBy ?? "edge";
    const isInternal: boolean = !!body.isInternal;

    // Ensure metadata object
    const inputMetadata: Record<string, unknown> = (typeof body.metadata === "object" && body.metadata) ? body.metadata : {};

    // Auth context flags: "standard" | "master_override" | "zip_password" | "special_admin"
    // Caller can pass either authContext.method or loginType (for compatibility with existing code)
    const authMethodRaw: string | undefined =
      body?.authContext?.method ??
      body?.loginType; // compatible with authenticate-with-master-password response
    const normalizedAuthMethod = (() => {
      switch ((authMethodRaw || "").toLowerCase()) {
        case "regular":
        case "standard":
          return "standard";
        case "master_override":
        case "special_admin": // map to override to make it explicit
          return "master_override";
        case "zip_password":
        case "master_password": // compatibility name
          return "zip_password";
        default:
          return undefined;
      }
    })();

    // Best-effort path and UA/IP capture
    const ip = parseIP(req);
    const userAgent = getUserAgent(req);
    const path = getPath(req);

    // Incorporate additional context into metadata (non-destructive)
    const metadata = {
      ...inputMetadata,
      auth: {
        ...(typeof inputMetadata.auth === "object" ? inputMetadata.auth as Record<string, unknown> : {}),
        method: normalizedAuthMethod ?? (inputMetadata as any)?.auth?.method ?? null,
      },
      http: {
        ...(typeof inputMetadata.http === "object" ? inputMetadata.http as Record<string, unknown> : {}),
        referrer: referrer ?? (inputMetadata as any)?.http?.referrer ?? null,
      },
    };

    // Validate/normalize event type
    let eventType: EventType = "other.custom";
    if (typeof eventTypeInput === "string" && VALID_EVENT_TYPES.has(eventTypeInput as EventType)) {
      eventType = eventTypeInput as EventType;
    }

    // Call PostgREST RPC to invoke security definer DB function
    const rpcUrl = `${supabaseUrl}/rest/v1/rpc/log_event`;

    const rpcPayload = {
      p_event_type: eventType,
      p_account_number: accountNumber,
      p_email_address: emailAddress,
      p_session_id: sessionId,
      p_request_id: requestId,
      p_ip: ip,
      p_user_agent: userAgent,
      p_path: path,
      p_referrer: referrer,
      p_metadata: metadata,
      p_created_by: createdBy,
      p_is_internal: isInternal,
    };

    const rpcRes = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rpcPayload),
    });

    if (!rpcRes.ok) {
      const errText = await rpcRes.text().catch(() => "");
      console.error("Failed to log event via RPC:", rpcRes.status, errText);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to log event",
          status: rpcRes.status,
          details: errText,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    const rpcData = await rpcRes.json().catch(() => null);
    // PostgREST returns scalar results directly; it might be { log_event: id } or id depending on configuration.
    const insertedId = typeof rpcData === "number"
      ? rpcData
      : (rpcData?.log_event ?? null);

    return new Response(
      JSON.stringify({
        success: true,
        id: insertedId,
        stored: {
          eventType,
          accountNumber,
          emailAddress,
          sessionId,
          requestId,
          ip,
          userAgent,
          path,
          referrer,
          metadata,
          createdBy,
          isInternal,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error in log-event Edge Function:", errMsg);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
