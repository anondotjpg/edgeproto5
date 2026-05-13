"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { PLAN_CONFIG, type PlanKey } from "@/lib/plans";
import { FiArrowUpRight } from "react-icons/fi";

type ExistingAccount = {
  id: string;
  plan_key: string;
  plan_size: number;
  one_time_fee: number;
  status: string;
  created_at: string;
};

function getStatusClassName(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "failed") {
    return "bg-red-950/60 text-red-400";
  }

  return "bg-zinc-900 text-zinc-500";
}

function AccountSkeletonCard() {
  return (
    <div className="flex min-h-[58px] items-center justify-between rounded-[14px] bg-zinc-950 px-4 py-3 ring-1 ring-zinc-900">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-900" />
        </div>

        <div className="mt-2 h-3 w-14 animate-pulse rounded bg-zinc-900" />
      </div>

      <div className="ml-3 h-7 w-7 shrink-0 animate-pulse rounded-full bg-zinc-900" />
    </div>
  );
}

function EmptyAccountCard({ authenticated }: { authenticated: boolean }) {
  return (
    <div className="flex min-h-[58px] items-center justify-between rounded-[14px] bg-zinc-950 px-4 py-3 ring-1 ring-zinc-900">
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
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [accounts, setAccounts] = useState<ExistingAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const showSkeleton = !ready || isLoading;
  const showEmpty = !showSkeleton && (!authenticated || accounts.length === 0);
  const showAccounts = !showSkeleton && authenticated && accounts.length > 0;

  return (
    <div className="mb-6 min-h-[108px]">
      <div className="mb-3 flex items-center">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Active Accounts{" "}
          <span className="tracking-normal text-zinc-600">
            ({showSkeleton ? "..." : showAccounts ? accounts.length : 0})
          </span>
        </h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {showSkeleton && (
          <>
            <AccountSkeletonCard />
            <AccountSkeletonCard />

            <div className="hidden xl:block">
              <AccountSkeletonCard />
            </div>
          </>
        )}

        {showEmpty && <EmptyAccountCard authenticated={authenticated} />}

        {showAccounts &&
          accounts.map((account) => {
            const plan = PLAN_CONFIG[account.plan_key as PlanKey];

            const sizeLabel =
              plan?.sizeLabel ??
              `$${Number(account.plan_size).toLocaleString()}`;

            const feeLabel = `$${Number(
              account.one_time_fee
            ).toLocaleString()}`;

            return (
              <Link
                key={account.id}
                href={`/accounts/${account.id}`}
                className="group flex min-h-[58px] items-center justify-between rounded-[14px] bg-zinc-950 px-4 py-3 ring-1 ring-zinc-900 transition-colors hover:bg-zinc-900/80 hover:ring-zinc-800"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[17px] font-semibold leading-none tracking-tight text-zinc-100">
                      {sizeLabel}
                    </div>

                    <div
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${getStatusClassName(
                        account.status
                      )}`}
                    >
                      {account.status}
                    </div>
                  </div>

                  <div className="mt-1 text-[12px] text-zinc-500">
                    Fee {feeLabel}
                  </div>
                </div>

                <div className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 transition-colors group-hover:bg-zinc-800 group-hover:text-zinc-100">
                  <FiArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}