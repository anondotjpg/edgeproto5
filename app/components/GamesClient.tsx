"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import LastUpdatedAgo from "./LastUpdatedAgo";
import LeagueTabs from "./LeagueTabs";
import BetSlipModal, { BetSlipPanel, type BetSlipData } from "./BetSlipModal";
import type { Game } from "../page";

type LeagueBlock = {
  leagueKey: string;
  leagueLabel: string;
  games: Game[];
  error?: string;
};

type ApiResponse = {
  updatedAt: string;
  leagues: LeagueBlock[];
};

type LeagueMeta = {
  label: string;
  tag: number;
  league: string;
};

type OddsOutcome = {
  name: string;
  price: number;
};

type Bookmaker = {
  markets: {
    key: string;
    outcomes: OddsOutcome[];
  }[];
};

type TeamInfo = {
  name: string;
  abbreviation?: string;
  alias?: string;
  record?: string;
  logo?: string;
};

function getMarket(bookmaker: Bookmaker | undefined, marketKey: string) {
  return bookmaker?.markets.find((market) => market.key === marketKey);
}

function getOutcomeByName(
  outcomes: OddsOutcome[] | undefined,
  teamName: string
) {
  return outcomes?.find((outcome) => outcome.name === teamName);
}

function formatPrice(price?: number) {
  if (!price) return "—";
  return price > 0 ? `+${price}` : `${price}`;
}

function formatImpliedPercent(price?: number) {
  if (price === undefined || price === null || price === 0) return "—";

  const probability =
    price > 0 ? 100 / (price + 100) : Math.abs(price) / (Math.abs(price) + 100);

  return `${Math.round(probability * 100)}%`;
}

