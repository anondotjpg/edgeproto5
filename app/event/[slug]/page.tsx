import { headers } from "next/headers";
import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";
import PriceHistoryChart from "./PriceHistoryChart";
import BackButton from "./BackButton";
import BetSlipModal from "@/app/components/BetSlipModal";

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

type Game = {
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
};

type EventResponse = {
  updatedAt: string;
  game: Game | null;
  error?: string;
};

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

async function getEvent(slug: string): Promise<EventResponse> {
  const headerStore = await headers();
  const host = headerStore.get("host");

  if (!host) {
    throw new Error("Missing host header");
  }

  const protocol = host.includes("localhost") ? "http" : "https";

  const res = await fetch(
    `${protocol}://${host}/api/event/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
    }
  );

  const data = (await res.json()) as EventResponse;

  if (!res.ok) {
    return data;
  }

  return data;
}

function formatGameTime(date: string) {
  const formatted = new Date(date).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatted} EST`;
}

function formatPrice(price?: number) {
  if (price === undefined || price === null || price === 0) return "—";
  return price > 0 ? `+${price}` : `${price}`;
}

function formatImpliedPercent(price?: number) {
  if (price === undefined || price === null || price === 0) return "—";

  const probability =
    price > 0 ? 100 / (price + 100) : Math.abs(price) / (Math.abs(price) + 100);

  return `${Math.round(probability * 100)}%`;
}

function getMarket(bookmaker: Bookmaker | undefined, marketKey: string) {
  return bookmaker?.markets?.find((market) => market.key === marketKey);
}

function getOutcomeByName(
  outcomes: OddsOutcome[] | undefined,
  teamName: string
): OddsOutcome | undefined {
  return outcomes?.find((outcome) => outcome.name === teamName);
}

function getPolymarketHref(game: Game) {
  return `https://polymarket.com/sports/${game.sport_key}/${game.slug}`;
}

function getLogoClassName(sportKey: string) {
  if (sportKey === "mlb") {
    return "h-14 w-14 object-contain";
  }

  return "h-14 w-14 rounded-md object-contain bg-white/5";
}

function getLogoFallbackClassName(sportKey: string) {
  if (sportKey === "mlb") {
    return "h-14 w-14 bg-zinc-950";
  }

  return "h-14 w-14 rounded-md border border-zinc-800 bg-zinc-950";
}

function TeamPanel({
  team,
  info,
  sportKey,
  price,
  game,
  side,
}: {
  team: string;
  info?: TeamInfo;
  sportKey: string;
  price?: number;
  game: Game;
  side: "away" | "home";
}) {
  const impliedPercent = formatImpliedPercent(price);
  const americanOdds = formatPrice(price);

  const polymarketTokenId =
    side === "away"
      ? game.outcome_token_ids?.away
      : game.outcome_token_ids?.home;

  return (
    <div className="min-w-0 rounded-[28px] border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex min-w-0 items-center gap-4">
        {info?.logo ? (
          <img
            src={info.logo}
            alt={info.name || team}
            className={getLogoClassName(sportKey)}
          />
        ) : (
          <div className={getLogoFallbackClassName(sportKey)} />
        )}

        <div className="min-w-0">
          <div className="truncate text-[24px] font-semibold tracking-tight text-zinc-50">
            {info?.name || team}
          </div>

          <div className="mt-1 text-[13px] text-zinc-400">
            {info?.record || info?.abbreviation || info?.alias || "—"}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-[34px] font-semibold leading-none text-white">
            {impliedPercent}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Moneyline
          </div>

          <BetSlipModal
            team={team}
            gameId={game.id}
            league={game.sport_key}
            market="h2h"
            odds={americanOdds}
            impliedPercent={impliedPercent}
            matchup={`${game.away_team} vs. ${game.home_team}`}
            polymarketEventId={game.polymarket?.event_id ?? null}
            polymarketEventSlug={game.polymarket?.event_slug ?? null}
            polymarketMarketId={game.polymarket?.market_id ?? null}
            polymarketConditionId={game.polymarket?.condition_id ?? null}
            polymarketMarketSlug={game.polymarket?.market_slug ?? null}
            polymarketOutcome={team}
            polymarketOutcomeIndex={side === "away" ? 0 : 1}
            polymarketTokenId={polymarketTokenId ?? null}
          />
        </div>
      </div>
    </div>
  );
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const data = await getEvent(slug);
  const game = data.game;

  if (!game) {
    return (
      <div className="min-h-screen bg-[#09090b] pb-24 text-white md:pb-0">
        <div className="mx-auto w-full max-w-5xl min-w-0 px-4 py-10 sm:px-6 sm:py-12">
          <div className="mb-6">
            <BackButton />
          </div>

          <div className="min-w-0 rounded-[28px] border border-zinc-800 bg-zinc-950 p-6">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Event not found
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              {data.error ||
                "This game may no longer be active or the slug no longer matches."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const bookmaker = game.bookmakers?.[0];
  const h2h = getMarket(bookmaker, "h2h")?.outcomes;

  const awayMoneyline = getOutcomeByName(h2h, game.away_team);
  const homeMoneyline = getOutcomeByName(h2h, game.home_team);

  return (
    <div className="min-h-screen bg-[#09090b] pb-24 text-white md:pb-0">
      <div className="mx-auto w-full max-w-5xl min-w-0 px-4 py-10 sm:px-6 sm:py-12">
        <header className="mb-6">
          <BackButton />
        </header>

        <section className="min-w-0 rounded-[32px] bg-zinc-950 p-6 sm:p-8">
          <div className="relative text-center">
            <Link
              href={getPolymarketHref(game)}
              target="_blank"
              rel="noreferrer"
              className="absolute right-0 -top-7 inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-300 transition-colors hover:text-white md:top-0"
            >
              <span>Polymarket</span>
              <FiArrowUpRight className="h-3.5 w-3.5" />
            </Link>

            <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              {game.sport_title}
            </div>

            <h1 className="mt-3 text-[34px] font-semibold leading-none tracking-tight text-white sm:text-[42px]">
              {game.away_team} vs. {game.home_team}
            </h1>

            <p className="mt-3 text-sm text-zinc-400">
              {formatGameTime(game.commence_time)}
            </p>
          </div>

          <div className="mt-8 grid min-w-0 gap-4 md:grid-cols-2">
            <TeamPanel
              team={game.away_team}
              info={game.away_team_info}
              sportKey={game.sport_key}
              price={awayMoneyline?.price}
              game={game}
              side="away"
            />

            <TeamPanel
              team={game.home_team}
              info={game.home_team_info}
              sportKey={game.sport_key}
              price={homeMoneyline?.price}
              game={game}
              side="home"
            />
          </div>

          <PriceHistoryChart slug={game.slug} />
        </section>
      </div>
    </div>
  );
}