"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { PLAN_CONFIG, type PlanKey } from "@/lib/plans";
import { FiArrowUpRight, FiEdit2 } from "react-icons/fi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

type ExistingAccount = {
  id: string;
  account_name: string | null;
  plan_key: string;
  plan_size: number;
  one_time_fee: number;
  status: string;
  created_at: string;

  starting_balance?: number | null;
  current_balance?: number | null;
  reserved_risk?: number | null;
  profit_target_percent?: number | null;

  funded_started_at?: string | null;
  funded_starting_balance?: number | null;
  funded_current_balance?: number | null;
  funded_reserved_risk?: number | null;
  funded_realized_pnl?: number | null;
};

const MAX_ACCOUNT_NAME_LENGTH = 15;

const ACCOUNT_ROW_CLASS =
  "flex flex-col gap-2 overflow-visible sm:flex-row sm:snap-x sm:snap-mandatory sm:overflow-x-auto sm:overflow-y-hidden sm:overscroll-x-contain sm:scroll-smooth sm:[-ms-overflow-style:none] sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden";

const ACCOUNT_CARD_CLASS =
  "group min-h-[86px] w-full rounded-[14px] border border-zinc-900 bg-zinc-950 px-4 py-3 transition-colors hover:border-zinc-800 hover:bg-zinc-900/80 sm:shrink-0 sm:snap-start sm:snap-always";

const ACCOUNT_CARD_WIDTH_CLASS =
  "sm:w-[calc((100%_-_8px)_/_2)] xl:w-[calc((100%_-_16px)_/_3)]";

type MiniGoalBarTone = "goal" | "failed" | "funded";

function getStatusLabel(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "active_dev") return "Active";
  if (normalizedStatus === "active") return "Active";
  if (normalizedStatus === "passed") return "Passed";
  if (normalizedStatus === "funded") return "Funded";
  if (normalizedStatus === "failed") return "Failed";
  if (normalizedStatus === "won") return "Won";
  if (normalizedStatus === "lost") return "Lost";
  if (normalizedStatus === "void") return "Void";

  return status;
}

function getAccountGoalProgress(account: ExistingAccount) {
  const status = account.status.toLowerCase();

  if (status === "failed") return 100;
  if (status === "funded") return 100;

  const startingBalance = Number(
    account.starting_balance ?? account.plan_size ?? 0,
  );

  const currentBalance = Number(account.current_balance ?? startingBalance);
  const reservedRisk = Number(account.reserved_risk ?? 0);
  const ruleEquity = currentBalance + reservedRisk;

  const profitTargetPercent = Number(account.profit_target_percent ?? 30);
  const profitTargetBalance = startingBalance * (1 + profitTargetPercent / 100);
  const requiredProfit = profitTargetBalance - startingBalance;

  if (!startingBalance || requiredProfit <= 0) return 0;

  return ((ruleEquity - startingBalance) / requiredProfit) * 100;
}

function getMiniGoalBarTone(account: ExistingAccount): MiniGoalBarTone {
  const status = account.status.toLowerCase();

  if (status === "failed") return "failed";
  if (status === "funded") return "funded";

  return "goal";
}

function MiniGoalProgressBar({
  value,
  tone,
}: {
  value: number;
  tone: MiniGoalBarTone;
}) {
  const barCount = 12;
  const progress =
    tone === "failed" || tone === "funded"
      ? 100
      : Math.min(Math.max(value, 0), 100);

  const step = 100 / barCount;

  const getBarFill = (index: number) => {
    if (tone === "failed" || tone === "funded") return 1;

    const barStart = index * step;
    const barEnd = barStart + step;

    if (progress >= barEnd) return 1;
    if (progress <= barStart) return 0;

    return (progress - barStart) / step;
  };

  const getBarColor = (index: number) => {
    if (tone === "failed") return "#ef4444";
    if (tone === "funded") return "#22c55e";

    const ratio = barCount <= 1 ? 1 : index / (barCount - 1);
    const hue = 42 + ratio * 98;

    return `hsl(${hue} 82% 52%)`;
  };

  return (
    <div className="grid h-[14px] w-[70px] grid-cols-12 gap-[3px]">
      {Array.from({ length: barCount }).map((_, index) => {
        const fill = getBarFill(index);
        const overlayOpacity = 0.72 * (1 - fill);

        return (
          <div
            key={index}
            className="relative min-w-0 overflow-hidden rounded-full bg-zinc-900"
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: getBarColor(index) }}
            />

            <div
              data-tone={tone}
              className="owned-mini-goal-cover absolute inset-0 rounded-full bg-zinc-950"
              style={
                {
                  opacity: overlayOpacity,
                  "--owned-mini-goal-cover-opacity": overlayOpacity,
                  "--owned-mini-goal-delay":
                    tone === "goal" ? `${Math.min(index * 22, 180)}ms` : "0ms",
                } as React.CSSProperties
              }
            />
          </div>
        );
      })}
    </div>
  );
}

