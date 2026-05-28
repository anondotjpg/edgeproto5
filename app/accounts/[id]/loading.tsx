function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-900 ${className}`} />;
}

function MetricSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-[18px] bg-zinc-950/80 p-3 ring-1 ring-zinc-900 sm:rounded-[22px] sm:p-4">
      <div className="text-[11px] font-medium leading-none text-zinc-500 sm:text-[12px]">
        {label}
      </div>

      <SkeletonBlock className="mt-2 h-5 w-20 sm:h-6 sm:w-24" />
      <SkeletonBlock className="mt-1 h-3 w-24 sm:mt-2" />
    </div>
  );
}

function RuleSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-[26px] bg-zinc-950/80 p-5 ring-1 ring-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-medium text-zinc-500">{label}</div>
          <SkeletonBlock className="mt-3 h-8 w-36" />
          <SkeletonBlock className="mt-2 h-4 w-28" />
        </div>

        <SkeletonBlock className="h-7 w-20 rounded-full" />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[12px] text-zinc-500">
          <span>Used</span>
          <SkeletonBlock className="h-3 w-8" />
        </div>

        <SkeletonBlock className="h-2 w-full rounded-full" />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-black/30 p-3">
            <div className="text-[11px] text-zinc-600">Fail floor</div>
            <SkeletonBlock className="mt-2 h-4 w-20" />
          </div>

          <div className="rounded-2xl bg-black/30 p-3">
            <div className="text-[11px] text-zinc-600">Rule equity</div>
            <SkeletonBlock className="mt-2 h-4 w-20" />
          </div>
        </div>
      </div>

      <SkeletonBlock className="mt-4 h-3 w-full" />
      <SkeletonBlock className="mt-2 h-3 w-4/5" />
    </div>
  );
}

function BetCardSkeleton() {
  return (
    <div className="rounded-[22px] bg-zinc-950/80 p-4 ring-1 ring-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="mt-2 h-3 w-32" />
        </div>

        <SkeletonBlock className="h-7 w-16 rounded-full" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-black/30 p-3">
          <div className="text-[11px] text-zinc-600">Stake</div>
          <SkeletonBlock className="mt-2 h-4 w-14" />
        </div>

        <div className="rounded-2xl bg-black/30 p-3">
          <div className="text-[11px] text-zinc-600">Possible</div>
          <SkeletonBlock className="mt-2 h-4 w-16" />
        </div>

        <div className="rounded-2xl bg-black/30 p-3">
          <div className="text-[11px] text-zinc-600">P/L</div>
          <SkeletonBlock className="mt-2 h-4 w-14" />
        </div>
      </div>

      <SkeletonBlock className="mt-4 h-3 w-32" />
    </div>
  );
}

function GoalSkeleton() {
  return (
    <div className="rounded-[26px] bg-black/30 p-4 ring-1 ring-zinc-900 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-medium text-zinc-500">Goal</div>

          <SkeletonBlock className="mt-2 h-8 w-40 sm:h-9 sm:w-44" />
        </div>

        <SkeletonBlock className="h-7 w-16 rounded-full" />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[12px] text-zinc-500">
          <span>Progress</span>
          <SkeletonBlock className="h-3 w-20" />
        </div>

        <SkeletonBlock className="h-2 w-full rounded-full" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-zinc-950/70 p-3 ring-1 ring-zinc-900">
          <div className="text-[11px] text-zinc-600">Remaining</div>
          <SkeletonBlock className="mt-2 h-4 w-20" />
        </div>

        <div className="rounded-2xl bg-zinc-950/70 p-3 ring-1 ring-zinc-900">
          <div className="text-[11px] text-zinc-600">Target</div>
          <SkeletonBlock className="mt-2 h-4 w-12" />
        </div>
      </div>

      <SkeletonBlock className="mt-4 h-3 w-full" />
    </div>
  );
}

export default function LoadingAccountPage() {
  return (
    <div className="min-h-screen bg-[#09090b] px-4 pb-24 pt-6 text-white sm:px-6 md:pb-12 md:pt-10">
      <div className="mx-auto mt-7 w-full max-w-6xl">
        <section className="rounded-[32px] bg-zinc-950/90 p-5 sm:p-7">
          <div className="relative">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div className="min-w-0 pr-24 sm:pr-32">
                <SkeletonBlock className="h-10 w-64 max-w-full sm:h-12 sm:w-80" />

                <div className="mt-7">
                  <div className="text-[13px] font-medium text-zinc-500">
                    Rule equity
                  </div>

                  <SkeletonBlock className="mt-3 h-14 w-64 max-w-full sm:h-16 sm:w-80" />

                  <SkeletonBlock className="mt-3 h-4 w-36" />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <SkeletonBlock className="h-8 w-20 rounded-full" />
                    <SkeletonBlock className="h-8 w-24 rounded-full" />
                    <SkeletonBlock className="h-8 w-28 rounded-full" />
                  </div>
                </div>
              </div>

              <GoalSkeleton />
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <MetricSkeleton label="Rule equity" />
          <MetricSkeleton label="Open risk" />
          <MetricSkeleton label="Max bet" />
          <MetricSkeleton label="Account size" />
        </section>

        <section className="mt-4 grid gap-3 lg:grid-cols-2">
          <RuleSkeleton label="Daily loss room" />
          <RuleSkeleton label="Total loss room" />
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight text-zinc-100">
                Open positions
              </h2>

              <p className="mt-1 text-[14px] text-zinc-500">
                Bets that are still waiting to settle.
              </p>
            </div>

            <div className="hidden text-[13px] text-zinc-500 sm:block">
              <SkeletonBlock className="inline-block h-4 w-28 align-middle" />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <BetCardSkeleton />
            <BetCardSkeleton />
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-[24px] font-semibold tracking-tight text-zinc-100">
              Past positions
            </h2>

            <p className="mt-1 text-[14px] text-zinc-500">
              Settled wins, losses, and voids.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <BetCardSkeleton />
            <BetCardSkeleton />
          </div>
        </section>

        <section className="mt-10 rounded-[24px] bg-zinc-950/70 p-4 ring-1 ring-zinc-900">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Account ID
          </div>

          <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
        </section>
      </div>
    </div>
  );
}