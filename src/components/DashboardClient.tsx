"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import type { UserRole } from "@/lib/rbac";
import { logoutAction } from "@/app/auth/actions";

// ============================================================
// Types
// ============================================================

type Preset        = "this_month" | "last_month" | "this_year" | "custom";
type DeliveryFilter = "recent" | "overdue" | "today" | "tomorrow" | "next7";

export interface DashboardOrder {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  payment_status: string;
  total_amount: number;
  completed_by: string | null;
  completed_at: string | null;
  due_date: string | null;
  created_at: string;
  customer_name: string;
}

interface Props {
  allOrders: DashboardOrder[];
  currency: string;
  role: UserRole;
}

// ============================================================
// Constants
// ============================================================

const PRESETS: { key: Preset; label: string }[] = [
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_year",  label: "This Year"  },
  { key: "custom",     label: "Custom"     },
];

const COMMISSION_RATE = 0.3;

// All hardcoded so Tailwind JIT can detect every class statically.
const ALERT_STYLES = {
  red: {
    inactive:    "bg-white border-red-200 hover:bg-red-50 hover:border-red-300",
    active:      "bg-red-50 border-red-500",
    labelActive: "text-red-700",
    value:       "text-red-600",
  },
  amber: {
    inactive:    "bg-white border-amber-200 hover:bg-amber-50 hover:border-amber-300",
    active:      "bg-amber-50 border-amber-500",
    labelActive: "text-amber-700",
    value:       "text-amber-600",
  },
  yellow: {
    inactive:    "bg-white border-yellow-200 hover:bg-yellow-50 hover:border-yellow-300",
    active:      "bg-yellow-50 border-yellow-500",
    labelActive: "text-yellow-700",
    value:       "text-yellow-600",
  },
  blue: {
    inactive:    "bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300",
    active:      "bg-blue-50 border-blue-500",
    labelActive: "text-blue-700",
    value:       "text-blue-600",
  },
} as const;

// ============================================================
// Helpers
// ============================================================

