"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import type { PlanKey } from "@/lib/plans";

type ButtonStyle = "gold" | "silver" | "default";
type DepositStep = "method" | "sender" | "payment";

type DepositInvoice = {
  id: string;
  chain: "solana";
  asset: "SOL";
  deposit_address: string;
  expected_from_address: string;
  expected_amount_display: string;
  status: "pending" | "paid" | "expired" | "invalid";
  expires_at: string;
  tx_hash?: string | null;
  confirmations?: number | null;
  credited_account_id?: string | null;
};

type ChallengeCtaProps = {
  cta: string;
  buttonStyle: ButtonStyle;
  shimmerEnabled: boolean;
  planKey: PlanKey;
};

function getButtonShellClassName(style: ButtonStyle) {
  if (style === "gold") return "bg-[#7b5a12]";
  if (style === "silver") return "bg-zinc-500";
  return "bg-zinc-800";
}

function getButtonFaceClassName(style: ButtonStyle) {
  if (style === "gold") {
    return "border border-[#6b5520] bg-linear-to-br from-[#e0b84b] via-[#cfa13a] to-[#b68b2d] text-[#120d02]";
  }

  if (style === "silver") {
    return "border border-zinc-400 bg-linear-to-br from-zinc-100 via-zinc-300 to-zinc-400 text-zinc-900";
  }

  return "border border-zinc-800 bg-zinc-900 text-zinc-100";
}

function getShimmerClassName(style: ButtonStyle) {
  if (style === "gold") {
    return "pointer-events-none absolute inset-y-[-35%] left-[-22%] w-[18%] skew-x-[-20deg] bg-[#fff6d5]/35 blur-md animate-[buttonShimmer_3.4s_ease-out_infinite]";
  }

  return "pointer-events-none absolute inset-y-[-35%] left-[-22%] w-[18%] skew-x-[-20deg] bg-white/35 blur-md animate-[buttonShimmer_3.4s_ease-out_infinite]";
}

