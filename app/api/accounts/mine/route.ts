import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { privyServer } from "@/lib/privy-server";

export async function GET() {
  try {
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const verifiedClaims = await privyServer
      .utils()
      .auth()
      .verifyAuthToken(accessToken);

    const privyUserId = verifiedClaims.user_id;

    if (!privyUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: dbUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("privy_user_id", privyUserId)
      .maybeSingle();

    if (userError) throw userError;

    if (!dbUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from("challenge_accounts")
      .select(
        `
        id,
        plan_key,
        plan_size,
        one_time_fee,
        status,
        starting_balance,
        current_balance,
        reserved_risk,
        realized_pnl,

        profit_target_percent,
        daily_drawdown_percent,
        total_drawdown_percent,

        max_risk_amount,
        daily_loss_limit_amount,
        total_loss_limit_amount,

        passed_at,
        failed_at,
        failure_reason,
        created_at
      `
      )
      .eq("user_id", dbUser.id)
      .order("created_at", { ascending: false });

    if (accountsError) throw accountsError;

    return NextResponse.json({
      accounts: accounts ?? [],
    });
  } catch (error) {
    console.error("Load accounts error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load accounts.",
      },
      { status: 500 }
    );
  }
}