/** Returns a local date string in "YYYY-MM-DD" format (timezone-safe for date-only comparisons). */
function toLocalISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function getRange(
  preset: Preset,
  customFrom: string,
  customTo: string
): { from: Date; to: Date } {
  const now = new Date();

  if (preset === "this_month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      to:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (preset === "last_month") {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    return {
      from: new Date(y, m, 1, 0, 0, 0, 0),
      to:   new Date(y, m + 1, 0, 23, 59, 59, 999),
    };
  }
  if (preset === "this_year") {
    return {
      from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
      to:   new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  // custom — fall back to this month when inputs are empty
  return {
    from: customFrom
      ? new Date(customFrom + "T00:00:00")
      : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
    to: customTo
      ? new Date(customTo + "T23:59:59")
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function rangeLabel(preset: Preset, from: Date, customFrom: string, customTo: string): string {
  if (preset === "custom") {
    if (!customFrom && !customTo) return "Custom Range";
    return `${customFrom || "??"} → ${customTo || "??"}`;
  }
  if (preset === "this_year") {
    return from.toLocaleDateString("en-US", { year: "numeric" });
  }
  return from.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ============================================================
// Sub-components
// ============================================================

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
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function AlertCard({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: keyof typeof ALERT_STYLES;
  active: boolean;
  onClick: () => void;
}) {
  const s = ALERT_STYLES[color];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border-2 px-5 py-4 transition-all ${
        active ? s.active : s.inactive
      }`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wide ${
        active ? s.labelActive : "text-gray-500"
      }`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${count > 0 ? s.value : "text-gray-300"}`}>
        {count}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">
        {count === 1 ? "order" : "orders"}
      </p>
    </button>
  );
}

function statusBadge(status: OrderStatus) {
  const map: Record<OrderStatus, { label: string; cls: string }> = {
    in_progress: { label: "In Progress", cls: "bg-blue-50 text-blue-700 ring-blue-600/20" },
    completed:   { label: "Completed",   cls: "bg-green-50 text-green-700 ring-green-600/20" },
    delivered:   { label: "Delivered",   cls: "bg-gray-100 text-gray-700 ring-gray-600/20" },
    cancelled:   { label: "Cancelled",   cls: "bg-red-50 text-red-700 ring-red-600/20" },
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

// ============================================================
// Main component
// ============================================================

export default function DashboardClient({ allOrders, currency, role }: Props) {

  // ---- state ----
  const [preset,       setPreset]       = useState<Preset>("this_month");
  const [customFrom,   setCustomFrom]   = useState("");
  const [customTo,     setCustomTo]     = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("recent");

  // ---- date range (for stats / earnings) ----
  const { from, to } = useMemo(
    () => getRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const label = useMemo(
    () => rangeLabel(preset, from, customFrom, customTo),
    [preset, from, customFrom, customTo]
  );

  // ---- today / tomorrow / +7 strings (computed once on mount) ----
  const { todayStr, tomorrowStr, next7EndStr } = useMemo(() => {
    const t   = new Date();
    const tmr = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
    const n7  = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 7);
    return {
      todayStr:    toLocalISO(t),
      tomorrowStr: toLocalISO(tmr),
      next7EndStr: toLocalISO(n7),
    };
  }, []);

  // ---- stats: filter by created_at (respects date range) ----
  const ordersInRange = useMemo(
    () => allOrders.filter((o) => { const d = new Date(o.created_at); return d >= from && d <= to; }),
    [allOrders, from, to]
  );

  // ---- earnings: filter by completed_at, fall back to created_at ----
  const earningsInRange = useMemo(
    () =>
      allOrders.filter((o) => {
        if (o.status !== "completed" || !o.completed_by) return false;
        const d = new Date(o.completed_at ?? o.created_at);
        return d >= from && d <= to;
      }),
    [allOrders, from, to]
  );

  // ---- delivery alerts: global — not date-range filtered ----
  // Excludes delivered & cancelled orders so only actionable orders appear.

  const overdueOrders = useMemo(
    () => allOrders.filter(
      (o) => o.due_date && o.due_date < todayStr && !["delivered", "cancelled"].includes(o.status)
    ),
    [allOrders, todayStr]
  );

  const todayOrders = useMemo(
    () => allOrders.filter(
      (o) => o.due_date === todayStr && !["delivered", "cancelled"].includes(o.status)
    ),
    [allOrders, todayStr]
  );

  const tomorrowOrders = useMemo(
    () => allOrders.filter(
      (o) => o.due_date === tomorrowStr && !["delivered", "cancelled"].includes(o.status)
    ),
    [allOrders, tomorrowStr]
  );

  const next7Orders = useMemo(
    () => allOrders.filter(
      (o) =>
        o.due_date &&
        o.due_date > tomorrowStr &&
        o.due_date <= next7EndStr &&
        !["delivered", "cancelled"].includes(o.status)
    ),
    [allOrders, tomorrowStr, next7EndStr]
  );

  // ---- orders table: switches between Recent and delivery views ----
  const isDeliveryMode = deliveryFilter !== "recent";

  const tableOrders = useMemo(() => {
    if (!isDeliveryMode) return ordersInRange.slice(0, 5);

    const source =
      deliveryFilter === "overdue"  ? overdueOrders  :
      deliveryFilter === "today"    ? todayOrders     :
      deliveryFilter === "tomorrow" ? tomorrowOrders  :
                                      next7Orders;

    // Sort nearest due date first
    return [...source].sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
  }, [deliveryFilter, isDeliveryMode, ordersInRange, overdueOrders, todayOrders, tomorrowOrders, next7Orders]);

  const tableTitle = isDeliveryMode
    ? { overdue: "Overdue Orders", today: "Due Today", tomorrow: "Due Tomorrow", next7: "Due in Next 7 Days" }[deliveryFilter as Exclude<DeliveryFilter, "recent">]
    : `Recent Orders — ${label}`;

  // Clicking the same alert card again resets to Recent (toggle behaviour)
  function handleAlertClick(f: Exclude<DeliveryFilter, "recent">) {
    setDeliveryFilter((prev) => (prev === f ? "recent" : f));
  }

  // ---- stats ----
  const totalOrders  = ordersInRange.length;
  const totalRevenue = ordersInRange.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
  const unpaidCount  = ordersInRange.filter((o) => o.payment_status === "unpaid").length;
  const depositCount = ordersInRange.filter((o) => o.payment_status === "deposit_paid").length;
  const paidCount    = ordersInRange.filter((o) => o.payment_status === "fully_paid").length;
  const activeCount  = ordersInRange.filter(
    (o) => !["completed", "delivered", "cancelled"].includes(o.status)
  ).length;

  const mumtazEarnings = earningsInRange
    .filter((o) => o.completed_by === "Mumtaz")
    .reduce((s, o) => s + (Number(o.total_amount) || 0) * COMMISSION_RATE, 0);

  const shanEarnings = earningsInRange
    .filter((o) => o.completed_by === "Shan")
    .reduce((s, o) => s + (Number(o.total_amount) || 0) * COMMISSION_RATE, 0);

  // ---- filter tabs (rendered inside the orders table card) ----
  const filterTabs: { key: DeliveryFilter; label: string }[] = [
    { key: "recent",   label: "Recent" },
    { key: "overdue",  label: overdueOrders.length  > 0 ? `Overdue (${overdueOrders.length})`       : "Overdue"      },
    { key: "today",    label: todayOrders.length     > 0 ? `Today (${todayOrders.length})`           : "Today"        },
    { key: "tomorrow", label: tomorrowOrders.length  > 0 ? `Tomorrow (${tomorrowOrders.length})`     : "Tomorrow"     },
    { key: "next7",    label: next7Orders.length     > 0 ? `Next 7 Days (${next7Orders.length})`     : "Next 7 Days"  },
  ];

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ---- header ---- */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Danaty Fashion</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link
              href="/orders"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium
                         text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-400 text-center"
            >
              View Orders
            </Link>
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white
                         shadow-sm transition-all hover:bg-slate-800 hover:shadow
                         focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2
                         active:scale-[0.98]"
            >
              <span aria-hidden="true">+</span> New Order
            </Link>
            {/* Sign-out: form action calls the server action directly */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium
                           text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">

        {/* ---- date range selector ---- */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg flex-shrink-0">
              {PRESETS.map(({ key, label: pl }) => (
                <button
                  key={key}
                  onClick={() => setPreset(key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    preset === key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {pl}
                </button>
              ))}
            </div>

            {preset === "custom" ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <p className="text-sm font-semibold text-gray-700">{label}</p>
            )}
          </div>

          {preset === "custom" && (customFrom || customTo) && (
            <p className="mt-2 text-xs text-gray-500">{label}</p>
          )}
        </div>

        {/* ---- stats: owner sees full 5-card overview; staff sees payment status only ---- */}
        {role === "owner" ? (
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Orders Overview — {label}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard label="Total Orders"  value={String(totalOrders)}              sub={`${activeCount} active`} />
              <StatCard label="Total Revenue" value={formatMoney(totalRevenue, currency)} accent="text-gray-900" />
              <StatCard label="Unpaid"        value={String(unpaidCount)}              accent={unpaidCount  > 0 ? "text-red-600"    : "text-gray-900"} />
              <StatCard label="Deposit Paid"  value={String(depositCount)}             accent={depositCount > 0 ? "text-yellow-600" : "text-gray-900"} />
              <StatCard label="Fully Paid"    value={String(paidCount)}                accent={paidCount    > 0 ? "text-green-600"  : "text-gray-900"} />
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Payment Status — {label}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Unpaid"       value={String(unpaidCount)}  accent={unpaidCount  > 0 ? "text-red-600"    : "text-gray-900"} />
              <StatCard label="Deposit Paid" value={String(depositCount)} accent={depositCount > 0 ? "text-yellow-600" : "text-gray-900"} />
            </div>
          </div>
        )}

        {/* ---- delivery alerts ---- */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Delivery Alerts
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AlertCard
              label="Overdue"
              count={overdueOrders.length}
              color="red"
              active={deliveryFilter === "overdue"}
              onClick={() => handleAlertClick("overdue")}
            />
            <AlertCard
              label="Due Today"
              count={todayOrders.length}
              color="amber"
              active={deliveryFilter === "today"}
              onClick={() => handleAlertClick("today")}
            />
            <AlertCard
              label="Due Tomorrow"
              count={tomorrowOrders.length}
              color="yellow"
              active={deliveryFilter === "tomorrow"}
              onClick={() => handleAlertClick("tomorrow")}
            />
            <AlertCard
              label="Next 7 Days"
              count={next7Orders.length}
              color="blue"
              active={deliveryFilter === "next7"}
              onClick={() => handleAlertClick("next7")}
            />
          </div>
        </div>

        {/* ---- tailor earnings (owner only) ---- */}
        {role === "owner" && (
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Tailor Earnings — 30% Commission — {label}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Mumtaz" value={formatMoney(mumtazEarnings, currency)} sub="30% of completed orders" accent="text-violet-700" />
              <StatCard label="Shan"   value={formatMoney(shanEarnings, currency)}   sub="30% of completed orders" accent="text-violet-700" />
            </div>
          </div>
        )}

        {/* ---- orders table ---- */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">

          {/* table header + filter tabs */}
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">{tableTitle}</h2>
              <Link
                href="/orders"
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                View all &rarr;
              </Link>
            </div>

            {/* filter tabs */}
            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map(({ key, label: tl }) => (
                <button
                  key={key}
                  onClick={() => setDeliveryFilter(key)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    deliveryFilter === key
                      ? "bg-gray-800 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tl}
                </button>
              ))}
            </div>
          </div>

          {/* table body */}
          {tableOrders.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-500">No orders found.</p>
              {isDeliveryMode ? (
                <button
                  onClick={() => setDeliveryFilter("recent")}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Back to recent orders
                </button>
              ) : preset !== "this_month" ? (
                <button
                  onClick={() => setPreset("this_month")}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Switch to This Month
                </button>
              ) : null}
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
                    {/* Due column: always visible in delivery mode so the key date is never hidden */}
                    <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide ${
                      isDeliveryMode ? "" : "hidden md:table-cell"
                    }`}>
                      Due
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableOrders.map((order) => {
                    // Color-code the due date by urgency when in a delivery view
                    const dueCellCls = !isDeliveryMode
                      ? "text-gray-600 hidden md:table-cell"
                      : deliveryFilter === "overdue"
                      ? "text-red-600 font-semibold"
                      : deliveryFilter === "today"
                      ? "text-amber-600 font-semibold"
                      : "text-gray-700 font-medium";

                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 whitespace-nowrap">
                          #{order.order_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {order.customer_name}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            order.order_type === "alteration"
                              ? "bg-purple-50 text-purple-700 ring-purple-600/20"
                              : "bg-blue-50 text-blue-700 ring-blue-600/20"
                          }`}>
                            {order.order_type === "alteration" ? "Alteration" : "Tailoring"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {statusBadge(order.status as OrderStatus)}
                        </td>
                        <td className="px-4 py-3">
                          {paymentBadge(order.payment_status as PaymentStatus)}
                        </td>
                        <td className={`px-4 py-3 text-sm whitespace-nowrap ${dueCellCls}`}>
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
