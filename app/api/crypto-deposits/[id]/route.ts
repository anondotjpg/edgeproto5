import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(req.url);
    const privyUserId = url.searchParams.get("privyUserId");

    if (!id) {
      return NextResponse.json(
        { error: "Missing invoice ID." },
        { status: 400 },
      );
    }

    if (!privyUserId) {
      return NextResponse.json(
        { error: "Missing Privy user ID." },
        { status: 400 },
      );
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("privy_user_id", privyUserId)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    if (!user?.id) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("crypto_deposit_invoices")
      .select(
        `
        id,
        chain,
        asset,
        deposit_address,
        expected_from_address,
        expected_amount_display,
        status,
        expires_at,
        tx_hash,
        confirmations,
        credited_account_id,
        updated_at
      `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (invoiceError) {
      throw invoiceError;
    }

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        invoice,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("Get crypto deposit invoice error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load deposit invoice.",
      },
      { status: 500 },
    );
  }
}