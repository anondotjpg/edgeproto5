"use client";

import {
  memo,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { toast } from "sonner";
import { usePrivy } from "@privy-io/react-auth";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
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

export type BetSlipData = {
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
  teamLogo?: string | null;
  teamLogoAlt?: string | null;
};

type BetSlipModalProps = BetSlipData & {
  triggerClassName?: string;
  triggerContentClassName?: string;
};

const HOLD_TO_PLACE_MS = 1250;

const ACCOUNT_ROW_CLASS =
  "flex gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const ACCOUNT_CARD_CLASS =
  "h-[92px] overflow-hidden rounded-xl border p-3 text-left transition-colors";

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function MoneyFlow({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  return (
    <NumberFlow
      value={Number(value ?? 0)}
      format={{
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }}
      className={className}
    />
  );
}

function CompactMoneyFlow({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  const safeValue = Number(value ?? 0);

  if (Math.abs(safeValue) >= 1000) {
    const compactValue = safeValue / 1000;

    return (
      <span className={className}>
        $
        <NumberFlow
          value={compactValue}
          format={{
            minimumFractionDigits: 0,
            maximumFractionDigits: safeValue % 1000 === 0 ? 0 : 1,
          }}
        />
        k
      </span>
    );
  }

  return <MoneyFlow value={safeValue} className={className} />;
}

function SignedNumberFlow({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  return (
    <NumberFlow
      value={Number(value ?? 0)}
      format={{
        signDisplay: "exceptZero",
        maximumFractionDigits: 0,
      }}
      className={className}
    />
  );
}

function PercentFlow({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  return (
    <NumberFlow
      value={Number(value ?? 0)}
      format={{
        maximumFractionDigits: 0,
      }}
      suffix="%"
      className={className}
    />
  );
}

function parseImpliedPercent(value: string) {
  return Number(value.replace("%", ""));
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
  return formatCompactMoney(account.plan_size);
}

function getAccountDisplayName(account: OwnedAccount) {
  const accountName = account.account_name?.trim();

  if (accountName) return accountName;

  return getPlanLabel(account);
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
      </div>

      <div className="mt-3 space-y-1 text-[12px] leading-4">
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

const BetSlipHeader = memo(function BetSlipHeader({
  team,
  matchup,
  odds,
  impliedPercent,
  teamLogo,
  teamLogoAlt,
  mobileLayout,
  panelMode,
}: {
  team: string;
  matchup: string;
  odds: string;
  impliedPercent: string;
  teamLogo?: string | null;
  teamLogoAlt?: string | null;
  mobileLayout: boolean;
  panelMode: "modal" | "sidebar";
}) {
  return (
    <div
      className={[
        "relative pr-[122px]",
        panelMode === "sidebar"
          ? "min-h-[82px] border-b border-zinc-800 px-5 pt-4 pb-3"
          : mobileLayout
            ? "min-h-[64px] pt-[2px]"
            : "min-h-[72px]",
      ].join(" ")}
    >
      <div className="flex min-w-0 max-w-full items-start gap-3">
        {teamLogo ? (
          <img
            src={teamLogo}
            alt={teamLogoAlt ?? team}
            className={[
              "shrink-0 object-contain rounded-md",
              panelMode === "sidebar" ? "h-11 w-11" : "h-13 w-13",
            ].join(" ")}
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <h2
            className={[
              "truncate font-semibold tracking-tight text-zinc-100",
              panelMode === "sidebar"
                ? "text-[22px] leading-[1.12]"
                : mobileLayout
                  ? "text-2xl leading-[1.15]"
                  : "text-2xl leading-tight",
            ].join(" ")}
          >
            {team}
          </h2>

          <p
            className={[
              "mt-1 truncate text-zinc-400",
              panelMode === "sidebar"
                ? "text-[13px] leading-[1.2]"
                : mobileLayout
                  ? "text-sm leading-[1.25]"
                  : "text-sm leading-tight",
            ].join(" ")}
          >
            {matchup}
          </p>
        </div>
      </div>

      <div
        className={[
          "absolute text-right leading-none",
          panelMode === "sidebar" ? "right-5 top-2" : "right-0 -top-2",
        ].join(" ")}
      >
        <div
          className={[
            "font-semibold leading-none tracking-tight text-zinc-100",
            panelMode === "sidebar"
              ? "text-[26px]"
              : mobileLayout
                ? "text-[30px]"
                : "text-[34px]",
          ].join(" ")}
        >
          <SignedNumberFlow value={parseOdds(odds)} />
        </div>

        <div
          className={[
            "-mt-1 font-semibold leading-none text-zinc-500",
            panelMode === "sidebar" ? "text-[18px]" : "text-[22px]",
          ].join(" ")}
        >
          <PercentFlow value={parseImpliedPercent(impliedPercent)} />
        </div>
      </div>
    </div>
  );
});

function OffsetPlaceBetButton({
  disabled,
  isPlacing,
  mobileLayout,
  holdProgress,
  panelMode,
  onPlaceBet,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
}: {
  disabled: boolean;
  isPlacing: boolean;
  mobileLayout: boolean;
  holdProgress: number;
  panelMode: "modal" | "sidebar";
  onPlaceBet: () => void;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
}) {
  if (mobileLayout) {
    return (
      <motion.button
        type="button"
        animate={{
          scale: holdProgress > 0 ? 0.975 : 1,
        }}
        transition={{
          duration: 0.18,
          ease: [0.22, 1, 0.36, 1],
        }}
        onClick={(event) => {
          event.preventDefault();
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerCancel}
        disabled={disabled}
        className="relative mt-3 mb-7 h-16 w-full cursor-pointer select-none overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 text-[16px] font-semibold text-zinc-100 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span
          className="pointer-events-none absolute inset-y-0 left-0 bg-zinc-800"
          style={{
            width: `${holdProgress * 100}%`,
          }}
        />

        <span className="pointer-events-none relative z-10 select-none">
          {isPlacing ? "Placing..." : "Hold to Place"}
        </span>
      </motion.button>
    );
  }

  return (
    <div
      className={[
        "rounded-2xl bg-zinc-800",
        panelMode === "sidebar" ? "mt-3 mb-5" : "mt-3 mb-0",
      ].join(" ")}
      style={{
        paddingBottom: "2px",
      }}
    >
      <motion.button
        type="button"
        animate={{
          scale: 1,
        }}
        transition={{
          duration: 0.18,
          ease: [0.22, 1, 0.36, 1],
        }}
        onClick={onPlaceBet}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerCancel}
        disabled={disabled}
        className={[
          "relative w-full translate-y-[-2px] cursor-pointer select-none overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 font-semibold text-zinc-100 transition-[transform,opacity] duration-100 hover:translate-y-[-1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40",
          panelMode === "sidebar" ? "h-12 text-[15px]" : "h-12 text-[15px]",
        ].join(" ")}
      >
        <span className="pointer-events-none relative z-10 select-none">
          {isPlacing ? "Placing..." : "Place Bet"}
        </span>
      </motion.button>
    </div>
  );
}

const AccountSelectSection = memo(function AccountSelectSection({
  ready,
  authenticated,
  login,
  accounts,
  selectedAccountIds,
  isLoadingAccounts,
  mobileLayout,
  panelMode,
  onToggleAccount,
}: {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  accounts: OwnedAccount[];
  selectedAccountIds: string[];
  isLoadingAccounts: boolean;
  mobileLayout: boolean;
  panelMode: "modal" | "sidebar";
  onToggleAccount: (accountId: string) => void;
}) {
  const accountRowRef = useRef<HTMLDivElement | null>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  function updateAccountScrollState() {
    const row = accountRowRef.current;
    if (!row) return;

    const maxScrollLeft = row.scrollWidth - row.clientWidth;

    setCanScrollBack(row.scrollLeft > 2);
    setCanScrollForward(row.scrollLeft < maxScrollLeft - 2);
  }

  function scrollAccounts(direction: "back" | "forward") {
    const row = accountRowRef.current;
    if (!row) return;

    row.scrollTo({
      left:
        direction === "back"
          ? row.scrollLeft - row.clientWidth
          : row.scrollLeft + row.clientWidth,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    updateAccountScrollState();

    const row = accountRowRef.current;
    if (!row) return;

    row.addEventListener("scroll", updateAccountScrollState, { passive: true });
    window.addEventListener("resize", updateAccountScrollState);

    return () => {
      row.removeEventListener("scroll", updateAccountScrollState);
      window.removeEventListener("resize", updateAccountScrollState);
    };
  }, [ready, authenticated, isLoadingAccounts, accounts.length]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateAccountScrollState);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [ready, authenticated, isLoadingAccounts, accounts.length]);

  const showAccountScrollHint =
    ready &&
    authenticated &&
    !isLoadingAccounts &&
    mobileLayout &&
    accounts.length > 3;

  const showAccountControls =
    ready &&
    authenticated &&
    !isLoadingAccounts &&
    !mobileLayout &&
    accounts.length > 3;

  const reserveAccountControlSpace = authenticated;

  return (
    <div
      className={
        panelMode === "sidebar" ? "mt-4 h-[126px]" : ACCOUNT_SELECT_SHELL_CLASS
      }
    >
      <div className="flex h-[18px] items-center justify-between gap-3">
        <div className="text-sm font-medium leading-[18px] text-zinc-300">
          Account(s)
        </div>

        {showAccountScrollHint ? (
          <div className="shrink-0 text-[11px] font-medium leading-[18px] text-zinc-500">
            Scroll to view more
          </div>
        ) : reserveAccountControlSpace ? (
          <div
            className={[
              "flex h-[18px] w-[54px] shrink-0 items-center justify-end gap-2",
              showAccountControls ? "" : "invisible",
            ].join(" ")}
          >
            <button
              type="button"
              aria-label="Previous accounts"
              onClick={() => scrollAccounts("back")}
              disabled={!canScrollBack}
              className="flex h-[18px] w-5 cursor-pointer items-center justify-center text-zinc-500 transition-colors hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <FaChevronLeft className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              aria-label="Next accounts"
              onClick={() => scrollAccounts("forward")}
              disabled={!canScrollForward}
              className="flex h-[18px] w-5 cursor-pointer items-center justify-center text-zinc-500 transition-colors hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <FaChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      <div className={ACCOUNT_LIST_CLASS}>
        {!ready || isLoadingAccounts ? (
          <div ref={accountRowRef} className={ACCOUNT_ROW_CLASS}>
            {Array.from({ length: 3 }).map((_, index) => (
              <AccountOptionSkeleton key={index} />
            ))}
          </div>
        ) : !authenticated ? (
          <button
            type="button"
            onClick={login}
            className="flex h-[92px] w-full cursor-pointer items-start rounded-2xl border border-zinc-800 bg-black/30 p-4 text-left text-base text-zinc-300"
          >
            <span className="inline underline cursor-pointer">Sign in</span>&nbsp;to select an account
          </button>
        ) : accounts.length ? (
          <div ref={accountRowRef} className={ACCOUNT_ROW_CLASS}>
            {accounts.map((account) => {
              const selected = selectedAccountIds.includes(account.id);
              const active = ["active", "active_dev"].includes(account.status);
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
                    "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                    selected
                      ? "border-zinc-400 bg-zinc-900"
                      : "border-zinc-800 bg-black/30 hover:border-zinc-700",
                  ].join(" ")}
                >
                  <div className="flex h-5 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-5 text-zinc-100">
                      {getAccountDisplayName(account)}
                    </div>

                    <div
                      className={[
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        selected ? "border-zinc-100" : "border-zinc-700",
                      ].join(" ")}
                    >
                      {selected ? (
                        <div className="h-[6px] w-[6px] rounded-full bg-zinc-100" />
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-[12px] leading-4">
                    <div className="flex h-4 items-center justify-between gap-2">
                      <span className="text-zinc-500">Avail</span>
                      <span className="font-medium text-zinc-300">
                        <CompactMoneyFlow value={account.current_balance} />
                      </span>
                    </div>

                    <div className="flex h-4 items-center justify-between gap-2">
                      <span className="text-zinc-500">Max</span>
                      <span className="font-medium text-zinc-300">
                        <CompactMoneyFlow value={maxRiskAmount} />
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
  );
});

function BetSlipControls({
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
  possiblePayoutValue,
  statusMessage,
  statusTone,
  ruleWarning,
  mobileLayout,
  panelMode,
  onToggleAccount,
  onAmountChange,
  onQuickAmount,
  onPlaceBet,
}: {
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
  possiblePayoutValue: number;
  statusMessage: string | null;
  statusTone: "warning" | "error" | null;
  ruleWarning: string | null;
  mobileLayout: boolean;
  panelMode: "modal" | "sidebar";
  onToggleAccount: (accountId: string) => void;
  onAmountChange: (value: number | readonly number[]) => void;
  onQuickAmount: (percent: number) => void;
  onPlaceBet: () => void;
}) {
  const holdFrameRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const holdCompletedRef = useRef(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [amountShakeKey, setAmountShakeKey] = useState(0);

  const sliderDisabled = maxBetAmount <= 0;
  const showQuickAmounts = maxBetAmount > 0 && selectedAccountIds.length > 0;
  const showPotentialPayout = amountValue > 0 && possiblePayout !== "—";

  const placeBetDisabled =
    isPlacing ||
    amountValue <= 0 ||
    !selectedAccountIds.length ||
    Boolean(ruleWarning);

  function clearHold(resetProgress = true) {
    if (holdFrameRef.current !== null) {
      window.cancelAnimationFrame(holdFrameRef.current);
      holdFrameRef.current = null;
    }

    holdStartRef.current = null;
    holdCompletedRef.current = false;

    if (resetProgress) {
      setHoldProgress(0);
    }
  }

  function beginHoldToPlace(event: PointerEvent<HTMLButtonElement>) {
    if (!mobileLayout || placeBetDisabled) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    clearHold();
    holdStartRef.current = performance.now();

    const tick = (now: number) => {
      if (holdStartRef.current === null) return;

      const elapsed = now - holdStartRef.current;
      const nextProgress = Math.min(elapsed / HOLD_TO_PLACE_MS, 1);

      setHoldProgress(nextProgress);

      if (nextProgress >= 1) {
        holdCompletedRef.current = true;
        clearHold(false);
        setHoldProgress(1);
        onPlaceBet();

        window.setTimeout(() => {
          setHoldProgress(0);
        }, 180);

        return;
      }

      holdFrameRef.current = window.requestAnimationFrame(tick);
    };

    holdFrameRef.current = window.requestAnimationFrame(tick);
  }

  function cancelHoldToPlace() {
    if (!mobileLayout || holdCompletedRef.current) return;

    clearHold();
  }

  function handleSidebarAmountInputChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const rawDigits = event.target.value.replace(/[^\d]/g, "");

    if (!rawDigits) {
      onAmountChange(0);
      return;
    }

    const nextAmount = Number(rawDigits);

    if (maxBetAmount > 0 && nextAmount > maxBetAmount) {
      onAmountChange(maxBetAmount);
      setAmountShakeKey((current) => current + 1);
      return;
    }

    onAmountChange(nextAmount);
  }

  useEffect(() => {
    if (!mobileLayout || placeBetDisabled) {
      clearHold();
    }
  }, [mobileLayout, placeBetDisabled]);

  useEffect(() => {
    return () => {
      clearHold();
    };
  }, []);

  return (
    <div className={panelMode === "sidebar" ? "px-5" : ""}>
      <AccountSelectSection
        ready={ready}
        authenticated={authenticated}
        login={login}
        accounts={accounts}
        selectedAccountIds={selectedAccountIds}
        isLoadingAccounts={isLoadingAccounts}
        mobileLayout={mobileLayout}
        panelMode={panelMode}
        onToggleAccount={onToggleAccount}
      />

      <motion.div layout className="mt-5 overflow-x-hidden">
        {panelMode === "sidebar" ? (
          <div>
            <div className="mb-2 flex items-start justify-between gap-4">
              <div />

              <div className="pt-[1px] text-right">
                <div className="text-[12px] leading-none text-zinc-500">
                  Max{" "}
                  <span className="font-semibold text-zinc-300">
                    <MoneyFlow value={maxBetAmount} />
                  </span>
                </div>

                <div
                  aria-hidden={!showPotentialPayout}
                  className="text-[12px] leading-none text-zinc-500"
                >
                  Pot. payout{" "}
                  <span className="font-semibold text-zinc-300">
                    <MoneyFlow value={possiblePayoutValue} />
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div className="pb-2 text-lg font-medium leading-none text-zinc-300">
                Amount
              </div>

              <motion.div
                key={amountShakeKey}
                animate={
                  amountShakeKey > 0
                    ? { x: [0, -4, 4, -2, 2, 0] }
                    : { x: 0 }
                }
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="min-w-0 flex-1"
              >
                <input
                  value={
                    amountValue > 0
                      ? `$${amountValue.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}`
                      : ""
                  }
                  onChange={handleSidebarAmountInputChange}
                  onFocus={(event) => event.currentTarget.select()}
                  inputMode="numeric"
                  placeholder="$0"
                  className="h-[62px] w-full bg-transparent text-right text-[56px] font-semibold leading-none tracking-tight text-white outline-none placeholder:text-zinc-600"
                />
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium leading-none text-zinc-300">
                Amount
              </div>

              <motion.div
                layout
                initial={{ opacity: 0.75, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="mt-2 text-[34px] font-semibold leading-none tracking-tight text-zinc-100"
              >
                <MoneyFlow value={amountValue} />
              </motion.div>
            </div>

            <div className="pt-[1px] text-right">
              <div className="text-[12px] leading-none text-zinc-500">
                Max{" "}
                <span className="font-semibold text-zinc-300">
                  <MoneyFlow value={maxBetAmount} />
                </span>
              </div>

              <div
                aria-hidden={!showPotentialPayout}
                className="text-[12px] leading-none text-zinc-500"
              >
                Pot. payout{" "}
                <span className="font-semibold text-zinc-300">
                  <MoneyFlow value={possiblePayoutValue} />
                </span>
              </div>
            </div>
          </div>
        )}

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
                        "h-9 cursor-pointer rounded-lg text-[13px] font-semibold transition-colors",
                        selected
                          ? "bg-zinc-700 text-zinc-300"
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

        {panelMode !== "sidebar" ? (
          <div
            className="-mx-1 mt-4 overflow-hidden px-5 md:px-[7px]"
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

            <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500 md:text-[13px]">
              <span>$0</span>
              <span>{formatMoney(maxBetAmount)}</span>
            </div>
          </div>
        ) : null}
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

      <OffsetPlaceBetButton
        disabled={placeBetDisabled}
        isPlacing={isPlacing}
        mobileLayout={mobileLayout}
        holdProgress={holdProgress}
        panelMode={panelMode}
        onPlaceBet={onPlaceBet}
        onPointerDown={beginHoldToPlace}
        onPointerUp={cancelHoldToPlace}
        onPointerLeave={cancelHoldToPlace}
        onPointerCancel={cancelHoldToPlace}
      />
    </div>
  );
}

const MemoBetSlipControls = memo(BetSlipControls, (prev, next) => {
  return (
    prev.ready === next.ready &&
    prev.authenticated === next.authenticated &&
    prev.login === next.login &&
    prev.accounts === next.accounts &&
    prev.selectedAccountIds === next.selectedAccountIds &&
    prev.isLoadingAccounts === next.isLoadingAccounts &&
    prev.isPlacing === next.isPlacing &&
    prev.amountValue === next.amountValue &&
    prev.maxBetAmount === next.maxBetAmount &&
    prev.possiblePayout === next.possiblePayout &&
    prev.possiblePayoutValue === next.possiblePayoutValue &&
    prev.statusMessage === next.statusMessage &&
    prev.statusTone === next.statusTone &&
    prev.ruleWarning === next.ruleWarning &&
    prev.mobileLayout === next.mobileLayout &&
    prev.panelMode === next.panelMode &&
    prev.onToggleAccount === next.onToggleAccount &&
    prev.onAmountChange === next.onAmountChange &&
    prev.onQuickAmount === next.onQuickAmount &&
    prev.onPlaceBet === next.onPlaceBet
  );
});

function BetSlipContent({
  team,
  matchup,
  odds,
  impliedPercent,
  teamLogo,
  teamLogoAlt,
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
  possiblePayoutValue,
  statusMessage,
  statusTone,
  ruleWarning,
  mobileLayout,
  panelMode,
  onToggleAccount,
  onAmountChange,
  onQuickAmount,
  onPlaceBet,
}: {
  team: string;
  matchup: string;
  odds: string;
  impliedPercent: string;
  teamLogo?: string | null;
  teamLogoAlt?: string | null;
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
  possiblePayoutValue: number;
  statusMessage: string | null;
  statusTone: "warning" | "error" | null;
  ruleWarning: string | null;
  mobileLayout: boolean;
  panelMode: "modal" | "sidebar";
  onToggleAccount: (accountId: string) => void;
  onAmountChange: (value: number | readonly number[]) => void;
  onQuickAmount: (percent: number) => void;
  onPlaceBet: () => void;
}) {
  return (
    <>
      <BetSlipHeader
        team={team}
        matchup={matchup}
        odds={odds}
        impliedPercent={impliedPercent}
        teamLogo={teamLogo}
        teamLogoAlt={teamLogoAlt}
        mobileLayout={mobileLayout}
        panelMode={panelMode}
      />

      <MemoBetSlipControls
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
        possiblePayoutValue={possiblePayoutValue}
        statusMessage={statusMessage}
        statusTone={statusTone}
        ruleWarning={ruleWarning}
        mobileLayout={mobileLayout}
        panelMode={panelMode}
        onToggleAccount={onToggleAccount}
        onAmountChange={onAmountChange}
        onQuickAmount={onQuickAmount}
        onPlaceBet={onPlaceBet}
      />
    </>
  );
}

export function BetSlipPanel({
  enabled = true,
  panelMode = "modal",
  onPlaced,
  ...bet
}: BetSlipData & {
  enabled?: boolean;
  panelMode?: "modal" | "sidebar";
  onPlaced?: () => void;
}) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const isMobile = useIsMobile();
  const betRef = useRef(bet);

  const [amount, setAmount] = useState("");
  const [accounts, setAccounts] = useState<OwnedAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericOdds = parseOdds(bet.odds);
  const stake = Number(amount);
  const amountValue = Number.isFinite(stake) ? stake : 0;

  useEffect(() => {
    betRef.current = bet;
  }, [bet]);

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

  const possiblePayoutValue = useMemo(() => {
    if (!stake || Number.isNaN(stake)) return 0;
    if (!numericOdds || Number.isNaN(numericOdds)) return 0;

    const profit =
      numericOdds > 0
        ? stake * (numericOdds / 100)
        : stake * (100 / Math.abs(numericOdds));

    return stake + profit;
  }, [stake, numericOdds]);

  const possiblePayout = useMemo(() => {
    return formatMoney(possiblePayoutValue);
  }, [possiblePayoutValue]);

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

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      if (!enabled) return;

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
  }, [enabled, ready, authenticated, getAccessToken]);

  useEffect(() => {
    if (!enabled) return;

    if (!selectedAccounts.length) {
      if (amount) setAmount("");
      return;
    }

    if (amountValue > maxBetAmount) {
      setAmount(maxBetAmount > 0 ? String(maxBetAmount) : "");
    }
  }, [amount, amountValue, maxBetAmount, enabled, selectedAccounts.length]);

  const toggleAccount = useCallback((accountId: string) => {
    setSelectedAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId]
    );
  }, []);

  const handleSliderAmountChange = useCallback(
    (value: number | readonly number[]) => {
      const rawValue = Array.isArray(value) ? value[0] : value;
      const nextRawValue = Number(rawValue ?? 0);

      const nextValue = Math.round(
        Math.min(Math.max(nextRawValue, 0), Math.max(maxBetAmount, 0))
      );

      setAmount(nextValue > 0 ? String(nextValue) : "");
    },
    [maxBetAmount]
  );

  const handleQuickAmount = useCallback(
    (percent: number) => {
      const nextValue = Math.round(maxBetAmount * percent);
      setAmount(nextValue > 0 ? String(nextValue) : "");
    },
    [maxBetAmount]
  );

  const placeBet = useCallback(async () => {
    if (!ready) return;

    if (!authenticated) {
      login();
      return;
    }

    const currentBet = betRef.current;
    const currentNumericOdds = parseOdds(currentBet.odds);

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

      if (!currentBet.polymarketConditionId || !currentBet.polymarketTokenId) {
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
          gameId: currentBet.gameId,
          league: currentBet.league,
          market: currentBet.market,
          selection: currentBet.team,
          odds: currentNumericOdds,
          stake,

          polymarketEventId: currentBet.polymarketEventId,
          polymarketEventSlug: currentBet.polymarketEventSlug,
          polymarketMarketId: currentBet.polymarketMarketId,
          polymarketConditionId: currentBet.polymarketConditionId,
          polymarketMarketSlug: currentBet.polymarketMarketSlug,
          polymarketOutcome: currentBet.polymarketOutcome ?? currentBet.team,
          polymarketOutcomeIndex: currentBet.polymarketOutcomeIndex,
          polymarketTokenId: currentBet.polymarketTokenId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to place bet.");
      }

      toast("Bet placed", {
        description: `${formatMoney(stake)} on ${currentBet.team}`,
      });

      setAmount("");
      setSelectedAccountIds([]);
      onPlaced?.();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsPlacing(false);
    }
  }, [
    ready,
    authenticated,
    login,
    selectedAccountIds,
    stake,
    ruleWarning,
    getAccessToken,
    onPlaced,
  ]);

  return (
    <BetSlipContent
      team={bet.team}
      matchup={bet.matchup}
      odds={bet.odds}
      impliedPercent={bet.impliedPercent}
      teamLogo={bet.teamLogo}
      teamLogoAlt={bet.teamLogoAlt}
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
      possiblePayoutValue={possiblePayoutValue}
      statusMessage={statusMessage}
      statusTone={statusTone}
      ruleWarning={ruleWarning}
      mobileLayout={isMobile}
      panelMode={panelMode}
      onToggleAccount={toggleAccount}
      onAmountChange={handleSliderAmountChange}
      onQuickAmount={handleQuickAmount}
      onPlaceBet={placeBet}
    />
  );
}

export default function BetSlipModal({
  triggerClassName,
  triggerContentClassName,
  ...bet
}: BetSlipModalProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  function openBetSlip() {
    setOpen(true);
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
        {bet.odds}
      </div>
    </button>
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

              <div className="overflow-visible">
                <BetSlipPanel
                  {...bet}
                  enabled={open}
                  panelMode="modal"
                  onPlaced={closeBetSlip}
                />
              </div>
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
            <BetSlipPanel
              {...bet}
              enabled={open}
              panelMode="modal"
              onPlaced={closeBetSlip}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}