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

    const betSelect = `
      id,
      account_id,
      game_id,
      league,
      market,
      selection,
      odds,
      stake,
      potential_profit,
      potential_payout,
      status,
      result,
      settlement_amount,
      placed_at,
      settled_at,
      team_logo,
      team_logo_alt,

      polymarket_condition_id,
      polymarket_token_id,
      polymarket_outcome,
      polymarket_synced_at,
      polymarket_winning_token_id,
      polymarket_winning_outcome,
      polymarket_resolution_error,

      challenge_accounts (
        account_name,
        plan_key,
        plan_size
      )
    `;

    const { data: openBets, error: openError } = await supabaseAdmin
      .from("bets")
      .select(betSelect)
      .eq("user_id", dbUser.id)
      .eq("status", "open")
      .order("placed_at", { ascending: false });

    if (openError) throw openError;

    const { data: pastBets, error: pastError } = await supabaseAdmin
      .from("bets")
      .select(betSelect)
      .eq("user_id", dbUser.id)
      .in("status", ["won", "lost", "void", "cashed_out"])
      .order("settled_at", { ascending: false });

    if (pastError) throw pastError;

    return NextResponse.json({
      openBets: openBets ?? [],
      pastBets: pastBets ?? [],
    });
  } catch (error) {
    console.error("Load portfolio error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load portfolio.",
      },
      { status: 500 }
    );
  }
}
