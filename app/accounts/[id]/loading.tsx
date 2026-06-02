function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-900 ${className}`} />;
}

function TopSummarySkeleton() {
  return (
    <div className="flex h-[142px] min-w-0 flex-col justify-between overflow-hidden lg:h-[146px]">
      <div className="min-w-0">
        <div className="flex h-[36px] max-w-full items-start overflow-hidden sm:h-[42px] lg:h-[44px]">
          <SkeletonBlock className="h-8 w-52 max-w-full sm:h-9 sm:w-64" />
        </div>

        <div className="mt-3 text-[12px] font-medium leading-none text-zinc-500">
          Rule equity
        </div>

        <div className="mt-2 flex min-w-0 items-end gap-3">
          <SkeletonBlock className="h-10 w-56 max-w-full sm:h-11 sm:w-64" />
          <SkeletonBlock className="mb-2 h-3 w-24 shrink-0" />
        </div>

        <SkeletonBlock className="mt-2 h-4 w-36" />
      </div>
    </div>
  );
}

function GoalBarsSkeleton() {
  const barCount = 28;

  return (
    <div className="flex h-10 w-full items-center sm:h-11">
      <div
        className="grid h-7 w-full items-stretch gap-1.5 sm:h-[31px]"
        style={{ gridTemplateColumns: `repeat(${barCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: barCount }).map((_, index) => (
          <SkeletonBlock key={index} className="min-w-0 rounded-full" />
        ))}
      </div>
    </div>
  );
}

function GoalSkeleton() {
  return (
    <div className="flex h-[158px] flex-col justify-between rounded-[26px] bg-black/30 p-5 ring-1 ring-zinc-900 lg:h-[162px]">
      <div className="flex items-start justify-between gap-4">
        <div className="text-[17px] font-medium leading-none text-zinc-500">
          Goal
        </div>
      </div>

      <GoalBarsSkeleton />

      <div className="min-w-0">
        <SkeletonBlock className="h-7 w-36 sm:h-8 sm:w-40 lg:w-44" />
        <SkeletonBlock className="mt-2 h-4 w-32" />
      </div>
    </div>
  );
}

function LossRuleBarsSkeleton() {
  const barCount = 28;

  return (
    <div className="flex h-10 w-full items-center sm:h-11">
      <div
        className="grid h-7 w-full items-stretch gap-1.5 sm:h-[31px]"
        style={{ gridTemplateColumns: `repeat(${barCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: barCount }).map((_, index) => (
          <SkeletonBlock key={index} className="min-w-0 rounded-full" />
        ))}
      </div>
    </div>
  );
}

function RuleSkeleton({ label }: { label: string }) {
  return (
    <div className="h-[178px] rounded-[26px] bg-zinc-950/80 p-5 ring-1 ring-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[17px] font-medium leading-none text-zinc-500">
            {label}
          </div>
          <SkeletonBlock className="mt-3 h-8 w-36" />
          <SkeletonBlock className="mt-2 h-4 w-32" />
        </div>

        <SkeletonBlock className="h-5 w-16 rounded-full" />
      </div>

      <div className="mt-3">
        <LossRuleBarsSkeleton />
      </div>
    </div>
  );
}

function TableSectionHeaderSkeleton({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-900 bg-zinc-950 px-3 py-3.5 sm:px-5 sm:py-4 lg:min-w-[640px]">
      <h2 className="text-base font-semibold tracking-tight text-zinc-100 sm:text-xl">
        {title} <span className="text-zinc-500">(0)</span>
      </h2>

      {title === "Open" ? (
        <div className="shrink-0 text-right text-[11px] font-medium tracking-[0.02em] text-zinc-500 sm:text-[12px]">
          Open risk <SkeletonBlock className="ml-1 inline-block h-3 w-14 align-middle" />
        </div>
      ) : null}
    </div>
  );
}

function TableHeader({ labels }: { labels: string[] }) {
  return (
    <div className="hidden min-w-[640px] grid-cols-[minmax(220px,1fr)_86px_86px_104px_116px] border-b border-zinc-900 bg-black/20 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600 lg:grid lg:px-5">
      {labels.map((label, index) => (
        <div key={label} className={index >= 2 ? "text-right" : "text-left"}>
          {label}
        </div>
      ))}
    </div>
  );
}

function PositionSkeletonRow() {
  return (
    <div className="border-b border-zinc-900/80 px-3 py-2.5 text-sm last:border-b-0 sm:px-5 sm:py-3">
      <div className="lg:hidden">
        <div className="flex min-w-0 items-start gap-2.5">
          <SkeletonBlock className="h-8 w-8 shrink-0 rounded-lg sm:h-9 sm:w-9" />

          <div className="min-w-0 flex-1 pr-2">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-1.5 h-3 w-24" />
          </div>

          <SkeletonBlock className="mt-px h-4 w-12 shrink-0" />
        </div>

        <div className="mt-2 flex justify-end pl-[42px] text-[11px] leading-none">
          <div className="grid w-full max-w-[190px] grid-cols-3 gap-1.5 text-right">
            <div>
              <SkeletonBlock className="ml-auto h-3 w-10" />
              <SkeletonBlock className="ml-auto mt-2 h-4 w-12" />
            </div>
            <div>
              <SkeletonBlock className="ml-auto h-3 w-10" />
              <SkeletonBlock className="ml-auto mt-2 h-4 w-14" />
            </div>
            <div>
              <SkeletonBlock className="ml-auto h-3 w-10" />
              <SkeletonBlock className="ml-auto mt-2 h-4 w-16" />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden min-w-[640px] grid-cols-[minmax(220px,1fr)_86px_86px_104px_116px] items-center lg:grid">
        <div className="flex min-w-0 items-center gap-3">
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
          <div className="min-w-0">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-2 h-3 w-12" />
          </div>
        </div>

        <SkeletonBlock className="h-5 w-16 rounded-full" />
        <SkeletonBlock className="ml-auto h-4 w-12" />
        <SkeletonBlock className="ml-auto h-4 w-14" />
        <SkeletonBlock className="ml-auto h-4 w-16" />
      </div>
    </div>
  );
}

function PositionsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/80 shadow-sm lg:overflow-x-auto">
      <TableSectionHeaderSkeleton title="Open" />
      <TableHeader labels={["Team", "Status", "Odds", "Stake", "Payout"]} />
      <PositionSkeletonRow />
      <PositionSkeletonRow />

      <TableSectionHeaderSkeleton title="Past" />
      <TableHeader labels={["Team", "Status", "Odds", "Stake", "P/L"]} />
      <PositionSkeletonRow />
      <PositionSkeletonRow />
    </div>
  );
}

export default function LoadingAccountPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 pt-15 pb-32 sm:px-6 md:py-15 md:pb-24">
        <section className="rounded-[32px] bg-zinc-950/90 p-4 sm:p-5">
          <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)]">
            <TopSummarySkeleton />
            <GoalSkeleton />
          </div>
        </section>

        <section className="mt-3 grid h-[368px] gap-3 sm:mt-3 lg:h-[178px] lg:grid-cols-2">
          <RuleSkeleton label="Daily loss" />
          <RuleSkeleton label="Total loss" />
        </section>

        <section className="mt-10">
          <PositionsTableSkeleton />
        </section>

        <section className="mt-10 mb-28 min-h-[72px] rounded-[24px] bg-zinc-950/70 p-4 ring-1 ring-zinc-900 md:mb-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Account ID
          </div>

          <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
        </section>
      </div>
    </div>
  );
}