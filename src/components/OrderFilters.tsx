"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

const PAYMENT_OPTIONS = [
  { value: "", label: "All Payments" },
  { value: "unpaid", label: "Unpaid" },
  { value: "deposit_paid", label: "Deposit Paid" },
  { value: "fully_paid", label: "Fully Paid" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "alteration", label: "Alteration" },
  { value: "tailoring", label: "Tailoring" },
];

export default function OrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const payment = searchParams.get("payment") ?? "";
  const type = searchParams.get("type") ?? "";
  const q = searchParams.get("q") ?? "";

  // Local state for the input so typing is instant; URL updates are debounced
  const [search, setSearch] = useState(q);

  // Keep local state in sync if the URL changes externally (back/forward nav)
  useEffect(() => {
    setSearch(q);
  }, [q]);

  const pushParams = useCallback(
    (params: URLSearchParams) => {
      const str = params.toString();
      router.push(str ? `${pathname}?${str}` : pathname);
    },
    [router, pathname]
  );

  // Immediate param update (for dropdowns)
  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      pushParams(params);
    },
    [searchParams, pushParams]
  );

  // Debounced URL update for search input
  useEffect(() => {
    const trimmed = search.trim();

    // Skip the push if the URL already matches
    if (trimmed === q) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      pushParams(params);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, q, searchParams, pushParams]);

  const hasFilters = payment || type || q;

  function clearAll() {
    setSearch("");
    router.push(pathname);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      {/* search input */}
      <div className="relative flex-1 max-w-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order #, name, or phone..."
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm
                     text-gray-900 placeholder-gray-400
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute inset-y-0 right-0 flex items-center pr-2.5"
          >
            <svg
              className="h-4 w-4 text-gray-400 hover:text-gray-600"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* dropdown filters */}
      <div className="flex items-center gap-3">
        <select
          value={payment}
          onChange={(e) => updateParam("payment", e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {PAYMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) => updateParam("type", e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