function formatGameTime(date: string) {
  const formatted = new Date(date).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatted} EST`;
}

function getLogoClassName(sportKey: string) {
  return sportKey === "mlb"
    ? "h-7 w-7 object-contain"
    : "h-7 w-7 rounded-sm bg-white/5 object-contain";
}

function getLogoFallbackClassName(sportKey: string) {
  return sportKey === "mlb"
    ? "h-8 w-8 bg-zinc-950"
    : "h-8 w-8 rounded-sm bg-zinc-950";
}

function buildBetData({
  game,
  team,
  outcome,
  side,
}: {
  game: Game;
  team: string;
  outcome?: OddsOutcome;
  side: "away" | "home";
}): BetSlipData {
  const odds = formatPrice(outcome?.price);
  const impliedPercent = formatImpliedPercent(outcome?.price);

  const polymarketTokenId =
    side === "away"
      ? game.outcome_token_ids?.away
      : game.outcome_token_ids?.home;

  return {
    team,
    gameId: game.id,
    league: game.sport_key,
    market: "h2h",
    odds,
    impliedPercent,
    matchup: `${game.away_team} vs. ${game.home_team}`,
    polymarketEventId: game.polymarket?.event_id ?? null,
    polymarketEventSlug: game.polymarket?.event_slug ?? null,
    polymarketMarketId: game.polymarket?.market_id ?? null,
    polymarketConditionId: game.polymarket?.condition_id ?? null,
    polymarketMarketSlug: game.polymarket?.market_slug ?? null,
    polymarketOutcome: team,
    polymarketOutcomeIndex: side === "away" ? 0 : 1,
    polymarketTokenId: polymarketTokenId ?? null,
  };
}

function TeamRow({
  team,
  info,
  sportKey,
}: {
  team: string;
  info?: TeamInfo;
  sportKey: string;
}) {
  return (
    <div className="flex h-[46px] items-center gap-2.5 px-2 py-1.5">
      {info?.logo ? (
        <img
          src={info.logo}
          alt={info.name}
          className={getLogoClassName(sportKey)}
        />
      ) : (
        <div className={getLogoFallbackClassName(sportKey)} />
      )}

      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium leading-tight text-zinc-100">
          {info?.name || team}
        </div>

        <div className="mt-0.5 truncate text-[12px] leading-none text-zinc-500">
          {info?.record || info?.abbreviation || info?.alias || "—"}
        </div>
      </div>
    </div>
  );
}

function MoneylineFace({
  selected,
  children,
}: {
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={["rounded-xl", selected ? "bg-zinc-600" : "bg-zinc-800"].join(
        " "
      )}
      style={{
        paddingBottom: "2px",
      }}
    >
      <div
        className={[
          "flex h-[42px] w-full translate-y-[-2px] items-center justify-center overflow-hidden rounded-xl border px-2.5 text-center transition-transform duration-100 hover:translate-y-[-1px] active:translate-y-0",
          selected
            ? "border-zinc-600 bg-zinc-700"
            : "border-zinc-800 bg-zinc-900",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

function MoneylineModalButton({ betData }: { betData: BetSlipData }) {
  return (
    <div
      className="rounded-xl bg-zinc-800"
      style={{
        paddingBottom: "2px",
      }}
    >
      <BetSlipModal
        {...betData}
        triggerClassName="flex h-[42px] w-full translate-y-[-2px] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 text-center transition-transform duration-100 hover:translate-y-[-1px] active:translate-y-0"
        triggerContentClassName="text-[13px] font-semibold leading-none tracking-tight text-zinc-100"
      />
    </div>
  );
}

function MoneylineCell({
  game,
  team,
  outcome,
  side,
  selected,
  onSelect,
}: {
  game: Game;
  team: string;
  outcome?: OddsOutcome;
  side: "away" | "home";
  selected: boolean;
  onSelect: (data: BetSlipData) => void;
}) {
  const betData = buildBetData({ game, team, outcome, side });

  return (
    <>
      <div className="hidden xl:block">
        <button
          type="button"
          onClick={() => onSelect(betData)}
          className="block w-full cursor-pointer"
        >
          <MoneylineFace selected={selected}>
            <span className="text-[13px] font-semibold leading-none tracking-tight text-zinc-100">
              {betData.odds}
            </span>
          </MoneylineFace>
        </button>
      </div>

      <div className="xl:hidden">
        <MoneylineModalButton betData={betData} />
      </div>
    </>
  );
}

function GameCard({
  game,
  selectedBet,
  onSelectBet,
}: {
  game: Game;
  selectedBet: BetSlipData | null;
  onSelectBet: (data: BetSlipData) => void;
}) {
  const bookmaker = game.bookmakers[0];
  const h2h = getMarket(bookmaker, "h2h")?.outcomes;

  const awayMoneyline = getOutcomeByName(h2h, game.away_team);
  const homeMoneyline = getOutcomeByName(h2h, game.home_team);
  const eventHref = `/event/${game.slug}`;

  const awaySelected =
    selectedBet?.gameId === game.id && selectedBet.team === game.away_team;

  const homeSelected =
    selectedBet?.gameId === game.id && selectedBet.team === game.home_team;

  return (
    <article className="relative pb-7 md:rounded-xl md:border md:border-zinc-900 md:p-3 md:pb-9">
      <div className="mb-1.5 grid grid-cols-[minmax(0,1fr)_84px]">
        <div className="pl-1 text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          Teams
        </div>

        <div className="flex items-center justify-center text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          ML
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_84px] gap-2">
        <div>
          <TeamRow
            team={game.away_team}
            info={game.away_team_info}
            sportKey={game.sport_key}
          />

          <TeamRow
            team={game.home_team}
            info={game.home_team_info}
            sportKey={game.sport_key}
          />
        </div>

        <div className="flex flex-col gap-2">
          <MoneylineCell
            game={game}
            team={game.away_team}
            outcome={awayMoneyline}
            side="away"
            selected={awaySelected}
            onSelect={onSelectBet}
          />

          <MoneylineCell
            game={game}
            team={game.home_team}
            outcome={homeMoneyline}
            side="home"
            selected={homeSelected}
            onSelect={onSelectBet}
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-1 text-[12px] text-zinc-500 md:bottom-3 md:left-3">
        {formatGameTime(game.commence_time)}
      </div>

      <Link
        href={eventHref}
        className="absolute bottom-0 right-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-500 transition-colors hover:text-white md:bottom-3 md:right-3"
      >
        <span>View</span>
        <FiArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

export default function GamesClient({
  data,
  league,
  leagues,
  selectedLeague,
  selectedLeagueMeta,
}: {
  data: ApiResponse;
  league?: LeagueBlock;
  leagues: readonly LeagueMeta[];
  selectedLeague: string;
  selectedLeagueMeta: LeagueMeta;
}) {
  const totalGames = league?.games.length ?? 0;
  const [selectedBet, setSelectedBet] = useState<BetSlipData | null>(null);

  const firstBet = useMemo(() => {
    const firstGame = league?.games[0];
    if (!firstGame) return null;

    const bookmaker = firstGame.bookmakers[0];
    const h2h = getMarket(bookmaker, "h2h")?.outcomes;
    const awayMoneyline = getOutcomeByName(h2h, firstGame.away_team);

    return buildBetData({
      game: firstGame,
      team: firstGame.away_team,
      outcome: awayMoneyline,
      side: "away",
    });
  }, [league]);

  useEffect(() => {
    setSelectedBet(firstBet);
  }, [firstBet]);

  return (
    <div className="relative min-h-screen bg-[#09090b] text-white">
      <div className="relative mx-auto w-full max-w-[1480px] px-4 py-5 pb-24 sm:px-6 sm:py-6 md:pb-6">
        <header className="pt-2 xl:pr-[420px]">
          <LeagueTabs leagues={leagues} selectedLeague={selectedLeague} />
        </header>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,760px)_390px] xl:items-start xl:justify-center">
          <main className="min-w-0">
            <section className="space-y-4">
              <div className="grid grid-cols-[112px_minmax(0,1fr)_112px] items-end gap-3">
                <LastUpdatedAgo updatedAt={data.updatedAt} />

                <div className="hidden min-w-0 text-center sm:block">
                  <h2 className="text-[33px] font-semibold leading-none tracking-tight text-zinc-50">
                    {league?.leagueLabel ?? selectedLeagueMeta.label}
                  </h2>

                  <p className="mt-0.5 text-[12px] leading-none text-zinc-400">
                    {totalGames} game{totalGames === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex w-[112px] justify-end">
                  {league?.error ? (
                    <div className="hidden rounded-full border border-red-900/60 bg-red-950/60 px-3 py-1 text-[11px] font-medium text-red-400 sm:block">
                      {league.error}
                    </div>
                  ) : null}
                </div>
              </div>

              {!league || league.games.length === 0 ? (
                <div className="rounded-xl border border-zinc-900 p-4 text-[13px] text-zinc-400">
                  No active {selectedLeagueMeta.label} markets right now.
                </div>
              ) : (
                <div className="grid gap-5 md:gap-3">
                  {league.games.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      selectedBet={selectedBet}
                      onSelectBet={setSelectedBet}
                    />
                  ))}
                </div>
              )}
            </section>
          </main>

          <aside className="sticky top-6 hidden xl:block">
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
              {selectedBet ? (
                <BetSlipPanel {...selectedBet} enabled panelMode="sidebar" />
              ) : (
                <div className="p-5 text-sm text-zinc-500">
                  Select a moneyline to place a bet.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}