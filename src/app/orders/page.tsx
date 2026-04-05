import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrderFilters from "@/components/OrderFilters";
import OrdersTable, { type OrderRow } from "@/components/OrdersTable";
import type { OrderType, OrderStatus, PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders — Tailor Shop" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { payment?: string; type?: string; q?: string };
}) {
  const supabase = createClient();

  // Build query — includes `status` for inline editing
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, order_type, status, payment_status, due_date, created_at, customers(name, phone)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (searchParams.payment) {
    query = query.eq("payment_status", searchParams.payment);
  }
  if (searchParams.type) {
    query = query.eq("order_type", searchParams.type);
  }

  const { data: orders, error } = await query;

  // Normalize rows for the client component
  let rows: OrderRow[] = (orders ?? []).map((o) => {
    const customer = o.customers as unknown as
      | { name: string; phone: string }
      | null;

    return {
      id: o.id,
      order_number: o.order_number,
      order_type: o.order_type as OrderType,
      status: o.status as OrderStatus,
      payment_status: o.payment_status as PaymentStatus,
      due_date: o.due_date,
      customer_name: customer?.name ?? "—",
      customer_phone: customer?.phone ?? "—",
    };
  });

  // Text search — matches against order number, customer name, or phone
  const q = searchParams.q?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (r) =>
        r.order_number.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.customer_phone.toLowerCase().includes(q)
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              &larr; Home
            </Link>
            <h1 className="text-xl font-bold text-gray-900 mt-1">Orders</h1>
          </div>
          <Link
            href="/orders/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white
                       hover:bg-blue-700 transition-colors text-center"
          >
            + New Order
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {/* filters */}
        <div className="mb-4">
          <OrderFilters />
        </div>

        {/* table card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {error ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-red-600">
                Failed to load orders: {error.message}
              </p>
            </div>
          ) : (
            <OrdersTable initialOrders={rows} />
          )}
        </div>

        {/* count */}
        {rows.length > 0 && (
          <p className="mt-3 text-xs text-gray-500 text-right">
            {rows.length} order{rows.length !== 1 && "s"}
          </p>
        )}
      </main>
    </div>
  );
}
