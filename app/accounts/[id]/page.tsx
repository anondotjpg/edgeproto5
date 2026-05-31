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

function formatSignedMoney(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);
  const prefix = safeValue > 0 ? "+" : "";

  return `${prefix}${formatMoney(safeValue)}`;
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

function accountStatusClassName() {
  return "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800";
}

function statusClassName(status: string) {
  if (
    status === "active" ||
    status === "active_dev" ||
    status === "passed" ||
    status === "won"
  ) {
    return "bg-green-950/35 text-green-500 ring-1 ring-green-950/70";
  }

  if (status === "failed" || status === "lost") {
    return "bg-red-900/25 text-red-400 ring-1 ring-red-900/50";
  }

  if (status === "void") {
    return "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800";
  }

  return "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800";
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
  if (room <= 0) return "text-red-400 bg-red-900/25 ring-red-900/50";

  const ratio = limit > 0 ? room / limit : 1;

  if (ratio <= 0.25) {
    return "text-red-400 bg-red-900/25 ring-red-900/50";
  }

  if (ratio <= 0.5) {
    return "text-amber-500 bg-amber-950/30 ring-amber-950/60";
  }

  return "text-green-500 bg-green-950/35 ring-green-950/70";
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
  description,
  isAccountFailed,
}: {
  title: string;
  room: number;
  limit: number;
  description: string;
  isAccountFailed: boolean;
}) {
  if (isAccountFailed) {
    return (
      <div className="flex h-[238px] items-center justify-center rounded-[26px] bg-zinc-950/80 p-5 ring-1 ring-zinc-900">
        <div className="text-center">
          <div className="text-[13px] font-medium text-zinc-500">{title}</div>

          <div className="mt-3 pb-1 text-[32px] font-semibold leading-[1.08] tracking-tight text-zinc-100">
            Failed
          </div>

          <div className="mt-1 text-[13px] text-zinc-500">
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
  const healthClassName = "bg-zinc-900 text-zinc-400 ring-zinc-800";

  return (
    <div className="h-[238px] rounded-[26px] bg-zinc-950/80 p-5 ring-1 ring-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-medium text-zinc-500">{title}</div>

          <div className="mt-2 pb-1 text-[30px] font-semibold leading-[1.08] tracking-tight text-zinc-100">
            {breached ? "Failed" : formatMoney(safeRoom)}
          </div>

          <div className="mt-1 text-[13px] text-zinc-500">
            {breached ? "limit breached" : "room before fail"}
          </div>
        </div>

        <div
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${healthClassName}`}
        >
          {healthLabel}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[12px] text-zinc-500">
          <span>Used</span>
          <span>{Math.round(usedPercent)}%</span>
        </div>

        <ProgressBar value={usedPercent} />
      </div>

      <p className="mt-4 text-[13px] leading-6 text-zinc-500">{description}</p>
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
    <div className="min-h-[154px] rounded-[26px] bg-zinc-950/70 p-6 ring-1 ring-zinc-900">
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
        className="h-8 w-8 shrink-0 rounded-lg object-contain sm:h-9 sm:w-9"
      />
    );
  }

  return <div className="h-8 w-8 shrink-0 rounded-lg bg-zinc-900 sm:h-9 sm:w-9" />;
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
    <div className="flex min-w-0 items-start gap-2.5">
      <TeamLogo bet={bet} />

      <div className="min-w-0 flex-1 pr-2">
        <div className="truncate text-[14px] font-semibold leading-tight text-zinc-100">
          {bet.selection}
        </div>

        <div className="mt-0.5 truncate text-[12px] font-medium leading-snug text-zinc-500">
          {bet.league?.toUpperCase()} · {bet.market}
        </div>
      </div>

      <div className="shrink-0 pt-px text-right text-[16px] font-semibold leading-none text-zinc-100">
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
    <div className="mt-2 flex justify-end pl-[42px] text-[11px] leading-none">
      <div className="grid w-full max-w-[190px] grid-cols-3 gap-1.5 text-right">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
            Status
          </div>
          <div className="mt-0.5 truncate font-semibold text-zinc-400">
            {status}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
            Stake
          </div>
          <div className="mt-0.5 font-semibold text-zinc-100">{stake}</div>
        </div>

        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
            {resultLabel}
          </div>
          <div
            className={[
              "mt-0.5 font-semibold",
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
        <div className="shrink-0 text-right text-[12px] font-medium text-zinc-500 sm:text-[13px]">
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

function ActiveBetRow({ bet }: { bet: BetRow }) {
  const displayStatus = bet.result ?? bet.status;

  return (
    <div className="border-b border-zinc-900/80 px-3 py-2.5 text-sm last:border-b-0 sm:px-5 sm:py-3">
      <div className="lg:hidden">
        <MobileBetTop bet={bet} />
        <MobileValueGrid
          status={resultLabel(displayStatus)}
          stake={formatMoney(bet.stake)}
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
          {formatMoney(bet.stake)}
        </div>

        <div className="text-right font-semibold text-zinc-100">
          {formatMoney(bet.potential_payout)}
        </div>
      </div>
    </div>
  );
}

function PastBetRow({ bet }: { bet: BetRow }) {
  const pnl = getBetPnl(bet);
  const displayStatus = bet.result ?? bet.status;
  const pnlNumber = Number(pnl ?? 0);
  const pnlTone =
    pnlNumber > 0 ? "positive" : pnlNumber < 0 ? "negative" : "neutral";

  return (
    <div className="border-b border-zinc-900/80 px-3 py-2.5 text-sm last:border-b-0 sm:px-5 sm:py-3">
      <div className="lg:hidden">
        <MobileBetTop bet={bet} />
        <MobileValueGrid
          status={resultLabel(displayStatus)}
          stake={formatMoney(bet.stake)}
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
          {formatMoney(bet.stake)}
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
        openBets.map((bet) => <ActiveBetRow key={bet.id} bet={bet} />)
      ) : (
        <EmptyTableRow message="No open positions." />
      )}

      <TableSectionHeader title="Past" count={pastBets.length} />
      <TableHeader labels={["Team", "Status", "Odds", "Stake", "P/L"]} />
      {pastBets.length ? (
        pastBets.map((bet) => <PastBetRow key={bet.id} bet={bet} />)
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

  const allBets = (bets ?? []) as BetRow[];
  const openBets = allBets.filter((bet) => bet.status === "open");
  const pastBets = allBets.filter((bet) => bet.status !== "open");

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
      <div className="mx-auto w-full max-w-7xl px-4 pt-15 pb-32 sm:px-6 md:py-15 md:pb-24">
        <section className="rounded-[32px] bg-zinc-950/90 p-4 sm:p-5">
          <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)]">
            <div className="flex h-[142px] min-w-0 flex-col justify-between overflow-hidden lg:h-[146px]">
              <div className="min-w-0">
                <h1 className="truncate pb-1 text-[29px] font-semibold leading-[1.08] tracking-tight text-zinc-100 sm:text-[34px] lg:text-[36px]">
                  {pageTitle}
                </h1>

                <div className="mt-3 text-[12px] font-medium leading-none text-zinc-500">
                  Rule equity
                </div>

                <div className="mt-2 flex min-w-0 items-end gap-3">
                  <div className="min-w-0 truncate pb-1 text-[36px] font-semibold leading-[1.04] tracking-tight text-zinc-100 sm:text-[42px] lg:text-[44px]">
                    {formatMoney(ruleEquity)}
                  </div>

                  <div
                    className={[
                      "mb-2 shrink-0 text-[12px] font-medium leading-none sm:mb-2.5",
                      pnlColor(realizedPnl),
                    ].join(" ")}
                  >
                    {formatSignedMoney(realizedPnl)} realized
                  </div>
                </div>

                <div className="mt-1 truncate text-[13px] font-medium leading-none text-zinc-500">
                  {formatMoney(currentBalance)} available
                </div>
              </div>
            </div>

            <div className="flex h-[142px] flex-col justify-between rounded-[26px] bg-black/30 p-5 ring-1 ring-zinc-900 lg:h-[146px]">
              <div className="flex items-start justify-between gap-4">
                <div className="text-[13px] font-medium leading-none text-zinc-500">
                  Goal
                </div>

                <div
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${accountStatusClassName()}`}
                >
                  {resultLabel(accountStatus)}
                </div>
              </div>

              <div className="min-w-0">
                <div className="truncate pb-1 text-[32px] font-semibold leading-[1.12] tracking-tight text-zinc-100 sm:text-[36px] lg:text-[38px]">
                  {formatMoney(ruleEquity)}
                </div>

                <div className="truncate text-[13px] font-medium leading-[1.35] text-zinc-500">
                  of {formatMoney(profitTargetBalance)} goal
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-3 grid h-[488px] gap-3 sm:mt-3 lg:h-[238px] lg:grid-cols-2">
          <RuleRoomCard
            title="Daily loss room"
            room={dailyRoom}
            limit={dailyLossLimit}
            description={`Today started at ${formatMoney(
              dayStartingBalance
            )}. If rule equity reaches ${formatMoney(
              dailyFloor
            )}, this account fails the daily loss rule.`}
            isAccountFailed={isAccountFailed}
          />

          <RuleRoomCard
            title="Total loss room"
            room={totalRoom}
            limit={totalLossLimit}
            description={`This account started at ${formatMoney(
              startingBalance
            )}. If rule equity reaches ${formatMoney(
              totalFloor
            )}, this account fails the total loss rule.`}
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