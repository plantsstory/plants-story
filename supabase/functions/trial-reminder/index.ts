import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Trial Reminder Edge Function
 *
 * Sends email reminders to users whose free trial ends in 5 days.
 * Triggered daily by pg_cron via pg_net or external cron.
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 *
 * Invoke: POST /functions/v1/trial-reminder
 *   Header: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 */

const FROM_EMAIL = "Plants Story <noreply@plantsstory.com>";
const SITE_URL = "https://plantsstory.com";

serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify this is called with service_role key (internal only)
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey
  );

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set");
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Find users whose trial ends in exactly 5 days (between 4.5 and 5.5 days from now)
    const now = new Date();
    const reminderStart = new Date(now.getTime() + 4.5 * 24 * 60 * 60 * 1000);
    const reminderEnd = new Date(now.getTime() + 5.5 * 24 * 60 * 60 * 1000);

    const { data: trialUsers, error: queryError } = await supabase
      .from("subscriptions")
      .select("user_id, current_period_end, plan")
      .eq("status", "trialing")
      .gte("current_period_end", reminderStart.toISOString())
      .lt("current_period_end", reminderEnd.toISOString());

    if (queryError) {
      console.error("Query error:", queryError);
      return new Response(JSON.stringify({ error: "Database query failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!trialUsers || trialUsers.length === 0) {
      console.log("No trial users to remind today");
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const sub of trialUsers) {
      // Get user email from auth.users via admin API
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(sub.user_id);

      if (userError || !userData?.user?.email) {
        console.error(`Could not get email for user ${sub.user_id}:`, userError);
        errorCount++;
        continue;
      }

      const email = userData.user.email;
      const trialEndDate = new Date(sub.current_period_end);
      const formattedDate = `${trialEndDate.getFullYear()}年${trialEndDate.getMonth() + 1}月${trialEndDate.getDate()}日`;

      // Get display name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", sub.user_id)
        .single();

      const displayName = profile?.display_name || "ユーザー";

      // Send email via Resend
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: `【Plants Story】無料トライアルが${formattedDate}に終了します`,
          html: buildReminderHtml(displayName, formattedDate),
        }),
      });

      if (emailRes.ok) {
        sentCount++;
        console.log(`Reminder sent to ${email}`);
      } else {
        const errBody = await emailRes.text();
        console.error(`Failed to send to ${email}:`, errBody);
        errorCount++;
      }
    }

    console.log(`Trial reminders: ${sentCount} sent, ${errorCount} errors`);
    return new Response(JSON.stringify({ sent: sentCount, errors: errorCount }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Trial reminder error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function buildReminderHtml(name: string, endDate: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#2d6a4f,#40916c);padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">🌿 Plants Story</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="font-size:16px;color:#333;margin:0 0 16px;">${name} さん、こんにちは。</p>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">
        ご利用中の<strong>無料トライアル</strong>は <strong style="color:#d62828;">${endDate}</strong> に終了いたします。
      </p>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">
        トライアル終了後は自動的にご登録のプランへ移行し、お支払いが開始されます。
        続けてご利用いただける場合は、特にお手続きは不要です。
      </p>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">
        解約をご希望の場合は、トライアル終了前にマイページから手続きをお願いいたします。
        解約後もトライアル期間中は引き続きご利用いただけます。
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${SITE_URL}" style="display:inline-block;background:#40916c;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:bold;">
          Plants Story を開く
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="font-size:12px;color:#999;line-height:1.6;margin:0;">
        このメールは Plants Story の無料トライアルをご利用中のお客様にお送りしています。<br>
        ご不明な点がございましたら <a href="mailto:plantsstory2026@gmail.com" style="color:#40916c;">plantsstory2026@gmail.com</a> までお問い合わせください。
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}
