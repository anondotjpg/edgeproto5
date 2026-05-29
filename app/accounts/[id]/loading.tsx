function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-900 ${className}`} />;
}

function MetricSkeleton({ label }: { label: string }) {
  return (
    <div className="h-[94px] rounded-[18px] bg-zinc-950/80 p-3 ring-1 ring-zinc-900 sm:h-[106px] sm:rounded-[22px] sm:p-4">
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
    <div className="h-[238px] rounded-[26px] bg-zinc-950/80 p-5 ring-1 ring-zinc-900">
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
      </div>

      <SkeletonBlock className="mt-4 h-3 w-full" />
      <SkeletonBlock className="mt-2 h-3 w-4/5" />
    </div>
  );
}

function BetCardSkeleton() {
  return (
    <div className="min-h-[154px] rounded-[22px] bg-zinc-950/80 p-4 ring-1 ring-zinc-900">
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
    <div className="h-[224px] rounded-[26px] bg-black/30 p-5 ring-1 ring-zinc-900">
      <div className="grid h-full grid-rows-[28px_64px_64px] gap-y-[14px]">
        <div className="flex items-start justify-between gap-4">
          <div className="text-[13px] font-medium leading-none text-zinc-500">
            Goal
          </div>

          <SkeletonBlock className="h-7 w-16 shrink-0 rounded-full" />
        </div>

        <div className="min-w-0 self-center">
          <SkeletonBlock className="h-9 w-40 sm:h-10 sm:w-44" />
          <SkeletonBlock className="mt-2 h-3 w-32" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex min-w-0 flex-col justify-center rounded-2xl bg-zinc-950/70 px-3 ring-1 ring-zinc-900">
            <div className="text-[11px] leading-none text-zinc-600">
              Remaining
            </div>
            <SkeletonBlock className="mt-2 h-4 w-20" />
          </div>

          <div className="flex min-w-0 flex-col justify-center rounded-2xl bg-zinc-950/70 px-3 ring-1 ring-zinc-900">
            <div className="text-[11px] leading-none text-zinc-600">
              Target
            </div>
            <SkeletonBlock className="mt-2 h-4 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoadingAccountPage() {
  return (
    <div className="min-h-screen bg-[#09090b] px-4 pb-24 pt-6 text-white sm:px-6 md:pb-12 md:pt-10">
      <div className="mx-auto mt-4 w-full max-w-6xl sm:mt-5">
        <section className="h-[496px] rounded-[32px] bg-zinc-950/90 p-5 sm:h-[556px] sm:p-7 lg:h-[316px]">
          <div className="grid h-full grid-rows-[224px_224px] gap-2 sm:grid-rows-[260px_224px] sm:gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:grid-rows-1 lg:items-center lg:gap-7">
            <div className="min-h-0 min-w-0 self-center overflow-visible">
              <div className="h-[46px] sm:h-[62px]">
                <SkeletonBlock className="h-[40px] w-64 max-w-full sm:h-[58px] sm:w-80" />
              </div>

              <div className="mt-4 sm:mt-5">
                <div className="text-[13px] font-medium text-zinc-500">
                  Rule equity
                </div>

                <div className="mt-1 h-[72px] sm:h-[92px]">
                  <SkeletonBlock className="h-[66px] w-64 max-w-full sm:h-[86px] sm:w-80" />
                </div>

                <SkeletonBlock className="mt-2 h-4 w-36" />

                <div className="mt-3 flex h-8 flex-wrap gap-2 sm:mt-4">
                  <SkeletonBlock className="h-8 w-20 rounded-full" />
                  <SkeletonBlock className="h-8 w-24 rounded-full" />
                  <SkeletonBlock className="h-8 w-28 rounded-full" />
                </div>
              </div>
            </div>

            <GoalSkeleton />
          </div>
        </section>

        <section className="mt-2 grid h-[196px] grid-cols-2 gap-2 sm:mt-3 sm:h-[224px] sm:gap-3 lg:h-[106px] lg:grid-cols-4">
          <MetricSkeleton label="Rule equity" />
          <MetricSkeleton label="Open risk" />
          <MetricSkeleton label="Max bet" />
          <MetricSkeleton label="Account size" />
        </section>

        <section className="mt-2 grid h-[488px] gap-3 sm:mt-3 lg:h-[238px] lg:grid-cols-2">
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

        <section className="mt-10 min-h-[72px] rounded-[24px] bg-zinc-950/70 p-4 ring-1 ring-zinc-900">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Account ID
          </div>

          <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
        </section>
      </div>
    </div>
  );
}