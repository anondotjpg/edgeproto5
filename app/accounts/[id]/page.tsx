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

function formatPercent(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
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

          <div className="mt-3 pb-1 text-[32px] font-semibold leading-[1.08] tracking-tight text-red-400">
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
  const healthClassName = getHealthClassName(room, limit);

  return (
    <div className="h-[238px] rounded-[26px] bg-zinc-950/80 p-5 ring-1 ring-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-medium text-zinc-500">{title}</div>

          <div
            className={[
              "mt-2 pb-1 text-[30px] font-semibold leading-[1.08] tracking-tight",
              breached ? "text-red-400" : "text-zinc-100",
            ].join(" ")}
          >
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

        <ProgressBar
          value={usedPercent}
          tone={breached ? "danger" : "default"}
        />
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

function BetCard({ bet }: { bet: BetRow }) {
  const pnl = getBetPnl(bet);
  const displayStatus = bet.result ?? bet.status;
  const isOpen = bet.status === "open";

  return (
    <div className="min-h-[154px] rounded-[22px] bg-zinc-950/80 p-4 ring-1 ring-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[16px] font-semibold leading-[1.15] tracking-tight text-zinc-100">
            {bet.selection}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-zinc-500">
            <span>{bet.league?.toUpperCase()}</span>
            <span className="text-zinc-700">•</span>
            <span>{bet.market}</span>
            <span className="text-zinc-700">•</span>
            <span>{formatOdds(bet.odds)}</span>
          </div>
        </div>

        <div
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClassName(
            displayStatus
          )}`}
        >
          {resultLabel(displayStatus)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-black/30 p-3">
          <div className="text-[11px] text-zinc-600">Stake</div>
          <div className="mt-1 text-[14px] font-semibold leading-[1.15] text-zinc-100">
            {formatMoney(bet.stake)}
          </div>
        </div>

        <div className="rounded-2xl bg-black/30 p-3">
          <div className="text-[11px] text-zinc-600">
            {isOpen ? "Possible" : "Payout"}
          </div>
          <div className="mt-1 text-[14px] font-semibold leading-[1.15] text-zinc-100">
            {formatMoney(isOpen ? bet.potential_payout : bet.settlement_amount)}
          </div>
        </div>

        <div className="rounded-2xl bg-black/30 p-3">
          <div className="text-[11px] text-zinc-600">P/L</div>
          <div
            className={[
              "mt-1 text-[14px] font-semibold leading-[1.15]",
              pnl === null ? "text-zinc-100" : pnlColor(pnl),
            ].join(" ")}
          >
            {pnl === null ? "—" : formatSignedMoney(pnl)}
          </div>
        </div>
      </div>

      {bet.polymarket_winning_outcome ? (
        <div className="mt-3 rounded-2xl bg-black/30 p-3">
          <div className="text-[11px] text-zinc-600">Resolved outcome</div>
          <div className="mt-1 text-[13px] font-medium leading-[1.2] text-zinc-200">
            {bet.polymarket_winning_outcome}
          </div>
        </div>
      ) : null}

      {bet.settlement_reason ? (
        <div className="mt-3 rounded-2xl bg-black/30 p-3 text-[12px] leading-5 text-zinc-500">
          {bet.settlement_reason}
        </div>
      ) : null}

      {bet.polymarket_resolution_error && bet.status === "open" ? (
        <div className="mt-3 rounded-2xl bg-black/30 p-3 text-[12px] leading-5 text-zinc-500">
          {bet.polymarket_resolution_error}
        </div>
      ) : null}

      <div className="mt-3 text-[12px] text-zinc-600">
        {isOpen
          ? `Placed ${formatDate(bet.placed_at)}`
          : `Settled ${formatDate(bet.settled_at)}`}
      </div>
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

  const remainingToTarget = Math.max(profitTargetBalance - ruleEquity, 0);
  const dailyRoom = ruleEquity - dailyFloor;
  const totalRoom = ruleEquity - totalFloor;

  const accountStatus = String(account.status);
  const isPassed = accountStatus === "passed";
  const isAccountFailed = accountStatus === "failed";

  return (
    <div className="min-h-screen bg-[#09090b] px-4 pb-24 pt-6 text-white sm:px-6 md:pb-12 md:pt-10">
      <div className="mx-auto mt-7 w-full max-w-6xl">
        <section className="h-[548px] rounded-[32px] bg-zinc-950/90 p-5 sm:h-[572px] sm:p-7 lg:h-[430px]">
          <div className="grid h-full gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="min-w-0 self-center">
              <div className="h-[46px] sm:h-[62px]">
                <h1 className="truncate pb-1 text-[34px] font-semibold leading-[1.1] tracking-tight text-zinc-100 sm:text-[54px]">
                  {pageTitle}
                </h1>
              </div>

              <div className="mt-5 sm:mt-6">
                <div className="text-[13px] font-medium text-zinc-500">
                  Rule equity
                </div>

                <div className="mt-1 h-[72px] sm:h-[92px]">
                  <div className="truncate pb-1 text-[58px] font-semibold leading-[1.08] tracking-tight text-zinc-100 sm:text-[76px]">
                    {formatMoney(ruleEquity)}
                  </div>
                </div>

                <div className="mt-2 text-[13px] font-medium text-zinc-500">
                  {formatMoney(currentBalance)} available
                </div>

                <div className="mt-4 flex h-8 flex-wrap gap-2 text-[13px]">
                  <span className="rounded-full bg-black/30 px-3 py-1.5 text-zinc-400 ring-1 ring-zinc-900">
                    {openBets.length} open
                  </span>

                  <span className="rounded-full bg-black/30 px-3 py-1.5 text-zinc-400 ring-1 ring-zinc-900">
                    {pastBets.length} settled
                  </span>

                  <span
                    className={[
                      "rounded-full bg-black/30 px-3 py-1.5 ring-1 ring-zinc-900",
                      pnlColor(realizedPnl),
                    ].join(" ")}
                  >
                    {formatSignedMoney(realizedPnl)} realized
                  </span>
                </div>
              </div>
            </div>

            <div className="h-[220px] rounded-[26px] bg-black/30 p-4 ring-1 ring-zinc-900 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-zinc-500">
                    Goal
                  </div>

                  <div className="mt-2">
                    <div className="truncate pb-1 text-[30px] font-semibold leading-[1.08] tracking-tight text-zinc-100 sm:text-[34px]">
                      {formatMoney(ruleEquity)}
                    </div>

                    <div className="mt-1 text-[13px] font-medium leading-[1.2] text-zinc-500">
                      of {formatMoney(profitTargetBalance)} goal
                    </div>
                  </div>
                </div>

                <div
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${accountStatusClassName()}`}
                >
                  {resultLabel(accountStatus)}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-zinc-950/70 p-3 ring-1 ring-zinc-900">
                  <div className="text-[11px] text-zinc-600">Remaining</div>

                  <div className="mt-1 text-[15px] font-semibold leading-[1.15] text-zinc-100">
                    {isPassed || remainingToTarget <= 0
                      ? "$0.00"
                      : formatMoney(remainingToTarget)}
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-950/70 p-3 ring-1 ring-zinc-900">
                  <div className="text-[11px] text-zinc-600">Target</div>

                  <div className="mt-1 text-[15px] font-semibold leading-[1.15] text-zinc-100">
                    {formatPercent(profitTargetPercent)}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[13px] leading-5 text-zinc-500">
                {isPassed
                  ? "Target reached and account passed."
                  : remainingToTarget > 0
                    ? `${formatMoney(remainingToTarget)} left to pass.`
                    : "Target reached. Passes once no positions are open."}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid h-[196px] grid-cols-2 gap-2 sm:h-[224px] sm:gap-3 lg:h-[106px] lg:grid-cols-4">
          <MetricCard
            label="Rule equity"
            value={formatMoney(ruleEquity)}
            helper="Available + open risk"
          />

          <MetricCard
            label="Open risk"
            value={formatMoney(reservedRisk)}
            helper={`${openBets.length} active position${
              openBets.length === 1 ? "" : "s"
            }`}
          />

          <MetricCard
            label="Max bet"
            value={formatMoney(maxRiskAmount)}
            helper="Largest single stake"
          />

          <MetricCard
            label="Account size"
            value={formatMoney(account.plan_size)}
            helper={plan?.sizeLabel ?? "Starting plan"}
          />
        </section>

        <section className="mt-4 grid h-[488px] gap-3 lg:h-[238px] lg:grid-cols-2">
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
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight text-zinc-100">
                Open positions
              </h2>

              <p className="mt-1 text-[14px] text-zinc-500">
                Bets that are still waiting to settle.
              </p>
            </div>

            <div className="hidden text-[13px] text-zinc-500 sm:block">
              {formatMoney(reservedRisk)} reserved
            </div>
          </div>

          {openBets.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {openBets.map((bet) => (
                <BetCard key={bet.id} bet={bet} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No open positions"
              description="This account has no active bets right now. New positions will appear here after a bet is placed."
              action={
                <Link
                  href="/"
                  className="inline-flex rounded-full bg-zinc-100 px-4 py-2 text-[14px] font-semibold text-zinc-950 transition-colors hover:bg-white"
                >
                  Browse markets
                </Link>
              }
            />
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-[24px] font-semibold tracking-tight text-zinc-100">
              Past positions
            </h2>

            <p className="mt-1 text-[14px] text-zinc-500">
              Settled wins, losses, and voids.
            </p>
          </div>

          {pastBets.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {pastBets.map((bet) => (
                <BetCard key={bet.id} bet={bet} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No past positions"
              description="Settled wins, losses, and voids for this account will appear here."
            />
          )}
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