import { headers } from "next/headers";
import GamesClient from "./components/GamesClient";

type OddsOutcome = {
  name: string;
  price: number;
};

type OddsMarket = {
  key: string;
  outcomes: OddsOutcome[];
};

type Bookmaker = {
  markets: OddsMarket[];
};

type TeamInfo = {
  name: string;
  abbreviation?: string;
  alias?: string;
  record?: string;
  logo?: string;
};

export type Game = {
  id: string;
  slug: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  home_team_info?: TeamInfo;
  away_team_info?: TeamInfo;
  bookmakers: Bookmaker[];

  polymarket?: {
    event_id: string;
    event_slug: string | null;
    market_id: string;
    market_slug: string | null;
    condition_id: string | null;
    question: string | null;
    outcomes: string[];
    clob_token_ids: string[];
  };

  outcome_token_ids?: {
    away?: string;
    home?: string;
  };
};

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

const LEAGUES = [
  { label: "NBA", tag: 745, league: "nba" },
  { label: "NHL", tag: 899, league: "nhl" },
  { label: "MLB", tag: 100381, league: "mlb" },
  { label: "WNBA", tag: 100639, league: "wnba" },
] as const;

type LeagueKey = (typeof LEAGUES)[number]["league"];

async function getOdds(): Promise<ApiResponse> {
  const headerStore = await headers();
  const host = headerStore.get("host");

  if (!host) {
    throw new Error("Missing host header");
  }

  const protocol = host.includes("localhost") ? "http" : "https";

  const res = await fetch(`${protocol}://${host}/api/odds`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch odds");
  }

  return res.json();
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ league?: string }>;
}) {
  const data = await getOdds();
  const resolvedSearchParams = await searchParams;
  const requestedLeague = resolvedSearchParams?.league;

  const selectedLeague: LeagueKey = LEAGUES.some(
    (item) => item.league === requestedLeague
  )
    ? (requestedLeague as LeagueKey)
    : "nba";

  const league =
    data.leagues.find((item) => item.leagueKey === selectedLeague) ??
    data.leagues[0];

  const selectedLeagueMeta =
    LEAGUES.find((item) => item.league === selectedLeague) ?? LEAGUES[0];

  return (
    <GamesClient
      data={data}
      league={league}
      leagues={LEAGUES}
      selectedLeague={selectedLeague}
      selectedLeagueMeta={selectedLeagueMeta}
    />
  );
}