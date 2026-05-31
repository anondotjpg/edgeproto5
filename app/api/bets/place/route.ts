import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { privyServer } from "@/lib/privy-server";

type PlaceBetBody = {
  accountIds?: string[];
  gameId?: string;
  league?: string;
  market?: string;
  selection?: string;
  odds?: number;
  stake?: number;

  polymarketEventId?: string | null;
  polymarketEventSlug?: string | null;
  polymarketMarketId?: string | null;
  polymarketConditionId?: string | null;
  polymarketMarketSlug?: string | null;
  polymarketOutcome?: string | null;
  polymarketOutcomeIndex?: number | null;
  polymarketTokenId?: string | null;
  teamLogo?: string | null;
  teamLogoAlt?: string | null;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function cleanInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) return null;

  return parsed;
}

function cleanRpcError(message: string) {
  if (message.includes("Max risk per bet exceeded")) {
    return message;
  }

  if (message.includes("Insufficient balance")) {
    return "Insufficient available balance.";
  }

  if (message.includes("Account not active")) {
    return "This account is not active.";
  }

  if (message.includes("Account not found")) {
    return "Account not found.";
  }

  if (message.includes("Invalid stake")) {
    return "Invalid stake.";
  }

  if (message.includes("Invalid odds")) {
    return "Invalid odds.";
  }

  return message || "Unable to place bet.";
}

export async function POST(req: Request) {
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

    const body = (await req.json()) as PlaceBetBody;

    const accountIds = body.accountIds ?? [];
    const gameId = cleanText(body.gameId);
    const league = cleanText(body.league);
    const market = cleanText(body.market);
    const selection = cleanText(body.selection);
    const odds = Number(body.odds);
    const stake = Number(body.stake);

    const polymarketEventId = cleanText(body.polymarketEventId);
    const polymarketEventSlug = cleanText(body.polymarketEventSlug);
    const polymarketMarketId = cleanText(body.polymarketMarketId);
    const polymarketConditionId = cleanText(body.polymarketConditionId);
    const polymarketMarketSlug = cleanText(body.polymarketMarketSlug);
    const polymarketOutcome = cleanText(body.polymarketOutcome);
    const polymarketOutcomeIndex = cleanInteger(body.polymarketOutcomeIndex);
    const polymarketTokenId = cleanText(body.polymarketTokenId);
    const teamLogo = cleanText(body.teamLogo);
    const teamLogoAlt = cleanText(body.teamLogoAlt);

    if (!accountIds.length) {
      return NextResponse.json(
        { error: "Select at least one account." },
        { status: 400 }
      );
    }

    if (!gameId || !league || !market || !selection) {
      return NextResponse.json(
        { error: "Missing bet details." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(odds) || odds === 0) {
      return NextResponse.json({ error: "Invalid odds." }, { status: 400 });
    }

    if (!Number.isFinite(stake) || stake <= 0) {
      return NextResponse.json({ error: "Invalid stake." }, { status: 400 });
    }

    if (!polymarketConditionId || !polymarketTokenId) {
      return NextResponse.json(
        {
          error:
            "Missing Polymarket settlement data. Refresh the market and try again.",
        },
        { status: 400 }
      );
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

    const placedBetIds: string[] = [];

    for (const accountId of accountIds) {
      const cleanAccountId = cleanText(accountId);

      if (!cleanAccountId) {
        return NextResponse.json(
          { error: "Invalid account ID." },
          { status: 400 }
        );
      }

      const { data: betId, error: rpcError } = await supabaseAdmin.rpc(
        "place_bet_for_account",
        {
          p_user_id: dbUser.id,
          p_account_id: cleanAccountId,
          p_game_id: gameId,
          p_league: league,
          p_market: market,
          p_selection: selection,
          p_odds: odds,
          p_stake: stake,

          p_polymarket_event_id: polymarketEventId,
          p_polymarket_event_slug: polymarketEventSlug,
          p_polymarket_market_id: polymarketMarketId,
          p_polymarket_condition_id: polymarketConditionId,
          p_polymarket_market_slug: polymarketMarketSlug,
          p_polymarket_outcome: polymarketOutcome,
          p_polymarket_outcome_index: polymarketOutcomeIndex,
          p_polymarket_token_id: polymarketTokenId,
          p_team_logo: teamLogo,
          p_team_logo_alt: teamLogoAlt,
        }
      );

      if (rpcError) {
        return NextResponse.json(
          {
            error: cleanRpcError(rpcError.message),
            details: rpcError.message,
          },
          { status: 400 }
        );
      }

      placedBetIds.push(betId as string);
    }

    return NextResponse.json({
      ok: true,
      betIds: placedBetIds,
    });
  } catch (error) {
    console.error("Place bet error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to place bet.",
      },
      { status: 500 }
    );
  }
}