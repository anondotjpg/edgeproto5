import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LEAGUES = [
  { key: "nba", label: "NBA", tag: 745, teamLeague: "nba" },
  { key: "nhl", label: "NHL", tag: 899, teamLeague: "nhl" },
  { key: "mlb", label: "MLB", tag: 100381, teamLeague: "mlb" },
  { key: "wnba", label: "WNBA", tag: 100639, teamLeague: "wnba" },
] as const;

type LeagueKey = (typeof LEAGUES)[number]["key"];

type OddsOutcome = {
  name: string;
  price: number;
  point?: number;
};

type OddsMarket = {
  key: string;
  outcomes: OddsOutcome[];
};

type Bookmaker = {
  key: string;
  title: string;
  last_update: string;
  markets: OddsMarket[];
};

type TeamInfo = {
  name: string;
  abbreviation?: string;
  alias?: string;
  record?: string;
  logo?: string;
  league?: string;
};

type GameDebug = {
  eventSlug?: string;
  marketSlug?: string;
  eventTitle?: string;
  question?: string;
  outcomes?: string[];
  clobTokenIds?: string[];
  awaySlugTokens?: string[];
  homeSlugTokens?: string[];
  awayMatchedBy?: string;
  homeMatchedBy?: string;
};

type EventOdds = {
  id: string;
  slug: string;
  sport_key: string;
  sport_title: string;
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

  debug?: GameDebug;
};

type LeagueResponse = {
  leagueKey: string;
  leagueLabel: string;
  games: EventOdds[];
  error?: string;
};

type PolymarketMarket = {
  id: string | number;
  slug?: string;
  question?: string;
  outcomes?: string | string[];
  outcomePrices?: string | string[];
  clobTokenIds?: string | string[];
  conditionId?: string;
  condition_id?: string;
  gameStartTime?: string;
  endDate?: string;
  acceptingOrders?: boolean;
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
};

type PolymarketEvent = {
  id: string | number;
  slug?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  markets?: PolymarketMarket[];
};

type PolymarketTeam = {
  id: number;
  name: string | null;
  league: string | null;
  record: string | null;
  logo: string | null;
  abbreviation: string | null;
  alias: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const teamCache = new Map<string, PolymarketTeam | null>();

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
  }

  return [];
}

function probabilityToAmerican(probability: number): number {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) {
    return 0;
  }

  if (probability === 0.5) return 100;

  if (probability < 0.5) {
    return Math.round(((1 - probability) / probability) * 100);
  }

  return -Math.round((probability / (1 - probability)) * 100);
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function parseTeams(text: string): { away: string; home: string } | null {
  const cleaned = cleanText(text);
  const separators = [" vs. ", " vs ", " @ ", " at "];

  for (const separator of separators) {
    if (!cleaned.includes(separator)) continue;

    const parts = cleaned.split(separator).map(cleanText);

    if (parts.length !== 2) continue;
    if (!parts[0] || !parts[1]) continue;

    return {
      away: parts[0],
      home: parts[1],
    };
  }

  return null;
}

function getCommenceTime(
  event: PolymarketEvent,
  market: PolymarketMarket
): string {
  return (
    market.gameStartTime ||
    event.startDate ||
    market.endDate ||
    event.endDate ||
    new Date().toISOString()
  );
}

function isWithinLast24HoursFromNowUtc(dateString: string): boolean {
  const timestamp = Date.parse(dateString);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const nowUtcMs = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  return timestamp >= nowUtcMs - twentyFourHoursMs;
}

function extractSlugTokens(
  slug: string | undefined,
  leagueKey: LeagueKey
): string[] {
  if (!slug) return [];

  const parts = normalizeSlug(slug).split("-").filter(Boolean);
  if (parts.length === 0) return [];

  const withoutLeague = parts[0] === leagueKey ? parts.slice(1) : parts;

  return withoutLeague.filter((part) => !/^\d{1,4}$/.test(part));
}

function makeTeamInfo(team: PolymarketTeam): TeamInfo {
  return {
    name: team.name || team.alias || team.abbreviation || "Unknown Team",
    abbreviation: team.abbreviation || undefined,
    alias: team.alias || undefined,
    record: team.record || undefined,
    logo: team.logo || undefined,
    league: team.league || undefined,
  };
}

