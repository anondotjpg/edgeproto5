"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

type OwnedAccount = {
  id: string;
  plan_key: string;
  plan_size: number;
  one_time_fee: number;
  status: string;
  created_at: string;

  starting_balance: number;
  current_balance: number;
  reserved_risk: number;
  realized_pnl: number;

  profit_target_percent: number;
  daily_drawdown_percent: number;
  total_drawdown_percent: number;

  max_risk_amount: number | null;
  daily_loss_limit_amount: number | null;
  total_loss_limit_amount: number | null;

  passed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
};

type BetSlipModalProps = {
  team: string;
  gameId: string;
  league: string;
  market: string;
  odds: string;
  impliedPercent: string;
  matchup: string;

  polymarketEventId?: string | null;
  polymarketEventSlug?: string | null;
  polymarketMarketId?: string | null;
  polymarketConditionId?: string | null;
  polymarketMarketSlug?: string | null;
  polymarketOutcome?: string | null;
  polymarketOutcomeIndex?: number | null;
  polymarketTokenId?: string | null;
};

function parseAmount(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const parts = normalized.split(".");
  if (parts.length <= 1) return normalized;
  return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
}

function parseOdds(value: string) {
  return Number(value.replace("+", ""));
}

function formatMoney(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);

  return `$${safeValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getPlanLabel(account: OwnedAccount) {
  return `$${Number(account.plan_size).toLocaleString()}`;
}

function getMaxRiskAmount(account: OwnedAccount) {
  return Number(
    account.max_risk_amount ??
      Number(account.starting_balance ?? account.plan_size ?? 0) * 0.05
  );
}

function getDailyLossLimit(account: OwnedAccount) {
  return Number(
    account.daily_loss_limit_amount ??
      Number(account.current_balance ?? account.starting_balance ?? 0) *
        (Number(account.daily_drawdown_percent ?? 10) / 100)
  );
}

function getTotalLossFloor(account: OwnedAccount) {
  const start = Number(account.starting_balance ?? account.plan_size ?? 0);
  const totalLossLimit = Number(
    account.total_loss_limit_amount ??
      start * (Number(account.total_drawdown_percent ?? 20) / 100)
  );

  return start - totalLossLimit;
}

function getProfitTargetAmount(account: OwnedAccount) {
  return (
    Number(account.starting_balance ?? account.plan_size ?? 0) *
    (1 + Number(account.profit_target_percent ?? 30) / 100)
  );
}

export default function BetSlipModal({
  team,
  gameId,
  league,
  market,
  odds,
  impliedPercent,
  matchup,

  polymarketEventId,
  polymarketEventSlug,
  polymarketMarketId,
  polymarketConditionId,
  polymarketMarketSlug,
  polymarketOutcome,
  polymarketOutcomeIndex,
  polymarketTokenId,
}: BetSlipModalProps) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [accounts, setAccounts] = useState<OwnedAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericOdds = parseOdds(odds);
  const stake = Number(amount);

  const selectedAccounts = useMemo(() => {
    return accounts.filter((account) => selectedAccountIds.includes(account.id));
  }, [accounts, selectedAccountIds]);

  const possiblePayout = useMemo(() => {
    if (!stake || Number.isNaN(stake)) return "—";
    if (!numericOdds || Number.isNaN(numericOdds)) return "—";

    const profit =
      numericOdds > 0
        ? stake * (numericOdds / 100)
        : stake * (100 / Math.abs(numericOdds));

    return formatMoney(stake + profit);
  }, [stake, numericOdds]);

  const ruleWarning = useMemo(() => {
    if (!selectedAccounts.length) return null;
    if (!stake || Number.isNaN(stake)) return null;

    for (const account of selectedAccounts) {
      const active = ["active", "active_dev"].includes(account.status);

      if (!active) {
        return `${getPlanLabel(account)} account is not active.`;
      }

      const maxRiskAmount = getMaxRiskAmount(account);

      if (stake > maxRiskAmount) {
        return `${getPlanLabel(account)} account max risk per bet is ${formatMoney(
          maxRiskAmount
        )}.`;
      }

      if (stake > Number(account.current_balance ?? 0)) {
        return `${getPlanLabel(account)} account only has ${formatMoney(
          account.current_balance
        )} available.`;
      }
    }

    return null;
  }, [selectedAccounts, stake]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      if (!open || !ready || !authenticated) return;

      try {
        setIsLoadingAccounts(true);
        setError(null);

        const accessToken = await getAccessToken();

        const response = await fetch("/api/accounts/mine", {
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {},
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load accounts.");
        }

        if (!cancelled) {
          const loadedAccounts = data.accounts ?? [];
          setAccounts(loadedAccounts);

          const activeAccounts = loadedAccounts.filter((account: OwnedAccount) =>
            ["active", "active_dev"].includes(account.status)
          );

          if (activeAccounts.length === 1) {
            setSelectedAccountIds([activeAccounts[0].id]);
          }
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load accounts."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAccounts(false);
        }
      }
    }

    loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [open, ready, authenticated, getAccessToken]);

  function toggleAccount(accountId: string) {
    setSelectedAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId]
    );
  }

  async function placeBet() {
    if (!ready) return;

    if (!authenticated) {
      login();
      return;
    }

    try {
      setIsPlacing(true);
      setError(null);

      if (!selectedAccountIds.length) {
        throw new Error("Select at least one account.");
      }

      if (!stake || stake <= 0) {
        throw new Error("Enter a valid bet amount.");
      }

      if (ruleWarning) {
        throw new Error(ruleWarning);
      }

      if (!polymarketConditionId || !polymarketTokenId) {
        throw new Error(
          "Missing Polymarket settlement data. Refresh and try again."
        );
      }

      const accessToken = await getAccessToken();

      const response = await fetch("/api/bets/place", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {}),
        },
        body: JSON.stringify({
          accountIds: selectedAccountIds,
          gameId,
          league,
          market,
          selection: team,
          odds: numericOdds,
          stake,

          polymarketEventId,
          polymarketEventSlug,
          polymarketMarketId,
          polymarketConditionId,
          polymarketMarketSlug,
          polymarketOutcome: polymarketOutcome ?? team,
          polymarketOutcomeIndex,
          polymarketTokenId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to place bet.");
      }

      setOpen(false);
      setAmount("");
      setSelectedAccountIds([]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsPlacing(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[56px] min-w-[104px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-transparent px-4 py-3 text-center transition-colors hover:bg-zinc-900"
      >
        <div className="text-[20px] font-semibold tracking-tight text-zinc-100">
          {odds}
        </div>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 px-4 pb-4 sm:items-center sm:pb-0">
          <button
            type="button"
            aria-label="Close bet slip"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-[28px] border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Place Bet
                </div>

                <h2 className="mt-2 truncate text-2xl font-semibold tracking-tight text-zinc-100">
                  {team}
                </h2>

                <p className="mt-1 text-sm text-zinc-400">{matchup}</p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Moneyline
                </div>
                <div className="mt-1 text-xl font-semibold text-zinc-100">
                  {odds}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Implied
                </div>
                <div className="mt-1 text-xl font-semibold text-zinc-100">
                  {impliedPercent}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-sm font-medium text-zinc-300">
                Select account
              </div>

              <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                {!authenticated ? (
                  <button
                    type="button"
                    onClick={login}
                    className="w-full rounded-2xl border border-zinc-800 bg-black/30 p-4 text-left text-sm text-zinc-300"
                  >
                    Sign in to select an account.
                  </button>
                ) : isLoadingAccounts ? (
                  <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-500">
                    Loading accounts...
                  </div>
                ) : accounts.length ? (
                  accounts.map((account) => {
                    const selected = selectedAccountIds.includes(account.id);
                    const active = ["active", "active_dev"].includes(
                      account.status
                    );

                    const maxRiskAmount = getMaxRiskAmount(account);
                    const dailyLossLimit = getDailyLossLimit(account);
                    const totalLossFloor = getTotalLossFloor(account);
                    const target = getProfitTargetAmount(account);

                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => {
                          if (active) toggleAccount(account.id);
                        }}
                        disabled={!active}
                        className={[
                          "w-full rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                          selected
                            ? "border-zinc-500 bg-zinc-900"
                            : "border-zinc-800 bg-black/30 hover:border-zinc-700",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-zinc-100">
                              {getPlanLabel(account)} Challenge
                            </div>

                            <div className="mt-1 text-xs text-zinc-500">
                              {account.status}
                            </div>
                          </div>

                          <div
                            className={[
                              "mt-0.5 h-4 w-4 rounded-full border",
                              selected
                                ? "border-zinc-100 bg-zinc-100"
                                : "border-zinc-700",
                            ].join(" ")}
                          />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="text-zinc-500">
                            Available{" "}
                            <span className="font-semibold text-zinc-300">
                              {formatMoney(account.current_balance)}
                            </span>
                          </div>

                          <div className="text-zinc-500">
                            Max Bet{" "}
                            <span className="font-semibold text-zinc-300">
                              {formatMoney(maxRiskAmount)}
                            </span>
                          </div>

                          <div className="text-zinc-500">
                            Daily Loss{" "}
                            <span className="font-semibold text-zinc-300">
                              {formatMoney(dailyLossLimit)}
                            </span>
                          </div>

                          <div className="text-zinc-500">
                            Target{" "}
                            <span className="font-semibold text-zinc-300">
                              {formatMoney(target)}
                            </span>
                          </div>

                          <div className="col-span-2 text-zinc-500">
                            Total Loss Floor{" "}
                            <span className="font-semibold text-zinc-300">
                              {formatMoney(totalLossFloor)}
                            </span>
                          </div>
                        </div>

                        {account.failure_reason ? (
                          <div className="mt-2 text-xs text-red-300">
                            {account.failure_reason}
                          </div>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-500">
                    No accounts found. Start a challenge first.
                  </div>
                )}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-zinc-300">
                Bet amount
              </span>

              <div className="mt-2 flex h-12 items-center rounded-2xl border border-zinc-800 bg-black/30 px-4 focus-within:border-zinc-600">
                <span className="text-zinc-500">$</span>
                <input
                  value={amount}
                  onChange={(event) =>
                    setAmount(parseAmount(event.target.value))
                  }
                  placeholder="0.00"
                  inputMode="decimal"
                  className="h-full min-w-0 flex-1 bg-transparent px-2 text-lg font-semibold text-white outline-none placeholder:text-zinc-600"
                />
              </div>
            </label>

            <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-zinc-400">Possible payout</div>
                <div className="text-lg font-semibold text-zinc-100">
                  {possiblePayout}
                </div>
              </div>
            </div>

            {ruleWarning ? (
              <div className="mt-4 rounded-2xl border border-yellow-950 bg-yellow-950/20 p-3 text-sm text-yellow-200">
                {ruleWarning}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-950 bg-red-950/20 p-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={placeBet}
              disabled={
                isPlacing ||
                !amount ||
                Number(amount) <= 0 ||
                !selectedAccountIds.length ||
                Boolean(ruleWarning)
              }
              className="mt-5 h-12 w-full rounded-2xl bg-zinc-100 text-[15px] font-semibold text-zinc-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPlacing ? "Placing..." : "Place Bet"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}