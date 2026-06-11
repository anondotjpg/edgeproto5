"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaChevronRight, FaLock } from "react-icons/fa";
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

type BetSlipDataWithTeamAlias = BetSlipData & {
  teamAlias?: string | null;
  isLive?: boolean;
};

type GameWithLiveStatus = Game & {
  isLive?: boolean;
  is_live?: boolean;
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

function getImpliedProbability(price?: number) {
  if (price === undefined || price === null || price === 0) return null;

  return price > 0
    ? 100 / (price + 100)
    : Math.abs(price) / (Math.abs(price) + 100);
}

function formatImpliedPercent(price?: number) {
  const probability = getImpliedProbability(price);

  if (probability === null) return "—";

  return `${Math.round(probability * 100)}%`;
}

function getTeamTicker(team: string, info?: TeamInfo) {
  const rawTicker = info?.abbreviation || info?.alias;

  if (rawTicker) return rawTicker.toUpperCase();

  const words = team
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length > 1) {
    return words
      .map((word) => word[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }

  return team.slice(0, 3).toUpperCase();
}

function getTeamDisplayName(team: string, info?: TeamInfo) {
  const cleanAlias = info?.alias?.trim();

  if (cleanAlias) return cleanAlias;

  return team;
}

function getMatchupDisplayName(game: Game) {
  return `${getTeamDisplayName(
    game.away_team,
    game.away_team_info
  )} vs. ${getTeamDisplayName(game.home_team, game.home_team_info)}`;
}

function getGameDateKey(date: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function getTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function formatGameDate(date: string) {
  if (getGameDateKey(date) === getTodayDateKey()) {
    return "Today";
  }

  return new Date(date).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatGameTime(date: string) {
  return new Date(date).toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  });
}

type PolymarketMarketVolume = NonNullable<Game["polymarket"]> & {
  volume?: number | null;
  volume_24hr?: number | null;
  liquidity?: number | null;
};

function getMarketVolume(game: Game) {
  const polymarket = game.polymarket as PolymarketMarketVolume | undefined;
  return polymarket?.volume ?? null;
}

function formatMarketVolume(value: number | null | undefined) {
  const safeValue = Number(value);

  if (!Number.isFinite(safeValue) || safeValue < 0) return null;

  if (safeValue < 1000) {
    return `$${Math.round(safeValue).toLocaleString()} Vol.`;
  }

  if (safeValue < 1_000_000) {
    return `$${(safeValue / 1000).toFixed(2)}K Vol.`;
  }

  return `$${(safeValue / 1_000_000).toFixed(2)}M Vol.`;
}

function getLogoClassName(sportKey: string) {
  return sportKey === "mlb"
    ? "h-8 w-8 rounded-sm object-contain xl:h-7 xl:w-7"
    : "h-8 w-8 rounded-sm object-contain xl:h-7 xl:w-7";
}

function getLogoFallbackClassName(sportKey: string) {
  return sportKey === "mlb"
    ? "h-8 w-8 rounded-sm bg-zinc-950 xl:h-7 xl:w-7"
    : "h-8 w-8 rounded-sm bg-zinc-950 xl:h-7 xl:w-7";
}

function getGameIsLive(game: Game): boolean {
  const gameWithLiveStatus = game as GameWithLiveStatus;

  if (typeof gameWithLiveStatus.isLive === "boolean") {
    return gameWithLiveStatus.isLive;
  }

  if (typeof gameWithLiveStatus.is_live === "boolean") {
    return gameWithLiveStatus.is_live;
  }

  const startTimestamp = Date.parse(game.commence_time);

  if (!Number.isFinite(startTimestamp)) {
    return false;
  }

  return startTimestamp <= Date.now();
}

function buildBetData({
  game,
  team,
  outcome,
  side,
  info,
}: {
  game: Game;
  team: string;
  outcome?: OddsOutcome;
  side: "away" | "home";
  info?: TeamInfo;
}): BetSlipDataWithTeamAlias {
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
    isLive: getGameIsLive(game),
    matchup: `${game.away_team} vs. ${game.home_team}`,
    matchupAlias: getMatchupDisplayName(game),
    polymarketEventId: game.polymarket?.event_id ?? null,
    polymarketEventSlug: game.polymarket?.event_slug ?? null,
    polymarketMarketId: game.polymarket?.market_id ?? null,
    polymarketConditionId: game.polymarket?.condition_id ?? null,
    polymarketMarketSlug: game.polymarket?.market_slug ?? null,
    polymarketOutcome: team,
    polymarketOutcomeIndex: side === "away" ? 0 : 1,
    polymarketTokenId: polymarketTokenId ?? null,
    teamAlias: info?.alias ?? null,
    teamLogo: info?.logo ?? null,
    teamLogoAlt: info?.name ?? team,
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
    <div className="flex h-[46px] items-center gap-2 px-0 py-1 xl:gap-2.5 xl:px-2">
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
        <div className="truncate text-[14px] font-semibold leading-tight text-zinc-100 xl:text-[14px] xl:font-medium">
          {info?.name || team}
        </div>

        <div
          className={[
            "mt-0.5 h-4 truncate text-[12px] leading-4 text-zinc-500 xl:text-[12px]",
            info?.record ? "" : "invisible",
          ].join(" ")}
        >
          {info?.record || "—"}
        </div>
      </div>
    </div>
  );
}

function MoneylineFace({
  selected,
  isLive,
  children,
}: {
  selected: boolean;
  isLive?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "rounded-[18px]",
        isLive ? "bg-zinc-900" : selected ? "bg-zinc-600" : "bg-zinc-800",
      ].join(" ")}
      style={{
        paddingBottom: "2px",
      }}
    >
      <div
        className={[
          "flex h-[42px] w-full translate-y-[-2px] items-center justify-center overflow-hidden rounded-[18px] border px-2.5 text-center transition-transform duration-100 hover:translate-y-[-1px] active:translate-y-0",
          isLive
            ? "border-zinc-800 bg-zinc-950/80"
            : selected
              ? "border-zinc-600 bg-zinc-700"
              : "border-zinc-800 bg-zinc-900",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

function MobileMoneylineModalButton({
  betData,
  ticker,
}: {
  betData: BetSlipDataWithTeamAlias;
  ticker: string;
}) {
  return (
    <div
      className={[
        "group relative rounded-[18px]",
        betData.isLive ? "bg-zinc-900" : "bg-zinc-800",
      ].join(" ")}
      style={{
        paddingBottom: "2px",
      }}
    >
      <BetSlipModal
        {...betData}
        triggerClassName={[
          "peer flex h-[42px] w-full translate-y-[-2px] cursor-pointer items-center justify-center overflow-hidden rounded-[18px] border px-3 text-center transition-transform duration-100 hover:translate-y-[-1px] active:translate-y-0",
          betData.isLive
            ? "border-zinc-800 bg-zinc-950/80"
            : "border-zinc-800 bg-zinc-900",
        ].join(" ")}
        triggerContentClassName="sr-only"
      />

      <div className="pointer-events-none absolute inset-0 flex translate-y-[-2px] items-center justify-center gap-1.5 transition-transform duration-100 will-change-transform peer-hover:translate-y-[-1px] peer-active:translate-y-0 group-hover:translate-y-[-1px] group-active:translate-y-0">
        {betData.isLive ? (
          <FaLock className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        ) : (
          <>
            <span className="text-[10px] font-bold leading-none tracking-[0.12em] text-zinc-500">
              {ticker}
            </span>

            <span className="text-[18px] font-bold leading-none tracking-tight text-zinc-100">
              {betData.odds}
            </span>
          </>
        )}
      </div>
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
  onSelect: (data: BetSlipDataWithTeamAlias) => void;
}) {
  const teamInfo = side === "away" ? game.away_team_info : game.home_team_info;
  const betData = buildBetData({ game, team, outcome, side, info: teamInfo });
  const isLive = Boolean(betData.isLive);

  return (
    <button
      type="button"
      onClick={() => onSelect(betData)}
      className="block w-full cursor-pointer"
    >
      <MoneylineFace selected={selected} isLive={isLive}>
        {isLive ? (
          <FaLock className="h-3.5 w-3.5 text-zinc-500" />
        ) : (
          <span className="text-[13px] font-semibold leading-none tracking-tight text-zinc-100">
            {betData.odds}
          </span>
        )}
      </MoneylineFace>
    </button>
  );
}

function DateMarketHeader({ date }: { date: string }) {
  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_84px] xl:items-end xl:gap-2 xl:pr-3">
      <div className="text-[18px] font-semibold leading-none tracking-tight text-zinc-100">
        {date}
      </div>

      <div className="hidden items-center justify-center pb-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 xl:flex">
        Moneyline
      </div>
    </div>
  );
}

function GameCardHeader({ game, eventHref }: { game: Game; eventHref: string }) {
  const marketVolume = formatMarketVolume(getMarketVolume(game));
  const isLive = getGameIsLive(game);

  return (
    <div className="mb-2.5 flex min-w-0 items-center justify-between gap-2.5 xl:mb-3 xl:gap-3">
      <div className="flex min-w-0 items-center gap-2 xl:gap-2.5">
        <div
          className={[
            "inline-flex h-6 shrink-0 items-center rounded-[16px] px-2.5 text-[12px] font-medium xl:h-7 xl:rounded-[18px] xl:px-3 xl:text-[13px]",
            isLive
              ? "gap-1.5 bg-red-950/35 text-red-400"
              : "bg-zinc-900 text-zinc-100",
          ].join(" ")}
        >
          {isLive ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span>Live</span>
            </>
          ) : (
            formatGameTime(game.commence_time)
          )}
        </div>

        {marketVolume ? (
          <div className="min-w-0 truncate text-[12px] font-medium leading-none text-zinc-500 sm:text-[13px] xl:text-[14px]">
            {marketVolume}
          </div>
        ) : null}
      </div>

      <Link
        href={eventHref}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[16px] bg-zinc-900 px-2.5 text-[12px] font-medium text-zinc-100 transition-colors hover:bg-zinc-800 xl:h-8 xl:gap-2 xl:rounded-[18px] xl:px-3 xl:text-[13px]"
      >
        <span>Game View</span>
        <FaChevronRight className="h-2 w-2 xl:h-2.5 xl:w-2.5" />
      </Link>
    </div>
  );
}

