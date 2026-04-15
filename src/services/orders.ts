"use server";

import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/lib/settings";
import { sendInvoiceEmail } from "@/services/email";

// ----- helpers -----

/**
 * Generate the next numeric order number (1001, 1002, …).
 *
 * Works in two phases:
 *  • Before migration 004: DB has no sequence default, so we compute
 *    max(order_number) across all orders and add 1. Non-numeric values
 *    (old ORD-XXXXXX format) are ignored via parseInt.
 *  • After migration 004: The DB sequence is the authoritative source,
 *    but providing an explicit number is still safe — it bypasses the
 *    sequence default and the sequence stays in sync.
 *
 * Race condition: if two orders are submitted simultaneously they could
 * collide. The UNIQUE constraint on order_number will surface this as an
 * insert error. For a single-staff shop this is acceptable.
 */
async function generateOrderNumber(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const { data } = await supabase
    .from("orders")
    .select("order_number");

  let maxNum = 1000;
  for (const row of data ?? []) {
    const n = parseInt(row.order_number ?? "", 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  }

  return String(maxNum + 1);
}

function toNumber(val: string): number | null {
  if (!val || val.trim() === "") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

// ----- types for the action -----

export interface CreateOrderInput {
  // Customer
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_notes: string;

  // Order
  order_type: "alteration" | "tailoring";
  total_amount: string;
  deposit_amount: string;
  payment_status: "unpaid" | "deposit_paid" | "fully_paid";
  due_date: string;
  order_notes: string;

  // Alteration fields
  alt_garment_type: string;
  alt_description: string;
  alt_special_instructions: string; // stores item prices as JSON array for new format
  alt_garment_brand: string;
  alt_garment_color: string;
  alt_quantity: string; // number of items (drives dynamic price inputs)

  // Tailoring fields
  tail_garment_type: string;
  tail_fabric_details: string;
  tail_design_notes: string;
  tail_special_instructions: string;

  // Measurements (strings from the form — parsed to numbers server-side)
  chest: string;
  waist: string;
  hips: string;
  shoulders: string;
  neck: string;
  sleeve_length: string;
  arm_circumference: string;
  wrist: string;
  back_length: string;
  front_length: string;
  inseam: string;
  outseam: string;
  thigh: string;
  knee: string;
  calf: string;
  trouser_length: string;
  skirt_length: string;
  dress_length: string;
}

export interface CreateOrderResult {
  success: boolean;
  order_id?: string;
  order_number?: string;
  error?: string;
}

// ----- server action -----

export async function createOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  try {
    const supabase = createClient();

    // ---- 1. Validate required fields ----
    if (!input.customer_name.trim()) {
      return { success: false, error: "Customer name is required." };
    }

    const totalAmount = parseFloat(input.total_amount) || 0;
    const depositAmount = parseFloat(input.deposit_amount) || 0;

    if (depositAmount > totalAmount) {
      return { success: false, error: "Deposit cannot exceed total amount." };
    }

    // ---- 2. Find or create customer ----
    const phone = input.customer_phone.trim();

    // Only attempt to match an existing customer when a phone number is provided.
    // An empty phone string would match all phone-less customers (unreliable).
    let existingCustomer: { id: string } | null = null;
    if (phone) {
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", phone)
        .is("deleted_at", null)
        .maybeSingle();
      existingCustomer = data;
    }

    let customerId: string;

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from("customers")
        .insert({
          name: input.customer_name.trim(),
          phone,
          email: input.customer_email.trim() || null,
          notes: input.customer_notes.trim() || null,
        })
        .select("id")
        .single();

      if (custErr || !newCustomer) {
        return { success: false, error: `Failed to create customer: ${custErr?.message}` };
      }
      customerId = newCustomer.id;
    }

    // ---- 3. Create order ----
    const orderNumber = await generateOrderNumber(supabase);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        order_type: input.order_type,
        status: "in_progress",
        payment_status: input.payment_status,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        notes: input.order_notes.trim() || null,
        due_date: input.due_date || null,
      })
      .select("id, order_number")
      .single();

    if (orderErr || !order) {
      return { success: false, error: `Failed to create order: ${orderErr?.message}` };
    }

    // ---- 4. Create detail record ----
    if (input.order_type === "alteration") {
      const { error: detailErr } = await supabase
        .from("alteration_details")
        .insert({
          order_id: order.id,
          // garment_type uses description text (new format) or falls back to alt_garment_type (old)
          garment_type: input.alt_description.trim() || input.alt_garment_type.trim() || "Alteration",
          description: input.alt_description.trim(),
          special_instructions: input.alt_special_instructions.trim() || null,
          garment_brand: input.alt_garment_brand.trim() || null,
          garment_color: input.alt_garment_color.trim() || null,
          quantity: parseInt(input.alt_quantity) || 1,
        });

      if (detailErr) {
        return { success: false, error: `Failed to save alteration details: ${detailErr.message}` };
      }
    }

    if (input.order_type === "tailoring") {
      const { error: detailErr } = await supabase
        .from("tailoring_details")
        .insert({
          order_id: order.id,
          garment_type: input.tail_garment_type.trim(),
          fabric_details: input.tail_fabric_details.trim() || null,
          design_notes: input.tail_design_notes.trim() || null,
          special_instructions: input.tail_special_instructions.trim() || null,
          chest: toNumber(input.chest),
          waist: toNumber(input.waist),
          hips: toNumber(input.hips),
          shoulders: toNumber(input.shoulders),
          neck: toNumber(input.neck),
          sleeve_length: toNumber(input.sleeve_length),
          arm_circumference: toNumber(input.arm_circumference),
          wrist: toNumber(input.wrist),
          back_length: toNumber(input.back_length),
          front_length: toNumber(input.front_length),
          inseam: toNumber(input.inseam),
          outseam: toNumber(input.outseam),
          thigh: toNumber(input.thigh),
          knee: toNumber(input.knee),
          calf: toNumber(input.calf),
          trouser_length: toNumber(input.trouser_length),
          skirt_length: toNumber(input.skirt_length),
          dress_length: toNumber(input.dress_length),
        });

      if (detailErr) {
        return { success: false, error: `Failed to save tailoring details: ${detailErr.message}` };
      }
    }

    // ---- 5. Send invoice email (non-blocking, only if email provided) ----
    const customerEmail = input.customer_email.trim();
    if (customerEmail) {
      getStoreSettings()
        .then((settings) =>
          sendInvoiceEmail({
            to: customerEmail,
            customerName: input.customer_name.trim(),
            orderNumber: order.order_number,
            orderId: order.id,
            orderType: input.order_type,
            totalAmount: totalAmount,
            dueDate: input.due_date || null,
            currency: settings.currency,
            store: {
              name:              settings.store_name,
              nameAr:            settings.store_name_ar,
              phone:             settings.store_phone,
              mobile:            settings.store_mobile,
              email:             settings.store_email,
              location:          settings.store_location,
              locationAr:        settings.store_location_ar,
              shopNumber:        settings.store_shop_number,
              shopNumberAr:      settings.store_shop_number_ar,
              footer:            settings.receipt_footer_text,
              liabilityNotice:   settings.store_liability_notice,
              liabilityNoticeAr: settings.store_liability_notice_ar,
            },
          })
        )
        .catch(() => {
          // Email failure should never block order creation
        });
    }

    return { success: true, order_id: order.id, order_number: order.order_number };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

