import type React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PLAN_CONFIG, type PlanKey } from "@/lib/plans";

interface AccountPageProps {
  params: Promise<{ id: string }>;
}

type BetRow = {
  id: string;
  selection: string;
  league: string;
  market: string;
  odds: number;
  stake: number;
  potential_profit: number;
  potential_payout: number;
  status: string;
  result: string | null;
  settlement_amount: number | null;
  settlement_reason: string | null;
  placed_at: string;
  settled_at: string | null;
  team_logo: string | null;
  team_logo_alt: string | null;
  polymarket_winning_outcome: string | null;
  polymarket_resolution_error: string | null;
};

function formatMoney(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);

  return `$${safeValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}


function formatMoneyInteger(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);

  return `$${safeValue.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatSignedMoney(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);
  const sign = safeValue > 0 ? "+" : safeValue < 0 ? "-" : "";

  return `${sign}${formatMoney(Math.abs(safeValue))}`;
}

function formatOdds(odds: number | null | undefined) {
  const safeOdds = Number(odds ?? 0);
  return safeOdds > 0 ? `+${safeOdds}` : `${safeOdds}`;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  const formatted = new Date(date).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatted} EST`;
}

function formatCompactAccountSize(value: number | null | undefined) {
  const size = Number(value ?? 0);

  if (!size) return "";

  if (size >= 1000) {
    return `${Math.round(size / 1000)}k`;
  }

  return String(size);
}

function getTodayNewYorkDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getBetPnl(bet: BetRow) {
  if (bet.status === "won") return Number(bet.potential_profit ?? 0);
  if (bet.status === "lost") return -Number(bet.stake ?? 0);
  if (bet.status === "void") return 0;
  return null;
}

function getSettledSortTime(bet: Pick<BetRow, "settled_at" | "placed_at">) {
  const timestamp = Date.parse(bet.settled_at ?? bet.placed_at);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortPastBetsBySettledAt(bets: BetRow[]) {
  return [...bets].sort((a, b) => getSettledSortTime(b) - getSettledSortTime(a));
}

function resultLabel(status: string) {
  if (status === "open") return "Open";
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  if (status === "void") return "Void";
  if (status === "passed") return "Passed";
  if (status === "failed") return "Failed";
  if (status === "active_dev") return "Active";
  if (status === "active") return "Active";
  return status;
}


const COMPACT_BADGE_CLASS =
  "shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium tracking-[0.12em] text-zinc-500";

function accountStatusClassName() {
  return "bg-zinc-900 text-zinc-400";
}

function statusClassName(status: string) {
  if (
    status === "active" ||
    status === "active_dev" ||
    status === "passed" ||
    status === "won"
  ) {
    return "bg-green-950/35 text-green-500";
  }

  if (status === "failed" || status === "lost") {
    return "bg-red-900/25 text-red-400";
  }

  if (status === "void") {
    return "bg-zinc-900 text-zinc-400";
  }

  return "bg-zinc-900 text-zinc-400";
}

function pnlColor(value: number) {
  if (value > 0) return "text-green-500";
  if (value < 0) return "text-red-400";
  return "text-zinc-100";
}

function getHealthLabel(room: number, limit: number) {
  if (room <= 0) return "Breached";

  const ratio = limit > 0 ? room / limit : 1;

  if (ratio <= 0.25) return "Danger";
  if (ratio <= 0.5) return "Careful";
  return "Healthy";
}

function getHealthClassName(room: number, limit: number) {
  if (room <= 0) return "text-red-400 bg-red-900/25";

  const ratio = limit > 0 ? room / limit : 1;

  if (ratio <= 0.25) {
    return "text-red-400 bg-red-900/25";
  }

  if (ratio <= 0.5) {
    return "text-amber-500 bg-amber-950/30";
  }

  return "text-green-500 bg-green-950/35";
}

function ProgressBar({
  value,
  tone = "default",
}: {
  value: number;
  tone?: "default" | "danger" | "success";
}) {
  const width = Math.min(Math.max(value, 0), 100);

  const color =
    tone === "danger"
      ? "bg-red-500"
      : tone === "success"
        ? "bg-green-600"
        : "bg-zinc-100";

  return (
    <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

type SegmentedBarTone = "goal" | "loss";

function SegmentedProgressBars({
  value,
  barCount,
  tone,
}: {
  value: number;
  barCount: number;
  tone: SegmentedBarTone;
}) {
  const progress = Math.min(Math.max(value, 0), 100);
  const step = 100 / barCount;
  const filledBarCount = Math.ceil((progress / 100) * barCount);

  const getBarFill = (index: number) => {
    const barStart = index * step;
    const barEnd = barStart + step;

    if (progress >= barEnd) return 1;
    if (progress <= barStart) return 0;

    return (progress - barStart) / step;
  };

  const getBarColor = (index: number) => {
    const ratio = barCount <= 1 ? 1 : index / (barCount - 1);

    if (tone === "loss") {
      const hue = 48 - ratio * 48;
      return `hsl(${hue} 92% 55%)`;
    }

    const hue = 42 + ratio * 98;
    return `hsl(${hue} 82% 52%)`;
  };

  const getFillDelay = (index: number) => {
    const lastFilledIndex = Math.max(filledBarCount - 1, 1);
    const ratio = Math.min(Math.max(index / lastFilledIndex, 0), 1);
    const delayMs = 55 + index * 10 + Math.pow(ratio, 2.15) * 420;

    return `${Math.round(delayMs)}ms`;
  };

  return (
    <>
      <style>{`
        @keyframes segmented-progress-fill {
          from {
            opacity: 0.68;
          }
          to {
            opacity: var(--target-opacity);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .segmented-progress-overlay {
            animation: none !important;
            opacity: var(--target-opacity) !important;
          }
        }
      `}</style>

      <div className="flex h-8 w-full items-center sm:h-9">
        <div
          className="grid h-6 w-full items-stretch gap-1.5 sm:h-7"
          style={{ gridTemplateColumns: `repeat(${barCount}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: barCount }).map((_, index) => {
            const fill = getBarFill(index);
            const targetOpacity = 0.68 * (1 - fill);
            const shouldAnimate = fill > 0;

            return (
              <div
                key={index}
                className="relative min-w-0 overflow-hidden rounded-full bg-zinc-900"
              >
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: getBarColor(index) }}
                />

                <div
                  className="segmented-progress-overlay absolute inset-0 rounded-full bg-zinc-950"
                  style={
                    {
                      "--target-opacity": targetOpacity.toString(),
                      animation: shouldAnimate
                        ? "segmented-progress-fill 340ms cubic-bezier(0.16, 1, 0.3, 1) forwards"
                        : undefined,
                      animationDelay: shouldAnimate ? getFillDelay(index) : undefined,
                      opacity: shouldAnimate ? 0.68 : targetOpacity,
                      willChange: shouldAnimate ? "opacity" : undefined,
                    } as React.CSSProperties
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function ResponsiveProgressBars({
  value,
  tone,
}: {
  value: number;
  tone: SegmentedBarTone;
}) {
  return (
    <>
      <div className="md:hidden">
        <SegmentedProgressBars value={value} barCount={28} tone={tone} />
      </div>

      <div className="hidden md:block xl:hidden">
        <SegmentedProgressBars value={value} barCount={35} tone={tone} />
      </div>

      <div className="hidden xl:block">
        <SegmentedProgressBars value={value} barCount={42} tone={tone} />
      </div>
    </>
  );
}

function GoalProgressBar({ value }: { value: number }) {
  return <ResponsiveProgressBars value={value} tone="goal" />;
}

function LossRuleProgressBar({ value }: { value: number }) {
  return <ResponsiveProgressBars value={value} tone="loss" />;
}

function MetricCard({
  label,
  value,
  helper,
  valueClassName = "text-zinc-100",
}: {
  label: string;
  value: string;
  helper?: string;
  valueClassName?: string;
}) {
  return (
    <div className="h-[94px] rounded-[18px] bg-zinc-950/80 p-3 ring-1 ring-zinc-900 sm:h-[106px] sm:rounded-[22px] sm:p-4">
      <div className="text-[11px] font-medium leading-none text-zinc-500 sm:text-[12px]">
        {label}
      </div>

      <div
        className={`mt-2 truncate text-[17px] font-semibold leading-[1.15] tracking-tight sm:text-[22px] ${valueClassName}`}
      >
        {value}
      </div>

      {helper ? (
        <div className="mt-1 truncate text-[11px] leading-4 text-zinc-600 sm:mt-2 sm:text-[12px] sm:leading-5">
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function RuleRoomCard({
  title,
  room,
  limit,
  isAccountFailed,
}: {
  title: string;
  room: number;
  limit: number;
  isAccountFailed: boolean;
}) {
  if (isAccountFailed) {
    return (
      <div className="flex min-h-[166px] items-center justify-center rounded-[26px] bg-zinc-950/80 px-5 py-4 ring-1 ring-zinc-900">
        <div className="text-center">
          <div className="text-[17px] font-medium leading-tight text-zinc-500">
            {title}
          </div>

          <div className="mt-2 min-h-[34px] text-[28px] font-semibold leading-tight tracking-tight text-zinc-100">
            Failed
          </div>

          <div className="mt-1 text-[13px] leading-tight text-zinc-500">
            Loss limit breached
          </div>
        </div>
      </div>
    );
  }

  const breached = room <= 0;
  const safeRoom = Math.max(room, 0);

  const usedPercent =
    limit > 0
      ? Math.min(Math.max(((limit - safeRoom) / limit) * 100, 0), 100)
      : 0;

  const healthLabel = getHealthLabel(room, limit);

  return (
    <div className="flex min-h-[166px] flex-col rounded-[26px] bg-zinc-950/80 px-5 py-4 ring-1 ring-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[17px] font-medium leading-tight text-zinc-500">
            {title}
          </div>

          <div className="mt-2 min-h-[34px] truncate text-[26px] font-semibold leading-tight tracking-tight text-zinc-100 sm:text-[28px]">
            {breached ? "Failed" : formatMoney(safeRoom)}
          </div>

          <div className="mt-1 truncate text-[13px] leading-tight text-zinc-500">
            {breached ? "limit breached" : "amount before fail"}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-2">
        <LossRuleProgressBar value={usedPercent} />
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="min-h-[154px] bg-zinc-950/70">
      <div className="text-[17px] font-semibold tracking-tight text-zinc-100">
        {title}
      </div>

      <p className="mt-2 max-w-xl text-[14px] leading-6 text-zinc-500">
        {description}
      </p>

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}


function StatusText({ status }: { status: string }) {
  return (
    <div className="text-sm font-medium text-zinc-400">
      {resultLabel(status)}
    </div>
  );
}

function TeamLogo({ bet }: { bet: BetRow }) {
  if (bet.team_logo) {
    return (
      <img
        src={bet.team_logo}
        alt={bet.team_logo_alt || bet.selection}
        className="h-11 w-11 shrink-0 rounded-lg object-contain lg:h-9 lg:w-9"
      />
    );
  }

  return <div className="h-11 w-11 shrink-0 rounded-lg bg-zinc-900 lg:h-9 lg:w-9" />;
}

function TeamCell({ bet }: { bet: BetRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <TeamLogo bet={bet} />

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-zinc-100">
          {bet.selection}
        </div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600">
          {bet.league}
        </div>
      </div>
    </div>
  );
}

function MobileBetTop({ bet }: { bet: BetRow }) {
  return (
    <div className="flex min-w-0 items-start gap-3.5">
      <TeamLogo bet={bet} />

      <div className="min-w-0 flex-1 pr-2">
        <div className="h-6 truncate text-[17px] font-semibold leading-6 text-zinc-100">
          {bet.selection}
        </div>

        <div className="mt-1 h-5 truncate text-[13px] font-medium leading-5 text-zinc-500">
          {bet.league?.toUpperCase()}
        </div>
      </div>

      <div className="mt-0.5 h-6 shrink-0 text-right text-[20px] font-semibold leading-6 text-zinc-100">
        {formatOdds(Number(bet.odds))}
      </div>
    </div>
  );
}

function MobileValueGrid({
  status,
  stake,
  result,
  resultLabel,
  resultTone = "neutral",
}: {
  status: string;
  stake: string;
  result: string;
  resultLabel: string;
  resultTone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="mt-3 flex justify-end pl-[58px]">
      <div className="grid w-full max-w-[250px] grid-cols-3 gap-2.5 text-right">
        <div>
          <div className="h-3.5 truncate text-[11px] font-medium uppercase leading-[14px] tracking-[0.14em] text-zinc-600">
            Status
          </div>
          <div className="mt-2 h-6 truncate text-[15px] font-semibold leading-6 text-zinc-400">
            {status}
          </div>
        </div>

        <div>
          <div className="h-3.5 truncate text-[11px] font-medium uppercase leading-[14px] tracking-[0.14em] text-zinc-600">
            Stake
          </div>
          <div className="mt-2 h-6 truncate text-[15px] font-semibold leading-6 text-zinc-100">
            {stake}
          </div>
        </div>

        <div>
          <div className="h-3.5 truncate text-[11px] font-medium uppercase leading-[14px] tracking-[0.14em] text-zinc-600">
            {resultLabel}
          </div>
          <div
            className={[
              "mt-2 h-6 truncate text-[15px] font-semibold leading-6",
              resultTone === "positive"
                ? "text-green-500"
                : resultTone === "negative"
                  ? "text-red-400"
                  : "text-zinc-100",
            ].join(" ")}
          >
            {result}
          </div>
        </div>
      </div>
    </div>
  );
}

function getBetRowClassName(index: number) {
  const tint =
    index % 3 === 0
      ? "bg-zinc-950/80"
      : index % 3 === 1
        ? "bg-zinc-900/35"
        : "bg-zinc-900/20";

  return [
    "border-b border-zinc-900/80 px-3 py-4 text-sm last:border-b-0 sm:px-5 sm:py-3.5 lg:py-3",
    "transition-colors hover:bg-zinc-900/55",
    tint,
  ].join(" ");
}

function TableSectionHeader({
  title,
  count,
  rightContent,
}: {
  title: string;
  count: number;
  rightContent?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-900 bg-zinc-950 px-3 py-3.5 sm:px-5 sm:py-4 lg:min-w-[640px]">
      <h2 className="text-base font-semibold tracking-tight text-zinc-100 sm:text-xl">
        {title} <span className="text-zinc-500">({count})</span>
      </h2>

      {rightContent ? (
        <div className="shrink-0 text-right text-[11px] font-medium tracking-[0.02em] text-zinc-500 sm:text-[12px]">
          {rightContent}
        </div>
      ) : null}
    </div>
  );
}

function TableHeader({ labels }: { labels: string[] }) {
  return (
    <div className="hidden min-w-[640px] grid-cols-[minmax(220px,1fr)_86px_86px_104px_116px] border-b border-zinc-900 bg-black/20 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600 lg:grid lg:px-5">
      {labels.map((label, index) => (
        <div key={label} className={index >= 2 ? "text-right" : "text-left"}>
          {label}
        </div>
      ))}
    </div>
  );
}

function EmptyTableRow({ message }: { message: string }) {
  return (
    <div className="border-b border-zinc-900/80 px-4 py-8 text-sm text-zinc-500 last:border-b-0 sm:px-5 lg:min-w-[640px]">
      {message}
    </div>
  );
}

function EmptyOpenPositionsRow() {
  return (
    <div className="border-b border-zinc-900/80 px-3 py-3 last:border-b-0 sm:px-5 lg:min-w-[640px]">
      <EmptyState
        title="No open positions"
        description="This account has no active bets right now. New positions will appear here after a bet is placed."
        action={
          <Link
            href="/"
            className="inline-flex rounded-xl bg-black/30 px-4 py-2 text-sm font-medium text-zinc-300 ring-1 ring-zinc-800 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            Browse markets
          </Link>
        }
      />
    </div>
  );
}

function ActiveBetRow({ bet, index }: { bet: BetRow; index: number }) {
  const displayStatus = bet.result ?? bet.status;

  return (
    <div className={getBetRowClassName(index)}>
      <div className="lg:hidden">
        <MobileBetTop bet={bet} />
        <MobileValueGrid
          status={resultLabel(displayStatus)}
          stake={formatMoneyInteger(bet.stake)}
          result={formatMoney(bet.potential_payout)}
          resultLabel="Payout"
        />
      </div>

      <div className="hidden min-w-[640px] grid-cols-[minmax(220px,1fr)_86px_86px_104px_116px] items-center lg:grid">
        <TeamCell bet={bet} />

        <StatusText status={displayStatus} />

        <div className="text-right font-semibold text-zinc-100">
          {formatOdds(Number(bet.odds))}
        </div>

        <div className="text-right font-semibold text-zinc-100">
          {formatMoneyInteger(bet.stake)}
        </div>

        <div className="text-right font-semibold text-zinc-100">
          {formatMoney(bet.potential_payout)}
        </div>
      </div>
    </div>
  );
}

function PastBetRow({ bet, index }: { bet: BetRow; index: number }) {
  const pnl = getBetPnl(bet);
  const displayStatus = bet.result ?? bet.status;
  const pnlNumber = Number(pnl ?? 0);
  const pnlTone =
    pnlNumber > 0 ? "positive" : pnlNumber < 0 ? "negative" : "neutral";

  return (
    <div className={getBetRowClassName(index)}>
      <div className="lg:hidden">
        <MobileBetTop bet={bet} />
        <MobileValueGrid
          status={resultLabel(displayStatus)}
          stake={formatMoneyInteger(bet.stake)}
          result={pnl === null ? "—" : formatSignedMoney(pnl)}
          resultLabel="P/L"
          resultTone={pnlTone}
        />
      </div>

      <div className="hidden min-w-[640px] grid-cols-[minmax(220px,1fr)_86px_86px_104px_116px] items-center lg:grid">
        <TeamCell bet={bet} />

        <StatusText status={displayStatus} />

        <div className="text-right font-semibold text-zinc-100">
          {formatOdds(Number(bet.odds))}
        </div>

        <div className="text-right font-semibold text-zinc-100">
          {formatMoneyInteger(bet.stake)}
        </div>

        <div
          className={[
            "text-right font-semibold",
            pnlTone === "positive"
              ? "text-green-500"
              : pnlTone === "negative"
                ? "text-red-400"
                : "text-zinc-100",
          ].join(" ")}
        >
          {pnl === null ? "—" : formatSignedMoney(pnl)}
        </div>
      </div>
    </div>
  );
}

function PositionsTable({
  openBets,
  pastBets,
  openRisk,
}: {
  openBets: BetRow[];
  pastBets: BetRow[];
  openRisk: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/80 shadow-sm lg:overflow-x-auto">
      <TableSectionHeader
        title="Open"
        count={openBets.length}
        rightContent={
          <span>
            Open risk <span className="font-semibold text-zinc-300">{formatMoney(openRisk)}</span>
          </span>
        }
      />
      <TableHeader labels={["Team", "Status", "Odds", "Stake", "Payout"]} />
      {openBets.length ? (
        openBets.map((bet, index) => (
          <ActiveBetRow key={bet.id} bet={bet} index={index} />
        ))
      ) : (
        <EmptyOpenPositionsRow />
      )}

      <TableSectionHeader title="Past" count={pastBets.length} />
      <TableHeader labels={["Team", "Status", "Odds", "Stake", "P/L"]} />
      {pastBets.length ? (
        pastBets.map((bet, index) => (
          <PastBetRow key={bet.id} bet={bet} index={index} />
        ))
      ) : (
        <EmptyTableRow message="No past positions." />
      )}
    </div>
  );
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { id } = await params;

  const { data: account, error } = await supabaseAdmin
    .from("challenge_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!account) {
    notFound();
  }

  const today = getTodayNewYorkDate();

  const [{ data: bets, error: betsError }, { data: dailySnapshot }] =
    await Promise.all([
      supabaseAdmin
        .from("bets")
        .select(
          `
          id,
          selection,
          league,
          market,
          odds,
          stake,
          potential_profit,
          potential_payout,
          status,
          result,
          settlement_amount,
          settlement_reason,
          placed_at,
          settled_at,
          team_logo,
          team_logo_alt,
          polymarket_winning_outcome,
          polymarket_resolution_error
        `
        )
        .eq("account_id", id)
        .order("placed_at", { ascending: false }),

      supabaseAdmin
        .from("account_daily_snapshots")
        .select("starting_balance")
        .eq("account_id", id)
        .eq("day", today)
        .maybeSingle(),
    ]);

  if (betsError) {
    throw betsError;
  }

  const plan = PLAN_CONFIG[account.plan_key as PlanKey];

  const startingBalance = Number(
    account.starting_balance ?? account.plan_size ?? 0
  );
  const currentBalance = Number(account.current_balance ?? 0);
  const reservedRisk = Number(account.reserved_risk ?? 0);
  const realizedPnl = Number(account.realized_pnl ?? 0);
  const ruleEquity = currentBalance + reservedRisk;

  const profitTargetPercent = Number(account.profit_target_percent ?? 30);
  const dailyDrawdownPercent = Number(account.daily_drawdown_percent ?? 10);
  const totalDrawdownPercent = Number(account.total_drawdown_percent ?? 20);

  const profitTargetBalance = startingBalance * (1 + profitTargetPercent / 100);

  const maxRiskAmount = Number(
    account.max_risk_amount ?? startingBalance * 0.05
  );

  const dailyLossLimit = Number(
    account.daily_loss_limit_amount ??
      startingBalance * (dailyDrawdownPercent / 100)
  );

  const totalLossLimit = Number(
    account.total_loss_limit_amount ??
      startingBalance * (totalDrawdownPercent / 100)
  );

  const dayStartingBalance = Number(
    dailySnapshot?.starting_balance ?? ruleEquity
  );

  const dailyFloor = dayStartingBalance - dailyLossLimit;
  const totalFloor = startingBalance - totalLossLimit;

  const goalProgress =
    profitTargetBalance > startingBalance
      ? ((ruleEquity - startingBalance) /
          (profitTargetBalance - startingBalance)) *
        100
      : 0;

  const allBets = (bets ?? []) as BetRow[];
  const openBets = allBets.filter((bet) => bet.status === "open");
  const pastBets = sortPastBetsBySettledAt(
    allBets.filter((bet) => bet.status !== "open")
  );

  const fallbackAccountTitle =
    plan?.sizeLabel ??
    `${
      formatCompactAccountSize(Number(account.plan_size)) ||
      formatMoney(account.plan_size)
    } Account`;

  const accountName =
    typeof account.account_name === "string"
      ? account.account_name.trim()
      : "";

  const pageTitle = accountName || `${fallbackAccountTitle} Challenge`;

  const dailyRoom = ruleEquity - dailyFloor;
  const totalRoom = ruleEquity - totalFloor;

  const accountStatus = String(account.status);
  const isAccountFailed = accountStatus === "failed";

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 pt-20 pb-32 sm:px-6 md:py-15 md:pb-24">
        <section>
          <div className="grid items-stretch gap-3 lg:grid-cols-2">
            <div className="flex min-h-[142px] min-w-0 flex-col justify-between overflow-visible lg:min-h-[166px]">
              <div className="min-w-0">
                <div className="flex h-[36px] max-w-full items-start overflow-hidden sm:h-[42px] lg:h-[44px]">
                  <h1 className="truncate text-[29px] font-semibold leading-[1.08] tracking-tight text-zinc-100 sm:text-[34px] lg:text-[36px]">
                    {pageTitle}
                  </h1>
                </div>

                <div className="mt-3 text-[12px] font-medium leading-none text-zinc-500">
                  Rule equity
                </div>

                <div className="mt-2 flex min-w-0 items-end gap-3">
                  <div className="min-w-0 truncate pb-1 text-[36px] font-semibold leading-[1.04] tracking-tight text-zinc-100 sm:text-[42px] lg:text-[44px]">
                    {formatMoney(ruleEquity)}
                  </div>

                  <div
                    className={[
                      "mb-2 shrink-0 text-[15px] font-semibold leading-none sm:mb-2.5",
                      pnlColor(realizedPnl),
                    ].join(" ")}
                  >
                    {formatSignedMoney(realizedPnl)} realized
                  </div>
                </div>

                <div className="mt-1 truncate text-[13px] font-medium leading-tight text-zinc-500">
                  {formatMoney(currentBalance)} available
                </div>
              </div>
            </div>

            <div className="flex min-h-[166px] flex-col rounded-[26px] bg-zinc-950/80 px-5 py-4 ring-1 ring-zinc-900 lg:ring-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[17px] font-medium leading-tight text-zinc-500">
                    Goal
                  </div>

                  <div className="mt-2 min-h-[34px] truncate text-[26px] font-semibold leading-tight tracking-tight text-zinc-100 sm:text-[28px]">
                    {formatMoney(ruleEquity)}
                  </div>

                  <div className="mt-1 truncate text-[13px] font-medium leading-tight text-zinc-500">
                    of {formatMoney(profitTargetBalance)} goal
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-2">
                <GoalProgressBar value={goalProgress} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-3 grid gap-3 lg:grid-cols-2">
          <RuleRoomCard
            title="Daily loss"
            room={dailyRoom}
            limit={dailyLossLimit}
            isAccountFailed={isAccountFailed}
          />

          <RuleRoomCard
            title="Total loss"
            room={totalRoom}
            limit={totalLossLimit}
            isAccountFailed={isAccountFailed}
          />
        </section>

        <section className="mt-10">
          <PositionsTable openBets={openBets} pastBets={pastBets} openRisk={reservedRisk} />
        </section>

        <section className="mt-10 min-h-[72px] rounded-[24px] bg-zinc-950/70 p-4 ring-1 ring-zinc-900">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Account ID
          </div>

          <div className="mt-2 break-all text-[13px] text-zinc-400">
            {account.id}
          </div>
        </section>
      </div>
    </div>
  );
}