function GameCard({
  game,
  selectedBet,
  onSelectBet,
}: {
  game: Game;
  selectedBet: BetSlipDataWithTeamAlias | null;
  onSelectBet: (data: BetSlipDataWithTeamAlias) => void;
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

  const awayBetData = buildBetData({
    game,
    team: game.away_team,
    outcome: awayMoneyline,
    side: "away",
    info: game.away_team_info,
  });

  const homeBetData = buildBetData({
    game,
    team: game.home_team,
    outcome: homeMoneyline,
    side: "home",
    info: game.home_team_info,
  });

  return (
    <>
      <article className="relative overflow-hidden rounded-[28px] border border-zinc-800/90 bg-zinc-950/35 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] xl:hidden md:p-3.5">
        <GameCardHeader game={game} eventHref={eventHref} />

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

        <div className="mt-2 grid grid-cols-2 gap-2.5 md:gap-3">
          <MobileMoneylineModalButton
            betData={awayBetData}
            ticker={getTeamTicker(game.away_team, game.away_team_info)}
          />

          <MobileMoneylineModalButton
            betData={homeBetData}
            ticker={getTeamTicker(game.home_team, game.home_team_info)}
          />
        </div>
      </article>

      <article className="relative hidden overflow-hidden xl:block xl:rounded-[28px] xl:border xl:border-zinc-800/90 xl:bg-zinc-950/35 xl:p-3.5 xl:shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <GameCardHeader game={game} eventHref={eventHref} />

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
      </article>
    </>
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
      info: firstGame.away_team_info,
    });
  }, [league]);

  const [selectedBet, setSelectedBet] =
    useState<BetSlipDataWithTeamAlias | null>(firstBet);

  const groupedGames = useMemo(() => {
    const groups: {
      key: string;
      date: string;
      games: Game[];
    }[] = [];

    for (const game of league?.games ?? []) {
      const key = getGameDateKey(game.commence_time);
      const existingGroup = groups.find((group) => group.key === key);

      if (existingGroup) {
        existingGroup.games.push(game);
      } else {
        groups.push({
          key,
          date: formatGameDate(game.commence_time),
          games: [game],
        });
      }
    }

    return groups;
  }, [league?.games]);

  useEffect(() => {
    setSelectedBet(firstBet);
  }, [firstBet]);

  return (
    <div className="relative min-h-screen bg-[#09090b] text-white">
      <div className="relative mx-auto w-full max-w-[1480px] px-4 py-5 pb-24 sm:px-6 sm:py-6 md:pb-6">
        <header className="pt-2 xl:pr-[420px]">
          <LeagueTabs leagues={leagues} selectedLeague={selectedLeague} />
        </header>

        <div className="mt-4 grid gap-6 md:mt-8 xl:grid-cols-[minmax(0,860px)_420px] xl:items-start xl:justify-center">
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
                <div className="rounded-[24px] border border-zinc-900 p-4 text-[13px] text-zinc-400">
                  No active {selectedLeagueMeta.label} markets right now
                </div>
              ) : (
                <div className="grid gap-7">
                  {groupedGames.map((group) => (
                    <div key={group.key} className="grid gap-4 xl:gap-2">
                      <DateMarketHeader date={group.date} />

                      <div className="grid gap-3 md:gap-3">
                        {group.games.map((game) => (
                          <GameCard
                            key={game.id}
                            game={game}
                            selectedBet={selectedBet}
                            onSelectBet={setSelectedBet}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>

          <aside className="sticky top-18 hidden xl:block">
            <div
              className={[
                "overflow-hidden rounded-[28px] bg-zinc-950 shadow-2xl",
                selectedBet
                  ? "border border-zinc-800"
                  : "border border-transparent",
              ].join(" ")}
            >
              {selectedBet ? (
                <BetSlipPanel {...selectedBet} enabled panelMode="sidebar" />
              ) : (
                <div className="invisible p-5 text-sm text-zinc-500">
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