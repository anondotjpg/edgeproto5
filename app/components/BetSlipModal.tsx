"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { usePrivy } from "@privy-io/react-auth";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../components/ui/drawer";

type OwnedAccount = {
  id: string;
  account_name: string | null;
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

  triggerClassName?: string;
  triggerContentClassName?: string;

  polymarketEventId?: string | null;
  polymarketEventSlug?: string | null;
  polymarketMarketId?: string | null;
  polymarketConditionId?: string | null;
  polymarketMarketSlug?: string | null;
  polymarketOutcome?: string | null;
  polymarketOutcomeIndex?: number | null;
  polymarketTokenId?: string | null;
};

const ACCOUNT_GRID_CLASS = "grid grid-cols-3 gap-3";

const ACCOUNT_CARD_CLASS =
  "h-[92px] overflow-hidden rounded-2xl border p-3 text-left transition-colors";

const ACCOUNT_SELECT_SHELL_CLASS = "mt-5 h-[122px]";

const ACCOUNT_LIST_CLASS = "mt-3 h-[92px] overflow-hidden";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");

    function updateIsMobile() {
      setIsMobile(query.matches);
    }

    updateIsMobile();
    query.addEventListener("change", updateIsMobile);

    return () => {
      query.removeEventListener("change", updateIsMobile);
    };
  }, []);

  return isMobile;
}

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

function formatCompactMoney(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);

  if (Math.abs(safeValue) >= 1000) {
    const compact = safeValue / 1000;
    return `$${compact.toFixed(safeValue % 1000 === 0 ? 0 : 1)}k`;
  }

  return `$${safeValue.toFixed(0)}`;
}

function getPlanLabel(account: OwnedAccount) {
  return `$${Number(account.plan_size).toLocaleString()}`;
}

function getAccountDisplayName(account: OwnedAccount) {
  const accountName = account.account_name?.trim();

  if (accountName) return accountName;

  return getPlanLabel(account);
}

function getAccountMeta(account: OwnedAccount) {
  const accountName = account.account_name?.trim();

  if (accountName) {
    return `${getPlanLabel(account)} · ${account.status}`;
  }

  return account.status;
}

