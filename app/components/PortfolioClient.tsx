"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

type AccountJoin = {
  plan_key: string;
  plan_size: number;
} | null;

type BetStatus = "open" | "won" | "lost" | "void" | "cashed_out";

type Bet = {
  id: string;
  account_id: string;
  game_id: string;
  league: string;
  market: string;
  selection: string;
  odds: number;
  stake: number;
  potential_profit: number;
  potential_payout: number;
  status: BetStatus;
  result: BetStatus | null;
  settlement_amount: number | null;
  placed_at: string;
  settled_at: string | null;
  challenge_accounts: AccountJoin;

  polymarket_condition_id?: string | null;
  polymarket_token_id?: string | null;
  polymarket_outcome?: string | null;
  polymarket_synced_at?: string | null;
  polymarket_winning_token_id?: string | null;
  polymarket_winning_outcome?: string | null;
  polymarket_resolution_error?: string | null;
};

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function formatMoney(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);

  return `$${safeValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAccountLabel(bet: Bet) {
  const size = bet.challenge_accounts?.plan_size;

  if (!size) return "Account";

  return `$${Number(size).toLocaleString()} Account`;
}

function resultLabel(status: string) {
  if (status === "open") return "Open";
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  if (status === "void") return "Void";
  if (status === "cashed_out") return "Cashed Out";
  return status;
}

function getBetPnl(bet: Bet) {
  if (bet.status === "won") return Number(bet.potential_profit);
  if (bet.status === "lost") return -Number(bet.stake);
  if (bet.status === "void") return 0;

  if (bet.status === "cashed_out") {
    return Number(bet.settlement_amount ?? 0) - Number(bet.stake);
  }

  return null;
}

function BetCard({
  bet,
  active,
  onSyncPolymarket,
  isSyncing,
}: {
  bet: Bet;
  active?: boolean;
  onSyncPolymarket?: (betId: string) => Promise<void>;
  isSyncing?: boolean;
}) {
  const pnl = getBetPnl(bet);
  const displayStatus = bet.result ?? bet.status;
  const hasPolymarketData = Boolean(bet.polymarket_condition_id);

  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {getAccountLabel(bet)}
          </div>

          <h3 className="mt-2 truncate text-[22px] font-semibold tracking-tight text-zinc-100">
            {bet.selection}
          </h3>

          <p className="mt-1 text-sm text-zinc-500">
            {bet.league.toUpperCase()} · {bet.market}
          </p>
        </div>

        <div className="shrink-0 rounded-full border border-zinc-800 px-3 py-1 text-[12px] font-medium text-zinc-400">
          {resultLabel(displayStatus)}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-zinc-800 pt-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Odds
          </div>
          <div className="mt-1 text-sm font-semibold text-zinc-100">
            {formatOdds(Number(bet.odds))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Stake
          </div>
          <div className="mt-1 text-sm font-semibold text-zinc-100">
            {formatMoney(bet.stake)}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Payout
          </div>
          <div className="mt-1 text-sm font-semibold text-zinc-100">
            {formatMoney(bet.potential_payout)}
          </div>
        </div>
      </div>

      {!active ? (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              Settled
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-100">
              {formatMoney(bet.settlement_amount)}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              P/L
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-100">
              {pnl === null ? "—" : formatMoney(pnl)}
            </div>
          </div>
        </div>
      ) : null}

      {bet.polymarket_winning_outcome ? (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Polymarket Result
          </div>
          <div className="mt-1 text-sm font-semibold text-zinc-100">
            {bet.polymarket_winning_outcome}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-[12px] text-zinc-500">
          {active ? "Placed" : "Settled"}{" "}
          {formatDate(active ? bet.placed_at : bet.settled_at)}
        </div>

        {active && bet.polymarket_synced_at ? (
          <div className="text-[12px] text-zinc-600">
            Synced {formatDate(bet.polymarket_synced_at)}
          </div>
        ) : null}
      </div>

      {active && bet.polymarket_resolution_error ? (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-black/30 p-3 text-[12px] text-zinc-500">
          {bet.polymarket_resolution_error}
        </div>
      ) : null}

      {active && onSyncPolymarket ? (
        <div className="mt-5 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={() => onSyncPolymarket(bet.id)}
            disabled={isSyncing || !hasPolymarketData}
            className="w-full rounded-xl border border-zinc-700 px-3 py-2 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncing
              ? "Syncing..."
              : hasPolymarketData
                ? "Sync Result"
                : "Missing Polymarket Data"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function PortfolioClient() {
  const { ready, authenticated, login, getAccessToken } = usePrivy();

  const [openBets, setOpenBets] = useState<Bet[]>([]);
  const [pastBets, setPastBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingBetId, setSyncingBetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const activeRisk = openBets.reduce(
      (sum, bet) => sum + Number(bet.stake ?? 0),
      0
    );

    const possiblePayout = openBets.reduce(
      (sum, bet) => sum + Number(bet.potential_payout ?? 0),
      0
    );

    const realizedPnl = pastBets.reduce((sum, bet) => {
      const pnl = getBetPnl(bet);
      return sum + Number(pnl ?? 0);
    }, 0);

    return {
      activeCount: openBets.length,
      pastCount: pastBets.length,
      activeRisk,
      possiblePayout,
      realizedPnl,
    };
  }, [openBets, pastBets]);

  async function loadPortfolio(options?: { silent?: boolean }) {
    if (!ready) return;

    if (!authenticated) {
      setOpenBets([]);
      setPastBets([]);
      setLoading(false);
      return;
    }

    try {
      if (!options?.silent) {
        setLoading(true);
      }

      setError(null);

      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("Missing auth token.");
      }

      const response = await fetch("/api/portfolio/mine", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to load portfolio.");
      }

      setOpenBets(data.openBets ?? []);
      setPastBets(data.pastBets ?? []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load portfolio.");
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  async function syncPolymarketBet(betId: string) {
    if (syncingBetId) return;

    try {
      setSyncingBetId(betId);
      setError(null);

      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("Missing auth token.");
      }

      const response = await fetch("/api/bets/sync-polymarket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ betId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Normal state: market exists, but Polymarket has not resolved it yet.
          setError(data?.reason || "Market has not resolved on Polymarket yet.");

          // Silent refresh keeps the current UI mounted instead of showing
          // the full-page "Loading portfolio..." card again.
          await loadPortfolio({ silent: true });
          return;
        }

        throw new Error(data?.error || "Unable to sync Polymarket result.");
      }

      await loadPortfolio({ silent: true });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to sync Polymarket result."
      );

      await loadPortfolio({ silent: true });
    } finally {
      setSyncingBetId(null);
    }
  }

  useEffect(() => {
    loadPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 pb-24 sm:px-6 md:py-10">
      <div className="mb-8">
        <h1 className="text-[34px] font-semibold tracking-tight text-zinc-100">
          Portfolio
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          View active and past positions across your accounts.
        </p>
      </div>

      {!ready || loading ? (
        <div className="rounded-[24px] border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-500">
          Loading portfolio...
        </div>
      ) : !authenticated ? (
        <div className="rounded-[24px] border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold text-zinc-100">
            Sign in to view your portfolio
          </h2>

          <button
            type="button"
            onClick={login}
            className="mt-4 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950"
          >
            Sign in
          </button>
        </div>
      ) : (
        <>
          {error ? (
            <div className="mb-5 rounded-[20px] border border-red-950 bg-red-950/20 p-4 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Active Positions
              </div>
              <div className="mt-2 text-3xl font-semibold text-zinc-100">
                {totals.activeCount}
              </div>
            </div>

            <div className="">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Past Positions
              </div>
              <div className="mt-2 text-3xl font-semibold text-zinc-100">
                {totals.pastCount}
              </div>
            </div>

            <div className="">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Active Risk
              </div>
              <div className="mt-2 text-3xl font-semibold text-zinc-100">
                {formatMoney(totals.activeRisk)}
              </div>
            </div>

            <div className="">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Realized P/L
              </div>
              <div className="mt-2 text-3xl font-semibold text-zinc-100">
                {formatMoney(totals.realizedPnl)}
              </div>
            </div>
          </div>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
                Active Positions
              </h2>

              <div className="text-sm text-zinc-500">
                pot. payout: {formatMoney(totals.possiblePayout)}
              </div>
            </div>

            {openBets.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {openBets.map((bet) => (
                  <BetCard
                    key={bet.id}
                    bet={bet}
                    active
                    onSyncPolymarket={syncPolymarketBet}
                    isSyncing={syncingBetId === bet.id}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-500">
                No active positions yet.
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-100">
              Past Positions
            </h2>

            {pastBets.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {pastBets.map((bet) => (
                  <BetCard key={bet.id} bet={bet} />
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-500">
                No past positions yet.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}