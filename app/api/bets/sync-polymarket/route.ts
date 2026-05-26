import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { privyServer } from "@/lib/privy-server";
import {
  doesBetMatchWinningToken,
  getPolymarketResolutionByConditionId,
} from "@/lib/polymarket";

type SyncBetBody = {
  betId?: string;
};

function logSyncRoute(message: string, data?: Record<string, unknown>) {
  console.log(`[sync-polymarket-route] ${message}`, data ?? "");
}

export async function POST(req: Request) {
  try {
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
      logSyncRoute("Missing access token");

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const verifiedClaims = await privyServer
      .utils()
      .auth()
      .verifyAuthToken(accessToken);

    const privyUserId = verifiedClaims.user_id;

    if (!privyUserId) {
      logSyncRoute("Missing Privy user id after token verification");

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SyncBetBody;

    if (!body.betId) {
      logSyncRoute("Missing bet ID in request body", {
        privyUserId,
      });

      return NextResponse.json({ error: "Missing bet ID." }, { status: 400 });
    }

    logSyncRoute("Request received", {
      betId: body.betId,
      privyUserId,
    });

    const { data: dbUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("privy_user_id", privyUserId)
      .maybeSingle();

    if (userError) {
      logSyncRoute("Supabase user lookup error", {
        betId: body.betId,
        privyUserId,
        error: userError.message,
      });

      throw userError;
    }

    if (!dbUser) {
      logSyncRoute("DB user not found", {
        betId: body.betId,
        privyUserId,
      });

      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const { data: bet, error: betError } = await supabaseAdmin
      .from("bets")
      .select(
        `
        id,
        user_id,
        status,
        polymarket_condition_id,
        polymarket_token_id,
        polymarket_outcome
      `
      )
      .eq("id", body.betId)
      .eq("user_id", dbUser.id)
      .maybeSingle();

    if (betError) {
      logSyncRoute("Supabase bet lookup error", {
        betId: body.betId,
        userId: dbUser.id,
        error: betError.message,
      });

      throw betError;
    }

    if (!bet) {
      logSyncRoute("Bet not found or does not belong to user", {
        betId: body.betId,
        userId: dbUser.id,
      });

      return NextResponse.json({ error: "Bet not found." }, { status: 404 });
    }

    logSyncRoute("Bet loaded", {
      betId: bet.id,
      userId: dbUser.id,
      status: bet.status,
      conditionId: bet.polymarket_condition_id,
      tokenId: bet.polymarket_token_id,
      outcome: bet.polymarket_outcome,
    });

    if (bet.status !== "open") {
      logSyncRoute("Bet is already settled", {
        betId: bet.id,
        status: bet.status,
      });

      return NextResponse.json(
        { error: "Bet is already settled." },
        { status: 400 }
      );
    }

    if (!bet.polymarket_condition_id) {
      logSyncRoute("Bet missing Polymarket condition id", {
        betId: bet.id,
      });

      return NextResponse.json(
        { error: "Bet is missing Polymarket condition id." },
        { status: 400 }
      );
    }

    if (!bet.polymarket_token_id && !bet.polymarket_outcome) {
      logSyncRoute("Bet missing Polymarket token/outcome data", {
        betId: bet.id,
        conditionId: bet.polymarket_condition_id,
      });

      return NextResponse.json(
        { error: "Bet is missing Polymarket token/outcome data." },
        { status: 400 }
      );
    }

    logSyncRoute("Starting Polymarket resolution lookup", {
      betId: bet.id,
      conditionId: bet.polymarket_condition_id,
      tokenId: bet.polymarket_token_id,
      outcome: bet.polymarket_outcome,
    });

    const resolution = await getPolymarketResolutionByConditionId(
      bet.polymarket_condition_id
    );

    logSyncRoute("Resolution result", {
      betId: bet.id,
      resolution,
    });

    if (!resolution.resolved) {
      const syncedAt = new Date().toISOString();

      const { error: updateUnresolvedError } = await supabaseAdmin
        .from("bets")
        .update({
          polymarket_synced_at: syncedAt,
          polymarket_resolution_error: resolution.reason,
        })
        .eq("id", bet.id);

      if (updateUnresolvedError) {
        logSyncRoute("Failed to update unresolved sync state", {
          betId: bet.id,
          error: updateUnresolvedError.message,
        });

        throw updateUnresolvedError;
      }

      logSyncRoute("Market unresolved; returning 409", {
        betId: bet.id,
        reason: resolution.reason,
        syncedAt,
      });

      return NextResponse.json(
        {
          ok: false,
          resolved: false,
          reason: resolution.reason,
        },
        { status: 409 }
      );
    }

    const didWin = doesBetMatchWinningToken({
      betTokenId: bet.polymarket_token_id,
      betOutcome: bet.polymarket_outcome,
      winningTokenId: resolution.winningTokenId,
      winningOutcome: resolution.winningOutcome,
    });

    const result = didWin ? "won" : "lost";

    logSyncRoute("Settlement decision", {
      betId: bet.id,
      betTokenId: bet.polymarket_token_id,
      betOutcome: bet.polymarket_outcome,
      winningTokenId: resolution.winningTokenId,
      winningOutcome: resolution.winningOutcome,
      didWin,
      result,
    });

    const { error: settleError } = await supabaseAdmin.rpc(
      "settle_bet_for_user",
      {
        p_user_id: dbUser.id,
        p_bet_id: bet.id,
        p_result: result,
        p_cashout_amount: null,
        p_skip_rule_eval: false,
      }
    );

    if (settleError) {
      logSyncRoute("Failed to settle bet via RPC", {
        betId: bet.id,
        userId: dbUser.id,
        result,
        error: settleError.message,
      });

      throw settleError;
    }

    const syncedAt = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("bets")
      .update({
        polymarket_synced_at: syncedAt,
        polymarket_resolution_source: "polymarket_clob_gamma",
        polymarket_winning_token_id: resolution.winningTokenId,
        polymarket_winning_outcome: resolution.winningOutcome,
        polymarket_resolution_error: null,
      })
      .eq("id", bet.id);

    if (updateError) {
      logSyncRoute("Failed to update resolved Polymarket metadata", {
        betId: bet.id,
        error: updateError.message,
      });

      throw updateError;
    }

    logSyncRoute("Sync complete", {
      betId: bet.id,
      result,
      winningTokenId: resolution.winningTokenId,
      winningOutcome: resolution.winningOutcome,
      syncedAt,
    });

    return NextResponse.json({
      ok: true,
      resolved: true,
      result,
      winningTokenId: resolution.winningTokenId,
      winningOutcome: resolution.winningOutcome,
    });
  } catch (error) {
    console.error("[sync-polymarket-route] Sync Polymarket bet error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to sync Polymarket bet.",
      },
      { status: 500 }
    );
  }
}