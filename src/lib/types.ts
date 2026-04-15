// ============================================================
// Types matching the Supabase database schema.
// Keep in sync with src/lib/supabase/schema.sql
// ============================================================

export type UserRole = "admin" | "staff";
export type OrderType = "alteration" | "tailoring";

export type OrderStatus =
  | "in_progress"
  | "completed"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "deposit_paid" | "fully_paid";

// ----- Table row types -----

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  order_type: OrderType;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  deposit_amount: number;
  notes: string | null;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AlterationDetails {
  id: string;
  order_id: string;
  garment_type: string;
  description: string;
  special_instructions: string | null;
  garment_brand: string | null;
  garment_color: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface TailoringDetails {
  id: string;
  order_id: string;
  garment_type: string;
  fabric_details: string | null;
  design_notes: string | null;
  special_instructions: string | null;
  quantity: number;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  shoulders: number | null;
  neck: number | null;
  sleeve_length: number | null;
  arm_circumference: number | null;
  wrist: number | null;
  back_length: number | null;
  front_length: number | null;
  inseam: number | null;
  outseam: number | null;
  thigh: number | null;
  knee: number | null;
  calf: number | null;
  trouser_length: number | null;
  skirt_length: number | null;
  dress_length: number | null;
  created_at: string;
  updated_at: string;
}

// ----- Form input types (what the UI collects) -----

export interface NewOrderFormData {
  // Customer
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_notes: string;

  // Order
  order_type: OrderType;
  total_amount: string;
  deposit_amount: string;
  payment_status: PaymentStatus;
  due_date: string;
  order_notes: string;

  // Alteration-specific
  alt_garment_type: string;
  alt_description: string;
  alt_special_instructions: string;
  alt_garment_brand: string;
  alt_garment_color: string;

  // Tailoring-specific
  tail_garment_type: string;
  tail_fabric_details: string;
  tail_design_notes: string;
  tail_special_instructions: string;

  // Measurements
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
