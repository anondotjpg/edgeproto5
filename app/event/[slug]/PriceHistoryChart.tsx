"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

type HistoryPoint = {
  t: number;
  p: number;
};

type PriceHistoryResponse = {
  updatedAt: string;
  away: {
    label: string;
    tokenId?: string;
    history: HistoryPoint[];
  };
  home: {
    label: string;
    tokenId?: string;
    history: HistoryPoint[];
  };
  error?: string;
};

type Props = {
  slug: string;
  awayColor?: string | null;
  homeColor?: string | null;
};

type EndDotProps = {
  cx?: number;
  cy?: number;
  stroke?: string;
  index?: number;
  points?: unknown[];
};

function formatTimeLabel(timestampSeconds: number) {
  return new Date(timestampSeconds * 1000).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeChartColor(color: string | null | undefined, fallback: string) {
  const clean = color?.trim();

  if (!clean) return fallback;

  if (/^#[0-9a-fA-F]{3}$/.test(clean)) return clean;
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean;
  if (/^#[0-9a-fA-F]{8}$/.test(clean)) return clean;

  if (/^[0-9a-fA-F]{3}$/.test(clean)) return `#${clean}`;
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean}`;
  if (/^[0-9a-fA-F]{8}$/.test(clean)) return `#${clean}`;

  if (/^(rgb|rgba|hsl|hsla)\(/i.test(clean)) return clean;

  return fallback;
}

function EndDot(props: EndDotProps) {
  const points = props.points;
  const index = props.index;

  if (
    !points ||
    index !== points.length - 1 ||
    props.cx === undefined ||
    props.cy === undefined
  ) {
    return null;
  }

  return (
    <circle
      cx={props.cx}
      cy={props.cy}
      r={3.5}
      fill={props.stroke}
      stroke="#09090b"
      strokeWidth={2}
      opacity={0}
    >
      <animate
        attributeName="opacity"
        from="0"
        to="1"
        dur="0.18s"
        begin="0.42s"
        fill="freeze"
      />
      <animate
        attributeName="r"
        from="1"
        to="3.5"
        dur="0.18s"
        begin="0.42s"
        fill="freeze"
      />
    </circle>
  );
}

function ChartLegend({
  awayLabel,
  homeLabel,
  awayStroke,
  homeStroke,
}: {
  awayLabel?: string;
  homeLabel?: string;
  awayStroke: string;
  homeStroke: string;
}) {
  return (
    <div className="mt-1 flex items-center justify-center gap-4 text-[12px] font-medium text-zinc-300">
      <div className="flex items-center gap-1.5">
        <span
          className="h-[2px] w-4 rounded-full"
          style={{ backgroundColor: awayStroke }}
        />
        <span>{awayLabel || "Away"}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="h-[2px] w-4 rounded-full"
          style={{ backgroundColor: homeStroke }}
        />
        <span>{homeLabel || "Home"}</span>
      </div>
    </div>
  );
}

export default function PriceHistoryChart({
  slug,
  awayColor,
  homeColor,
}: Props) {
  const [data, setData] = useState<PriceHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);

  const awayStroke = useMemo(() => {
    return normalizeChartColor(awayColor, "#ffffff");
  }, [awayColor]);

  const homeStroke = useMemo(() => {
    return normalizeChartColor(homeColor, "#71717a");
  }, [homeColor]);

  useEffect(() => {
    let cancelled = false;
    let revealTimer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      setIsLoading(true);
      setShowChart(false);

      try {
        const res = await fetch(
          `/api/event/${encodeURIComponent(slug)}/price-history`,
          {
            cache: "no-store",
          },
        );

        const json = (await res.json()) as PriceHistoryResponse;

        if (!cancelled) {
          setData(json);
        }
      } catch {
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          revealTimer = setTimeout(() => {
            if (!cancelled) {
              setIsLoading(false);
              setShowChart(true);
            }
          }, 250);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, [slug]);

  const chartData = useMemo(() => {
    if (!data) return [];

    const awayMap = new Map<number, number>(
      data.away.history.map((point) => [point.t, point.p]),
    );

    const homeMap = new Map<number, number>(
      data.home.history.map((point) => [point.t, point.p]),
    );

    const timestamps = Array.from(
      new Set([...awayMap.keys(), ...homeMap.keys()]),
    ).sort((a, b) => a - b);

    return timestamps.map((t) => ({
      t,
      away: awayMap.get(t),
      home: homeMap.get(t),
    }));
  }, [data]);

  if (!isLoading && (!data || data.error || chartData.length === 0)) {
    return (
      <div className="mt-8 min-w-0 rounded-[28px] bg-zinc-950 sm:p-6">
        <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          History
        </div>

        <div className="mt-3 text-[13px] text-zinc-400">
          No price history available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 min-w-0 rounded-[28px] bg-zinc-950 sm:p-6">
      <div className="mb-4">
        <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          History
        </div>
      </div>

      <div className="relative w-full min-w-0 rounded-2xl">
        {showChart ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="w-full min-w-0"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.currentTarget.blur();
            }}
          >
            <div className="w-full min-w-0 rounded-2xl outline-none focus:outline-none [&_*:focus]:outline-none">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 12 }}
                >
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.08)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(value) => formatTimeLabel(Number(value))}
                    minTickGap={32}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    tickMargin={10}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    domain={[0, 1]}
                    tickFormatter={(value) =>
                      `${Math.round(Number(value) * 100)}%`
                    }
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />

                  <Legend
                    verticalAlign="bottom"
                    content={
                      <ChartLegend
                        awayLabel={data?.away.label}
                        homeLabel={data?.home.label}
                        awayStroke={awayStroke}
                        homeStroke={homeStroke}
                      />
                    }
                  />

                  <Line
                    type="linear"
                    dataKey="away"
                    name={data?.away.label}
                    stroke={awayStroke}
                    strokeWidth={2}
                    dot={<EndDot />}
                    activeDot={false}
                    connectNulls
                    isAnimationActive
                  />

                  <Line
                    type="linear"
                    dataKey="home"
                    name={data?.home.label}
                    stroke={homeStroke}
                    strokeWidth={2}
                    dot={<EndDot />}
                    activeDot={false}
                    connectNulls
                    isAnimationActive
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ) : (
          <div className="h-[280px] w-full" />
        )}
      </div>
    </div>
  );
}