"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder, type CreateOrderInput } from "@/services/orders";
import type { OrderType, PaymentStatus } from "@/lib/types";

// ----- tailoring item type -----

interface TailItem {
  model: string;
  qty: string;
  unit_price: string;
}

// ----- initial form state -----

function getInitialState(): CreateOrderInput {
  return {
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_notes: "",
    order_type: "alteration",
    total_amount: "",
    deposit_amount: "",
    payment_status: "unpaid",
    due_date: "",
    order_notes: "",
    alt_garment_type: "",
    alt_description: "",
    alt_special_instructions: "",
    alt_garment_brand: "",
    alt_garment_color: "",
    alt_quantity: "1",
    tail_garment_type: "",
    tail_fabric_details: "",
    tail_design_notes: "",
    tail_special_instructions: "",
    chest: "", waist: "", hips: "", shoulders: "", neck: "",
    sleeve_length: "", arm_circumference: "", wrist: "",
    back_length: "", front_length: "",
    inseam: "", outseam: "", thigh: "", knee: "", calf: "",
    trouser_length: "", skirt_length: "", dress_length: "",
  };
}

function emptyTailItem(): TailItem {
  return { model: "", qty: "1", unit_price: "" };
}

// ============================
// Main form component
// ============================

export default function OrderForm() {
  const router = useRouter();
  const [form, setForm] = useState<CreateOrderInput>(getInitialState);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // ----- Alteration state -----
  const [altQty, setAltQty] = useState(1);
  const [altPrices, setAltPrices] = useState<string[]>([""]);

  // ----- Tailoring state -----
  const [tailItems, setTailItems] = useState<TailItem[]>([emptyTailItem()]);

  // Today's date
  const todayStr = new Date().toLocaleDateString("en-GB");

  // ----- Alteration computed -----
  const altTotal = altPrices.reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
  const altDeposit = parseFloat(form.deposit_amount) || 0;
  const altBalance = altTotal - altDeposit;
  const altPaymentStatus: PaymentStatus =
    altTotal > 0 && altDeposit >= altTotal ? "fully_paid"
    : altDeposit > 0 ? "deposit_paid"
    : "unpaid";

  // ----- Tailoring computed -----
  const tailTotal = tailItems.reduce(
    (sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0),
    0
  );
  const tailDeposit = parseFloat(form.deposit_amount) || 0;
  const tailBalance = tailTotal - tailDeposit;
  const tailPaymentStatus: PaymentStatus =
    tailTotal > 0 && tailDeposit >= tailTotal ? "fully_paid"
    : tailDeposit > 0 ? "deposit_paid"
    : "unpaid";

  // generic field updater
  function set<K extends keyof CreateOrderInput>(key: K, value: CreateOrderInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ----- Alteration handlers -----
  function handleAltQtyChange(qty: number) {
    const newQty = Math.max(1, Math.min(qty || 1, 20));
    setAltQty(newQty);
    setAltPrices((prev) => {
      const copy = [...prev];
      while (copy.length < newQty) copy.push("");
      return copy.slice(0, newQty);
    });
  }

  function handleAltPriceChange(idx: number, val: string) {
    setAltPrices((prev) => { const c = [...prev]; c[idx] = val; return c; });
  }

  // ----- Tailoring handlers -----
  function handleTailItemChange(idx: number, field: keyof TailItem, val: string) {
    setTailItems((prev) => {
      const c = prev.map((item, i) => i === idx ? { ...item, [field]: val } : item);
      return c;
    });
  }

  function addTailItem() {
    setTailItems((prev) => [...prev, emptyTailItem()]);
  }

  function removeTailItem(idx: number) {
    setTailItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }

  // ----- Reset -----
  function resetForm() {
    setForm(getInitialState());
    setResult(null);
    setAltQty(1);
    setAltPrices([""]);
    setTailItems([emptyTailItem()]);
  }

  // ----- Submit -----
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    let submitForm = { ...form };

    if (form.order_type === "alteration") {
      if (!form.customer_name.trim()) {
        setResult({ type: "error", message: "Customer name is required." });
        setSubmitting(false);
        return;
      }
      if (altTotal <= 0) {
        setResult({ type: "error", message: "Please enter at least one price." });
        setSubmitting(false);
        return;
      }
      submitForm = {
        ...form,
        total_amount: String(altTotal),
        deposit_amount: String(altDeposit),
        payment_status: altPaymentStatus,
        alt_quantity: String(altQty),
        alt_special_instructions: JSON.stringify(altPrices.map((p) => parseFloat(p) || 0)),
      };
    }

    if (form.order_type === "tailoring") {
      if (!form.customer_name.trim()) {
        setResult({ type: "error", message: "Customer name is required." });
        setSubmitting(false);
        return;
      }
      if (tailTotal <= 0) {
        setResult({ type: "error", message: "Please enter at least one item with a price." });
        setSubmitting(false);
        return;
      }
      // Derive garment_type from first item (or fallback)
      const firstModel = tailItems[0]?.model.trim() || "Custom Tailoring";
      // Store items as JSON in design_notes for invoice display
      const itemsJson = JSON.stringify(
        tailItems.map((item) => ({
          model: item.model.trim() || "—",
          qty: parseInt(item.qty) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
        }))
      );
      submitForm = {
        ...form,
        total_amount: String(tailTotal),
        deposit_amount: String(tailDeposit),
        payment_status: tailPaymentStatus,
        tail_garment_type: firstModel,
        tail_design_notes: itemsJson,
        tail_fabric_details: "",
        tail_special_instructions: "",
      };
    }

    const res = await createOrder(submitForm);

    if (res.success && res.order_id) {
      router.push(`/orders/${res.order_id}/invoice`);
      return;
    } else {
      setResult({ type: "error", message: res.error ?? "Something went wrong." });
    }

    setSubmitting(false);
  }

  // ==============================
  // RENDER
  // ==============================

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* error / success banner */}
      {result && (
        <div className={`rounded-md px-4 py-3 text-sm font-medium ${
          result.type === "success"
            ? "bg-green-50 text-green-800 border border-green-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {result.message}
        </div>
      )}

      {/* ===== SERVICE TYPE ===== */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Service Type
        </p>
        <div className="flex gap-3">
          {(["alteration", "tailoring"] as OrderType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => set("order_type", type)}
              className={`flex-1 rounded border-2 py-2 text-sm font-medium capitalize transition-colors ${
                form.order_type === type
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================
          ALTERATION — paper invoice layout (UNCHANGED)
          ===================================================== */}
      {form.order_type === "alteration" && (
        <div className="border-2 border-gray-600 overflow-hidden rounded-sm">

          {/* Title */}
          <div className="bg-gray-800 text-white text-center py-1.5 text-xs font-bold tracking-[0.25em] uppercase">
            Cash Invoice
          </div>

          {/* Customer | Order Info */}
          <div className="grid grid-cols-2 divide-x divide-gray-500 border-b border-gray-500">
            <div className="p-3 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-gray-500 w-10 shrink-0 uppercase">Name</span>
                <span className="text-gray-400 text-xs shrink-0">:</span>
                <input
                  type="text"
                  required
                  value={form.customer_name}
                  onChange={(e) => set("customer_name", e.target.value)}
                  placeholder="Customer name"
                  className="flex-1 min-w-0 border-b border-gray-400 bg-transparent text-sm
                             px-0.5 pb-0.5 focus:outline-none focus:border-gray-700 placeholder-gray-300"
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-gray-500 w-10 shrink-0 uppercase">Tel</span>
                <span className="text-gray-400 text-xs shrink-0">:</span>
                <input
                  type="tel"
                  value={form.customer_phone}
                  onChange={(e) => set("customer_phone", e.target.value)}
                  placeholder="Phone number"
                  className="flex-1 min-w-0 border-b border-gray-400 bg-transparent text-sm
                             px-0.5 pb-0.5 focus:outline-none focus:border-gray-700 placeholder-gray-300"
                />
              </div>
            </div>
            <div className="p-3 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-gray-500 w-20 shrink-0 uppercase">Order No.</span>
                <span className="text-gray-400 text-xs shrink-0">:</span>
                <span className="text-sm text-gray-400 italic">Auto</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-gray-500 w-20 shrink-0 uppercase">Received</span>
                <span className="text-gray-400 text-xs shrink-0">:</span>
                <span className="text-sm text-gray-700">{todayStr}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-gray-500 w-20 shrink-0 uppercase">Delivery</span>
                <span className="text-gray-400 text-xs shrink-0">:</span>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set("due_date", e.target.value)}
                  className="flex-1 min-w-0 border-b border-gray-400 bg-transparent text-sm
                             px-0.5 pb-0.5 focus:outline-none focus:border-gray-700"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-b border-gray-500">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-500">
                <th className="w-14 border-r border-gray-500 py-1.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wide">Qty</th>
                <th className="border-r border-gray-500 px-3 py-1.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wide">Description</th>
                <th className="w-32 px-2 py-1.5 text-right text-[11px] font-bold text-gray-600 uppercase tracking-wide">Amount (AED)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-r border-gray-500 px-2 py-3 align-top text-center">
                  <input
                    type="number" min={1} max={20} value={altQty}
                    onChange={(e) => handleAltQtyChange(parseInt(e.target.value) || 1)}
                    className="w-12 border border-gray-400 text-sm text-center px-1 py-0.5
                               focus:outline-none focus:ring-1 focus:ring-gray-600 rounded-sm"
                  />
                </td>
                <td className="border-r border-gray-500 px-3 py-3 align-top">
                  <input
                    type="text"
                    value={form.alt_description}
                    onChange={(e) => set("alt_description", e.target.value)}
                    placeholder="e.g. Shorten, Take in waist, EM..."
                    className="w-full border-b border-gray-400 bg-transparent text-sm
                               px-0.5 pb-0.5 focus:outline-none focus:border-gray-700 placeholder-gray-300"
                  />
                </td>
                <td className="px-2 py-3 align-top">
                  <div className="space-y-1.5">
                    {altPrices.map((price, i) => (
                      <input
                        key={i} type="number" step="0.5" min="0" value={price}
                        onChange={(e) => handleAltPriceChange(i, e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-gray-400 text-sm text-right px-1 py-0.5
                                   focus:outline-none focus:ring-1 focus:ring-gray-600 rounded-sm"
                      />
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div>
            <div className="flex border-b border-gray-400">
              <div className="flex-1 border-r border-gray-400" />
              <div className="w-32 flex justify-between items-center px-3 py-1.5 border-b border-gray-300">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-sm font-semibold text-gray-800">{altTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex border-b border-gray-400">
              <div className="flex-1 border-r border-gray-400" />
              <div className="w-32 flex justify-between items-center px-3 py-1.5">
                <span className="text-xs text-gray-500">Deposit</span>
                <input
                  type="number" step="0.5" min="0" value={form.deposit_amount}
                  onChange={(e) => set("deposit_amount", e.target.value)}
                  placeholder="0.00"
                  className="w-20 border border-gray-400 text-sm text-right px-1 py-0.5
                             focus:outline-none focus:ring-1 focus:ring-gray-600 rounded-sm"
                />
              </div>
            </div>
            <div className="flex">
              <div className="flex-1 border-r border-gray-400 px-3 py-2 flex items-center">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  altPaymentStatus === "fully_paid" ? "bg-green-100 text-green-700"
                  : altPaymentStatus === "deposit_paid" ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
                }`}>
                  {altPaymentStatus === "fully_paid" ? "Fully Paid"
                   : altPaymentStatus === "deposit_paid" ? "Deposit Paid"
                   : "Unpaid"}
                </span>
              </div>
              <div className="w-32 flex justify-between items-center px-3 py-1.5">
                <span className="text-xs font-semibold text-gray-700">Balance</span>
                <span className={`text-sm font-bold ${altBalance > 0 ? "text-red-700" : "text-green-700"}`}>
                  {altBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          TAILORING — Work order layout
          ===================================================== */}
      {form.order_type === "tailoring" && (
        <div className="border-2 border-gray-600 overflow-hidden rounded-sm">

          {/* Title */}
          <div className="bg-gray-800 text-white text-center py-1.5 text-xs font-bold tracking-[0.25em] uppercase">
            Work Order
          </div>

          {/* Customer | Order Info */}
          <div className="grid grid-cols-2 divide-x divide-gray-500 border-b border-gray-500">
            <div className="p-3 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-gray-500 w-10 shrink-0 uppercase">Name</span>
                <span className="text-gray-400 text-xs shrink-0">:</span>
                <input
                  type="text"
                  required
                  value={form.customer_name}
                  onChange={(e) => set("customer_name", e.target.value)}
                  placeholder="Customer name"
                  className="flex-1 min-w-0 border-b border-gray-400 bg-transparent text-sm
                             px-0.5 pb-0.5 focus:outline-none focus:border-gray-700 placeholder-gray-300"
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-gray-500 w-10 shrink-0 uppercase">Tel</span>
                <span className="text-gray-400 text-xs shrink-0">:</span>
                <input
                  type="tel"
                  value={form.customer_phone}
                  onChange={(e) => set("customer_phone", e.target.value)}
                  placeholder="Phone number"
                  className="flex-1 min-w-0 border-b border-gray-400 bg-transparent text-sm
                             px-0.5 pb-0.5 focus:outline-none focus:border-gray-700 placeholder-gray-300"
                />
              </div>
            </div>
            <div className="p-3 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-gray-500 w-20 shrink-0 uppercase">Order No.</span>
                <span className="text-gray-400 text-xs shrink-0">:</span>
                <span className="text-sm text-gray-400 italic">Auto</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-gray-500 w-20 shrink-0 uppercase">Date</span>
                <span className="text-gray-400 text-xs shrink-0">:</span>
                <span className="text-sm text-gray-700">{todayStr}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-gray-500 w-20 shrink-0 uppercase">Delivery</span>
                <span className="text-gray-400 text-xs shrink-0">:</span>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set("due_date", e.target.value)}
                  className="flex-1 min-w-0 border-b border-gray-400 bg-transparent text-sm
                             px-0.5 pb-0.5 focus:outline-none focus:border-gray-700"
                />
              </div>
            </div>
          </div>

          {/* Items table */}
          <table className="w-full border-b border-gray-500">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-500">
                <th className="border-r border-gray-500 px-3 py-1.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                  Type / Model
                </th>
                <th className="w-16 border-r border-gray-500 px-2 py-1.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                  Qty
                </th>
                <th className="w-28 border-r border-gray-500 px-2 py-1.5 text-right text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                  Unit Price
                </th>
                <th className="w-24 px-2 py-1.5 text-right text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {tailItems.map((item, idx) => {
                const lineTotal =
                  (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
                return (
                  <tr key={idx} className="group">
                    {/* Model */}
                    <td className="border-r border-gray-400 px-3 py-2">
                      <input
                        type="text"
                        value={item.model}
                        onChange={(e) => handleTailItemChange(idx, "model", e.target.value)}
                        placeholder="e.g. Kandora, Jalabiya..."
                        className="w-full border-b border-gray-400 bg-transparent text-sm
                                   px-0.5 pb-0.5 focus:outline-none focus:border-gray-700 placeholder-gray-300"
                      />
                    </td>
                    {/* Qty */}
                    <td className="border-r border-gray-400 px-2 py-2 text-center">
                      <input
                        type="number" min="1" max="99" value={item.qty}
                        onChange={(e) => handleTailItemChange(idx, "qty", e.target.value)}
                        className="w-12 border border-gray-400 text-sm text-center px-1 py-0.5
                                   focus:outline-none focus:ring-1 focus:ring-gray-600 rounded-sm"
                      />
                    </td>
                    {/* Unit Price */}
                    <td className="border-r border-gray-400 px-2 py-2">
                      <input
                        type="number" step="0.5" min="0" value={item.unit_price}
                        onChange={(e) => handleTailItemChange(idx, "unit_price", e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-gray-400 text-sm text-right px-1 py-0.5
                                   focus:outline-none focus:ring-1 focus:ring-gray-600 rounded-sm"
                      />
                    </td>
                    {/* Line total + remove */}
                    <td className="px-2 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-sm text-gray-700 tabular-nums w-16 text-right">
                          {lineTotal > 0 ? lineTotal.toFixed(2) : "—"}
                        </span>
                        {tailItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTailItem(idx)}
                            className="text-gray-300 hover:text-red-500 transition-colors text-xs leading-none ml-1"
                            title="Remove row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Add item button */}
          <div className="border-b border-gray-400 px-3 py-2">
            <button
              type="button"
              onClick={addTailItem}
              className="text-[12px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              + Add Item
            </button>
          </div>

          {/* Totals */}
          <div>
            {/* Grand total */}
            <div className="flex border-b border-gray-400">
              <div className="flex-1 border-r border-gray-400" />
              <div className="w-36 flex justify-between items-center px-3 py-1.5 border-b border-gray-300">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Total</span>
                <span className="text-sm font-semibold text-gray-800">{tailTotal.toFixed(2)}</span>
              </div>
            </div>
            {/* Advance / deposit */}
            <div className="flex border-b border-gray-400">
              <div className="flex-1 border-r border-gray-400" />
              <div className="w-36 flex justify-between items-center px-3 py-1.5">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Advance</span>
                <input
                  type="number" step="0.5" min="0" value={form.deposit_amount}
                  onChange={(e) => set("deposit_amount", e.target.value)}
                  placeholder="0.00"
                  className="w-20 border border-gray-400 text-sm text-right px-1 py-0.5
                             focus:outline-none focus:ring-1 focus:ring-gray-600 rounded-sm"
                />
              </div>
            </div>
            {/* Balance */}
            <div className="flex">
              <div className="flex-1 border-r border-gray-400 px-3 py-2 flex items-center">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  tailPaymentStatus === "fully_paid" ? "bg-green-100 text-green-700"
                  : tailPaymentStatus === "deposit_paid" ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
                }`}>
                  {tailPaymentStatus === "fully_paid" ? "Fully Paid"
                   : tailPaymentStatus === "deposit_paid" ? "Advance Paid"
                   : "Unpaid"}
                </span>
              </div>
              <div className="w-36 flex justify-between items-center px-3 py-1.5">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Balance</span>
                <span className={`text-sm font-bold ${tailBalance > 0 ? "text-red-700" : "text-green-700"}`}>
                  {tailBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SUBMIT ===== */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={resetForm}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium
                     text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Saving..." : "Create Order"}
        </button>
      </div>
    </form>
  );
}
