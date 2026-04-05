"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateOrderField } from "@/services/orders";
import type { OrderType, OrderStatus, PaymentStatus } from "@/lib/types";

// ----- constants -----

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "ready_for_fitting", label: "Ready for Fitting" },
  { value: "fitting_done", label: "Fitting Done" },
  { value: "completed", label: "Completed" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "deposit_paid", label: "Deposit Paid" },
  { value: "fully_paid", label: "Fully Paid" },
];

// ----- style maps -----

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "text-yellow-700 bg-yellow-50 border-yellow-200",
  in_progress: "text-blue-700 bg-blue-50 border-blue-200",
  ready_for_fitting: "text-purple-700 bg-purple-50 border-purple-200",
  fitting_done: "text-indigo-700 bg-indigo-50 border-indigo-200",
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
  pending: "",
  in_progress: "",
  ready_for_fitting: "",
  fitting_done: "",
  completed: "bg-green-50/40",
  delivered: "bg-gray-50/60",
  cancelled: "bg-red-50/30 opacity-60",
};

// ----- types -----

export interface OrderRow {
  id: string;
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  payment_status: PaymentStatus;
  due_date: string | null;
  customer_name: string;
  customer_phone: string;
}

// ----- helpers -----

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function typeBadge(type: OrderType) {
  const isAlt = type === "alteration";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        isAlt
          ? "bg-purple-50 text-purple-700 ring-purple-600/20"
          : "bg-blue-50 text-blue-700 ring-blue-600/20"
      }`}
    >
      {isAlt ? "Alteration" : "Tailoring"}
    </span>
  );
}

// ----- inline dropdown sub-component -----

function InlineSelect<T extends string>({
  orderId,
  field,
  value,
  options,
  styleMap,
  onOptimistic,
}: {
  orderId: string;
  field: "status" | "payment_status";
  value: T;
  options: { value: T; label: string }[];
  styleMap: Record<T, string>;
  onOptimistic: (orderId: string, field: string, value: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(newValue: T) {
    if (newValue === value) return;

    const previousValue = value;
    setError(null);

    // Optimistic: update parent state immediately
    onOptimistic(orderId, field, newValue);

    startTransition(async () => {
      const result = await updateOrderField({
        order_id: orderId,
        field,
        value: newValue,
      });

      if (!result.success) {
        // Revert on failure
        onOptimistic(orderId, field, previousValue);
        setError(result.error ?? "Update failed");
        setTimeout(() => setError(null), 3000);
      }
    });
  }

  const style = styleMap[value] ?? "";

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value as T)}
        disabled={isPending}
        className={`appearance-none rounded-md border px-2 py-1 pr-6 text-xs font-medium
                    focus:outline-none focus:ring-1 focus:ring-blue-500
                    disabled:opacity-50 cursor-pointer transition-colors ${style}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* dropdown arrow */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
        {isPending ? (
          <svg
            className="h-3 w-3 animate-spin text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-3 w-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      {/* error tooltip */}
      {error && (
        <div className="absolute top-full left-0 mt-1 z-10 rounded bg-red-700 px-2 py-1 text-xs text-white whitespace-nowrap shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

// ----- main table component -----

export default function OrdersTable({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);

  function handleOptimistic(orderId: string, field: string, value: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, [field]: value } : o))
    );
  }

  if (orders.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm text-gray-500">No orders found.</p>
        <Link
          href="/orders/new"
          className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Create your first order &rarr;
        </Link>
      </div>
    );
  }

  return (
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
              Phone
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Payment
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
              Due Date
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order) => (
            <tr
              key={order.id}
              className={`transition-colors hover:bg-gray-50 ${ROW_HIGHLIGHTS[order.status]}`}
            >
              <td className="px-4 py-3 text-sm font-mono text-gray-900 whitespace-nowrap">
                {order.order_number}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                {order.customer_name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                {order.customer_phone}
              </td>
              <td className="px-4 py-3">
                {typeBadge(order.order_type)}
              </td>
              <td className="px-4 py-3">
                <InlineSelect<OrderStatus>
                  orderId={order.id}
                  field="status"
                  value={order.status}
                  options={ORDER_STATUS_OPTIONS}
                  styleMap={STATUS_STYLES}
                  onOptimistic={handleOptimistic}
                />
              </td>
              <td className="px-4 py-3">
                <InlineSelect<PaymentStatus>
                  orderId={order.id}
                  field="payment_status"
                  value={order.payment_status}
                  options={PAYMENT_STATUS_OPTIONS}
                  styleMap={PAYMENT_STYLES}
                  onOptimistic={handleOptimistic}
                />
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell whitespace-nowrap">
                {formatDate(order.due_date)}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <Link
                  href={`/orders/${order.id}/invoice`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
