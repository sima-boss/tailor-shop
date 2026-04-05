import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/currency";
import type { OrderType, PaymentStatus, OrderStatus } from "@/lib/types";
import InvoiceActions from "@/components/InvoiceActions";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    ready_for_fitting: "Ready for Fitting",
    fitting_done: "Fitting Done",
    completed: "Completed",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

function paymentLabel(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    unpaid: "Unpaid",
    deposit_paid: "Deposit Paid",
    fully_paid: "Fully Paid",
  };
  return map[status] ?? status;
}

function paymentColor(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    unpaid: "bg-red-100 text-red-800",
    deposit_paid: "bg-yellow-100 text-yellow-800",
    fully_paid: "bg-green-100 text-green-800",
  };
  return map[status] ?? "bg-gray-100 text-gray-800";
}

function orderTypeLabel(type: OrderType): string {
  return type === "alteration" ? "Alteration" : "Custom Tailoring";
}

// ----- measurement display config -----

const MEASUREMENT_LABELS: Record<string, string> = {
  chest: "Chest",
  waist: "Waist",
  hips: "Hips",
  shoulders: "Shoulders",
  neck: "Neck",
  sleeve_length: "Sleeve Length",
  arm_circumference: "Arm Circ.",
  wrist: "Wrist",
  back_length: "Back Length",
  front_length: "Front Length",
  inseam: "Inseam",
  outseam: "Outseam",
  thigh: "Thigh",
  knee: "Knee",
  calf: "Calf",
  trouser_length: "Trouser Length",
  skirt_length: "Skirt Length",
  dress_length: "Dress Length",
};

// ----- page -----

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice — Tailor Shop" };

