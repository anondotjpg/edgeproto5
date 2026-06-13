import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const LEAGUES = [
  { key: "nba", label: "NBA" },
  { key: "nhl", label: "NHL" },
  { key: "mlb", label: "MLB" },
  { key: "wnba", label: "WNBA" },
] as const;

type EligibleGameRow = {
  id: string;
  slug: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  is_live: boolean;
  away_team: string;
  home_team: string;
  away_team_info: unknown | null;
  home_team_info: unknown | null;
  bookmakers: unknown;
  polymarket: unknown;
  outcome_token_ids: unknown | null;
  debug?: unknown | null;
};

type TeamInfo = {
  name: string;
  abbreviation?: string;
  alias?: string;
  record?: string;
  logo?: string;
  color?: string;
  league?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isValidHexColor(value: unknown) {
  return (
    typeof value === "string" &&
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
  );
}

function normalizeTeamInfo(value: unknown, fallbackName: string): TeamInfo {
  if (!isRecord(value)) {
    return {
      name: fallbackName,
    };
  }

  return {
    name: getString(value.name) ?? fallbackName,
    abbreviation: getString(value.abbreviation),
    alias: getString(value.alias),
    record: getString(value.record),
    logo: getString(value.logo),
    color: isValidHexColor(value.color) ? value.color : undefined,
    league: getString(value.league),
  };
}

function rowToGame(row: EligibleGameRow) {
  return {
    id: row.id,
    slug: row.slug,
    sport_key: row.sport_key,
    sport_title: row.sport_title,
    commence_time: row.commence_time,
    isLive: Boolean(row.is_live) || Date.parse(row.commence_time) <= Date.now(),
    away_team: row.away_team,
    home_team: row.home_team,
    away_team_info: normalizeTeamInfo(row.away_team_info, row.away_team),
    home_team_info: normalizeTeamInfo(row.home_team_info, row.home_team),
    bookmakers: Array.isArray(row.bookmakers) ? row.bookmakers : [],
    polymarket: row.polymarket ?? undefined,
    outcome_token_ids: row.outcome_token_ids ?? undefined,
    debug: row.debug ?? undefined,
  };
}

export async function GET() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("eligible_games")
    .select(
      "id, slug, sport_key, sport_title, commence_time, is_live, away_team, home_team, away_team_info, home_team_info, bookmakers, polymarket, outcome_token_ids, debug",
    )
    .gte("commence_time", cutoff)
    .order("commence_time", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        updatedAt: new Date().toISOString(),
        leagues: [],
        error: error.message,
      },
      { status: 500 },
    );
  }

  const games = (data ?? []).map((row) => rowToGame(row as EligibleGameRow));

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    leagues: LEAGUES.map((league) => ({
      leagueKey: league.key,
      leagueLabel: league.label,
      games: games.filter((game) => game.sport_key === league.key),
    })),
  });
}