export default function OwnedAccountsSection() {
  const router = useRouter();
  const { ready, authenticated, getAccessToken } = usePrivy();

  const rowRef = useRef<HTMLDivElement | null>(null);

  const [accounts, setAccounts] = useState<ExistingAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      if (!ready) return;

      if (!authenticated) {
        setAccounts([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const accessToken = await getAccessToken();

        const response = await fetch("/api/accounts/mine", {
          method: "GET",
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {},
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load accounts.");
        }

        if (!cancelled) {
          setAccounts(data.accounts ?? []);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setAccounts([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken]);

  function updateScrollState() {
    const row = rowRef.current;
    if (!row) return;

    const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth);

    setHasHorizontalOverflow(maxScrollLeft > 2);
    setCanScrollBack(row.scrollLeft > 2);
    setCanScrollForward(row.scrollLeft < maxScrollLeft - 2);
  }

  function getSnapPositions(row: HTMLDivElement) {
    const rowRect = row.getBoundingClientRect();
    const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth);

    const positions = Array.from(row.children)
      .map((child) => {
        const childRect = (child as HTMLElement).getBoundingClientRect();
        return Math.round(childRect.left - rowRect.left + row.scrollLeft);
      })
      .map((position) => Math.min(Math.max(position, 0), maxScrollLeft))
      .filter((position, index, allPositions) => {
        return index === 0 || Math.abs(position - allPositions[index - 1]) > 2;
      });

    return Array.from(new Set([0, ...positions, maxScrollLeft])).sort(
      (a, b) => a - b,
    );
  }

  useEffect(() => {
    updateScrollState();

    const row = rowRef.current;
    if (!row) return;

    row.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      row.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [accounts.length, isLoading, ready, authenticated]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateScrollState);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [accounts.length, isLoading]);

  async function saveAccountName(accountId: string) {
    if (savingAccountId) return;

    try {
      setSavingAccountId(accountId);

      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("Missing auth token.");
      }

      const response = await fetch("/api/accounts/rename", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          accountId,
          accountName: draftName.slice(0, MAX_ACCOUNT_NAME_LENGTH),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to rename account.");
      }

      setAccounts((currentAccounts) =>
        currentAccounts.map((account) =>
          account.id === accountId
            ? {
                ...account,
                account_name: data.account?.account_name ?? null,
              }
            : account,
        ),
      );

      setEditingAccountId(null);
      setDraftName("");
    } catch (error) {
      console.error(error);
    } finally {
      setSavingAccountId(null);
    }
  }

  function openAccount(accountId: string) {
    router.push(`/accounts/${accountId}`);
  }

  function scrollAccounts(direction: "back" | "forward") {
    const row = rowRef.current;
    if (!row) return;

    const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth);
    const snapPositions = getSnapPositions(row);
    const currentLeft = Math.round(row.scrollLeft);
    const buffer = 3;

    if (maxScrollLeft <= 2 || snapPositions.length <= 1) {
      updateScrollState();
      return;
    }

    const rawTargetLeft =
      direction === "forward"
        ? (snapPositions.find((position) => position > currentLeft + buffer) ??
          maxScrollLeft)
        : ([...snapPositions]
            .reverse()
            .find((position) => position < currentLeft - buffer) ?? 0);

    const targetLeft = Math.min(Math.max(rawTargetLeft, 0), maxScrollLeft);

    row.scrollTo({
      left: targetLeft,
      behavior: "smooth",
    });

    window.setTimeout(updateScrollState, 180);
    window.setTimeout(updateScrollState, 420);
  }

  const showAccounts =
    ready && !isLoading && authenticated && accounts.length > 0;
  const hasOverflowControls = showAccounts && hasHorizontalOverflow;
  const reserveArrowSpace = hasOverflowControls;

  return (
    <div
      className={[
        "overflow-visible transition-[height,margin-bottom] duration-[720ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:overflow-hidden",
        showAccounts ? "h-auto mb-6 sm:h-[138px]" : "h-[28px]",
      ].join(" ")}
    >
      <style>{`
        @keyframes ownedAccountsReveal {
          0% {
            opacity: 0;
            transform: translateY(-8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ownedMiniGoalReplay {
          0% {
            opacity: 0.72;
          }
          100% {
            opacity: var(--owned-mini-goal-cover-opacity);
          }
        }

        .owned-accounts-reveal {
          animation: ownedAccountsReveal 720ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .group:hover .owned-mini-goal-cover[data-tone="goal"] {
          animation: ownedMiniGoalReplay 760ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: var(--owned-mini-goal-delay);
        }

        @media (prefers-reduced-motion: reduce) {
          .owned-accounts-reveal {
            animation: none !important;
          }

          .owned-mini-goal-cover {
            animation: none !important;
          }
        }
      `}</style>

      {showAccounts ? (
        <div className="owned-accounts-reveal">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-base font-semibold tracking-tight text-zinc-100 sm:text-xl">
              Accounts{" "}
              <span className="text-zinc-500">({accounts.length})</span>
            </h2>

            <div
              className={[
                "hidden h-7 w-[64px] shrink-0 items-center justify-end gap-2 sm:flex",
                reserveArrowSpace ? "" : "invisible",
              ].join(" ")}
            >
              <button
                type="button"
                aria-label="Previous accounts"
                onClick={() => scrollAccounts("back")}
                disabled={!hasOverflowControls || !canScrollBack}
                className={[
                  "flex h-7 w-7 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30",
                  hasOverflowControls ? "cursor-pointer" : "invisible",
                ].join(" ")}
              >
                <FaChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                aria-label="Next accounts"
                onClick={() => scrollAccounts("forward")}
                disabled={!hasOverflowControls || !canScrollForward}
                className={[
                  "flex h-7 w-7 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30",
                  hasOverflowControls ? "cursor-pointer" : "invisible",
                ].join(" ")}
              >
                <FaChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div ref={rowRef} className={ACCOUNT_ROW_CLASS}>
              {accounts.map((account) => {
                const plan = PLAN_CONFIG[account.plan_key as PlanKey];

                const sizeLabel =
                  plan?.sizeLabel ??
                  `$${Number(account.plan_size).toLocaleString()}`;

                const isEditing = editingAccountId === account.id;
                const isSaving = savingAccountId === account.id;
                const accountName = account.account_name?.trim();
                const hasAccountName = Boolean(accountName);
                const displayName = accountName || sizeLabel;
                const statusLabel = getStatusLabel(account.status);
                const subtitle = hasAccountName ? statusLabel : `${statusLabel}`;
                const progress = getAccountGoalProgress(account);
                const barTone = getMiniGoalBarTone(account);

                return (
                  <div
                    key={account.id}
                    role={isEditing ? undefined : "link"}
                    tabIndex={isEditing ? undefined : 0}
                    onClick={() => {
                      if (!isEditing) {
                        openAccount(account.id);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (isEditing) return;

                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openAccount(account.id);
                      }
                    }}
                    className={[
                      ACCOUNT_CARD_CLASS,
                      ACCOUNT_CARD_WIDTH_CLASS,
                      isEditing ? "" : "cursor-pointer",
                    ].join(" ")}
                  >
                    {isEditing ? (
                      <div className="flex min-h-[60px] items-center">
                        <div className="flex w-full items-center gap-2">
                          <input
                            value={draftName}
                            onChange={(event) =>
                              setDraftName(
                                event.target.value.slice(
                                  0,
                                  MAX_ACCOUNT_NAME_LENGTH,
                                ),
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                saveAccountName(account.id);
                              }

                              if (event.key === "Escape") {
                                setEditingAccountId(null);
                                setDraftName("");
                              }
                            }}
                            autoFocus
                            maxLength={MAX_ACCOUNT_NAME_LENGTH}
                            placeholder={sizeLabel}
                            className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-black/40 px-2 py-1.5 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                          />

                          <button
                            type="button"
                            onClick={() => saveAccountName(account.id)}
                            disabled={isSaving}
                            className="cursor-pointer rounded-lg bg-zinc-100 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-950 disabled:opacity-50"
                          >
                            {isSaving ? "..." : "Save"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingAccountId(null);
                              setDraftName("");
                            }}
                            className="cursor-pointer rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[60px] items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 flex-col justify-center">
                          <div className="truncate text-[17px] font-semibold leading-[1.05] tracking-tight text-zinc-100">
                            {displayName}
                          </div>

                          <div className="mt-2 truncate text-[12px] font-medium leading-none text-zinc-500">
                            {subtitle}
                          </div>
                        </div>

                        <div className="ml-2 flex shrink-0 flex-col items-center justify-center gap-2">
                          <div className="flex h-7 items-center justify-center gap-2">
                            <button
                              type="button"
                              aria-label="Rename account"
                              title="Rename account"
                              onClick={(event) => {
                                event.stopPropagation();

                                setEditingAccountId(account.id);
                                setDraftName(
                                  (account.account_name ?? "").slice(
                                    0,
                                    MAX_ACCOUNT_NAME_LENGTH,
                                  ),
                                );
                              }}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center text-zinc-500 transition-colors hover:text-zinc-100"
                            >
                              <FiEdit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              aria-label="Open account"
                              title="Open account"
                              onClick={(event) => {
                                event.stopPropagation();
                                openAccount(account.id);
                              }}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center text-zinc-500 transition-colors hover:text-zinc-100"
                            >
                              <FiArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <MiniGoalProgressBar value={progress} tone={barTone} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}