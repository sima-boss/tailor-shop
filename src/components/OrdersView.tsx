"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { updateOrderField, updateOrderStatus } from "@/services/orders";
import type { OrderType, OrderStatus, PaymentStatus } from "@/lib/types";

// ----- types -----

export interface OrderRow {
  id: string;
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  payment_status: PaymentStatus;
  due_date: string | null;
  completed_by: string | null;
  customer_name: string;
  customer_phone: string;
}

// ----- constants -----

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "deposit_paid", label: "Deposit Paid" },
  { value: "fully_paid", label: "Fully Paid" },
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  in_progress: "text-blue-700 bg-blue-50 border-blue-200",
  completed: "text-green-700 bg-green-50 border-green-200",
  delivered: "text-gray-700 bg-gray-50 border-gray-200",
  cancelled: "text-red-700 bg-red-50 border-red-200",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  unpaid: "text-red-700 bg-red-50 border-red-200",
  deposit_paid: "text-yellow-700 bg-yellow-50 border-yellow-200",
  fully_paid: "text-green-700 bg-green-50 border-green-200",
};

const ROW_HIGHLIGHTS: Record<OrderStatus, string> = {
  in_progress: "",
  completed: "bg-green-50/40",
  delivered: "bg-gray-50/60",
  cancelled: "bg-red-50/30 opacity-60",
};

const TAILORS = ["Mumtaz", "Shan"] as const;
type Tailor = (typeof TAILORS)[number];

