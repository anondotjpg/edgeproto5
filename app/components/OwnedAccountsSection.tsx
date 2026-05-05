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

  if (!ready || isLoading) {
    return null;
  }

  if (!authenticated || !accounts.length) {
    return null;
  }

  return (
    <div className="mb-10">
      <div className="mb-6 text-center">
        <h2 className="text-[24px] font-semibold tracking-tight text-zinc-100 sm:text-[30px]">
          Current Accounts
        </h2>
        <p className="mt-1 text-[14px] text-zinc-500 sm:text-[15px]">
          Open an account below or jump into an existing one.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => {
          const plan = PLAN_CONFIG[account.plan_key as PlanKey];
          const sizeLabel =
            plan?.sizeLabel ?? `$${Number(account.plan_size).toLocaleString()}`;
          const createdDate = new Date(account.created_at).toLocaleDateString();

          return (
            <Link
              key={account.id}
              href={`/accounts/${account.id}`}
              className="group rounded-[24px] border border-zinc-800 bg-zinc-950 px-5 py-4 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {account.status}
                </div>
                <div className="text-[11px] text-zinc-600">{createdDate}</div>
              </div>

              <div className="mt-3">
                <div className="text-[28px] font-semibold leading-none tracking-tight text-zinc-100">
                  {sizeLabel}
                </div>
                <div className="mt-1 text-[14px] text-zinc-500">
                  Challenge Account
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                    Fee
                  </div>
                  <div className="mt-1 text-[15px] font-semibold text-zinc-200">
                    ${account.one_time_fee}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                    Route
                  </div>
                  <div className="mt-1 truncate text-[13px] text-zinc-300">
                    /accounts/{account.id}
                  </div>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-300 group-hover:text-zinc-100">
                <span>Open account</span>
                <FiArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}