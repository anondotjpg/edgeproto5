import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  doesBetMatchWinningToken,
  getPolymarketResolutionByConditionId,
} from "@/lib/polymarket";

export const dynamic = "force-dynamic";

type OpenPolymarketBet = {
  id: string;
  user_id: string;
  account_id: string;
  status: string;
  polymarket_condition_id: string | null;
  polymarket_token_id: string | null;
  polymarket_outcome: string | null;
};

type SyncResult = {
  betId?: string;
  accountId?: string;
  action: "settled" | "skipped" | "error" | "rules_evaluated";
  result?: "won" | "lost";
  reason?: string;
};

function isAuthorizedCronRequest(req: Request) {
  const cronSecret = process.env.CRON_SECRET;

  const authHeader = req.headers.get("authorization");
  const vercelCronHeader = req.headers.get("x-vercel-cron");

  // Allows Vercel Cron calls from vercel.json.
  if (vercelCronHeader === "1") {
    return true;
  }

  // Allows manual/local curl calls with Bearer token.
  if (!cronSecret) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

async function runPolymarketSettlementSync(req: Request) {
  try {
    if (!isAuthorizedCronRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: openBets, error: openBetsError } = await supabaseAdmin
      .from("bets")
      .select(
        `
        id,
        user_id,
        account_id,
        status,
        polymarket_condition_id,
        polymarket_token_id,
        polymarket_outcome
      `
      )
      .eq("status", "open")
      .not("polymarket_condition_id", "is", null)
      .limit(100);

    if (openBetsError) {
      throw openBetsError;
    }

    const results: SyncResult[] = [];
    const affectedAccountIds = new Set<string>();

    const resolutionCache = new Map<
      string,
      Awaited<ReturnType<typeof getPolymarketResolutionByConditionId>>
    >();

    for (const bet of (openBets ?? []) as OpenPolymarketBet[]) {
      try {
        const conditionId = bet.polymarket_condition_id;

        if (!conditionId) {
          results.push({
            betId: bet.id,
            action: "skipped",
            reason: "Missing condition id.",
          });
          continue;
        }

        if (!bet.polymarket_token_id && !bet.polymarket_outcome) {
          results.push({
            betId: bet.id,
            action: "skipped",
            reason: "Missing Polymarket token/outcome data.",
          });
          continue;
        }

        let resolution = resolutionCache.get(conditionId);

        if (!resolution) {
          resolution = await getPolymarketResolutionByConditionId(conditionId);
          resolutionCache.set(conditionId, resolution);
        }

        if (!resolution.resolved) {
          const { error: unresolvedUpdateError } = await supabaseAdmin
            .from("bets")
            .update({
              polymarket_synced_at: new Date().toISOString(),
              polymarket_resolution_error: resolution.reason,
            })
            .eq("id", bet.id);

          if (unresolvedUpdateError) {
            throw unresolvedUpdateError;
          }

          results.push({
            betId: bet.id,
            action: "skipped",
            reason: resolution.reason,
          });

          continue;
        }

        const didWin = doesBetMatchWinningToken({
          betTokenId: bet.polymarket_token_id,
          betOutcome: bet.polymarket_outcome,
          winningTokenId: resolution.winningTokenId,
          winningOutcome: resolution.winningOutcome,
        });

        const settleResult = didWin ? "won" : "lost";

        const { error: settleError } = await supabaseAdmin.rpc(
          "settle_bet_for_user",
          {
            p_user_id: bet.user_id,
            p_bet_id: bet.id,
            p_result: settleResult,
            p_cashout_amount: null,
            p_skip_rule_eval: true,
          }
        );

        if (settleError) {
          throw settleError;
        }

        affectedAccountIds.add(bet.account_id);

        const { error: updateError } = await supabaseAdmin
          .from("bets")
          .update({
            polymarket_synced_at: new Date().toISOString(),
            polymarket_resolution_source: "polymarket_clob_gamma",
            polymarket_winning_token_id: resolution.winningTokenId,
            polymarket_winning_outcome: resolution.winningOutcome,
            polymarket_resolution_error: null,
          })
          .eq("id", bet.id);

        if (updateError) {
          throw updateError;
        }

        results.push({
          betId: bet.id,
          action: "settled",
          result: settleResult,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown sync error.";

        await supabaseAdmin
          .from("bets")
          .update({
            polymarket_synced_at: new Date().toISOString(),
            polymarket_resolution_error: message,
          })
          .eq("id", bet.id);

        results.push({
          betId: bet.id,
          action: "error",
          reason: message,
        });
      }
    }

    for (const accountId of affectedAccountIds) {
      try {
        const { error: ruleError } = await supabaseAdmin.rpc(
          "evaluate_account_rules",
          {
            p_account_id: accountId,
          }
        );

        if (ruleError) {
          throw ruleError;
        }

        results.push({
          accountId,
          action: "rules_evaluated",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown rule evaluation error.";

        results.push({
          accountId,
          action: "error",
          reason: message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      checked: openBets?.length ?? 0,
      settled: results.filter((result) => result.action === "settled").length,
      skipped: results.filter((result) => result.action === "skipped").length,
      errors: results.filter((result) => result.action === "error").length,
      evaluatedAccounts: affectedAccountIds.size,
      results,
    });
  } catch (error) {
    console.error("Polymarket settlement sync error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to sync Polymarket settlements.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return runPolymarketSettlementSync(req);
}

export async function POST(req: Request) {
  return runPolymarketSettlementSync(req);
}