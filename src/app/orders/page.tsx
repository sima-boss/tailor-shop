import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrdersView, { type OrderRow } from "@/components/OrdersView";
import type { OrderType, OrderStatus, PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders — Tailor Shop" };

export default async function OrdersPage() {
  const supabase = createClient();

  // --- attempt 1: fetch WITH completed_by ---
  const withCol = await supabase
    .from("orders")
    .select(
      "id, order_number, order_type, status, payment_status, due_date, completed_by, created_at, customers(name, phone)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // If the column doesn't exist yet, fall back to a query without it.
  // The Orders page loads normally; the Completed By feature is hidden until
  // the migration is applied and the page is refreshed.
  const columnMissing =
    withCol.error != null &&
    (withCol.error.message.includes("completed_by") ||
      withCol.error.message.includes("does not exist") ||
      withCol.error.message.includes("schema cache"));

  // Use unknown[] so both query shapes (with/without completed_by) are assignable
  let rawOrders: unknown[] | null = withCol.data as unknown[] | null;
  let fetchError: { message: string } | null = withCol.error;
  let completedByReady = true;

  if (columnMissing) {
    completedByReady = false;
    const withoutCol = await supabase
      .from("orders")
      .select(
        "id, order_number, order_type, status, payment_status, due_date, created_at, customers(name, phone)"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    rawOrders = withoutCol.data as unknown[] | null;
    fetchError = withoutCol.error;
  }

  const rows: OrderRow[] = ((rawOrders ?? []) as Record<string, unknown>[]).map((o) => {
    const customer = o.customers as { name: string; phone: string } | null;
    return {
      id: o.id as string,
      order_number: o.order_number as string,
      order_type: o.order_type as OrderType,
      status: o.status as OrderStatus,
      payment_status: o.payment_status as PaymentStatus,
      due_date: (o.due_date as string | null) ?? null,
      completed_by: completedByReady ? ((o.completed_by as string | null) ?? null) : null,
      customer_name: customer?.name ?? "—",
      customer_phone: customer?.phone ?? "—",
    };
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              <span aria-hidden="true" className="mr-1">&larr;</span> Home
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-1">
              Orders
            </h1>
          </div>
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white
                       shadow-sm transition-all hover:bg-slate-800 hover:shadow
                       focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2
                       active:scale-[0.98]"
          >
            <span aria-hidden="true">+</span> New Order
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {fetchError ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-16 text-center">
            <p className="text-sm text-red-600 font-medium">
              Failed to load orders: {fetchError.message}
            </p>
          </div>
        ) : (
          <OrdersView allOrders={rows} completedByReady={completedByReady} />
        )}
      </main>
    </div>
  );
}
