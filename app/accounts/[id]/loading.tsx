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

function TableSectionHeaderSkeleton({
  title,
  showOpenRisk,
}: {
  title: string;
  showOpenRisk?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-900 bg-zinc-950 px-3 py-3.5 sm:px-5 sm:py-4 lg:min-w-[640px]">
      <h2 className="text-base font-semibold tracking-tight text-zinc-100 sm:text-xl">
        {title} <span className="text-zinc-500">(0)</span>
      </h2>

      {showOpenRisk ? <SkeletonBlock className="h-4 w-28" /> : null}
    </div>
  );
}

function TableHeaderSkeleton({ labels }: { labels: string[] }) {
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

function PositionRowSkeleton() {
  return (
    <div className="border-b border-zinc-900/80 px-3 py-2.5 last:border-b-0 sm:px-5 sm:py-3">
      <div className="lg:hidden">
        <div className="flex min-w-0 items-start gap-2.5">
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
          <div className="min-w-0 flex-1 pr-2">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-1.5 h-3 w-24" />
          </div>
          <SkeletonBlock className="mt-px h-4 w-12" />
        </div>

        <div className="mt-2 flex justify-end pl-[42px]">
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
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
          <div>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-2 h-3 w-12" />
          </div>
        </div>
        <SkeletonBlock className="h-4 w-12" />
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
      <TableSectionHeaderSkeleton title="Open" showOpenRisk />
      <TableHeaderSkeleton labels={["Team", "Status", "Odds", "Stake", "Payout"]} />
      <PositionRowSkeleton />
      <PositionRowSkeleton />

      <TableSectionHeaderSkeleton title="Past" />
      <TableHeaderSkeleton labels={["Team", "Status", "Odds", "Stake", "P/L"]} />
      <PositionRowSkeleton />
      <PositionRowSkeleton />
    </div>
  );
}

function TopSummarySkeleton() {
  return (
    <div className="flex h-[142px] min-w-0 flex-col justify-between overflow-hidden lg:h-[146px]">
      <div className="min-w-0">
        <SkeletonBlock className="h-8 w-52 max-w-full sm:h-9 sm:w-64" />

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

function GoalSkeleton() {
  return (
    <div className="flex h-[142px] flex-col justify-between rounded-[26px] bg-black/30 p-5 ring-1 ring-zinc-900 lg:h-[146px]">
      <div className="flex items-start justify-between gap-4">
        <div className="text-[13px] font-medium leading-none text-zinc-500">
          Goal
        </div>

        <SkeletonBlock className="h-7 w-16 shrink-0 rounded-full" />
      </div>

      <div className="min-w-0">
        <SkeletonBlock className="h-9 w-40 sm:h-10 sm:w-44" />
        <SkeletonBlock className="mt-2 h-4 w-32" />
      </div>
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

        <section className="mt-3 grid h-[488px] gap-3 sm:mt-3 lg:h-[238px] lg:grid-cols-2">
          <RuleSkeleton label="Daily loss room" />
          <RuleSkeleton label="Total loss room" />
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