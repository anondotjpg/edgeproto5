function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-900 ${className}`} />;
}

function TopSummarySkeleton() {
  return (
    <div className="flex min-h-[142px] min-w-0 flex-col justify-between overflow-visible lg:min-h-[166px]">
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

function BarsSkeleton({ barCount }: { barCount: number }) {
  return (
    <div className="flex h-8 w-full items-center sm:h-9">
      <div
        className="grid h-6 w-full items-stretch gap-1.5 sm:h-7"
        style={{ gridTemplateColumns: `repeat(${barCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: barCount }).map((_, index) => (
          <SkeletonBlock key={index} className="min-w-0 rounded-full" />
        ))}
      </div>
    </div>
  );
}

function ResponsiveBarsSkeleton() {
  return (
    <>
      <div className="md:hidden">
        <BarsSkeleton barCount={28} />
      </div>

      <div className="hidden md:block xl:hidden">
        <BarsSkeleton barCount={35} />
      </div>

      <div className="hidden xl:block">
        <BarsSkeleton barCount={42} />
      </div>
    </>
  );
}

function GoalBarsSkeleton() {
  return <ResponsiveBarsSkeleton />;
}

function GoalSkeleton() {
  return (
    <div className="flex min-h-[166px] flex-col rounded-[26px] bg-zinc-950/80 px-5 py-4 ring-1 ring-zinc-900 lg:ring-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[17px] font-medium leading-tight text-zinc-500">
            Goal
          </div>

          <SkeletonBlock className="mt-2 h-[34px] w-36 sm:w-40" />
          <SkeletonBlock className="mt-1 h-4 w-32" />
        </div>
      </div>

      <div className="mt-auto pt-2">
        <GoalBarsSkeleton />
      </div>
    </div>
  );
}

function LossRuleBarsSkeleton() {
  return <ResponsiveBarsSkeleton />;
}

function RuleSkeleton({ label }: { label: string }) {
  return (
    <div className="flex min-h-[166px] flex-col rounded-[26px] bg-zinc-950/80 px-5 py-4 ring-1 ring-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[17px] font-medium leading-tight text-zinc-500">
            {label}
          </div>

          <SkeletonBlock className="mt-2 h-[34px] w-36 sm:w-40" />
          <SkeletonBlock className="mt-1 h-4 w-32" />
        </div>
      </div>

      <div className="mt-auto pt-2">
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

function getSkeletonRowClassName(index: number) {
  const tint =
    index % 3 === 0
      ? "bg-zinc-950/80"
      : index % 3 === 1
        ? "bg-zinc-900/35"
        : "bg-zinc-900/20";

  return [
    "border-b border-zinc-900/80 px-3 py-4 text-sm last:border-b-0 sm:px-5 sm:py-3.5 lg:py-3",
    tint,
  ].join(" ");
}

function PositionSkeletonRow({ index }: { index: number }) {
  return (
    <div className={getSkeletonRowClassName(index)}>
      <div className="lg:hidden">
        <div className="flex min-w-0 items-start gap-3.5">
          <SkeletonBlock className="h-11 w-11 shrink-0 rounded-lg lg:h-9 lg:w-9" />

          <div className="min-w-0 flex-1 pr-2">
            <SkeletonBlock className="h-6 w-36" />
            <SkeletonBlock className="mt-1 h-5 w-32" />
          </div>

          <SkeletonBlock className="mt-0.5 h-6 w-16 shrink-0" />
        </div>

        <div className="mt-3 flex justify-end pl-[58px]">
          <div className="grid w-full max-w-[250px] grid-cols-3 gap-2.5 text-right">
            <div>
              <SkeletonBlock className="ml-auto h-3.5 w-14" />
              <SkeletonBlock className="ml-auto mt-2 h-6 w-16" />
            </div>
            <div>
              <SkeletonBlock className="ml-auto h-3.5 w-14" />
              <SkeletonBlock className="ml-auto mt-2 h-6 w-[70px]" />
            </div>
            <div>
              <SkeletonBlock className="ml-auto h-3.5 w-14" />
              <SkeletonBlock className="ml-auto mt-2 h-6 w-20" />
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
      {[0, 1].map((index) => (
        <PositionSkeletonRow key={`open-position-skeleton-${index}`} index={index} />
      ))}

      <TableSectionHeaderSkeleton title="Past" />
      <TableHeader labels={["Team", "Status", "Odds", "Stake", "P/L"]} />
      {[0, 1].map((index) => (
        <PositionSkeletonRow key={`past-position-skeleton-${index}`} index={index} />
      ))}
    </div>
  );
}

export default function LoadingAccountPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 pt-20 pb-32 sm:px-6 md:py-15 md:pb-24">
        <section>
          <div className="grid items-stretch gap-3 lg:grid-cols-2">
            <TopSummarySkeleton />
            <GoalSkeleton />
          </div>
        </section>

        <section className="mt-3 grid gap-3 lg:grid-cols-2">
          <RuleSkeleton label="Daily loss" />
          <RuleSkeleton label="Total loss" />
        </section>

        <section className="mt-10">
          <PositionsTableSkeleton />
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