// ----- helpers -----

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SelectChevron({ spinning }: { spinning: boolean }) {
  if (spinning) {
    return (
      <svg className="h-3 w-3 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    );
  }
  return (
    <svg className="h-3 w-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

// -----------------------------------------------------------------------
// StatusCell
//
// completedByReady = false  → plain status-only updates, no tailor picker,
//                             uses updateOrderField({ field: "status" })
// completedByReady = true   → two-step flow for Completed (pick tailor),
//                             uses updateOrderStatus (saves status + completed_by)
// -----------------------------------------------------------------------

function StatusCell({
  order,
  completedByReady,
  onOptimistic,
}: {
  order: OrderRow;
  completedByReady: boolean;
  onOptimistic: (orderId: string, updates: Partial<OrderRow>) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [awaitingTailor, setAwaitingTailor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple status-only save (used when completedByReady is false)
  function saveStatusOnly(newStatus: OrderStatus) {
    const prevStatus = order.status;
    onOptimistic(order.id, { status: newStatus });
    startTransition(async () => {
      const result = await updateOrderField({ order_id: order.id, field: "status", value: newStatus });
      if (!result.success) {
        onOptimistic(order.id, { status: prevStatus });
        setError(result.error ?? "Update failed");
        setTimeout(() => setError(null), 4000);
      }
    });
  }

  // Full save with completed_by (used when completedByReady is true)
  function saveWithTailor(newStatus: OrderStatus, tailor: string | null) {
    const prev = { status: order.status, completed_by: order.completed_by };
    onOptimistic(order.id, {
      status: newStatus,
      completed_by: newStatus === "completed" ? tailor : null,
    });
    startTransition(async () => {
      const result = await updateOrderStatus({
        order_id: order.id,
        status: newStatus,
        completed_by: newStatus === "completed" ? tailor : null,
      });
      if (!result.success) {
        onOptimistic(order.id, prev);
        setError(result.error ?? "Update failed");
        setTimeout(() => setError(null), 4000);
      }
    });
  }

  function handleStatusChange(newStatus: OrderStatus) {
    setError(null);
    setAwaitingTailor(false);

    if (!completedByReady) {
      // DB column not ready — plain status update only
      saveStatusOnly(newStatus);
      return;
    }

    if (newStatus === "completed") {
      // Pause and show tailor picker before saving
      setAwaitingTailor(true);
    } else {
      saveWithTailor(newStatus, null);
    }
  }

  function handleTailorSelect(tailor: Tailor) {
    setAwaitingTailor(false);
    saveWithTailor("completed", tailor);
  }

  const displayStatus: OrderStatus = awaitingTailor ? "completed" : order.status;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <select
          value={displayStatus}
          onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
          disabled={isPending}
          className={`appearance-none rounded-md border px-2 py-1 pr-6 text-xs font-medium
                      focus:outline-none focus:ring-1 focus:ring-blue-500
                      disabled:opacity-50 cursor-pointer transition-colors
                      ${STATUS_STYLES[displayStatus]}`}
        >
          {ORDER_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
          <SelectChevron spinning={isPending} />
        </div>
      </div>

      {awaitingTailor && (
        <div className="flex flex-col gap-1">
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) handleTailorSelect(e.target.value as Tailor); }}
            className="appearance-none rounded-md border border-green-400 bg-green-50
                       px-2 py-1 text-xs font-medium text-green-900
                       focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
          >
            <option value="" disabled>Who completed?</option>
            {TAILORS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setAwaitingTailor(false)}
            className="text-[10px] text-gray-400 hover:text-gray-600 text-left"
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="rounded bg-red-600 px-2 py-1 text-xs text-white shadow">
          {error}
        </div>
      )}
    </div>
  );
}

// ----- payment select -----

function PaymentSelect({
  order,
  onOptimistic,
}: {
  order: OrderRow;
  onOptimistic: (orderId: string, updates: Partial<OrderRow>) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(newValue: PaymentStatus) {
    if (newValue === order.payment_status) return;
    const prev = order.payment_status;
    setError(null);
    onOptimistic(order.id, { payment_status: newValue });
    startTransition(async () => {
      const result = await updateOrderField({ order_id: order.id, field: "payment_status", value: newValue });
      if (!result.success) {
        onOptimistic(order.id, { payment_status: prev });
        setError(result.error ?? "Update failed");
        setTimeout(() => setError(null), 3000);
      }
    });
  }

  return (
    <div className="relative">
      <select
        value={order.payment_status}
        onChange={(e) => handleChange(e.target.value as PaymentStatus)}
        disabled={isPending}
        className={`appearance-none rounded-md border px-2 py-1 pr-6 text-xs font-medium
                    focus:outline-none focus:ring-1 focus:ring-blue-500
                    disabled:opacity-50 cursor-pointer transition-colors
                    ${PAYMENT_STYLES[order.payment_status]}`}
      >
        {PAYMENT_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
        <SelectChevron spinning={isPending} />
      </div>
      {error && (
        <div className="absolute top-full left-0 mt-1 z-10 rounded bg-red-600 px-2 py-1 text-xs text-white whitespace-nowrap shadow">
          {error}
        </div>
      )}
    </div>
  );
}

// ----- main component -----

export default function OrdersView({
  allOrders,
  completedByReady,
}: {
  allOrders: OrderRow[];
  completedByReady: boolean;
}) {
  const [orders, setOrders] = useState(allOrders);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    let result = orders;
    if (paymentFilter) result = result.filter((o) => o.payment_status === paymentFilter);
    if (typeFilter) result = result.filter((o) => o.order_type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.includes(q)
      );
    }
    return result;
  }, [orders, search, paymentFilter, typeFilter]);

  function handleOptimistic(orderId: string, updates: Partial<OrderRow>) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
    );
  }

  const hasFilters = search || paymentFilter || typeFilter;

  return (
    <div>
      {/* search & filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, name, phone..."
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm
                       text-gray-900 placeholder-gray-400
                       focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute inset-y-0 right-0 flex items-center pr-2.5">
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                       focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Payments</option>
            <option value="unpaid">Unpaid</option>
            <option value="deposit_paid">Deposit Paid</option>
            <option value="fully_paid">Fully Paid</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                       focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="alteration">Alteration</option>
            <option value="tailoring">Tailoring</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setPaymentFilter(""); setTypeFilter(""); }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">
              {hasFilters ? "No orders match your filters." : "No orders yet."}
            </p>
            {!hasFilters && (
              <Link href="/orders/new" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-800">
                Create your first order &rarr;
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  {completedByReady && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                      Completed By
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Due</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((order) => (
                  <tr key={order.id} className={`transition-colors hover:bg-gray-50 ${ROW_HIGHLIGHTS[order.status]}`}>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 whitespace-nowrap">
                      #{order.order_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{order.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{order.customer_phone}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        order.order_type === "alteration"
                          ? "bg-purple-50 text-purple-700 ring-purple-600/20"
                          : "bg-blue-50 text-blue-700 ring-blue-600/20"
                      }`}>
                        {order.order_type === "alteration" ? "Alter" : "Tailor"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusCell
                        order={order}
                        completedByReady={completedByReady}
                        onOptimistic={handleOptimistic}
                      />
                    </td>
                    {completedByReady && (
                      <td className="px-4 py-3 text-sm hidden md:table-cell">
                        {order.completed_by
                          ? <span className="font-medium text-gray-900">{order.completed_by}</span>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <PaymentSelect order={order} onOptimistic={handleOptimistic} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell whitespace-nowrap">
                      {formatDate(order.due_date)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link href={`/orders/${order.id}/invoice`} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-500 text-right">
        {filtered.length === orders.length
          ? `${orders.length} order${orders.length !== 1 ? "s" : ""}`
          : `${filtered.length} of ${orders.length} orders`}
      </p>
    </div>
  );
}