export default async function InvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const settings = await getStoreSettings();

  // Fetch order + customer in one go via a join
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*, customers(*)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (orderErr || !order) {
    notFound();
  }

  const customer = order.customers as {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  };

  // Fetch the detail record based on order type
  let alterationDetails: {
    garment_type: string;
    description: string;
    special_instructions: string | null;
    garment_brand: string | null;
    garment_color: string | null;
    quantity: number;
  } | null = null;

  let tailoringDetails: {
    garment_type: string;
    fabric_details: string | null;
    design_notes: string | null;
    special_instructions: string | null;
    quantity: number;
    [key: string]: unknown;   // measurement fields accessed dynamically
  } | null = null;

  if (order.order_type === "alteration") {
    const { data } = await supabase
      .from("alteration_details")
      .select("*")
      .eq("order_id", order.id)
      .single();
    alterationDetails = data;
  } else {
    const { data } = await supabase
      .from("tailoring_details")
      .select("*")
      .eq("order_id", order.id)
      .single();
    tailoringDetails = data;
  }

  // Collect non-null measurements for display
  const measurements: { label: string; value: number }[] = [];
  if (tailoringDetails) {
    for (const [key, label] of Object.entries(MEASUREMENT_LABELS)) {
      const val = tailoringDetails[key];
      if (val !== null && val !== undefined) {
        measurements.push({ label, value: val as number });
      }
    }
  }

  const balance = (order.total_amount ?? 0) - (order.deposit_amount ?? 0);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6">
      {/* ----- navigation ----- */}
      <div className="mx-auto max-w-2xl mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          &larr; Home
        </Link>
        <InvoiceActions
          orderNumber={order.order_number}
          orderId={order.id}
          customerName={customer.name}
          customerPhone={customer.phone}
          totalAmount={order.total_amount}
          dueDate={order.due_date}
          currency={settings.currency}
        />
      </div>

      {/* ----- invoice card ----- */}
      <div className="mx-auto max-w-2xl bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-0">

        {/* header */}
        <div className="bg-gray-900 text-white px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">INVOICE</h1>
              <p className="text-gray-400 mt-1 text-sm">{settings.store_name}</p>
              {settings.store_phone && (
                <p className="text-gray-400 text-xs mt-0.5">{settings.store_phone}</p>
              )}
              {settings.store_email && (
                <p className="text-gray-400 text-xs">{settings.store_email}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-semibold">{order.order_number}</p>
              <p className="text-gray-400 text-sm mt-1">{formatDate(order.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">

          {/* customer + order meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Customer
              </h2>
              <p className="text-gray-900 font-medium">{customer.name}</p>
              <p className="text-gray-600 text-sm">{customer.phone}</p>
              {customer.email && (
                <p className="text-gray-600 text-sm">{customer.email}</p>
              )}
              {customer.address && (
                <p className="text-gray-600 text-sm mt-1">{customer.address}</p>
              )}
            </div>
            <div className="sm:text-right">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Order Details
              </h2>
              <p className="text-gray-900 text-sm">
                <span className="text-gray-500">Type:</span>{" "}
                {orderTypeLabel(order.order_type)}
              </p>
              <p className="text-gray-900 text-sm">
                <span className="text-gray-500">Status:</span>{" "}
                {statusLabel(order.status)}
              </p>
              <p className="text-gray-900 text-sm">
                <span className="text-gray-500">Due:</span>{" "}
                {formatDate(order.due_date)}
              </p>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* ----- service details ----- */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Service Details
            </h2>

            {alterationDetails && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Garment</span>
                  <span className="text-gray-900 font-medium">
                    {alterationDetails.garment_type}
                    {alterationDetails.garment_color && ` — ${alterationDetails.garment_color}`}
                    {alterationDetails.garment_brand && ` (${alterationDetails.garment_brand})`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quantity</span>
                  <span className="text-gray-900">{alterationDetails.quantity}</span>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-800 bg-gray-50 rounded-md p-3">
                    {alterationDetails.description}
                  </p>
                </div>
                {alterationDetails.special_instructions && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Special Instructions</p>
                    <p className="text-sm text-gray-800 bg-gray-50 rounded-md p-3">
                      {alterationDetails.special_instructions}
                    </p>
                  </div>
                )}
              </div>
            )}

            {tailoringDetails && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Garment</span>
                  <span className="text-gray-900 font-medium">
                    {tailoringDetails.garment_type}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quantity</span>
                  <span className="text-gray-900">
                    {tailoringDetails.quantity}
                  </span>
                </div>
                {tailoringDetails.fabric_details ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fabric</span>
                    <span className="text-gray-900">
                      {tailoringDetails.fabric_details}
                    </span>
                  </div>
                ) : null}
                {tailoringDetails.design_notes ? (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Design Notes</p>
                    <p className="text-sm text-gray-800 bg-gray-50 rounded-md p-3">
                      {tailoringDetails.design_notes}
                    </p>
                  </div>
                ) : null}
                {tailoringDetails.special_instructions ? (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Special Instructions</p>
                    <p className="text-sm text-gray-800 bg-gray-50 rounded-md p-3">
                      {tailoringDetails.special_instructions}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* ----- measurements (tailoring only) ----- */}
          {measurements.length > 0 && (
            <>
              <hr className="border-gray-200" />
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Measurements (cm)
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                  {measurements.map((m) => (
                    <div key={m.label} className="flex justify-between text-sm py-1">
                      <span className="text-gray-500">{m.label}</span>
                      <span className="text-gray-900 font-mono">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ----- order notes ----- */}
          {order.notes && (
            <>
              <hr className="border-gray-200" />
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Notes
                </h2>
                <p className="text-sm text-gray-700">{order.notes}</p>
              </div>
            </>
          )}

          <hr className="border-gray-200" />

          {/* ----- totals ----- */}
          <div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Total Amount</span>
              <span className="text-gray-900 font-medium">{formatMoney(order.total_amount, settings.currency)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Deposit Paid</span>
              <span className="text-gray-900">{formatMoney(order.deposit_amount, settings.currency)}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-t border-gray-100 mt-1 pt-2">
              <span className="text-gray-900 font-semibold">Balance Due</span>
              <span className="text-gray-900 font-semibold text-lg">{formatMoney(balance, settings.currency)}</span>
            </div>
            <div className="flex justify-end mt-2">
              <span
                className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${paymentColor(
                  order.payment_status
                )}`}
              >
                {paymentLabel(order.payment_status)}
              </span>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 text-center">
          <p className="text-xs text-gray-500">
            {settings.receipt_footer_text}
          </p>
        </div>
      </div>
    </div>
  );
}
