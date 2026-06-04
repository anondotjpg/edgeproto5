import ChallengeCta from "../components/ChallengeCta";
import OwnedAccountsSection from "../components/OwnedAccountsSection";
import type { PlanKey } from "@/lib/plans";

type AccountPlan = {
  planKey: PlanKey;
  sizeLabel: string;
  badge: string | null;
  feeLabel: string;
  cta: string;
};

type PlanDetail = {
  label: string;
  value: string;
  accent?: boolean;
};

type ButtonStyle = "gold" | "silver" | "default";

const ACCOUNT_PLANS: AccountPlan[] = [
  {
    planKey: "10000",
    sizeLabel: "$10,000",
    badge: "33x Your Capital",
    feeLabel: "$299",
    cta: "Start 10k Challenge",
  },
  {
    planKey: "5000",
    sizeLabel: "$5,000",
    badge: "Heating Up",
    feeLabel: "$179",
    cta: "Start 5k Challenge",
  },
  {
    planKey: "2000",
    sizeLabel: "$2,000",
    badge: "Best for Beginners",
    feeLabel: "$89",
    cta: "Start 2k Challenge",
  },
  {
    planKey: "1000",
    sizeLabel: "$1,000",
    badge: null,
    feeLabel: "$49",
    cta: "Start 1k Challenge",
  },
];

const PLAN_DETAILS: PlanDetail[] = [
  { label: "Profit Target", value: "25%", accent: true },
  { label: "Daily Loss", value: "2%" },
  { label: "Max Loss", value: "5%" },
  { label: "Max Risk/Trade", value: "5%" },
];

function DetailRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <div className="flex items-center gap-2.5 text-[12px] text-zinc-400">
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-zinc-700 text-[10px] font-semibold text-zinc-500">
          ?
        </span>
        <span>{label}</span>
      </div>

      <div
        className={[
          "text-[12px] font-semibold",
          accent ? "text-zinc-100" : "text-zinc-300",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function getButtonStyle(sizeLabel: string): ButtonStyle {
  if (sizeLabel === "$10,000") return "gold";
  if (sizeLabel === "$5,000") return "silver";
  return "default";
}

function getCardBorderClassName(style: ButtonStyle) {
  if (style === "gold") return "border-[#6b5520]";
  if (style === "silver") return "border-zinc-500";
  return "border-zinc-800";
}

function getCardGlowClassName(style: ButtonStyle) {
  if (style === "gold") {
    return "absolute inset-[-1px] rounded-[24px] shadow-[0_0_30px_rgba(224,184,75,0.22),0_0_60px_rgba(224,184,75,0.1)]";
  }

  if (style === "silver") {
    return "absolute inset-[-1px] rounded-[24px] shadow-[0_0_28px_rgba(255,255,255,0.16),0_0_56px_rgba(161,161,170,0.12)]";
  }

  return "";
}

function getBadgeClassName(style: ButtonStyle) {
  if (style === "gold") {
    return "border-[#6b5520] bg-linear-to-br from-[#e0b84b] via-[#cfa13a] to-[#b68b2d] text-[#120d02]";
  }

  if (style === "silver") {
    return "border-zinc-400 bg-linear-to-br from-zinc-100 via-zinc-300 to-zinc-400 text-zinc-900";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-200";
}

function AccountCard({
  planKey,
  sizeLabel,
  badge,
  feeLabel,
  cta,
}: AccountPlan) {
  const buttonStyle = getButtonStyle(sizeLabel);
  const shimmerEnabled = buttonStyle === "gold" || buttonStyle === "silver";
  const cardGlowEnabled = buttonStyle === "gold" || buttonStyle === "silver";

  return (
    <div className="relative">
      {cardGlowEnabled ? (
        <div
          aria-hidden="true"
          className={getCardGlowClassName(buttonStyle)}
        />
      ) : null}

      <div
        className={[
          "relative flex h-auto flex-col rounded-[24px] border bg-zinc-950 px-5 py-4",
          getCardBorderClassName(buttonStyle),
        ].join(" ")}
      >
        {badge ? (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
            <div
              className={[
                "whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold",
                getBadgeClassName(buttonStyle),
              ].join(" ")}
            >
              {badge}
            </div>
          </div>
        ) : null}

        <div className="pt-1 text-center">
          <h2 className="text-[30px] font-semibold leading-none tracking-tight text-zinc-100">
            {sizeLabel}
          </h2>
          <p className="mt-1.5 text-[15px] font-medium text-zinc-500">
            Funded Account
          </p>
        </div>

        <div className="mt-4 border-t border-zinc-800 pt-4" />

        <div className="space-y-3.5">
          {PLAN_DETAILS.map((detail) => (
            <DetailRow
              key={detail.label}
              label={detail.label}
              value={detail.value}
              accent={detail.accent}
            />
          ))}
        </div>

        <div className="mt-5 border-t border-zinc-800 pt-4" />

        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[16px] text-zinc-300">One Time Fee</div>
            <div className="text-right text-[22px] font-semibold text-zinc-100 sm:text-[26px]">
              {feeLabel}
            </div>
          </div>

          <ChallengeCta
            cta={cta}
            buttonStyle={buttonStyle}
            shimmerEnabled={shimmerEnabled}
            planKey={planKey}
          />

          <p className="mt-3 text-center text-[7px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Pay with crypto. Instant activation after payment received on-chain.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <>
      <style>{`
        @keyframes buttonShimmer {
          0% {
            transform: translateX(0) skewX(-20deg);
            opacity: 0;
          }
          8% {
            opacity: 0.42;
          }
          24% {
            opacity: 0.42;
          }
          38% {
            transform: translateX(520%) skewX(-20deg);
            opacity: 0;
          }
          100% {
            transform: translateX(520%) skewX(-20deg);
            opacity: 0;
          }
        }
      `}</style>

      <div className="relative min-h-screen bg-transparent text-white">
        <div className="relative z-10 flex min-h-screen items-center pt-10 lg:pt-0">
          <div className="mx-auto w-full max-w-[1480px] px-5 py-8 pb-24 sm:px-6 md:pb-8">
            <OwnedAccountsSection />

            <div className="mb-7 hidden text-center sm:mb-10 md:block">
              <h1 className="text-[30px] font-semibold tracking-tight text-zinc-100 sm:text-[38px] italic">
                Find Your Edge
              </h1>
              <p className="text-[15px] text-zinc-500 sm:text-[16px]">
                Beat the odds.
              </p>
            </div>

            <div className="grid gap-7 sm:gap-5 md:grid-cols-2 md:justify-center xl:grid-cols-4">
              {ACCOUNT_PLANS.map((plan) => (
                <div key={plan.planKey} className="w-full md:mx-auto md:max-w-[340px]">
                  <AccountCard {...plan} />
                </div>
              ))}
            </div>

            <div className="mx-auto mt-8 max-w-[640px] text-center">
              <p className="text-[10px] leading-5 text-zinc-500 sm:text-[11px]">
                Edge is a performance evaluation platform for sports analysts.
                Participation involves a paid evaluation fee. Funded accounts are
                simulated environments. Past performance does not guarantee future
                results. Not financial or investment advice. Must be 18+.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}