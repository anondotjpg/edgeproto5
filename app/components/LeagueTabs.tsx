"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiChevronDown } from "react-icons/fi";

type LeagueTab = {
  label: string;
  tag: number;
  league: string;
};

export default function LeagueTabs({
  leagues,
  selectedLeague,
}: {
  leagues: readonly LeagueTab[];
  selectedLeague: string;
}) {
  const [open, setOpen] = useState(false);

  const selectedItem = useMemo(() => {
    return leagues.find((item) => item.league === selectedLeague) ?? leagues[0];
  }, [leagues, selectedLeague]);

  return (
    <>
      <div className="pointer-events-none absolute left-0 top-0 z-30 sm:hidden">
        <div className="pointer-events-auto px-4 py-5">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex h-9 min-w-[132px] items-center justify-between gap-3 rounded-full bg-zinc-900/90 px-4 text-[13px] font-bold text-zinc-100 outline-none backdrop-blur transition-colors focus:outline-none focus-visible:outline-none"
          >
            <span>{selectedItem?.label ?? "League"}</span>
            <FiChevronDown
              className={[
                "h-4 w-4 text-zinc-500 transition-transform",
                open ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {open ? (
            <div className="absolute left-4 top-[62px] w-[180px] overflow-hidden rounded-2xl border border-zinc-800 bg-[#09090b]/95 p-1.5 shadow-2xl backdrop-blur-md">
              {leagues.map((item) => {
                const isActive = item.league === selectedLeague;

                return (
                  <Link
                    key={item.league}
                    href={`/?league=${item.league}`}
                    onClick={() => setOpen(false)}
                    className={[
                      "flex h-10 items-center rounded-xl px-3 text-[13px] font-bold transition-colors active:bg-zinc-800",
                      isActive
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-500 hover:bg-zinc-900/70 hover:text-zinc-200",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="no-scrollbar relative z-20 hidden w-min items-center gap-4 overflow-x-auto rounded-lg sm:flex sm:gap-2 sm:bg-zinc-900/70">
        {leagues.map((item) => {
          const isActive = item.league === selectedLeague;

          return (
            <Link
              key={item.league}
              href={`/?league=${item.league}`}
              className={[
                "relative shrink-0 text-[13px] font-medium transition-colors",
                "sm:rounded-full sm:px-4 sm:py-2",
                isActive
                  ? "text-white sm:text-zinc-100"
                  : "text-zinc-500 sm:text-zinc-300",
              ].join(" ")}
            >
              {isActive ? (
                <motion.span
                  layoutId="activeLeaguePill"
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 34,
                    mass: 0.8,
                  }}
                  className="absolute inset-0 hidden rounded-xl bg-zinc-800 sm:block"
                />
              ) : null}

              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}