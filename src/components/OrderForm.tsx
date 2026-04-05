"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder, type CreateOrderInput } from "@/services/orders";
import type { OrderType, PaymentStatus } from "@/lib/types";

// ----- measurement field definitions -----

const MEASUREMENT_GROUPS = [
  {
    label: "Upper Body",
    fields: [
      { key: "chest", label: "Chest" },
      { key: "waist", label: "Waist" },
      { key: "hips", label: "Hips" },
      { key: "shoulders", label: "Shoulders" },
      { key: "neck", label: "Neck" },
    ],
  },
  {
    label: "Arms",
    fields: [
      { key: "sleeve_length", label: "Sleeve Length" },
      { key: "arm_circumference", label: "Arm Circumference" },
      { key: "wrist", label: "Wrist" },
    ],
  },
  {
    label: "Torso",
    fields: [
      { key: "back_length", label: "Back Length" },
      { key: "front_length", label: "Front Length" },
    ],
  },
  {
    label: "Lower Body",
    fields: [
      { key: "inseam", label: "Inseam" },
      { key: "outseam", label: "Outseam" },
      { key: "thigh", label: "Thigh" },
      { key: "knee", label: "Knee" },
      { key: "calf", label: "Calf" },
      { key: "trouser_length", label: "Trouser Length" },
      { key: "skirt_length", label: "Skirt Length" },
      { key: "dress_length", label: "Dress Length" },
    ],
  },
] as const;

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

// ----- reusable sub-components -----

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
      {children}
    </h2>
  );
}

