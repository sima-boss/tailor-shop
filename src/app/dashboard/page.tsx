import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/currency";
import type { OrderStatus, PaymentStatus, OrderType } from "@/lib/types";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: OrderStatus) {
  const map: Record<OrderStatus, { label: string; cls: string }> = {
    pending:           { label: "Pending",     cls: "bg-yellow-50 text-yellow-700 ring-yellow-600/20" },
    in_progress:       { label: "In Progress", cls: "bg-blue-50 text-blue-700 ring-blue-600/20" },
    ready_for_fitting: { label: "Fitting",     cls: "bg-purple-50 text-purple-700 ring-purple-600/20" },
    fitting_done:      { label: "Fitted",      cls: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
    completed:         { label: "Completed",   cls: "bg-green-50 text-green-700 ring-green-600/20" },
    delivered:         { label: "Delivered",    cls: "bg-gray-100 text-gray-700 ring-gray-600/20" },
    cancelled:         { label: "Cancelled",   cls: "bg-red-50 text-red-700 ring-red-600/20" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-50 text-gray-700 ring-gray-600/20" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {label}
    </span>
  );
}

function paymentBadge(status: PaymentStatus) {
  const map: Record<PaymentStatus, { label: string; cls: string }> = {
    unpaid:       { label: "Unpaid",  cls: "bg-red-50 text-red-700 ring-red-600/20" },
    deposit_paid: { label: "Deposit", cls: "bg-yellow-50 text-yellow-700 ring-yellow-600/20" },
    fully_paid:   { label: "Paid",    cls: "bg-green-50 text-green-700 ring-green-600/20" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-50 text-gray-700 ring-gray-600/20" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {label}
    </span>
  );
}

// ----- stat card -----

function StatCard({
  label,
  value,
  sub,
  accent = "text-gray-900",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

// ----- page -----

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Tailor Shop" };

export default async function DashboardPage() {
  const supabase = createClient();
  const settings = await getStoreSettings();

  // Fetch all non-deleted orders with customer name for the recent list
  const { data: allOrders } = await supabase
    .from("orders")
    .select("id, order_number, order_type, status, payment_status, total_amount, due_date, created_at, customers(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const orders = allOrders ?? [];

  // ----- compute stats -----
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const unpaidCount = orders.filter((o) => o.payment_status === "unpaid").length;
  const depositCount = orders.filter((o) => o.payment_status === "deposit_paid").length;
  const paidCount = orders.filter((o) => o.payment_status === "fully_paid").length;

  const activeCount = orders.filter(
    (o) => !["completed", "delivered", "cancelled"].includes(o.status as string)
  ).length;

  const recent = orders.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex gap-3">
            <Link
              href="/orders"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium
                         text-gray-700 hover:bg-gray-50 transition-colors text-center"
            >
              View Orders
            </Link>
            <Link
              href="/orders/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white
                         hover:bg-blue-700 transition-colors text-center"
            >
              + New Order
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
        {/* stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Orders"
            value={String(totalOrders)}
            sub={`${activeCount} active`}
          />
          <StatCard
            label="Total Revenue"
            value={formatMoney(totalRevenue, settings.currency)}
            accent="text-gray-900"
          />
          <StatCard
            label="Unpaid"
            value={String(unpaidCount)}
            accent={unpaidCount > 0 ? "text-red-600" : "text-gray-900"}
          />
          <StatCard
            label="Deposit Paid"
            value={String(depositCount)}
            accent={depositCount > 0 ? "text-yellow-600" : "text-gray-900"}
          />
          <StatCard
            label="Fully Paid"
            value={String(paidCount)}
            accent={paidCount > 0 ? "text-green-600" : "text-gray-900"}
          />
        </div>

        {/* recent orders */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
            <Link
              href="/orders"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              View all &rarr;
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-500">No orders yet.</p>
              <Link
                href="/orders/new"
                className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Create your first order &rarr;
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Order #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                      Due
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recent.map((order) => {
                    const customer = order.customers as unknown as { name: string } | null;

                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 whitespace-nowrap">
                          {order.order_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {customer?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                              order.order_type === "alteration"
                                ? "bg-purple-50 text-purple-700 ring-purple-600/20"
                                : "bg-blue-50 text-blue-700 ring-blue-600/20"
                            }`}
                          >
                            {order.order_type === "alteration" ? "Alteration" : "Tailoring"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {statusBadge(order.status as OrderStatus)}
                        </td>
                        <td className="px-4 py-3">
                          {paymentBadge(order.payment_status as PaymentStatus)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell whitespace-nowrap">
                          {formatDate(order.due_date)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/orders/${order.id}/invoice`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