// ----- update a single order field (payment only) -----

export interface UpdateOrderFieldInput {
  order_id: string;
  field: "status" | "payment_status";
  value: string;
}

export interface UpdateOrderFieldResult {
  success: boolean;
  error?: string;
}

export async function updateOrderField(
  input: UpdateOrderFieldInput
): Promise<UpdateOrderFieldResult> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from("orders")
      .update({ [input.field]: input.value })
      .eq("id", input.order_id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

// ----- update order status + completed_by atomically -----

export interface UpdateOrderStatusInput {
  order_id: string;
  status: string;
  completed_by: string | null; // tailor name when completing, null otherwise
}

export async function updateOrderStatus(
  input: UpdateOrderStatusInput
): Promise<UpdateOrderFieldResult> {
  try {
    const supabase = createClient();

    const isCompleting = input.status === "completed";

    // Full payload — includes completed_at for commission date tracking
    const fullUpdates = {
      status: input.status,
      completed_by: isCompleting ? input.completed_by : null,
      completed_at: isCompleting ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from("orders")
      .update(fullUpdates)
      .eq("id", input.order_id);

    if (error) {
      // If the completed_at column hasn't been migrated yet, retry without it.
      // The status and completed_by will still be saved correctly.
      const completedAtMissing =
        error.message.includes("completed_at") ||
        error.message.includes("does not exist") ||
        error.message.includes("schema cache");

      if (completedAtMissing) {
        const fallbackUpdates = {
          status: input.status,
          completed_by: isCompleting ? input.completed_by : null,
        };
        const { error: err2 } = await supabase
          .from("orders")
          .update(fallbackUpdates)
          .eq("id", input.order_id);
        if (err2) return { success: false, error: err2.message };
        return { success: true };
      }

      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
