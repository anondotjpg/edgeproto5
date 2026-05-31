"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

type AccountJoin = {
  account_name: string | null;
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
  team_logo?: string | null;
  team_logo_alt?: string | null;
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

function formatMoneyInteger(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);

  return `$${safeValue.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatMoneyTwo(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);

  return `$${safeValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactAccountSize(value: number | null | undefined) {
  const size = Number(value ?? 0);

  if (!size) return "";
  if (size >= 1000) return `${Math.round(size / 1000)}k`;

  return String(size);
}

function getAccountLabel(bet: Bet) {
  const accountName = bet.challenge_accounts?.account_name?.trim();

  if (accountName) return accountName;

  const size = bet.challenge_accounts?.plan_size;
  const compactSize = formatCompactAccountSize(size);

  if (!compactSize) return "Account";

  return `${compactSize} Account`;
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

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-zinc-900 ${className}`} />
  );
}

function TableSectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="border-b border-zinc-900 bg-zinc-950 px-3 py-3.5 sm:px-5 sm:py-4 lg:min-w-[560px] xl:min-w-[760px]">
      <h2 className="text-base font-semibold tracking-tight text-zinc-100 sm:text-xl">
        {title} <span className="text-zinc-500">({count})</span>
      </h2>
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
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-5 sm:p-6">
      <h3 className="text-lg font-semibold tracking-tight text-zinc-100">
        {title}
      </h3>

      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
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

function TeamLogo({ bet }: { bet: Bet }) {
  if (bet.team_logo) {
    return (
      <img
        src={bet.team_logo}
        alt={bet.team_logo_alt || bet.selection}
        className="h-8 w-8 shrink-0 rounded-md object-contain sm:h-9 sm:w-9"
      />
    );
  }

  return (
    <div className="h-8 w-8 shrink-0 rounded-md bg-zinc-900 sm:h-9 sm:w-9" />
  );
}

function TeamCell({ bet }: { bet: Bet }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <TeamLogo bet={bet} />

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-zinc-100">
          {bet.selection}
        </div>
        <Link
          href={`/accounts/${bet.account_id}`}
          className="mt-1 block truncate text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600 transition-colors hover:text-zinc-400 xl:hidden"
        >
          {getAccountLabel(bet)}
        </Link>

        <div className="mt-1 hidden text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600 xl:block">
          {bet.league}
        </div>
      </div>
    </div>
  );
}

function MobileBetTop({ bet }: { bet: Bet }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <TeamLogo bet={bet} />

      <div className="min-w-0 flex-1 pr-2">
        <div className="truncate text-[14px] font-semibold leading-tight text-zinc-100">
          {bet.selection}
        </div>

        <Link
          href={`/accounts/${bet.account_id}`}
          className="mt-0.5 block truncate text-[12px] font-medium leading-snug text-zinc-500 transition-colors hover:text-zinc-300"
        >
          {getAccountLabel(bet)}
        </Link>
      </div>

      <div className="shrink-0 pt-px text-right text-[16px] font-semibold leading-none text-zinc-100">
        {formatOdds(Number(bet.odds))}
      </div>
    </div>
  );
}

function TableHeader({ labels }: { labels: string[] }) {
  return (
    <div className="hidden min-w-[560px] grid-cols-[minmax(210px,1.45fr)_72px_72px_86px_104px] xl:min-w-[760px] xl:grid-cols-[minmax(210px,1.45fr)_minmax(105px,0.75fr)_72px_72px_86px_104px] border-b border-zinc-900 bg-black/20 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600 lg:grid lg:px-5">
      {labels.map((label, index) => (
        <div
          key={label}
          className={[
            label === "Account" ? "hidden xl:block" : "",
            index >= 3 ? "text-right" : "text-left",
          ].join(" ")}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="border-b border-zinc-900/80 px-3 py-2.5 last:border-b-0 sm:px-5 sm:py-3">
      <div className="lg:hidden">
        <div className="flex min-w-0 items-start gap-2.5">
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
          <div className="min-w-0 flex-1 pr-2">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-1.5 h-3 w-28" />
          </div>
          <SkeletonBlock className="mt-px h-4 w-12" />
        </div>

        <div className="mt-2 flex justify-end pl-[42px]">
          <div className="grid w-full max-w-[190px] grid-cols-3 gap-1.5 text-right">
            <div>
              <SkeletonBlock className="ml-auto h-3 w-10" />
              <SkeletonBlock className="ml-auto mt-2 h-4 w-12" />
            </div>
            <div>
              <SkeletonBlock className="ml-auto h-3 w-10" />
              <SkeletonBlock className="ml-auto mt-2 h-4 w-14" />
            </div>
            <div>
              <SkeletonBlock className="ml-auto h-3 w-10" />
              <SkeletonBlock className="ml-auto mt-2 h-4 w-16" />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden min-w-[560px] grid-cols-[minmax(210px,1.45fr)_72px_72px_86px_104px] xl:min-w-[760px] xl:grid-cols-[minmax(210px,1.45fr)_minmax(105px,0.75fr)_72px_72px_86px_104px] items-center lg:grid">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
          <div>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-2 h-3 w-12" />
          </div>
        </div>
        <SkeletonBlock className="hidden h-4 w-24 xl:block" />
        <SkeletonBlock className="h-4 w-12" />
        <SkeletonBlock className="ml-auto h-4 w-12" />
        <SkeletonBlock className="ml-auto h-4 w-14" />
        <SkeletonBlock className="ml-auto h-4 w-16" />
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
                ? "text-green-400"
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

function ActiveBetRow({ bet }: { bet: Bet }) {
  const displayStatus = bet.result ?? bet.status;

  return (
    <div className="border-b border-zinc-900/80 px-3 py-2.5 text-sm last:border-b-0 sm:px-5 sm:py-3">
      <div className="lg:hidden">
        <MobileBetTop bet={bet} />
        <MobileValueGrid
          status={resultLabel(displayStatus)}
          stake={formatMoneyInteger(bet.stake)}
          result={formatMoneyTwo(bet.potential_payout)}
          resultLabel="Payout"
        />
      </div>

      <div className="hidden min-w-[560px] grid-cols-[minmax(210px,1.45fr)_72px_72px_86px_104px] xl:min-w-[760px] xl:grid-cols-[minmax(210px,1.45fr)_minmax(105px,0.75fr)_72px_72px_86px_104px] items-center lg:grid">
        <TeamCell bet={bet} />

        <Link
          href={`/accounts/${bet.account_id}`}
          className="hidden truncate font-medium text-zinc-300 transition-colors hover:text-white xl:block"
        >
          {getAccountLabel(bet)}
        </Link>

        <StatusText status={displayStatus} />

        <div className="text-right font-semibold text-zinc-100">
          {formatOdds(Number(bet.odds))}
        </div>

        <div className="text-right font-semibold text-zinc-100">
          {formatMoneyInteger(bet.stake)}
        </div>

        <div className="text-right font-semibold text-zinc-100">
          {formatMoneyTwo(bet.potential_payout)}
        </div>
      </div>
    </div>
  );
}

function PastBetRow({ bet }: { bet: Bet }) {
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
          stake={formatMoneyInteger(bet.stake)}
          result={pnl === null ? "—" : formatMoneyTwo(pnl)}
          resultLabel="P/L"
          resultTone={pnlTone}
        />
      </div>

      <div className="hidden min-w-[560px] grid-cols-[minmax(210px,1.45fr)_72px_72px_86px_104px] xl:min-w-[760px] xl:grid-cols-[minmax(210px,1.45fr)_minmax(105px,0.75fr)_72px_72px_86px_104px] items-center lg:grid">
        <TeamCell bet={bet} />

        <Link
          href={`/accounts/${bet.account_id}`}
          className="hidden truncate font-medium text-zinc-300 transition-colors hover:text-white xl:block"
        >
          {getAccountLabel(bet)}
        </Link>

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
              ? "text-green-400"
              : pnlTone === "negative"
                ? "text-red-400"
                : "text-zinc-100",
          ].join(" ")}
        >
          {pnl === null ? "—" : formatMoneyTwo(pnl)}
        </div>
      </div>
    </div>
  );
}

function EmptyTableRow({ message }: { message: string }) {
  return (
    <div className="border-b border-zinc-900/80 px-4 py-8 text-sm text-zinc-500 last:border-b-0 sm:px-5 lg:min-w-[560px] xl:min-w-[760px]">
      {message}
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/80 lg:overflow-x-auto">
      <TableSectionHeader title="Active" count={0} />
      <TableHeader
        labels={["Team", "Account", "Status", "Odds", "Stake", "Payout"]}
      />
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonRow key={`active-skeleton-${index}`} />
      ))}

      <TableSectionHeader title="Past" count={0} />
      <TableHeader
        labels={["Team", "Account", "Status", "Odds", "Stake", "P/L"]}
      />
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonRow key={`past-skeleton-${index}`} />
      ))}
    </div>
  );
}

function PortfolioTable({
  openBets,
  pastBets,
}: {
  openBets: Bet[];
  pastBets: Bet[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/80 shadow-sm lg:overflow-x-auto">
      <TableSectionHeader title="Active" count={openBets.length} />
      <TableHeader
        labels={["Team", "Account", "Status", "Odds", "Stake", "Payout"]}
      />
      {openBets.length ? (
        openBets.map((bet) => <ActiveBetRow key={bet.id} bet={bet} />)
      ) : (
        <EmptyTableRow message="No active positions." />
      )}

      <TableSectionHeader title="Past" count={pastBets.length} />
      <TableHeader
        labels={["Team", "Account", "Status", "Odds", "Stake", "P/L"]}
      />
      {pastBets.length ? (
        pastBets.map((bet) => <PastBetRow key={bet.id} bet={bet} />)
      ) : (
        <EmptyTableRow message="No past positions." />
      )}
    </div>
  );
}

export default function PortfolioClient() {
  const { ready, authenticated, login, getAccessToken } = usePrivy();

  const [openBets, setOpenBets] = useState<Bet[]>([]);
  const [pastBets, setPastBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasAnyBets = openBets.length > 0 || pastBets.length > 0;

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
      setError(
        err instanceof Error ? err.message : "Unable to load portfolio.",
      );
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-15 pb-8 sm:px-6 md:py-15 md:pb-24">
      <div className="mb-2 sm:mb-3">
        <div className="flex h-[36px] max-w-full items-start overflow-hidden sm:h-[42px] lg:h-[44px]">
          <h1 className="truncate text-[29px] font-semibold leading-[1.08] tracking-tight text-zinc-100 sm:text-[34px] lg:text-[36px]">
            Portfolio
          </h1>
        </div>
      </div>

      {!ready || loading ? (
        <PortfolioSkeleton />
      ) : !authenticated ? (
        <EmptyState
          title="Sign in to view your portfolio"
          description="Your active and past positions will appear here once you sign in."
          action={
            <button
              type="button"
              onClick={login}
              className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950"
            >
              Sign in
            </button>
          }
        />
      ) : (
        <>
          {error ? (
            <div className="mb-5 rounded-2xl border border-red-950 bg-red-950/20 p-4 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {!hasAnyBets ? (
            <EmptyState
              title="No positions yet"
              description="Once you place a bet from an event page, active positions will show here. Settled bets will move into your past positions."
              action={
                <Link
                  href="/"
                  className="inline-flex rounded-xl bg-black/30 px-4 py-2 text-sm font-medium text-zinc-300 ring-1 ring-zinc-800 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
                >
                  Browse markets
                </Link>
              }
            />
          ) : (
            <PortfolioTable openBets={openBets} pastBets={pastBets} />
          )}
        </>
      )}
    </div>
  );
}