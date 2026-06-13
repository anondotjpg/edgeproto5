import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  DepositInvoice,
  findPaymentForInvoice,
  hasEnoughConfirmations,
} from "@/lib/deposit-watchers";

function isAuthorized(req: Request) {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function handleCheckCryptoDeposits(req: Request) {
  console.log("[check-crypto-deposits] hit", {
    at: new Date().toISOString(),
    method: req.method,
    hasAuthHeader: Boolean(req.headers.get("authorization")),
    hasCronSecretEnv: Boolean(process.env.CRON_SECRET),
    hasSolanaRpcUrl: Boolean(process.env.SOLANA_RPC_URL),
  });

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const { data: invoices, error } = await supabaseAdmin
    .from("crypto_deposit_invoices")
    .select(
      `
      id,
      chain,
      asset,
      deposit_address,
      expected_from_address,
      expected_amount_atomic,
      created_at,
      expires_at
    `
    )
    .eq("status", "pending")
    .eq("chain", "solana")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    console.log("[check-crypto-deposits] invoice query error", error.message);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: {
    invoiceId: string;
    status: string;
    accountId?: string | null;
    confirmations?: number;
    error?: string;
  }[] = [];

  for (const invoice of invoices as DepositInvoice[]) {
    try {
      if (new Date(invoice.expires_at) < now) {
        await supabaseAdmin
          .from("crypto_deposit_invoices")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoice.id)
          .eq("status", "pending");

        results.push({
          invoiceId: invoice.id,
          status: "expired",
        });

        continue;
      }

      const payment = await findPaymentForInvoice(invoice);

      if (!payment) {
        results.push({
          invoiceId: invoice.id,
          status: "no_payment_found",
        });

        continue;
      }

      await supabaseAdmin
        .from("crypto_deposit_invoices")
        .update({
          tx_hash: payment.txHash,
          confirmations: payment.confirmations,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id)
        .eq("status", "pending");

      if (
        !hasEnoughConfirmations({
          chain: invoice.chain,
          confirmations: payment.confirmations,
        })
      ) {
        results.push({
          invoiceId: invoice.id,
          status: "waiting_confirmations",
          confirmations: payment.confirmations,
        });

        continue;
      }

      const { data: accountId, error: rpcError } = await supabaseAdmin.rpc(
        "mark_crypto_invoice_paid",
        {
          p_invoice_id: invoice.id,
          p_tx_hash: payment.txHash,
          p_from_address: payment.fromAddress,
          p_to_address: payment.toAddress,
          p_amount_atomic: payment.amountAtomic.toString(),
          p_confirmations: payment.confirmations,
        }
      );

      if (rpcError) {
        results.push({
          invoiceId: invoice.id,
          status: "credit_failed",
          error: rpcError.message,
        });

        continue;
      }

      results.push({
        invoiceId: invoice.id,
        status: "paid",
        accountId,
      });
    } catch (error) {
      results.push({
        invoiceId: invoice.id,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  console.log("[check-crypto-deposits] done", {
    checked: invoices?.length ?? 0,
    results,
  });

  return NextResponse.json({
    ok: true,
    checked: invoices?.length ?? 0,
    results,
  });
}

export async function GET(req: Request) {
  return handleCheckCryptoDeposits(req);
}

export async function POST(req: Request) {
  return handleCheckCryptoDeposits(req);
}