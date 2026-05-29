"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
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
import { Slider } from "../components/ui/slider";

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

const ACCOUNT_ROW_CLASS =
  "flex snap-x gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const ACCOUNT_CARD_CLASS =
  "h-[92px] snap-start overflow-hidden rounded-2xl border p-3 text-left transition-colors";

const ACCOUNT_CARD_STYLE: CSSProperties = {
  flex: "0 0 calc((100% - 24px) / 3)",
};

const ACCOUNT_SELECT_SHELL_CLASS = "mt-5 h-[126px]";

const ACCOUNT_LIST_CLASS = "mt-3 h-[96px] overflow-hidden";

const QUICK_AMOUNT_OPTIONS = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1 },
];

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
    <div
      style={ACCOUNT_CARD_STYLE}
      className={`${ACCOUNT_CARD_CLASS} border-zinc-800 bg-black/30`}
    >
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
  amountValue,
  maxBetAmount,
  possiblePayout,
  statusMessage,
  statusTone,
  ruleWarning,
  mobileLayout,
  showCloseButton,
  onClose,
  onToggleAccount,
  onAmountChange,
  onQuickAmount,
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
  amountValue: number;
  maxBetAmount: number;
  possiblePayout: string;
  statusMessage: string | null;
  statusTone: "warning" | "error" | null;
  ruleWarning: string | null;
  mobileLayout: boolean;
  showCloseButton: boolean;
  onClose: () => void;
  onToggleAccount: (accountId: string) => void;
  onAmountChange: (value: number | readonly number[]) => void;
  onQuickAmount: (percent: number) => void;
  onPlaceBet: () => void;
}) {
  const sliderDisabled = maxBetAmount <= 0;
  const showQuickAmounts = maxBetAmount > 0 && selectedAccountIds.length > 0;
  const showScrollHint =
    ready && authenticated && !isLoadingAccounts && accounts.length > 3;

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
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Place Bet
              </div>

              <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-zinc-100">
                {team}
              </h2>

              <p className="mt-1 text-sm leading-tight text-zinc-400">
                {matchup}
              </p>
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
        <div className="flex h-[18px] items-center justify-between gap-3">
          <div className="text-sm font-medium leading-[18px] text-zinc-300">
            Select account
          </div>

          <AnimatePresence initial={false}>
            {showScrollHint ? (
              <motion.div
                key="account-scroll-hint"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="shrink-0 text-[11px] font-medium leading-[18px] text-zinc-500"
              >
                Scroll to view more
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className={ACCOUNT_LIST_CLASS}>
          {!ready || isLoadingAccounts ? (
            <div className={ACCOUNT_ROW_CLASS}>
              {Array.from({ length: 3 }).map((_, index) => (
                <AccountOptionSkeleton key={index} />
              ))}
            </div>
          ) : !authenticated ? (
            <button
              type="button"
              onClick={login}
              className="h-[92px] w-full rounded-2xl border border-zinc-800 bg-black/30 p-4 text-left text-sm text-zinc-300"
            >
              Sign in to select an account.
            </button>
          ) : accounts.length ? (
            <div className={ACCOUNT_ROW_CLASS}>
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
                    style={ACCOUNT_CARD_STYLE}
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
            <div className="flex h-[92px] items-center rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-500">
              No accounts found. Start a challenge first.
            </div>
          )}
        </div>
      </div>

      <motion.div layout className="mt-5 overflow-x-hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium leading-none text-zinc-300">
              Bet amount
            </div>

            <motion.div
              layout
              key={amountValue}
              initial={{ opacity: 0.75, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mt-2 text-[34px] font-semibold leading-none tracking-tight text-zinc-100"
            >
              {formatMoney(amountValue)}
            </motion.div>
          </div>

          <div className="pt-[1px] text-right">
            <div className="text-[12px] leading-none text-zinc-500">
              Max{" "}
              <span className="font-semibold text-zinc-300">
                {formatMoney(maxBetAmount)}
              </span>
            </div>

            <div className="mt-2 text-[12px] leading-none text-zinc-500">
              Pot. payout{" "}
              <span className="font-semibold text-zinc-300">
                {possiblePayout}
              </span>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showQuickAmounts ? (
            <motion.div
              key="quick-amount-options"
              initial={{ height: 0, opacity: 0, y: -6 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <motion.div
                layout
                className="mt-4 grid grid-cols-4 gap-2"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {QUICK_AMOUNT_OPTIONS.map((option, index) => {
                  const optionAmount = Math.round(maxBetAmount * option.value);
                  const selected = amountValue === optionAmount;

                  return (
                    <motion.button
                      key={option.label}
                      type="button"
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.025,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onQuickAmount(option.value)}
                      className={[
                        "h-9 rounded-full text-[13px] font-semibold transition-colors",
                        selected
                          ? "bg-zinc-100 text-zinc-950"
                          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      {option.label}
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div
          className="-mx-1 mt-4 overflow-hidden px-5"
          data-vaul-no-drag=""
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
        >
          <Slider
            value={amountValue}
            min={0}
            max={Math.max(maxBetAmount, 1)}
            step={1}
            disabled={sliderDisabled}
            onValueChange={onAmountChange}
            className="[&_[data-slot=slider-range]]:bg-zinc-300 [&_[data-slot=slider-track]]:bg-zinc-700 [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:border-zinc-300 [&_[data-slot=slider-thumb]]:bg-zinc-100"
          />

          <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>$0</span>
            <span>{formatMoney(maxBetAmount)}</span>
          </div>
        </div>
      </motion.div>

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
          amountValue <= 0 ||
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
  const amountValue = Number.isFinite(stake) ? stake : 0;

  const selectedAccounts = useMemo(() => {
    return accounts.filter((account) => selectedAccountIds.includes(account.id));
  }, [accounts, selectedAccountIds]);

  const maxBetAmount = useMemo(() => {
    if (!selectedAccounts.length) return 0;

    const accountMaxes = selectedAccounts.map((account) => {
      const maxRiskAmount = getMaxRiskAmount(account);
      const currentBalance = Number(account.current_balance ?? 0);

      return Math.max(0, Math.min(maxRiskAmount, currentBalance));
    });

    return Math.floor(Math.min(...accountMaxes));
  }, [selectedAccounts]);

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

  useEffect(() => {
    if (!open) return;

    if (!selectedAccounts.length) {
      if (amount) setAmount("");
      return;
    }

    if (amountValue > maxBetAmount) {
      setAmount(maxBetAmount > 0 ? String(maxBetAmount) : "");
    }
  }, [amount, amountValue, maxBetAmount, open, selectedAccounts.length]);

  function toggleAccount(accountId: string) {
    setSelectedAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId]
    );
  }

  function handleSliderAmountChange(value: number | readonly number[]) {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const nextRawValue = Number(rawValue ?? 0);

    const nextValue = Math.round(
      Math.min(Math.max(nextRawValue, 0), Math.max(maxBetAmount, 0))
    );

    setAmount(nextValue > 0 ? String(nextValue) : "");
  }

  function handleQuickAmount(percent: number) {
    const nextValue = Math.round(maxBetAmount * percent);
    setAmount(nextValue > 0 ? String(nextValue) : "");
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
      amountValue={amountValue}
      maxBetAmount={maxBetAmount}
      possiblePayout={possiblePayout}
      statusMessage={statusMessage}
      statusTone={statusTone}
      ruleWarning={ruleWarning}
      mobileLayout={isMobile}
      showCloseButton={!isMobile}
      onClose={closeBetSlip}
      onToggleAccount={toggleAccount}
      onAmountChange={handleSliderAmountChange}
      onQuickAmount={handleQuickAmount}
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
          <DrawerContent className="overflow-hidden border-zinc-800 bg-zinc-950 text-white outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 data-[state=open]:outline-none data-[vaul-drawer-direction=bottom]:max-h-none">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Place Bet</DrawerTitle>
              <DrawerDescription>
                Choose an account and enter an amount to place this bet.
              </DrawerDescription>
            </DrawerHeader>

            <div className="mx-auto w-full max-w-2xl overflow-hidden bg-zinc-950 px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-2">
              <div className="mx-auto mb-5 h-1.5 w-12 shrink-0 rounded-full bg-zinc-800" />

              <div className="overflow-visible">{content}</div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden bg-black/75 px-4 pb-4 sm:items-center sm:pb-0">
          <button
            type="button"
            aria-label="Close bet slip"
            className="absolute inset-0 cursor-default"
            onClick={closeBetSlip}
          />

          <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl">
            {content}
          </div>
        </div>
      ) : null}
    </>
  );
}