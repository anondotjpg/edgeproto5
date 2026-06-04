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
};

const MAX_ACCOUNT_NAME_LENGTH = 15;

const ACCOUNT_ROW_CLASS =
  "flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const ACCOUNT_CARD_CLASS =
  "group min-h-[72px] shrink-0 rounded-[14px] border border-zinc-900 bg-zinc-950 px-4 py-3 transition-colors hover:border-zinc-800 hover:bg-zinc-900/80";

const ACCOUNT_CARD_WIDTH_CLASS =
  "w-full sm:w-[calc((100%_-_8px)_/_2)] xl:w-[calc((100%_-_16px)_/_3)]";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-900 ${className}`} />;
}

function getStatusLabel(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "active_dev") return "Active";
  if (normalizedStatus === "active") return "Active";
  if (normalizedStatus === "passed") return "Passed";
  if (normalizedStatus === "failed") return "Failed";
  if (normalizedStatus === "won") return "Won";
  if (normalizedStatus === "lost") return "Lost";
  if (normalizedStatus === "void") return "Void";

  return status;
}

function AccountSkeletonCard() {
  return (
    <div
      className={[
        ACCOUNT_CARD_CLASS,
        ACCOUNT_CARD_WIDTH_CLASS,
        "flex items-center justify-between",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-5 w-24" />
          <SkeletonBlock className="h-5 w-16 rounded-full" />
        </div>

        <SkeletonBlock className="mt-2 h-3 w-24" />
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-2">
        <SkeletonBlock className="h-7 w-7 rounded-full" />
      </div>
    </div>
  );
}

function EmptyAccountCard({ authenticated }: { authenticated: boolean }) {
  return (
    <div className="flex min-h-[72px] items-center justify-between rounded-[14px] border border-zinc-900 bg-zinc-950 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-zinc-300">
          No active accounts
        </div>

        <div className="mt-1 text-[12px] text-zinc-600">
          {authenticated
            ? "Open an account below to get started."
            : "Sign in to view your accounts."}
        </div>
      </div>
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

    const maxScrollLeft = row.scrollWidth - row.clientWidth;

    setCanScrollBack(row.scrollLeft > 2);
    setCanScrollForward(row.scrollLeft < maxScrollLeft - 2);
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
            : account
        )
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

    row.scrollTo({
      left:
        direction === "back"
          ? row.scrollLeft - row.clientWidth
          : row.scrollLeft + row.clientWidth,
      behavior: "smooth",
    });
  }

  const showSkeleton = !ready || isLoading;
  const showEmpty = !showSkeleton && (!authenticated || accounts.length === 0);
  const showAccounts = !showSkeleton && authenticated && accounts.length > 0;
  const hasOverflowControls =
    showAccounts && (canScrollBack || canScrollForward || accounts.length > 3);
  const reserveArrowSpace = showSkeleton || hasOverflowControls;
  const showMobileSwipeHint = showAccounts && accounts.length > 1;

  const hideOnMobileWhenCollapsed = !showAccounts;

  return (
    <div
      className={[
        "mb-6 overflow-hidden transition-[height] duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-auto sm:min-h-[122px] sm:overflow-visible sm:transition-none md:pt-[5%] lg:pt-0",
        showAccounts ? "h-[124px]" : "h-[14px]",
      ].join(" ")}
    >
      <style>{`
        @keyframes ownedAccountsMobileReveal {
          0% {
            opacity: 0;
            transform: translateY(-8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 639px) {
          .owned-accounts-mobile-reveal {
            animation: ownedAccountsMobileReveal 850ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
        }
      `}</style>

      <div
        className={[
          "mb-3 items-center justify-between gap-3",
          hideOnMobileWhenCollapsed ? "hidden sm:flex" : "flex",
        ].join(" ")}
      >
        <h2 className="min-w-0 text-base font-semibold tracking-tight text-zinc-100 sm:text-xl">
          Accounts{" "}
          <span className="text-zinc-500">
            ({showSkeleton ? "0" : showAccounts ? accounts.length : 0})
          </span>
        </h2>

        {showMobileSwipeHint ? (
          <div className="shrink-0 text-[11px] font-medium text-zinc-500 sm:hidden">
            Swipe to view more
          </div>
        ) : null}

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

      {showSkeleton ? (
        <div ref={rowRef} className={[ACCOUNT_ROW_CLASS, "hidden sm:flex"].join(" ")}>
          <AccountSkeletonCard />
          <AccountSkeletonCard />
          <AccountSkeletonCard />
        </div>
      ) : null}

      {showEmpty ? (
        <div className="hidden sm:block">
          <EmptyAccountCard authenticated={authenticated} />
        </div>
      ) : null}

      {showAccounts ? (
        <div className="owned-accounts-mobile-reveal sm:contents">
          <div ref={rowRef} className={ACCOUNT_ROW_CLASS}>
          {accounts.map((account) => {
            const plan = PLAN_CONFIG[account.plan_key as PlanKey];

            const sizeLabel =
              plan?.sizeLabel ??
              `$${Number(account.plan_size).toLocaleString()}`;

            const feeLabel = `$${Number(
              account.one_time_fee
            ).toLocaleString()}`;

            const isEditing = editingAccountId === account.id;
            const isSaving = savingAccountId === account.id;
            const accountName = account.account_name?.trim();
            const displayName = accountName || sizeLabel;

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
                  <div>
                    <div className="flex min-h-[48px] items-center gap-2">
                      <input
                        value={draftName}
                        onChange={(event) =>
                          setDraftName(
                            event.target.value.slice(
                              0,
                              MAX_ACCOUNT_NAME_LENGTH
                            )
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
                  <div className="flex min-h-[48px] items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[17px] font-semibold leading-none tracking-tight text-zinc-100">
                          {displayName}
                        </div>

                        <div className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium tracking-[0.12em] text-zinc-500">
                          {getStatusLabel(account.status)}
                        </div>
                      </div>

                      <div className="mt-[6px] text-[12px] leading-none text-zinc-500">
                        {accountName
                          ? `${sizeLabel} · Fee ${feeLabel}`
                          : `Fee ${feeLabel}`}
                      </div>
                    </div>

                    <div className="ml-3 flex shrink-0 items-center gap-2">
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
                              MAX_ACCOUNT_NAME_LENGTH
                            )
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
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      ) : null}
    </div>
  );
}