function getMaxRiskAmount(account: OwnedAccount) {
  return Number(
    account.max_risk_amount ??
      Number(account.starting_balance ?? account.plan_size ?? 0) * 0.05
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-900 ${className}`} />;
}

function AccountOptionSkeleton() {
  return (
    <div className={`${ACCOUNT_CARD_CLASS} border-zinc-800 bg-black/30`}>
      <div className="flex h-5 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-5 w-full max-w-[150px] bg-zinc-800" />
        </div>

        <div className="mt-1 h-3.5 w-3.5 shrink-0 animate-pulse rounded-full border border-zinc-700 bg-transparent" />
      </div>

      <div className="mt-3 space-y-1.5 text-[12px] leading-4">
        <div className="flex h-4 items-center justify-between gap-2">
          <SkeletonBlock className="h-3 w-8" />
          <SkeletonBlock className="h-3 w-10" />
        </div>

        <div className="flex h-4 items-center justify-between gap-2">
          <SkeletonBlock className="h-3 w-6" />
          <SkeletonBlock className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}

function BetSlipContent({
  team,
  matchup,
  odds,
  impliedPercent,
  ready,
  authenticated,
  login,
  accounts,
  selectedAccountIds,
  isLoadingAccounts,
  isPlacing,
  amount,
  possiblePayout,
  statusMessage,
  statusTone,
  ruleWarning,
  mobileLayout,
  showCloseButton,
  onClose,
  onToggleAccount,
  onAmountChange,
  onPlaceBet,
}: {
  team: string;
  matchup: string;
  odds: string;
  impliedPercent: string;
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  accounts: OwnedAccount[];
  selectedAccountIds: string[];
  isLoadingAccounts: boolean;
  isPlacing: boolean;
  amount: string;
  possiblePayout: string;
  statusMessage: string | null;
  statusTone: "warning" | "error" | null;
  ruleWarning: string | null;
  mobileLayout: boolean;
  showCloseButton: boolean;
  onClose: () => void;
  onToggleAccount: (accountId: string) => void;
  onAmountChange: (value: string) => void;
  onPlaceBet: () => void;
}) {
  return (
    <>
      {mobileLayout ? (
        <div className="relative min-h-[64px] pr-[122px] pt-[2px]">
          <div className="min-w-0 max-w-full">
            <h2 className="truncate text-2xl font-semibold leading-[1.15] tracking-tight text-zinc-100">
              {team}
            </h2>

            <p className="mt-1 truncate text-sm leading-[1.25] text-zinc-400">
              {matchup}
            </p>
          </div>

          <div className="absolute right-0 top-0 text-right leading-none">
            <div className="text-[30px] font-semibold leading-none tracking-tight text-zinc-100">
              {odds}
            </div>

            <div className="mt-1.5 text-[22px] font-semibold leading-none text-zinc-500">
              {impliedPercent}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Place Bet
              </div>

              <h2 className="mt-2 max-w-[66%] truncate text-2xl font-semibold tracking-tight text-zinc-100">
                {team}
              </h2>

              <p className="mt-1 truncate text-sm text-zinc-400">{matchup}</p>
            </div>

            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 cursor-pointer rounded-full border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Close
              </button>
            ) : null}
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
        </div>
      )}

      <div className={ACCOUNT_SELECT_SHELL_CLASS}>
        <div className="h-[18px] text-sm font-medium leading-[18px] text-zinc-300">
          Select account
        </div>

        <div className={ACCOUNT_LIST_CLASS}>
          {!ready || isLoadingAccounts ? (
            <div className={ACCOUNT_GRID_CLASS}>
              {Array.from({ length: 3 }).map((_, index) => (
                <AccountOptionSkeleton key={index} />
              ))}
            </div>
          ) : !authenticated ? (
            <button
              type="button"
              onClick={login}
              className="h-full w-full rounded-2xl border border-zinc-800 bg-black/30 p-4 text-left text-sm text-zinc-300"
            >
              Sign in to select an account.
            </button>
          ) : accounts.length ? (
            <div className={ACCOUNT_GRID_CLASS}>
              {accounts.map((account) => {
                const selected = selectedAccountIds.includes(account.id);
                const active = ["active", "active_dev"].includes(
                  account.status
                );

                const maxRiskAmount = getMaxRiskAmount(account);

                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => {
                      if (active) onToggleAccount(account.id);
                    }}
                    disabled={!active}
                    className={[
                      ACCOUNT_CARD_CLASS,
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      selected
                        ? "border-zinc-400 bg-zinc-900"
                        : "border-zinc-800 bg-black/30 hover:border-zinc-700",
                    ].join(" ")}
                  >
                    <div className="flex h-5 items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-5 text-zinc-100">
                        {getAccountDisplayName(account)}
                        <span className="font-normal text-zinc-500">
                          {" "}
                          · {getAccountMeta(account)}
                        </span>
                      </div>

                      <div
                        className={[
                          "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border",
                          selected
                            ? "border-zinc-100 bg-zinc-100"
                            : "border-zinc-700",
                        ].join(" ")}
                      />
                    </div>

                    <div className="mt-3 space-y-1.5 text-[12px] leading-4">
                      <div className="flex h-4 items-center justify-between gap-2">
                        <span className="text-zinc-500">Avail</span>
                        <span className="font-medium text-zinc-300">
                          {formatCompactMoney(account.current_balance)}
                        </span>
                      </div>

                      <div className="flex h-4 items-center justify-between gap-2">
                        <span className="text-zinc-500">Max</span>
                        <span className="font-medium text-zinc-300">
                          {formatCompactMoney(maxRiskAmount)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-500">
              No accounts found. Start a challenge first.
            </div>
          )}
        </div>
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-medium text-zinc-300">Bet amount</span>

        <div className="mt-2 flex h-12 items-center rounded-2xl border border-zinc-800 bg-black/30 px-4 focus-within:border-zinc-600">
          <span className="text-zinc-500">$</span>

          <input
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            maxLength={7}
            className="h-full min-w-0 flex-1 bg-transparent px-2 text-lg font-semibold text-white outline-none placeholder:text-zinc-600"
          />
        </div>

        <div className="mt-1 text-right text-[12px] text-zinc-500">
          pot. payout{" "}
          <span className="font-semibold text-zinc-300">{possiblePayout}</span>
        </div>
      </label>

      <AnimatePresence initial={false}>
        {statusMessage ? (
          <motion.div
            key={statusMessage}
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 16 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className={[
                "rounded-2xl border p-3 text-sm",
                statusTone === "warning"
                  ? "border-yellow-950 bg-yellow-950/20 text-yellow-200"
                  : "border-red-950 bg-red-950/20 text-red-300",
              ].join(" ")}
            >
              {statusMessage}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={onPlaceBet}
        disabled={
          isPlacing ||
          !amount ||
          Number(amount) <= 0 ||
          !selectedAccountIds.length ||
          Boolean(ruleWarning)
        }
        className="mt-5 h-12 w-full cursor-pointer rounded-2xl bg-zinc-100 text-[15px] font-semibold text-zinc-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPlacing ? "Placing..." : "Place Bet"}
      </button>
    </>
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
  triggerClassName,
  triggerContentClassName,

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
  const isMobile = useIsMobile();

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
        return `${getAccountDisplayName(account)} account is not active.`;
      }

      const maxRiskAmount = getMaxRiskAmount(account);

      if (stake > maxRiskAmount) {
        return `${getAccountDisplayName(
          account
        )} account max risk per bet is ${formatMoney(maxRiskAmount)}.`;
      }

      if (stake > Number(account.current_balance ?? 0)) {
        return `${getAccountDisplayName(account)} account only has ${formatMoney(
          account.current_balance
        )} available.`;
      }
    }

    return null;
  }, [selectedAccounts, stake]);

  const statusMessage = ruleWarning ?? error;
  const statusTone = ruleWarning ? "warning" : error ? "error" : null;

  function openBetSlip() {
    setOpen(true);
    setError(null);

    if (!ready || authenticated) {
      setIsLoadingAccounts(true);
    }
  }

  function closeBetSlip() {
    setOpen(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      openBetSlip();
      return;
    }

    closeBetSlip();
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      if (!open) return;

      if (!ready) {
        setIsLoadingAccounts(true);
        return;
      }

      if (!authenticated) {
        setIsLoadingAccounts(false);
        return;
      }

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

  function handleAmountChange(value: string) {
    const parsed = parseAmount(value);
    const digitsOnly = parsed.replace(/\D/g, "");

    if (digitsOnly.length <= 6) {
      setAmount(parsed);
    }
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

      toast("Bet placed", {
        description: `${formatMoney(stake)} on ${team}`,
      });

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

  const trigger = (
    <button
      type="button"
      onClick={openBetSlip}
      className={
        triggerClassName ??
        "flex min-h-[56px] min-w-[104px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-transparent px-4 py-3 text-center transition-colors hover:bg-zinc-900"
      }
    >
      <div
        className={
          triggerContentClassName ??
          "text-[20px] font-semibold tracking-tight text-zinc-100"
        }
      >
        {odds}
      </div>
    </button>
  );

  const content = (
    <BetSlipContent
      team={team}
      matchup={matchup}
      odds={odds}
      impliedPercent={impliedPercent}
      ready={ready}
      authenticated={authenticated}
      login={login}
      accounts={accounts}
      selectedAccountIds={selectedAccountIds}
      isLoadingAccounts={isLoadingAccounts}
      isPlacing={isPlacing}
      amount={amount}
      possiblePayout={possiblePayout}
      statusMessage={statusMessage}
      statusTone={statusTone}
      ruleWarning={ruleWarning}
      mobileLayout={isMobile}
      showCloseButton={!isMobile}
      onClose={closeBetSlip}
      onToggleAccount={toggleAccount}
      onAmountChange={handleAmountChange}
      onPlaceBet={placeBet}
    />
  );

  return (
    <>
      {trigger}

      {isMobile ? (
        <Drawer
          open={open}
          onOpenChange={handleOpenChange}
          repositionInputs={false}
        >
          <DrawerContent className="relative overflow-visible border-zinc-800 bg-zinc-950 text-white outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 data-[state=open]:outline-none data-[vaul-drawer-direction=bottom]:max-h-none">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-[calc(100%-1px)] z-0 h-[1200px] bg-zinc-950"
            />

            <DrawerHeader className="sr-only">
              <DrawerTitle>Place Bet</DrawerTitle>
              <DrawerDescription>
                Choose an account and enter an amount to place this bet.
              </DrawerDescription>
            </DrawerHeader>

            <div className="relative z-10 mx-auto flex h-[82svh] w-full max-w-2xl flex-col bg-zinc-950 px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-2">
              <div className="mx-auto mb-5 h-1.5 w-12 shrink-0 rounded-full bg-zinc-800" />

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1">
                {content}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 px-4 pb-4 sm:items-center sm:pb-0">
          <button
            type="button"
            aria-label="Close bet slip"
            className="absolute inset-0 cursor-default"
            onClick={closeBetSlip}
          />

          <div className="relative w-full max-w-2xl rounded-[28px] border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl">
            {content}
          </div>
        </div>
      ) : null}
    </>
  );
}