async function fetchTeamsByParams(params: {
  abbreviation?: string;
  name?: string;
  league?: string;
}): Promise<PolymarketTeam[]> {
  const url = new URL("https://gamma-api.polymarket.com/teams");

  if (params.abbreviation) {
    url.searchParams.set("abbreviation", params.abbreviation.toLowerCase());
  }

  if (params.name) {
    url.searchParams.set("name", params.name);
  }

  if (params.league) {
    url.searchParams.set("league", params.league.toLowerCase());
  }

  url.searchParams.set("limit", "25");
  url.searchParams.set("offset", "0");

  const res = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed teams fetch with status ${res.status}`);
  }

  const teams: PolymarketTeam[] = await res.json();
  return Array.isArray(teams) ? teams : [];
}

async function resolveTeamByToken(
  token: string,
  fallbackName: string,
  league: string
): Promise<{ team?: PolymarketTeam; matchedBy?: string }> {
  const cacheKey = `${league}:${token}:${fallbackName}`;

  if (teamCache.has(cacheKey)) {
    const cached = teamCache.get(cacheKey);
    return cached ? { team: cached, matchedBy: "cache" } : {};
  }

  const normalizedToken = normalize(token);
  const normalizedFallback = normalize(fallbackName);

  if (!normalizedToken && !normalizedFallback) {
    teamCache.set(cacheKey, null);
    return {};
  }

  if (normalizedToken) {
    const abbreviationResults = await fetchTeamsByParams({
      abbreviation: normalizedToken,
      league,
    });

    const exactAbbreviation = abbreviationResults.find(
      (team) => normalize(team.abbreviation || "") === normalizedToken
    );

    if (exactAbbreviation) {
      teamCache.set(cacheKey, exactAbbreviation);
      return {
        team: exactAbbreviation,
        matchedBy: `abbreviation:${normalizedToken}+league:${league}`,
      };
    }

    if (abbreviationResults[0]) {
      teamCache.set(cacheKey, abbreviationResults[0]);
      return {
        team: abbreviationResults[0],
        matchedBy: `abbreviation-fallback:${normalizedToken}+league:${league}`,
      };
    }
  }

  if (fallbackName) {
    const nameResults = await fetchTeamsByParams({
      name: fallbackName,
      league,
    });

    const exactName = nameResults.find((team) => {
      const teamName = normalize(team.name || "");
      const teamAlias = normalize(team.alias || "");

      return (
        teamName === normalizedFallback ||
        teamAlias === normalizedFallback ||
        (teamName && normalizedFallback.includes(teamName)) ||
        (teamAlias && normalizedFallback.includes(teamAlias))
      );
    });

    if (exactName) {
      teamCache.set(cacheKey, exactName);
      return {
        team: exactName,
        matchedBy: `name:${fallbackName}+league:${league}`,
      };
    }

    if (nameResults[0]) {
      teamCache.set(cacheKey, nameResults[0]);
      return {
        team: nameResults[0],
        matchedBy: `name-fallback:${fallbackName}+league:${league}`,
      };
    }
  }

  teamCache.set(cacheKey, null);
  return {};
}

function isLikelyFullGameMoneylineMarket(
  event: PolymarketEvent,
  market: PolymarketMarket,
  leagueKey: LeagueKey
): boolean {
  const slug = normalizeSlug(market.slug || "");
  const question = cleanText(market.question || "").toLowerCase();
  const eventTitle = cleanText(event.title || "").toLowerCase();
  const combined = `${slug} ${question} ${eventTitle}`;

  const bannedPatterns = [
    "1h",
    "2h",
    "first-half",
    "second-half",
    "first half",
    "second half",
    "1st-half",
    "2nd-half",
    "1st half",
    "2nd half",
    "1q",
    "2q",
    "3q",
    "4q",
    "quarter",
    "1st quarter",
    "2nd quarter",
    "3rd quarter",
    "4th quarter",
    "period",
    "innings",
    "inning",
    "set",
    "map",
    "spread",
    "total",
    "over/",
    "under/",
    "over ",
    "under ",
    "alt",
    "alternate",
    "player",
    "points",
    "rebounds",
    "assists",
    "threes",
    "parlay",
    "same game parlay",
    "sgp",
    "series",
    "champion",
    "winner of series",
    "to win series",
    "race to",
    "double chance",
    "draw no bet",
    "correct score",
    "wins by",
    "margin",
    "exactly",
    "most",
    "least",
    "higher",
    "lower",
    "yes/no",
    "yes or no",
  ];

  if (bannedPatterns.some((pattern) => combined.includes(pattern))) {
    return false;
  }

  const positiveSignals = [
    `${leagueKey}-`,
    "moneyline",
    "match winner",
    "game winner",
    "who will win",
    "winner",
  ];

  const hasSignal = positiveSignals.some((signal) => combined.includes(signal));
  if (!hasSignal) {
    return false;
  }

  const parsedFromEvent = parseTeams(event.title || "");
  const parsedFromQuestion = parseTeams(market.question || "");

  return Boolean(parsedFromEvent || parsedFromQuestion);
}

function chooseCanonicalTeams(
  event: PolymarketEvent,
  market: PolymarketMarket
): { away: string; home: string } | null {
  return (
    parseTeams(event.title || "") ||
    parseTeams(market.question || "") ||
    null
  );
}

function findOutcomeIndexForTeam(outcomes: string[], teamName: string): number {
  const teamNorm = normalize(teamName);

  return outcomes.findIndex((outcome) => {
    const outcomeNorm = normalize(outcome);
    return (
      outcomeNorm === teamNorm ||
      teamNorm.includes(outcomeNorm) ||
      outcomeNorm.includes(teamNorm)
    );
  });
}

function makeDedupeKey(
  leagueKey: LeagueKey,
  event: PolymarketEvent,
  awayTeam: string,
  homeTeam: string,
  commenceTime: string
) {
  const eventSlug = normalizeSlug(event.slug || "");
  const away = normalize(awayTeam);
  const home = normalize(homeTeam);
  const day = commenceTime.slice(0, 10);

  return `${leagueKey}:${eventSlug || day}:${away}:${home}`;
}

async function buildGameFromMarket(
  event: PolymarketEvent,
  market: PolymarketMarket,
  league: { key: LeagueKey; label: string; tag: number; teamLeague: string }
): Promise<EventOdds | null> {
  if (!isLikelyFullGameMoneylineMarket(event, market, league.key)) {
    return null;
  }

  const teams = chooseCanonicalTeams(event, market);
  if (!teams) return null;

  const outcomes = parseStringArray(market.outcomes).map(cleanText);
  const prices = parseStringArray(market.outcomePrices).map(Number);
  const clobTokenIds = parseStringArray(market.clobTokenIds);

  if (outcomes.length !== 2 || prices.length !== 2) return null;

  const awayIndex = findOutcomeIndexForTeam(outcomes, teams.away);
  const homeIndex = findOutcomeIndexForTeam(outcomes, teams.home);

  if (awayIndex === -1 || homeIndex === -1 || awayIndex === homeIndex) {
    return null;
  }

  const commenceTime = getCommenceTime(event, market);

  if (!isWithinLast24HoursFromNowUtc(commenceTime)) {
    return null;
  }

  const slugTokens = extractSlugTokens(market.slug || event.slug, league.key);
  const awaySlugToken = slugTokens.length >= 2 ? slugTokens[0] : "";
  const homeSlugToken = slugTokens.length >= 2 ? slugTokens[1] : "";

  const [awayResolved, homeResolved] = await Promise.all([
    resolveTeamByToken(awaySlugToken, outcomes[awayIndex], league.teamLeague),
    resolveTeamByToken(homeSlugToken, outcomes[homeIndex], league.teamLeague),
  ]);

  return {
    id: `${league.key}-${String(market.id)}`,
    slug: event.slug || market.slug || `${league.key}-${String(market.id)}`,
    sport_key: league.key,
    sport_title: league.label,
    commence_time: commenceTime,
    away_team: outcomes[awayIndex],
    home_team: outcomes[homeIndex],
    away_team_info: awayResolved.team
      ? makeTeamInfo(awayResolved.team)
      : undefined,
    home_team_info: homeResolved.team
      ? makeTeamInfo(homeResolved.team)
      : undefined,
    bookmakers: [
      {
        key: "polymarket",
        title: "Polymarket",
        last_update: new Date().toISOString(),
        markets: [
          {
            key: "h2h",
            outcomes: [
              {
                name: outcomes[awayIndex],
                price: probabilityToAmerican(prices[awayIndex]),
              },
              {
                name: outcomes[homeIndex],
                price: probabilityToAmerican(prices[homeIndex]),
              },
            ],
          },
        ],
      },
    ],

    polymarket: {
      event_id: String(event.id),
      event_slug: event.slug ?? null,
      market_id: String(market.id),
      market_slug: market.slug ?? null,
      condition_id: market.conditionId ?? market.condition_id ?? null,
      question: market.question ?? null,
      outcomes,
      clob_token_ids: clobTokenIds,
    },

    outcome_token_ids: {
      away: clobTokenIds[awayIndex],
      home: clobTokenIds[homeIndex],
    },

    debug: {
      eventSlug: event.slug,
      marketSlug: market.slug,
      eventTitle: event.title,
      question: market.question,
      outcomes,
      clobTokenIds,
      awaySlugTokens: awaySlugToken ? [awaySlugToken] : [],
      homeSlugTokens: homeSlugToken ? [homeSlugToken] : [],
      awayMatchedBy: awayResolved.matchedBy,
      homeMatchedBy: homeResolved.matchedBy,
    },
  };
}

async function fetchLeagueGames(league: {
  key: LeagueKey;
  label: string;
  tag: number;
  teamLeague: string;
}): Promise<EventOdds[]> {
  const url = new URL("https://gamma-api.polymarket.com/events");
  url.searchParams.set("tag_id", String(league.tag));
  url.searchParams.set("limit", "100");
  url.searchParams.set("closed", "false");

  const res = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed with status ${res.status}`);
  }

  const events: PolymarketEvent[] = await res.json();

  const builtGames = await Promise.all(
    events
      .filter((event) => event.archived !== true)
      .filter((event) => event.closed !== true)
      .flatMap((event) => {
        const markets = Array.isArray(event.markets) ? event.markets : [];

        return markets
          .filter((market) => market.archived !== true)
          .filter((market) => market.closed !== true)
          .filter((market) => market.acceptingOrders !== false)
          .map((market) => buildGameFromMarket(event, market, league));
      })
  );

  const games = builtGames.filter((game): game is EventOdds => Boolean(game));

  const dedupedMap = new Map<string, EventOdds>();

  for (const game of games) {
    const eventSlug = game.debug?.eventSlug;
    const dedupeKey = makeDedupeKey(
      league.key,
      { id: "", slug: eventSlug } as PolymarketEvent,
      game.away_team,
      game.home_team,
      game.commence_time
    );

    const existing = dedupedMap.get(dedupeKey);

    if (!existing) {
      dedupedMap.set(dedupeKey, game);
      continue;
    }

    const existingSlug = normalizeSlug(existing.debug?.marketSlug || "");
    const currentSlug = normalizeSlug(game.debug?.marketSlug || "");

    const existingScore =
      (existingSlug.includes("moneyline") ? 2 : 0) +
      (existing.debug?.question?.toLowerCase().includes("moneyline") ? 1 : 0);

    const currentScore =
      (currentSlug.includes("moneyline") ? 2 : 0) +
      (game.debug?.question?.toLowerCase().includes("moneyline") ? 1 : 0);

    if (currentScore > existingScore) {
      dedupedMap.set(dedupeKey, game);
    }
  }

  const dedupedGames = Array.from(dedupedMap.values()).sort((a, b) => {
    return Date.parse(a.commence_time) - Date.parse(b.commence_time);
  });

  console.log(
    `[${league.key}] raw=${games.length} deduped=${dedupedGames.length}`
  );

  for (const game of dedupedGames.slice(0, 8)) {
    console.log(
      `[${league.key}] final`,
      JSON.stringify(
        {
          away: game.away_team,
          home: game.home_team,
          commenceTime: game.commence_time,
          marketSlug: game.debug?.marketSlug,
          eventSlug: game.debug?.eventSlug,
          question: game.debug?.question,
          conditionId: game.polymarket?.condition_id,
          awayTokenId: game.outcome_token_ids?.away,
          homeTokenId: game.outcome_token_ids?.home,
        },
        null,
        2
      )
    );
  }

  return dedupedGames;
}

export async function GET() {
  const leagueResults = await Promise.all(
    LEAGUES.map(async (league): Promise<LeagueResponse> => {
      try {
        const games = await fetchLeagueGames(league);

        return {
          leagueKey: league.key,
          leagueLabel: league.label,
          games,
        };
      } catch (error) {
        return {
          leagueKey: league.key,
          leagueLabel: league.label,
          games: [],
          error: error instanceof Error ? error.message : "Fetch failed",
        };
      }
    })
  );

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    leagues: leagueResults,
  });
}