function Label({ htmlFor, required, children }: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input({ id, type = "text", placeholder, value, onChange, required }: {
  id: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                 text-gray-900 placeholder-gray-400
                 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  );
}

function Textarea({ id, placeholder, value, onChange, rows = 3 }: {
  id: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                 text-gray-900 placeholder-gray-400
                 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  );
}

// ============================
// Main form component
// ============================

export default function OrderForm() {
  const router = useRouter();
  const [form, setForm] = useState<CreateOrderInput>(getInitialState);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // generic field updater
  function set<K extends keyof CreateOrderInput>(key: K, value: CreateOrderInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await createOrder(form);

    if (res.success && res.order_id) {
      router.push(`/orders/${res.order_id}/invoice`);
      return;
    } else {
      setResult({ type: "error", message: res.error ?? "Something went wrong." });
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ---------- result banner ---------- */}
      {result && (
        <div
          className={`rounded-md px-4 py-3 text-sm font-medium ${
            result.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {result.message}
        </div>
      )}

      {/* ========== SERVICE TYPE ========== */}
      <section>
        <SectionHeading>Service Type</SectionHeading>
        <div className="flex gap-4">
          {(["alteration", "tailoring"] as OrderType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => set("order_type", type)}
              className={`flex-1 rounded-md border-2 py-3 text-sm font-medium capitalize transition-colors ${
                form.order_type === type
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      {/* ========== CUSTOMER INFO ========== */}
      <section>
        <SectionHeading>Customer Information</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customer_name" required>Name</Label>
            <Input
              id="customer_name"
              placeholder="Full name"
              value={form.customer_name}
              onChange={(v) => set("customer_name", v)}
              required
            />
          </div>
          <div>
            <Label htmlFor="customer_phone" required>Phone</Label>
            <Input
              id="customer_phone"
              type="tel"
              placeholder="Phone number"
              value={form.customer_phone}
              onChange={(v) => set("customer_phone", v)}
              required
            />
          </div>
          <div>
            <Label htmlFor="customer_email">Email</Label>
            <Input
              id="customer_email"
              type="email"
              placeholder="Optional"
              value={form.customer_email}
              onChange={(v) => set("customer_email", v)}
            />
          </div>
          <div>
            <Label htmlFor="customer_notes">Notes</Label>
            <Input
              id="customer_notes"
              placeholder="Customer preferences, etc."
              value={form.customer_notes}
              onChange={(v) => set("customer_notes", v)}
            />
          </div>
        </div>
      </section>

      {/* ========== PRICING & SCHEDULE ========== */}
      <section>
        <SectionHeading>Pricing &amp; Schedule</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="total_amount" required>Total Amount</Label>
            <Input
              id="total_amount"
              type="number"
              placeholder="0.00"
              value={form.total_amount}
              onChange={(v) => set("total_amount", v)}
              required
            />
          </div>
          <div>
            <Label htmlFor="deposit_amount">Deposit</Label>
            <Input
              id="deposit_amount"
              type="number"
              placeholder="0.00"
              value={form.deposit_amount}
              onChange={(v) => set("deposit_amount", v)}
            />
          </div>
          <div>
            <Label htmlFor="payment_status">Payment Status</Label>
            <select
              id="payment_status"
              value={form.payment_status}
              onChange={(e) => set("payment_status", e.target.value as PaymentStatus)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                         text-gray-900 bg-white
                         focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="unpaid">Unpaid</option>
              <option value="deposit_paid">Deposit Paid</option>
              <option value="fully_paid">Fully Paid</option>
            </select>
          </div>
          <div>
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={form.due_date}
              onChange={(v) => set("due_date", v)}
            />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="order_notes">Order Notes</Label>
          <Textarea
            id="order_notes"
            placeholder="General notes about this order..."
            value={form.order_notes}
            onChange={(v) => set("order_notes", v)}
            rows={2}
          />
        </div>
      </section>

      {/* ========== ALTERATION DETAILS ========== */}
      {form.order_type === "alteration" && (
        <section>
          <SectionHeading>Alteration Details</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="alt_garment_type" required>Garment Type</Label>
              <select
                id="alt_garment_type"
                value={form.alt_garment_type}
                onChange={(e) => set("alt_garment_type", e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                           text-gray-900 bg-white
                           focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select garment...</option>
                <option value="Pants">Pants</option>
                <option value="Shirt">Shirt</option>
                <option value="Dress">Dress</option>
                <option value="Jacket">Jacket</option>
                <option value="Skirt">Skirt</option>
                <option value="Coat">Coat</option>
                <option value="Suit">Suit</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="alt_garment_brand">Brand</Label>
              <Input
                id="alt_garment_brand"
                placeholder="Optional"
                value={form.alt_garment_brand}
                onChange={(v) => set("alt_garment_brand", v)}
              />
            </div>
            <div>
              <Label htmlFor="alt_garment_color">Color</Label>
              <Input
                id="alt_garment_color"
                placeholder="Optional"
                value={form.alt_garment_color}
                onChange={(v) => set("alt_garment_color", v)}
              />
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="alt_description" required>Description of Work</Label>
            <Textarea
              id="alt_description"
              placeholder="What alteration is needed? e.g. Shorten sleeves by 2 inches, take in waist..."
              value={form.alt_description}
              onChange={(v) => set("alt_description", v)}
            />
          </div>
          <div className="mt-4">
            <Label htmlFor="alt_special_instructions">Special Instructions</Label>
            <Textarea
              id="alt_special_instructions"
              placeholder="Match existing stitching color, preserve original hem, etc."
              value={form.alt_special_instructions}
              onChange={(v) => set("alt_special_instructions", v)}
              rows={2}
            />
          </div>
        </section>
      )}

      {/* ========== TAILORING DETAILS ========== */}
      {form.order_type === "tailoring" && (
        <section>
          <SectionHeading>Tailoring Details</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tail_garment_type" required>Garment Type</Label>
              <select
                id="tail_garment_type"
                value={form.tail_garment_type}
                onChange={(e) => set("tail_garment_type", e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                           text-gray-900 bg-white
                           focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select garment...</option>
                <option value="Suit">Suit</option>
                <option value="Shirt">Shirt</option>
                <option value="Blouse">Blouse</option>
                <option value="Dress">Dress</option>
                <option value="Trousers">Trousers</option>
                <option value="Skirt">Skirt</option>
                <option value="Jacket">Jacket</option>
                <option value="Coat">Coat</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="tail_fabric_details">Fabric Details</Label>
              <Input
                id="tail_fabric_details"
                placeholder="Fabric type, color, customer-supplied, etc."
                value={form.tail_fabric_details}
                onChange={(v) => set("tail_fabric_details", v)}
              />
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="tail_design_notes">Design Notes</Label>
            <Textarea
              id="tail_design_notes"
              placeholder="Style preferences, collar type, pocket style, reference images described..."
              value={form.tail_design_notes}
              onChange={(v) => set("tail_design_notes", v)}
            />
          </div>
          <div className="mt-4">
            <Label htmlFor="tail_special_instructions">Special Instructions</Label>
            <Textarea
              id="tail_special_instructions"
              placeholder="Any special requests..."
              value={form.tail_special_instructions}
              onChange={(v) => set("tail_special_instructions", v)}
              rows={2}
            />
          </div>

          {/* --- measurements grid --- */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              Body Measurements
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              All values in centimeters. Leave blank if not needed for this garment.
            </p>

            {MEASUREMENT_GROUPS.map((group) => (
              <div key={group.label} className="mb-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {group.fields.map((f) => (
                    <div key={f.key}>
                      <label
                        htmlFor={f.key}
                        className="block text-xs text-gray-600 mb-0.5"
                      >
                        {f.label}
                      </label>
                      <input
                        id={f.key}
                        type="number"
                        step="0.1"
                        placeholder="cm"
                        value={form[f.key as keyof CreateOrderInput] as string}
                        onChange={(e) =>
                          set(f.key as keyof CreateOrderInput, e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm
                                   text-gray-900 placeholder-gray-400
                                   focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========== SUBMIT ========== */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => {
            setForm(getInitialState());
            setResult(null);
          }}
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