function formatCountdown(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function shortenAddress(address: string) {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function getStepIndex(step: DepositStep) {
  if (step === "method") return 0;
  if (step === "sender") return 1;
  return 2;
}

function StepDots({ step }: { step: DepositStep }) {
  const activeIndex = getStepIndex(step);

  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={[
            "h-1.5 rounded-full transition-all",
            index === activeIndex ? "w-5 bg-zinc-100" : "w-1.5 bg-zinc-700",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: DepositInvoice["status"] }) {
  const paid = status === "paid";
  const expired = status === "expired";

  return (
    <div
      className={[
        "rounded-full px-3 py-1 text-[12px] font-semibold capitalize",
        paid
          ? "bg-emerald-950/50 text-emerald-300"
          : expired
            ? "bg-red-950/50 text-red-300"
            : "bg-zinc-900 text-zinc-300",
      ].join(" ")}
    >
      {status}
    </div>
  );
}

function InfoCard({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-zinc-500">{label}</p>
        {action}
      </div>

      <p className="mt-2 break-all text-[13px] leading-5 text-zinc-200">
        {value}
      </p>
    </div>
  );
}

function OffsetButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={["rounded-2xl bg-zinc-800", className].join(" ")}
      style={{ paddingBottom: "2px" }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="h-12 w-full translate-y-[-2px] cursor-pointer rounded-2xl border border-zinc-800 bg-zinc-900 text-[15px] font-semibold text-zinc-100 transition-[transform,opacity] duration-100 hover:translate-y-[-1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {children}
      </button>
    </div>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-12 cursor-pointer rounded-2xl border border-zinc-800 bg-zinc-950 text-[14px] font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Route returned non-JSON response. Status: ${response.status}. ${text.slice(
        0,
        140,
      )}`,
    );
  }
}

export default function ChallengeCta({
  cta,
  buttonStyle,
  shimmerEnabled,
  planKey,
}: ChallengeCtaProps) {
  const router = useRouter();
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DepositStep>("method");
  const [fromAddress, setFromAddress] = useState("");
  const [invoice, setInvoice] = useState<DepositInvoice | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const privyUserId = user?.id ?? null;
  const email = user?.email?.address ?? null;
  const walletAddress =
    user?.wallet?.address ??
    user?.linkedAccounts?.find((account) => account.type === "wallet")
      ?.address ??
    null;

  const expiresAtMs = invoice?.expires_at
    ? new Date(invoice.expires_at).getTime()
    : null;

  const countdown = formatCountdown(expiresAtMs ? expiresAtMs - nowMs : 0);

  const ctaClassName = [
    "relative inline-flex h-11 w-full cursor-pointer items-center justify-center overflow-hidden rounded-[16px] px-4 text-[15px] font-semibold transition-transform duration-100 hover:translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70",
    getButtonFaceClassName(buttonStyle),
  ].join(" ");

  const ctaStyle = {
    transform: "translateY(-2px)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
  } as const;

  function resetFlow() {
    setStep("method");
    setFromAddress("");
    setInvoice(null);
    setError(null);
    setCopied(null);
    setIsCreatingInvoice(false);
  }

  function openCheckout() {
    if (!ready) return;

    if (!authenticated) {
      login();
      return;
    }

    resetFlow();
    setOpen(true);
  }

  function closeCheckout() {
    setOpen(false);
  }

  async function createInvoice() {
    if (!privyUserId || isCreatingInvoice) return;

    const cleanFromAddress = fromAddress.trim();

    if (!cleanFromAddress) {
      setError("Paste the wallet address you will send from.");
      return;
    }

    try {
      setIsCreatingInvoice(true);
      setError(null);

      const response = await fetch("/api/crypto-deposits/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planKey,
          chain: "solana",
          fromAddress: cleanFromAddress,
          privyUserId,
          email,
          walletAddress,
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to create deposit invoice.");
      }

      if (!data?.invoice) {
        throw new Error("Deposit invoice was not returned.");
      }

      setInvoice(data.invoice);
      setStep("payment");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to create deposit.",
      );
    } finally {
      setIsCreatingInvoice(false);
    }
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);

      window.setTimeout(() => {
        setCopied(null);
      }, 1200);
    } catch {
      setError("Unable to copy. Please copy it manually.");
    }
  }

  useEffect(() => {
    if (!open) return;

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (!open || !invoice?.id || !privyUserId) return;
    if (invoice.status === "paid" || invoice.status === "expired") return;

    const pollInvoice = async () => {
      try {
        const response = await fetch(
          `/api/crypto-deposits/${invoice.id}?privyUserId=${encodeURIComponent(
            privyUserId,
          )}`,
        );

        const data = await readJsonResponse(response);

        if (!response.ok || !data?.invoice) return;

        setInvoice(data.invoice);

        if (
          data.invoice.status === "paid" &&
          data.invoice.credited_account_id
        ) {
          router.refresh();
        }
      } catch {
        // Keep polling silently.
      }
    };

    pollInvoice();

    const interval = window.setInterval(pollInvoice, 5000);

    return () => window.clearInterval(interval);
  }, [open, invoice?.id, invoice?.status, privyUserId, router]);

  return (
    <>
      <div
        className={[
          "mt-4 inline-block w-full rounded-[16px]",
          getButtonShellClassName(buttonStyle),
        ].join(" ")}
        style={{ paddingBottom: "2px", lineHeight: 0 }}
      >
        <button
          type="button"
          onClick={openCheckout}
          disabled={!ready}
          className={ctaClassName}
          style={ctaStyle}
        >
          {shimmerEnabled ? (
            <span
              aria-hidden="true"
              className={getShimmerClassName(buttonStyle)}
            />
          ) : null}

          <span className="relative z-10">{cta}</span>
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden bg-black/75 px-4 pb-4 sm:items-center sm:pb-0">
          <button
            type="button"
            aria-label="Close checkout"
            className="absolute inset-0 cursor-pointer"
            onClick={closeCheckout}
          />

          <div className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                Edge checkout
              </p>

              <h2 className="mt-1 text-[24px] font-semibold leading-tight tracking-tight text-zinc-50">
                Start challenge
              </h2>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <StepDots step={step} />

              <div className="text-[12px] font-medium text-zinc-500">
                Step {getStepIndex(step) + 1} of 3
              </div>
            </div>

            <div className="mt-5 min-h-[390px]">
              <AnimatePresence mode="wait">
                {step === "method" ? (
                  <motion.div
                    key="method"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="flex min-h-[390px] flex-col"
                  >
                    <div>
                      <h3 className="text-[18px] font-semibold tracking-tight text-zinc-50">
                        Choose payment method
                      </h3>

                      <p className="mt-1 text-[13px] leading-5 text-zinc-500">
                        Pay with SOL. Your deposit amount will be locked for 3
                        hours after the next step.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep("sender")}
                      className="mt-5 flex w-full cursor-pointer items-center justify-between rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3.5 text-left transition-colors hover:bg-zinc-900"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src="/sol.png"
                          alt="SOL"
                          className="h-9 w-9 shrink-0 rounded-full object-contain"
                        />

                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold text-zinc-100">
                            Solana
                          </div>

                          <div className="mt-0.5 text-[12px] text-zinc-500">
                            Fast confirmation with SOL
                          </div>
                        </div>
                      </div>

                      <div className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[12px] font-bold text-zinc-300">
                        SOL
                      </div>
                    </button>

                    <div className="mt-auto pt-5">
                      <OffsetButton onClick={() => setStep("sender")}>
                        Continue
                      </OffsetButton>
                    </div>
                  </motion.div>
                ) : null}

                {step === "sender" ? (
                  <motion.div
                    key="sender"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="flex min-h-[390px] flex-col"
                  >
                    <div>
                      <h3 className="text-[18px] font-semibold tracking-tight text-zinc-50">
                        Sending wallet
                      </h3>

                      <p className="mt-1 text-[13px] leading-5 text-zinc-500">
                        Paste the Solana wallet address you will send from. The
                        payment must come from this address.
                      </p>
                    </div>

                    <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/30 p-4">
                      <label className="text-[12px] font-medium text-zinc-500">
                        Sending from
                      </label>

                      <input
                        value={fromAddress}
                        onChange={(event) => setFromAddress(event.target.value)}
                        placeholder="Paste SOL wallet address"
                        className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-[14px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                      />

                      <p className="mt-3 text-[12px] leading-5 text-zinc-600">
                        Do not send from Coinbase, Binance, or another exchange
                        if sender-address matching is required.
                      </p>
                    </div>

                    {error ? (
                      <div className="mt-3 rounded-2xl border border-red-950 bg-red-950/30 px-4 py-3 text-[13px] leading-5 text-red-300">
                        {error}
                      </div>
                    ) : null}

                    <div className="mt-auto grid grid-cols-[96px_minmax(0,1fr)] gap-2 pt-5">
                      <SecondaryButton
                        onClick={() => {
                          setError(null);
                          setStep("method");
                        }}
                      >
                        Back
                      </SecondaryButton>

                      <OffsetButton
                        onClick={createInvoice}
                        disabled={!fromAddress.trim() || isCreatingInvoice}
                      >
                        {isCreatingInvoice ? "Creating..." : "Create deposit"}
                      </OffsetButton>
                    </div>
                  </motion.div>
                ) : null}

                {step === "payment" && invoice ? (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="flex min-h-[390px] flex-col"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[18px] font-semibold tracking-tight text-zinc-50">
                          Send SOL deposit
                        </h3>

                        <p className="mt-1 text-[13px] leading-5 text-zinc-500">
                          Send the exact amount below before the timer expires.
                        </p>
                      </div>

                      <StatusPill status={invoice.status} />
                    </div>

                    <div className="mt-5 grid gap-3">
                      <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[12px] font-medium text-zinc-500">
                            Send exactly
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                "amount",
                                invoice.expected_amount_display,
                              )
                            }
                            className="cursor-pointer text-[12px] font-semibold text-zinc-300 hover:text-white"
                          >
                            {copied === "amount" ? "Copied" : "Copy"}
                          </button>
                        </div>

                        <div className="mt-2 flex items-end justify-between gap-3">
                          <p className="break-all text-[28px] font-semibold leading-none tracking-tight text-zinc-50">
                            {invoice.expected_amount_display}
                          </p>

                          <p className="pb-0.5 text-[13px] font-bold text-zinc-400">
                            SOL
                          </p>
                        </div>
                      </div>

                      <InfoCard
                        label="Deposit address"
                        value={invoice.deposit_address}
                        action={
                          <button
                            type="button"
                            onClick={() =>
                              copyText("deposit", invoice.deposit_address)
                            }
                            className="cursor-pointer text-[12px] font-semibold text-zinc-300 hover:text-white"
                          >
                            {copied === "deposit" ? "Copied" : "Copy"}
                          </button>
                        }
                      />

                      <InfoCard
                        label="Required sending address"
                        value={invoice.expected_from_address}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-zinc-900 bg-black/30 p-4">
                          <p className="text-[12px] font-medium text-zinc-500">
                            Time left
                          </p>

                          <p className="mt-1 text-[18px] font-semibold text-zinc-100">
                            {invoice.status === "paid"
                              ? "Complete"
                              : invoice.status === "expired"
                                ? "Expired"
                                : countdown}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-zinc-900 bg-black/30 p-4">
                          <p className="text-[12px] font-medium text-zinc-500">
                            Confirmations
                          </p>

                          <p className="mt-1 text-[18px] font-semibold text-zinc-100">
                            {invoice.confirmations ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {invoice.status === "paid" &&
                    invoice.credited_account_id ? (
                      <div className="mt-auto pt-5">
                        <OffsetButton
                          onClick={() =>
                            router.push(
                              `/accounts/${invoice.credited_account_id}`,
                            )
                          }
                        >
                          Open account
                        </OffsetButton>
                      </div>
                    ) : (
                      <div className="mt-auto pt-5">
                        <p className="text-center text-[12px] leading-5 text-zinc-600">
                          Waiting for SOL from{" "}
                          {shortenAddress(invoice.expected_from_address)}.
                        </p>
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}